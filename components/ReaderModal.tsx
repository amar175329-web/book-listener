'use client';

import React, { useState, useEffect } from 'react';
import { Book, Language } from '@/lib/types';
import { X, Type, BookOpen, Download, AlertCircle } from 'lucide-react';

interface Props {
  book: Book;
  lang?: Language;
  onClose: () => void;
  onProgressUpdate?: (pct: number) => void;
}

export function ReaderModal({
  book,
  lang = 'en',
  onClose,
  onProgressUpdate
}: Props) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [colorTheme, setColorTheme] = useState<'light' | 'sepia' | 'dark'>('sepia');

  useEffect(() => {
    async function loadText() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/books/${book.id}/read`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load text');
        }
        setText(data.text);
      } catch (err: any) {
        setError(err.message || 'Error loading book text');
      } finally {
        setLoading(false);
      }
    }
    loadText();
  }, [book.id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const totalHeight = target.scrollHeight - target.clientHeight;
    if (totalHeight > 0) {
      const scrollPct = Math.round((target.scrollTop / totalHeight) * 100);
      if (onProgressUpdate) {
        onProgressUpdate(scrollPct);
      }
    }
  };

  const getThemeClasses = () => {
    switch (colorTheme) {
      case 'sepia':
        return 'bg-[#F4ECD8] text-[#3E3426] border-[#E2D6BE]';
      case 'dark':
        return 'bg-[#12161A] text-[#D8E1E8] border-[#222B35]';
      case 'light':
      default:
        return 'bg-[#FFFFFF] text-[#1A1917] border-[#E8E2D7]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className={`w-full max-w-4xl h-[92vh] rounded-2xl flex flex-col shadow-2xl border overflow-hidden transition-colors ${getThemeClasses()}`}>
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-inherit">
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="truncate">
              <span className="font-serif font-bold text-sm sm:text-base">{book.title}</span>
              <span className="text-xs opacity-70 ml-2 hidden sm:inline">&bull; {book.author}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Font Family */}
            <button
              onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
              className="px-2 py-1 rounded text-xs font-medium border border-inherit hover:opacity-80 cursor-pointer"
              title="Toggle Serif / Sans Font"
            >
              {fontFamily === 'serif' ? 'Serif' : 'Sans'}
            </button>

            {/* Font Size Adjusters */}
            <div className="flex items-center border border-inherit rounded overflow-hidden">
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold"
              >
                A-
              </button>
              <span className="px-1 text-xs opacity-70 font-mono">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-bold"
              >
                A+
              </button>
            </div>

            {/* Color Palette Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setColorTheme('sepia')}
                className={`w-5 h-5 rounded-full bg-[#F4ECD8] border ${colorTheme === 'sepia' ? 'ring-2 ring-amber-600' : ''}`}
                title="Sepia"
              />
              <button
                onClick={() => setColorTheme('light')}
                className={`w-5 h-5 rounded-full bg-white border border-stone-300 ${colorTheme === 'light' ? 'ring-2 ring-amber-600' : ''}`}
                title="Light"
              />
              <button
                onClick={() => setColorTheme('dark')}
                className={`w-5 h-5 rounded-full bg-[#12161A] border border-stone-700 ${colorTheme === 'dark' ? 'ring-2 ring-amber-600' : ''}`}
                title="Dark"
              />
            </div>

            {/* Gutenberg EPUB Download Link */}
            {book.gutenbergId && (
              <a
                href={`https://www.gutenberg.org/ebooks/${book.gutenbergId}.epub3.images`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                title={lang === 'hi' ? 'EPUB डाउनलोड करें' : 'Download EPUB'}
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Content Body */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 sm:px-16 py-8"
          style={{
            fontFamily: fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif',
            fontSize: `${fontSize}px`,
            lineHeight: 1.8
          }}
        >
          {loading && (
            <div className="py-24 text-center">
              <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
              <div className="font-serif text-base opacity-75">
                {lang === 'hi' ? 'सार्वजनिक डोमेन पाठ लोड हो रहा है...' : 'Loading public domain text from Project Gutenberg...'}
              </div>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900 my-8">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{lang === 'hi' ? 'पाठ लोड नहीं हो सका' : 'Unable to load text'}</span>
              </div>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && text && (
            <div className="max-w-2xl mx-auto space-y-6 reader-content">
              <div className="text-center py-8 border-b border-inherit mb-8">
                <h1 className="font-serif font-bold text-2xl sm:text-3xl mb-2">{book.title}</h1>
                <p className="text-base opacity-75 font-serif italic">{book.author}</p>
                <div className="mt-4 inline-block text-[11px] px-2.5 py-1 rounded bg-black/5 dark:bg-white/5 border border-inherit">
                  Public Domain &bull; Project Gutenberg #{book.gutenbergId}
                </div>
              </div>

              {text.split(/\n\s*\n/).map((para, i) => (
                <p key={i} className="text-justify indent-6 whitespace-pre-line leading-relaxed">
                  {para.trim()}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
