'use client';
import { useState } from 'react';
import type { NewsItem } from '@/lib/news';
import { NewsCard } from './NewsCard';
import { STATUSES, STATUS_STYLE } from '@/lib/sections';

/** Feed con filtro per stato di verifica e "mostra altre", interamente lato browser. */
export default function NewsFeed({ items, perPage = 20, empty = 'Nessuna notizia per questi filtri.' }: { items: NewsItem[]; perPage?: number; empty?: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [n, setN] = useState(perPage);
  const list = status ? items.filter((i) => i.status === status) : items;
  return (
    <div>
      <div className="scroll-x flex gap-1 border-b border-line px-4 py-2 text-[11px]">
        <button onClick={() => { setStatus(null); setN(perPage); }} className={`chip ${!status ? 'border-accent/50 text-accent' : 'border-line text-mute'}`}>Tutte ({items.length})</button>
        {STATUSES.map((s) => {
          const c = items.filter((i) => i.status === s).length;
          return <button key={s} disabled={!c} onClick={() => { setStatus(s); setN(perPage); }} className={`chip shrink-0 disabled:opacity-40 ${status === s ? STATUS_STYLE[s].cls : 'border-line text-mute'}`}>{STATUS_STYLE[s].label} ({c})</button>;
        })}
      </div>
      {list.length ? list.slice(0, n).map((it) => <NewsCard key={it.id} n={it} />) : <div className="px-4 py-6 text-center text-sm text-mute">{empty}</div>}
      {list.length > n && <button onClick={() => setN(n + perPage)} className="block w-full border-t border-line px-4 py-2 text-sm text-accent hover:bg-panel2">Mostra altre ({list.length - n}) ↓</button>}
    </div>
  );
}
