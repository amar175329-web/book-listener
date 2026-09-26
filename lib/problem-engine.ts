import { Book } from './types';

// Comprehensive problem-to-theme mapping taxonomy
export const PROBLEM_TAXONOMY: Record<string, { themes: string[]; tags: string[]; relatedProblems: string[] }> = {
  consistency: {
    themes: ['consistency', 'habits', 'discipline'],
    tags: ['consistency', 'streaks', 'habit-building', 'routine', 'momentum', 'daily-action'],
    relatedProblems: ['quitting', 'irregularity', 'giving up', 'start-stop cycle', 'procrastination']
  },
  focus: {
    themes: ['focus', 'discipline'],
    tags: ['deep-work', 'distraction', 'attention-span', 'digital-detox', 'concentration', 'presence'],
    relatedProblems: ['distracted', 'phone-addiction', 'brain-fog', 'scattered', 'multitasking']
  },
  procrastination: {
    themes: ['habits', 'discipline', 'consistency'],
    tags: ['delay', 'action-bias', 'overcoming-inertia', 'execution', 'task-initiation'],
    relatedProblems: ['laziness', 'delaying', 'putting-off', 'paralysis', 'overthinking']
  },
  energy: {
    themes: ['energy', 'discipline'],
    tags: ['vitality', 'burnout-recovery', 'physical-resilience', 'sleep-optimization', 'stamina'],
    relatedProblems: ['tired', 'burnout', 'exhaustion', 'chronic-fatigue', 'sluggish']
  },
  habits: {
    themes: ['habits', 'consistency'],
    tags: ['atomic-changes', 'cue-routine-reward', 'systems', 'identity-shift', 'routine'],
    relatedProblems: ['bad-habits', 'breaking-cycles', 'lack-of-routine', 'temptation']
  },
  discipline: {
    themes: ['discipline', 'focus'],
    tags: ['stoicism', 'self-control', 'willpower', 'mental-toughness', 'delayed-gratification'],
    relatedProblems: ['weak-will', 'impulses', 'loss-of-control', 'indifference']
  },
  confidence: {
    themes: ['confidence', 'learning'],
    tags: ['self-trust', 'courage', 'inner-strength', 'sovereignty', 'stoic-calm'],
    relatedProblems: ['imposter-syndrome', 'fear-of-failure', 'anxiety', 'self-doubt', 'approval-seeking']
  },
  money: {
    themes: ['money', 'discipline'],
    tags: ['financial-freedom', 'wealth-mindset', 'capital-allocation', 'frugality', 'value-creation'],
    relatedProblems: ['debt', 'living-paycheck-to-paycheck', 'scarcity-mindset', 'impulse-buying']
  },
  relationships: {
    themes: ['relationships'],
    tags: ['empathy', 'active-listening', 'communication', 'conflict-resolution', 'connection'],
    relatedProblems: ['loneliness', 'arguments', 'misunderstandings', 'isolation']
  },
  learning: {
    themes: ['learning', 'focus'],
    tags: ['mental-models', 'speed-reading', 'synthesis', 'critical-thinking', 'philosophy'],
    relatedProblems: ['forgetting', 'information-overload', 'narrow-thinking']
  }
};

export interface ProblemSearchResult {
  book: Book;
  score: number;
  matchedAspects: string[];
  matchedProblem?: string;
}

export function searchBooksByProblem(
  query: string,
  allBooks: Book[],
  userThemes: string[] = []
): ProblemSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    // If no query, return books scored by user themes
    return allBooks.map((book) => {
      let score = 1;
      const matchedAspects: string[] = [];
      for (const ut of userThemes) {
        if (book.themes.includes(ut)) {
          score += 5;
          matchedAspects.push(`Matches your interest in ${ut}`);
        }
      }
      return { book, score, matchedAspects };
    }).sort((a, b) => b.score - a.score);
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  // Check if query directly maps to any problem taxonomy key or related problems
  const detectedProblems: string[] = [];
  for (const [key, data] of Object.entries(PROBLEM_TAXONOMY)) {
    if (normalizedQuery.includes(key)) {
      detectedProblems.push(key);
    }
    for (const rel of data.relatedProblems) {
      if (normalizedQuery.includes(rel.toLowerCase())) {
        detectedProblems.push(key);
      }
    }
  }

  const results: ProblemSearchResult[] = [];

  for (const book of allBooks) {
    let score = 0;
    const matchedAspects: string[] = [];
    const bookTitleNorm = book.title.toLowerCase();
    const bookAuthorNorm = book.author.toLowerCase();
    const bookDescNorm = book.description.toLowerCase();

    // 1. Problem Taxonomy Matches
    for (const problemKey of detectedProblems) {
      const taxonomy = PROBLEM_TAXONOMY[problemKey];
      // Check if book themes match taxonomy themes
      const commonThemes = book.themes.filter((t) => taxonomy.themes.includes(t));
      if (commonThemes.length > 0) {
        score += 20 * commonThemes.length;
        matchedAspects.push(`Core answer for ${problemKey} (${commonThemes.join(', ')})`);
      }
      // Check if book problemTags match taxonomy tags
      const commonTags = book.problemTags.filter((pt) => 
        taxonomy.tags.includes(pt.toLowerCase()) || pt.toLowerCase().includes(problemKey)
      );
      if (commonTags.length > 0) {
        score += 15 * commonTags.length;
        matchedAspects.push(`Targeted problem: ${commonTags.join(', ')}`);
      }
    }

    // 2. Direct Query Tokens in Problem Tags
    for (const token of queryTokens) {
      for (const tag of book.problemTags) {
        if (tag.toLowerCase().includes(token)) {
          score += 12;
          matchedAspects.push(`Problem tag: #${tag}`);
        }
      }
    }

    // 3. Direct Query Tokens in Themes
    for (const token of queryTokens) {
      for (const th of book.themes) {
        if (th.toLowerCase().includes(token)) {
          score += 10;
          matchedAspects.push(`Theme: ${th}`);
        }
      }
    }

    // 4. Title & Author exact or partial match
    if (bookTitleNorm.includes(normalizedQuery)) {
      score += 25;
      matchedAspects.push(`Title match`);
    } else {
      for (const token of queryTokens) {
        if (token.length > 2 && bookTitleNorm.includes(token)) {
          score += 8;
        }
      }
    }

    if (bookAuthorNorm.includes(normalizedQuery)) {
      score += 18;
      matchedAspects.push(`Author match: ${book.author}`);
    }

    // 5. Description occurrence
    for (const token of queryTokens) {
      if (token.length > 3 && bookDescNorm.includes(token)) {
        score += 3;
      }
    }

    // 6. User Onboarding Preference Bonus
    for (const ut of userThemes) {
      if (book.themes.includes(ut)) {
        score += 4;
      }
    }

    if (score > 0) {
      results.push({
        book,
        score,
        matchedAspects: Array.from(new Set(matchedAspects)),
        matchedProblem: detectedProblems[0]
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
