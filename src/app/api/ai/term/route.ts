import { z } from 'zod';
import { json, handler, body, bad } from '@/lib/api';
import { explainTerm } from '@/lib/ai/tasks';
import { AiUnavailable, DISCLAIMER } from '@/lib/ai';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req) => {
  const { term } = await body(req, z.object({ term: z.string().trim().min(2).max(80) }));
  try {
    return json({ data: await explainTerm(term), disclaimer: DISCLAIMER });
  } catch (e) {
    return bad((e as Error).message.slice(0, 300), e instanceof AiUnavailable ? 503 : 502);
  }
});
