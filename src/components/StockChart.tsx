'use client';
import { useMemo, useState } from 'react';
import { LineChart } from './Charts';

type P = [number, number][];
const RANGES: { k: string; label: string; days: number | 'ytd'; src: '1y' | '5y' }[] = [
  { k: '1m', label: '1 mese', days: 31, src: '1y' },
  { k: '3m', label: '3 mesi', days: 92, src: '1y' },
  { k: '6m', label: '6 mesi', days: 183, src: '1y' },
  { k: 'ytd', label: 'Da inizio anno', days: 'ytd', src: '1y' },
  { k: '1a', label: '1 anno', days: 366, src: '1y' },
  { k: '5a', label: '5 anni', days: 5 * 366, src: '5y' },
];

/** Grafico storico da serie già pubblicate (giornaliera per 1 anno, settimanale per 5 anni): nessuna chiamata esterna dal browser. */
export default function StockChart({ y1, y5, unit, source }: { y1: P; y5: P; unit: string; source: string | null }) {
  const [r, setR] = useState('6m');
  const range = RANGES.find((x) => x.k === r)!;
  const pts = useMemo(() => {
    const base = range.src === '5y' ? (y5.length ? y5 : y1) : y1;
    if (!base.length) return [];
    const last = base[base.length - 1][0];
    const from = range.days === 'ytd' ? Date.UTC(new Date(last).getUTCFullYear(), 0, 1) - 86400e3 * 3 : last - range.days * 86400e3;
    return base.filter((p) => p[0] >= from);
  }, [range, y1, y5]);
  const first = pts[0]?.[1], last = pts[pts.length - 1]?.[1];
  const ch = first && last ? ((last - first) / first) * 100 : null;
  const hi = pts.length ? Math.max(...pts.map((p) => p[1])) : null, lo = pts.length ? Math.min(...pts.map((p) => p[1])) : null;
  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {RANGES.map((x) => <button key={x.k} onClick={() => setR(x.k)} disabled={x.src === '5y' && !y5.length} className={`btn px-2 py-0.5 text-xs ${r === x.k ? 'btn-primary' : ''} disabled:opacity-40`}>{x.label}</button>)}
        {ch != null && <span className={`ml-auto text-sm tabular-nums ${ch >= 0 ? 'up' : 'down'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(2).replace('.', ',')}% nel periodo</span>}
      </div>
      <LineChart points={pts} />
      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-mute">
        <span>{source ? `Fonte: ${source} · chiusure ${range.src === '5y' ? 'settimanali' : 'giornaliere'}${unit ? ` · valori in ${unit}` : ''}` : 'Serie storica non ancora disponibile.'}</span>
        {hi != null && lo != null && <span className="tabular-nums">min {lo.toLocaleString('it-IT', { maximumFractionDigits: 2 })} · max {hi.toLocaleString('it-IT', { maximumFractionDigits: 2 })}</span>}
      </div>
      {range.src === '5y' && !y5.length && <p className="text-[11px] text-warn">Lo storico a 5 anni viene scaricato a rotazione: sarà disponibile ai prossimi aggiornamenti.</p>}
    </div>
  );
}
