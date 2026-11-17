import Link from 'next/link';
import type { Quote } from '@/lib/market/types';
import { displaySymbol, INSTRUMENT_BY_ID, SECTOR_LABEL } from '@/lib/market/catalog';
import { Pct } from './ui';
import { Sparkline } from './Charts';
import { fmtPrice } from '@/lib/text';
import WatchButton from './WatchButton';

/** Posizione del prezzo nell'intervallo minimo–massimo delle ultime 52 settimane. */
export function RangeBar({ q, width = 90 }: { q: Pick<Quote, 'price' | 'low52' | 'high52'>; width?: number }) {
  if (q.price == null || q.low52 == null || q.high52 == null || q.high52 <= q.low52) return <span className="text-[10px] text-mute">—</span>;
  const p = Math.max(0, Math.min(1, (q.price - q.low52) / (q.high52 - q.low52)));
  return (
    <span className="inline-flex items-center" title={`Minimo 52 sett.: ${q.low52.toLocaleString('it-IT')} · Massimo: ${q.high52.toLocaleString('it-IT')} · posizione ${Math.round(p * 100)}%`}>
      <span className="relative inline-block h-1.5 rounded bg-panel2" style={{ width }}>
        <span className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded bg-ink" style={{ left: `calc(${p * 100}% - 2px)` }} />
      </span>
    </span>
  );
}

export function QuoteName({ q, showSector = false }: { q: Quote; showSector?: boolean }) {
  const inst = INSTRUMENT_BY_ID[q.id];
  return (
    <Link href={`/titolo/${q.id}`} className="block min-w-0 hover:underline">
      <span className="font-medium">{q.name}</span> <span className="text-xs text-mute" data-notranslate>{inst ? displaySymbol(inst) : q.symbol}</span>
      {showSector && q.sector && <span className="block text-[10px] text-mute">{SECTOR_LABEL[q.sector]}</span>}
      {q.stale && <span className="ml-1 text-[10px] text-warn" title="La fonte non ha risposto: ultimo dato valido">⚠ non aggiornato</span>}
    </Link>
  );
}

export function QuoteTable({ quotes, cols = 'full', showSector = false }: { quotes: Quote[]; cols?: 'full' | 'compact'; showSector?: boolean }) {
  const full = cols === 'full';
  return (
    <div className="overflow-x-auto">
      <table className={`tbl ${full ? 'min-w-[760px]' : 'min-w-[420px]'}`}>
        <thead>
          <tr>
            <th className="w-6"></th><th>Nome</th><th className="text-right">Prezzo</th><th className="text-right">Seduta</th>
            {full && <><th className="text-right">1 sett.</th><th className="text-right">1 mese</th></>}
            <th className="text-right">Da inizio anno</th>
            {full && <><th className="text-right">1 anno</th><th className="text-center">Range 52 sett.</th><th className="text-right" title="Dividendi pagati negli ultimi 12 mesi / prezzo">Div.</th><th className="text-right">3 mesi</th></>}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-panel2/50">
              <td><WatchButton type="stock" id={q.id} label={q.name} small /></td>
              <td className="max-w-[220px]"><QuoteName q={q} showSector={showSector} /></td>
              <td className="text-right tabular-nums">{fmtPrice(q.price, q.currency, q.kind)}</td>
              <td className="text-right"><Pct v={q.ch1d} /></td>
              {full && <><td className="text-right"><Pct v={q.ch1w} /></td><td className="text-right"><Pct v={q.ch1m} /></td></>}
              <td className="text-right"><Pct v={q.chYtd} /></td>
              {full && <>
                <td className="text-right"><Pct v={q.ch1y} /></td>
                <td className="text-center"><RangeBar q={q} /></td>
                <td className="text-right tabular-nums text-xs">{q.divYield != null ? `${q.divYield.toFixed(1).replace('.', ',')}%` : <span className="text-mute">—</span>}</td>
                <td className="text-right"><Sparkline data={q.spark} width={80} /></td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Classifica compatta (rialzi, ribassi, volumi...). */
export function RankList({ list, value }: { list: Quote[]; value: (q: Quote) => React.ReactNode }) {
  if (!list.length) return <div className="px-4 py-6 text-center text-sm text-mute">Nessun dato.</div>;
  return (
    <ol className="divide-y divide-line text-sm">
      {list.map((q, i) => (
        <li key={q.id} className="flex items-center gap-2 px-4 py-1.5">
          <span className="w-4 shrink-0 text-xs text-mute">{i + 1}</span>
          <Link href={`/titolo/${q.id}`} className="min-w-0 truncate hover:underline">{q.name}</Link>
          <span className="shrink-0 text-[10px] text-mute">{q.country}</span>
          <span className="ml-auto shrink-0 tabular-nums">{value(q)}</span>
        </li>
      ))}
    </ol>
  );
}
