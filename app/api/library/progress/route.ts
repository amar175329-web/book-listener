import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const user = getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      bookId,
      progressPct,
      currentPositionSeconds,
      currentChapterIndex = 0,
      format = 'audio',
      chapterTitle,
      secondsListened = 0,
      liked
    } = body;

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const db = getDb();
    const libId = `lib_${crypto.randomUUID()}`;

    // Determine status: if progressPct >= 95, marked completed, else reading/listening
    let targetStatus = (format === 'audio' ? 'listening' : 'reading');
    if (typeof progressPct === 'number' && progressPct >= 95) {
      targetStatus = 'completed';
    }

    // Upsert user_library
    db.prepare(`
      INSERT INTO user_library (
        id, user_id, book_id, status, progress_pct, current_position_seconds,
        current_chapter_index, last_format, liked, last_accessed_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), CURRENT_TIMESTAMP
      )
      ON CONFLICT(user_id, book_id) DO UPDATE SET
        status = CASE WHEN excluded.progress_pct >= 95 THEN 'completed' ELSE excluded.status END,
        progress_pct = COALESCE(excluded.progress_pct, user_library.progress_pct),
        current_position_seconds = COALESCE(excluded.current_position_seconds, user_library.current_position_seconds),
        current_chapter_index = COALESCE(excluded.current_chapter_index, user_library.current_chapter_index),
        last_format = COALESCE(excluded.last_format, user_library.last_format),
        liked = CASE WHEN excluded.liked != 0 THEN excluded.liked ELSE user_library.liked END,
        last_accessed_at = CURRENT_TIMESTAMP
    `).run(
      libId,
      user.id,
      bookId,
      targetStatus,
      progressPct ?? 0,
      currentPositionSeconds ?? 0,
      currentChapterIndex,
      format,
      liked ?? 0
    );

    // Record consumption history session if seconds listended > 0
    if (secondsListened > 0) {
      const historyId = `hist_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO consumption_history (id, user_id, book_id, format, chapter_index, chapter_title, seconds_consumed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(historyId, user.id, bookId, format, currentChapterIndex, chapterTitle || null, secondsListened);
    }

    return NextResponse.json({ success: true, bookId, progressPct, status: targetStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
