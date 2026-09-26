'use client';

import React, { useState, useEffect } from 'react';
import { Book, OriginalSummary, Language } from '@/lib/types';
import { X, Sparkles, Volume2, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  book: Book;
  lang?: Language;
  onClose: () => void;
  onListenSummary: (summaryText: string) => void;
}

export function SummaryModal({
  book,
  lang = 'en',
  onClose,
  onListenSummary
}: Props) {
  const [summary, setSummary] = useState<OriginalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/books/${book.id}/summary`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Summary not found');
        }
        setSummary(data.summary);
      } catch (err: any) {
        setError(err.message || 'Error loading summary');
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [book.id]);

  const handleListen = () => {
    if (!summary) return;
    const lessonsText = summary.keyLessons.map((l) => 
      `Lesson ${l.lessonNumber}: ${l.title}. ${l.explanation}. Action: ${l.practicalAction}`
    ).join(' ');
    const fullText = `${summary.title}. Executive Overview: ${summary.executiveOverview}. Problem Solved: ${summary.coreProblemSolved}. Key Takeaways: ${lessonsText}`;
    onListenSummary(fullText);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#161B22] rounded-2xl flex flex-col shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                {lang === 'hi' ? 'बुक लिसनर मौलिक सारांश' : 'Book Listener Original Summary'}
              </div>
              <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                {book.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary && (
              <button
                onClick={handleListen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>{lang === 'hi' ? 'सारांश सुनें (बोलकर)' : 'Listen (TTS)'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legal Boundary Notice */}
        <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            {lang === 'hi'
              ? 'यह सारांश और मुख्य सीख बुक लिसनर द्वारा तैयार की गई मौलिक विश्लेषणात्मक सामग्री है। यह पूरी पुस्तक नहीं है।'
              : 'Original transformative synthesis & actionable lessons by Book Listener. Not the full book.'}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {loading && (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm text-stone-500">{lang === 'hi' ? 'सारांश लोड हो रहा है...' : 'Loading summary...'}</div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && summary && (
            <>
              {/* Executive Overview */}
              <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mb-2">
                  {summary.title}
                </h3>
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {summary.executiveOverview}
                </p>
              </div>

              {/* Core Problem Solved */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                  {lang === 'hi' ? 'यह पुस्तक कौन सी समस्या हल करती है?' : 'Core Problem Solved'}
                </div>
                <div className="text-sm text-stone-800 dark:text-stone-200">
                  {summary.coreProblemSolved}
                </div>
              </div>

              {/* Key Lessons */}
              <div>
                <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
                  <span>{lang === 'hi' ? 'मुख्य व्यावहारिक सीखें' : 'Key Transformative Lessons'}</span>
                  <span className="text-xs font-sans font-normal text-stone-500">
                    ({summary.keyLessons.length} {lang === 'hi' ? 'सीखें' : 'lessons'})
                  </span>
                </h4>

                <div className="space-y-4">
                  {summary.keyLessons.map((lesson) => (
                    <div
                      key={lesson.lessonNumber}
                      className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {lesson.lessonNumber}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm text-stone-900 dark:text-stone-100 mb-1">
                            {lesson.title}
                          </h5>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
                            {lesson.explanation}
                          </p>

                          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold">Action: </strong>
                              {lesson.practicalAction}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attribution Footer */}
              <div className="text-[11px] text-stone-500 dark:text-stone-400 pt-4 border-t border-stone-200 dark:border-stone-800">
                {summary.attributionNotice}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
