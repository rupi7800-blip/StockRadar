import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { all, run } from '@/lib/db';
import { deviceId } from '@/lib/device';
export const dynamic = 'force-dynamic';
const Item = z.object({ type: z.enum(['stock', 'company', 'expert', 'topic']), id: z.string().trim().min(1).max(100), label: z.string().max(120).optional() });
export const GET = handler(async () => {
  const d = await deviceId();
  if (!d) return json({ items: [] });
  return json({ items: all('SELECT item_type AS type, item_id AS id, label, added_at FROM watchlist WHERE device_id = ? ORDER BY added_at DESC', d) });
});
export const POST = handler(async (req) => {
  const d = await deviceId();
  if (!d) return bad('Cookie del dispositivo assente: ricarica la pagina', 400);
  const it = await body(req, Item);
  const n = all('SELECT 1 FROM watchlist WHERE device_id = ?', d).length;
  if (n >= 200) return bad('Watchlist piena (max 200 elementi)');
  run('INSERT OR REPLACE INTO watchlist(device_id, item_type, item_id, label) VALUES(?,?,?,?)', d, it.type, it.id, it.label ?? it.id);
  return json({ ok: true });
});
export const DELETE = handler(async (req) => {
  const d = await deviceId();
  if (!d) return bad('Dispositivo sconosciuto');
  const it = await body(req, Item.omit({ label: true }));
  run('DELETE FROM watchlist WHERE device_id = ? AND item_type = ? AND item_id = ?', d, it.type, it.id);
  return json({ ok: true });
});
