import Link from 'next/link';
import Tabs from '@/components/Tabs';
import { Card, PageHeader, Freshness, Empty, Disclaimer, Pct } from '@/components/ui';
import IndexBoard from '@/components/IndexBoard';
import MarketClock from '@/components/MarketClock';
import { QuoteTable, RankList } from '@/components/QuoteTable';
import { quotesCache, allQuotes, anomalies, rankings, tiles } from '@/lib/market/derived';
import { REGIONS } from '@/lib/market/catalog';
import { trendingTopics } from '@/lib/news';
import { getCache } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mercati mondiali' };

export default function Mercati() {
  const qc = quotesCache();
  const qs = allQuotes();
  const byId = new Map(qs.map((q) => [q.id, q]));
  const rk = rankings(qs, 10);
  const anom = anomalies();
  const interest = trendingTopics().rising.filter((x) => x.growth > 0 && byId.has(x.id));
  const errs = getCache<{ at: string; errors: string[] }>('market:quote_errors').value;
  const macro = qs.filter((q) => q.kind === 'macro');
  return (
    <div className="space-y-4">
      <PageHeader title="Mercati mondiali" desc="Indici, titoli, indicatori e movimenti anomali di tutte le borse monitorate" color="#14b8a6" />
      <Card title="Mappa degli indici" right={<span className="text-[11px] text-mute">colore = variazione della seduta</span>}>
        {qs.length ? (
          <Tabs id="indici" tabs={REGIONS.map((r) => r.label)} panels={REGIONS.map((r) => <IndexBoard key={r.id} initial={tiles((q) => q.kind === 'index' && q.region === r.id)} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />)} />
        ) : <Empty>Quotazioni non disponibili. {qc.error}</Empty>}
        <div className="px-4 py-2"><Freshness fetchedAt={qc.fetchedAt} source={qc.source} error={qc.error} everySec={600} /> <span className="text-[11px] text-mute">· prezzi ritardati (15–20 min)</span></div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Indicatori che muovono le borse" className="lg:col-span-2" right={<Link href="/macro" className="text-xs text-accent">Macro →</Link>}>
          {macro.length ? <QuoteTable quotes={macro} cols="compact" /> : <Empty>n.d.</Empty>}
          <p className="px-4 pb-3 text-[11px] text-mute">VIX: volatilità attesa sull&apos;S&amp;P 500 nei prossimi 30 giorni. T-Note 10a: rendimento in percentuale. Petrolio e oro: contratti future.</p>
        </Card>
        <Card title="Orari delle borse"><MarketClock compact /></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Maggiori rialzi (seduta)"><RankList list={rk.gainers} value={(q) => <Pct v={q.ch1d} />} /></Card>
        <Card title="Maggiori ribassi (seduta)"><RankList list={rk.losers} value={(q) => <Pct v={q.ch1d} />} /></Card>
        <Card title="Migliori da inizio anno"><RankList list={rk.ytdBest} value={(q) => <Pct v={q.chYtd} />} /></Card>
        <Card title="Peggiori da inizio anno"><RankList list={rk.ytdWorst} value={(q) => <Pct v={q.chYtd} />} /></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card id="anomalie" title="Movimenti anomali" className="lg:col-span-2" right={<span className="text-[10px] text-mute">soglie: ±5% titoli, ±2,5% indici, gap ≥3%, volumi ≥2,5× media 20 sedute, massimi/minimi a 52 settimane, VIX ≥30</span>}>
          {anom.length ? <ul className="divide-y divide-line">{anom.map((a) => <li key={a.q.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"><Link href={`/titolo/${a.q.id}`} className="font-medium hover:underline">{a.q.name}</Link><span className="text-xs text-mute">{a.q.country}</span><span className="text-xs text-warn">{a.reasons.join(' · ')}</span></li>)}</ul> : <Empty>Nessun movimento anomalo.</Empty>}
        </Card>
        <Card title="Più citati nelle notizie" right={<span className="text-[10px] text-mute">crescita di eventi 24h</span>}>
          {interest.length ? <ul className="divide-y divide-line text-sm">{interest.map((x) => <li key={x.id} className="flex justify-between px-4 py-1.5"><Link href={`/titolo/${x.id}`} className="hover:underline">{byId.get(x.id)?.name ?? x.id}</Link><span className="text-xs text-mute">{x.prev} → {x.n} eventi</span></li>)}</ul> : <Empty>Dati insufficienti (servono 48 ore di notizie).</Empty>}
        </Card>
      </div>
      <Card id="tutti" title={`Tutti gli strumenti (${qs.length})`}>
        {qs.length ? (
          <Tabs id="tabella" tabs={[...REGIONS.map((r) => r.label), 'ETF settoriali']}
            panels={[...REGIONS.map((r) => <QuoteTable key={r.id} quotes={qs.filter((q) => q.region === r.id && (q.kind === 'stock' || q.kind === 'index'))} showSector />), <QuoteTable key="etf" quotes={qs.filter((q) => q.kind === 'etf')} />]} />
        ) : <Empty>Dati non disponibili.</Empty>}
      </Card>
      {errs && errs.errors.length > 0 && (
        <details className="card px-4 py-3 text-xs text-mute">
          <summary className="cursor-pointer text-warn">⚠ {errs.errors.length} strumenti non aggiornati all&apos;ultimo tentativo</summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">{errs.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          <p className="mt-2">Per questi strumenti è mostrato l&apos;ultimo dato valido, marcato come non aggiornato. Simboli errati si correggono in <code>src/lib/market/catalog.ts</code>.</p>
        </details>
      )}
      <Disclaimer />
    </div>
  );
}
