import { describe, it } from 'node:test';
import assert from 'node:assert';
import { searchExternalBooks, searchGoogleBooks } from '../lib/external-integrations';
import { resolveAvailability } from '../lib/source-resolver';
import { isAllowedExternalUrl } from '../lib/security';

describe('External Metadata Integrations (Open Library & Google Books)', () => {
  it('should reject empty or sub-2-character queries safely without network calls', async () => {
    const emptyRes = await searchExternalBooks('');
    const singleCharRes = await searchExternalBooks('a');
    const gbEmpty = await searchGoogleBooks(' ');
    
    assert.deepStrictEqual(emptyRes, []);
    assert.deepStrictEqual(singleCharRes, []);
    assert.deepStrictEqual(gbEmpty, []);
  });

  it('should validate SSRF whitelist contains both Open Library and Google Books endpoints', () => {
    assert.strictEqual(isAllowedExternalUrl('https://openlibrary.org/search.json?q=stoic'), true);
    assert.strictEqual(isAllowedExternalUrl('https://covers.openlibrary.org/b/id/123-M.jpg'), true);
    assert.strictEqual(isAllowedExternalUrl('https://books.googleapis.com/books/v1/volumes?q=stoic'), true);
    assert.strictEqual(isAllowedExternalUrl('https://evil-unauthorized-site.com/hack'), false);
  });

  it('should include required Google Books attribution when metadata source is google_books', () => {
    const bookWithGoogleMetadata = {
      id: 'gb_test123',
      slug: 'test-book-author',
      title: 'Test Philosophy Book',
      author: 'Test Author',
      description: 'Test description',
      themes: ['personal-growth'],
      problemTags: ['consistency'],
      sourceFlags: {
        hasSpotify: true,
        hasGutenberg: false,
        hasLibriVox: false,
        hasSummary: true
      },
      googleBooksId: 'test12345',
      metadataSource: 'google_books'
    };

    const matrix = resolveAvailability(bookWithGoogleMetadata);
    assert.ok(matrix.attributions.some((a) => a.includes('Google Books')));
    assert.ok(matrix.attributions.some((a) => a.includes('Book Listener Original Summary')));
  });
});
