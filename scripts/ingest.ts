/**
 * Raccolta dati "una tantum" per la versione statica (eseguita da GitHub Actions prima della build).
 * Avvio: npx tsx --conditions=react-server scripts/ingest.ts
 * Usa esattamente gli stessi job dell'app completa; il database persiste tra un'esecuzione e l'altra tramite la cache di Actions.
 */
import { seedSources } from '../src/lib/sources/registry';
import { runJob } from '../src/lib/scheduler';
import { run } from '../src/lib/db';

const ORDER = ['quotes', 'news', 'history', 'earnings', 'ipo', 'ecb', 'macro', 'breaking', 'translate', 'translate', 'translate', 'ai_auto', 'briefing'];

async function main() {
  const t0 = Date.now();
  seedSources();
  run("UPDATE ingest_runs SET finished_at = ?, ok = 0, error = 'interrotto' WHERE finished_at IS NULL", new Date().toISOString());
  // conservazione: in versione statica bastano 30 giorni di archivio
  const keep = Number(process.env.ARCHIVE_RETENTION_DAYS || 30);
  run('DELETE FROM articles WHERE published_at < ?', new Date(Date.now() - keep * 86400e3).toISOString());
  run('DELETE FROM api_log WHERE at < ?', new Date(Date.now() - 7 * 86400e3).toISOString().replace('T', ' ').slice(0, 19));
  run('DELETE FROM ingest_runs WHERE started_at < ?', new Date(Date.now() - 7 * 86400e3).toISOString());
  for (const id of ORDER) {
    const s = Date.now();
    const r = await runJob(id).catch((e: Error) => ({ ok: false, error: e.message }));
    const label = 'skipped' in r ? 'saltato (disattivato o senza chiave)' : r.ok ? `ok (${(r as { items?: number }).items ?? 0})` : `ERRORE: ${(r as { error?: string }).error}`;
    console.log(`${id.padEnd(12)} ${label} — ${Date.now() - s} ms`);
  }
  console.log(`Raccolta completata in ${Math.round((Date.now() - t0) / 1000)} s`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
