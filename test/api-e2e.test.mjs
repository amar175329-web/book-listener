import { describe, it } from 'node:test';
import assert from 'node:assert';
import { POST as registerHandler } from '../app/api/auth/register/route.ts';
import { POST as loginHandler } from '../app/api/auth/login/route.ts';
import { GET as meHandler } from '../app/api/auth/me/route.ts';
import { GET as themesHandler } from '../app/api/onboarding/themes/route.ts';
import { POST as preferencesHandler } from '../app/api/onboarding/preferences/route.ts';
import { GET as featuredHandler } from '../app/api/books/featured/route.ts';
import { GET as searchHandler } from '../app/api/books/search/route.ts';
import { GET as bookDetailHandler } from '../app/api/books/[id]/route.ts';
import { GET as tracksHandler } from '../app/api/books/[id]/tracks/route.ts';
import { GET as summaryHandler } from '../app/api/books/[id]/summary/route.ts';
import { GET as readHandler } from '../app/api/books/[id]/read/route.ts';
import { GET as libraryHandler } from '../app/api/library/route.ts';
import { POST as saveLibraryHandler } from '../app/api/library/save/route.ts';
import { POST as progressLibraryHandler } from '../app/api/library/progress/route.ts';
import { getDb } from '../lib/db.ts';

describe('Comprehensive End-to-End API Routes Verification', () => {
  const testEmail = `e2e_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  const testName = 'E2E Tester';
  let authToken = '';
  let userId = '';

  it('1. POST /api/auth/register should register a new user', async () => {
    const req = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName, language: 'en' })
    });
    const res = await registerHandler(req);
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.ok(data.user);
    assert.strictEqual(data.user.email, testEmail);
    assert.strictEqual(data.user.onboardingCompleted, false);
    authToken = data.token;
    userId = data.user.id;
  });

  it('2. POST /api/auth/login should authenticate user and issue token', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const res = await loginHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.id, userId);
  });

  it('3. GET /api/auth/me should return current user profile with valid Bearer token', async () => {
    const req = new Request('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const res = await meHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.id, userId);
  });

  it('4. GET /api/onboarding/themes should return all 9 life themes', async () => {
    const res = await themesHandler();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.themes.length, 9);
    assert.ok(data.themes.some((t) => t.id === 'consistency'));
  });

  it('5. POST /api/onboarding/preferences should save 3 themes and mark onboarding completed', async () => {
    const req = new Request('http://localhost:3000/api/onboarding/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        themeIds: ['consistency', 'focus', 'discipline'],
        languagePreference: 'hi'
      })
    });
    const res = await preferencesHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.onboardingCompleted, true);
    assert.strictEqual(data.user.languagePreference, 'hi');
  });

  it('6. GET /api/books/featured should return categorized sections with 4-state availability', async () => {
    const res = await featuredHandler();
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.sections.length >= 3);
    assert.ok(data.allBooks.length >= 11);
    const sample = data.allBooks[0];
    assert.ok(sample.availability);
    assert.ok(sample.availability.spotify);
    assert.ok(sample.availability.freeRead);
    assert.ok(sample.availability.freeListen);
    assert.ok(sample.availability.summary);
  });

  it('7. GET /api/books/search should search by problem query', async () => {
    const req = new Request('http://localhost:3000/api/books/search?q=consistency', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const res = await searchHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.books.length > 0);
    assert.ok(data.books[0].searchScore > 0);
    assert.ok(data.books[0].matchedAspects.length > 0);
  });

  it('8. GET /api/books/[id] should fetch book detail and availability', async () => {
    const req = new Request('http://localhost:3000/api/books/book_meditations');
    const res = await bookDetailHandler(req, { params: Promise.resolve({ id: 'book_meditations' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.book.title, 'Meditations');
    assert.strictEqual(data.availability.freeRead.available, true);
    assert.strictEqual(data.availability.freeListen.available, true);
  });

  it('9. GET /api/books/[id]/tracks should return audio tracks for LibriVox book', async () => {
    const req = new Request('http://localhost:3000/api/books/book_meditations/tracks');
    const res = await tracksHandler(req, { params: Promise.resolve({ id: 'book_meditations' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.tracks.length >= 3);
    assert.ok(data.tracks[0].streamUrl.startsWith('https://archive.org/download/'));
  });

  it('10. GET /api/books/[id]/summary should return original transformative summary', async () => {
    const req = new Request('http://localhost:3000/api/books/book_meditations/summary');
    const res = await summaryHandler(req, { params: Promise.resolve({ id: 'book_meditations' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.summary);
    assert.ok(data.summary.attributionNotice.includes('Book Listener Original Summary'));
    assert.ok(data.summary.keyLessons.length >= 3);
  });

  it('11. GET /api/books/[id]/read should return public domain text for Gutenberg title', async () => {
    const req = new Request('http://localhost:3000/api/books/book_meditations/read');
    const res = await readHandler(req, { params: Promise.resolve({ id: 'book_meditations' }) });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.text.length > 500);
    assert.strictEqual(data.gutenbergId, 2680);
  });

  it('12. GET /api/books/[id]/read on copyrighted title must return 400 with legal scope notice', async () => {
    const req = new Request('http://localhost:3000/api/books/book_atomic_habits/read');
    const res = await readHandler(req, { params: Promise.resolve({ id: 'book_atomic_habits' }) });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.legalNotice);
    assert.ok(data.legalNotice.includes('copyrighted modern titles are never hosted in full text'));
  });

  it('13. POST /api/library/save should save book to user library', async () => {
    const req = new Request('http://localhost:3000/api/library/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookId: 'book_meditations',
        status: 'reading',
        rating: 5,
        notes: 'Life-changing Stoic wisdom on emotional mastery.'
      })
    });
    const res = await saveLibraryHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });

  it('14. POST /api/library/progress should track reading/listening session', async () => {
    const req = new Request('http://localhost:3000/api/library/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookId: 'book_meditations',
        progressPct: 65.5,
        currentPositionSeconds: 420,
        currentChapterIndex: 1,
        format: 'audio',
        chapterTitle: 'Book 1: Debts and Lessons from Mentors',
        secondsListened: 180,
        liked: 1
      })
    });
    const res = await progressLibraryHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'listening');
  });

  it('15. GET /api/library should return the user library with counts and availability', async () => {
    const req = new Request('http://localhost:3000/api/library', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const res = await libraryHandler(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.counts.total, 1);
    assert.strictEqual(data.items[0].bookId, 'book_meditations');
    assert.strictEqual(data.items[0].rating, 5);
    assert.strictEqual(data.items[0].progressPct, 65.5);
    assert.strictEqual(data.items[0].liked, 1);

    // Clean up test user
    const db = getDb();
    await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
});
