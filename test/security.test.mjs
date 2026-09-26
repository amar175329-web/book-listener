import { describe, it } from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, isAllowedExternalUrl, sanitizeInput } from '../lib/security.ts';

describe('Security & Legal Compliance Guardrails (lib/security)', () => {
  it('should enforce rate limits per key', () => {
    const key = `test_ip_${Date.now()}`;
    const max = 3;

    const r1 = checkRateLimit(key, max, 10000);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 2);

    const r2 = checkRateLimit(key, max, 10000);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.remaining, 1);

    const r3 = checkRateLimit(key, max, 10000);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r3.remaining, 0);

    // 4th request must be blocked
    const r4 = checkRateLimit(key, max, 10000);
    assert.strictEqual(r4.allowed, false);
    assert.strictEqual(r4.remaining, 0);
  });

  it('should allow only authorized legal domains and reject unauthorized hosts', () => {
    // Allowed legal providers
    assert.strictEqual(isAllowedExternalUrl('https://openlibrary.org/search.json'), true);
    assert.strictEqual(isAllowedExternalUrl('https://covers.openlibrary.org/b/id/123-M.jpg'), true);
    assert.strictEqual(isAllowedExternalUrl('https://www.gutenberg.org/cache/epub/2680/pg2680.txt'), true);
    assert.strictEqual(isAllowedExternalUrl('https://archive.org/metadata/test/files'), true);
    assert.strictEqual(isAllowedExternalUrl('https://standardebooks.org/ebooks/test'), true);

    // Prohibited unauthorized hosts (potential SSRF / copyright risks)
    assert.strictEqual(isAllowedExternalUrl('https://malicious-site.com/pirated.pdf'), false);
    assert.strictEqual(isAllowedExternalUrl('https://youtube.com/watch?v=1234'), false);
    assert.strictEqual(isAllowedExternalUrl('http://169.254.169.254/latest/meta-data'), false);
    assert.strictEqual(isAllowedExternalUrl('http://localhost:3000/internal'), false);
  });

  it('should sanitize raw inputs to prevent HTML/XSS injection', () => {
    const dirty = '<script>alert("hacked")</script>&foo=\'bar\'';
    const clean = sanitizeInput(dirty);

    assert.strictEqual(clean.includes('<script>'), false);
    assert.strictEqual(clean.includes('&lt;script&gt;'), true);
    assert.strictEqual(clean.includes('&quot;'), true);
    assert.strictEqual(clean.includes('&#x27;'), true);
  });
});
