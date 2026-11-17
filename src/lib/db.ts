import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Livello database. SQLite (node:sqlite, zero dipendenze native, costo zero).
 * Tutte le query passano da statement parametrizzati: nessuna concatenazione di input utente.
 * Lo schema è compatibile in larga parte con PostgreSQL per una futura migrazione (vedi docs/ARCHITETTURA.md).
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'rss',
  url TEXT NOT NULL,
  homepage TEXT,
  content_type TEXT,
  lang TEXT DEFAULT 'en',
  frequency_sec INTEGER NOT NULL DEFAULT 900,
  enabled INTEGER NOT NULL DEFAULT 1,
  tier TEXT NOT NULL DEFAULT 'B',
  owner_group TEXT,
  official INTEGER NOT NULL DEFAULT 0,
  section_hint TEXT,
  reliability_note TEXT,
  conflicts TEXT,
  api_limits TEXT,
  filter_keywords TEXT,
  meta TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_attempt TEXT,
  last_success TEXT,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  items_total INTEGER NOT NULL DEFAULT 0,
  seeded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 1,
  independent_groups INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'NON VERIFICATA',
  reasons TEXT NOT NULL DEFAULT '[]',
  lead_article_id INTEGER,
  importance REAL NOT NULL DEFAULT 0,
  status_override TEXT,
  status_override_note TEXT
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  guid TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  title_it TEXT,
  excerpt TEXT,
  excerpt_it TEXT,
  author TEXT,
  lang TEXT,
  published_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  categories TEXT NOT NULL DEFAULT '[]',
  coins TEXT NOT NULL DEFAULT '[]', -- id degli strumenti (titoli/indici) citati
  flags TEXT NOT NULL DEFAULT '[]',
  cluster_id INTEGER,
  importance REAL NOT NULL DEFAULT 0,
  is_breaking INTEGER NOT NULL DEFAULT 0,
  reads INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  translation_provider TEXT,
  ai_json TEXT,
  ai_at TEXT,
  UNIQUE(source_id, guid)
);
CREATE INDEX IF NOT EXISTS idx_articles_pub ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);

CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, title_it, excerpt, excerpt_it, author, content='articles', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, title_it, excerpt, excerpt_it, author) VALUES (new.id, new.title, new.title_it, new.excerpt, new.excerpt_it, new.author);
END;
CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, title_it, excerpt, excerpt_it, author) VALUES ('delete', old.id, old.title, old.title_it, old.excerpt, old.excerpt_it, old.author);
END;
CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE OF title, title_it, excerpt, excerpt_it, author ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, title_it, excerpt, excerpt_it, author) VALUES ('delete', old.id, old.title, old.title_it, old.excerpt, old.excerpt_it, old.author);
  INSERT INTO articles_fts(rowid, title, title_it, excerpt, excerpt_it, author) VALUES (new.id, new.title, new.title_it, new.excerpt, new.excerpt_it, new.author);
END;

CREATE TABLE IF NOT EXISTS reliability_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  actor TEXT NOT NULL DEFAULT 'sistema',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kv_cache (
  key TEXT PRIMARY KEY,
  value TEXT,
  source TEXT,
  fetched_at TEXT,
  error TEXT,
  error_at TEXT
);

CREATE TABLE IF NOT EXISTS api_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT,
  endpoint TEXT,
  status INTEGER,
  ok INTEGER NOT NULL,
  duration_ms INTEGER,
  error TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_api_log_at ON api_log(at DESC);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  ok INTEGER,
  items INTEGER DEFAULT 0,
  error TEXT,
  duration_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_job ON ingest_runs(job, started_at DESC);

CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT, model TEXT, task TEXT,
  input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0, ok INTEGER, error TEXT, duration_ms INTEGER,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ai_cache (hash TEXT PRIMARY KEY, task TEXT, result TEXT, provider TEXT, model TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS translations (hash TEXT PRIMARY KEY, lang TEXT, text TEXT, provider TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT);
CREATE TABLE IF NOT EXISTS watchlist (
  device_id TEXT NOT NULL, item_type TEXT NOT NULL, item_id TEXT NOT NULL, label TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(device_id, item_type, item_id)
);
CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL, type TEXT NOT NULL, target TEXT, threshold REAL,
  cooldown_min INTEGER NOT NULL DEFAULT 60, push INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1, last_fired TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL, rule_id INTEGER, title TEXT NOT NULL, body TEXT, url TEXT,
  dedupe_key TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(device_id, dedupe_key)
);
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, device_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, detail TEXT, at TEXT NOT NULL DEFAULT (datetime('now')));
`;

type G = typeof globalThis & { __crdb?: DatabaseSync };
const g = globalThis as G;

export function dbPath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'stock-radar.db');
}

export function db(): DatabaseSync {
  if (g.__crdb) return g.__crdb;
  const p = dbPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const d = new DatabaseSync(p);
  d.exec(SCHEMA);
  g.__crdb = d;
  return d;
}

export type Row = Record<string, unknown>;

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...(params as never[])) as T[];
}
export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return db().prepare(sql).get(...(params as never[])) as T | undefined;
}
export function run(sql: string, ...params: unknown[]) {
  return db().prepare(sql).run(...(params as never[]));
}
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function jparse<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string' || !s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/* ---------- settings ---------- */
export function getSetting<T>(key: string, fallback: T): T {
  const r = get<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return r ? jparse<T>(r.value, fallback) : fallback;
}
export function setSetting(key: string, value: unknown) {
  run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
}

/* ---------- cache dati (mercato, defi, on-chain...) ---------- */
export type Cached<T> = { value: T | null; source: string | null; fetchedAt: string | null; error: string | null; errorAt: string | null };
export function getCache<T>(key: string): Cached<T> {
  const r = get<{ value: string | null; source: string | null; fetched_at: string | null; error: string | null; error_at: string | null }>(
    'SELECT value, source, fetched_at, error, error_at FROM kv_cache WHERE key = ?', key,
  );
  if (!r) return { value: null, source: null, fetchedAt: null, error: null, errorAt: null };
  return { value: jparse<T | null>(r.value, null), source: r.source, fetchedAt: r.fetched_at, error: r.error, errorAt: r.error_at };
}
export function setCache(key: string, value: unknown, source: string) {
  run(
    `INSERT INTO kv_cache(key, value, source, fetched_at, error, error_at) VALUES(?, ?, ?, ?, NULL, NULL)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, source = excluded.source, fetched_at = excluded.fetched_at, error = NULL, error_at = NULL`,
    key, JSON.stringify(value), source, nowIso(),
  );
}
/** Registra un errore SENZA cancellare l'ultimo dato valido: l'interfaccia lo mostrerà come "non aggiornato". */
export function setCacheError(key: string, error: string) {
  run(
    `INSERT INTO kv_cache(key, value, source, fetched_at, error, error_at) VALUES(?, NULL, NULL, NULL, ?, ?)
     ON CONFLICT(key) DO UPDATE SET error = excluded.error, error_at = excluded.error_at`,
    key, error.slice(0, 500), nowIso(),
  );
}

export function audit(action: string, detail: unknown) {
  run('INSERT INTO admin_audit(action, detail) VALUES(?, ?)', action, JSON.stringify(detail).slice(0, 2000));
}
