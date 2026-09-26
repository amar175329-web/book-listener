import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runSeed } from '@/lib/seed';
import { Book } from '@/lib/types';
import { searchBooksByProblem } from '@/lib/problem-engine';
import { resolveAvailability } from '@/lib/source-resolver';
import { getUserFromToken } from '@/lib/auth';
import { searchExternalBooks } from '@/lib/external-integrations';

function parseBookRow(row: any): Book {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.author,
    description: row.description,
    coverUrl: row.cover_url,
    publishedYear: row.published_year,
    themes: JSON.parse(row.themes_json || '[]'),
    problemTags: JSON.parse(row.problem_tags_json || '[]'),
    sourceFlags: JSON.parse(row.source_flags_json || '{}'),
    spotifyQuery: row.spotify_query,
    gutenbergId: row.gutenberg_id,
    standardEbooksSlug: row.standard_ebooks_slug,
    librivoxIdentifier: row.librivox_identifier,
    openLibraryKey: row.open_library_key,
    googleBooksId: row.google_books_id,
    metadataSource: row.metadata_source || 'curated',
    createdAt: row.created_at
  };
}

export async function GET(req: Request) {
  try {
    await runSeed();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const themeFilter = searchParams.get('theme') || '';
    const sourceFilter = searchParams.get('source') || '';

    // Check optional authenticated user for personalization
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const user = await getUserFromToken(token);

    const db = getDb();
    let userThemes: string[] = [];
    if (user) {
      const rows = await db.prepare('SELECT theme_id FROM user_themes WHERE user_id = ?').all(user.id) as any[];
      userThemes = rows.map((r) => r.theme_id);
    }

    // Fetch all books
    const rows = await db.prepare('SELECT * FROM books').all() as any[];
    let allBooks = rows.map(parseBookRow);

    // Apply problem search engine
    let searchResults = searchBooksByProblem(query, allBooks, userThemes);

    // Expand via Open Library legal metadata if few results found
    if (query.trim().length >= 3 && searchResults.length < 3) {
      try {
        const externalBooks = await searchExternalBooks(query);
        if (externalBooks.length > 0) {
          const updatedRows = await db.prepare('SELECT * FROM books').all() as any[];
          allBooks = updatedRows.map(parseBookRow);
          searchResults = searchBooksByProblem(query, allBooks, userThemes);
        }
      } catch (err) {
        console.warn('[External Search Warning]:', err);
      }
    }

    // Apply theme filter if specified
    if (themeFilter) {
      searchResults = searchResults.filter((res) => res.book.themes.includes(themeFilter));
    }

    // Apply source filter if specified
    if (sourceFilter) {
      if (sourceFilter === 'spotify') {
        searchResults = searchResults.filter((res) => res.book.sourceFlags.hasSpotify);
      } else if (sourceFilter === 'gutenberg' || sourceFilter === 'freeRead') {
        searchResults = searchResults.filter((res) => res.book.sourceFlags.hasGutenberg);
      } else if (sourceFilter === 'librivox' || sourceFilter === 'freeListen') {
        searchResults = searchResults.filter((res) => res.book.sourceFlags.hasLibriVox);
      } else if (sourceFilter === 'summary') {
        searchResults = searchResults.filter((res) => res.book.sourceFlags.hasSummary);
      }
    }

    const payload = searchResults.map((item) => ({
      ...item.book,
      searchScore: item.score,
      matchedAspects: item.matchedAspects,
      matchedProblem: item.matchedProblem,
      availability: resolveAvailability(item.book)
    }));

    return NextResponse.json({
      query,
      themeFilter,
      sourceFilter,
      total: payload.length,
      books: payload
    });
  } catch (error: any) {
    console.error('[Search Error]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
