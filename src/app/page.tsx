import Link from 'next/link';
import Ago from '@/components/Ago';
import { Card, Pct, Freshness, Empty, Disclaimer } from '@/components/ui';
import { NewsList, NewsCard } from '@/components/NewsCard';
import IndexBoard from '@/components/IndexBoard';
import MarketClock from '@/components/MarketClock';
import { RankList } from '@/components/QuoteTable';
import { topNews, listNews, mostRead, officialUpdates, trendingTopics, tickerNews } from '@/lib/news';
import { quotesCache, allQuotes, anomalies, rankings, breadth, tiles, vixLabel, sectorPerf } from '@/lib/market/derived';
import { INSTRUMENT_BY_ID } from '@/lib/market/catalog';
import { getCache } from '@/lib/db';
import { fmtPrice } from '@/lib/text';
import { SECTION_LABEL } from '@/lib/sections';
import { DISCLAIMER } from '@/lib/ai';
import { STATIC } from '@/lib/mode';

export const dynamic = 'force-dynamic';

const HOME_INDICES = ['ftsemib-mi', 'gspc', 'ndx', 'dji', 'stoxx50e', 'gdaxi', 'fchi', 'ftse', 'n225', 'hsi', '000001-ss', 'bsesn'];

export default function Home() {
  const qc = quotesCache();
  const qs = allQuotes();
  const byId = new Map(qs.map((q) => [q.id, q]));
  const briefing = getCache<{ titolo: string; punti_chiave: string[]; rischi: string[]; da_monitorare: string[]; argomenti_emergenti: string[]; _model: string }>('ai:briefing');
  const breaking = tickerNews(30).filter((n) => n.isBreaking || n.flags.includes('urgent')).slice(0, 4);
  const important = topNews(8, 24);
  const latest = listNews({ limit: 15 });
  const read = mostRead(5, 'reads');
  const official = officialUpdates(6);
  const topics = trendingTopics();
  const anom = anomalies().slice(0, 7);
  const rk = rankings(qs, 6);
  const br = breadth(qs);
  const itBr = breadth(qs.filter((q) => q.region === 'italia'));
  const board = tiles((q) => HOME_INDICES.includes(q.id)).sort((a, b) => HOME_INDICES.indexOf(a.id) - HOME_INDICES.indexOf(b.id));
  const vix = byId.get('vix');
  const vl = vixLabel(vix?.price);
  const drivers = ['eurusd-x', 'tnx', 'bz-f', 'gc-f'].map((id) => byId.get(id)).filter((q) => !!q);
  const sectors = sectorPerf().filter((s) => s.ch1d != null).sort((a, b) => (b.ch1d as number) - (a.ch1d as number));

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Stock Radar — le borse mondiali, sotto controllo</h1>
      {breaking.length > 0 && (
        <section className="rounded-xl border border-down/50 bg-down/10 p-3" aria-label="Notizie urgenti">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-down"><span className="pulse-dot">●</span> IN EVIDENZA ORA</div>
          <ul className="space-y-1">
            {breaking.map((n) => (
              <li key={n.id} className="text-sm"><Link href={`/notizia/${n.id}`} className="font-semibold hover:underline"><span className="t-it">{n.titleIt || n.title}</span><span className="t-orig">{n.title}</span></Link> <span className="text-xs text-mute">· {n.sourceName} · <Ago iso={n.publishedAt} /> · {n.status.toLowerCase()}</span></li>
            ))}
          </ul>
        </section>
      )}

      <Card title="Borse mondiali" right={<Link href="/mercati" className="text-xs text-accent">Tutti i mercati →</Link>}>
        {board.length ? <IndexBoard initial={board} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" /> : <Empty>Quotazioni in caricamento (primo aggiornamento entro pochi minuti dall&apos;avvio).{qc.error && <span className="block text-warn">Ultimo errore: {qc.error}</span>}</Empty>}
        <div className="px-4 py-2"><Freshness fetchedAt={qc.fetchedAt} source={qc.source} error={qc.error} everySec={600} /> <span className="text-[11px] text-mute">· prezzi ritardati di circa 15–20 minuti · ● verde = borsa aperta</span></div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="card col-span-2 px-4 py-3">
          <div className="text-xs text-mute">VIX · volatilità attesa sull&apos;S&amp;P 500</div>
          <div className="mt-0.5 flex items-baseline gap-2"><span className="text-2xl font-bold tabular-nums">{vix?.price?.toFixed(2).replace('.', ',') ?? 'n.d.'}</span><span className="text-sm font-semibold" style={{ color: vl.color }}>{vl.label}</span><span className="ml-auto text-xs"><Pct v={vix?.ch1d} /></span></div>
          <div className="text-[11px] text-mute">&lt;15 calma · 15–20 normale · 20–30 tensione · &gt;30 paura</div>
        </div>
        {drivers.map((q) => (
          <Link key={q!.id} href={`/titolo/${q!.id}`} className="card px-4 py-3 hover:bg-panel2">
            <div className="truncate text-xs text-mute">{INSTRUMENT_BY_ID[q!.id]?.short ?? q!.name}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums">{q!.id === 'tnx' ? `${q!.price?.toFixed(2).replace('.', ',') ?? 'n.d.'}%` : q!.id === 'eurusd-x' ? (q!.price?.toFixed(4).replace('.', ',') ?? 'n.d.') : fmtPrice(q!.price, q!.currency, q!.kind)}</div>
            <div className="text-xs"><Pct v={q!.ch1d} /></div>
          </Link>
        ))}
      </div>

      {briefing.value && (
        <Card title={<span>✦ Briefing AI · <span className="font-normal text-mute">{briefing.value.titolo}</span></span>} right={<span className="text-[11px] text-mute"><Ago iso={briefing.fetchedAt} /></span>}>
          <div className="grid gap-4 p-4 text-sm md:grid-cols-3">
            <div className="md:col-span-2"><ul className="list-disc space-y-1 pl-5">{briefing.value.punti_chiave.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
            <div className="space-y-3 text-xs">
              {briefing.value.rischi.length > 0 && <div><div className="mb-1 font-semibold text-warn">Rischi</div><ul className="list-disc pl-4 text-mute">{briefing.value.rischi.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
              {briefing.value.da_monitorare.length > 0 && <div><div className="mb-1 font-semibold text-info">Da monitorare</div><ul className="list-disc pl-4 text-mute">{briefing.value.da_monitorare.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
            </div>
            <p className="text-[11px] text-mute md:col-span-3">⚠ {DISCLAIMER}</p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Notizie più importanti di oggi" right={<span className="text-[11px] text-mute">per importanza, conferme e attualità</span>}>
            <NewsList items={important} empty="Raccolta in corso: le prime notizie arrivano entro qualche minuto dall'avvio." />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Maggiori rialzi" right={<span className="text-[10px] text-mute">ultima seduta · {rk.gainers.length ? `${qs.filter((q) => q.kind === 'stock').length} titoli` : ''}</span>}><RankList list={rk.gainers} value={(q) => <Pct v={q.ch1d} />} /></Card>
            <Card title="Maggiori ribassi"><RankList list={rk.losers} value={(q) => <Pct v={q.ch1d} />} /></Card>
          </div>
          <Card title="Ultime notizie" right={<Link href="/archivio" className="text-xs text-accent">Archivio →</Link>}>
            <NewsList items={latest} compact />
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Borse aperte ora"><MarketClock compact /></Card>
          <Card title="Clima di mercato">
            <div className="space-y-2 p-4 text-sm">
              <Breadth label="Tutti i titoli monitorati" b={br} />
              <Breadth label="Piazza Affari" b={itBr} />
              {sectors.length > 0 && <div className="pt-1 text-xs text-mute">Settore migliore: <span className="text-ink">{sectors[0].label}</span> <Pct v={sectors[0].ch1d} /> · peggiore: <span className="text-ink">{sectors[sectors.length - 1].label}</span> <Pct v={sectors[sectors.length - 1].ch1d} /> <Link href="/settori" className="text-accent">→</Link></div>}
            </div>
          </Card>
          <Card title="Movimenti anomali" right={<Link href="/mercati#anomalie" className="text-xs text-accent">tutti →</Link>}>
            {anom.length ? (
              <ul className="divide-y divide-line">{anom.map((a) => (
                <li key={a.q.id} className="px-4 py-2 text-sm"><Link href={`/titolo/${a.q.id}`} className="font-medium hover:underline">{a.q.name}</Link> <span className="text-xs text-mute">{a.q.country}</span><div className="text-xs text-warn">{a.reasons.join(' · ')}</div></li>
              ))}</ul>
            ) : <Empty>Nessun movimento anomalo sugli strumenti monitorati.</Empty>}
          </Card>
          <Card title="Argomenti di tendenza (24h)">
            <div className="flex flex-wrap gap-1.5 p-4">
              {topics.categories.slice(0, 8).map(([c, n]) => <Link key={c} href={`/cerca?section=${c}`} className="chip border-line text-mute hover:text-ink">{SECTION_LABEL[c] ?? c} · {n}</Link>)}
              {topics.coins.slice(0, 10).map((c) => <Link key={c.id} href={`/titolo/${c.id}`} className="chip border-accent/30 text-accent">{INSTRUMENT_BY_ID[c.id]?.short ?? INSTRUMENT_BY_ID[c.id]?.name ?? c.id} · {c.n}{c.growth > 0 ? ' ↑' : ''}</Link>)}
              {topics.phrases.slice(0, 8).map((p) => <Link key={p.phrase} href={`/cerca?q=${encodeURIComponent(p.phrase)}`} className="chip border-line text-ink">“{p.phrase}”</Link>)}
              {!topics.categories.length && <span className="text-sm text-mute">Dati insufficienti.</span>}
            </div>
          </Card>
          <Card title="Comunicazioni ufficiali" right={<span className="text-[10px] text-mute">autorità, banche centrali, statistiche</span>}>
            {official.length ? official.map((n) => <NewsCard key={n.id} n={n} compact />) : <Empty>Nessuna comunicazione ufficiale recente.</Empty>}
          </Card>
          {!STATIC && <Card title="Più lette su Stock Radar">{read.length ? read.map((n) => <NewsCard key={n.id} n={n} compact />) : <Empty>Ancora nessuna lettura registrata.</Empty>}</Card>}
        </div>
      </div>
      <Disclaimer />
    </div>
  );
}

function Breadth({ label, b }: { label: string; b: { up: number; down: number; total: number } }) {
  if (!b.total) return <div className="text-xs text-mute">{label}: n.d.</div>;
  const up = (b.up / b.total) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="tabular-nums"><span className="up">{b.up} ▲</span> · <span className="down">{b.down} ▼</span></span></div>
      <div className="flex h-1.5 overflow-hidden rounded bg-panel2"><div className="bg-up/70" style={{ width: `${up}%` }} /><div className="bg-down/70" style={{ width: `${(b.down / b.total) * 100}%` }} /></div>
    </div>
  );
}
