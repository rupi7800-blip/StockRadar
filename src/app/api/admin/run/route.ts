import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { runJob } from '@/lib/scheduler';
import { getSource } from '@/lib/sources/registry';
import { ingestSource } from '@/lib/ingest/news';
import { audit } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const POST = handler(async (req) => {
  await requireAdmin();
  const { job, source } = await body(req, z.object({ job: z.string().max(40).optional(), source: z.string().max(80).optional() }));
  audit('run', { job, source });
  if (source) {
    const s = getSource(source);
    if (!s) return bad('Fonte inesistente', 404);
    try {
      const ids = await ingestSource(s);
      return json({ ok: true, items: ids.length });
    } catch (e) {
      return json({ ok: false, error: (e as Error).message });
    }
  }
  if (!job) return bad('Indica job o source');
  return json(await runJob(job, true));
});
