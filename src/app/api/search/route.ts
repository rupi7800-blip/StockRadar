import { z } from 'zod';
import { json, handler } from '@/lib/api';
import { listNews } from '@/lib/news';
import { searchInstruments } from '@/lib/market/search';
import { all } from '@/lib/db';
export const dynamic = 'force-dynamic';
const Q = z.object({ q: z.string().trim().min(1).max(120) });
/** Ricerca globale: notizie, titoli e indici, fonti/esperti, autori. */
export const GET = handler(async (req) => {
  const { q } = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const like = `%${q.replace(/[%_]/g, '')}%`;
  return json({
    news: listNews({ q, limit: 12 }),
    instruments: searchInstruments(q, 8),
    sources: all('SELECT id, name, category, tier FROM sources WHERE name LIKE ? OR id LIKE ? LIMIT 8', like, like),
    authors: all('SELECT DISTINCT author, source_id FROM articles WHERE author LIKE ? LIMIT 6', like),
  });
});
