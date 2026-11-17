'use client';
import { useEffect, useState } from 'react';
import { getWatchlist, addWatch, removeWatch, type WItem } from '@/lib/local';

let cache: Promise<WItem[]> | null = null;
const load = () => (cache ??= getWatchlist());

export default function WatchButton({ type, id, label, small = false }: { type: WItem['type']; id: string; label: string; small?: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const sync = () => load().then((l) => setOn(l.some((x) => x.type === type && x.id === id)));
    sync();
    const h = () => { cache = null; sync(); };
    window.addEventListener('sr-watchlist', h);
    return () => window.removeEventListener('sr-watchlist', h);
  }, [type, id]);
  const toggle = async () => {
    setBusy(true);
    if (on) await removeWatch({ type, id });
    else await addWatch({ type, id, label });
    setBusy(false);
  };
  return (
    <button onClick={toggle} disabled={busy} className={small ? `text-base leading-none ${on ? 'text-warn' : 'text-mute hover:text-warn'}` : `btn ${on ? 'border-warn/50 text-warn' : ''}`} aria-pressed={on} title={on ? 'Rimuovi dalla watchlist' : 'Aggiungi alla watchlist'}>
      {on ? '★' : '☆'}{!small && (on ? ` ${label} in watchlist` : ` Segui ${label}`)}
    </button>
  );
}
