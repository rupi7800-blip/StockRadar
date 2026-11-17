import Link from 'next/link';
import { Card, PageHeader, Disclaimer } from '@/components/ui';
import { NewsList } from '@/components/NewsCard';
import { SectionNews } from '@/components/SectionNews';
import { listNews } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rischi e tutele' };

const SCAMS: [string, string][] = [
  ['Falsi consulenti e trading online "garantito"', 'Telefonate, chat o pubblicità che promettono rendimenti alti e sicuri. In Italia può offrire servizi di investimento solo chi è autorizzato: verifica sempre negli elenchi della Consob (intermediari) e della Banca d\'Italia.'],
  ['Clonazione di società autorizzate', 'Siti e profili che copiano nome e logo di banche, SIM o gestori reali. Controlla l\'indirizzo web esatto e contatta la società dai recapiti ufficiali.'],
  ['Gruppi WhatsApp/Telegram con "il titolo del giorno"', 'Schema tipico di pump & dump: si spinge un titolo poco liquido per poi vendere a chi entra dopo. Spesso usano il nome di economisti o personaggi noti senza il loro consenso.'],
  ['Recupero crediti per vittime di truffe', 'Chi ha già perso denaro viene ricontattato da finti avvocati o "agenzie" che chiedono un anticipo per recuperarlo: è una seconda truffa.'],
  ['Prodotti con leva (CFD, opzioni, certificati a leva)', 'Non sono truffe di per sé, ma la maggior parte dei piccoli investitori che li usa perde denaro: i broker europei devono pubblicare la percentuale di conti in perdita.'],
];

export default function Rischi() {
  const urgent = listNews({ flag: 'urgent', limit: 10 });
  const legal = listNews({ sourceId: 'sec-litigation', limit: 8, dedupe: false });
  const fraud = listNews({ q: 'fraud OR frode OR truffa OR "insider trading" OR manipulation OR aggiotaggio OR ponzi', limit: 10 });
  const halts = listNews({ q: 'halted OR halt OR suspended OR sospeso OR sospensione OR "circuit breaker"', section: 'rischi', limit: 8 });
  const shorts = listNews({ q: '"short seller" OR "short report" OR "accounting" OR restatement OR "class action"', limit: 8 });
  return (
    <div className="space-y-4">
      <PageHeader title="Rischi e tutele" desc="Frodi societarie, insider trading, sospensioni, fallimenti, profit warning e truffe agli investitori" color="#ef4444" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="⚠ Allarmi recenti" right={<span className="text-[10px] text-mute">sospensioni, fallimenti, profit warning, frodi</span>}><NewsList items={urgent} compact empty="Nessun allarme recente." /></Card>
        <Card title="SEC — azioni legali (frode, insider trading)"><NewsList items={legal} compact empty="Nessuna azione legale recente." /></Card>
        <Card title="Frodi, manipolazioni e insider trading"><NewsList items={fraud} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Sospensioni dalle contrattazioni"><NewsList items={halts} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Short seller, contabilità e class action"><NewsList items={shorts} compact empty="Nessuna notizia recente." /></Card>
        <Card title="Truffe più diffuse in Italia: come riconoscerle">
          <ul className="space-y-2 p-4 text-sm">{SCAMS.map(([t, d]) => <li key={t}><div className="font-semibold">{t}</div><div className="text-xs text-mute">{d}</div></li>)}</ul>
          <p className="px-4 pb-3 text-xs text-mute">Prima di investire: verifica l&apos;autorizzazione sul sito della <a href="https://www.consob.it" target="_blank" rel="noopener noreferrer" className="text-accent">Consob ↗</a>, diffida da chi mette fretta e non trasferire mai denaro su conti esteri di privati. Se sei vittima di una truffa, denuncia alla Polizia Postale e segnala alla Consob. <Link href="/guida#rischi" className="text-accent">Guida ai rischi →</Link></p>
        </Card>
      </div>
      <SectionNews title="Tutte le notizie su rischi e tutele" filter={{ section: 'rischi' }} />
      <Disclaimer text="Le accuse riportate (indagini, cause civili, contestazioni delle autorità) non equivalgono a condanne: vale la presunzione di innocenza fino a sentenza definitiva." />
    </div>
  );
}
