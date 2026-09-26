export type Language = 'en' | 'hi';

export interface Theme {
  id: string;
  nameEn: string;
  nameHi: string;
  icon: string;
  descriptionEn: string;
  descriptionHi: string;
}

export interface SourceFlags {
  hasSpotify: boolean;
  hasGutenberg: boolean;
  hasLibriVox: boolean;
  hasSummary: boolean;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  publishedYear?: number;
  themes: string[];
  problemTags: string[];
  sourceFlags: SourceFlags;
  spotifyQuery?: string;
  gutenbergId?: number;
  standardEbooksSlug?: string;
  librivoxIdentifier?: string;
  openLibraryKey?: string;
  googleBooksId?: string;
  metadataSource: 'curated' | 'open_library' | 'google_books';
  createdAt?: string;
}

export interface AvailabilityMatrix {
  spotify: {
    available: boolean;
    query?: string;
    webUrl?: string;
    appUri?: string;
    label: string;
  };
  freeRead: {
    available: boolean;
    source?: string;
    gutenbergId?: number;
    standardEbooksSlug?: string;
    readUrl?: string;
    epubUrl?: string;
    label: string;
  };
  freeListen: {
    available: boolean;
    source?: string;
    identifier?: string;
    trackCount?: number;
    streamUrl?: string;
    label: string;
  };
  summary: {
    available: boolean;
    hasTtsAudio: boolean;
    label: string;
    sublabel: string;
  };
  attributions: string[];
}

export interface AudioTrack {
  id: string;
  bookId: string;
  trackIndex: number;
  title: string;
  durationSeconds?: number;
  streamUrl: string;
  source: 'librivox' | 'tts_summary';
}

export interface Lesson {
  lessonNumber: number;
  title: string;
  explanation: string;
  practicalAction: string;
}

export interface OriginalSummary {
  id: string;
  bookId: string;
  title: string;
  executiveOverview: string;
  coreProblemSolved: string;
  keyLessons: Lesson[];
  audioTtsUrl?: string;
  audioDurationSeconds?: number;
  attributionNotice: string;
}

export interface UserLibraryItem {
  id: string;
  userId: string;
  bookId: string;
  book: Book;
  status: 'saved' | 'reading' | 'listening' | 'completed' | 'abandoned';
  progressPct: number;
  currentPositionSeconds: number;
  currentChapterIndex: number;
  lastFormat?: 'text' | 'audio' | 'summary';
  liked: number; // 1: liked, -1: disliked/skipped, 0: neutral
  rating?: number;
  notes?: string;
  lastAccessedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  languagePreference: Language;
  onboardingCompleted: boolean;
  createdAt: string;
}
