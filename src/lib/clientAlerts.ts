'use client';
/** Motore di avvisi lato browser (versione statica): regole, eventi e notifiche restano sul dispositivo. */
import { lsGet, lsSet } from './local';
import { dataUrl, withBase } from './mode';
import { findQuote } from './market/find';
import { fmtPrice } from './text';

export type CRule = { id: number; type: string; target: string | null; threshold: number | null; cooldown_min: number; push: number; enabled: number; last_fired: string | null };
export type CEvent = { id: number; title: string; body: string | null; url: string | null; read: number; created_at: string; key: string };
type NewsLite = { id: number; t: string; ti: string | null; c: string[]; k: string[]; f: string[]; b: boolean; st: string; sid: string; scat: string; cl: number };
type QLite = { id: string; symbol: string; name: string; kind: string; currency: string | null; price: number | null; ch1d: number | null; volRatio: number | null; high52: number | null; low52: number | null; marketTime: string | null; stale?: boolean };

const RK = 'sr_rules', EK = 'sr_events';
export const getRules = () => lsGet<CRule[]>(RK, []);
export const setRules = (r: CRule[]) => lsSet(RK, r);
export const getEvents = () => lsGet<CEvent[]>(EK, []);
export const setEvents = (e: CEvent[]) => { lsSet(EK, e.slice(0, 100)); window.dispatchEvent(new Event('sr-events')); };



async function notify(title: string, body: string, url: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: withBase('/icons/icon-192.png'), data: { url: withBase(url) } });
    else new Notification(title, { body });
  } catch { /* */ }
}

export async function evaluateClient() {
  const rules = getRules().filter((r) => r.enabled);
  if (!rules.length) return 0;
  const [m, n] = await Promise.all([
    fetch(dataUrl('market.json'), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    fetch(dataUrl('news.json'), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
  ]);
  const quotes: QLite[] = (m?.quotes ?? []).filter((q: QLite) => !q.stale);
  const news: NewsLite[] = n?.items ?? [];
  const events = getEvents();
  const all = getRules();
  const today = new Date().toISOString().slice(0, 10);
  const wl = lsGet<{ type: string; id: string }[]>('sr_watchlist', []).filter((x) => x.type === 'stock').map((x) => x.id);
  let fired = 0;
  const emit = (r: CRule, key: string, title: string, body: string, url: string) => {
    const k = `${r.id}:${key}`;
    if (events.some((e) => e.key === k)) return false;
    events.unshift({ id: Date.now() + Math.random(), title, body, url, read: 0, created_at: new Date().toISOString(), key: k });
    const rr = all.find((x) => x.id === r.id);
    if (rr) rr.last_fired = new Date().toISOString();
    if (r.push) notify(title, body, url);
    fired++;
    return true;
  };
  for (const r of rules) {
    if (r.last_fired && Date.now() - Date.parse(r.last_fired) < r.cooldown_min * 60e3) continue;
    const t = (r.target ?? '').toLowerCase();
    const q = findQuote(quotes, t);
    const th = r.threshold ?? 0;
    const url = q ? `/titolo/${q.id}/` : '/mercati/';
    const sess = q?.marketTime?.slice(0, 10) ?? today;
    const p = (v: number | null) => fmtPrice(v, q?.currency, q?.kind);
    const ix = r.type === 'index_move' ? quotes.filter((x) => x.kind === 'index' && x.ch1d != null && Math.abs(x.ch1d) >= (th || 2)).sort((a, b) => Math.abs(b.ch1d!) - Math.abs(a.ch1d!))[0] : undefined;
    const vix = r.type === 'vix_above' ? quotes.find((x) => x.id === 'vix') : undefined;
    if (r.type === 'price_above') { if (q?.price != null && q.price >= th) emit(r, `above:${sess}`, `${q.name} sopra ${p(th)}`, `Ultimo prezzo ${p(q.price)} (dato ritardato)`, url); }
    else if (r.type === 'price_below') { if (q?.price != null && q.price <= th) emit(r, `below:${sess}`, `${q.name} sotto ${p(th)}`, `Ultimo prezzo ${p(q.price)} (dato ritardato)`, url); }
    else if (r.type === 'change_day') { if (q?.ch1d != null && Math.abs(q.ch1d) >= th) emit(r, `ch:${sess}`, `${q.name} ${q.ch1d.toFixed(2)}% nella seduta`, `Soglia ±${th}% superata`, url); }
    else if (r.type === 'volume_spike') { if (q?.volRatio != null && q.volRatio >= (th || 2)) emit(r, `vol:${sess}`, `Volumi anomali su ${q.name}`, `${q.volRatio.toFixed(1)}× la media di 20 sedute`, url); }
    else if (r.type === 'high_low') {
      if (q?.price != null && q.high52 != null && q.price >= q.high52 * 0.999) emit(r, `hi:${sess}`, `${q.name}: nuovo massimo a 52 settimane`, `Prezzo ${p(q.price)}`, url);
      else if (q?.price != null && q.low52 != null && q.price <= q.low52 * 1.001) emit(r, `lo:${sess}`, `${q.name}: nuovo minimo a 52 settimane`, `Prezzo ${p(q.price)}`, url);
    }
    else if (r.type === 'index_move') { if (ix) emit(r, `ix:${ix.id}:${ix.marketTime?.slice(0, 10)}`, `${ix.name} ${ix.ch1d!.toFixed(2)}%`, `Movimento oltre ±${th || 2}% nella seduta`, `/titolo/${ix.id}/`); }
    else if (r.type === 'vix_above') { if (vix?.price != null && vix.price >= (th || 25)) emit(r, `vix:${vix.marketTime?.slice(0, 10)}`, `VIX a ${vix.price.toFixed(1)}`, `Sopra la soglia di ${th || 25}`, '/titolo/vix/'); }
    else {
      for (const a of news) {
        const title = a.ti || a.t;
        let ok = false;
        if (r.type === 'breaking') ok = a.b && a.st !== 'SMENTITA';
        else if (r.type === 'risk') ok = a.f.includes('urgent') && (a.st === 'CONFERMATA' || a.st === 'CONFERMATA PARZIALMENTE' || a.scat === 'regulator');
        else if (r.type === 'operations') ok = a.k.includes('operazioni') && !a.f.includes('rumor');
        else if (r.type === 'italy') ok = a.k.includes('italia') && (a.b || a.st === 'CONFERMATA');
        else if (r.type === 'stock_news') ok = !!q && a.c.includes(q.id);
        else if (r.type === 'keyword') ok = !!t && (title.toLowerCase().includes(t) || a.t.toLowerCase().includes(t));
        else if (r.type === 'expert') ok = a.sid === t;
        else if (r.type === 'macro') ok = a.scat === 'regulator' || a.scat === 'macro';
        else if (r.type === 'watchlist_news') ok = a.c.some((x) => wl.includes(x));
        else if (r.type === 'watchlist_results') ok = a.k.includes('risultati') && a.c.some((x) => wl.includes(x));
        if (ok && emit(r, `c${a.cl}`, r.type === 'breaking' ? 'Notizia urgente' : 'Stock Radar', title, `/notizia/${a.id}/`)) break;
      }
    }
  }
  setRules(all);
  setEvents(events);
  return fired;
}
