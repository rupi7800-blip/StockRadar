import { json, handler } from '@/lib/api';
import { getCache } from '@/lib/db';
import { DISCLAIMER } from '@/lib/ai';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  const c = getCache<unknown>('ai:briefing');
  return json({ data: c.value, at: c.fetchedAt, source: c.source, disclaimer: DISCLAIMER });
});
