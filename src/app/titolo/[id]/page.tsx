import Link from 'next/link';
import { notFound } from 'next/navigation';
import Ago from '@/components/Ago';
import { Card, PageHeader, Pct, Disclaimer, Empty } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import StockChart from '@/components/StockChart';
import WatchButton from '@/components/WatchButton';
import ExchangeStatus from '@/components/ExchangeStatus';
import { QuoteTable, RangeBar } from '@/components/QuoteTable';
import { listNews } from '@/lib/news';
import { getCache } from '@/lib/db';
import { INSTRUMENTS, INSTRUMENT_BY_ID, KIND_LABEL, REGION_LABEL, SECTOR_LABEL, displaySymbol } from '@/lib/market/catalog';
import { allQuotes } from '@/lib/market/derived';
import { priceUnit } from '@/lib/market/types';
import { fmtPrice, fmtCompact, fmtDateTime } from '@/lib/text';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return INSTRUMENTS.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = INSTRUMENT_BY_ID[id];
  return { title: i ? `${i.name} (${displaySymbol(i)})` : 'Strumento' };
}

const COUNTRY: Record<string, string> = { IT: 'Italia', US: 'Stati Uniti', DE: 'Germania', FR: 'Francia', NL: 'Paesi Bassi', ES: 'Spagna', GB: 'Regno Unito', CH: 'Svizzera', DK: 'Danimarca', SE: 'Svezia', FI: 'Finlandia', BE: 'Belgio', EU: 'Area euro', JP: 'Giappone', CN: 'Cina', HK: 'Hong Kong', TW: 'Taiwan', KR: 'Corea del Sud', IN: 'India', AU: 'Australia', CA: 'Canada', BR: 'Brasile', MX: 'Messico' };

export default async function Titolo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inst = INSTRUMENT_BY_ID[id];
  if (!inst) notFound();
  const qs = allQuotes();
  const q = qs.find((x) => x.id === id);
  const s1 = getCache<{ points: [number, number][] }>(`series:${id}:1y`);
  const s5 = getCache<{ points: [number, number][] }>(`series:${id}:5y`);
  const news = listNews({ coin: id, limit: 20 });
  const peers = inst.kind === 'stock' && inst.sector ? qs.filter((x) => x.kind === 'stock' && x.sector === inst.sector && x.id !== id).sort((a, b) => (a.region === inst.region ? 0 : 1) - (b.region === inst.region ? 0 : 1)).slice(0, 12) : [];
  const members = inst.kind === 'index' ? qs.filter((x) => x.kind === 'stock' && x.region === inst.region && (inst.country === 'EU' || x.country === inst.country || inst.region === 'usa')) : [];
  const unit = priceUnit(q?.currency ?? null);
  const desc = [...new Set([KIND_LABEL[inst.kind], inst.sector ? SECTOR_LABEL[inst.sector] : null, COUNTRY[inst.country] ?? inst.country, REGION_LABEL[inst.region]].filter(Boolean))].join(' · ');
  return (
    <div className="space-y-4">
      <PageHeader title={`${inst.name} (${displaySymbol(inst)})`} desc={desc}>
        <WatchButton type="stock" id={id} label={inst.name} />
      </PageHeader>
      <div className="-mt-2 flex flex-wrap gap-2"><ExchangeStatus ex={inst.ex} /><span className="chip border-line text-xs" data-notranslate>Simbolo Yahoo: {inst.y}</span>{unit && <span className="chip border-line text-xs">Valuta: {unit}</span>}</div>
      {inst.note && <p className="text-xs text-mute">ℹ {inst.note}</p>}
      {!q ? (
        <Card title="Quotazione non disponibile"><Empty>Nessun dato ricevuto finora da Yahoo Finance o Stooq per {inst.y}. Nessun valore viene mostrato per non presentare dati inventati.</Empty></Card>
      ) : (
        <>
          {q.stale && <p className="text-xs text-warn">⚠ Dato NON aggiornato: all&apos;ultimo tentativo le fonti non hanno risposto. È mostrato l&apos;ultimo valore valido.</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <B l="Ultimo prezzo" v={fmtPrice(q.price, q.currency, q.kind)} s={<><Pct v={q.ch1d} /> nella seduta{q.prevClose != null && <span className="text-mute"> · chiusura prec. {fmtPrice(q.prevClose, q.currency, q.kind)}</span>}</>} />
            <B l="Variazioni" v="" s={<span className="grid grid-cols-2 gap-x-3 gap-y-0.5"><span>1 sett. <Pct v={q.ch1w} /></span><span>1 mese <Pct v={q.ch1m} /></span><span>3 mesi <Pct v={q.ch3m} /></span><span>da inizio anno <Pct v={q.chYtd} /></span><span>1 anno <Pct v={q.ch1y} /></span></span>} />
            <B l="Intervallo 52 settimane" v="" s={<span className="block space-y-1"><RangeBar q={q} width={140} /><span className="flex justify-between tabular-nums text-mute"><span>{fmtPrice(q.low52, q.currency, q.kind)}</span><span>{fmtPrice(q.high52, q.currency, q.kind)}</span></span>{q.price != null && q.high52 ? <span className="text-mute">{(((q.price - q.high52) / q.high52) * 100).toFixed(1).replace('.', ',')}% dal massimo</span> : null}</span>} />
            <B l="Rischio" v="" s={<span className="block space-y-0.5"><span className="block">Volatilità annua: <b className="tabular-nums">{q.volatility != null ? `${q.volatility.toFixed(1).replace('.', ',')}%` : 'n.d.'}</b></span><span className="block">Massimo ribasso (1 anno): <b className="tabular-nums down">{q.maxDD != null ? `${q.maxDD.toFixed(1).replace('.', ',')}%` : 'n.d.'}</b></span></span>} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <B l="Volumi" v={q.volume ? fmtCompact(q.volume) : 'n.d.'} s={q.avgVol20 ? <span className="text-mute">media 20 sedute {fmtCompact(q.avgVol20)}{q.volRatio ? ` · ${q.volRatio.toFixed(1).replace('.', ',')}×` : ''}</span> : <span className="text-mute">non disponibile per gli indici</span>} />
            <B l="Dividendi (12 mesi)" v={q.divYield != null ? `${q.divYield.toFixed(2).replace('.', ',')}%` : '—'} s={q.divTtm ? <span className="text-mute">{fmtPrice(q.divTtm, q.currency)} per azione{q.lastDiv ? ` · ultimo stacco ${fmtDateTime(q.lastDiv.date).slice(0, 10)}` : ''}</span> : <span className="text-mute">{inst.kind === 'stock' ? 'nessun dividendo rilevato nell\'ultimo anno' : 'non applicabile'}</span>} />
            <B l="Gap di apertura" v={q.gap != null ? `${q.gap > 0 ? '+' : ''}${q.gap.toFixed(2).replace('.', ',')}%` : '—'} s={<span className="text-mute">apertura rispetto alla chiusura precedente</span>} />
            <B l="Ultimo prezzo alle" v="" s={<span className="text-mute">{q.marketTime ? <>{fmtDateTime(q.marketTime)} (<Ago iso={q.marketTime} />)</> : 'n.d.'}<br />Fonte: {q.source} · dato ritardato</span>} />
          </div>
        </>
      )}
      <Card title="Andamento storico">
        <StockChart y1={s1.value?.points ?? []} y5={s5.value?.points ?? []} unit={unit} source={s1.source} />
      </Card>
      <Card title={`Notizie su ${inst.name}`}><NewsList items={news} empty="Nessuna notizia recente associata a questo strumento." /></Card>
      {peers.length > 0 && <Card title={`Altri titoli del settore ${SECTOR_LABEL[inst.sector!]}`}><QuoteTable quotes={peers} cols="compact" /></Card>}
      {members.length > 0 && <Card title={`Titoli monitorati di quest'area (${members.length})`}><QuoteTable quotes={members} cols="compact" /></Card>}
      <p className="text-xs text-mute">
        <Link href="/alert" className="text-accent">Crea un avviso</Link> su prezzo, variazione o notizie di {inst.name} ·{' '}
        <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(inst.y)}`} target="_blank" rel="noopener noreferrer nofollow" className="text-accent">Scheda su Yahoo Finance ↗</a>
        {inst.region === 'italia' && inst.kind === 'stock' && <> · comunicati ufficiali su <a href="https://www.emarketstorage.it" target="_blank" rel="noopener noreferrer" className="text-accent">eMarket Storage ↗</a></>}
        {inst.region === 'usa' && inst.kind === 'stock' && <> · documenti ufficiali su <a href={`https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(inst.name)}`} target="_blank" rel="noopener noreferrer" className="text-accent">SEC EDGAR ↗</a></>}
      </p>
      <Disclaimer />
    </div>
  );
}
function B({ l, v, s }: { l: string; v: string; s?: React.ReactNode }) {
  return <div className="card px-4 py-3"><div className="text-xs text-mute">{l}</div>{v && <div className="text-xl font-bold tabular-nums">{v}</div>}{s && <div className="mt-0.5 text-xs">{s}</div>}</div>;
}
