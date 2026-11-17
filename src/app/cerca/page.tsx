import Link from 'next/link';
import { STATIC } from '@/lib/mode';
import CercaStatic from '@/components/CercaStatic';
import { Card, PageHeader, Empty } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { listNews } from '@/lib/news';
import { searchInstruments } from '@/lib/market/search';
import { all } from '@/lib/db';
import { SECTIONS, STATUSES, STATUS_STYLE } from '@/lib/sections';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ricerca' };

const clean = (s: string | undefined, n = 120) => (s ?? '').slice(0, n);
const isDate = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function Cerca({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (STATIC) return (<div className="space-y-4"><PageHeader title="Ricerca globale" desc="Titoli, indici, notizie e fonti (indice degli ultimi giorni)" /><CercaStatic /></div>);
  const sp = await searchParams;
  const q = clean(sp.q).trim();
  const section = SECTIONS.some((s) => s.id === sp.section) ? sp.section : undefined;
  const status = STATUSES.includes(sp.status) ? sp.status : undefined;
  const source = clean(sp.source, 80) || undefined;
  const from = isDate(sp.from) ? sp.from + 'T00:00:00.000Z' : undefined;
  const to = isDate(sp.to) ? sp.to + 'T23:59:59.999Z' : undefined;
  const page = Math.max(1, Math.min(50, Number(sp.page) || 1));
  const sources = all<{ id: string; name: string }>("SELECT id, name FROM sources WHERE kind != 'data' ORDER BY name");
  const any = q || section || status || source || from || to;
  const news = any ? listNews({ q: q || undefined, section, status, sourceId: source, from, to, limit: 30, offset: (page - 1) * 30 }) : [];
  const instruments = q ? searchInstruments(q, 12) : [];
  const authors = q ? all<{ author: string; n: number }>('SELECT author, COUNT(*) n FROM articles WHERE author LIKE ? GROUP BY author ORDER BY n DESC LIMIT 8', `%${q.replace(/[%_]/g, '')}%`) : [];
  const base = new URLSearchParams(Object.entries({ q, section: section ?? '', status: status ?? '', source: source ?? '', from: sp.from ?? '', to: sp.to ?? '' }).filter(([, v]) => v));
  return (
    <div className="space-y-4">
      <PageHeader title="Ricerca globale" desc="Titoli, indici, società, notizie, autori, fonti e argomenti" />
      <form className="card grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <input name="q" defaultValue={q} className="input lg:col-span-2" placeholder="Parole chiave (usa OR per alternative)" maxLength={120} />
        <select name="section" defaultValue={section ?? ''} className="input"><option value="">Tutte le categorie</option>{SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        <select name="status" defaultValue={status ?? ''} className="input"><option value="">Qualsiasi verifica</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}</select>
        <select name="source" defaultValue={source ?? ''} className="input"><option value="">Tutte le fonti</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <div className="flex gap-1"><input type="date" name="from" defaultValue={sp.from} className="input" aria-label="Dal" /><input type="date" name="to" defaultValue={sp.to} className="input" aria-label="Al" /></div>
        <button className="btn btn-primary lg:col-span-6">Cerca</button>
      </form>
      {!any && <Empty>Inserisci una parola chiave o scegli un filtro.</Empty>}
      {(instruments.length > 0 || authors.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {instruments.length > 0 && <Card title="Titoli e indici" className="md:col-span-2"><ul className="divide-y divide-line text-sm">{instruments.map((c) => <li key={c.id}><Link href={`/titolo/${c.id}`} className="block px-4 py-1.5 hover:bg-panel2">{c.name} <span className="text-xs text-mute">{c.symbol} · {c.kind} · {c.country}</span></Link></li>)}</ul></Card>}
          {authors.length > 0 && <Card title="Autori"><ul className="divide-y divide-line text-sm">{authors.map((a) => <li key={a.author}><Link href={`/cerca?q=${encodeURIComponent(a.author)}`} className="block px-4 py-1.5 hover:bg-panel2">{a.author} <span className="text-xs text-mute">{a.n} articoli</span></Link></li>)}</ul></Card>}
        </div>
      )}
      {any && (
        <Card title={`Notizie (${news.length}${news.length === 30 ? '+' : ''})`}>
          <NewsList items={news} empty="Nessuna notizia trovata." />
          <div className="flex justify-between border-t border-line px-4 py-2 text-sm">
            {page > 1 ? <Link className="text-accent" href={`/cerca?${base}&page=${page - 1}`}>← Precedenti</Link> : <span />}
            {news.length === 30 ? <Link className="text-accent" href={`/cerca?${base}&page=${page + 1}`}>Successivi →</Link> : <span />}
          </div>
        </Card>
      )}
    </div>
  );
}
