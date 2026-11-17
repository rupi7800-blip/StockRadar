import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import AddInstrument from '@/components/AddInstrument';
import WatchlistClient from '@/components/WatchlistClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Watchlist' };

export default function Watchlist() {
  return (
    <div className="space-y-4">
      <PageHeader title="La mia watchlist" desc="Titoli, indici, società, esperti e argomenti che segui. Salvata in forma anonima su questo dispositivo.">
        <Link href="/alert" className="btn">🔔 Imposta avvisi</Link>
      </PageHeader>
      <Card title="Aggiungi"><AddInstrument /></Card>
      <WatchlistClient />
    </div>
  );
}
