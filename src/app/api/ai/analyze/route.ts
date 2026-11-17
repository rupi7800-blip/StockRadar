import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { analyzeCluster } from '@/lib/ai/tasks';
import { AiUnavailable, DISCLAIMER } from '@/lib/ai';
import { isAdmin } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const POST = handler(async (req) => {
  const { clusterId, force } = await body(req, z.object({ clusterId: z.number().int().positive(), force: z.boolean().optional() }));
  try {
    const data = await analyzeCluster(clusterId, !!force && (await isAdmin()));
    return json({ data, disclaimer: DISCLAIMER });
  } catch (e) {
    if (e instanceof AiUnavailable) return bad(e.message, 503);
    return bad((e as Error).message.slice(0, 300), 502);
  }
});
