import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromToken } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

export async function GET(req: Request) {
  try {
    await runSeed();
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const userThemes = await db.prepare('SELECT theme_id FROM user_themes WHERE user_id = ?').all(user.id) as any[];

    return NextResponse.json({
      user: {
        ...user,
        themes: userThemes.map((t) => t.theme_id)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
