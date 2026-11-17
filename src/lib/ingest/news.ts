import 'server-only';
import { all, get, run, tx, jparse, getSetting } from '../db';
import { fetchJson, fetchText } from '../http';
import { parseFeed, type FeedItem } from '../rss';
import { classify } from '../classify';
import { tokens, jaccard, stripHtml, truncate, safeUrl } from '../text';
import { evaluateCluster } from '../reliability';
import { listSources, isDue, markAttempt, markSuccess, markFailure, type Source } from '../sources/registry';
import { isMajor } from '../market/derived';

const MAX_AGE_DAYS = 10;

async function fetchItems(s: Source): Promise<FeedItem[]> {
  if (s.kind === 'rss') {
    const xml = await fetchText(s.url, { sourceId: s.id, headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8' } });
    return parseFeed(xml);
  }
  if (s.kind === 'statuspage') {
    const r = await fetchJson<any>(s.url, { sourceId: s.id });
    const list = [...(r.incidents ?? []), ...(r.scheduled_maintenances ?? [])];
    return list.map((i: any) => ({
      guid: i.id, url: safeUrl(i.shortlink) ?? s.homepage!, title: truncate(`${i.impact && i.impact !== 'none' ? '[' + i.impact.toUpperCase() + '] ' : ''}${stripHtml(i.name)}`, 300),
      excerpt: truncate(stripHtml(`Stato: ${i.status}. ${i.incident_updates?.[0]?.body ?? ''}`), 600), author: s.name, publishedAt: new Date(i.updated_at || i.created_at).toISOString(),
    }));
  }
  return [];
}

/** Assegna l'articolo a un evento esistente (stesso fatto riportato da più fonti) oppure ne crea uno nuovo. */
const GENERIC = new Set('million billion shares stock stocks trading halted halt suspended fraud charges charged probe investigation lawsuit bankruptcy files filing plunge plunges crash warning profit after market markets company investors'.split(' '));

function assignCluster(articleId: number, title: string, coins: string[], publishedAt: string, flags: string[] = []): number {
  const since = new Date(Date.parse(publishedAt) - 48 * 3600e3).toISOString();
  const cands = all<{ id: number; title: string; title_it: string | null; coins: string; flags: string; cluster_id: number }>(
    'SELECT id, title, title_it, coins, flags, cluster_id FROM articles WHERE cluster_id IS NOT NULL AND published_at >= ? AND id != ? ORDER BY published_at DESC LIMIT 800',
    since, articleId,
  );
  const tk = tokens(title);
  let best: { cluster: number; score: number } | null = null;
  for (const c of cands) {
    const sim = Math.max(jaccard(tk, tokens(c.title)), c.title_it ? jaccard(tk, tokens(c.title_it)) : 0);
    const cc = jparse<string[]>(c.coins, []);
    const sharedCoin = coins.some((x) => cc.includes(x));
    const shared = tk.filter((w) => tokens(c.title).includes(w)).length;
    const score = sim + (sharedCoin ? 0.08 : 0);
    // incidenti di sicurezza: stessa entità specifica (es. nome del protocollo) entro 24h, anche con cifre/parole diverse
    const incident = flags.includes('urgent') && jparse<string[]>(c.flags, []).includes('urgent') &&
      tk.some((w) => w.length >= 5 && !GENERIC.has(w) && !/^\d|\$/.test(w) && tokens(c.title).includes(w));
    if ((sim >= 0.5 || (sim >= 0.3 && sharedCoin && shared >= 3) || incident) && (!best || score > best.score)) best = { cluster: c.cluster_id, score };
  }
  if (best) {
    run('UPDATE articles SET cluster_id = ? WHERE id = ?', best.cluster, articleId);
    return best.cluster;
  }
  const r = run('INSERT INTO clusters(first_seen, last_seen, lead_article_id) VALUES(?,?,?)', publishedAt, publishedAt, articleId);
  const id = Number(r.lastInsertRowid);
  run('UPDATE articles SET cluster_id = ? WHERE id = ?', id, articleId);
  return id;
}

const TIER_W: Record<string, number> = { A: 30, B: 22, C: 12, D: 4 };

/** Punteggio di importanza (0-100) con componenti esplicite; la recenza viene applicata in lettura. */
export function computeClusterImportance(clusterId: number) {
  const ms = all<{ id: number; tier: string; flags: string; coins: string; categories: string; published_at: string; source_cat: string }>(
    `SELECT a.id, s.tier, a.flags, a.coins, a.categories, a.published_at, s.category AS source_cat FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.cluster_id = ?`, clusterId,
  );
  if (!ms.length) return;
  const c = get<{ independent_groups: number; status: string }>('SELECT independent_groups, status FROM clusters WHERE id = ?', clusterId)!;
  let score = Math.max(...ms.map((m) => TIER_W[m.tier] ?? 8));
  score += Math.min(c.independent_groups, 5) * 6;
  const flags = new Set(ms.flatMap((m) => jparse<string[]>(m.flags, [])));
  const coins = new Set(ms.flatMap((m) => jparse<string[]>(m.coins, [])));
  if (flags.has('urgent')) score += 15;
  if (flags.has('breaking')) score += 8;
  if (flags.has('sponsored')) score -= 25;
  if (flags.has('prediction')) score -= 10;
  if ([...coins].some((x) => isMajor(x))) score += 8;
  if (ms.some((m) => m.source_cat === 'regulator' || m.source_cat === 'macro')) score += 6;
  if (ms.every((m) => m.tier === 'D')) score -= 10;
  if (c.status === 'SMENTITA') score += 5;
  score = Math.max(0, Math.min(100, score));
  const first = Math.min(...ms.map((m) => Date.parse(m.published_at)));
  const lead = ms.sort((a, b) => (TIER_W[b.tier] ?? 0) - (TIER_W[a.tier] ?? 0) || Date.parse(a.published_at) - Date.parse(b.published_at))[0];
  const ageH = (Date.now() - first) / 3.6e6;
  const breaking = ageH < 3 && (flags.has('urgent') || flags.has('breaking') || c.independent_groups >= 3) && !flags.has('sponsored');
  run('UPDATE clusters SET importance = ?, lead_article_id = ? WHERE id = ?', score, lead.id, clusterId);
  run('UPDATE articles SET importance = ?, is_breaking = ? WHERE cluster_id = ?', score, breaking ? 1 : 0, clusterId);
}

export async function ingestSource(s: Source): Promise<number[]> {
  markAttempt(s.id);
  let items: FeedItem[];
  try {
    items = await fetchItems(s);
  } catch (e) {
    markFailure(s.id, (e as Error).message);
    throw e;
  }
  const filter = s.filter_keywords ? safeRe(s.filter_keywords) : null;
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400e3;
  const newIds: number[] = [];
  const blocked = getSetting<string[]>('blocked_url_patterns', []);
  tx(() => {
    for (const it of items.slice(0, 80)) {
      const t = Date.parse(it.publishedAt);
      if (t < cutoff || t > Date.now() + 3600e3) continue;
      if (filter && !filter.test(`${it.title} ${it.excerpt}`)) continue;
      if (blocked.some((b) => it.url.includes(b))) continue;
      const exists = get('SELECT 1 FROM articles WHERE source_id = ? AND (guid = ? OR url = ?)', s.id, it.guid, it.url);
      if (exists) continue;
      const { categories, coins, flags } = classify(it.title, it.excerpt, s.category, s.section_hint);
      const isIt = s.lang === 'it';
      const r = run(
        `INSERT INTO articles(source_id, guid, url, title, title_it, excerpt, excerpt_it, author, lang, published_at, categories, coins, flags, translation_provider)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        s.id, it.guid, it.url, it.title, isIt ? it.title : null, it.excerpt, isIt ? it.excerpt : null, it.author, s.lang, it.publishedAt,
        JSON.stringify(categories), JSON.stringify(coins), JSON.stringify(flags), isIt ? 'originale' : null,
      );
      const id = Number(r.lastInsertRowid);
      const cid = assignCluster(id, it.title, coins, it.publishedAt, flags);
      evaluateCluster(cid);
      computeClusterImportance(cid);
      newIds.push(id);
    }
  });
  markSuccess(s.id, newIds.length);
  return newIds;
}

function safeRe(s: string) {
  try {
    return new RegExp(s, 'i');
  } catch {
    return null;
  }
}

/** Esegue tutte le fonti "scadute" in parallelo limitato. Un errore su una fonte non blocca le altre. */
export async function ingestDueSources(force = false) {
  const due = listSources("enabled = 1 AND kind != 'data'").filter((s) => force || isDue(s));
  const results: { id: string; ok: boolean; items: number; error?: string }[] = [];
  const queue = [...due];
  const workers = Array.from({ length: 5 }, async () => {
    while (queue.length) {
      const s = queue.shift()!;
      try {
        const ids = await ingestSource(s);
        results.push({ id: s.id, ok: true, items: ids.length });
      } catch (e) {
        results.push({ id: s.id, ok: false, items: 0, error: (e as Error).message });
      }
    }
  });
  await Promise.all(workers);
  return results;
}

/** Ricalcola periodicamente importanza/breaking (la condizione "breaking" scade col tempo). */
export function refreshBreakingFlags() {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const recent = all<{ id: number }>('SELECT id FROM clusters WHERE last_seen >= ? OR id IN (SELECT DISTINCT cluster_id FROM articles WHERE is_breaking = 1)', since);
  for (const c of recent) computeClusterImportance(c.id);
}

/** Riclassifica gli articoli recenti (es. dopo il primo caricamento dell'catalogo dei titoli). */
export function reclassifyRecent(days = 3) {
  const rows = all<{ id: number; title: string; excerpt: string | null; cat: string; hint: string | null }>(
    'SELECT a.id, a.title, a.excerpt, s.category AS cat, s.section_hint AS hint FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.published_at >= ?',
    new Date(Date.now() - days * 86400e3).toISOString(),
  );
  tx(() => {
    for (const r of rows) {
      const c = classify(r.title, r.excerpt ?? '', r.cat, r.hint);
      run('UPDATE articles SET categories = ?, coins = ?, flags = ? WHERE id = ?', JSON.stringify(c.categories), JSON.stringify(c.coins), JSON.stringify(c.flags), r.id);
    }
  });
  return rows.length;
}
