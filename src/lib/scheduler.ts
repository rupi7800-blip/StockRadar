import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { run, get, getSetting, db, dbPath } from './db';
import { seedSources, markSuccess, markFailure, getSource } from './sources/registry';
import { ingestDueSources, refreshBreakingFlags, reclassifyRecent } from './ingest/news';
import { setSetting } from './db';
import { refreshQuotes, refreshHistory, refreshEarnings, refreshIpo } from './market/ingest';
import { refreshEcbRates, refreshMacro } from './ingest/macro';
import { translatePendingArticles } from './translate';
import { aiAvailable, aiConfig } from './ai';
import { autoAnalyzeTop, dailyBriefing } from './ai/tasks';
import { evaluateAlerts } from './alerts';

type Job = { id: string; label: string; every: number; dataSource?: string; enabled?: () => boolean; fn: () => Promise<number | unknown> };

export const JOBS: Job[] = [
  { id: 'news', label: 'Notizie (RSS e annunci ufficiali)', every: 60, fn: async () => (await ingestDueSources()).reduce((s, r) => s + r.items, 0) },
  { id: 'quotes', label: 'Quotazioni (indici, titoli, ETF) — Yahoo/Stooq', every: 600, fn: refreshQuotes },
  { id: 'history', label: 'Storico 5 anni (a rotazione)', every: 1800, dataSource: 'yahoo', fn: () => refreshHistory(60) },
  { id: 'earnings', label: 'Calendario trimestrali (USA)', every: 6 * 3600, fn: refreshEarnings },
  { id: 'ipo', label: 'Calendario IPO (USA)', every: 6 * 3600, fn: refreshIpo },
  { id: 'ecb', label: 'Tassi ufficiali BCE', every: 6 * 3600, fn: refreshEcbRates },
  { id: 'macro', label: 'Dati macro USA (FRED)', every: 21600, dataSource: 'fred', enabled: () => !!process.env.FRED_API_KEY, fn: refreshMacro },
  { id: 'breaking', label: 'Ricalcolo importanza/breaking', every: 300, fn: async () => (refreshBreakingFlags(), 1) },
  { id: 'translate', label: 'Traduzione titoli in italiano', every: 120, fn: () => translatePendingArticles(30) },
  { id: 'ai_auto', label: 'Analisi AI eventi principali', every: 1800, enabled: () => aiAvailable() && aiConfig().features.analyze, fn: () => autoAnalyzeTop(aiConfig().features.autoAnalyzeTop) },
  { id: 'briefing', label: 'Briefing AI', every: 3600, enabled: () => aiAvailable() && aiConfig().features.briefing, fn: () => dailyBriefing() },
  { id: 'alerts', label: 'Valutazione alert', every: 60, fn: async () => evaluateAlerts() },
  { id: 'maintenance', label: 'Pulizia log e backup', every: 86400, fn: async () => maintenance() },
];

export function jobFrequency(j: Job) {
  const f = getSetting<Record<string, number>>('job_frequencies', {});
  return Math.max(30, f[j.id] ?? j.every);
}
export function jobDisabled(j: Job) {
  return getSetting<string[]>('jobs_disabled', []).includes(j.id) || (j.enabled ? !j.enabled() : false);
}

type State = { started: boolean; running: Set<string>; timer?: NodeJS.Timeout };
const g = globalThis as typeof globalThis & { __crsched?: State };
const state: State = (g.__crsched ??= { started: false, running: new Set() });

export async function runJob(id: string, force = false) {
  const j = JOBS.find((x) => x.id === id);
  if (!j) throw new Error('Job sconosciuto');
  if (state.running.has(id)) return { skipped: true };
  if (!force && jobDisabled(j)) return { skipped: true };
  state.running.add(id);
  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  const r = run('INSERT INTO ingest_runs(job, started_at) VALUES(?, ?)', id, startedAt);
  const runId = Number(r.lastInsertRowid);
  try {
    const out = await j.fn();
    const items = typeof out === 'number' ? out : 1;
    run('UPDATE ingest_runs SET finished_at = ?, ok = 1, items = ?, duration_ms = ? WHERE id = ?', new Date().toISOString(), items, Date.now() - t0, runId);
    if (j.dataSource && getSource(j.dataSource)) markSuccess(j.dataSource, 0);
    return { ok: true, items };
  } catch (e) {
    const msg = (e as Error).message;
    run('UPDATE ingest_runs SET finished_at = ?, ok = 0, error = ?, duration_ms = ? WHERE id = ?', new Date().toISOString(), msg.slice(0, 600), Date.now() - t0, runId);
    if (j.dataSource && getSource(j.dataSource)) markFailure(j.dataSource, msg);
    return { ok: false, error: msg };
  } finally {
    state.running.delete(id);
  }
}

function lastRun(id: string) {
  return get<{ started_at: string }>('SELECT started_at FROM ingest_runs WHERE job = ? ORDER BY id DESC LIMIT 1', id)?.started_at;
}

async function tick() {
  for (const j of JOBS) {
    if (jobDisabled(j) || state.running.has(j.id)) continue;
    const last = lastRun(j.id);
    if (!last || Date.now() - Date.parse(last) >= jobFrequency(j) * 1000) {
      runJob(j.id).catch(() => null); // i job girano in parallelo e indipendenti
    }
  }
}

export function startScheduler() {
  if (state.started || process.env.DISABLE_SCHEDULER === '1') return;
  state.started = true;
  seedSources();
  // al riavvio, i job rimasti "aperti" vengono chiusi come interrotti
  run("UPDATE ingest_runs SET finished_at = ?, ok = 0, error = 'interrotto (riavvio)' WHERE finished_at IS NULL", new Date().toISOString());
  setTimeout(() => tick(), 2000);
  state.timer = setInterval(() => tick(), 20_000);
  console.log('[stock-radar] scheduler avviato');
}

export function schedulerState() {
  return { started: state.started, running: [...state.running] };
}

function maintenance() {
  const old = new Date(Date.now() - 14 * 86400e3).toISOString().replace('T', ' ').slice(0, 19);
  run('DELETE FROM api_log WHERE at < ?', old);
  run('DELETE FROM ingest_runs WHERE started_at < ?', new Date(Date.now() - 14 * 86400e3).toISOString());
  run('DELETE FROM alert_events WHERE created_at < ?', new Date(Date.now() - 30 * 86400e3).toISOString().replace('T', ' ').slice(0, 19));
  const days = Number(process.env.ARCHIVE_RETENTION_DAYS || 0);
  if (days > 0) run('DELETE FROM articles WHERE published_at < ?', new Date(Date.now() - days * 86400e3).toISOString());
  return backupNow();
}

export function backupNow() {
  const dir = path.join(path.dirname(dbPath()), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `stock-radar-${new Date().toISOString().slice(0, 10)}.db`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.db')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 7))) fs.unlinkSync(path.join(dir, f));
  return files.length;
}
