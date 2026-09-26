import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { runSeed } from '@/lib/seed';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    runSeed();

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`login_${ip}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: `Too many login attempts. Please try again in ${rateLimit.resetInSec} seconds.`
      }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDb();
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;

    if (!userRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = verifyPassword(password, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = generateToken(userRow.id);

    // Fetch user themes
    const userThemes = db.prepare('SELECT theme_id FROM user_themes WHERE user_id = ?').all(userRow.id) as any[];

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      languagePreference: userRow.language_preference || 'en',
      onboardingCompleted: Boolean(userRow.onboarding_completed),
      createdAt: userRow.created_at,
      themes: userThemes.map((t) => t.theme_id)
    };

    return NextResponse.json({ user, token }, { status: 200 });
  } catch (error: any) {
    console.error('[Login Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
