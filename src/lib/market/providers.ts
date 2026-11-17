import 'server-only';
import { fetchJson, fetchText, BROWSER_UA } from '../http';
import type { Instrument } from './catalog';
import { EXCHANGE_BY_ID } from './catalog';
import type { Quote } from './types';

/**
 * Fornitori di quotazioni gratuiti, senza chiave:
 *  1) Yahoo Finance — endpoint pubblico "chart" (prezzi ritardati di circa 15–20 minuti per la maggior parte delle borse);
 *  2) Stooq — file CSV giornalieri, usato come riserva quando Yahoo non risponde.
 * Nessun valore viene stimato: se entrambi falliscono resta l'ultimo dato valido, marcato come non aggiornato.
 */

export type Bars = {
  t: number[]; // timestamp in secondi
  close: number[];
  high: number[];
  low: number[];
  open: number[];
  volume: number[];
  dividends: { t: number; amount: number }[];
  currency: string | null;
  price: number | null;
  marketTime: number | null;
  source: string;
};

let host = 0;
function yHost() {
  host = (host + 1) % 2;
  return host ? 'https://query1.finance.yahoo.com' : 'https://query2.finance.yahoo.com';
}

export async function yahooBars(symbol: string, range: '1y' | '5y' | '1mo', interval: '1d' | '1wk'): Promise<Bars> {
  const url = `${yHost()}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=div%2Csplits&includePrePost=false`;
  const r = await fetchJson<any>(url, { sourceId: 'yahoo', headers: { 'User-Agent': BROWSER_UA }, timeoutMs: 15000, retries: 1 });
  const res = r?.chart?.result?.[0];
  if (!res) throw new Error(r?.chart?.error?.description || 'Yahoo: risposta vuota');
  const q = res.indicators?.quote?.[0] ?? {};
  const ts: number[] = res.timestamp ?? [];
  const out: Bars = { t: [], close: [], high: [], low: [], open: [], volume: [], dividends: [], currency: res.meta?.currency ?? null, price: res.meta?.regularMarketPrice ?? null, marketTime: res.meta?.regularMarketTime ?? null, source: 'Yahoo Finance' };
  ts.forEach((t, i) => {
    const c = q.close?.[i];
    if (c == null || !Number.isFinite(c)) return;
    out.t.push(t);
    out.close.push(c);
    out.high.push(q.high?.[i] ?? c);
    out.low.push(q.low?.[i] ?? c);
    out.open.push(q.open?.[i] ?? c);
    out.volume.push(q.volume?.[i] ?? 0);
  });
  for (const d of Object.values<any>(res.events?.dividends ?? {})) if (d?.amount) out.dividends.push({ t: d.date, amount: d.amount });
  out.dividends.sort((a, b) => a.t - b.t);
  if (out.close.length < 2) throw new Error('Yahoo: serie insufficiente');
  return out;
}

export async function stooqBars(inst: Instrument, weekly = false): Promise<Bars> {
  if (!inst.st) throw new Error('Stooq: simbolo non disponibile');
  const csv = await fetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(inst.st)}&i=${weekly ? 'w' : 'd'}`, { sourceId: 'stooq', timeoutMs: 15000, retries: 1 });
  const lines = csv.trim().split(/\r?\n/);
  if (!/^date,open,high,low,close/i.test(lines[0] ?? '')) throw new Error('Stooq: formato inatteso o limite giornaliero raggiunto');
  const rows = lines.slice(1).slice(weekly ? -265 : -265).map((l) => l.split(','));
  const out: Bars = { t: [], close: [], high: [], low: [], open: [], volume: [], dividends: [], currency: EXCHANGE_BY_ID[inst.ex]?.currency ?? null, price: null, marketTime: null, source: 'Stooq' };
  for (const [d, o, h, l, c, v] of rows) {
    const close = Number(c);
    if (!Number.isFinite(close)) continue;
    out.t.push(Date.parse(d + 'T21:00:00Z') / 1000);
    out.close.push(close);
    out.open.push(Number(o) || close);
    out.high.push(Number(h) || close);
    out.low.push(Number(l) || close);
    out.volume.push(Number(v) || 0);
  }
  if (out.close.length < 2) throw new Error('Stooq: serie insufficiente');
  out.price = out.close[out.close.length - 1];
  out.marketTime = out.t[out.t.length - 1];
  return out;
}

const pct = (a: number | null | undefined, b: number | null | undefined) => (a != null && b ? ((a - b) / b) * 100 : null);

/** Ultima chiusura con data ≤ t (secondi). */
function closeAt(b: Bars, t: number): number | null {
  let v: number | null = null;
  for (let i = 0; i < b.t.length; i++) {
    if (b.t[i] <= t) v = b.close[i];
    else break;
  }
  return v;
}

function downsample(a: number[], n: number) {
  if (a.length <= n) return a;
  const step = (a.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => a[Math.round(i * step)]);
}

/** Calcola la quotazione e le statistiche dalla serie giornaliera di un anno. */
export function toQuote(inst: Instrument, b: Bars): Quote {
  const n = b.close.length;
  const price = b.price ?? b.close[n - 1];
  const lastT = b.t[n - 1];
  const mt = b.marketTime ?? lastT;
  // l'ultima barra è la seduta in corso (o l'ultima conclusa) se la sua data coincide con quella dell'ultimo prezzo
  const lastIsCurrent = mt - lastT < 20 * 3600 && mt >= lastT - 3600;
  const curIdx = lastIsCurrent ? n - 1 : n; // indice della seduta corrente (n = non presente nella serie)
  const prevClose = curIdx - 1 >= 0 ? b.close[curIdx - 1] : null;
  const now = mt;
  const day = 86400;
  const jan1 = Date.UTC(new Date(mt * 1000).getUTCFullYear(), 0, 1) / 1000;
  const ytdBase = closeAt(b, jan1 - 1);
  const highs = [...b.high, price], lows = [...b.low, price];
  const vols = b.volume.slice(Math.max(0, curIdx - 20), curIdx).filter((v) => v > 0);
  const avgVol20 = vols.length >= 5 ? vols.reduce((s, v) => s + v, 0) / vols.length : null;
  const volume = lastIsCurrent ? b.volume[n - 1] || null : null;
  // volatilità: deviazione standard dei rendimenti logaritmici giornalieri (ultime 60 sedute), annualizzata
  const last = b.close.slice(-61);
  const rets = last.slice(1).map((c, i) => Math.log(c / last[i])).filter(Number.isFinite);
  const mean = rets.reduce((s, r) => s + r, 0) / (rets.length || 1);
  const sd = rets.length > 10 ? Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1)) : null;
  let peak = -Infinity, maxDD = 0;
  for (const c of [...b.close, price]) {
    peak = Math.max(peak, c);
    maxDD = Math.min(maxDD, (c - peak) / peak);
  }
  const divs = b.dividends.filter((d) => d.t >= now - 365 * day);
  const divTtm = divs.length ? divs.reduce((s, d) => s + d.amount, 0) : null;
  const ld = b.dividends[b.dividends.length - 1];
  const open = lastIsCurrent ? b.open[n - 1] : null;
  return {
    id: inst.id, symbol: inst.y, name: inst.name, kind: inst.kind, region: inst.region, country: inst.country, ex: inst.ex, sector: inst.sector ?? null,
    currency: b.currency, price, prevClose,
    ch1d: pct(price, prevClose),
    ch1w: pct(price, closeAt(b, now - 7 * day)),
    ch1m: pct(price, closeAt(b, now - 30 * day)),
    ch3m: pct(price, closeAt(b, now - 91 * day)),
    chYtd: pct(price, ytdBase),
    ch1y: b.t[0] <= now - 330 * day ? pct(price, b.close[0]) : null,
    high52: Math.max(...highs), low52: Math.min(...lows),
    volume, avgVol20, volRatio: volume && avgVol20 && inst.kind === 'stock' ? volume / avgVol20 : null,
    volatility: sd != null ? sd * Math.sqrt(252) * 100 : null,
    maxDD: maxDD * 100,
    divYield: divTtm && price && inst.kind !== 'index' ? (divTtm / price) * 100 : null,
    divTtm, lastDiv: ld ? { date: new Date(ld.t * 1000).toISOString(), amount: ld.amount } : null,
    gap: open != null && prevClose ? pct(open, prevClose) : null,
    marketTime: new Date(mt * 1000).toISOString(),
    spark: downsample([...b.close.slice(-60, lastIsCurrent ? undefined : n), ...(lastIsCurrent ? [] : [price])].slice(-60), 40),
    source: b.source,
  };
}
