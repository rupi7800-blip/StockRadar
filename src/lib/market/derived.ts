import 'server-only';
import { getCache } from '../db';
import { SECTORS, INSTRUMENT_BY_ID, type Region } from './catalog';
import type { Tile } from '@/components/IndexBoard';
import type { Quote } from './types';

export function quotesCache() {
  return getCache<Quote[]>('market:quotes');
}
export function allQuotes(): Quote[] {
  return quotesCache().value ?? [];
}
export function quoteMap() {
  return new Map(allQuotes().map((q) => [q.id, q]));
}

export function vixLabel(v: number | null | undefined) {
  if (v == null) return { label: 'n.d.', color: '#8a93a0' };
  if (v < 15) return { label: 'Calma', color: '#22c55e' };
  if (v < 20) return { label: 'Normale', color: '#84cc16' };
  if (v < 30) return { label: 'Tensione', color: '#f97316' };
  return { label: 'Paura', color: '#ef4444' };
}

export type Anomaly = { q: Quote; reasons: string[]; score: number };

const f1 = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`;

/** Movimenti fuori dall'ordinario, con soglie esplicite (riportate nell'interfaccia). */
export function anomalies(region?: Region): Anomaly[] {
  const out: Anomaly[] = [];
  for (const q of allQuotes()) {
    if (q.stale || (region && q.region !== region)) continue;
    const r: string[] = [];
    let score = 0;
    const thr = q.kind === 'stock' ? 5 : q.id === 'vix' ? 15 : q.kind === 'macro' ? 3 : 2.5;
    if (q.ch1d != null && Math.abs(q.ch1d) >= thr) { r.push(`${f1(q.ch1d)} nella seduta`); score += Math.abs(q.ch1d) / thr; }
    if (q.kind === 'stock' && q.gap != null && Math.abs(q.gap) >= 3) { r.push(`apertura in ${q.gap > 0 ? 'rialzo' : 'ribasso'} (gap ${f1(q.gap)})`); score += 0.5; }
    if (q.volRatio != null && q.volRatio >= 2.5) { r.push(`volumi ${q.volRatio.toFixed(1).replace('.', ',')}× la media di 20 sedute`); score += q.volRatio / 3; }
    if (q.kind !== 'macro' && q.price != null && q.high52 != null && q.price >= q.high52 * 0.999) { r.push('nuovo massimo a 52 settimane'); score += 0.6; }
    if (q.kind !== 'macro' && q.price != null && q.low52 != null && q.price <= q.low52 * 1.001) { r.push('nuovo minimo a 52 settimane'); score += 0.8; }
    if (q.id === 'vix' && q.price != null && q.price >= 30) { r.push(`VIX a ${q.price.toFixed(1)}: fase di forte paura sui mercati`); score += 2; }
    if (r.length) out.push({ q, reasons: r, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 25);
}

export function rankings(list: Quote[], n = 10) {
  const stocks = list.filter((q) => q.kind === 'stock' && !q.stale);
  const by = (f: (q: Quote) => number | null, dir: 1 | -1) => stocks.filter((q) => f(q) != null).sort((a, b) => dir * ((f(b) as number) - (f(a) as number))).slice(0, n);
  return {
    gainers: by((q) => q.ch1d, 1).filter((q) => (q.ch1d ?? 0) > 0),
    losers: by((q) => q.ch1d, -1).filter((q) => (q.ch1d ?? 0) < 0),
    volume: by((q) => q.volRatio, 1),
    ytdBest: by((q) => q.chYtd, 1),
    ytdWorst: by((q) => q.chYtd, -1),
    dividends: by((q) => q.divYield, 1).filter((q) => (q.divYield ?? 0) > 0),
  };
}

/** Ampiezza di mercato: titoli in rialzo/ribasso nella seduta. */
export function breadth(list: Quote[]) {
  const s = list.filter((q) => q.kind === 'stock' && q.ch1d != null && !q.stale);
  return { up: s.filter((q) => (q.ch1d as number) > 0).length, down: s.filter((q) => (q.ch1d as number) < 0).length, total: s.length };
}

export type SectorPerf = { id: string; label: string; color: string; count: number; ch1d: number | null; ch1m: number | null; chYtd: number | null; etf: Quote | null; best: Quote | null; worst: Quote | null };

const avg = (a: (number | null)[]) => { const v = a.filter((x): x is number => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

/** Andamento per settore: media semplice dei titoli monitorati (tutte le borse) + ETF settoriale USA. */
export function sectorPerf(region?: Region): SectorPerf[] {
  const qs = allQuotes();
  return SECTORS.map((s) => {
    const m = qs.filter((q) => q.kind === 'stock' && q.sector === s.id && !q.stale && (!region || q.region === region));
    const sorted = [...m].filter((q) => q.ch1d != null).sort((a, b) => (b.ch1d as number) - (a.ch1d as number));
    return {
      id: s.id, label: s.label, color: s.color, count: m.length,
      ch1d: avg(m.map((q) => q.ch1d)), ch1m: avg(m.map((q) => q.ch1m)), chYtd: avg(m.map((q) => q.chYtd)),
      etf: qs.find((q) => q.id === s.etf) ?? null, best: sorted[0] ?? null, worst: sorted[sorted.length - 1] ?? null,
    };
  });
}

export function isMajor(id: string) {
  return !!INSTRUMENT_BY_ID[id]?.major;
}

/** Riquadri per la griglia degli indici (solo i campi necessari al browser). */
export function tiles(filter: (q: Quote) => boolean): Tile[] {
  return allQuotes().filter(filter).map((q) => ({
    id: q.id, name: q.name, short: INSTRUMENT_BY_ID[q.id]?.short ?? q.name, ex: q.ex, country: q.country, kind: q.kind, currency: q.currency,
    price: q.price, ch1d: q.ch1d, chYtd: q.chYtd, spark: q.spark.slice(-30), marketTime: q.marketTime, stale: q.stale,
  }));
}
