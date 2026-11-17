import { all, get, getCache, jparse } from '@/lib/db';
import { tickerNews } from '@/lib/news';
import type { Quote } from '@/lib/market/types';

/**
 * File di dati pubblici (gli stessi URL funzionano nell'app completa e nella versione statica, dove sono pre-generati):
 * ticker.json, market.json, news.json (ultime 48 h, per watchlist e avvisi), search.json (indice di ricerca).
 * Nessun dato riservato: solo informazioni già visibili nelle pagine.
 */
export const dynamic = 'force-dynamic';
const FILES = ['ticker.json', 'market.json', 'news.json', 'search.json'];

export async function generateStaticParams() {
  return FILES.map((file) => ({ file }));
}

function build(file: string): unknown {
  const now = new Date().toISOString();
  if (file === 'ticker.json') {
    const items = tickerNews(25).map((n) => ({ id: n.id, title: n.titleIt || n.title, original: n.title, translated: !!n.titleIt && n.lang !== 'it', source: n.sourceName, at: n.publishedAt, cat: n.categories[0] ?? null, breaking: n.isBreaking, urgent: n.flags.includes('urgent'), status: n.status, url: n.url, sources: n.clusterSize }));
    return { items, generatedAt: now };
  }
  if (file === 'market.json') {
    const qc = getCache<Quote[]>('market:quotes');
    return { quotes: (qc.value ?? []).map((q) => ({ ...q, spark: q.spark.slice(-30) })), source: qc.source, fetchedAt: qc.fetchedAt, generatedAt: now };
  }
  const days = file === 'news.json' ? 2 : Number(process.env.STATIC_DAYS || 7);
  const rows = all<{ id: number; title: string; title_it: string | null; source_name: string; source_id: string; source_cat: string; published_at: string; coins: string; categories: string; flags: string; is_breaking: number; status: string; cluster_id: number; url: string; lead: number }>(
    `SELECT a.id, a.title, a.title_it, s.name AS source_name, s.id AS source_id, s.category AS source_cat, a.published_at, a.coins, a.categories, a.flags, a.is_breaking,
       COALESCE(c.status_override, c.status) AS status, a.cluster_id, a.url, (a.id = c.lead_article_id) AS lead
     FROM articles a JOIN sources s ON s.id = a.source_id LEFT JOIN clusters c ON c.id = a.cluster_id WHERE a.published_at >= ? ORDER BY a.published_at DESC`,
    new Date(Date.now() - days * 86400e3).toISOString(),
  );
  const seen = new Set<number>();
  const uniq = rows.filter((r) => (seen.has(r.cluster_id) ? false : (seen.add(r.cluster_id), true)));
  if (file === 'news.json') {
    return { generatedAt: now, items: uniq.map((r) => ({ id: r.id, t: r.title, ti: r.title_it, s: r.source_name, sid: r.source_id, scat: r.source_cat, at: r.published_at, c: jparse(r.coins, []), k: jparse(r.categories, []), f: jparse(r.flags, []), b: !!r.is_breaking, st: r.status, cl: r.cluster_id })) };
  }
  return {
    generatedAt: now,
    news: uniq.map((r) => ({ id: r.id, t: r.title, ti: r.title_it, s: r.source_name, sid: r.source_id, at: r.published_at, st: r.status, c: jparse(r.coins, []), k: jparse(r.categories, []), u: r.url })),
    sources: all("SELECT id, name, category FROM sources WHERE kind != 'data' ORDER BY name"),
    _count: get<{ n: number }>('SELECT COUNT(*) n FROM articles')?.n,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FILES.includes(file)) return new Response('Not found', { status: 404 });
  return Response.json(build(file), { headers: { 'Cache-Control': 'public, max-age=60' } });
}
