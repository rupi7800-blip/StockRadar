import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Empty, Freshness } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';
import type { IpoRow } from '@/lib/market/ingest';
import { fmtCompact } from '@/lib/text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'IPO e operazioni' };

export default function Operazioni() {
  const ipo = getCache<IpoRow[]>('cal:ipo');
  const upcoming = (ipo.value ?? []).filter((r) => r.status === 'prevista');
  const priced = (ipo.value ?? []).filter((r) => r.status === 'quotata').slice(0, 20);
  const ipoNews = listNews({ q: 'IPO OR quotazione OR matricola OR debut OR "goes public"', section: 'operazioni', limit: 10 });
  const mna = listNews({ q: 'merger OR acquisition OR takeover OR acquire OR fusione OR acquisizione OR OPA OR OPS OR "offerta pubblica"', section: 'operazioni', limit: 10 });
  const buyback = listNews({ q: 'buyback OR repurchase OR "azioni proprie" OR riacquisto OR "stock split" OR frazionamento', limit: 8 });
  const capital = listNews({ q: '"aumento di capitale" OR "rights issue" OR "capital increase" OR "share sale" OR placement OR collocamento', limit: 8 });
  const Tbl = ({ rows, date }: { rows: IpoRow[]; date: string }) => (
    <div className="overflow-x-auto">
      <table className="tbl min-w-[560px]">
        <thead><tr><th>Società</th><th>Borsa</th><th className="text-right">Prezzo</th><th className="text-right">Valore offerta</th><th className="text-right">{date}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.symbol + r.status}><td><span className="font-medium">{r.name}</span> <span className="text-xs text-mute" data-notranslate>{r.symbol}</span></td><td className="text-xs text-mute">{r.exchange ?? 'n.d.'}</td><td className="text-right tabular-nums">{r.price ? `$${r.price}` : 'n.d.'}</td><td className="text-right tabular-nums">{r.value ? '$' + fmtCompact(r.value) : 'n.d.'}</td><td className="text-right text-xs">{r.date ?? 'n.d.'}</td></tr>)}</tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-4">
      <PageHeader title="IPO e operazioni" desc="Nuove quotazioni, fusioni e acquisizioni, OPA, riacquisti di azioni, aumenti di capitale" color="#ec4899" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="IPO in arrivo (USA)" right={<Freshness fetchedAt={ipo.fetchedAt} source={ipo.source} error={ipo.error} everySec={21600} />}>
          {upcoming.length ? <Tbl rows={upcoming} date="Data prevista" /> : <Empty>{ipo.error ? `Calendario non disponibile: ${ipo.error.slice(0, 140)}` : 'Nessuna IPO in calendario nelle prossime settimane.'}</Empty>}
        </Card>
        <Card title="IPO appena prezzate (USA)">
          {priced.length ? <Tbl rows={priced} date="Data" /> : <Empty>Nessun dato.</Empty>}
        </Card>
      </div>
      <p className="rounded-lg border border-line bg-panel2 px-3 py-2 text-[11px] text-mute">Calendario IPO: fonte Nasdaq (mercati NYSE e Nasdaq). Le nuove quotazioni sono tra gli investimenti più rischiosi: prezzi molto volatili nei primi mesi e spesso periodi di lock-up degli azionisti che, alla scadenza, possono vendere. Le IPO su Piazza Affari compaiono nelle notizie qui sotto.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Notizie su IPO e quotazioni"><NewsList items={ipoNews} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Fusioni, acquisizioni e offerte pubbliche"><NewsList items={mna} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Buyback e frazionamenti"><NewsList items={buyback} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Aumenti di capitale e collocamenti"><NewsList items={capital} compact empty="Nessuna notizia recente." /></Card>
      </div>
      <SectionNews title="Tutte le notizie su operazioni societarie" filter={{ section: 'operazioni' }} />
      <Disclaimer />
    </div>
  );
}
