import { getDb } from './db';
import { OriginalSummary, Lesson } from './types';

const LEGAL_ATTRIBUTION_NOTICE = 'Book Listener Original Summary — Transformative analysis & key takeaways. Not the full book.';

interface GenerateSummaryParams {
  bookId: string;
  title: string;
  author: string;
  description: string;
  themes: string[];
  problemTags: string[];
}

/**
 * Ensures an original, transformative summary exists for the given book.
 * Strictly adheres to PRD Section 5.7 & Non-Negotiable Copyright Boundaries:
 * - Never ingests or rewrites full book text or transcripts.
 * - Formulates transformative analytical principles focused on solving life problems.
 * - Persists to SQLite original_summaries table for instant future retrieval.
 */
export async function getOrCreateSummary(params: GenerateSummaryParams): Promise<OriginalSummary> {
  const db = getDb();

  // 1. Check SQLite cache first
  const existing = db.prepare('SELECT * FROM original_summaries WHERE book_id = ?').get(params.bookId) as any;
  if (existing) {
    return {
      id: existing.id,
      bookId: existing.book_id,
      title: existing.title,
      executiveOverview: existing.executive_overview,
      coreProblemSolved: existing.core_problem_solved,
      keyLessons: JSON.parse(existing.key_lessons_json || '[]'),
      audioTtsUrl: existing.audio_tts_url,
      audioDurationSeconds: existing.audio_duration_seconds,
      attributionNotice: existing.attribution_notice
    };
  }

  // 2. Synthesize original transformative lessons
  const summary = await synthesizeTransformativeSummary(params);

  // 3. Persist to database
  db.prepare(`
    INSERT OR REPLACE INTO original_summaries (
      id, book_id, title, executive_overview, core_problem_solved,
      key_lessons_json, audio_tts_url, audio_duration_seconds, attribution_notice
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    summary.id,
    summary.bookId,
    summary.title,
    summary.executiveOverview,
    summary.coreProblemSolved,
    JSON.stringify(summary.keyLessons),
    summary.audioTtsUrl ?? null,
    summary.audioDurationSeconds ?? null,
    summary.attributionNotice
  );

  return summary;
}

async function synthesizeTransformativeSummary(params: GenerateSummaryParams): Promise<OriginalSummary> {
  const summaryId = `sum_${params.bookId}`;

  // If Gemini API Key is available, use it with strict transformative prompt guardrails
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are an educational book synthesis specialist for Book Listener.
Analyze the following book concept and produce an original, transformative personal-growth summary focused on practical action.

CRITICAL LEGAL & COPYRIGHT GUARDRAILS:
- Do NOT rewrite or quote copyrighted book text.
- Do NOT reproduce any chapter narrative or transcript.
- Create an original, transformative pedagogical analysis that explains the core principles and how a reader can apply them to solve life problems.

Book Title: "${params.title}"
Author: "${params.author}"
Themes: ${params.themes.join(', ')}
Problem Tags: ${params.problemTags.join(', ')}
Description: "${params.description}"

Return a valid JSON object matching this exact schema:
{
  "title": "A short, inspiring title for this original synthesis",
  "executiveOverview": "A 2-3 sentence transformative overview of the core philosophy",
  "coreProblemSolved": "The specific real-life problem this book addresses (e.g. procrastination, broken habits, lack of focus)",
  "lessons": [
    {
      "lessonNumber": 1,
      "title": "Lesson title",
      "explanation": "Clear explanation of the mental model or principle",
      "practicalAction": "A concrete 1-2 sentence daily action step the reader can do today"
    },
    {
      "lessonNumber": 2,
      "title": "Lesson title",
      "explanation": "Clear explanation of the mental model or principle",
      "practicalAction": "A concrete 1-2 sentence daily action step the reader can do today"
    },
    {
      "lessonNumber": 3,
      "title": "Lesson title",
      "explanation": "Clear explanation of the mental model or principle",
      "practicalAction": "A concrete 1-2 sentence daily action step the reader can do today"
    }
  ]
}

Return ONLY the raw JSON object with no markdown fences, no code blocks, and no other text.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000
          }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (response.ok) {
        const json = await response.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed.title && parsed.executiveOverview && Array.isArray(parsed.lessons)) {
            return {
              id: summaryId,
              bookId: params.bookId,
              title: parsed.title,
              executiveOverview: parsed.executiveOverview,
              coreProblemSolved: parsed.coreProblemSolved || `Solving ${params.problemTags.join(', ')}`,
              keyLessons: parsed.lessons.map((l: any, idx: number) => ({
                lessonNumber: idx + 1,
                title: l.title,
                explanation: l.explanation,
                practicalAction: l.practicalAction
              })),
              attributionNotice: LEGAL_ATTRIBUTION_NOTICE
            };
          }
        }
      }
    } catch (err) {
      console.warn('[AI Summary Synthesis] API call failed or timed out, falling back to deterministic template:', err);
    }
  }

  // Deterministic Fallback: High-quality analytical synthesis based on problem tags & themes
  const primaryProblem = params.problemTags[0] || 'consistency';
  const primaryTheme = params.themes[0] || 'personal-growth';

  return {
    id: summaryId,
    bookId: params.bookId,
    title: `Core Principles: ${params.title}`,
    executiveOverview: `${params.title} provides a foundational framework for overcoming ${primaryProblem}. By replacing short-term emotional impulses with structured behavioral systems, individuals cultivate sustained personal sovereignty.`,
    coreProblemSolved: `Struggling with ${params.problemTags.slice(0, 3).join(', ')} and lacking a clear execution system.`,
    keyLessons: [
      {
        lessonNumber: 1,
        title: `The Power of ${capitalize(primaryTheme)} Systems`,
        explanation: `Lasting change is never the result of sporadic willpower bursts. It requires designing an environment where desired behaviors have minimal friction and destructive distractions are physically removed.`,
        practicalAction: `Identify your single biggest point of daily friction and make it physically impossible to access during your morning focus block.`
      },
      {
        lessonNumber: 2,
        title: `Decoupling Emotion from Execution`,
        explanation: `Consistent progress requires acting in alignment with your commitments rather than your fleeting hourly feelings. Action generates motivation, not the other way around.`,
        practicalAction: `Apply the 2-Minute Rule: commit to engaging with the difficult task for just 120 seconds before deciding whether to stop.`
      },
      {
        lessonNumber: 3,
        title: `Compounding Incremental Gains`,
        explanation: `Small, imperceptible daily improvements compound exponentially over quarters and years. Protecting your daily streak matters far more than heroics on any single day.`,
        practicalAction: `Track your daily streak visually on paper or calendar; celebrate showing up regardless of performance output.`
      }
    ],
    attributionNotice: LEGAL_ATTRIBUTION_NOTICE
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
