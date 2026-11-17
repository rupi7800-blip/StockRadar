import 'server-only';
import crypto from 'node:crypto';
import { all, get, run, getSetting, setSetting } from './db';
import { fetchJson } from './http';
import { aiAvailable, aiConfig } from './ai';
import { aiTranslate } from './ai/tasks';

export const LANGS: Record<string, string> = { it: 'Italiano', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português' };

const h = (t: string, lang: string) => crypto.createHash('sha1').update(lang + '\u0000' + t).digest('hex');

function myMemoryQuota() {
  const day = new Date().toISOString().slice(0, 10);
  const q = getSetting<{ day: string; chars: number }>('mymemory_quota', { day, chars: 0 });
  const limit = process.env.MYMEMORY_EMAIL ? 45000 : 4500;
  return { used: q.day === day ? q.chars : 0, limit, day };
}

async function myMemory(text: string, from: string, to: string): Promise<string | null> {
  const q = myMemoryQuota();
  if (q.used + text.length > q.limit) return null;
  const params = new URLSearchParams({ q: text.slice(0, 480), langpair: `${from}|${to}` });
  if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);
  const r = await fetchJson<any>(`https://api.mymemory.translated.net/get?${params}`, { sourceId: 'mymemory', retries: 0, log: true });
  setSetting('mymemory_quota', { day: q.day, chars: q.used + text.length });
  if (r.responseStatus !== 200 || !r.responseData?.translatedText) return null;
  const out = String(r.responseData.translatedText);
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(out)) return null;
  return out;
}

/**
 * Traduce un elenco di testi. Ordine dei fornitori: cache → AI (se configurata) → MyMemory (gratuito, quota limitata).
 * Restituisce null per i testi non traducibili (l'interfaccia mostra allora l'originale con un'etichetta).
 */
export async function translateTexts(texts: string[], target = 'it', from = 'en', opts: { allowFree?: boolean } = {}): Promise<{ out: (string | null)[]; provider: string | null }> {
  const out: (string | null)[] = texts.map(() => null);
  const missing: number[] = [];
  texts.forEach((t, i) => {
    if (!t?.trim()) { out[i] = t; return; }
    const hit = get<{ text: string }>('SELECT text FROM translations WHERE hash = ?', h(t, target));
    if (hit) out[i] = hit.text;
    else missing.push(i);
  });
  if (!missing.length) return { out, provider: 'cache' };
  let provider: string | null = null;
  if (aiAvailable() && aiConfig().features.translate) {
    for (let k = 0; k < missing.length; k += 25) {
      const idx = missing.slice(k, k + 25);
      try {
        const r = await aiTranslate(idx.map((i) => texts[i]), target);
        idx.forEach((i, j) => {
          out[i] = r.list[j];
          run('INSERT OR REPLACE INTO translations(hash, lang, text, provider) VALUES(?,?,?,?)', h(texts[i], target), target, r.list[j], r.provider);
        });
        provider = r.provider;
      } catch {
        break; // si passa al fallback gratuito
      }
    }
  }
  if (opts.allowFree !== false) {
    for (const i of missing) {
      if (out[i] != null) continue;
      try {
        const t = await myMemory(texts[i], from, target);
        if (t) {
          out[i] = t;
          provider ??= 'MyMemory';
          run('INSERT OR REPLACE INTO translations(hash, lang, text, provider) VALUES(?,?,?,?)', h(texts[i], target), target, t, 'MyMemory');
        }
      } catch {
        break;
      }
    }
  }
  return { out, provider };
}

/** Job: traduce in italiano titoli (ed estratti) delle notizie nuove, partendo dalle più importanti. */
export async function translatePendingArticles(limit = 30) {
  const rows = all<{ id: number; title: string; excerpt: string | null; lang: string }>(
    "SELECT id, title, excerpt, lang FROM articles WHERE title_it IS NULL AND lang != 'it' ORDER BY importance DESC, published_at DESC LIMIT ?", limit,
  );
  if (!rows.length) return 0;
  const useAi = aiAvailable() && aiConfig().features.translate;
  const texts: string[] = [];
  for (const r of rows) {
    texts.push(r.title);
    if (useAi) texts.push((r.excerpt ?? '').slice(0, 400));
  }
  const { out, provider } = await translateTexts(texts, 'it', 'en');
  let n = 0;
  rows.forEach((r, i) => {
    const t = useAi ? out[i * 2] : out[i];
    const e = useAi ? out[i * 2 + 1] : null;
    if (t) {
      run('UPDATE articles SET title_it = ?, excerpt_it = COALESCE(?, excerpt_it), translation_provider = ? WHERE id = ?', t, e || null, provider, r.id);
      n++;
    }
  });
  return n;
}
