import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveAvailability } from '../lib/source-resolver.ts';

describe('Source Availability Matrix Resolver (lib/source-resolver)', () => {
  it('should correctly resolve public domain book availability (4 states)', () => {
    const publicDomainBook = {
      id: 'book_meditations',
      slug: 'meditations-marcus-aurelius',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      description: 'Stoic philosophy',
      themes: ['discipline', 'focus'],
      problemTags: ['anxiety'],
      sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
      spotifyQuery: 'Meditations Marcus Aurelius',
      gutenbergId: 2680,
      librivoxIdentifier: 'themeditationsofmarcusaurelius_1801_librivox',
      metadataSource: 'curated'
    };

    const matrix = resolveAvailability(publicDomainBook);

    // State 1: Spotify
    assert.strictEqual(matrix.spotify.available, true);
    assert.ok(matrix.spotify.webUrl?.includes('open.spotify.com/search/'));
    assert.ok(matrix.spotify.appUri?.startsWith('spotify:search:'));

    // State 2: Free Read (Gutenberg)
    assert.strictEqual(matrix.freeRead.available, true);
    assert.strictEqual(matrix.freeRead.gutenbergId, 2680);
    assert.strictEqual(matrix.freeRead.readUrl, '/api/books/book_meditations/read');

    // State 3: Free Listen (LibriVox)
    assert.strictEqual(matrix.freeListen.available, true);
    assert.strictEqual(matrix.freeListen.identifier, 'themeditationsofmarcusaurelius_1801_librivox');

    // State 4: Book Listener Original Summary
    assert.strictEqual(matrix.summary.available, true);
    assert.ok(matrix.summary.label.includes('Original Summary'));

    // Attributions check
    assert.ok(matrix.attributions.some((a) => a.includes('Project Gutenberg')));
    assert.ok(matrix.attributions.some((a) => a.includes('LibriVox')));
  });

  it('should correctly flag copyrighted modern books with Spotify and Summary only', () => {
    const modernBook = {
      id: 'book_atomic_habits',
      slug: 'atomic-habits-james-clear',
      title: 'Atomic Habits',
      author: 'James Clear',
      description: 'Habits book',
      themes: ['habits'],
      problemTags: ['procrastination'],
      sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
      spotifyQuery: 'Atomic Habits James Clear',
      metadataSource: 'curated'
    };

    const matrix = resolveAvailability(modernBook);

    assert.strictEqual(matrix.spotify.available, true);
    assert.strictEqual(matrix.freeRead.available, false);
    assert.strictEqual(matrix.freeListen.available, false);
    assert.strictEqual(matrix.summary.available, true);
    assert.ok(matrix.attributions.some((a) => a.includes('Original Summary')));
  });
});
