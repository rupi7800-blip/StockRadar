'use client';
import { useEffect, useState } from 'react';
import { timeAgo, fmtDateTime } from '@/lib/text';

export default function FreshnessClient({ fetchedAt, source, error, everySec, label = 'Aggiornato', grace = 0 }: { fetchedAt: string | null; source: string | null; error?: string | null; everySec: number; label?: string; grace?: number }) {
  const [, tick] = useState(0);
  useEffect(() => { tick(1); const t = setInterval(() => tick((x) => x + 1), 60_000); return () => clearInterval(t); }, []);
  if (!fetchedAt) return <span className="text-[11px] text-warn">{error ? `Dato non disponibile: ${error.slice(0, 140)}` : 'In attesa del primo aggiornamento…'}</span>;
  const age = (Date.now() - Date.parse(fetchedAt)) / 1000;
  const stale = age > everySec * 3 + 120 + grace;
  return (
    <span suppressHydrationWarning className={`text-[11px] ${stale ? 'text-warn' : 'text-mute'}`} title={`${fmtDateTime(fetchedAt)}${error ? '\nUltimo errore: ' + error : ''}`}>
      {stale ? '⚠ Dato NON aggiornato · ' : ''}
      {label} {timeAgo(fetchedAt)} · Fonte: {source ?? 'n.d.'} · periodico (ogni {everySec >= 3600 ? `${Math.round(everySec / 3600)} h` : `${Math.round(everySec / 60)} min`})
    </span>
  );
}
