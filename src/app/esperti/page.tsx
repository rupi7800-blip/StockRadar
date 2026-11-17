import Tabs from '@/components/Tabs';
import Ago from '@/components/Ago';
import { Card, PageHeader, Disclaimer, Empty, TierChip } from '@/components/ui';
import { listNews } from '@/lib/news';
import { listSources, sourceMeta } from '@/lib/sources/registry';
import { timeAgo, fmtDateTime } from '@/lib/text';
import ComparePanel from '@/components/ComparePanel';
import WatchButton from '@/components/WatchButton';
import { aiAvailable } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analisi ed esperti' };

const ROLES = ['Professore', 'Analista', 'Gestore', 'Economisti', 'Curatore'];

export default async function Esperti({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const experts = listSources("category = 'expert'");
  const filtered = experts;
  const items = listNews({ sourceCategory: ['expert'], limit: 60, dedupe: false });
  const toCmp = (l: typeof items) => l.map((n) => ({ id: n.id, title: n.titleIt || n.title, original: n.title, source: n.sourceName, author: n.author, at: n.publishedAt, ago: timeAgo(n.publishedAt), url: n.url, coins: n.coins, cats: n.categories, prediction: n.flags.includes('prediction') }));
  const roleOf = (sid: string) => sourceMeta(experts.find((e) => e.id === sid) ?? ({ meta: null } as never)).role ?? '';
  const roles = ROLES.filter((r) => items.some((n) => roleOf(n.sourceId).toLowerCase().includes(r.toLowerCase())));
  return (
    <div className="space-y-4">
      <PageHeader title="Analisi ed esperti" desc="Contributi di professori di finanza, economisti, gestori e analisti di mercato" color="#14b8a6" />
      <div className="rounded-xl border border-line bg-panel2 p-3 text-xs text-mute">
        Gli esperti sono selezionati per competenza documentata e storico pubblico, non per numero di follower. Per ognuno indichiamo ruolo e <b>possibili conflitti d&apos;interesse</b>. <b>Le previsioni e le opinioni non sono fatti.</b> Le raccomandazioni di acquisto/vendita delle banche d&apos;affari non sono pubbliche e non sono integrate; i contenuti social (X/Twitter) non sono integrati perché le API sono a pagamento (vedi README).
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Contributi recenti" right={<span className="text-[11px] text-mute">seleziona 2–6 contributi per confrontarli</span>}>
            {items.length ? <Tabs id="ruolo" tabs={['Tutti', ...roles]} panels={[items, ...roles.map((r) => items.filter((n) => roleOf(n.sourceId).toLowerCase().includes(r.toLowerCase())))].map((l, x) => <ComparePanel key={x} aiEnabled={aiAvailable()} items={toCmp(l)} />)} /> : <Empty>Nessun contributo recente (le fonti esperti si aggiornano ogni ora).</Empty>}
          </Card>
        </div>
        <Card title={`Esperti e fonti monitorate (${filtered.length})`}>
          <ul className="divide-y divide-line">{filtered.map((e) => {
            const m = sourceMeta(e);
            return (
              <li key={e.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2"><a href={e.homepage ?? '#'} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{e.name}</a><TierChip tier={e.tier} /><span className="ml-auto"><WatchButton type="expert" id={e.id} label={e.name} small /></span></div>
                <div className="text-xs text-mute">{m.role ?? 'n.d.'} · {m.area ?? ''}</div>
                <div className="text-xs text-mute">{e.reliability_note}</div>
                {e.conflicts && <div className="text-xs text-warn">Possibili conflitti: {e.conflicts}</div>}
                <div className="text-[10px] text-mute">{e.status === 'ok' ? <Ago iso={e.last_success} prefix="ultimo aggiornamento " /> : e.status === 'error' ? `⚠ feed in errore dal ${fmtDateTime(e.last_success ?? e.last_attempt)}` : 'in attesa'}</div>
              </li>
            );
          })}</ul>
          <p className="border-t border-line px-4 py-2 text-[11px] text-mute">Nuovi esperti si aggiungono da Admin → Fonti (categoria &quot;expert&quot;).</p>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}
