import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { fetchText } from '@/lib/http';
import { parseFeed } from '@/lib/rss';
export const dynamic = 'force-dynamic';
/** Prova un feed prima di aggiungerlo: restituisce i primi titoli o l'errore. */
export const POST = handler(async (req) => {
  await requireAdmin();
  const { url } = await body(req, z.object({ url: z.string().url().refine((u) => u.startsWith('https://') || u.startsWith('http://')) }));
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) || host.endsWith('.internal')) return json({ ok: false, error: 'Indirizzi interni non consentiti' });
  try {
    const items = parseFeed(await fetchText(url, { retries: 0, timeoutMs: 12000 }));
    return json({ ok: true, count: items.length, sample: items.slice(0, 5).map((i) => ({ title: i.title, at: i.publishedAt })) });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message });
  }
});
