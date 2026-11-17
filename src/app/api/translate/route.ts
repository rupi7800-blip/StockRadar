import { z } from 'zod';
import { json, handler, body } from '@/lib/api';
import { translateTexts, LANGS } from '@/lib/translate';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
/** Traduzione di pagina "a un tasto": riceve i testi visibili e li restituisce tradotti (con cache). */
export const POST = handler(async (req) => {
  const { texts, target, from } = await body(
    req,
    z.object({ texts: z.array(z.string().max(1200)).min(1).max(80), target: z.string().refine((t) => t in LANGS), from: z.string().max(5).optional() }),
  );
  const { out, provider } = await translateTexts(texts, target, from && from in LANGS ? from : target === 'it' ? 'en' : 'it');
  return json({ out, provider, complete: out.every((x) => x != null) });
});
