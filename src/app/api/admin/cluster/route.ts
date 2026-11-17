import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { run, get, audit } from '@/lib/db';
export const dynamic = 'force-dynamic';
/** Correzione manuale dello stato di verifica, sempre motivata e registrata nello storico pubblico. */
export const POST = handler(async (req) => {
  await requireAdmin();
  const { clusterId, status, note } = await body(req, z.object({
    clusterId: z.number().int(), status: z.enum(['CONFERMATA', 'CONFERMATA PARZIALMENTE', 'NON VERIFICATA', 'SMENTITA']).nullable(), note: z.string().trim().min(5).max(500),
  }));
  const cur = get<{ status: string; status_override: string | null }>('SELECT status, status_override FROM clusters WHERE id = ?', clusterId);
  run('UPDATE clusters SET status_override = ?, status_override_note = ? WHERE id = ?', status, status ? note : null, clusterId);
  run('INSERT INTO reliability_history(cluster_id, old_status, new_status, note, actor) VALUES(?,?,?,?,?)', clusterId, cur?.status_override ?? cur?.status ?? null, status ?? cur?.status ?? 'NON VERIFICATA', note, 'redazione');
  audit('cluster_override', { clusterId, status });
  return json({ ok: true });
});
