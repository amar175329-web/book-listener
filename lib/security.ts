/**
 * Security and Compliance Guardrails for Book Listener
 * - In-memory IP rate limiting for sensitive endpoints (auth, search)
 * - Domain whitelisting for external fetches
 * - Parameter sanitization
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter
 * @param key Identifier (e.g. IP + endpoint)
 * @param maxRequests Maximum requests allowed within window
 * @param windowMs Window duration in milliseconds (default 60s)
 */
export function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetInSec: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, resetInSec: Math.ceil((record.resetAt - now) / 1000) };
}

/**
 * Clean up expired rate limit entries periodically
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 300000); // Every 5 minutes
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

/**
 * Validates that an outbound URL matches only authorized legal content providers.
 * Strictly prevents SSRF (Server-Side Request Forgery) attacks.
 */
export function isAllowedExternalUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const allowedHosts = [
      'openlibrary.org',
      'covers.openlibrary.org',
      'www.gutenberg.org',
      'gutenberg.org',
      'archive.org',
      'www.archive.org',
      'googleapis.com',
      'books.googleapis.com',
      'standardebooks.org'
    ];

    return allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Sanitizes search queries and user text inputs to prevent injection and XSS
 */
export function sanitizeInput(input: string, maxLength = 200): string {
  if (!input) return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        case '&': return '&amp;';
        default: return char;
      }
    });
}
