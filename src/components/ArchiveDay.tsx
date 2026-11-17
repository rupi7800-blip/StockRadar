import Link from 'next/link';
import { Card, PageHeader } from './ui';
import { NewsList } from './NewsCard';
import { listNews, newsStats } from '@/lib/news';
import { all } from '@/lib/db';
import { STATIC } from '@/lib/mode';

export function archiveDays(limit = 60) {
  return all<{ d: string; n: number }>('SELECT substr(published_at,1,10) d, COUNT(DISTINCT cluster_id) n FROM articles GROUP BY d ORDER BY d DESC LIMIT ?', limit);
}
/** Nella versione statica si pubblicano solo gli ultimi giorni (pagine pre-generate). */
export const STATIC_DAYS = Number(process.env.STATIC_DAYS || 7);

export function ArchiveDay({ day }: { day?: string }) {
  const days = archiveDays(STATIC ? STATIC_DAYS : 60);
  const d = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : days[0]?.d ?? new Date().toISOString().slice(0, 10);
  const items = listNews({ from: `${d}T00:00:00.000Z`, to: `${d}T23:59:59.999Z`, limit: 200 });
  const st = newsStats();
  const idx = days.findIndex((x) => x.d === d);
  const prev = idx >= 0 ? days[idx + 1]?.d : undefined;
  const next = idx > 0 ? days[idx - 1]?.d : undefined;
  return (
    <div className="space-y-4">
      <PageHeader title="Archivio storico" desc={`${st.total.toLocaleString('it-IT')} articoli archiviati, raggruppati in ${st.clusters.toLocaleString('it-IT')} eventi. Si conservano titolo, estratto, fonte, link, date, categorie, token, stato di verifica e analisi AI (non i testi integrali protetti).${STATIC ? ` Versione statica: consultabili gli ultimi ${STATIC_DAYS} giorni.` : ''}`}>
        <Link href="/cerca" className="btn">⌕ Ricerca con filtri</Link>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card title="Giorni" className="lg:order-2">
          <ul className="max-h-[70vh] overflow-y-auto text-sm">{days.map((x) => <li key={x.d}><Link href={`/archivio/${x.d}`} className={`flex justify-between px-4 py-1.5 hover:bg-panel2 ${x.d === d ? 'text-accent' : ''}`}>{new Date(x.d + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}<span className="text-mute">{x.n}</span></Link></li>)}</ul>
        </Card>
        <div className="lg:col-span-3">
          <Card title={`Eventi del ${new Date(d + 'T12:00:00Z').toLocaleDateString('it-IT', { dateStyle: 'full' })} (${items.length})`} right={<span className="flex gap-3 text-xs">{prev && <Link href={`/archivio/${prev}`} className="text-accent">← giorno prima</Link>}{next && <Link href={`/archivio/${next}`} className="text-accent">giorno dopo →</Link>}</span>}>
            <NewsList items={items} empty="Nessuna notizia archiviata per questo giorno." />
          </Card>
        </div>
      </div>
    </div>
  );
}
