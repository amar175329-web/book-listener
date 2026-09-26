import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runSeed } from '@/lib/seed';
import { Book } from '@/lib/types';
import { resolveAvailability } from '@/lib/source-resolver';

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await runSeed();
    const { id } = await params;
    const db = getDb();
    
    // Look up by id or slug
    const row = await db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(id, id) as any;
    if (!row) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const book = parseBookRow(row);
    const availability = resolveAvailability(book);

    return NextResponse.json({
      book,
      availability
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
