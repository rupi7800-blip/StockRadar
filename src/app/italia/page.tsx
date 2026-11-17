import RegionPage from '@/components/RegionPage';
import { Card } from '@/components/ui';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Piazza Affari' };

export default function Italia() {
  return (
    <RegionPage
      region="italia"
      intro={
        <p className="rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-mute">
          Borsa Italiana (Euronext Milan) negozia dalle 9:00 alle 17:30 con asta di chiusura. Il FTSE MIB raccoglie le 40 società più grandi e liquide.
          Per chi investe dall&apos;Italia: plusvalenze e dividendi sono tassati al 26%, gli acquisti di azioni italiane pagano la Tobin tax e il deposito titoli l&apos;imposta di bollo. <Link href="/guida#fisco" className="text-accent">Dettagli nella guida →</Link>
        </p>
      }
      extra={
        <Card title="Fonti istituzionali italiane">
          <ul className="grid gap-1 p-4 text-sm sm:grid-cols-2">
            <li><a className="text-accent hover:underline" href="https://www.borsaitaliana.it" target="_blank" rel="noopener noreferrer">Borsa Italiana ↗</a> <span className="text-xs text-mute">composizione degli indici, calendario degli eventi societari</span></li>
            <li><a className="text-accent hover:underline" href="https://www.consob.it" target="_blank" rel="noopener noreferrer">Consob ↗</a> <span className="text-xs text-mute">avvisi sulle truffe, siti abusivi oscurati, sanzioni</span></li>
            <li><a className="text-accent hover:underline" href="https://www.emarketstorage.it" target="_blank" rel="noopener noreferrer">eMarket Storage ↗</a> <span className="text-xs text-mute">comunicati ufficiali delle società quotate</span></li>
            <li><a className="text-accent hover:underline" href="https://www.bancaditalia.it" target="_blank" rel="noopener noreferrer">Banca d&apos;Italia ↗</a> <span className="text-xs text-mute">stabilità finanziaria, statistiche</span></li>
          </ul>
          <p className="px-4 pb-3 text-[11px] text-mute">Borsa Italiana e Consob non offrono un feed pubblico di notizie o dati: le loro comunicazioni arrivano qui tramite le testate (ANSA, Il Sole 24 Ore e altre).</p>
        </Card>
      }
    />
  );
}
