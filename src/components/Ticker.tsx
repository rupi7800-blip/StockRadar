'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STATIC, dataUrl } from '@/lib/mode';

type T = { id: number; title: string; original: string; translated: boolean; source: string; at: string; cat: string | null; breaking: boolean; urgent: boolean; status: string; url: string; sources: number };
const CAT: Record<string, string> = { italia: 'ITALIA', usa: 'USA', europa: 'EUROPA', asia: 'ASIA', risultati: 'CONTI', operazioni: 'M&A/IPO', macro: 'MACRO', regole: 'REGOLE', esperti: 'ANALISI', rischi: 'RISCHI' };

export default function Ticker() {
  const [items, setItems] = useState<T[]>([]);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const [updated, setUpdated] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const hover = useRef(false);

  useEffect(() => {
    try { setPaused(localStorage.getItem('sr_ticker_paused') === '1'); } catch { /* storage non disponibile */ }
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(STATIC ? dataUrl('ticker.json') : '/api/ticker', { cache: 'no-store' });
        const j = await r.json();
        if (alive) { setItems(j.items ?? []); setUpdated(j.generatedAt); setErr(false); }
      } catch { if (alive) setErr(true); }
    };
    load();
    const t = setInterval(load, 60_000); // aggiornamento senza ricaricare la pagina
    return () => { alive = false; clearInterval(t); };
  }, []);

  const toggle = () => {
    setPaused((p) => { try { localStorage.setItem('sr_ticker_paused', p ? '0' : '1'); } catch { /* */ } return !p; });
  };
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const breaking = items.filter((i) => i.breaking);
  const list = [...breaking, ...items.filter((i) => !i.breaking)];
  const dur = Math.max(40, list.length * 9);

  return (
    <div className="relative border-b border-line bg-[#0e1114]" data-notranslate-dyn>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 sm:px-4">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${breaking.length ? 'bg-down text-white' : 'bg-accent/20 text-accent'}`}>{breaking.length ? 'BREAKING' : 'LIVE NEWS'}</span>
        <div className={`relative min-w-0 flex-1 overflow-hidden py-2 ${paused ? 'ticker-paused' : ''}`}
          onMouseEnter={() => { hover.current = true; }} onMouseLeave={() => { hover.current = false; }}>
          {list.length === 0 ? (
            <span className="text-xs text-mute">{err ? 'Banner non disponibile: errore di rete.' : 'Raccolta notizie in corso…'}</span>
          ) : (
            <div className="ticker-track flex w-max gap-8 whitespace-nowrap hover:[animation-play-state:paused]" style={{ ['--dur' as string]: `${dur}s` }}>
              {[0, 1].map((k) => (
                <div key={k} className="flex gap-8" aria-hidden={k === 1}>
                  {list.map((i) => (
                    <Link key={`${k}-${i.id}`} href={`/notizia/${i.id}`} className="flex items-center gap-1.5 text-xs hover:text-white" tabIndex={k ? -1 : 0}>
                      <span className="tabular-nums text-mute">{fmt(i.at)}</span>
                      {i.cat && <span className={`rounded px-1 text-[9px] font-bold ${i.urgent ? 'bg-down/25 text-down' : 'bg-panel2 text-mute'}`}>{CAT[i.cat] ?? i.cat.toUpperCase()}</span>}
                      <span className={i.breaking ? 'font-semibold text-down' : i.urgent ? 'text-warn' : ''}><span className="t-it">{i.title}</span><span className="t-orig">{i.original}</span></span>
                      <span className="text-mute">· {i.source}{i.sources > 1 ? ` +${i.sources - 1}` : ''}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={toggle} className="shrink-0 rounded px-1.5 text-sm text-mute hover:text-ink" aria-label={paused ? 'Riprendi scorrimento' : 'Ferma scorrimento'} title={paused ? 'Riprendi' : 'Pausa'}>{paused ? '▶' : '❚❚'}</button>
        <button onClick={() => setOpen((o) => !o)} className="shrink-0 rounded px-1.5 text-sm text-mute hover:text-ink" aria-expanded={open} aria-label="Elenco notizie del banner" title="Seleziona notizia">☰</button>
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-panel shadow-2xl">
          <div className="mx-auto max-h-[60vh] max-w-7xl overflow-y-auto px-2 py-2 sm:px-4">
            <div className="mb-1 flex justify-between px-2 text-[11px] text-mute"><span>Notizie del banner (selezionate per importanza, attendibilità e attualità)</span><span>{updated && `aggiornato ${fmt(updated)}`}</span></div>
            {list.map((i) => (
              <Link key={i.id} href={`/notizia/${i.id}`} onClick={() => setOpen(false)} className="flex gap-2 rounded px-2 py-1.5 text-sm hover:bg-panel2">
                <span className="w-11 shrink-0 tabular-nums text-xs text-mute">{fmt(i.at)}</span>
                <span className={`flex-1 ${i.breaking ? 'font-semibold text-down' : ''}`}><span className="t-it">{i.title}</span><span className="t-orig">{i.original}</span><span className="ml-1 text-xs text-mute">· {i.source}</span></span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
