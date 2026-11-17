'use client';
import { useState } from 'react';
import { STATIC } from '@/lib/mode';

type A = Record<string, any>;
const LIST_SECTIONS: [string, string, string][] = [
  ['fatti', 'Fatti riportati dalle fonti', 'border-up/40'],
  ['dichiarazioni', 'Dichiarazioni (attribuite)', 'border-info/40'],
  ['indiscrezioni', 'Indiscrezioni non confermate', 'border-warn/40'],
  ['soggetti_coinvolti', 'Soggetti coinvolti', 'border-line'],
  ['titoli_interessati', 'Titoli, indici e settori potenzialmente interessati', 'border-line'],
  ['possibili_conseguenze', 'Possibili conseguenze (non certezze)', 'border-line'],
  ['elementi_incerti', 'Elementi ancora incerti', 'border-warn/40'],
  ['contraddizioni_tra_fonti', 'Contraddizioni tra le fonti', 'border-down/40'],
  ['segnali_di_manipolazione', 'Possibili segnali di manipolazione', 'border-down/40'],
];

export default function AiPanel({ clusterId, initial, available, disclaimer }: { clusterId: number; initial: A | null; available: boolean; disclaimer: string }) {
  const [a, setA] = useState<A | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clusterId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'errore');
      setA(j.data);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  if (!a) {
    return (
      <div className="p-4 text-sm">
        {STATIC ? (
          <p className="text-mute">Nella versione statica (GitHub Pages) le analisi AI vengono generate automaticamente solo per gli eventi più importanti a ogni aggiornamento. Per questo evento non è ancora disponibile; l&apos;analisi su richiesta richiede l&apos;app completa con server.</p>
        ) : available ? (
          <>
            <p className="mb-3 text-mute">Genera la scheda di approfondimento: riassunto, cosa è successo, perché è importante, soggetti, titoli e indici coinvolti, conseguenze possibili, elementi incerti, con separazione tra fatti, dichiarazioni, indiscrezioni e interpretazione.</p>
            <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? 'Analisi in corso…' : '✦ Genera analisi AI'}</button>
          </>
        ) : (
          <p className="text-mute">⛔ Analisi AI non disponibile: nessun modello AI configurato sul server. L&apos;amministratore può attivarla inserendo una chiave API (es. ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY) — vedi README.</p>
        )}
        {err && <p className="mt-2 text-xs text-down">{err}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Riassunto</h3>
        <p>{a.riassunto}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Cosa è successo</h3><p>{a.cosa_e_successo}</p></div>
        <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Perché è importante</h3><p>{a.perche_importante}</p></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {LIST_SECTIONS.map(([k, label, border]) => (Array.isArray(a[k]) && a[k].length ? (
          <div key={k} className={`rounded-lg border ${border} p-3`}>
            <h3 className="mb-1 text-xs font-semibold">{label}</h3>
            <ul className="list-disc space-y-0.5 pl-4 text-mute">{a[k].map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
          </div>
        ) : null))}
      </div>
      {a.interpretazione_ai && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
          <h3 className="mb-1 text-xs font-semibold text-accent">Interpretazione AI (non è un fatto)</h3>
          <p className="text-mute">{a.interpretazione_ai}</p>
        </div>
      )}
      {Array.isArray(a.termini_tecnici) && a.termini_tecnici.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Termini tecnici</h3>
          <dl className="grid gap-2 sm:grid-cols-2">{a.termini_tecnici.map((t: A, i: number) => <div key={i} className="rounded border border-line p-2"><dt className="font-semibold">{t.termine}</dt><dd className="text-xs text-mute">{t.spiegazione}</dd></div>)}</dl>
        </div>
      )}
      <p className="text-[11px] text-mute">Generata da {a._provider}/{a._model} il {a._at ? new Date(a._at).toLocaleString('it-IT') : 'n.d.'} su {a._sources} articolo/i (solo titoli ed estratti).</p>
      <p className="rounded border border-warn/30 bg-warn/5 p-2 text-[11px] text-warn">⚠ {disclaimer}</p>
    </div>
  );
}
