'use client';
import { useEffect, useState } from 'react';
import { marketStatus, EXCHANGE_BY_ID } from '@/lib/market/catalog';

export default function ExchangeStatus({ ex }: { ex: string }) {
  const [s, setS] = useState<ReturnType<typeof marketStatus> | null>(null);
  useEffect(() => { setS(marketStatus(ex)); const t = setInterval(() => setS(marketStatus(ex)), 30_000); return () => clearInterval(t); }, [ex]);
  const e = EXCHANGE_BY_ID[ex];
  if (!e) return null;
  return (
    <span className="chip border-line text-xs" suppressHydrationWarning>
      <span className={`inline-block h-2 w-2 rounded-full ${s?.open ? 'bg-up' : 'bg-mute/60'}`} />
      {e.name}{s ? ` · ${s.label} (ora locale ${s.local})` : ''}
    </span>
  );
}
