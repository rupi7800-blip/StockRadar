'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) router.refresh();
    else setErr((await r.json()).error);
  };
  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <label className="block text-sm">
        <span className="text-mute">Password</span>
        <input type="password" autoComplete="current-password" className="input mt-1" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </label>
      <button className="btn btn-primary w-full">Accedi</button>
      {err && <p className="text-xs text-down">{err}</p>}
      <p className="text-[11px] text-mute">Massimo 5 tentativi ogni 15 minuti. Sessione valida 12 ore.</p>
    </form>
  );
}
