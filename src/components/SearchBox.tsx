'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATIC } from '@/lib/mode';
import { loadIndex, searchIdx } from '@/lib/staticSearch';
import { searchInstruments, type InstrumentHit } from '@/lib/market/search';

type R = { news: { id: number; title: string; titleIt: string | null; sourceName: string }[]; instruments: InstrumentHit[]; sources: { id: string; name: string; category: string }[] };

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [r, setR] = useState<R | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setR(null); return; }
    // i titoli si cercano subito nel catalogo locale, le notizie dopo (API o indice statico)
    setR((old) => ({ news: old?.news ?? [], sources: old?.sources ?? [], instruments: searchInstruments(q, 8) }));
    setOpen(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        if (STATIC) {
          const x = searchIdx(await loadIndex(), q.trim());
          setR({ ...x, news: x.news.slice(0, 8).map((n) => ({ id: n.id, title: n.t, titleIt: n.ti, sourceName: n.s })) });
          setOpen(true);
          return;
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        if (res.ok) { setR(await res.json()); setOpen(true); }
      } catch { /* annullata */ }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const go = (href: string) => { setOpen(false); setQ(''); router.push(href); };
  const has = r && (r.news.length || r.instruments.length || r.sources.length);
  return (
    <div ref={box} className="relative w-full">
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/cerca?q=${encodeURIComponent(q.trim())}`); }} role="search">
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => r && setOpen(true)} placeholder="Cerca titoli, indici, notizie, fonti… (es. Eni, AAPL, DAX)" className="input h-9 pl-9" aria-label="Ricerca globale" maxLength={120} />
        <span className="pointer-events-none absolute left-2.5 top-2 text-mute" aria-hidden>⌕</span>
      </form>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-panel p-1 text-sm shadow-2xl">
          {!has && <div className="p-3 text-mute">Nessun risultato rapido. Premi Invio per la ricerca completa.</div>}
          {!!r?.instruments.length && <Group title="Titoli e indici">{r.instruments.map((c) => <Item key={c.id} onClick={() => go(`/titolo/${c.id}`)}>{c.name} <span className="text-mute">{c.symbol} · {c.kind} · {c.country}</span></Item>)}</Group>}
          {!!r?.news.length && <Group title="Notizie">{r.news.slice(0, 6).map((n) => <Item key={n.id} onClick={() => go(`/notizia/${n.id}`)}>{n.titleIt || n.title} <span className="text-mute">· {n.sourceName}</span></Item>)}</Group>}
          {!!r?.sources.length && <Group title="Fonti ed esperti">{r.sources.map((s) => <Item key={s.id} onClick={() => go(`/cerca?source=${s.id}`)}>{s.name} <span className="text-mute">{s.category}</span></Item>)}</Group>}
          <Link href={`/cerca?q=${encodeURIComponent(q.trim())}`} onClick={() => setOpen(false)} className="block border-t border-line px-3 py-2 text-accent">Ricerca completa con filtri →</Link>
        </div>
      )}
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="py-1"><div className="px-3 py-1 text-[10px] uppercase tracking-wider text-mute">{title}</div>{children}</div>;
}
function Item({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="block w-full truncate rounded px-3 py-1.5 text-left hover:bg-panel2">{children}</button>;
}
