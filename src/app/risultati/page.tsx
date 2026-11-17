import Link from 'next/link';
import { getCache } from '@/lib/db';
import { Card, PageHeader, Disclaimer, Empty, Freshness } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { RankList } from '@/components/QuoteTable';
import Tabs from '@/components/Tabs';
import { listNews } from '@/lib/news';
import { allQuotes } from '@/lib/market/derived';
import type { EarningsRow } from '@/lib/market/ingest';
import { fmtPrice, fmtCompact } from '@/lib/text';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Trimestrali e dividendi' };

const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Risultati() {
  const cal = getCache<{ rows: EarningsRow[]; total: number }>('cal:earnings');
  const rows = cal.value?.rows ?? [];
  const dates = [...new Set(rows.map((r) => r.date))];
  const qs = allQuotes().filter((q) => q.kind === 'stock' && !q.stale);
  const yieldTop = [...qs].filter((q) => (q.divYield ?? 0) > 0).sort((a, b) => (b.divYield ?? 0) - (a.divYield ?? 0)).slice(0, 15);
  const recentDiv = qs.filter((q) => q.lastDiv && Date.now() - Date.parse(q.lastDiv.date) < 45 * 86400e3).sort((a, b) => Date.parse(b.lastDiv!.date) - Date.parse(a.lastDiv!.date)).slice(0, 15);
  const italy = listNews({ section: 'risultati', coinsAny: qs.filter((q) => q.region === 'italia').map((q) => q.id), limit: 10 });
  const warnings = listNews({ q: '"profit warning" OR "cuts guidance" OR "lowers guidance" OR "taglia le stime"', limit: 6 });
  return (
    <div className="space-y-4">
      <PageHeader title="Trimestrali e dividendi" desc="Calendario dei conti, risultati, stime e cedole delle società quotate" color="#eab308" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Calendario trimestrali · prossimi giorni (USA)" className="lg:col-span-2" right={<Freshness fetchedAt={cal.fetchedAt} source={cal.source} error={cal.error} everySec={21600} />}>
          {dates.length ? (
            <Tabs id="cal" tabs={dates.map((d) => day(d).replace(/^\w/, (c) => c.toUpperCase()))} panels={dates.map((d) => (
              <div key={d} className="overflow-x-auto">
                <table className="tbl min-w-[560px]">
                  <thead><tr><th>Società</th><th>Quando</th><th className="text-right">Capitalizzazione</th><th className="text-right">EPS atteso</th><th className="text-right">EPS anno prec.</th></tr></thead>
                  <tbody>{rows.filter((r) => r.date === d).map((r) => (
                    <tr key={r.symbol}>
                      <td>{r.inCatalog ? <Link href={`/titolo/${r.inCatalog}`} className="font-medium text-accent hover:underline">{r.name}</Link> : <span className="font-medium">{r.name}</span>} <span className="text-xs text-mute" data-notranslate>{r.symbol}</span></td>
                      <td className="text-xs text-mute">{r.when}</td>
                      <td className="text-right tabular-nums">{r.marketCap ? '$' + fmtCompact(r.marketCap) : 'n.d.'}</td>
                      <td className="text-right tabular-nums">{r.epsForecast ?? '—'}</td>
                      <td className="text-right tabular-nums text-mute">{r.lastYearEps ?? '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ))} />
          ) : <Empty>{cal.error ? `Calendario non disponibile: ${cal.error.slice(0, 140)}` : 'In attesa del primo aggiornamento.'}</Empty>}
          <p className="px-4 py-2 text-[11px] text-mute">Fonte: Nasdaq. Società USA con capitalizzazione ≥ 10 miliardi di dollari o presenti tra i titoli monitorati{cal.value ? ` (${rows.length} su ${cal.value.total} in calendario)` : ''}. EPS = utile per azione. Le date possono essere stimate finché la società non le conferma. Per le società italiane il calendario ufficiale è sul sito di <a href="https://www.borsaitaliana.it" target="_blank" rel="noopener noreferrer" className="text-accent">Borsa Italiana ↗</a>.</p>
        </Card>
        <div className="space-y-4">
          <Card title="Rendimento da dividendo più alto" right={<span className="text-[10px] text-mute">cedole 12 mesi / prezzo</span>}>
            <RankList list={yieldTop} value={(q) => `${q.divYield!.toFixed(1).replace('.', ',')}%`} />
            <p className="px-4 pb-3 text-[11px] text-mute">Un rendimento molto alto può dipendere da un prezzo crollato o da dividendi straordinari non ripetibili.</p>
          </Card>
          <Card title="Stacchi recenti (45 giorni)">
            {recentDiv.length ? <ul className="divide-y divide-line text-sm">{recentDiv.map((q) => <li key={q.id} className="flex items-center gap-2 px-4 py-1.5"><Link href={`/titolo/${q.id}`} className="truncate hover:underline">{q.name}</Link><span className="ml-auto shrink-0 text-xs tabular-nums text-mute">{new Date(q.lastDiv!.date).toLocaleDateString('it-IT')} · {fmtPrice(q.lastDiv!.amount, q.currency)}</span></li>)}</ul> : <Empty>Nessuno stacco rilevato.</Empty>}
          </Card>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Conti delle società italiane"><NewsList items={italy} compact empty="Nessuna notizia recente sui conti delle società italiane monitorate." /></Card>
        <Card title="Profit warning e tagli delle stime"><NewsList items={warnings} compact empty="Nessun profit warning recente." /></Card>
      </div>
      <SectionNews title="Tutte le notizie su trimestrali e dividendi" filter={{ section: 'risultati' }} />
      <Disclaimer />
    </div>
  );
}
