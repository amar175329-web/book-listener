import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { runSeed } from '@/lib/seed';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    runSeed();

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`register_${ip}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: `Too many registration attempts. Please try again in ${rateLimit.resetInSec} seconds.`
      }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, name, languagePreference = 'en' } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields (email, password, name)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const userId = `usr_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, language_preference, onboarding_completed)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(userId, email.toLowerCase().trim(), passwordHash, name.trim(), languagePreference);

    const token = generateToken(userId);

    const user = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      languagePreference,
      onboardingCompleted: false,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error: any) {
    console.error('[Register Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
