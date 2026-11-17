import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { run } from '@/lib/db';
export const dynamic = 'force-dynamic';
const seen = new Map<string, number>();
/** Conteggio letture/condivisioni interne all'app (anonimo, max 1 per IP/articolo/ora). */
export const POST = handler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const id = Number((await params).id);
  const { type } = await body(req, z.object({ type: z.enum(['read', 'share']) }));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  const k = `${ip}:${id}:${type}`;
  if ((seen.get(k) ?? 0) > Date.now() - 3600e3) return json({ ok: true });
  seen.set(k, Date.now());
  if (seen.size > 20000) seen.clear();
  run(`UPDATE articles SET ${type === 'read' ? 'reads = reads + 1' : 'shares = shares + 1'} WHERE id = ?`, id);
  return json({ ok: true });
});
