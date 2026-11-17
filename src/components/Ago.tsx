'use client';
import { useEffect, useState } from 'react';
import { timeAgo, fmtDateTime } from '@/lib/text';

/** Tempo relativo calcolato nel browser: resta corretto anche nelle pagine pre-generate (versione statica). */
export default function Ago({ iso, prefix = '' }: { iso: string | null | undefined; prefix?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    tick((x) => x + 1);
    const t = setInterval(() => tick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  return <time dateTime={iso ?? undefined} title={fmtDateTime(iso)} suppressHydrationWarning>{prefix}{timeAgo(iso)}</time>;
}
