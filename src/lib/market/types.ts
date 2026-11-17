import type { Kind, Region, SectorId } from './catalog';

/** Quotazione e statistiche di uno strumento, calcolate dalla serie giornaliera dell'ultimo anno. */
export type Quote = {
  id: string;
  symbol: string;
  name: string;
  kind: Kind;
  region: Region;
  country: string;
  ex: string;
  sector: SectorId | null;
  currency: string | null;
  price: number | null;
  prevClose: number | null;
  ch1d: number | null; // variazione % sulla chiusura precedente
  ch1w: number | null;
  ch1m: number | null;
  ch3m: number | null;
  chYtd: number | null;
  ch1y: number | null;
  high52: number | null;
  low52: number | null;
  volume: number | null;
  avgVol20: number | null;
  volRatio: number | null; // volume ultima seduta / media 20 sedute
  volatility: number | null; // volatilità annualizzata (%), ultime 60 sedute
  maxDD: number | null; // massimo ribasso dal picco nell'ultimo anno (%, negativo)
  divYield: number | null; // dividendi pagati negli ultimi 12 mesi / prezzo (%)
  divTtm: number | null;
  lastDiv: { date: string; amount: number } | null;
  gap: number | null; // apertura vs chiusura precedente (%)
  marketTime: string | null; // ora dell'ultimo prezzo
  spark: number[]; // ultime ~60 chiusure (ridotte)
  source: string;
  stale?: boolean; // true se la fonte non ha risposto: è l'ultimo dato valido
};

export type Series = { points: [number, number][]; source: string; fetchedAt: string };

/** Formato di prezzo: le borse di Londra quotano in pence (GBp). */
export function priceUnit(currency: string | null) {
  if (!currency) return '';
  if (currency === 'GBp' || currency === 'GBX') return 'pence';
  return currency;
}
