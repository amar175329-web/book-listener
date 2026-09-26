import { NextResponse } from 'next/server';
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
    const themes = body.themes || body.themeIds || [];
    const languagePreference = body.languagePreference;

    if (!Array.isArray(themes) || themes.length < 3) {
      return NextResponse.json({ error: 'Please select at least 3 themes' }, { status: 400 });
    }

    const db = getDb();
    
    // Clear old themes and insert new ones
    db.prepare('DELETE FROM user_themes WHERE user_id = ?').run(user.id);
    const insertTheme = db.prepare('INSERT INTO user_themes (user_id, theme_id) VALUES (?, ?)');
    for (const t of themes) {
      insertTheme.run(user.id, t);
    }

    // Mark onboarding completed and update language if specified
    if (languagePreference) {
      db.prepare('UPDATE users SET onboarding_completed = 1, language_preference = ? WHERE id = ?')
        .run(languagePreference, user.id);
    } else {
      db.prepare('UPDATE users SET onboarding_completed = 1 WHERE id = ?').run(user.id);
    }

    const updatedUser = db.prepare('SELECT id, email, name, language_preference, onboarding_completed, created_at FROM users WHERE id = ?').get(user.id) as any;

    return NextResponse.json({
      success: true,
      themes,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        languagePreference: updatedUser.language_preference,
        onboardingCompleted: Boolean(updatedUser.onboarding_completed),
        createdAt: updatedUser.created_at
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
