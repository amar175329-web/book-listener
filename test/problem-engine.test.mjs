import { describe, it } from 'node:test';
import assert from 'node:assert';
import { searchBooksByProblem, PROBLEM_TAXONOMY } from '../lib/problem-engine.ts';

const mockBooks = [
  {
    id: 'book_meditations',
    slug: 'meditations-marcus-aurelius',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    description: 'Stoic philosophy on resilience, emotional calm, and discipline.',
    themes: ['discipline', 'focus', 'consistency'],
    problemTags: ['distraction', 'overthinking', 'quitting', 'anxiety', 'loss-of-control'],
    sourceFlags: { hasSpotify: true, hasGutenberg: true, hasLibriVox: true, hasSummary: true },
    metadataSource: 'curated'
  },
  {
    id: 'book_atomic_habits',
    slug: 'atomic-habits-james-clear',
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'Build good habits and break bad ones using 1% daily compounding.',
    themes: ['habits', 'consistency', 'discipline'],
    problemTags: ['quitting', 'bad-habits', 'irregularity', 'giving up', 'procrastination'],
    sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
    metadataSource: 'curated'
  },
  {
    id: 'book_deep_work',
    slug: 'deep-work-cal-newport',
    title: 'Deep Work',
    author: 'Cal Newport',
    description: 'Rules for focused success in a distracted world.',
    themes: ['focus', 'discipline'],
    problemTags: ['distraction', 'phone-addiction', 'scattered', 'multitasking', 'brain-fog'],
    sourceFlags: { hasSpotify: true, hasGutenberg: false, hasLibriVox: false, hasSummary: true },
    metadataSource: 'curated'
  }
];

describe('Problem Search Engine (lib/problem-engine)', () => {
  it('should find relevant books when searching for "consistency"', () => {
    const results = searchBooksByProblem('consistency', mockBooks, []);
    assert.ok(results.length > 0, 'Expected results for consistency query');
    
    // Top results should match consistency problem tag or theme
    const topBook = results[0].book;
    const hasConsistency = topBook.themes.includes('consistency') || topBook.problemTags.includes('quitting');
    assert.strictEqual(hasConsistency, true, 'Top book should address consistency');
  });

  it('should prioritize Deep Work when searching for "distraction" or "phone addiction"', () => {
    const results = searchBooksByProblem('phone addiction', mockBooks, []);
    assert.ok(results.length > 0);
    assert.strictEqual(results[0].book.id, 'book_deep_work');
    assert.ok(results[0].matchedAspects.some((a) => a.includes('#phone-addiction')));
  });

  it('should boost books matching user onboarding preference themes', () => {
    const withoutPref = searchBooksByProblem('', mockBooks, []);
    const withPref = searchBooksByProblem('', mockBooks, ['habits']);

    // Book with 'habits' theme should be ranked highest when user picked 'habits'
    assert.strictEqual(withPref[0].book.id, 'book_atomic_habits');
    assert.ok(withPref[0].matchedAspects.some((a) => a.includes('habits')));
  });

  it('should perform title and author exact token matches', () => {
    const results = searchBooksByProblem('Marcus Aurelius', mockBooks, []);
    assert.ok(results.length > 0);
    assert.strictEqual(results[0].book.id, 'book_meditations');
    assert.ok(results[0].matchedAspects.some((a) => a.includes('Author match')));
  });

  it('taxonomy should define all 10 core life problem dimensions', () => {
    const expectedDimensions = [
      'consistency', 'focus', 'procrastination', 'energy',
      'habits', 'discipline', 'confidence', 'money',
      'relationships', 'learning'
    ];
    for (const dim of expectedDimensions) {
      assert.ok(PROBLEM_TAXONOMY[dim], `Missing taxonomy dimension: ${dim}`);
      assert.ok(PROBLEM_TAXONOMY[dim].themes.length > 0);
      assert.ok(PROBLEM_TAXONOMY[dim].tags.length > 0);
    }
  });
});
