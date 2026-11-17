import { Card, PageHeader, Disclaimer } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Regole e vigilanza' };

export default function Regole() {
  const official = listNews({ sourceCategory: ['regulator'], limit: 14, dedupe: false });
  const italy = listNews({ q: 'Consob OR "golden power" OR "Tobin" OR "Banca d\'Italia" OR "Borsa Italiana"', limit: 8 });
  const eu = listNews({ q: 'ESMA OR "European Commission" OR "Commissione europea" OR MiFID OR "Capital Markets Union" OR "Savings and Investments Union"', limit: 8 });
  const us = listNews({ q: 'SEC OR FINRA OR Congress OR Senate OR antitrust', section: 'regole', limit: 8 });
  const relevant = listNews({ section: 'regole', limit: 30 }).filter((n) => n.importance >= 45).slice(0, 6);
  return (
    <div className="space-y-4">
      <PageHeader title="Regole e vigilanza" desc="SEC, Consob, ESMA, antitrust, fisco e normative che toccano le società quotate e chi investe" color="#a3a3a3" />
      {relevant.length > 0 && <Card title="⚑ Decisioni con possibili effetti su interi settori o mercati"><NewsList items={relevant} compact /></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Comunicati ufficiali (SEC, ESMA)"><NewsList items={official} compact empty="Nessun comunicato recente." /></Card>
        <div className="space-y-4">
          <Card title="Italia (Consob, golden power, fisco)"><NewsList items={italy} compact empty="Nessuna notizia recente." /></Card>
          <Card title="Unione europea"><NewsList items={eu} compact empty="Nessuna notizia recente." /></Card>
          <Card title="Stati Uniti"><NewsList items={us} compact empty="Nessuna notizia recente." /></Card>
        </div>
      </div>
      <SectionNews title="Tutte le notizie su regole, vigilanza e fisco" filter={{ section: 'regole' }} />
      <Disclaimer text="Le informazioni normative sono sintesi giornalistiche e non costituiscono consulenza legale o fiscale." />
    </div>
  );
}
