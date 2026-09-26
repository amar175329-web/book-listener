import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../lib/auth.ts';

describe('Authentication & Token Security (lib/auth)', () => {
  it('should hash and verify passwords using PBKDF2-SHA512', () => {
    const rawPassword = 'SecurePassword#2026!';
    const hash = hashPassword(rawPassword);

    assert.ok(hash.includes(':'), 'Hash must contain salt delimiter');
    const [salt, key] = hash.split(':');
    assert.strictEqual(salt.length, 32, '16-byte hex salt should be 32 chars');
    assert.strictEqual(key.length, 128, '64-byte sha512 hex key should be 128 chars');

    // Verify valid password
    assert.strictEqual(verifyPassword(rawPassword, hash), true);

    // Verify wrong password fails
    assert.strictEqual(verifyPassword('WrongPassword123', hash), false);
  });

  it('should generate unique salts for the same password', () => {
    const p = 'SamePassword';
    const hash1 = hashPassword(p);
    const hash2 = hashPassword(p);
    assert.notStrictEqual(hash1, hash2, 'Identical passwords must produce distinct salted hashes');
  });

  it('should issue and verify HMAC-SHA256 session tokens', () => {
    const userId = 'usr_test_12345';
    const token = generateToken(userId);

    assert.ok(token.includes('.'), 'Token must contain payload and HMAC signature');
    const parsed = verifyToken(token);
    assert.ok(parsed, 'Token should verify successfully');
    assert.strictEqual(parsed.userId, userId);
  });

  it('should reject tampered or corrupted tokens', () => {
    const userId = 'usr_test_12345';
    const token = generateToken(userId);
    const [body, sig] = token.split('.');

    // Tampered body
    const tampered = `${body}extra.${sig}`;
    assert.strictEqual(verifyToken(tampered), null);

    // Tampered signature
    const badSig = `${body}.${sig.slice(0, -4)}xxxx`;
    assert.strictEqual(verifyToken(badSig), null);
  });
});
