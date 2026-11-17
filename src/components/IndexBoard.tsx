'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATIC, dataUrl } from '@/lib/mode';
import { marketStatus } from '@/lib/market/catalog';
import { fmtPrice } from '@/lib/text';

export type Tile = { id: string; name: string; short: string; ex: string; country: string; kind: string; currency: string | null; price: number | null; ch1d: number | null; chYtd: number | null; spark: number[]; marketTime: string | null; stale?: boolean };

const pct = (n: number | null) => (n == null ? 'n.d.' : (n > 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + '%');
const bg = (n: number | null) => {
  if (n == null) return 'transparent';
  const a = Math.min(Math.abs(n) / 3, 1) * 0.28 + 0.04;
  return n >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
};

function Spark({ d }: { d: number[] }) {
  if (d.length < 2) return null;
  const min = Math.min(...d), max = Math.max(...d), s = max - min || 1;
  const pts = d.map((v, i) => `${((i / (d.length - 1)) * 100).toFixed(1)},${(22 - ((v - min) / s) * 20).toFixed(1)}`).join(' ');
  return <svg viewBox="0 0 100 24" className="mt-1 h-5 w-full" preserveAspectRatio="none" aria-hidden><polyline points={pts} fill="none" stroke={d[d.length - 1] >= d[0] ? '#22c55e' : '#ef4444'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

/**
 * Griglia degli indici colorata per variazione (mappa dei mercati). Dato periodico e ritardato:
 * nella versione completa si aggiorna ogni minuto dal server, nella statica ogni 5 minuti dal file pubblicato.
 */
export default function IndexBoard({ initial, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' }: { initial: Tile[]; cols?: string }) {
  const [tiles, setTiles] = useState(initial);
  const [, tick] = useState(0);
  useEffect(() => {
    const ids = new Set(initial.map((t) => t.id));
    const t = setInterval(async () => {
      try {
        const j = await fetch(STATIC ? dataUrl('market.json') : '/api/market', { cache: 'no-store' }).then((r) => r.json());
        const m = new Map<string, Tile>((j.quotes ?? []).filter((q: Tile) => ids.has(q.id)).map((q: Tile) => [q.id, q]));
        if (m.size) setTiles((old) => old.map((o) => ({ ...o, ...(m.get(o.id) ?? {}) })));
      } catch { /* rete non disponibile: restano i dati precedenti */ }
      tick((x) => x + 1);
    }, STATIC ? 300_000 : 60_000);
    return () => clearInterval(t);
  }, [initial]);
  return (
    <div className={`grid gap-px bg-line p-px ${cols}`}>
      {tiles.map((t) => {
        const st = marketStatus(t.ex);
        return (
          <Link key={t.id} href={`/titolo/${t.id}`} className="bg-panel px-3 py-2 hover:brightness-125" style={{ backgroundImage: `linear-gradient(${bg(t.ch1d)}, ${bg(t.ch1d)})` }}>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${st.open ? 'bg-up' : 'bg-mute/60'}`} title={`${st.label} (ora locale ${st.local})`} suppressHydrationWarning />
              <span className="truncate font-semibold text-ink">{t.short}</span>
              <span className="ml-auto text-[10px] text-mute">{t.country}</span>
            </div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{fmtPrice(t.price, t.currency, t.kind)}</div>
            <div className="flex justify-between text-xs tabular-nums">
              <span className={t.ch1d == null ? 'text-mute' : t.ch1d >= 0 ? 'up' : 'down'}>{pct(t.ch1d)}</span>
              <span className="text-mute" title="Da inizio anno">{t.chYtd != null ? `${pct(t.chYtd)} YTD` : ''}</span>
            </div>
            <Spark d={t.spark} />
            {t.stale && <div className="text-[10px] text-warn">⚠ non aggiornato</div>}
          </Link>
        );
      })}
    </div>
  );
}
