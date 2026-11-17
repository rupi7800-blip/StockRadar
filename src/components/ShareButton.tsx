'use client';
import { useEffect, useState } from 'react';
import { STATIC, withBase } from '@/lib/mode';

export default function ShareButton({ id, title }: { id: number; title: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (STATIC) return;
    fetch(`/api/article/${id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'read' }) }).catch(() => null);
  }, [id]);
  const share = async () => {
    const url = `${location.origin}${withBase(`/notizia/${id}/`)}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setMsg('Link copiato'); }
      if (!STATIC) fetch(`/api/article/${id}/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'share' }) }).catch(() => null);
    } catch { /* annullato */ }
    setTimeout(() => setMsg(null), 2000);
  };
  return <button className="btn" onClick={share}>↗ Condividi{msg && <span className="text-xs text-up"> {msg}</span>}</button>;
}
