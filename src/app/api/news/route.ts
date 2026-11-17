import { z } from 'zod';
import { json, handler } from '@/lib/api';
import { listNews } from '@/lib/news';
export const dynamic = 'force-dynamic';
const Q = z.object({
  section: z.string().max(30).optional(), coin: z.string().max(80).optional(), source: z.string().max(80).optional(), status: z.string().max(40).optional(),
  q: z.string().max(120).optional(), from: z.string().max(30).optional(), to: z.string().max(30).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30), offset: z.coerce.number().int().min(0).max(5000).default(0),
});
export const GET = handler(async (req) => {
  const p = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const items = listNews({ section: p.section, coin: p.coin, sourceId: p.source, status: p.status, q: p.q, from: p.from, to: p.to, limit: p.limit, offset: p.offset });
  return json({ items });
});
