import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { AudioTrack } from '@/lib/types';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(id, id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // 1. Check existing tracks in DB
    const existing = db.prepare(`
      SELECT * FROM audio_tracks WHERE book_id = ? ORDER BY track_index ASC
    `).all(row.id) as any[];

    if (existing.length > 0) {
      const tracks: AudioTrack[] = existing.map((t) => ({
        id: t.id,
        bookId: t.book_id,
        trackIndex: t.track_index,
        title: t.title,
        durationSeconds: t.duration_seconds,
        streamUrl: t.stream_url,
        source: t.source
      }));
      return NextResponse.json({ bookId: row.id, tracks });
    }

    // 2. If no tracks in DB but has librivox_identifier, fetch from Internet Archive
    if (row.librivox_identifier) {
      const identifier = row.librivox_identifier;
      const url = `https://archive.org/metadata/${identifier}/files`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BookListener/1.0 (Audiobook Streamer)' }
      });

      if (res.ok) {
        const data = await res.json();
        const files: any[] = data.result || [];
        const mp3Files = files.filter((f) => 
          (f.format === 'VBR MP3' || f.name?.endsWith('.mp3')) && 
          !f.name?.includes('64kb') && 
          !f.name?.includes('_thumb')
        );

        const insertTrack = db.prepare(`
          INSERT INTO audio_tracks (id, book_id, track_index, title, duration_seconds, stream_url, source)
          VALUES (?, ?, ?, ?, ?, ?, 'librivox')
        `);

        const createdTracks: AudioTrack[] = [];
        let index = 1;
        for (const file of mp3Files) {
          const trackId = `trk_${row.id}_${index}`;
          const streamUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(file.name)}`;
          const duration = file.length ? Math.round(parseFloat(file.length)) : null;
          const title = file.title || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

          insertTrack.run(trackId, row.id, index, title, duration, streamUrl);
          createdTracks.push({
            id: trackId,
            bookId: row.id,
            trackIndex: index,
            title,
            durationSeconds: duration ?? undefined,
            streamUrl,
            source: 'librivox'
          });
          index++;
        }

        return NextResponse.json({ bookId: row.id, tracks: createdTracks });
      }
    }

    return NextResponse.json({ bookId: row.id, tracks: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
