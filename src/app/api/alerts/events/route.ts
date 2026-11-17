import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { all, run } from '@/lib/db';
import { deviceId } from '@/lib/device';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const d = await deviceId();
  if (!d) return json({ items: [], unread: 0 });
  const items = all<{ read: number }>('SELECT id, title, body, url, read, created_at FROM alert_events WHERE device_id = ? ORDER BY id DESC LIMIT 50', d);
  return json({ items, unread: items.filter((i) => !i.read).length });
});
export const POST = handler(async (req) => {
  const d = await deviceId();
  await body(req, z.object({ all: z.literal(true) }));
  run('UPDATE alert_events SET read = 1 WHERE device_id = ?', d);
  return json({ ok: true });
});
