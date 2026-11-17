import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';
export const POST = async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
};
