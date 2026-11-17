import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { compareOpinions } from '@/lib/ai/tasks';
import { AiUnavailable, DISCLAIMER } from '@/lib/ai';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const POST = handler(async (req) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.number().int().positive()).min(2).max(8) }));
  try {
    return json({ data: await compareOpinions(ids), disclaimer: DISCLAIMER });
  } catch (e) {
    return bad((e as Error).message.slice(0, 300), e instanceof AiUnavailable ? 503 : 502);
  }
});
