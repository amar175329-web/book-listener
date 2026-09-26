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

export async function GET() {
  try {
    runSeed();
    const db = getDb();
    const rows = db.prepare('SELECT * FROM books').all() as any[];
    const allBooks = rows.map(parseBookRow).map((book) => ({
      ...book,
      availability: resolveAvailability(book)
    }));

    const consistencyBooks = allBooks.filter((b) => b.themes.includes('consistency') || b.themes.includes('habits'));
    const focusBooks = allBooks.filter((b) => b.themes.includes('focus') || b.problemTags.includes('distraction'));
    const classicBooks = allBooks.filter((b) => b.gutenbergId !== null || b.librivoxIdentifier !== null);

    return NextResponse.json({
      sections: [
        {
          id: 'consistency-habits',
          titleEn: 'Conquer Consistency & Build Unbreakable Habits',
          titleHi: 'निरंतरता लाएं और अटूट आदतें बनाएं',
          subtitleEn: 'Break the start-stop cycle with proven systems and classic routines',
          subtitleHi: 'शुरू करके रुकने की आदत छोड़ें और मजबूत प्रणाली अपनाएं',
          books: consistencyBooks
        },
        {
          id: 'deep-focus',
          titleEn: 'Deep Focus & Cognitive Clarity',
          titleHi: 'गहरा ध्यान और मानसिक स्पष्टता',
          subtitleEn: 'Silence digital noise, recover your attention span, and do deep work',
          subtitleHi: 'डिजिटल भटकाव को रोकें और अपने एकाग्रता समय को पुनः प्राप्त करें',
          books: focusBooks
        },
        {
          id: 'public-domain-classics',
          titleEn: 'Timeless Public Domain Classics (Free Read & Listen)',
          titleHi: 'कालजयी क्लासिक्स (मुफ्त पढ़ें और सुनें)',
          subtitleEn: 'Permanent legal public domain literature with full audiobooks and texts',
          subtitleHi: 'स्थायी कानूनी सार्वजनिक डोमेन साहित्य, संपूर्ण ऑडियो और पाठ सहित',
          books: classicBooks
        }
      ],
      allBooks
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
