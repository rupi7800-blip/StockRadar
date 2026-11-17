import Link from 'next/link';
import Ago from '@/components/Ago';
import type { NewsItem } from '@/lib/news';
import { StatusBadge, TierChip, CatChip } from './ui';
import { INSTRUMENT_BY_ID } from '@/lib/market/catalog';

const FLAG_LABEL: Record<string, [string, string]> = {
  urgent: ['URGENTE', 'border-down/50 bg-down/15 text-down'],
  rumor: ['Indiscrezione', 'border-warn/40 text-warn'],
  prediction: ['Previsione/opinione', 'border-line text-mute'],
  sponsored: ['Sponsorizzato', 'border-warn/40 bg-warn/10 text-warn'],
  denial: ['Smentita', 'border-down/40 text-down'],
};

export function Title({ n, className = '' }: { n: NewsItem; className?: string }) {
  const it = n.titleIt && n.lang !== 'it';
  return (
    <span className={className}>
      <span className="t-it">{n.titleIt || n.title}</span>
      <span className="t-orig">{n.title}</span>
      {!n.titleIt && n.lang !== 'it' && <span className="ml-1 align-middle text-[10px] text-mute" title="Traduzione non ancora disponibile">[EN]</span>}
      {it && <span className="sr-only"> (tradotto)</span>}
    </span>
  );
}

export function NewsCard({ n, compact = false, showExcerpt = true }: { n: NewsItem; compact?: boolean; showExcerpt?: boolean }) {
  const ex = n.excerptIt || n.excerpt;
  return (
    <article className={`group border-t border-line px-4 ${compact ? 'py-2.5' : 'py-3'} first:border-t-0 hover:bg-panel2/50`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-mute">
        {n.isBreaking && <span className="chip border-down/60 bg-down/20 font-bold text-down"><span className="pulse-dot">●</span> BREAKING</span>}
        {n.flags.filter((f) => FLAG_LABEL[f] && !(f === 'urgent' && n.isBreaking)).map((f) => <span key={f} className={`chip ${FLAG_LABEL[f][1]}`}>{FLAG_LABEL[f][0]}</span>)}
        <span className="font-medium text-ink/80">{n.sourceName}</span>
        <TierChip tier={n.sourceTier} official={n.sourceOfficial} />
        <Ago iso={n.publishedAt} />
        {n.clusterSize > 1 && <span className="chip border-line text-mute" title="Articoli sullo stesso evento">{n.clusterSize} articoli · {n.groups} fonti</span>}
      </div>
      <Link href={`/notizia/${n.id}`} className={`block font-semibold leading-snug group-hover:text-white ${compact ? 'text-sm' : 'text-[15px]'}`}>
        <Title n={n} />
      </Link>
      {!compact && showExcerpt && ex && <p className="mt-1 line-clamp-2 text-sm text-mute"><span className="t-it">{ex}</span><span className="t-orig">{n.excerpt}</span></p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={n.status} reasons={n.reasons} compact />
        {!compact && n.categories.slice(0, 3).map((c) => <CatChip key={c} id={c} />)}
        {!compact && n.coins.slice(0, 4).map((c) => <Link key={c} href={`/titolo/${c}`} className="chip border-line text-mute hover:text-ink">{INSTRUMENT_BY_ID[c]?.short ?? INSTRUMENT_BY_ID[c]?.name ?? c}</Link>)}
        {n.hasAi && <span className="chip border-accent/40 text-accent">Analisi AI</span>}
        <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto text-[11px] text-mute hover:text-ink">Originale ↗</a>
      </div>
    </article>
  );
}

export function NewsList({ items, empty = 'Nessuna notizia disponibile al momento.', compact }: { items: NewsItem[]; empty?: string; compact?: boolean }) {
  if (!items.length) return <div className="px-4 py-6 text-center text-sm text-mute">{empty}</div>;
  return <div>{items.map((n) => <NewsCard key={n.id} n={n} compact={compact} />)}</div>;
}
