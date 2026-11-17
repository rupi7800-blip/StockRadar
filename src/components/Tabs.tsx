'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** Schede lato client con pannelli già renderizzati dal server: funziona sia nell'app completa sia nella versione statica. */
export default function Tabs({ id, tabs, panels, className = '' }: { id: string; tabs: string[]; panels: ReactNode[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const sync = () => {
      const h = decodeURIComponent(location.hash.slice(1));
      const k = tabs.findIndex((t) => `${id}-${t}` === h);
      if (k >= 0) {
        setI(k);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [id, tabs]);
  const pick = (k: number) => {
    setI(k);
    try { history.replaceState(null, '', `#${encodeURIComponent(`${id}-${tabs[k]}`)}`); } catch { /* */ }
  };
  return (
    <div className={className}>
      <div className="scroll-x flex gap-1 px-4 pt-3" role="tablist">
        {tabs.map((t, k) => (
          <button key={t} role="tab" aria-selected={k === i} onClick={() => pick(k)} className={`chip shrink-0 ${k === i ? 'border-accent/50 text-accent' : 'border-line text-mute hover:text-ink'}`}>{t}</button>
        ))}
      </div>
      {panels.map((p, k) => <div key={k} role="tabpanel" hidden={k !== i}>{p}</div>)}
    </div>
  );
}
