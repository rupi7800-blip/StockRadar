import { z } from 'zod';
import { NextResponse } from 'next/server';
import { handler, body, bad } from '@/lib/api';
import { checkPassword, createSessionToken, adminConfigured, ADMIN_COOKIE, ADMIN_TTL } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const POST = handler(async (req) => {
  if (!adminConfigured()) return bad('Area amministrativa disattivata: imposta ADMIN_PASSWORD (min 10 caratteri) nel file .env', 503);
  const { password } = await body(req, z.object({ password: z.string().min(1).max(200) }));
  const r = await checkPassword(password);
  if (!r.ok) return bad(r.error!, 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), { httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:' || process.env.NODE_ENV === 'production', path: '/', maxAge: ADMIN_TTL / 1000 });
  return res;
});
