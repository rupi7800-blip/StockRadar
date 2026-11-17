import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Ticker from '@/components/Ticker';
import Nav from '@/components/Nav';
import SearchBox from '@/components/SearchBox';
import LangSwitch from '@/components/LangSwitch';
import Bell from '@/components/Bell';
import Pwa from '@/components/Pwa';
import AlertEngine from '@/components/AlertEngine';
import Ago from '@/components/Ago';
import { STATIC, BUILD_TIME, UPDATE_EVERY_MIN, withBase } from '@/lib/mode';

export const metadata: Metadata = {
  title: { default: 'Stock Radar — Le borse del mondo, sotto controllo', template: '%s · Stock Radar' },
  description: 'Centro di informazione sui mercati azionari mondiali e su Piazza Affari: indici, titoli, settori, trimestrali, notizie tradotte in italiano, verificate e confrontate.',
  manifest: withBase('/manifest.webmanifest'),
  applicationName: 'Stock Radar',
  appleWebApp: { capable: true, title: 'Stock Radar', statusBarStyle: 'black-translucent' },
  icons: { icon: withBase('/icons/icon.svg'), apple: withBase('/icons/icon-192.png') },
};
export const viewport: Viewport = { themeColor: '#0b0d10', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-mode="it">
      <body className="min-h-screen font-sans">
        <div id="app-root">
          <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
              <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Stock Radar — home">
                <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="29" fill="none" stroke="#3b82f6" strokeWidth="3" /><circle cx="32" cy="32" r="18" fill="none" stroke="#3b82f6" strokeOpacity=".45" strokeWidth="2" /><path d="M12 42 L24 32 L32 37 L44 22 L52 26" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="44" cy="22" r="3.5" fill="#eab308" /></svg>
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[15px] font-extrabold tracking-[0.12em]" data-notranslate>STOCK RADAR</span>
                  <span className="block text-[10px] text-mute">Le borse del mondo, sotto controllo</span>
                </span>
              </Link>
              <div className="min-w-0 flex-1"><SearchBox /></div>
              <LangSwitch />
              <Bell />
            </div>
            <Ticker />
            <Nav />
          </header>
          <Pwa />
          <AlertEngine />
          {STATIC && BUILD_TIME && (
            <div className="border-b border-line bg-info/10 px-4 py-1 text-center text-[11px] text-info">
              Versione pubblicata su GitHub Pages · dati aggiornati <Ago iso={BUILD_TIME} /> (ogni ~{UPDATE_EVERY_MIN} min) · le quotazioni di borsa sono comunque ritardate di 15–20 minuti
            </div>
          )}
          <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">{children}</main>
          <footer className="mt-10 border-t border-line">
            <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-xs text-mute sm:grid-cols-3">
              <div>
                <div className="mb-1 font-semibold text-ink">Stock Radar</div>
                Informazione indipendente sulle borse mondiali, aggregata da fonti internazionali e italiane e tradotta in italiano. Ogni notizia rimanda alla fonte originale.
              </div>
              <div className="flex flex-col gap-1">
                <Link href="/guida" className="hover:text-ink">Guida alla Borsa</Link>
                <Link href="/metodologia" className="hover:text-ink">Metodologia e affidabilità</Link>
                <Link href="/fonti" className="hover:text-ink">Fonti e stato dei servizi</Link>
                <Link href="/archivio" className="hover:text-ink">Archivio storico</Link>
                <Link href="/admin" className="hover:text-ink">Amministrazione</Link>
              </div>
              <div>⚖ Nessun contenuto costituisce consulenza finanziaria né sollecitazione all&apos;investimento. Quotazioni ritardate da fonti gratuite: non usarle per operare. Le previsioni di analisti ed esperti sono opinioni, non fatti.</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
