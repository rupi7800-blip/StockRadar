import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export function json(data: unknown, status = 200, cacheSec = 0) {
  return NextResponse.json(data, {
    status,
    headers: cacheSec ? { 'Cache-Control': `public, max-age=${cacheSec}, stale-while-revalidate=${cacheSec * 4}` } : { 'Cache-Control': 'no-store' },
  });
}

export function bad(msg: string, status = 400) {
  return json({ error: msg }, status);
}

/** Wrapper uniforme: validazione input, gestione errori, nessuna fuga di stack trace verso il client. */
export function handler<T>(fn: (req: Request, ctx: T) => Promise<Response>) {
  return async (req: Request, ctx: T) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof Response) return e;
      if (e instanceof z.ZodError) return bad('Dati non validi: ' + e.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; '));
      console.error('[api]', e);
      return bad('Errore interno', 500);
    }
  };
}

export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 200_000) throw new Response(JSON.stringify({ error: 'Richiesta troppo grande' }), { status: 413 });
  const data = await req.json().catch(() => {
    throw new Response(JSON.stringify({ error: 'JSON non valido' }), { status: 400 });
  });
  return schema.parse(data);
}
