import crypto from 'node:crypto';
import { json, handler, bad } from '@/lib/api';
import { runJob, JOBS } from '@/lib/scheduler';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
/**
 * Endpoint per scheduler esterni (es. cron di sistema, GitHub Actions, cron-job.org) quando l'app gira su piattaforme
 * che non mantengono processi in background. Richiede: Authorization: Bearer <CRON_SECRET>.
 */
export const POST = handler(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return bad('CRON_SECRET non configurato', 503);
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = crypto.createHash('sha256').update(got).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  if (!crypto.timingSafeEqual(a, b)) return bad('Non autorizzato', 401);
  const job = new URL(req.url).searchParams.get('job');
  const ids = job ? [job] : JOBS.map((j) => j.id);
  const results: Record<string, unknown> = {};
  for (const id of ids) results[id] = await runJob(id);
  return json({ results });
});
