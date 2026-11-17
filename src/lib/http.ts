import 'server-only';
import { run } from './db';

/**
 * Client HTTP per le fonti esterne: timeout, retry con backoff su 429/5xx/errori di rete,
 * intervallo minimo per host (rate limit di cortesia) e registrazione di ogni chiamata in api_log.
 */

const lastCallByHost = new Map<string, number>();
const MIN_INTERVAL_MS: Record<string, number> = {
  'query1.finance.yahoo.com': 350,
  'query2.finance.yahoo.com': 350,
  'stooq.com': 800,
  'api.nasdaq.com': 1500,
  'www.sec.gov': 200,
  'www.reddit.com': 3000,
  'api.mymemory.translated.net': 300,
};

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function ua() {
  const contact = process.env.CONTACT_EMAIL ? ` (${process.env.CONTACT_EMAIL})` : '';
  return `StockRadar/1.0 (+https://github.com/; news aggregator)${contact}`;
}

async function pace(host: string) {
  const min = MIN_INTERVAL_MS[host] ?? 100;
  const last = lastCallByHost.get(host) ?? 0;
  const wait = last + min - Date.now();
  lastCallByHost.set(host, Math.max(Date.now(), last + min));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/** User-Agent da browser per i servizi che rifiutano i client generici (Yahoo, Nasdaq). */
export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export type FetchOpts = {
  sourceId?: string;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
  log?: boolean;
};

export async function fetchRaw(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { sourceId, timeoutMs = 15000, retries = 2, headers = {}, method = 'GET', body, log = true } = opts;
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Protocollo non consentito');
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await pace(u.host);
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        body,
        signal: ctrl.signal,
        headers: { 'User-Agent': ua(), Accept: '*/*', ...headers },
        redirect: 'follow',
        cache: 'no-store',
      });
      clearTimeout(timer);
      const dur = Date.now() - t0;
      if (log) logCall(sourceId, url, res.status, res.ok, dur, res.ok ? null : `HTTP ${res.status}`);
      if (res.ok) return res;
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const ra = Number(res.headers.get('retry-after'));
        await new Promise((r) => setTimeout(r, Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1500 * 2 ** attempt, 15000)));
        continue;
      }
      throw new HttpError(`HTTP ${res.status} da ${u.host}`, res.status);
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof HttpError) throw e;
      const msg = (e as Error).name === 'AbortError' ? `Timeout dopo ${timeoutMs} ms` : (e as Error).message;
      if (log) logCall(sourceId, url, 0, false, Date.now() - t0, msg);
      lastErr = new Error(`${msg} (${u.host})`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Richiesta fallita');
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetchRaw(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  if (text.length > 25_000_000) throw new Error('Risposta troppo grande');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Risposta non JSON valida');
  }
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const res = await fetchRaw(url, opts);
  const text = await res.text();
  if (text.length > 8_000_000) throw new Error('Risposta troppo grande');
  return text;
}

function logCall(sourceId: string | undefined, url: string, status: number, ok: boolean, dur: number, error: string | null) {
  try {
    const u = new URL(url);
    // mai registrare query string (potrebbe contenere chiavi API)
    run('INSERT INTO api_log(source_id, endpoint, status, ok, duration_ms, error) VALUES(?,?,?,?,?,?)', sourceId ?? u.host, u.host + u.pathname, status, ok ? 1 : 0, dur, error);
  } catch {
    /* il logging non deve mai bloccare l'acquisizione */
  }
}
