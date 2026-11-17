'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATIC } from '@/lib/mode';
import { getEvents, setEvents } from '@/lib/clientAlerts';

type Ev = { id: number; title: string; body: string | null; url: string | null; read: number; created_at: string };
export default function Bell() {
  const [items, setItems] = useState<Ev[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const load = async () => {
    if (STATIC) { const e = getEvents(); setItems(e); setUnread(e.filter((x) => !x.read).length); return; }
    try {
      const r = await fetch('/api/alerts/events', { cache: 'no-store' });
      const j = await r.json();
      setItems(j.items ?? []);
      setUnread(j.unread ?? 0);
    } catch { /* offline */ }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener('sr-events', load);
    return () => { clearInterval(t); window.removeEventListener('sr-events', load); };
  }, []);
  const markAll = async () => {
    if (STATIC) { setEvents(getEvents().map((e) => ({ ...e, read: 1 }))); return; }
    await fetch('/api/alerts/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    load();
  };
  return (
    <div className="relative">
      <button className="btn relative h-9 w-9 px-0" onClick={() => setOpen((o) => !o)} aria-label={`Notifiche (${unread} non lette)`}>
        🔔{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-down px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 max-w-[90vw] rounded-lg border border-line bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm font-semibold">Notifiche
            <span className="flex gap-2 text-xs font-normal"><button onClick={markAll} className="text-mute hover:text-ink">segna lette</button><Link href="/alert" onClick={() => setOpen(false)} className="text-accent">gestisci</Link></span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <div className="p-4 text-sm text-mute">Nessuna notifica. Crea i tuoi avvisi nella sezione <Link href="/alert" className="text-accent" onClick={() => setOpen(false)}>Alert</Link>.</div>}
            {items.map((e) => (
              <Link key={e.id} href={e.url ?? '/alert'} onClick={() => setOpen(false)} className={`block border-t border-line px-3 py-2 text-sm first:border-0 hover:bg-panel2 ${e.read ? 'opacity-60' : ''}`}>
                <div className="font-medium">{e.title}</div>
                {e.body && <div className="line-clamp-2 text-xs text-mute">{e.body}</div>}
                <div className="text-[10px] text-mute">{new Date(e.created_at.replace(' ', 'T') + (e.created_at.includes('T') ? '' : 'Z')).toLocaleString('it-IT')}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
