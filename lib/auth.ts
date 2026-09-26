import crypto from 'crypto';
import { getDb } from './db';
import { User } from './types';

const SECRET = process.env.AUTH_SECRET || 'book-listener-secret-token-key-2026-secure-session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function generateToken(userId: string): string {
  const payload = {
    userId,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  return `${str}.${sig}`;
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const [str, sig] = token.split('.');
    if (!str || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token) return null;
  const parsed = verifyToken(token);
  if (!parsed) return null;

  const db = getDb();
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.userId) as any;
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    languagePreference: row.language_preference || 'en',
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at
  };
}
