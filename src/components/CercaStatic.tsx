'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadIndex, searchIdx, type Idx } from '@/lib/staticSearch';
import { SECTIONS, STATUSES, STATUS_STYLE } from '@/lib/sections';
import Ago from './Ago';

type F = { q: string; section: string; status: string; source: string; from: string; to: string };
const EMPTY: F = { q: '', section: '', status: '', source: '', from: '', to: '' };

/** Ricerca della versione statica: tutto nel browser, sull'indice pubblicato a ogni aggiornamento. */
export default function CercaStatic() {
  const [ix, setIx] = useState<Idx | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState<F>(EMPTY);
  const [applied, setApplied] = useState<F>(EMPTY);
  const [n, setN] = useState(30);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const init = { ...EMPTY, ...Object.fromEntries([...p.entries()].filter(([k]) => k in EMPTY)) } as F;
    setF(init);
    setApplied(init);
    loadIndex().then(setIx).catch((e) => setErr(e.message));
  }, []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(f);
    setN(30);
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
  };
  const any = Object.values(applied).some(Boolean);
  const r = ix && any ? searchIdx(ix, applied.q, applied) : null;
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <form className="card grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-6" onSubmit={submit}>
        <input value={f.q} onChange={set('q')} className="input lg:col-span-2" placeholder="Parole chiave (usa OR per alternative)" maxLength={120} />
        <select value={f.section} onChange={set('section')} className="input"><option value="">Tutte le categorie</option>{SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <select value={f.status} onChange={set('status')} className="input"><option value="">Qualsiasi verifica</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}</select>
        <select value={f.source} onChange={set('source')} className="input"><option value="">Tutte le fonti</option>{ix?.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <div className="flex gap-1"><input type="date" value={f.from} onChange={set('from')} className="input" aria-label="Dal" /><input type="date" value={f.to} onChange={set('to')} className="input" aria-label="Al" /></div>
        <button className="btn btn-primary lg:col-span-6">Cerca</button>
      </form>
      {err && <p className="text-sm text-warn">Indice di ricerca non disponibile: {err}</p>}
      {!ix && !err && <p className="text-sm text-mute">Caricamento indice…</p>}
      {ix && !any && <p className="text-sm text-mute">Inserisci una parola chiave o scegli un filtro. Indice: {ix.news.length} notizie degli ultimi giorni, aggiornato <Ago iso={ix.generatedAt} />.</p>}
      {r && (
        <>
          {r.instruments.length > 0 && (
            <section className="card"><div className="card-h">Titoli e indici</div><ul className="divide-y divide-line text-sm">{r.instruments.map((c) => <li key={c.id}><Link href={`/titolo/${c.id}`} className="block px-4 py-1.5 hover:bg-panel2">{c.name} <span className="text-xs text-mute">{c.symbol} · {c.kind} · {c.country}</span></Link></li>)}</ul></section>
          )}
          <section className="card">
            <div className="card-h">Notizie ({r.news.length})</div>
            {r.news.length === 0 && <p className="p-4 text-sm text-mute">Nessuna notizia trovata.</p>}
            <ul className="divide-y divide-line">{r.news.slice(0, n).map((x) => (
              <li key={x.id} className="px-4 py-2.5 text-sm">
                <div className="text-[11px] text-mute">{x.s} · <Ago iso={x.at} /> · <span className={`chip ${STATUS_STYLE[x.st]?.cls ?? ''}`}>{STATUS_STYLE[x.st]?.label ?? x.st}</span></div>
                <Link href={`/notizia/${x.id}`} className="font-medium hover:underline"><span className="t-it">{x.ti || x.t}</span><span className="t-orig">{x.t}</span></Link>
              </li>))}</ul>
            {r.news.length > n && <button onClick={() => setN(n + 30)} className="block w-full border-t border-line px-4 py-2 text-sm text-accent">Mostra altre ↓</button>}
          </section>
        </>
      )}
    </div>
  );
}
