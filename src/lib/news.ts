import 'server-only';
import { all, get, jparse } from './db';

export type NewsItem = {
  id: number; title: string; titleIt: string | null; excerpt: string | null; excerptIt: string | null; url: string; author: string | null;
  sourceId: string; sourceName: string; sourceTier: string; sourceOfficial: boolean; sourceCategory: string; lang: string;
  publishedAt: string; categories: string[]; coins: string[]; flags: string[]; clusterId: number; status: string; reasons: string[];
  clusterSize: number; groups: number; isBreaking: boolean; importance: number; reads: number; shares: number; hasAi: boolean; translationProvider: string | null;
};

const SELECT = `SELECT a.id, a.title, a.title_it, a.excerpt, a.excerpt_it, a.url, a.author, a.source_id, s.name AS source_name, s.tier, s.official, s.category AS source_cat, a.lang,
  a.published_at, a.categories, a.coins, a.flags, a.cluster_id, COALESCE(c.status_override, c.status) AS status, c.reasons, c.size, c.independent_groups, a.is_breaking,
  a.importance, a.reads, a.shares, (a.ai_json IS NOT NULL) AS has_ai, a.translation_provider
  FROM articles a JOIN sources s ON s.id = a.source_id LEFT JOIN clusters c ON c.id = a.cluster_id`;

function map(r: any): NewsItem {
  return {
    id: r.id, title: r.title, titleIt: r.title_it, excerpt: r.excerpt, excerptIt: r.excerpt_it, url: r.url, author: r.author,
    sourceId: r.source_id, sourceName: r.source_name, sourceTier: r.tier, sourceOfficial: !!r.official, sourceCategory: r.source_cat, lang: r.lang,
    publishedAt: r.published_at, categories: jparse(r.categories, []), coins: jparse(r.coins, []), flags: jparse(r.flags, []), clusterId: r.cluster_id,
    status: r.status ?? 'NON VERIFICATA', reasons: jparse(r.reasons, []), clusterSize: r.size ?? 1, groups: r.independent_groups ?? 1,
    isBreaking: !!r.is_breaking, importance: r.importance, reads: r.reads, shares: r.shares, hasAi: !!r.has_ai, translationProvider: r.translation_provider,
  };
}

export type NewsFilter = {
  section?: string; coin?: string; coinsAny?: string[]; sourceId?: string; sourceCategory?: string | string[]; status?: string; q?: string;
  from?: string; to?: string; limit?: number; offset?: number; dedupe?: boolean; minTier?: 'A' | 'B' | 'C' | 'D'; flag?: string;
};

function ftsQuery(q: string) {
  // supporta "A OR B" (gruppi alternativi); dentro ogni gruppo i termini sono in AND
  const groups = q.split(/\s+OR\s+/).slice(0, 8).map((g) =>
    g.replace(/["*^():\-+]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && t !== 'AND' && t !== 'NOT').slice(0, 8).map((t) => `"${t}"*`).join(' AND '),
  ).filter(Boolean);
  return groups.length > 1 ? groups.map((g) => `(${g})`).join(' OR ') : groups[0] ?? '';
}

export function listNews(f: NewsFilter = {}): NewsItem[] {
  // versione statica: solo le notizie le cui schede vengono pubblicate
  if (process.env.STATIC_EXPORT === '1' && !f.from) f = { ...f, from: new Date(Date.now() - Number(process.env.STATIC_DAYS || 7) * 86400e3).toISOString() };
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.section) { where.push("EXISTS (SELECT 1 FROM json_each(a.categories) WHERE value = ?)"); params.push(f.section); }
  if (f.coin) { where.push("EXISTS (SELECT 1 FROM json_each(a.coins) WHERE value = ?)"); params.push(f.coin); }
  if (f.coinsAny?.length) { where.push(`EXISTS (SELECT 1 FROM json_each(a.coins) WHERE value IN (${f.coinsAny.map(() => '?').join(',')}))`); params.push(...f.coinsAny); }
  if (f.flag) { where.push("EXISTS (SELECT 1 FROM json_each(a.flags) WHERE value = ?)"); params.push(f.flag); }
  if (f.sourceId) { where.push('a.source_id = ?'); params.push(f.sourceId); }
  if (f.sourceCategory) {
    const cats = Array.isArray(f.sourceCategory) ? f.sourceCategory : [f.sourceCategory];
    where.push(`s.category IN (${cats.map(() => '?').join(',')})`);
    params.push(...cats);
  }
  if (f.minTier) { where.push('s.tier <= ?'); params.push(f.minTier); }
  if (f.status) { where.push('COALESCE(c.status_override, c.status) = ?'); params.push(f.status); }
  if (f.from) { where.push('a.published_at >= ?'); params.push(f.from); }
  if (f.to) { where.push('a.published_at <= ?'); params.push(f.to); }
  if (f.q && ftsQuery(f.q)) { where.push('a.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)'); params.push(ftsQuery(f.q)); }
  const limit = Math.min(f.limit ?? 30, 200);
  const offset = f.offset ?? 0;
  const dedupe = f.dedupe !== false;
  const rows = all(`${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.published_at DESC LIMIT ? OFFSET ?`, ...params, dedupe ? limit * 4 : limit, offset);
  const items = rows.map(map);
  if (!dedupe) return items;
  const seen = new Set<number>();
  const out: NewsItem[] = [];
  for (const it of items) {
    if (seen.has(it.clusterId)) continue;
    seen.add(it.clusterId);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

/** Notizie per il banner: una per evento, ordinate per importanza con decadimento temporale. */
export function tickerNews(limit = 25): NewsItem[] {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const rows = all(
    `${SELECT} WHERE a.id = c.lead_article_id AND c.last_seen >= ? AND COALESCE(c.status_override, c.status) != 'SMENTITA' AND s.tier != 'D'
     AND NOT EXISTS (SELECT 1 FROM json_each(a.flags) WHERE value = 'sponsored')
     ORDER BY (a.is_breaking * 40 + c.importance - (julianday('now') - julianday(c.first_seen)) * 24 * 2.5) DESC LIMIT ?`,
    since, limit,
  );
  return rows.map(map);
}

export function topNews(limit = 10, hours = 24): NewsItem[] {
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  return all(
    `${SELECT} WHERE a.id = c.lead_article_id AND c.last_seen >= ? AND s.tier != 'D' AND NOT EXISTS (SELECT 1 FROM json_each(a.flags) WHERE value = 'sponsored')
     ORDER BY c.importance DESC, c.size DESC LIMIT ?`, since, limit,
  ).map(map);
}

export function mostRead(limit = 6, metric: 'reads' | 'shares' = 'reads'): NewsItem[] {
  const since = new Date(Date.now() - 72 * 3600e3).toISOString();
  return all(`${SELECT} WHERE a.published_at >= ? AND a.${metric} > 0 ORDER BY a.${metric} DESC LIMIT ?`, since, limit).map(map);
}

export function officialUpdates(limit = 8): NewsItem[] {
  return all(`${SELECT} WHERE s.official = 1 ORDER BY a.published_at DESC LIMIT ?`, limit).map(map);
}

export function getArticle(id: number) {
  const r = get(`${SELECT} WHERE a.id = ?`, id);
  if (!r) return null;
  const item = map(r);
  const members = all(`${SELECT} WHERE a.cluster_id = ? ORDER BY a.published_at ASC`, item.clusterId).map(map);
  const history = all<{ old_status: string; new_status: string; note: string; actor: string; at: string }>(
    'SELECT old_status, new_status, note, actor, at FROM reliability_history WHERE cluster_id = ? ORDER BY id DESC LIMIT 20', item.clusterId,
  );
  const cl = get<{ status: string; status_override: string | null; status_override_note: string | null }>('SELECT status, status_override, status_override_note FROM clusters WHERE id = ?', item.clusterId);
  return { item, members, history, cluster: cl };
}

/** Argomenti di tendenza: frequenza di titoli citati e sezioni nelle ultime 24h rispetto alle 24h precedenti. */
export function trendingTopics() {
  const now = Date.now();
  const a = new Date(now - 24 * 3600e3).toISOString();
  const b = new Date(now - 48 * 3600e3).toISOString();
  const count = (kind: 'coins' | 'categories', from: string, to: string) =>
    new Map(all<{ v: string; n: number }>(
      `SELECT j.value AS v, COUNT(DISTINCT a.cluster_id) AS n FROM articles a, json_each(a.${kind}) j WHERE a.published_at >= ? AND a.published_at < ? GROUP BY j.value`, from, to,
    ).map((r) => [r.v, r.n]));
  const end = new Date(now + 3600e3).toISOString();
  const coinsNow = count('coins', a, end), coinsPrev = count('coins', b, a);
  const catsNow = count('categories', a, end);
  const coins = [...coinsNow.entries()].map(([id, n]) => ({ id, n, prev: coinsPrev.get(id) ?? 0, growth: n - (coinsPrev.get(id) ?? 0) })).sort((x, y) => y.n - x.n);
  const words = new Map<string, number>();
  const titles = all<{ title: string }>("SELECT a.title FROM articles a JOIN clusters c ON c.id = a.cluster_id WHERE a.id = c.lead_article_id AND a.published_at >= ?", a);
  const STOP = new Set('stock stocks shares share market markets price says after amid with from will this that what over into than more first new could year week report just about their have million billion della delle degli dopo come anche sono sulla nella borsa titoli mercati'.split(' '));
  for (const t of titles) {
    const ws = t.title.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];
    const pairs = ws.slice(0, -1).map((w, i) => `${w} ${ws[i + 1]}`).filter((p) => !p.split(' ').some((x) => STOP.has(x)));
    for (const p of new Set(pairs)) words.set(p, (words.get(p) ?? 0) + 1);
  }
  const phrases = [...words.entries()].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([p, n]) => ({ phrase: p, n }));
  return { coins: coins.slice(0, 15), rising: [...coins].sort((x, y) => y.growth - x.growth).slice(0, 8), categories: [...catsNow.entries()].sort((x, y) => y[1] - x[1]), phrases };
}

export function newsStats() {
  return get<{ total: number; today: number; clusters: number }>(
    "SELECT (SELECT COUNT(*) FROM articles) AS total, (SELECT COUNT(*) FROM articles WHERE published_at >= ?) AS today, (SELECT COUNT(*) FROM clusters) AS clusters",
    new Date(Date.now() - 24 * 3600e3).toISOString(),
  )!;
}
