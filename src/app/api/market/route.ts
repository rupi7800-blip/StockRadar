import { json, handler } from '@/lib/api';
import { getCache } from '@/lib/db';
import type { Quote } from '@/lib/market/types';
export const dynamic = 'force-dynamic';
/** Quotazioni correnti di tutti gli strumenti (stesso formato del file statico /data/market.json). */
export const GET = handler(async () => {
  const qc = getCache<Quote[]>('market:quotes');
  return json({ quotes: (qc.value ?? []).map((q) => ({ ...q, spark: q.spark.slice(-30) })), source: qc.source, fetchedAt: qc.fetchedAt, error: qc.error }, 200, 30);
});
