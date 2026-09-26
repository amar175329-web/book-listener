import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDb } from '../lib/db.ts';
import { runSeed } from '../lib/seed.ts';

describe('Database Schema & Lifecycle (lib/db & lib/seed)', () => {
  it('should initialize SQLite with WAL mode and foreign keys enabled', () => {
    const db = getDb();
    const journalMode = db.prepare('PRAGMA journal_mode').get();
    assert.strictEqual(journalMode.journal_mode.toLowerCase(), 'wal');

    const foreignKeys = db.prepare('PRAGMA foreign_keys').get();
    assert.strictEqual(foreignKeys.foreign_keys, 1);
  });

  it('should execute seed and populate all 11 curated personal-growth books', () => {
    runSeed();
    const db = getDb();

    const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get();
    assert.ok(bookCount.count >= 11, `Expected at least 11 seeded books, found ${bookCount.count}`);

    // Verify key titles exist
    const meditations = db.prepare("SELECT * FROM books WHERE slug = 'meditations-marcus-aurelius'").get();
    assert.ok(meditations, 'Meditations must be seeded');
    assert.strictEqual(meditations.gutenberg_id, 2680);

    const atomicHabits = db.prepare("SELECT * FROM books WHERE slug = 'atomic-habits-james-clear'").get();
    assert.ok(atomicHabits, 'Atomic Habits must be seeded');
    const atomicFlags = JSON.parse(atomicHabits.source_flags_json);
    assert.strictEqual(atomicFlags.hasSpotify, true);
    assert.strictEqual(atomicFlags.hasGutenberg, false);

    const enchiridion = db.prepare("SELECT * FROM books WHERE slug = 'the-enchiridion-epictetus'").get();
    assert.ok(enchiridion, 'The Enchiridion must be seeded');
    assert.strictEqual(enchiridion.gutenberg_id, 45109);

    const psychologyOfMoney = db.prepare("SELECT * FROM books WHERE slug = 'the-psychology-of-money-morgan-housel'").get();
    assert.ok(psychologyOfMoney, 'The Psychology of Money must be seeded');
  });

  it('should have original summaries for all seeded books with mandatory attribution notice', () => {
    const db = getDb();
    const summaries = db.prepare('SELECT * FROM original_summaries').all();
    assert.ok(summaries.length >= 11, `Expected at least 11 summaries, found ${summaries.length}`);

    for (const s of summaries) {
      assert.ok(s.attribution_notice.includes('Book Listener Original Summary'));
      const lessons = JSON.parse(s.key_lessons_json);
      assert.ok(lessons.length >= 2, `Summary for book ${s.book_id} must have at least 2 lessons`);
    }
  });

  it('should track user library progress, rating, and notes lifecycle', () => {
    const db = getDb();
    const testUserId = `test_user_${Date.now()}`;
    const testBookId = 'book_meditations';

    // 1. Create test user
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (?, ?, 'hash', 'Test User')
    `).run(testUserId, `${testUserId}@example.com`);

    // 2. Save book to library
    const libId = `lib_${Date.now()}`;
    db.prepare(`
      INSERT INTO user_library (id, user_id, book_id, status, rating, notes, progress_pct)
      VALUES (?, ?, ?, 'reading', 5, 'Control your reactions, not external events.', 45.0)
    `).run(libId, testUserId, testBookId);

    // 3. Query saved item
    const saved = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND book_id = ?').get(testUserId, testBookId);
    assert.ok(saved);
    assert.strictEqual(saved.status, 'reading');
    assert.strictEqual(saved.rating, 5);
    assert.strictEqual(saved.notes, 'Control your reactions, not external events.');
    assert.strictEqual(saved.progress_pct, 45.0);

    // 4. Update progress and mark completed
    db.prepare(`
      UPDATE user_library
      SET progress_pct = 100.0, status = 'completed'
      WHERE id = ?
    `).run(libId);

    const completed = db.prepare('SELECT * FROM user_library WHERE id = ?').get(libId);
    assert.strictEqual(completed.progress_pct, 100.0);
    assert.strictEqual(completed.status, 'completed');

    // Clean up test data
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });
});
