import { getDb } from './db';
import { Book, SourceFlags } from './types';
import { PROBLEM_TAXONOMY } from './problem-engine';

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  edition_count?: number;
}

/**
 * Searches external legal metadata providers (Open Library primary) to expand
 * Book Listener catalogue on demand when local search produces limited results.
 * Strictly adheres to PRD: metadata only, no unauthorized full text/PDF hosting.
 */
export async function searchExternalBooks(query: string): Promise<Book[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=6`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BookListener/1.0 (https://booklistener.app; contact@booklistener.app)'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      console.warn(`[OpenLibrary Search] HTTP error ${res.status}`);
      return [];
    }

    const data = await res.json();
    const docs: OpenLibraryDoc[] = data.docs || [];

    const db = getDb();
    const discoveredBooks: Book[] = [];

    for (const doc of docs) {
      if (!doc.title || !doc.author_name || doc.author_name.length === 0) continue;

      const title = doc.title;
      const author = doc.author_name[0];
      const publishedYear = doc.first_publish_year || undefined;
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 96);
      const bookId = `ol_${doc.key.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Check if already in database
      const existing = await db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, slug) as any;
      if (existing) {
        discoveredBooks.push({
          id: existing.id,
          slug: existing.slug,
          title: existing.title,
          author: existing.author,
          description: existing.description,
          coverUrl: existing.cover_url,
          publishedYear: existing.published_year,
          themes: JSON.parse(existing.themes_json || '[]'),
          problemTags: JSON.parse(existing.problem_tags_json || '[]'),
          sourceFlags: JSON.parse(existing.source_flags_json || '{}'),
          spotifyQuery: existing.spotify_query,
          gutenbergId: existing.gutenberg_id,
          standardEbooksSlug: existing.standard_ebooks_slug,
          librivoxIdentifier: existing.librivox_identifier,
          openLibraryKey: existing.open_library_key,
          googleBooksId: existing.google_books_id,
          metadataSource: existing.metadata_source || 'open_library',
          createdAt: existing.created_at
        });
        continue;
      }

      // Infer themes and problem tags from subjects
      const subjects = (doc.subject || []).map((s) => s.toLowerCase());
      const inferredThemes = inferThemesFromSubjects(subjects, title);
      const inferredProblemTags = inferProblemTags(inferredThemes, subjects);

      // Public domain determination: pre-1929 published books are in the public domain in the US
      const isPublicDomain = publishedYear !== undefined && publishedYear < 1929;

      const sourceFlags: SourceFlags = {
        hasSpotify: true, // Spotify deep link available for any published title
        hasGutenberg: isPublicDomain,
        hasLibriVox: isPublicDomain,
        hasSummary: true // Book Listener original transformative summary
      };

      const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined;
      const description = `A work by ${author}${publishedYear ? ` first published in ${publishedYear}` : ''}. Explores concepts related to ${inferredThemes.join(', ')}.`;

      const newBook: Book = {
        id: bookId,
        slug,
        title,
        author,
        description,
        coverUrl,
        publishedYear,
        themes: inferredThemes,
        problemTags: inferredProblemTags,
        sourceFlags,
        spotifyQuery: `${title} ${author}`,
        openLibraryKey: doc.key,
        metadataSource: 'open_library'
      };

      // Persist to Turso catalog
      await db.prepare(`
        INSERT OR IGNORE INTO books (
          id, slug, title, author, description, cover_url, published_year,
          themes_json, problem_tags_json, source_flags_json, spotify_query,
          open_library_key, google_books_id, metadata_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newBook.id,
        newBook.slug,
        newBook.title,
        newBook.author,
        newBook.description,
        newBook.coverUrl ?? null,
        newBook.publishedYear ?? null,
        JSON.stringify(newBook.themes),
        JSON.stringify(newBook.problemTags),
        JSON.stringify(newBook.sourceFlags),
        newBook.spotifyQuery ?? null,
        newBook.openLibraryKey ?? null,
        null,
        'open_library'
      );

      discoveredBooks.push(newBook);
    }

    // If Open Library produced fewer than 3 results, supplement with Google Books
    if (discoveredBooks.length < 3) {
      const gbBooks = await searchGoogleBooks(trimmed);
      for (const gb of gbBooks) {
        if (!discoveredBooks.some((b) => b.id === gb.id || b.slug === gb.slug)) {
          discoveredBooks.push(gb);
        }
      }
    }

    return discoveredBooks;
  } catch (error) {
    console.warn('[searchExternalBooks Error]:', error);
    // Attempt Google Books as fallback if Open Library network failed
    return await searchGoogleBooks(trimmed);
  }
}

/**
 * Searches Google Books API as an authorized secondary legal metadata provider.
 * Strictly adheres to Google Books API Terms:
 * - Shows required Google Books attribution where used
 * - Metadata and thumbnails only (no full text)
 * - Safe handling of quota limits (429)
 */
export async function searchGoogleBooks(query: string): Promise<Book[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const keyParam = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
    const url = `https://books.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=6${keyParam}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BookListener/1.0 (Google Books Legal Metadata Reader)'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[Google Books Search] 429 Quota reached. Set GOOGLE_BOOKS_API_KEY or relying on Open Library.');
      } else {
        console.warn(`[Google Books Search] HTTP error ${res.status}`);
      }
      return [];
    }

    const data = await res.json();
    const items = data.items || [];
    const db = getDb();
    const books: Book[] = [];

    for (const item of items) {
      const info = item.volumeInfo;
      if (!info || !info.title || !info.authors || info.authors.length === 0) continue;

      const title = info.title;
      const author = info.authors[0];
      const rawYear = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : undefined;
      const publishedYear = isNaN(rawYear as any) ? undefined : rawYear;
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 96);
      const bookId = `gb_${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const existing = await db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(bookId, slug) as any;
      if (existing) {
        books.push({
          id: existing.id,
          slug: existing.slug,
          title: existing.title,
          author: existing.author,
          description: existing.description,
          coverUrl: existing.cover_url,
          publishedYear: existing.published_year,
          themes: JSON.parse(existing.themes_json || '[]'),
          problemTags: JSON.parse(existing.problem_tags_json || '[]'),
          sourceFlags: JSON.parse(existing.source_flags_json || '{}'),
          spotifyQuery: existing.spotify_query,
          gutenbergId: existing.gutenberg_id,
          standardEbooksSlug: existing.standard_ebooks_slug,
          librivoxIdentifier: existing.librivox_identifier,
          openLibraryKey: existing.open_library_key,
          googleBooksId: existing.google_books_id,
          metadataSource: existing.metadata_source || 'google_books',
          createdAt: existing.created_at
        });
        continue;
      }

      const categories = (info.categories || []).map((c: string) => c.toLowerCase());
      const inferredThemes = inferThemesFromSubjects(categories, title);
      const inferredProblemTags = inferProblemTags(inferredThemes, categories);
      const isPublicDomain = publishedYear !== undefined && publishedYear < 1929;

      const sourceFlags: SourceFlags = {
        hasSpotify: true,
        hasGutenberg: isPublicDomain,
        hasLibriVox: isPublicDomain,
        hasSummary: true
      };

      const coverUrl = info.imageLinks?.thumbnail?.replace('http://', 'https://') || 
                       info.imageLinks?.smallThumbnail?.replace('http://', 'https://');
      const description = info.description 
        ? info.description.slice(0, 500) 
        : `A work by ${author}${publishedYear ? ` first published in ${publishedYear}` : ''}. Explores ${inferredThemes.join(', ')}.`;

      const newBook: Book = {
        id: bookId,
        slug,
        title,
        author,
        description,
        coverUrl,
        publishedYear,
        themes: inferredThemes,
        problemTags: inferredProblemTags,
        sourceFlags,
        spotifyQuery: `${title} ${author}`,
        googleBooksId: item.id,
        metadataSource: 'google_books'
      };

      await db.prepare(`
        INSERT OR IGNORE INTO books (
          id, slug, title, author, description, cover_url, published_year,
          themes_json, problem_tags_json, source_flags_json, spotify_query,
          open_library_key, google_books_id, metadata_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newBook.id,
        newBook.slug,
        newBook.title,
        newBook.author,
        newBook.description,
        newBook.coverUrl ?? null,
        newBook.publishedYear ?? null,
        JSON.stringify(newBook.themes),
        JSON.stringify(newBook.problemTags),
        JSON.stringify(newBook.sourceFlags),
        newBook.spotifyQuery ?? null,
        null,
        newBook.googleBooksId ?? null,
        'google_books'
      );

      books.push(newBook);
    }

    return books;
  } catch (error) {
    console.warn('[searchGoogleBooks Error]:', error);
    return [];
  }
}

function inferThemesFromSubjects(subjects: string[], title: string): string[] {
  const matched = new Set<string>();
  const text = `${subjects.join(' ')} ${title}`.toLowerCase();

  for (const [theme, info] of Object.entries(PROBLEM_TAXONOMY)) {
    if (text.includes(theme)) {
      matched.add(theme);
    }
    for (const tag of info.tags) {
      if (text.includes(tag.replace('-', ' '))) {
        matched.add(theme);
      }
    }
  }

  if (matched.size === 0) {
    matched.add('learning');
    matched.add('habits');
  }

  return Array.from(matched).slice(0, 4);
}

function inferProblemTags(themes: string[], subjects: string[]): string[] {
  const tags = new Set<string>();
  for (const theme of themes) {
    const tax = PROBLEM_TAXONOMY[theme];
    if (tax) {
      tax.tags.slice(0, 2).forEach((t) => tags.add(t));
    }
  }
  return Array.from(tags).slice(0, 5);
}
