import 'server-only';
import { setCache, setCacheError, getCache } from '../db';
import { fetchJson, BROWSER_UA } from '../http';
import { INSTRUMENTS, INSTRUMENT_BY_ID, type Instrument } from './catalog';
import { yahooBars, stooqBars, toQuote, type Bars } from './providers';
import type { Quote, Series } from './types';
import { markSuccess, markFailure, getSource } from '../sources/registry';

function mark(id: string, ok: boolean, err?: string) {
  if (!getSource(id)) return;
  if (ok) markSuccess(id, 0);
  else markFailure(id, err ?? 'errore');
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) await fn(q.shift()!); }));
}

const toPoints = (b: Bars): [number, number][] => b.t.map((t, i) => [t * 1000, b.close[i]]);

/**
 * Quotazioni di tutti gli strumenti del catalogo (serie giornaliera di un anno per ciascuno).
 * Yahoo Finance è la fonte principale, Stooq la riserva. Se entrambe falliscono per uno strumento
 * resta l'ultimo dato valido, marcato come non aggiornato.
 */
export async function refreshQuotes(): Promise<number> {
  const prev = new Map((getCache<Quote[]>('market:quotes').value ?? []).map((q) => [q.id, q]));
  const out = new Map<string, Quote>();
  const errors: string[] = [];
  let yOk = 0, sOk = 0, yErr = '', sErr = '';
  await pool(INSTRUMENTS, 4, async (inst) => {
    let bars: Bars | null = null;
    try {
      bars = await yahooBars(inst.y, '1y', '1d');
      yOk++;
    } catch (e) {
      yErr = (e as Error).message;
      if (inst.st) {
        try {
          bars = await stooqBars(inst);
          sOk++;
        } catch (e2) {
          sErr = (e2 as Error).message;
        }
      }
    }
    if (bars) {
      try {
        out.set(inst.id, toQuote(inst, bars));
        setCache(`series:${inst.id}:1y`, { points: toPoints(bars) } satisfies Omit<Series, 'source' | 'fetchedAt'>, bars.source);
        return;
      } catch (e) {
        errors.push(`${inst.y}: ${(e as Error).message}`);
      }
    } else errors.push(`${inst.y}: ${yErr}${sErr ? ' / ' + sErr : ''}`);
    const p = prev.get(inst.id);
    if (p) out.set(inst.id, { ...p, stale: true });
  });
  mark('yahoo', yOk > 0, yErr || 'nessuna risposta');
  if (sOk > 0) mark('stooq', true);
  else if (sErr) mark('stooq', false, sErr);
  const fresh = yOk + sOk;
  if (!fresh) {
    setCacheError('market:quotes', `Nessuna quotazione ricevuta. ${errors.slice(0, 3).join(' | ')}`);
    throw new Error(`Nessuna quotazione ricevuta (${errors.length} errori): ${errors.slice(0, 3).join(' | ')}`);
  }
  const list = INSTRUMENTS.map((i) => out.get(i.id)).filter((q): q is Quote => !!q);
  const source = [yOk ? `Yahoo Finance (${yOk})` : '', sOk ? `Stooq (${sOk})` : ''].filter(Boolean).join(' · ');
  setCache('market:quotes', list, source);
  if (errors.length) setCache('market:quote_errors', { at: new Date().toISOString(), errors: errors.slice(0, 60) }, 'sistema');
  else setCache('market:quote_errors', { at: new Date().toISOString(), errors: [] }, 'sistema');
  return fresh;
}

/** Serie settimanale di 5 anni, aggiornata a rotazione (ogni strumento al massimo una volta al giorno). */
export async function refreshHistory(maxPerRun = 60): Promise<number> {
  const due = INSTRUMENTS.filter((i) => {
    const c = getCache<unknown>(`series:${i.id}:5y`);
    return !c.fetchedAt || Date.now() - Date.parse(c.fetchedAt) > 22 * 3600e3;
  }).slice(0, maxPerRun);
  let ok = 0;
  await pool(due, 3, async (inst: Instrument) => {
    try {
      let b: Bars;
      try {
        b = await yahooBars(inst.y, '5y', '1wk');
      } catch (e) {
        if (!inst.st) throw e;
        b = await stooqBars(inst, true);
      }
      setCache(`series:${inst.id}:5y`, { points: toPoints(b) }, b.source);
      ok++;
    } catch (e) {
      setCacheError(`series:${inst.id}:5y`, (e as Error).message);
    }
  });
  if (due.length && !ok) throw new Error('Storico 5 anni: nessuna serie ricevuta');
  return ok;
}

/* ---------------- Calendari (Nasdaq, solo mercato USA) ---------------- */
const NQ = { 'User-Agent': BROWSER_UA, Accept: 'application/json, text/plain, */*', 'Accept-Language': 'en-US,en;q=0.9', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' };
const money = (s: unknown) => { const n = Number(String(s ?? '').replace(/[$,\s]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export type EarningsRow = { date: string; symbol: string; name: string; when: string; marketCap: number | null; epsForecast: string | null; lastYearEps: string | null; quarter: string | null; inCatalog: string | null };
export type IpoRow = { symbol: string; name: string; exchange: string | null; price: string | null; shares: string | null; value: number | null; date: string | null; status: 'prevista' | 'quotata' };

export async function refreshEarnings(): Promise<number> {
  const bySymbol = new Map(INSTRUMENTS.filter((i) => i.region === 'usa' && i.kind === 'stock').map((i) => [i.y.replace('-', '.'), i.id]));
  const rows: EarningsRow[] = [];
  const d = new Date();
  let days = 0, errs = 0, lastErr = '';
  while (days < 8) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      try {
        const r = await fetchJson<any>(`https://api.nasdaq.com/api/calendar/earnings?date=${ymd(d)}`, { sourceId: 'nasdaq', headers: NQ, retries: 1 });
        for (const x of r?.data?.rows ?? []) {
          const sym = String(x.symbol ?? '').trim();
          if (!sym) continue;
          rows.push({
            date: ymd(d), symbol: sym, name: String(x.name ?? sym), when: x.time === 'time-pre-market' ? 'prima dell\'apertura' : x.time === 'time-after-hours' ? 'dopo la chiusura' : 'orario n.d.',
            marketCap: money(x.marketCap), epsForecast: x.epsForecast || null, lastYearEps: x.lastYearEPS || null, quarter: x.fiscalQuarterEnding || null, inCatalog: bySymbol.get(sym) ?? null,
          });
        }
      } catch (e) {
        errs++;
        lastErr = (e as Error).message;
      }
      days++;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (errs === days) {
    mark('nasdaq', false, lastErr);
    setCacheError('cal:earnings', lastErr);
    throw new Error('Calendario trimestrali: ' + lastErr);
  }
  mark('nasdaq', true);
  // solo le società più grandi (o presenti nel catalogo): il calendario completo conta centinaia di nomi al giorno
  const keep = rows.filter((r) => r.inCatalog || (r.marketCap ?? 0) >= 10e9).sort((a, b) => a.date.localeCompare(b.date) || (b.marketCap ?? 0) - (a.marketCap ?? 0));
  setCache('cal:earnings', { rows: keep.slice(0, 200), total: rows.length }, 'Nasdaq');
  return keep.length;
}

export async function refreshIpo(): Promise<number> {
  const now = new Date();
  const months = [ymd(now).slice(0, 7), ymd(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))).slice(0, 7)];
  const out: IpoRow[] = [];
  let lastErr = '';
  let ok = 0;
  for (const m of months) {
    try {
      const r = await fetchJson<any>(`https://api.nasdaq.com/api/ipo/calendar?date=${m}`, { sourceId: 'nasdaq', headers: NQ, retries: 1 });
      ok++;
      for (const x of r?.data?.upcoming?.upcomingTable?.rows ?? []) out.push({ symbol: x.proposedTickerSymbol, name: x.companyName, exchange: x.proposedExchange ?? null, price: x.proposedSharePrice ?? null, shares: x.sharesOffered ?? null, value: money(x.dollarValueOfSharesOffered), date: x.expectedPriceDate ?? null, status: 'prevista' });
      for (const x of r?.data?.priced?.rows ?? []) out.push({ symbol: x.proposedTickerSymbol, name: x.companyName, exchange: x.proposedExchange ?? null, price: x.proposedSharePrice ?? null, shares: x.sharesOffered ?? null, value: money(x.dollarValueOfSharesOffered), date: x.pricedDate ?? null, status: 'quotata' });
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  if (!ok) {
    setCacheError('cal:ipo', lastErr);
    throw new Error('Calendario IPO: ' + lastErr);
  }
  const seen = new Set<string>();
  const uniq = out.filter((x) => x.symbol && !seen.has(x.symbol + x.status) && seen.add(x.symbol + x.status));
  setCache('cal:ipo', uniq, 'Nasdaq');
  return uniq.length;
}

export function seriesFor(id: string, range: '1y' | '5y') {
  if (!INSTRUMENT_BY_ID[id]) return null;
  const c = getCache<{ points: [number, number][] }>(`series:${id}:${range}`);
  return { points: c.value?.points ?? [], source: c.source, fetchedAt: c.fetchedAt, error: c.error };
}
