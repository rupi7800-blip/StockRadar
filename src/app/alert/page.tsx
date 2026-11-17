import { PageHeader, Card } from '@/components/ui';
import AlertManager from '@/components/AlertManager';
import { ALERT_TYPES } from '@/lib/alerts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifiche e alert' };

export default function Alert() {
  return (
    <div className="space-y-4">
      <PageHeader title="Notifiche e alert" desc="Prezzi e variazioni di titoli e indici, volumi anomali, massimi e minimi, VIX, trimestrali, notizie urgenti, Piazza Affari, banche centrali" color="#f97316" />
      <AlertManager types={ALERT_TYPES} />
      <Card title="Come funzionano">
        <ul className="list-disc space-y-1 p-4 pl-8 text-sm text-mute">
          <li>Le regole vengono valutate sui dati più recenti acquisiti: le quotazioni sono aggiornate periodicamente e sono ritardate di 15–20 minuti rispetto alla borsa. Non usare gli avvisi per operare in tempo reale.</li>
          <li>Per indicare un titolo puoi usare il nome (Eni, Apple), il simbolo (ENI, AAPL) o l&apos;identificativo che trovi nell&apos;indirizzo della scheda (es. eni-mi).</li>
          <li>Per evitare notifiche ripetitive: una sola notifica per evento (anche se riportato da più fonti), massimo una per regola a ogni ciclo, e un periodo di silenzio configurabile per ogni regola.</li>
          <li>Le notifiche push funzionano quando il browser/dispositivo le supporta (su iPhone/iPad occorre prima installare l&apos;app nella schermata Home). In ogni caso le trovi nel centro notifiche 🔔.</li>
        </ul>
      </Card>
    </div>
  );
}
