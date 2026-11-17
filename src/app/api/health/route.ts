import { json, handler } from '@/lib/api';
import { get } from '@/lib/db';
import { schedulerState } from '@/lib/scheduler';
export const dynamic = 'force-dynamic';
export const GET = handler(async () => {
  let dbOk = false;
  try { dbOk = get<{ ok: number }>('SELECT 1 AS ok')?.ok === 1; } catch { dbOk = false; }
  return json({ ok: dbOk, db: dbOk, scheduler: schedulerState().started, time: new Date().toISOString() }, dbOk ? 200 : 503);
});
