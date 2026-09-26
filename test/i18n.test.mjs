import { describe, it } from 'node:test';
import assert from 'node:assert';
import { t, THEMES, DICTIONARY } from '../lib/i18n.ts';

describe('Bilingual Localization & Themes (lib/i18n)', () => {
  it('should return English UI strings when lang is en', () => {
    assert.strictEqual(t('app_name', 'en'), 'Book Listener');
    assert.strictEqual(t('nav_discover', 'en'), 'Discover');
    assert.strictEqual(t('state_spotify', 'en'), 'Open on Spotify');
    assert.strictEqual(t('state_free_read', 'en'), 'Read Free in App');
  });

  it('should return Hindi UI strings when lang is hi', () => {
    assert.strictEqual(t('app_name', 'hi'), 'बुक लिसनर');
    assert.strictEqual(t('nav_discover', 'hi'), 'खोजें');
    assert.strictEqual(t('state_spotify', 'hi'), 'स्पॉटिफ़ाई पर खोलें');
    assert.strictEqual(t('state_free_read', 'hi'), 'मुफ्त पढ़ें (ऐप में)');
  });

  it('should have complete Hindi translations for all critical keys in dictionary', () => {
    const enKeys = Object.keys(DICTIONARY.en);
    for (const key of enKeys) {
      assert.ok(DICTIONARY.hi[key], `Missing Hindi translation for key: ${key}`);
      assert.ok(DICTIONARY.hi[key].length > 0);
    }
  });

  it('should validate all 9 life themes have bilingual metadata and icons', () => {
    assert.strictEqual(THEMES.length, 9);
    for (const theme of THEMES) {
      assert.ok(theme.id);
      assert.ok(theme.nameEn, `Theme ${theme.id} missing nameEn`);
      assert.ok(theme.nameHi, `Theme ${theme.id} missing nameHi`);
      assert.ok(theme.icon, `Theme ${theme.id} missing icon`);
      assert.ok(theme.descriptionEn, `Theme ${theme.id} missing descriptionEn`);
      assert.ok(theme.descriptionHi, `Theme ${theme.id} missing descriptionHi`);
    }
  });
});
