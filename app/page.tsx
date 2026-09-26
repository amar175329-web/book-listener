'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { BookCard } from '@/components/BookCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ReaderModal } from '@/components/ReaderModal';
import { SummaryModal } from '@/components/SummaryModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { AuthModal } from '@/components/AuthModal';
import { ReviewModal } from '@/components/ReviewModal';
import { Book, User, Language, Theme, AudioTrack } from '@/lib/types';
import { THEMES, t } from '@/lib/i18n';
import {
  Search,
  Sparkles,
  Compass,
  Library,
  BookOpen,
  Headphones,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Star,
  Edit3,
  MessageSquare
} from 'lucide-react';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'discover' | 'search' | 'library'>('discover');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Featured Sections & All Books
  const [featuredSections, setFeaturedSections] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Library State
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'reading' | 'saved' | 'completed'>('all');
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Active Modals & Player
  const [activeReaderBook, setActiveReaderBook] = useState<Book | null>(null);
  const [activeSummaryBook, setActiveSummaryBook] = useState<Book | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<any | null>(null);

  // Active Audio Player State
  const [playerBook, setPlayerBook] = useState<Book | null>(null);
  const [playerTracks, setPlayerTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playerTtsText, setPlayerTtsText] = useState<string | undefined>(undefined);

  // 1. Initial Load: Check token, language, and load featured books
  useEffect(() => {
    const savedLang = localStorage.getItem('bl_lang') as Language;
    if (savedLang === 'en' || savedLang === 'hi') {
      setLang(savedLang);
    }

    const savedToken = localStorage.getItem('bl_token');
    if (savedToken) {
      setToken(savedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            if (!data.user.onboardingCompleted) {
              setShowOnboardingModal(true);
            }
          } else {
            localStorage.removeItem('bl_token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('bl_token');
          setToken(null);
        });
    }

    loadFeatured();

    // Register service worker for offline support & PWA caching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[SW Registration]:', err);
      });
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('bl_lang', nextLang);
  };

  const loadFeatured = async () => {
    try {
      setIsLoadingHome(true);
      const res = await fetch('/api/books/featured');
      const data = await res.json();
      if (res.ok) {
        setFeaturedSections(data.sections || []);
        setAllBooks(data.allBooks || []);
      }
    } catch (err) {
      console.error('Failed to load featured books:', err);
    } finally {
      setIsLoadingHome(false);
    }
  };

  // 2. Problem Search Trigger
  const executeSearch = useCallback(
    async (query: string, theme: string | null, source: string | null) => {
      try {
        setIsSearching(true);
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (theme) params.set('theme', theme);
        if (source) params.set('source', source);

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`/api/books/search?${params.toString()}`, { headers });
        const data = await res.json();
        if (res.ok) {
          setSearchResults(data.books || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (activeTab === 'search' || searchQuery || selectedTheme || selectedSource) {
      executeSearch(searchQuery, selectedTheme, selectedSource);
    }
  }, [searchQuery, selectedTheme, selectedSource, activeTab, executeSearch]);

  // 3. Library Loader
  const loadLibrary = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoadingLibrary(true);
      const res = await fetch('/api/library', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLibraryItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'library') {
      if (!user) {
        setShowAuthModal(true);
      } else {
        loadLibrary();
      }
    }
  }, [activeTab, user, loadLibrary]);

  // Actions
  const handleToggleSave = async (bookId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const isCurrentlySaved = libraryItems.some((item) => item.bookId === bookId);
    const targetStatus = isCurrentlySaved ? 'abandoned' : 'saved';

    try {
      await fetch('/api/library/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bookId, status: targetStatus })
      });
      loadLibrary();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleSaveReview = async (rating: number, notes: string, status: string) => {
    if (!token || !reviewingItem) return;
    try {
      await fetch('/api/library/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookId: reviewingItem.bookId,
          rating,
          notes,
          status
        })
      });
      loadLibrary();
    } catch (err) {
      console.error('Failed to save review:', err);
    }
  };

  const handleStartListen = async (book: Book) => {
    try {
      setPlayerTtsText(undefined);
      const res = await fetch(`/api/books/${book.id}/tracks`);
      const data = await res.json();
      if (res.ok && data.tracks && data.tracks.length > 0) {
        setPlayerBook(book);
        setPlayerTracks(data.tracks);
        setCurrentTrackIndex(0);

        // Update library status to listening
        if (token) {
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ bookId: book.id, status: 'listening' })
          });
        }
      } else {
        alert(lang === 'hi' ? 'इस पुस्तक के लिए कोई ऑडियो ट्रैक उपलब्ध नहीं है।' : 'No audio tracks found for this book.');
      }
    } catch (err) {
      console.error('Audio fetch error:', err);
    }
  };

  const handleStartTtsSummary = (book: Book, text: string) => {
    setPlayerBook(book);
    setPlayerTracks([]);
    setPlayerTtsText(text);
    setActiveSummaryBook(null);
  };

  const handleOpenSpotify = (book: Book) => {
    const matrix = book.sourceFlags.hasSpotify;
    if (!matrix) return;
    const query = encodeURIComponent(book.spotifyQuery || `${book.title} ${book.author}`);
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `spotify:search:${query}`;
      setTimeout(() => {
        window.open(`https://open.spotify.com/search/${query}`, '_blank');
      }, 1000);
    } else {
      window.open(`https://open.spotify.com/search/${query}`, '_blank');
    }
  };

  const handleAudioProgress = (seconds: number, duration: number, chapterIndex: number) => {
    if (!token || !playerBook) return;
    const progressPct = duration > 0 ? Math.round((seconds / duration) * 100) : 0;
    fetch('/api/library/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bookId: playerBook.id,
        progressPct,
        currentPositionSeconds: Math.floor(seconds),
        currentChapterIndex: chapterIndex,
        format: playerTtsText ? 'summary' : 'audio',
        secondsListened: 5
      })
    });
  };

  const handleReaderProgress = (pct: number) => {
    if (!token || !activeReaderBook) return;
    fetch('/api/library/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bookId: activeReaderBook.id,
        progressPct: pct,
        format: 'text'
      })
    });
  };

  const isBookSavedInLibrary = (bookId: string) => {
    return libraryItems.some((i) => i.bookId === bookId && i.status !== 'abandoned');
  };

  return (
    <div className="min-h-screen flex flex-col pb-28">
      {/* Header */}
      <Header
        lang={lang}
        onToggleLang={toggleLanguage}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'search') {
            setSelectedTheme(null);
            setSelectedSource(null);
          }
        }}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onSignOut={() => {
          localStorage.removeItem('bl_token');
          setToken(null);
          setUser(null);
          setLibraryItems([]);
        }}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* TAB 1: DISCOVER / HOME */}
        {activeTab === 'discover' && (
          <div className="space-y-10">
            {/* Hero Problem Search Prompt */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-200 dark:border-amber-900/40 p-6 sm:p-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{lang === 'hi' ? 'समस्या-आधारित खोज' : 'Problem-Centric Discovery'}</span>
                </div>
                <h1 className="font-serif font-bold text-2xl sm:text-4xl text-stone-900 dark:text-stone-100 leading-tight">
                  {lang === 'hi'
                    ? 'अपनी वर्तमान जीवन समस्या बताएं, हम सही पुस्तक खोजेंगे'
                    : 'Name your current challenge, we find the book that solves it'}
                </h1>
                <p className="text-xs sm:text-base text-stone-600 dark:text-stone-400 mt-2.5 leading-relaxed">
                  {lang === 'hi'
                    ? 'निरंतरता, एकाग्रता, आलस्य या ऊर्जा की कमी? केवल शीर्षक नहीं, पुस्तक के विषय और सीख से खोजें।'
                    : 'Struggling with consistency, focus, burnout, or bad habits? Discover books mapped to psychological themes, with free legal public audio, text, Spotify links, and original summaries.'}
                </p>

                {/* Big Search Bar */}
                <div className="mt-6 flex items-center gap-2 bg-white dark:bg-[#161B22] p-2 rounded-2xl border border-stone-300 dark:border-stone-700 shadow-md">
                  <Search className="w-5 h-5 text-stone-400 ml-2 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setActiveTab('search');
                      }
                    }}
                    placeholder={t('search_placeholder', lang)}
                    className="w-full bg-transparent text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none py-1.5"
                  />
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer flex-shrink-0"
                  >
                    {t('search_button', lang)}
                  </button>
                </div>

                {/* Quick Problem Keywords */}
                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-medium">{lang === 'hi' ? 'लोकप्रिय समस्याएं:' : 'Popular challenges:'}</span>
                  {['consistency', 'focus', 'burnout', 'habits', 'discipline', 'confidence', 'money'].map((word) => (
                    <button
                      key={word}
                      onClick={() => {
                        setSearchQuery(word);
                        setActiveTab('search');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                    >
                      #{word}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Curated Themes Bar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100">
                  {t('curated_themes', lang)}
                </h2>
                <button
                  onClick={() => setShowOnboardingModal(true)}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {lang === 'hi' ? 'रुचियां बदलें' : 'Customize Interests'} &rarr;
                </button>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      setActiveTab('search');
                    }}
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm transition-all text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'hi' ? theme.nameHi : theme.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Thematic Sections */}
            {isLoadingHome ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-stone-500">{lang === 'hi' ? 'पुस्तकें लोड हो रही हैं...' : 'Loading curated catalog...'}</p>
              </div>
            ) : (
              featuredSections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 dark:text-stone-100">
                      {lang === 'hi' ? section.titleHi : section.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                      {lang === 'hi' ? section.subtitleHi : section.subtitleEn}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.books.map((book: any) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        lang={lang}
                        isSaved={isBookSavedInLibrary(book.id)}
                        onToggleSave={() => handleToggleSave(book.id)}
                        onOpenSpotify={() => handleOpenSpotify(book)}
                        onOpenRead={() => setActiveReaderBook(book)}
                        onOpenListen={() => handleStartListen(book)}
                        onOpenSummary={() => setActiveSummaryBook(book)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: PROBLEM SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Input Bar */}
            <div className="bg-white dark:bg-[#161B22] p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2">
                <Search className="w-5 h-5 text-stone-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder', lang)}
                  className="w-full bg-transparent text-sm sm:text-base text-stone-900 dark:text-stone-100 outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Theme Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-stone-500 mr-1">
                  {lang === 'hi' ? 'विषय:' : 'Theme:'}
                </span>
                <button
                  onClick={() => setSelectedTheme(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    selectedTheme === null
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200'
                  }`}
                >
                  {lang === 'hi' ? 'सभी' : 'All'}
                </button>
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setSelectedTheme(selectedTheme === th.id ? null : th.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      selectedTheme === th.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {lang === 'hi' ? th.nameHi : th.nameEn}
                  </button>
                ))}
              </div>

              {/* 4-State Source Filter */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-xs font-semibold text-stone-500 mr-1">
                  {lang === 'hi' ? 'स्रोत:' : 'Source:'}
                </span>
                {[
                  { id: null, labelEn: 'All Sources', labelHi: 'सभी स्रोत' },
                  { id: 'librivox', labelEn: 'LibriVox Audio', labelHi: 'लिब्रीवॉक्स ऑडियो' },
                  { id: 'gutenberg', labelEn: 'Gutenberg Text', labelHi: 'गुटेनबर्ग पाठ' },
                  { id: 'spotify', labelEn: 'Spotify Links', labelHi: 'स्पॉटिफ़ाई' },
                  { id: 'summary', labelEn: 'Original Summary', labelHi: 'मौलिक सारांश' }
                ].map((s) => (
                  <button
                    key={s.labelEn}
                    onClick={() => setSelectedSource(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      selectedSource === s.id
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    {lang === 'hi' ? s.labelHi : s.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
              <div>
                {searchQuery ? (
                  <span>
                    {t('search_results_for', lang)} <strong>&ldquo;{searchQuery}&rdquo;</strong> ({searchResults.length})
                  </span>
                ) : (
                  <span>Showing {searchResults.length} books</span>
                )}
              </div>
            </div>

            {/* Search Grid */}
            {isSearching ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-stone-500">{lang === 'hi' ? 'खोज जारी है...' : 'Searching by problem...'}</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-[#161B22] rounded-2xl border border-stone-200 dark:border-stone-800 p-8">
                <BookOpen className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-200">
                  {lang === 'hi' ? 'कोई पुस्तक नहीं मिली' : 'No books found'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  {t('no_results', lang)}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    lang={lang}
                    isSaved={isBookSavedInLibrary(book.id)}
                    onToggleSave={() => handleToggleSave(book.id)}
                    onOpenSpotify={() => handleOpenSpotify(book)}
                    onOpenRead={() => setActiveReaderBook(book)}
                    onOpenListen={() => handleStartListen(book)}
                    onOpenSummary={() => setActiveSummaryBook(book)}
                    detailed
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY LIBRARY */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Library Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: t('tab_all', lang) },
                  { id: 'reading', label: t('tab_reading', lang) },
                  { id: 'saved', label: t('tab_saved', lang) },
                  { id: 'completed', label: t('tab_completed', lang) }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setLibraryFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      libraryFilter === tab.id
                        ? 'bg-amber-600 text-white'
                        : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Library Grid */}
            {isLoadingLibrary ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-stone-500">{lang === 'hi' ? 'लाइब्रेरी लोड हो रही है...' : 'Loading library...'}</p>
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-[#161B22] rounded-2xl border border-stone-200 dark:border-stone-800 p-8">
                <Bookmark className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="font-serif font-bold text-lg text-stone-800 dark:text-stone-200">
                  {lang === 'hi' ? 'आपकी लाइब्रेरी खाली है' : 'Your Library is Empty'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                  {t('empty_library', lang)}
                </p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t('nav_discover', lang)} &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraryItems
                  .filter((item) => {
                    if (libraryFilter === 'all') return true;
                    if (libraryFilter === 'reading') return item.status === 'reading' || item.status === 'listening';
                    if (libraryFilter === 'saved') return item.status === 'saved';
                    if (libraryFilter === 'completed') return item.status === 'completed';
                    return true;
                  })
                  .map((item) => (
                    <div key={item.id} className="relative">
                      {/* Progress Badge */}
                      {item.progressPct > 0 && (
                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-stone-950 shadow-sm">
                          {item.progressPct}% {item.status === 'completed' ? '✓' : ''}
                        </div>
                      )}
                      <BookCard
                        book={item.book}
                        lang={lang}
                        isSaved={true}
                        onToggleSave={() => handleToggleSave(item.bookId)}
                        onOpenSpotify={() => handleOpenSpotify(item.book)}
                        onOpenRead={() => setActiveReaderBook(item.book)}
                        onOpenListen={() => handleStartListen(item.book)}
                        onOpenSummary={() => setActiveSummaryBook(item.book)}
                        detailed
                      />
                      {/* Rating & Notes Card Footer */}
                      <div className="mt-2 p-3 bg-stone-50 dark:bg-stone-900/90 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= (item.rating || 0)
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-stone-300 dark:text-stone-700'
                                }`}
                              />
                            ))}
                            {item.rating ? (
                              <span className="text-[11px] font-mono font-medium text-stone-600 dark:text-stone-400 ml-1">
                                {item.rating}/5
                              </span>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic ml-1">
                                {lang === 'hi' ? 'रेटिंग नहीं' : 'Unrated'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setReviewingItem(item)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{item.notes || item.rating ? (lang === 'hi' ? 'संपादित करें' : 'Edit Notes') : (lang === 'hi' ? '+ नोट्स जोड़ें' : '+ Add Notes')}</span>
                          </button>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-stone-600 dark:text-stone-400 italic bg-white dark:bg-stone-950 p-2 rounded border border-stone-100 dark:border-stone-800 line-clamp-2">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Legal & Ethical Content Boundary Footer */}
      <footer className="mt-16 border-t border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50 py-8 px-4 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
                {t('legal_boundary_title', lang)}
              </div>
              <p className="leading-relaxed">
                {t('legal_boundary_desc', lang)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-400">
                <span>&bull; {t('attribution_gutenberg', lang)}</span>
                <span>&bull; {t('attribution_librivox', lang)}</span>
                <span>&bull; {t('attribution_google', lang)}</span>
                <span>&bull; {t('attribution_summary', lang)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] opacity-75">
            <div>&copy; 2026 Book Listener &bull; Built with respect for authors, creators, and public domain cultural heritage.</div>
            <div className="mt-2 sm:mt-0">English + हिन्दी &bull; Web & Android Ready</div>
          </div>
        </div>
      </footer>

      {/* Docked Audio Player */}
      {playerBook && (playerTracks.length > 0 || playerTtsText) && (
        <AudioPlayer
          book={playerBook}
          tracks={playerTracks}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={(idx) => setCurrentTrackIndex(idx)}
          lang={lang}
          onClose={() => setPlayerBook(null)}
          onProgressUpdate={handleAudioProgress}
          ttsText={playerTtsText}
        />
      )}

      {/* Modals */}
      {activeReaderBook && (
        <ReaderModal
          book={activeReaderBook}
          lang={lang}
          onClose={() => setActiveReaderBook(null)}
          onProgressUpdate={handleReaderProgress}
        />
      )}

      {activeSummaryBook && (
        <SummaryModal
          book={activeSummaryBook}
          lang={lang}
          onClose={() => setActiveSummaryBook(null)}
          onListenSummary={(ttsText) => handleStartTtsSummary(activeSummaryBook, ttsText)}
        />
      )}

      {showOnboardingModal && (
        <OnboardingModal
          lang={lang}
          token={token}
          onComplete={() => {
            setShowOnboardingModal(false);
            if (activeTab === 'search') executeSearch(searchQuery, selectedTheme, selectedSource);
          }}
          onClose={() => setShowOnboardingModal(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          lang={lang}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(loggedUser, userToken, isNewUser) => {
            setUser(loggedUser);
            setToken(userToken);
            if (isNewUser || !loggedUser.onboardingCompleted) {
              setShowOnboardingModal(true);
            }
          }}
        />
      )}

      {reviewingItem && (
        <ReviewModal
          book={reviewingItem.book}
          initialRating={reviewingItem.rating || 5}
          initialNotes={reviewingItem.notes || ''}
          initialStatus={reviewingItem.status || 'reading'}
          lang={lang}
          onClose={() => setReviewingItem(null)}
          onSave={handleSaveReview}
        />
      )}
    </div>
  );
}
