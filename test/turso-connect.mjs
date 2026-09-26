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

async function testConnection() {
  if (!url) {
    console.error('TURSO_DATABASE_URL is not set.');
    process.exit(1);
  }
  console.log('Testing connection to Turso database:', url);
  const client = createClient({ url, authToken });
  try {
    const res = await client.execute("SELECT 1 as connected, datetime('now') as server_time");
    console.log('Connection SUCCESS:', res.rows);

    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Existing tables in database:', tables.rows.map(r => r.name));
  } catch (err) {
    console.error('Connection FAILED:', err);
    process.exit(1);
  }
}

testConnection();
