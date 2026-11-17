'use client';
import { useState } from 'react';
import { addWatch } from '@/lib/local';
import { searchInstruments, type InstrumentHit } from '@/lib/market/search';

export default function AddInstrument() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'stock' | 'company' | 'topic'>('stock');
  const [msg, setMsg] = useState<string | null>(null);
  const res: InstrumentHit[] = type === 'stock' && q.trim().length >= 1 ? searchInstruments(q, 10) : [];
  const add = async (id: string, label: string, t = type) => {
    if (!id) return;
    const err = await addWatch({ type: t, id, label });
    setMsg(err ?? `Aggiunto: ${label}`);
    setQ('');
  };
  return (
    <div className="p-4">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (!t) return; if (type === 'stock') { if (res[0]) add(res[0].id, res[0].name); else setMsg('Nessun titolo trovato tra quelli monitorati: puoi seguirlo come "società (nome nelle notizie)".'); } else add(t.toLowerCase(), t); }}>
        <select className="input w-auto" value={type} onChange={(e) => { setType(e.target.value as typeof type); setMsg(null); }}>
          <option value="stock">Titolo o indice monitorato</option><option value="company">Società (nome nelle notizie)</option><option value="topic">Argomento / parola chiave</option>
        </select>
        <input className="input min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={type === 'stock' ? 'Nome o simbolo (es. Ferrari, NVDA, DAX)' : type === 'company' ? 'Nome della società (es. Fincantieri)' : 'Testo da seguire nelle notizie (es. dazi)'} maxLength={80} />
        <button className="btn btn-primary">Aggiungi</button>
      </form>
      {res.length > 0 && <ul className="mt-2 divide-y divide-line rounded border border-line">{res.map((c) => <li key={c.id}><button onClick={() => add(c.id, c.name, 'stock')} className="w-full px-3 py-2 text-left text-sm hover:bg-panel2">{c.name} <span className="text-mute">{c.symbol} · {c.kind} · {c.country}</span> <span className="float-right text-accent">+ aggiungi</span></button></li>)}</ul>}
      {msg && <p className="mt-2 text-xs text-up">{msg}</p>}
      <p className="mt-2 text-[11px] text-mute">Sono monitorati circa 190 strumenti (indici mondiali, principali titoli di Italia, USA, Europa e Asia, ETF settoriali). Per le altre società puoi seguire le notizie che le citano.</p>
    </div>
  );
}
