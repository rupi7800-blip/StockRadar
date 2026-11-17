import { NextResponse, type NextRequest } from 'next/server';

/**
 * - Assegna un identificativo anonimo al dispositivo (watchlist/alert senza account).
 * - Rate limiting per IP sulle API.
 * - Protezione CSRF: le richieste che modificano dati devono provenire dalla stessa origine.
 */
const buckets = new Map<string, { tokens: number; at: number }>();
function allow(key: string, perMin: number) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMin, at: now };
  b.tokens = Math.min(perMin, b.tokens + ((now - b.at) / 60000) * perMin);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'local').trim();
    const heavy = pathname.startsWith('/api/ai') || pathname.startsWith('/api/translate');
    if (!allow(`${ip}:${heavy ? 'h' : 'n'}`, heavy ? 20 : 240)) {
      return NextResponse.json({ error: 'Troppe richieste, riprova tra poco.' }, { status: 429 });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD' && !pathname.startsWith('/api/cron')) {
      const origin = req.headers.get('origin');
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
      if (!origin || !host || new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Origine non consentita' }, { status: 403 });
      }
    }
  }
  const res = NextResponse.next();
  if (!req.cookies.get('sr_dev')) {
    res.cookies.set('sr_dev', crypto.randomUUID(), { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', maxAge: 60 * 60 * 24 * 400, path: '/' });
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|icons/|sw.js|manifest.webmanifest|favicon.ico).*)'] };
