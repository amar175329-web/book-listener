import React from 'react';
import { AvailabilityMatrix, Language } from '@/lib/types';
import { Headphones, BookOpen, ExternalLink, Sparkles } from 'lucide-react';

interface Props {
  availability: AvailabilityMatrix;
  lang?: Language;
  onOpenSpotify?: () => void;
  onOpenRead?: () => void;
  onOpenListen?: () => void;
  onOpenSummary?: () => void;
  compact?: boolean;
}

export function AvailabilityBadge({
  availability,
  lang = 'en',
  onOpenSpotify,
  onOpenRead,
  onOpenListen,
  onOpenSummary,
  compact = false
}: Props) {
  const { spotify, freeRead, freeListen, summary } = availability;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {freeListen.available && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            title="Public Domain Audiobook via LibriVox"
          >
            <Headphones className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'hi' ? 'मुफ्त सुनें' : 'Free Listen'}</span>
          </span>
        )}

        {freeRead.available && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
            title="Full text via Project Gutenberg"
          >
            <BookOpen className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>{lang === 'hi' ? 'मुफ्त पढ़ें' : 'Free Read'}</span>
          </span>
        )}

        {spotify.available && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            title="Open on Spotify"
          >
            <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Spotify</span>
          </span>
        )}

        {summary.available && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
            title="Original Book Listener Summary"
          >
            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>{lang === 'hi' ? 'सारांश' : 'Summary'}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200 dark:border-stone-800">
      <div className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
        {lang === 'hi' ? 'उपलब्ध स्रोत (4 स्थितियां)' : 'Source Availability'}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Spotify */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
          spotify.available 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200' 
            : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800/40 dark:border-stone-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Spotify</span>
            </div>
            <div className="text-[11px] mt-1 text-stone-600 dark:text-stone-400 leading-tight">
              {spotify.available ? (lang === 'hi' ? 'अपने खाते पर खोलें' : 'Open in your app') : (lang === 'hi' ? 'अनुपलब्ध' : 'Unavailable')}
            </div>
          </div>
          {spotify.available && onOpenSpotify && (
            <button
              onClick={onOpenSpotify}
              className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {lang === 'hi' ? 'खोलें' : 'Open'} &rarr;
            </button>
          )}
        </div>

        {/* 2. Free Read */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
          freeRead.available 
            ? 'bg-sky-50/80 border-sky-200 text-sky-900 dark:bg-sky-950/30 dark:border-sky-800 dark:text-sky-200' 
            : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800/40 dark:border-stone-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{lang === 'hi' ? 'मुफ्त पढ़ें' : 'Free Read'}</span>
            </div>
            <div className="text-[11px] mt-1 text-stone-600 dark:text-stone-400 leading-tight">
              {freeRead.available ? 'Gutenberg (Public Domain)' : (lang === 'hi' ? 'कोई सार्वजनिक पाठ नहीं' : 'No public text')}
            </div>
          </div>
          {freeRead.available && onOpenRead && (
            <button
              onClick={onOpenRead}
              className="mt-2 text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {lang === 'hi' ? 'पढ़ें' : 'Read Now'} &rarr;
            </button>
          )}
        </div>

        {/* 3. Free Listen */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
          freeListen.available 
            ? 'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200' 
            : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800/40 dark:border-stone-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Headphones className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{lang === 'hi' ? 'मुफ्त सुनें' : 'Free Listen'}</span>
            </div>
            <div className="text-[11px] mt-1 text-stone-600 dark:text-stone-400 leading-tight">
              {freeListen.available ? 'LibriVox Audio' : (lang === 'hi' ? 'कोई ऑडियो नहीं' : 'No public audio')}
            </div>
          </div>
          {freeListen.available && onOpenListen && (
            <button
              onClick={onOpenListen}
              className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {lang === 'hi' ? 'सुनें' : 'Listen Now'} &rarr;
            </button>
          )}
        </div>

        {/* 4. Summary */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
          summary.available 
            ? 'bg-purple-50/80 border-purple-200 text-purple-900 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-200' 
            : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800/40 dark:border-stone-800 opacity-60'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{lang === 'hi' ? 'मौलिक सारांश' : 'Summary'}</span>
            </div>
            <div className="text-[11px] mt-1 text-stone-600 dark:text-stone-400 leading-tight">
              {lang === 'hi' ? 'मुख्य सीख (टेक्स्ट + ऑडियो)' : 'Key Lessons (Text + TTS)'}
            </div>
          </div>
          {summary.available && onOpenSummary && (
            <button
              onClick={onOpenSummary}
              className="mt-2 text-xs font-medium text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {lang === 'hi' ? 'देखें' : 'View'} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
