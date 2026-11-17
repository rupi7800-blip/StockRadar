'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOverride({ clusterId }: { clusterId: number }) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const save = async () => {
    const r = await fetch('/api/admin/cluster', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clusterId, status: status || null, note }) });
    const j = await r.json();
    setMsg(r.ok ? 'Salvato' : j.error);
    if (r.ok) router.refresh();
  };
  return (
    <div className="rounded-lg border border-info/40 p-3 text-xs">
      <div className="mb-2 font-semibold text-info">Redazione: correggi lo stato (motivazione obbligatoria, visibile pubblicamente)</div>
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Automatico (rimuovi correzione)</option>
          {['CONFERMATA', 'CONFERMATA PARZIALMENTE', 'NON VERIFICATA', 'SMENTITA'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input className="input flex-1" placeholder="Motivazione e fonte (es. comunicato ufficiale del …)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <button className="btn btn-primary" onClick={save} disabled={note.trim().length < 5}>Salva</button>
      </div>
      {msg && <div className="mt-1">{msg}</div>}
    </div>
  );
}
