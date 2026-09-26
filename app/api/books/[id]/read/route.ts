import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'gutenberg_cache');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = await db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(id, id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (!row.gutenberg_id) {
      return NextResponse.json({
        error: 'Full text reading is only available for legal public domain books.',
        legalNotice: 'Under Book Listener scope boundaries, copyrighted modern titles are never hosted in full text. Please check the summary or Spotify link.'
      }, { status: 400 });
    }

    const gutenbergId = row.gutenberg_id;
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
    } catch {}

    const cacheFilePath = path.join(CACHE_DIR, `${gutenbergId}.txt`);
    let rawText = '';

    if (fs.existsSync(cacheFilePath)) {
      rawText = fs.readFileSync(cacheFilePath, 'utf-8');
    } else {
      // Fetch from Gutenberg cache
      const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BookListener/1.0 (Public Domain Reader)' }
      });

      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch public domain text from Project Gutenberg' }, { status: 502 });
      }

      rawText = await res.text();
      try {
        fs.writeFileSync(cacheFilePath, rawText, 'utf-8');
      } catch {}
    }

    // Strip Gutenberg header and footer markers for clean reading
    let cleanedText = rawText;
    const startMatch = rawText.match(/\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\*]*\*\*\*/i);
    if (startMatch && startMatch.index !== undefined) {
      cleanedText = cleanedText.slice(startMatch.index + startMatch[0].length);
    }
    const endMatch = cleanedText.match(/\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i);
    if (endMatch && endMatch.index !== undefined) {
      cleanedText = cleanedText.slice(0, endMatch.index);
    }

    return NextResponse.json({
      bookId: row.id,
      title: row.title,
      author: row.author,
      gutenbergId,
      source: 'Project Gutenberg (Public Domain)',
      text: cleanedText.trim()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
