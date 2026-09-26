import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

let dbInstance: DatabaseSync | null = null;

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'booklistener.sqlite');

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_PATH);
  
  // Pragmas for performance and data integrity
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
  `);

  initSchema(dbInstance);

  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      language_preference TEXT DEFAULT 'en',
      onboarding_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. User Themes
    CREATE TABLE IF NOT EXISTS user_themes (
      user_id TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, theme_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 3. Books
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_url TEXT,
      published_year INTEGER,
      themes_json TEXT NOT NULL,
      problem_tags_json TEXT NOT NULL,
      source_flags_json TEXT NOT NULL,
      spotify_query TEXT,
      gutenberg_id INTEGER,
      standard_ebooks_slug TEXT,
      librivox_identifier TEXT,
      open_library_key TEXT,
      google_books_id TEXT,
      metadata_source TEXT DEFAULT 'curated',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. User Library
    CREATE TABLE IF NOT EXISTS user_library (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('saved', 'reading', 'listening', 'completed', 'abandoned')),
      progress_pct REAL DEFAULT 0.0,
      current_position_seconds INTEGER DEFAULT 0,
      current_chapter_index INTEGER DEFAULT 0,
      last_format TEXT CHECK(last_format IN ('text', 'audio', 'summary')),
      liked INTEGER DEFAULT 0,
      rating INTEGER,
      notes TEXT,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    -- 5. Consumption History
    CREATE TABLE IF NOT EXISTS consumption_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('audio', 'text', 'summary')),
      chapter_index INTEGER DEFAULT 0,
      chapter_title TEXT,
      seconds_consumed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    -- 6. Original Summaries
    CREATE TABLE IF NOT EXISTS original_summaries (
      id TEXT PRIMARY KEY,
      book_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      executive_overview TEXT NOT NULL,
      core_problem_solved TEXT NOT NULL,
      key_lessons_json TEXT NOT NULL,
      audio_tts_url TEXT,
      audio_duration_seconds INTEGER,
      attribution_notice TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    -- 7. Audio Tracks
    CREATE TABLE IF NOT EXISTS audio_tracks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      track_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration_seconds INTEGER,
      stream_url TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('librivox', 'tts_summary')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
    CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON user_library(user_id);
    CREATE INDEX IF NOT EXISTS idx_audio_tracks_book ON audio_tracks(book_id, track_index);
  `);
}
