import Link from 'next/link';
import { STATUS_STYLE, SECTION_LABEL } from '@/lib/sections';
import { fmtPct } from '@/lib/text';
import type { ReactNode } from 'react';
import FreshnessClient from './FreshnessClient';
import { STATIC, UPDATE_EVERY_MIN } from '@/lib/mode';

export function Card({ title, right, children, className = '', id }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`card overflow-hidden ${className}`}>
      {title && (
        <div className="card-h">
          <h2 className="min-w-0 truncate">{title}</h2>
          {right}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Pct({ v, className = '' }: { v: number | null | undefined; className?: string }) {
  const cls = v == null ? 'text-mute' : v > 0 ? 'up' : v < 0 ? 'down' : 'text-mute';
  return <span className={`tabular-nums ${cls} ${className}`}>{v != null && v > 0 ? '▲ ' : v != null && v < 0 ? '▼ ' : ''}{fmtPct(v)}</span>;
}

export function StatusBadge({ status, reasons, compact = false }: { status: string; reasons?: string[]; compact?: boolean }) {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE['NON VERIFICATA'];
  if (compact || !reasons?.length) return <span className={`chip ${st.cls}`} title={reasons?.join('\n')}>{st.label}</span>;
  return (
    <details className="inline-block">
      <summary className={`chip ${st.cls}`}>{st.label} ⓘ</summary>
      <ul className="mt-2 max-w-md list-disc space-y-1 rounded-lg border border-line bg-panel2 p-3 pl-6 text-xs text-mute">
        {reasons.map((r, i) => <li key={i}>{r}</li>)}
        <li><Link className="underline" href="/metodologia">Come valutiamo l&apos;affidabilità</Link></li>
      </ul>
    </details>
  );
}

export function CatChip({ id }: { id: string }) {
  return <span className="chip border-line text-mute">{SECTION_LABEL[id] ?? id}</span>;
}

export function TierChip({ tier, official }: { tier: string; official?: boolean }) {
  if (official) return <span className="chip border-info/40 bg-info/10 text-info" title="Comunicazione ufficiale">UFFICIALE</span>;
  const map: Record<string, string> = { A: 'border-up/30 text-up', B: 'border-line text-ink', C: 'border-line text-mute', D: 'border-warn/30 text-warn' };
  const lbl: Record<string, string> = { A: 'Primaria', B: 'Testata', C: 'Opinione/secondaria', D: 'Community' };
  return <span className={`chip ${map[tier] ?? ''}`}>{lbl[tier] ?? tier}</span>;
}

/** Indicatore di freschezza: mai presentare un dato periodico come "tempo reale". Calcolato nel browser. */
export function Freshness(p: { fetchedAt: string | null; source: string | null; error?: string | null; everySec: number; label?: string }) {
  // nella versione statica i dati vengono aggiornati da GitHub Actions: tolleranza pari all'intervallo di pubblicazione
  return <FreshnessClient {...p} grace={STATIC ? UPDATE_EVERY_MIN * 60 * 2 : 0} />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 text-center text-sm text-mute">{children}</div>;
}

export function Unavailable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-warn/40 bg-warn/5 p-3 text-xs text-mute">
      <div className="mb-1 font-semibold text-warn">⛔ {title} — non disponibile</div>
      {children}
    </div>
  );
}

export function PageHeader({ title, desc, color, children }: { title: string; desc: string; color?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          {color && <span className="inline-block h-5 w-1.5 rounded" style={{ background: color }} />}
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-mute">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return (
    <p className="rounded-lg border border-line bg-panel2 px-3 py-2 text-[11px] text-mute">
      ⚖ {text ?? 'Le informazioni hanno scopo esclusivamente informativo e non costituiscono consulenza finanziaria né sollecitazione all\'investimento. Le quotazioni provengono da fonti gratuite e sono ritardate (circa 15–20 minuti): non usarle per operare. Investire in azioni comporta il rischio di perdere anche tutto il capitale investito; i rendimenti passati non sono indicativi di quelli futuri.'}
    </p>
  );
}
