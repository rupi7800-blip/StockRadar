import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { run } from '@/lib/db';
import { deviceId } from '@/lib/device';
import { pushToDevice } from '@/lib/push';
export const dynamic = 'force-dynamic';
const Sub = z.object({ endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://')), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });
export const POST = handler(async (req) => {
  const d = await deviceId();
  if (!d) return bad('Dispositivo sconosciuto');
  const s = await body(req, Sub);
  run('INSERT OR REPLACE INTO push_subs(endpoint, device_id, p256dh, auth) VALUES(?,?,?,?)', s.endpoint, d, s.keys.p256dh, s.keys.auth);
  const sent = await pushToDevice(d, { title: 'Stock Radar', body: 'Notifiche attivate correttamente.', url: '/alert' });
  return json({ ok: true, testSent: sent > 0 });
});
export const DELETE = handler(async (req) => {
  const d = await deviceId();
  const { endpoint } = await body(req, z.object({ endpoint: z.string().max(1000) }));
  run('DELETE FROM push_subs WHERE endpoint = ? AND device_id = ?', endpoint, d);
  return json({ ok: true });
});
