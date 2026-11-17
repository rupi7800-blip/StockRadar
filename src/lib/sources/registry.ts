import 'server-only';
import { all, get, run, nowIso, jparse } from '../db';
import { SOURCE_CATALOG } from './catalog';

export type Source = {
  id: string; name: string; category: string; kind: string; url: string; homepage: string | null;
  content_type: string | null; lang: string; frequency_sec: number; enabled: number; tier: string;
  owner_group: string | null; official: number; section_hint: string | null; reliability_note: string | null;
  conflicts: string | null; api_limits: string | null; filter_keywords: string | null; meta: string | null;
  status: string; last_attempt: string | null; last_success: string | null; last_error: string | null;
  consecutive_failures: number; items_total: number; created_at: string; updated_at: string;
};

/** Inserisce le fonti del catalogo non ancora presenti (non sovrascrive mai le modifiche fatte da admin). */
export function seedSources() {
  for (const s of SOURCE_CATALOG) {
    run(
      `INSERT OR IGNORE INTO sources(id,name,category,kind,url,homepage,content_type,lang,frequency_sec,enabled,tier,owner_group,official,section_hint,reliability_note,conflicts,api_limits,filter_keywords,meta,seeded)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      s.id, s.name, s.category, s.kind, s.url, s.homepage, s.content_type, s.lang, s.frequency_sec,
      s.enabled === false ? 0 : 1, s.tier, s.owner_group, s.official ? 1 : 0, s.section_hint ?? null,
      s.reliability_note, s.conflicts ?? null, s.api_limits ?? null, s.filter_keywords ?? null, s.meta ? JSON.stringify(s.meta) : null,
    );
  }
  // le API opzionali si attivano da sole quando la chiave è presente
  const keyed: Record<string, string> = { fred: 'FRED_API_KEY' };
  for (const [id, env] of Object.entries(keyed)) {
    if (process.env[env]) run("UPDATE sources SET enabled = 1 WHERE id = ? AND status = 'unknown'", id);
  }
}

export function listSources(where = '1=1', ...params: unknown[]): Source[] {
  return all<Source>(`SELECT * FROM sources WHERE ${where} ORDER BY category, name`, ...params);
}
export function getSource(id: string) {
  return get<Source>('SELECT * FROM sources WHERE id = ?', id);
}
export function sourceMeta(s: Source): Record<string, string> {
  return jparse<Record<string, string>>(s.meta, {});
}

export function markAttempt(id: string) {
  run('UPDATE sources SET last_attempt = ? WHERE id = ?', nowIso(), id);
}
export function markSuccess(id: string, newItems = 0) {
  run(
    "UPDATE sources SET status = 'ok', last_success = ?, last_error = NULL, consecutive_failures = 0, items_total = items_total + ? WHERE id = ?",
    nowIso(), newItems, id,
  );
}
export function markFailure(id: string, error: string) {
  run(
    "UPDATE sources SET status = 'error', last_error = ?, consecutive_failures = consecutive_failures + 1 WHERE id = ?",
    error.slice(0, 400), id,
  );
}

export function isDue(s: Source) {
  if (!s.enabled || s.frequency_sec <= 0) return false;
  const last = s.last_attempt ? Date.parse(s.last_attempt) : 0;
  // backoff progressivo sulle fonti che falliscono (max 6x la frequenza)
  const factor = Math.min(1 + s.consecutive_failures, 6);
  return Date.now() - last >= s.frequency_sec * 1000 * factor;
}

export const TIER_LABEL: Record<string, string> = {
  A: 'Primaria / ufficiale',
  B: 'Testata affermata',
  C: 'Secondaria / opinione',
  D: 'Community (non verificata)',
};
export const CATEGORY_LABEL: Record<string, string> = {
  news: 'Testata giornalistica',
  official: 'Comunicazione ufficiale',
  regulator: 'Autorità di vigilanza',
  macro: 'Banca centrale / statistiche ufficiali',
  expert: 'Esperto / analista',
  community: 'Community',
  data: 'API dati',
};
