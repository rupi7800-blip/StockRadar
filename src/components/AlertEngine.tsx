'use client';
import { useEffect } from 'react';
import { STATIC } from '@/lib/mode';
import { evaluateClient } from '@/lib/clientAlerts';

/** Solo versione statica: valuta gli avvisi nel browser all'apertura e ogni 5 minuti mentre l'app è aperta. */
export default function AlertEngine() {
  useEffect(() => {
    if (!STATIC) return;
    const run = () => evaluateClient().catch(() => null);
    const t0 = setTimeout(run, 3000);
    const t = setInterval(run, 5 * 60_000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);
  return null;
}
