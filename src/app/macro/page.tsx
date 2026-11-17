import Link from 'next/link';
import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Unavailable, Freshness, Empty, Pct } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { QuoteTable } from '@/components/QuoteTable';
import { listNews } from '@/lib/news';
import { allQuotes, quotesCache, vixLabel } from '@/lib/market/derived';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Macro e banche centrali' };

export default function Macro() {
  const qc = quotesCache();
  const qs = allQuotes();
  const drivers = qs.filter((q) => q.kind === 'macro');
  const vix = qs.find((q) => q.id === 'vix');
  const ecb = getCache<{ id: string; label: string; value: number | null; date: string | null }[]>('macro:ecb');
  const fred = getCache<{ id: string; label: string; unit: string; value: number | null; date: string | null; yoy: number | null }[]>('macro:fred');
  const official = listNews({ sourceCategory: ['macro'], limit: 14, dedupe: false });
  const fed = listNews({ q: 'Fed OR FOMC OR Powell OR "Federal Reserve"', section: 'macro', limit: 8 });
  const bce = listNews({ q: 'ECB OR BCE OR Lagarde', section: 'macro', limit: 8 });
  const tariffs = listNews({ q: 'tariff OR tariffs OR dazi OR "trade war"', limit: 8 });
  return (
    <div className="space-y-4">
      <PageHeader title="Macro e banche centrali" desc="Tassi, inflazione, lavoro, crescita e dazi: i fattori che muovono le borse" color="#06b6d4" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Indicatori di mercato" className="lg:col-span-2" right={<Freshness fetchedAt={qc.fetchedAt} source={qc.source} error={qc.error} everySec={600} />}>
          {drivers.length ? <QuoteTable quotes={drivers} cols="compact" /> : <Empty>n.d.</Empty>}
          <p className="px-4 pb-3 text-[11px] text-mute">Il rendimento del Treasury a 10 anni è il riferimento per il costo del denaro e per la valutazione delle azioni: quando sale, in genere pesa sui titoli più cari (tecnologia, crescita). Il cambio euro/dollaro incide sui conti delle società europee che vendono negli USA.</p>
        </Card>
        <Card title="Termometro della paura (VIX)">
          <div className="p-4 text-sm">
            <div className="flex items-baseline gap-2"><span className="text-3xl font-bold tabular-nums">{vix?.price?.toFixed(2).replace('.', ',') ?? 'n.d.'}</span><span className="font-semibold" style={{ color: vixLabel(vix?.price).color }}>{vixLabel(vix?.price).label}</span><span className="ml-auto"><Pct v={vix?.ch1d} /></span></div>
            <p className="mt-2 text-xs text-mute">Il VIX misura la volatilità che il mercato delle opzioni si aspetta sull&apos;S&amp;P 500 nei prossimi 30 giorni. Media storica intorno a 19–20; sopra 30 segnala forte tensione. Non predice la direzione dei prezzi.</p>
            <Link href="/titolo/vix" className="mt-2 inline-block text-xs text-accent">Grafico del VIX →</Link>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Tassi ufficiali BCE" right={<Freshness fetchedAt={ecb.fetchedAt} source={ecb.source} error={ecb.error} everySec={21600} />}>
          {ecb.value?.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2">{ecb.value.map((m) => <div key={m.id} className="rounded-lg border border-line p-3"><div className="text-xs text-mute">{m.label}</div><div className="text-lg font-bold tabular-nums">{m.value != null ? `${m.value.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%` : 'n.d.'}</div><div className="text-[10px] text-mute">dato del {m.date}</div></div>)}</div>
          ) : <Empty>{ecb.error ? `Non disponibile: ${ecb.error.slice(0, 120)}` : 'In attesa del primo aggiornamento.'}</Empty>}
        </Card>
        <Card title="Dati macro USA (FRED)" right={<Freshness fetchedAt={fred.fetchedAt} source={fred.source} error={fred.error} everySec={21600} />}>
          {fred.value?.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2">{fred.value.map((m) => <div key={m.id} className="rounded-lg border border-line p-3"><div className="text-xs text-mute">{m.label}</div><div className="text-lg font-bold tabular-nums">{m.value != null ? m.value.toLocaleString('it-IT', { maximumFractionDigits: 2 }) : 'n.d.'}{m.unit === '%' ? '%' : ''}</div>{m.yoy != null && <div className="text-xs">su base annua: {m.yoy.toFixed(1)}%</div>}<div className="text-[10px] text-mute">dato del {m.date}</div></div>)}</div>
          ) : (
            <div className="p-4"><Unavailable title="Serie macro USA (Fed Funds, inflazione, disoccupazione)">Richiede una chiave gratuita FRED: registrati su fred.stlouisfed.org → My Account → API Keys e imposta <code>FRED_API_KEY</code> (nel file .env o nei Secrets di GitHub). Nel frattempo sono monitorati i comunicati ufficiali di Fed, BCE, Bank of England, BLS e BEA.</Unavailable></div>
          )}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Comunicati ufficiali (Fed, BCE, BoE, BLS, BEA)"><NewsList items={official} compact empty="Nessun comunicato recente." /></Card>
        <div className="space-y-4">
          <Card title="Federal Reserve"><NewsList items={fed} compact empty="Nessuna notizia recente." /></Card>
          <Card title="Banca centrale europea"><NewsList items={bce} compact empty="Nessuna notizia recente." /></Card>
          <Card title="Dazi e commercio"><NewsList items={tariffs} compact empty="Nessuna notizia recente." /></Card>
        </div>
      </div>
      <SectionNews title="Tutte le notizie macro" filter={{ section: 'macro' }} />
      <Disclaimer />
    </div>
  );
}
