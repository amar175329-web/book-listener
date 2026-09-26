import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Sign in to save books to your library.' }, { status: 401 });
    }

    const body = await req.json();
    const { bookId, status = 'saved', rating, notes, liked } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const db = getDb();
    const libId = `lib_${crypto.randomUUID()}`;

    await db.prepare(`
      INSERT INTO user_library (id, user_id, book_id, status, rating, notes, liked, last_accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 0), CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        status = CASE WHEN excluded.status IS NOT NULL THEN excluded.status ELSE user_library.status END,
        rating = CASE WHEN excluded.rating IS NOT NULL THEN excluded.rating ELSE user_library.rating END,
        notes = CASE WHEN excluded.notes IS NOT NULL THEN excluded.notes ELSE user_library.notes END,
        liked = CASE WHEN excluded.liked != 0 THEN excluded.liked ELSE user_library.liked END,
        last_accessed_at = CURRENT_TIMESTAMP
    `).run(libId, user.id, bookId, status, rating ?? null, notes ?? null, liked ?? null);

    return NextResponse.json({ success: true, bookId, status, rating, notes, liked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
