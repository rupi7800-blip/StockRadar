'use client';
import { INSTRUMENT_BY_ID } from '@/lib/market/catalog';
import { SECTION_LABEL } from '@/lib/sections';
import { useState } from 'react';
import Link from 'next/link';
import { STATIC } from '@/lib/mode';
import Ago from './Ago';

type It = { id: number; title: string; original: string; source: string; author: string | null; at: string; ago: string; url: string; coins: string[]; cats: string[]; prediction: boolean };
export default function ComparePanel({ items, aiEnabled }: { items: It[]; aiEnabled: boolean }) {
  const [sel, setSel] = useState<number[]>([]);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? s : [...s, id]));
  const compare = async () => {
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch('/api/ai/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: sel }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const chosen = items.filter((i) => sel.includes(i.id));
  return (
    <div>
      {sel.length >= 2 && (
        <div className="sticky top-[150px] z-10 border-b border-line bg-panel2 p-3 text-sm">
          <div className="mb-2 font-semibold">Confronto di {sel.length} contributi</div>
          <div className="grid gap-2 md:grid-cols-2">{chosen.map((c) => <div key={c.id} className="rounded border border-line p-2 text-xs"><b>{c.author ?? c.source}</b> ({c.source}, <Ago iso={c.at} />){c.prediction && <span className="ml-1 text-warn">[previsione]</span>}<div className="text-mute">{c.title}</div></div>)}</div>
          <div className="mt-2 flex gap-2">
            {aiEnabled && !STATIC ? <button className="btn btn-primary" onClick={compare} disabled={busy}>{busy ? 'Confronto…' : '✦ Confronta le posizioni con l\'AI'}</button> : <span className="text-xs text-mute">Confronto automatico AI non disponibile {STATIC ? '(versione statica: richiede l\'app con server)' : '(nessun modello configurato)'}: il confronto affiancato resta disponibile.</span>}
            <button className="btn" onClick={() => { setSel([]); setRes(null); }}>Azzera</button>
          </div>
          {err && <p className="mt-2 text-xs text-down">{err}</p>}
          {res?.data && (
            <div className="mt-3 space-y-2 text-xs">
              <p>{res.data.sintesi}</p>
              {res.data.punti_di_accordo.length > 0 && <div><b className="text-up">Accordo:</b><ul className="list-disc pl-4">{res.data.punti_di_accordo.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
              {res.data.punti_di_disaccordo.length > 0 && <div><b className="text-down">Disaccordo:</b><ul className="list-disc pl-4">{res.data.punti_di_disaccordo.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>}
              <ul className="space-y-1">{res.data.posizioni.map((p: any, i: number) => <li key={i}><b>{p.autore}</b> <span className={`chip ${p.tipo === 'fatto' ? 'border-up/40 text-up' : p.tipo === 'previsione' ? 'border-warn/40 text-warn' : 'border-line text-mute'}`}>{p.tipo}</span> {p.posizione}</li>)}</ul>
              <p className="text-[10px] text-warn">⚠ {res.disclaimer}</p>
            </div>
          )}
        </div>
      )}
      <ul className="divide-y divide-line">{items.map((n) => (
        <li key={n.id} className="flex gap-3 px-4 py-2.5 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-teal-500" checked={sel.includes(n.id)} onChange={() => toggle(n.id)} aria-label="Seleziona per confronto" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-mute"><b className="text-ink">{n.author ?? n.source}</b> · {n.source} · <Ago iso={n.at} />{n.prediction && <span className="ml-1 chip border-warn/40 text-warn">previsione/opinione</span>}</div>
            <Link href={`/notizia/${n.id}`} className="font-medium hover:underline"><span className="t-it">{n.title}</span><span className="t-orig">{n.original}</span></Link>
            <div className="text-[11px] text-mute">{[...n.cats.filter((c) => c !== 'esperti').map((c) => SECTION_LABEL[c] ?? c), ...n.coins.map((c) => INSTRUMENT_BY_ID[c]?.name ?? c)].slice(0, 5).join(' · ')} <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 text-accent">originale ↗</a></div>
          </div>
        </li>
      ))}</ul>
    </div>
  );
}
