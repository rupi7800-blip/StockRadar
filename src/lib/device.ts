import 'server-only';
import { cookies } from 'next/headers';
import { run } from './db';

export const DEVICE_COOKIE = 'sr_dev';
const RE = /^[0-9a-f-]{36}$/;

/** Identificativo anonimo del dispositivo (cookie httpOnly impostato dal middleware). Nessun dato personale. */
export async function deviceId(): Promise<string | null> {
  const c = await cookies();
  const v = c.get(DEVICE_COOKIE)?.value;
  if (!v || !RE.test(v)) return null;
  run('INSERT INTO devices(id, last_seen) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen', v, new Date().toISOString());
  return v;
}
