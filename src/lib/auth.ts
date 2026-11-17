import 'server-only';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { getSetting, setSetting, run } from './db';

const COOKIE = 'sr_admin';
const TTL_MS = 12 * 3600e3;

function secret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  let s = getSetting<string | null>('session_secret', null);
  if (!s) {
    s = crypto.randomBytes(48).toString('hex');
    setSetting('session_secret', s);
  }
  return s;
}

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 10;
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, n: crypto.randomBytes(8).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(tok: string | undefined | null) {
  if (!tok) return false;
  const [payload, sig] = tok.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

/* tentativi di login: max 5 ogni 15 minuti per IP */
const attempts = new Map<string, number[]>();
export async function clientIp() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

export async function checkPassword(pw: string) {
  const ip = await clientIp();
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60e3);
  if (list.length >= 5) return { ok: false, error: 'Troppi tentativi. Riprova tra 15 minuti.' };
  list.push(now);
  attempts.set(ip, list);
  const expected = process.env.ADMIN_PASSWORD ?? '';
  // confronto a tempo costante su digest di lunghezza fissa
  const ha = crypto.createHash('sha256').update(pw).digest();
  const hb = crypto.createHash('sha256').update(expected).digest();
  const ok = adminConfigured() && crypto.timingSafeEqual(ha, hb);
  run('INSERT INTO admin_audit(action, detail) VALUES(?, ?)', ok ? 'login_ok' : 'login_fail', JSON.stringify({ ip }));
  if (ok) attempts.delete(ip);
  return ok ? { ok: true } : { ok: false, error: 'Password non valida' };
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_TTL = TTL_MS;
