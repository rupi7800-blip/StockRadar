import Link from 'next/link';
import { INSTRUMENT_BY_ID } from '@/lib/market/catalog';
import Ago from '@/components/Ago';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getArticle } from '@/lib/news';
import { getAnalysis } from '@/lib/ai/tasks';
import { aiAvailable, DISCLAIMER } from '@/lib/ai';
import { Card, StatusBadge, TierChip, CatChip, Disclaimer } from '@/components/ui';
import { Title } from '@/components/NewsCard';
import AiPanel from '@/components/AiPanel';
import ShareButton from '@/components/ShareButton';
import WatchButton from '@/components/WatchButton';
import AdminOverride from '@/components/AdminOverride';
import { isAdmin } from '@/lib/auth';
import { all } from '@/lib/db';
import { fmtDateTime, timeAgo } from '@/lib/text';
import { STATUS_STYLE } from '@/lib/sections';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== '1') return [];
  const days = Number(process.env.STATIC_DAYS || 7);
  return all<{ id: number }>('SELECT id FROM articles WHERE published_at >= ?', new Date(Date.now() - days * 86400e3).toISOString()).map((r) => ({ id: String(r.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = getArticle(Number((await params).id));
  return { title: a ? a.item.titleIt || a.item.title : 'Notizia' };
}

export default async function Notizia({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const a = getArticle(id);
  if (!a) notFound();
  const { item: n, members, history, cluster } = a;
  const analysis = getAnalysis(n.id) ?? members.map((m) => getAnalysis(m.id)).find(Boolean) ?? null;
  const admin = process.env.STATIC_EXPORT === '1' ? false : await isAdmin();
  const st = STATUS_STYLE[n.status] ?? STATUS_STYLE['NON VERIFICATA'];
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <nav className="text-xs text-mute"><Link href="/" className="hover:text-ink">Radar</Link> › {n.categories[0] ? <Link href={`/cerca?section=${n.categories[0]}`} className="hover:text-ink">{n.categories[0]}</Link> : 'Notizia'}</nav>
      <article className="card p-4 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-mute">
          {n.isBreaking && <span className="chip border-down/60 bg-down/20 font-bold text-down">BREAKING</span>}
          <span className="font-medium text-ink">{n.sourceName}</span><TierChip tier={n.sourceTier} official={n.sourceOfficial} />
          <time dateTime={n.publishedAt}>{fmtDateTime(n.publishedAt)} (<Ago iso={n.publishedAt} />)</time>
          {n.author && <span>· di {n.author}</span>}
        </div>
        <h1 className="text-xl font-bold leading-tight sm:text-2xl"><Title n={n} /></h1>
        {n.titleIt && n.lang !== 'it' && (
          <p className="mt-1 text-xs text-mute">Titolo originale ({n.lang.toUpperCase()}): <span className="text-ink/80" data-notranslate>{n.title}</span> · traduzione automatica ({n.translationProvider ?? 'n.d.'})</p>
        )}
        {(n.excerptIt || n.excerpt) && <p className="mt-3 text-[15px] text-ink/90"><span className="t-it">{n.excerptIt || n.excerpt}</span><span className="t-orig">{n.excerpt}</span></p>}
        <p className="mt-2 text-[11px] text-mute">Stock Radar riporta titolo ed estratto forniti dal feed della fonte. Per il testo completo leggi l&apos;articolo originale.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary">Leggi l&apos;originale su {n.sourceName} ↗</a>
          <ShareButton id={n.id} title={n.titleIt || n.title} />
          {n.coins.slice(0, 3).map((c) => <WatchButton key={c} type="stock" id={c} label={INSTRUMENT_BY_ID[c]?.name ?? c} />)}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {n.categories.map((c) => <CatChip key={c} id={c} />)}
          {n.coins.map((c) => <Link key={c} href={`/titolo/${c}`} className="chip border-accent/30 text-accent">{INSTRUMENT_BY_ID[c]?.name ?? c}</Link>)}
        </div>
      </article>

      <Card title="Affidabilità della notizia" right={<StatusBadge status={n.status} compact />}>
        <div className="space-y-3 p-4 text-sm">
          <div className={`rounded-lg border p-3 ${st.cls}`}>
            <div className="font-semibold">Stato: {st.label.toUpperCase()}</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink/80">{n.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            {cluster?.status_override && <p className="mt-2 text-xs">Stato corretto dalla redazione: {cluster.status_override_note}</p>}
          </div>
          {n.flags.includes('prediction') && <p className="text-xs text-warn">Il titolo contiene previsioni o opinioni: non sono fatti.</p>}
          {n.flags.includes('sponsored') && <p className="text-xs text-warn">Possibile contenuto sponsorizzato o promozionale.</p>}
          {history.length > 0 && (
            <details className="text-xs text-mute"><summary className="text-ink">Storico delle variazioni ({history.length})</summary>
              <ul className="mt-1 space-y-0.5">{history.map((h, i) => <li key={i}>{fmtDateTime(h.at.includes('T') ? h.at : h.at.replace(' ', 'T') + 'Z')} · {h.actor}: {h.old_status ?? '—'} → {h.new_status}{h.note ? ` — ${h.note}` : ''}</li>)}</ul>
            </details>
          )}
          <Link href="/metodologia" className="text-xs text-accent">Come funziona il sistema di affidabilità →</Link>
          {admin && <AdminOverride clusterId={n.clusterId} />}
        </div>
      </Card>

      <Card title={`Fonti sullo stesso evento (${members.length})`}>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="px-4 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-mute"><span className="font-medium text-ink">{m.sourceName}</span><TierChip tier={m.sourceTier} official={m.sourceOfficial} /><span>{fmtDateTime(m.publishedAt)}</span>{m.flags.includes('rumor') && <span className="chip border-warn/40 text-warn">indiscrezione</span>}{m.flags.includes('denial') && <span className="chip border-down/40 text-down">smentita</span>}</div>
              <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline"><Title n={m} /> ↗</a>
              {m.id !== n.id && <Link href={`/notizia/${m.id}`} className="ml-2 text-xs text-mute hover:text-ink">scheda</Link>}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="✦ Approfondimento AI">
        <AiPanel clusterId={n.clusterId} initial={analysis} available={aiAvailable()} disclaimer={DISCLAIMER} />
      </Card>
      <Disclaimer />
    </div>
  );
}
