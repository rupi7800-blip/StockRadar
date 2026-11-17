import { json, handler } from '@/lib/api';
import { tickerNews } from '@/lib/news';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const items = tickerNews(25).map((n) => ({ id: n.id, title: n.titleIt || n.title, original: n.title, translated: !!n.titleIt && n.lang !== 'it', source: n.sourceName, at: n.publishedAt, cat: n.categories[0] ?? null, breaking: n.isBreaking, urgent: n.flags.includes('urgent'), status: n.status, url: n.url, sources: n.clusterSize }));
  return json({ items, generatedAt: new Date().toISOString() });
});
