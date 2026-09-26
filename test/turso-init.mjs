import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Load .env.local if not in environment
if (!process.env.TURSO_DATABASE_URL && fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL is not set.');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function init() {
  console.log('Testing table creation on Turso...');
  
  await client.execute(`
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_themes (
      user_id TEXT NOT NULL,
      theme_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, theme_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_library (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      status TEXT NOT NULL,
      progress_pct REAL DEFAULT 0.0,
      current_position_seconds INTEGER DEFAULT 0,
      current_chapter_index INTEGER DEFAULT 0,
      last_format TEXT,
      liked INTEGER DEFAULT 0,
      rating INTEGER,
      notes TEXT,
      last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, book_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS consumption_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      format TEXT NOT NULL,
      chapter_index INTEGER DEFAULT 0,
      chapter_title TEXT,
      seconds_consumed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
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
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audio_tracks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      track_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration_seconds INTEGER,
      stream_url TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);

  console.log('Tables created successfully!');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Current tables:', tables.rows.map(r => r.name));
}

init().catch(console.error);
