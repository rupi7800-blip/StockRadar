'use client';
import { useEffect, useState } from 'react';
import { withBase } from '@/lib/mode';

type BIPEvent = Event & { prompt: () => Promise<void> };
export default function Pwa() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(withBase('/sw.js'), { scope: withBase('/') }).catch(() => null);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener('online', on); window.addEventListener('offline', on);
    return () => { window.removeEventListener('beforeinstallprompt', h); window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, []);
  return (
    <>
      {offline && <div className="bg-warn/20 px-4 py-1 text-center text-xs text-warn">Sei offline: stai vedendo l&apos;ultima versione salvata, i dati NON sono aggiornati.</div>}
      {evt && (
        <button className="btn btn-primary fixed bottom-4 right-4 z-50 shadow-xl" onClick={async () => { await evt.prompt(); setEvt(null); }}>⤓ Installa Stock Radar</button>
      )}
    </>
  );
}
