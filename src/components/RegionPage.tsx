import Link from 'next/link';
import { Card, PageHeader, Freshness, Empty, Disclaimer, Pct } from './ui';
import { SectionNews } from './SectionNews';
import IndexBoard from './IndexBoard';
import MarketClock from './MarketClock';
import Tabs from './Tabs';
import { QuoteTable, RankList } from './QuoteTable';
import { quotesCache, allQuotes, anomalies, rankings, breadth, tiles, sectorPerf } from '@/lib/market/derived';
import { REGIONS, SECTOR_LABEL, type Region } from '@/lib/market/catalog';
import { SECTIONS } from '@/lib/sections';

/** Pagina di un'area geografica: indici, titoli, classifiche, settori, anomalie e notizie. */
export default function RegionPage({ region, intro, extra }: { region: Region; intro?: React.ReactNode; extra?: React.ReactNode }) {
  const meta = REGIONS.find((r) => r.id === region)!;
  const sec = SECTIONS.find((s) => s.id === region);
  const qc = quotesCache();
  const qs = allQuotes().filter((q) => q.region === region);
  const stocks = qs.filter((q) => q.kind === 'stock');
  const board = tiles((q) => q.region === region && q.kind === 'index');
  const rk = rankings(qs, 8);
  const br = breadth(qs);
  const anom = anomalies(region).slice(0, 10);
  const sectors = sectorPerf(region).filter((s) => s.count > 0);
  const bySector = [...new Set(stocks.map((q) => q.sector ?? 'altro'))];
  return (
    <div className="space-y-4">
      <PageHeader title={sec?.label === 'Wall Street' ? 'Wall Street (Stati Uniti)' : meta.label} desc={meta.desc} color={meta.color} />
      {intro}
      <Card title="Indici" right={<span className="text-[11px] text-mute">{br.total ? <><span className="up">{br.up} ▲</span> · <span className="down">{br.down} ▼</span> titoli monitorati</> : null}</span>}>
        {board.length ? <IndexBoard initial={board} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" /> : <Empty>Quotazioni non ancora disponibili. {qc.error}</Empty>}
        <div className="px-4 py-2"><Freshness fetchedAt={qc.fetchedAt} source={qc.source} error={qc.error} everySec={600} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Maggiori rialzi (seduta)"><RankList list={rk.gainers} value={(q) => <Pct v={q.ch1d} />} /></Card>
        <Card title="Maggiori ribassi (seduta)"><RankList list={rk.losers} value={(q) => <Pct v={q.ch1d} />} /></Card>
        <Card title="Migliori da inizio anno"><RankList list={rk.ytdBest} value={(q) => <Pct v={q.chYtd} />} /></Card>
        <Card title="Volumi sopra la media" right={<span className="text-[10px] text-mute">× media 20 sedute</span>}><RankList list={rk.volume.filter((q) => (q.volRatio ?? 0) > 1.2)} value={(q) => `${q.volRatio!.toFixed(1).replace('.', ',')}×`} /></Card>
      </div>
      <Card title={`Titoli monitorati (${stocks.length})`} right={<Link href="/settori" className="text-xs text-accent">Settori →</Link>}>
        {stocks.length ? (
          <Tabs id={`titoli-${region}`} tabs={['Tutti', ...bySector.map((s) => SECTOR_LABEL[s] ?? s)]}
            panels={[<QuoteTable key="all" quotes={stocks} showSector />, ...bySector.map((s) => <QuoteTable key={s} quotes={stocks.filter((q) => (q.sector ?? 'altro') === s)} />)]} />
        ) : <Empty>Dati non disponibili.</Empty>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Movimenti anomali" className="lg:col-span-2" right={<span className="text-[10px] text-mute">±5% titoli, ±2,5% indici, gap ≥3%, volumi ≥2,5×, massimi/minimi 52 sett.</span>}>
          {anom.length ? <ul className="divide-y divide-line">{anom.map((a) => <li key={a.q.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm"><Link href={`/titolo/${a.q.id}`} className="font-medium hover:underline">{a.q.name}</Link><span className="text-xs text-warn">{a.reasons.join(' · ')}</span></li>)}</ul> : <Empty>Nessun movimento anomalo.</Empty>}
        </Card>
        <Card title="Orari delle borse"><MarketClock region={region} compact /></Card>
      </div>
      {sectors.length > 0 && (
        <Card title="Settori (media semplice dei titoli monitorati)">
          <div className="overflow-x-auto"><table className="tbl min-w-[480px]"><thead><tr><th>Settore</th><th className="text-right">Titoli</th><th className="text-right">Seduta</th><th className="text-right">1 mese</th><th className="text-right">Da inizio anno</th></tr></thead>
            <tbody>{sectors.map((s) => <tr key={s.id}><td><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</td><td className="text-right text-mute">{s.count}</td><td className="text-right"><Pct v={s.ch1d} /></td><td className="text-right"><Pct v={s.ch1m} /></td><td className="text-right"><Pct v={s.chYtd} /></td></tr>)}</tbody></table></div>
        </Card>
      )}
      {extra}
      <SectionNews title={`Notizie — ${meta.label}`} filter={{ section: region }} />
      <Disclaimer />
    </div>
  );
}
