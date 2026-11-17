'use client';
import { STATIC } from './mode';
/** Archivio locale del browser (versione statica): watchlist, regole di avviso, notifiche. Ogni accesso è protetto. */
export function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage non disponibile */ }
}

export type WItem = { type: 'stock' | 'company' | 'expert' | 'topic'; id: string; label: string; added_at?: string };
const WL = 'sr_watchlist';


export async function getWatchlist(): Promise<WItem[]> {
  if (STATIC) return lsGet<WItem[]>(WL, []);
  try {
    return ((await (await fetch('/api/watchlist', { cache: 'no-store' })).json()).items ?? []) as WItem[];
  } catch {
    return [];
  }
}
export async function addWatch(it: WItem): Promise<string | null> {
  if (STATIC) {
    const l = lsGet<WItem[]>(WL, []).filter((x) => !(x.type === it.type && x.id === it.id));
    if (l.length >= 200) return 'Watchlist piena (max 200 elementi)';
    lsSet(WL, [{ ...it, added_at: new Date().toISOString() }, ...l]);
    window.dispatchEvent(new Event('sr-watchlist'));
    return null;
  }
  const r = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) });
  window.dispatchEvent(new Event('sr-watchlist'));
  return r.ok ? null : ((await r.json()).error as string);
}
export async function removeWatch(it: Pick<WItem, 'type' | 'id'>) {
  if (STATIC) {
    lsSet(WL, lsGet<WItem[]>(WL, []).filter((x) => !(x.type === it.type && x.id === it.id)));
  } else {
    await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(it) });
  }
  window.dispatchEvent(new Event('sr-watchlist'));
}
