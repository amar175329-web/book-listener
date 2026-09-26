import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { OriginalSummary } from '@/lib/types';
import { getOrCreateSummary } from '@/lib/ai-summary';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(id, id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const summaryRow = db.prepare('SELECT * FROM original_summaries WHERE book_id = ?').get(row.id) as any;

    let summary: OriginalSummary;
    if (summaryRow) {
      summary = {
        id: summaryRow.id,
        bookId: summaryRow.book_id,
        title: summaryRow.title,
        executiveOverview: summaryRow.executive_overview,
        coreProblemSolved: summaryRow.core_problem_solved,
        keyLessons: JSON.parse(summaryRow.key_lessons_json || '[]'),
        audioTtsUrl: summaryRow.audio_tts_url,
        audioDurationSeconds: summaryRow.audio_duration_seconds,
        attributionNotice: summaryRow.attribution_notice
      };
    } else {
      summary = await getOrCreateSummary({
        bookId: row.id,
        title: row.title,
        author: row.author,
        description: row.description,
        themes: JSON.parse(row.themes_json || '[]'),
        problemTags: JSON.parse(row.problem_tags_json || '[]')
      });
    }

    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
