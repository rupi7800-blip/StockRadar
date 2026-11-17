'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SECTIONS } from '@/lib/sections';

const EXTRA = [
  { href: '/mercati', label: 'Mercati', color: '#14b8a6' },
  { href: '/settori', label: 'Settori', color: '#8b5cf6' },
  { href: '/guida', label: 'Guida', color: '#14b8a6' },
  { href: '/watchlist', label: 'Watchlist', color: '#eab308' },
  { href: '/alert', label: 'Alert', color: '#f97316' },
  { href: '/archivio', label: 'Archivio', color: '#8a93a0' },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [{ href: '/', label: 'Radar', color: '#14b8a6' }, EXTRA[0], ...SECTIONS.slice(0, 4).map((s) => ({ href: s.href, label: s.label, color: s.color })), EXTRA[1], ...SECTIONS.slice(4).map((s) => ({ href: s.href, label: s.label, color: s.color })), ...EXTRA.slice(2)];
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav className="border-b border-line bg-panel/60" aria-label="Sezioni">
      <div className="mx-auto flex max-w-7xl items-center px-2 sm:px-4">
        <div className="scroll-x flex flex-1 gap-1 py-1.5">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`shrink-0 rounded-md px-2.5 py-1 text-sm transition-colors ${active(i.href) ? 'bg-panel2 font-semibold text-white' : 'text-mute hover:text-ink'}`} style={active(i.href) ? { boxShadow: `inset 0 -2px 0 ${i.color}` } : undefined}>
              {i.label}
            </Link>
          ))}
        </div>
        <button className="ml-1 shrink-0 rounded px-2 py-1 text-mute hover:text-ink lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu completo" aria-expanded={open}>☰</button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-1 border-t border-line p-2 sm:grid-cols-3 lg:hidden">
          {items.map((i) => <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`rounded px-3 py-2 text-sm ${active(i.href) ? 'bg-panel2 text-white' : 'text-mute'}`}><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: i.color }} />{i.label}</Link>)}
        </div>
      )}
    </nav>
  );
}
