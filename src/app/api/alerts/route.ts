import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { all, run } from '@/lib/db';
import { deviceId } from '@/lib/device';
import { ALERT_TYPES } from '@/lib/alerts';
export const dynamic = 'force-dynamic';
const Rule = z.object({
  type: z.string().refine((t) => t in ALERT_TYPES, 'tipo non valido'),
  target: z.string().trim().max(100).optional().nullable(),
  threshold: z.number().finite().optional().nullable(),
  cooldown_min: z.number().int().min(5).max(10080).default(60),
  push: z.boolean().default(true),
});
export const GET = handler(async () => {
  const d = await deviceId();
  return json({ rules: d ? all('SELECT * FROM alert_rules WHERE device_id = ? ORDER BY id DESC', d) : [], types: ALERT_TYPES });
});
export const POST = handler(async (req) => {
  const d = await deviceId();
  if (!d) return bad('Dispositivo sconosciuto: ricarica la pagina');
  const r = await body(req, Rule);
  const t = ALERT_TYPES[r.type];
  if (t.needsTarget && !r.target) return bad('Indica l\'elemento da monitorare');
  if (t.needsThreshold && (r.threshold == null || r.threshold <= 0)) return bad('Indica una soglia positiva');
  if (all('SELECT 1 FROM alert_rules WHERE device_id = ?', d).length >= 50) return bad('Massimo 50 regole per dispositivo');
  run('INSERT INTO alert_rules(device_id, type, target, threshold, cooldown_min, push) VALUES(?,?,?,?,?,?)', d, r.type, r.target ?? null, r.threshold ?? null, r.cooldown_min, r.push ? 1 : 0);
  return json({ ok: true });
});
export const PATCH = handler(async (req) => {
  const d = await deviceId();
  const { id, enabled } = await body(req, z.object({ id: z.number().int(), enabled: z.boolean() }));
  run('UPDATE alert_rules SET enabled = ? WHERE id = ? AND device_id = ?', enabled ? 1 : 0, id, d);
  return json({ ok: true });
});
export const DELETE = handler(async (req) => {
  const d = await deviceId();
  const { id } = await body(req, z.object({ id: z.number().int() }));
  run('DELETE FROM alert_rules WHERE id = ? AND device_id = ?', id, d);
  return json({ ok: true });
});
