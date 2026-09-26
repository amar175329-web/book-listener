import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { resolveAvailability } from '@/lib/source-resolver';
import { Book, UserLibraryItem } from '@/lib/types';

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
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Sign in to view your library.' }, { status: 401 });
    }

    const db = getDb();
    const rows = await db.prepare(`
      SELECT 
        ul.id as lib_id,
        ul.user_id,
        ul.book_id,
        ul.status,
        ul.progress_pct,
        ul.current_position_seconds,
        ul.current_chapter_index,
        ul.last_format,
        ul.liked,
        ul.rating,
        ul.notes,
        ul.last_accessed_at,
        b.*
      FROM user_library ul
      JOIN books b ON ul.book_id = b.id
      WHERE ul.user_id = ?
      ORDER BY ul.last_accessed_at DESC
    `).all(user.id) as any[];

    const items: (UserLibraryItem & { book: Book & { availability: any } })[] = rows.map((r) => {
      const book = parseBookRow(r);
      return {
        id: r.lib_id,
        userId: r.user_id,
        bookId: r.book_id,
        status: r.status,
        progressPct: r.progress_pct || 0,
        currentPositionSeconds: r.current_position_seconds || 0,
        currentChapterIndex: r.current_chapter_index || 0,
        lastFormat: r.last_format,
        liked: r.liked || 0,
        rating: r.rating,
        notes: r.notes,
        lastAccessedAt: r.last_accessed_at,
        book: {
          ...book,
          availability: resolveAvailability(book)
        }
      };
    });

    return NextResponse.json({
      items,
      counts: {
        total: items.length,
        reading: items.filter((i) => i.status === 'reading' || i.status === 'listening').length,
        saved: items.filter((i) => i.status === 'saved').length,
        completed: items.filter((i) => i.status === 'completed').length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
