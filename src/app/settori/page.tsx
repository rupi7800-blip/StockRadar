import Link from 'next/link';
import Tabs from '@/components/Tabs';
import { Card, PageHeader, Freshness, Empty, Disclaimer, Pct } from '@/components/ui';
import { QuoteTable } from '@/components/QuoteTable';
import { NewsList } from '@/components/NewsCard';
import { quotesCache, allQuotes, sectorPerf } from '@/lib/market/derived';
import { SECTORS, REGIONS } from '@/lib/market/catalog';
import { listNews } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settori' };

const tileBg = (n: number | null) => {
  if (n == null) return 'transparent';
  const a = Math.min(Math.abs(n) / 2.5, 1) * 0.3 + 0.05;
  return n >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
};

export default function Settori() {
  const qc = quotesCache();
  const qs = allQuotes();
  const perf = sectorPerf();
  const regionPerf = REGIONS.filter((r) => r.id !== 'americhe').map((r) => ({ r, s: sectorPerf(r.id) }));
  return (
    <div className="space-y-4">
      <PageHeader title="Settori" desc="Come si muovono tecnologia, banche, energia, lusso, farmaceutica e gli altri comparti nelle diverse borse" color="#8b5cf6" />
      <Card title="Mappa dei settori · seduta" right={<Freshness fetchedAt={qc.fetchedAt} source={qc.source} error={qc.error} everySec={600} />}>
        {perf.some((s) => s.count) ? (
          <div className="grid grid-cols-2 gap-px bg-line p-px sm:grid-cols-3 lg:grid-cols-4">
            {perf.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="bg-panel px-3 py-3 hover:brightness-125" style={{ backgroundImage: `linear-gradient(${tileBg(s.ch1d)}, ${tileBg(s.ch1d)})` }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold"><span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</div>
                <div className="mt-1 text-lg font-bold"><Pct v={s.ch1d} /></div>
                <div className="text-[11px] text-mute">1 mese <Pct v={s.ch1m} /> · YTD <Pct v={s.chYtd} /></div>
                <div className="text-[10px] text-mute">{s.count} titoli{s.etf?.ch1d != null ? <> · ETF USA {s.etf.symbol} <Pct v={s.etf.ch1d} /></> : null}</div>
              </a>
            ))}
          </div>
        ) : <Empty>Dati non disponibili.</Empty>}
        <p className="px-4 py-2 text-[11px] text-mute">Media semplice delle variazioni dei titoli monitorati del settore (non ponderata per capitalizzazione). Gli ETF SPDR rappresentano i settori dell&apos;S&amp;P 500.</p>
      </Card>
      <Card title="Settori per area geografica · da inizio anno">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[620px]">
            <thead><tr><th>Settore</th>{regionPerf.map(({ r }) => <th key={r.id} className="text-right">{r.label}</th>)}</tr></thead>
            <tbody>{SECTORS.map((s) => <tr key={s.id}><td>{s.label}</td>{regionPerf.map(({ r, s: sp }) => { const x = sp.find((y) => y.id === s.id); return <td key={r.id} className="text-right">{x?.count ? <Pct v={x.chYtd} /> : <span className="text-mute">—</span>}</td>; })}</tr>)}</tbody>
          </table>
        </div>
      </Card>
      {perf.filter((s) => s.count).map((s) => {
        const list = qs.filter((q) => q.kind === 'stock' && q.sector === s.id).sort((a, b) => (b.ch1d ?? -99) - (a.ch1d ?? -99));
        const ids = list.map((q) => q.id);
        const news = ids.length ? listNews({ coinsAny: ids, limit: 6 }) : [];
        return (
          <Card key={s.id} id={s.id} title={<span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label} <span className="font-normal text-mute">· {list.length} titoli</span></span>} right={s.etf ? <Link href={`/titolo/${s.etf.id}`} className="text-xs text-accent">ETF {s.etf.symbol} →</Link> : undefined}>
            <Tabs id={`set-${s.id}`} tabs={['Titoli', 'Notizie']} panels={[<QuoteTable key="t" quotes={list} />, <NewsList key="n" items={news} compact empty="Nessuna notizia recente sui titoli del settore." />]} />
          </Card>
        );
      })}
      <Disclaimer />
    </div>
  );
}
