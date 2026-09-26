import React from 'react';
import { Book, AvailabilityMatrix, Language } from '@/lib/types';
import { AvailabilityBadge } from './AvailabilityBadge';
import { Bookmark, BookmarkCheck, Headphones, BookOpen, ExternalLink, Sparkles } from 'lucide-react';

interface Props {
  book: Book & {
    availability: AvailabilityMatrix;
    searchScore?: number;
    matchedAspects?: string[];
    matchedProblem?: string;
  };
  lang?: Language;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onOpenSpotify: () => void;
  onOpenRead: () => void;
  onOpenListen: () => void;
  onOpenSummary: () => void;
  detailed?: boolean;
}

export function BookCard({
  book,
  lang = 'en',
  isSaved = false,
  onToggleSave,
  onOpenSpotify,
  onOpenRead,
  onOpenListen,
  onOpenSummary,
  detailed = false
}: Props) {
  const { availability } = book;

  return (
    <div className="group bg-white dark:bg-[#161B22] rounded-2xl border border-stone-200 dark:border-stone-800 p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all hover:border-amber-300 dark:hover:border-amber-800/80">
      <div>
        {/* Top Badges & Save Action */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <AvailabilityBadge availability={availability} lang={lang} compact />
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/80 dark:border-amber-700 dark:text-amber-300'
                  : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
              title={isSaved ? (lang === 'hi' ? 'लाइब्रेरी से हटाएं' : 'Saved in Library') : (lang === 'hi' ? 'लाइब्रेरी में सहेजें' : 'Save to Library')}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Book Cover & Title Info */}
        <div className="flex gap-3.5 mb-3">
          <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-center">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  // Fallback on broken image
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="p-2 text-center">
                <BookOpen className="w-6 h-6 mx-auto text-stone-400 mb-1" />
                <span className="text-[10px] text-stone-400 font-serif leading-none line-clamp-2">
                  {book.title}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-base leading-snug text-stone-900 dark:text-stone-100 line-clamp-2">
              {book.title}
            </h3>
            <div className="text-xs font-medium text-stone-600 dark:text-stone-400 mt-1">
              {book.author} {book.publishedYear ? `(${book.publishedYear})` : ''}
            </div>

            {/* Matched Problem Banner (if from search) */}
            {book.matchedAspects && book.matchedAspects.length > 0 && (
              <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 line-clamp-1">
                &bull; {book.matchedAspects[0]}
              </div>
            )}

            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2 leading-relaxed">
              {book.description}
            </p>
          </div>
        </div>

        {/* Problem Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {book.problemTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-mono"
            >
              #{tag}
            </span>
          ))}
        </div>

        {detailed && (
          <div className="mb-3">
            <AvailabilityBadge availability={availability} lang={lang} />
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex flex-wrap items-center gap-2">
        {availability.freeListen.available && (
          <button
            onClick={onOpenListen}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'सुनें' : 'Listen'}</span>
          </button>
        )}

        {availability.freeRead.available && (
          <button
            onClick={onOpenRead}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'पढ़ें' : 'Read'}</span>
          </button>
        )}

        {availability.summary.available && (
          <button
            onClick={onOpenSummary}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'सारांश' : 'Summary'}</span>
          </button>
        )}

        {availability.spotify.available && (
          <button
            onClick={onOpenSpotify}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Open on Spotify"
          >
            <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Spotify</span>
          </button>
        )}
      </div>
    </div>
  );
}
