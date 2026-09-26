import { createClient, Client } from '@libsql/client';

export interface PreparedStatement {
  get: (...args: any[]) => Promise<any>;
  all: (...args: any[]) => Promise<any[]>;
  run: (...args: any[]) => Promise<{ changes: number; lastInsertRowid?: number }>;
}

export interface AppDatabase {
  raw: Client;
  execute: (stmt: any) => Promise<any>;
  executeMultiple: (sql: string) => Promise<void>;
  batch: (stmts: any[]) => Promise<any[]>;
  exec: (sql: string) => Promise<void>;
  prepare: (sql: string) => PreparedStatement;
}

let dbInstance: AppDatabase | null = null;
let schemaInitialized = false;

export const SCHEMA_SQL = `
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

  CREATE TABLE IF NOT EXISTS user_themes (
    user_id TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, theme_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

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
`;

import fs from 'fs';
import path from 'path';

// Auto-load .env.local if running in local test/cli environments without next runtime
if (!process.env.TURSO_DATABASE_URL) {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch {}
  }
}

export function getDb(): AppDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required. Please set it in .env.local or production secrets.');
  }

  const client = createClient({ url, authToken });

  dbInstance = {
    raw: client,
    execute: client.execute.bind(client),
    executeMultiple: client.executeMultiple.bind(client),
    batch: client.batch.bind(client),
    exec: async (sql: string) => {
      await client.executeMultiple(sql);
    },
    prepare: (sql: string) => ({
      get: async (...args: any[]) => {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await client.execute({ sql, args: flatArgs });
        return res.rows[0] ? { ...res.rows[0] } : undefined;
      },
      all: async (...args: any[]) => {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await client.execute({ sql, args: flatArgs });
        return res.rows.map((r) => ({ ...r }));
      },
      run: async (...args: any[]) => {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await client.execute({ sql, args: flatArgs });
        return {
          changes: res.rowsAffected,
          lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined
        };
      }
    })
  };

  return dbInstance;
}

export async function ensureDbInitialized(): Promise<void> {
  if (schemaInitialized) return;
  const db = getDb();
  await db.exec(SCHEMA_SQL);
  schemaInitialized = true;
}
