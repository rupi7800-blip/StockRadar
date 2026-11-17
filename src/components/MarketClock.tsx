'use client';
import { useEffect, useState } from 'react';
import { EXCHANGES, marketStatus, type Region } from '@/lib/market/catalog';

/** Orari delle borse calcolati nel browser (calendario settimanale; le festività nazionali non sono considerate). */
export default function MarketClock({ region, compact = false }: { region?: Region; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  const list = EXCHANGES.filter((e) => e.id !== 'GLOBAL' && e.id !== 'NASDAQ' && (!region || e.region === region));
  if (!now) return <div className="h-24 animate-pulse rounded bg-panel2" />;
  const rows = list.map((e) => ({ e, s: marketStatus(e.id, now) }));
  const open = rows.filter((r) => r.s.open).length;
  return (
    <div>
      {!compact && <div className="px-4 pt-3 text-xs text-mute">{open} borse aperte su {rows.length} · orari di negoziazione continua, ora locale di ogni piazza · festività non considerate</div>}
      <ul className={`grid gap-x-4 gap-y-1 p-4 text-sm ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {rows.map(({ e, s }) => (
          <li key={e.id} className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.open ? 'bg-up' : 'bg-mute/50'}`} />
            <span className="min-w-0 truncate" title={e.name}>{e.city === '—' ? e.name : `${e.city}`}<span className="text-xs text-mute"> · {e.name}</span></span>
            <span className="ml-auto shrink-0 text-xs tabular-nums text-mute">{s.local}</span>
            <span className={`shrink-0 whitespace-nowrap text-right text-xs ${s.open ? 'text-up' : 'text-mute'}`}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
