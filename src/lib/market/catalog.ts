/**
 * Catalogo degli strumenti monitorati (condiviso server/client, nessun dato di prezzo qui).
 * Ogni voce ha il simbolo Yahoo Finance (fonte primaria) e, dove noto, il simbolo Stooq (fonte di riserva).
 * Per aggiungere un titolo basta una riga: id, simbolo, nome, mercato, settore e (facoltativi) nomi alternativi
 * usati per riconoscerlo nelle notizie. Gli id sono derivati dal simbolo Yahoo e non devono cambiare
 * (sono usati da watchlist e avvisi).
 */
export type Region = 'italia' | 'usa' | 'europa' | 'asia' | 'americhe';
export type Kind = 'index' | 'stock' | 'etf' | 'macro';
export type SectorId = 'tech' | 'finanza' | 'salute' | 'energia' | 'industria' | 'discrezionali' | 'base' | 'utility' | 'materiali' | 'comunicazione' | 'immobiliare';

export type Instrument = {
  id: string;
  y: string; // simbolo Yahoo Finance
  st?: string; // simbolo Stooq (riserva)
  name: string;
  short?: string; // etichetta breve (indici)
  kind: Kind;
  region: Region;
  country: string; // ISO 3166-1 alpha-2
  ex: string; // codice borsa (vedi EXCHANGES)
  sector?: SectorId;
  aka?: string[]; // nomi alternativi per riconoscere lo strumento nelle notizie (maiuscole/minuscole rilevanti)
  major?: boolean; // strumento di primo piano (pesa nell'importanza delle notizie)
  note?: string;
};

export const REGIONS: { id: Region; label: string; href: string; color: string; desc: string }[] = [
  { id: 'italia', label: 'Italia', href: '/italia', color: '#22c55e', desc: 'Piazza Affari: FTSE MIB e principali società quotate a Milano' },
  { id: 'usa', label: 'Stati Uniti', href: '/usa', color: '#3b82f6', desc: 'Wall Street: S&P 500, Nasdaq, Dow Jones, Russell 2000' },
  { id: 'europa', label: 'Europa', href: '/europa', color: '#a78bfa', desc: 'Euro Stoxx 50, Stoxx 600, DAX, CAC 40, FTSE 100, IBEX, AEX, SMI' },
  { id: 'asia', label: 'Asia e Pacifico', href: '/asia', color: '#f43f5e', desc: 'Nikkei, Hang Seng, Shanghai, Sensex, Kospi, Taiwan, ASX' },
  { id: 'americhe', label: 'Altre Americhe', href: '/mercati#americhe', color: '#eab308', desc: 'Canada, Brasile, Messico' },
];
export const REGION_LABEL: Record<string, string> = Object.fromEntries(REGIONS.map((r) => [r.id, r.label]));

export const SECTORS: { id: SectorId; label: string; etf: string; color: string }[] = [
  { id: 'tech', label: 'Tecnologia', etf: 'xlk', color: '#3b82f6' },
  { id: 'finanza', label: 'Banche e finanza', etf: 'xlf', color: '#14b8a6' },
  { id: 'salute', label: 'Salute e farmaceutica', etf: 'xlv', color: '#22c55e' },
  { id: 'energia', label: 'Energia', etf: 'xle', color: '#f97316' },
  { id: 'industria', label: 'Industria e difesa', etf: 'xli', color: '#a3a3a3' },
  { id: 'discrezionali', label: 'Consumi discrezionali (auto, lusso)', etf: 'xly', color: '#ec4899' },
  { id: 'base', label: 'Beni di prima necessità', etf: 'xlp', color: '#84cc16' },
  { id: 'utility', label: 'Utility', etf: 'xlu', color: '#06b6d4' },
  { id: 'materiali', label: 'Materiali', etf: 'xlb', color: '#b45309' },
  { id: 'comunicazione', label: 'Telecomunicazioni e media', etf: 'xlc', color: '#8b5cf6' },
  { id: 'immobiliare', label: 'Immobiliare', etf: 'xlre', color: '#eab308' },
];
export const SECTOR_LABEL: Record<string, string> = Object.fromEntries(SECTORS.map((s) => [s.id, s.label]));

/** Orari di negoziazione continua (ora locale della borsa). Le festività non sono considerate. */
export type Exchange = { id: string; name: string; city: string; tz: string; sessions: [string, string][]; currency: string; region: Region };
export const EXCHANGES: Exchange[] = [
  { id: 'MIL', name: 'Borsa Italiana (Euronext Milan)', city: 'Milano', tz: 'Europe/Rome', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'italia' },
  { id: 'NYSE', name: 'NYSE', city: 'New York', tz: 'America/New_York', sessions: [['09:30', '16:00']], currency: 'USD', region: 'usa' },
  { id: 'NASDAQ', name: 'Nasdaq', city: 'New York', tz: 'America/New_York', sessions: [['09:30', '16:00']], currency: 'USD', region: 'usa' },
  { id: 'XETRA', name: 'Xetra (Deutsche Börse)', city: 'Francoforte', tz: 'Europe/Berlin', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'europa' },
  { id: 'PAR', name: 'Euronext Paris', city: 'Parigi', tz: 'Europe/Paris', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'europa' },
  { id: 'AMS', name: 'Euronext Amsterdam', city: 'Amsterdam', tz: 'Europe/Amsterdam', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'europa' },
  { id: 'BRU', name: 'Euronext Brussels', city: 'Bruxelles', tz: 'Europe/Brussels', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'europa' },
  { id: 'MAD', name: 'Bolsa de Madrid', city: 'Madrid', tz: 'Europe/Madrid', sessions: [['09:00', '17:30']], currency: 'EUR', region: 'europa' },
  { id: 'LSE', name: 'London Stock Exchange', city: 'Londra', tz: 'Europe/London', sessions: [['08:00', '16:30']], currency: 'GBP', region: 'europa' },
  { id: 'SIX', name: 'SIX Swiss Exchange', city: 'Zurigo', tz: 'Europe/Zurich', sessions: [['09:00', '17:30']], currency: 'CHF', region: 'europa' },
  { id: 'CPH', name: 'Nasdaq Copenhagen', city: 'Copenaghen', tz: 'Europe/Copenhagen', sessions: [['09:00', '17:00']], currency: 'DKK', region: 'europa' },
  { id: 'STO', name: 'Nasdaq Stockholm', city: 'Stoccolma', tz: 'Europe/Stockholm', sessions: [['09:00', '17:30']], currency: 'SEK', region: 'europa' },
  { id: 'HEL', name: 'Nasdaq Helsinki', city: 'Helsinki', tz: 'Europe/Helsinki', sessions: [['10:00', '18:30']], currency: 'EUR', region: 'europa' },
  { id: 'TYO', name: 'Borsa di Tokyo (JPX)', city: 'Tokyo', tz: 'Asia/Tokyo', sessions: [['09:00', '11:30'], ['12:30', '15:30']], currency: 'JPY', region: 'asia' },
  { id: 'HKEX', name: 'Borsa di Hong Kong', city: 'Hong Kong', tz: 'Asia/Hong_Kong', sessions: [['09:30', '12:00'], ['13:00', '16:00']], currency: 'HKD', region: 'asia' },
  { id: 'SSE', name: 'Borse di Shanghai e Shenzhen', city: 'Shanghai', tz: 'Asia/Shanghai', sessions: [['09:30', '11:30'], ['13:00', '15:00']], currency: 'CNY', region: 'asia' },
  { id: 'TWSE', name: 'Borsa di Taiwan', city: 'Taipei', tz: 'Asia/Taipei', sessions: [['09:00', '13:30']], currency: 'TWD', region: 'asia' },
  { id: 'KRX', name: 'Korea Exchange', city: 'Seul', tz: 'Asia/Seoul', sessions: [['09:00', '15:30']], currency: 'KRW', region: 'asia' },
  { id: 'NSE', name: 'NSE / BSE India', city: 'Mumbai', tz: 'Asia/Kolkata', sessions: [['09:15', '15:30']], currency: 'INR', region: 'asia' },
  { id: 'ASX', name: 'ASX', city: 'Sydney', tz: 'Australia/Sydney', sessions: [['10:00', '16:00']], currency: 'AUD', region: 'asia' },
  { id: 'TSX', name: 'Toronto Stock Exchange', city: 'Toronto', tz: 'America/Toronto', sessions: [['09:30', '16:00']], currency: 'CAD', region: 'americhe' },
  { id: 'B3', name: 'B3 (Brasile)', city: 'San Paolo', tz: 'America/Sao_Paulo', sessions: [['10:00', '17:00']], currency: 'BRL', region: 'americhe' },
  { id: 'BMV', name: 'Bolsa Mexicana', city: 'Città del Messico', tz: 'America/Mexico_City', sessions: [['08:30', '15:00']], currency: 'MXN', region: 'americhe' },
  { id: 'GLOBAL', name: 'Mercati globali (future, valute, tassi)', city: '—', tz: 'UTC', sessions: [['00:00', '24:00']], currency: 'USD', region: 'usa' },
];
export const EXCHANGE_BY_ID: Record<string, Exchange> = Object.fromEntries(EXCHANGES.map((e) => [e.id, e]));

/** Stato della borsa in un dato istante (solo calendario settimanale, festività escluse). */
export function marketStatus(exId: string, at = new Date()): { open: boolean; label: string; local: string } {
  const ex = EXCHANGE_BY_ID[exId];
  if (!ex) return { open: false, label: 'n.d.', local: '' };
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: ex.tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const local = `${hh === '24' ? '00' : hh}:${mm}`;
  if (exId === 'GLOBAL') return { open: true, label: 'Quasi 24 ore', local };
  if (wd === 'Sat' || wd === 'Sun') return { open: false, label: 'Chiusa (fine settimana)', local };
  const s = ex.sessions.find(([a, b]) => local >= a && local < b);
  if (s) return { open: true, label: `Aperta · chiude ${s[1]}`, local };
  const next = ex.sessions.find(([a]) => local < a);
  return { open: false, label: next ? `Apre alle ${next[0]}` : 'Chiusa', local };
}

/* ------------------------------------------------------------------ */
const idOf = (y: string) => y.toLowerCase().replace(/^\^/, '').replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

type Row = Omit<Instrument, 'id'> & { id?: string };
const ix = (y: string, name: string, short: string, region: Region, country: string, ex: string, st?: string, aka: string[] = []): Row => ({ y, name, short, kind: 'index', region, country, ex, st, aka, major: true });
const sk = (y: string, name: string, region: Region, country: string, ex: string, sector: SectorId, aka: string[] = [], major = false, st?: string): Row => ({ y, name, kind: 'stock', region, country, ex, sector, aka, major, st });

const ROWS: Row[] = [
  /* ---------------- Indici ---------------- */
  ix('FTSEMIB.MI', 'FTSE MIB', 'FTSE MIB', 'italia', 'IT', 'MIL', '^fmib', ['FTSE MIB', 'Ftse Mib', 'Piazza Affari', 'Borsa di Milano', 'Borsa Italiana']),
  ix('^GSPC', 'S&P 500', 'S&P 500', 'usa', 'US', 'NYSE', '^spx', ['S&P 500', 'S&P500', 'Wall Street']),
  ix('^IXIC', 'Nasdaq Composite', 'Nasdaq', 'usa', 'US', 'NASDAQ', '^ndq', ['Nasdaq Composite']),
  ix('^NDX', 'Nasdaq 100', 'Nasdaq 100', 'usa', 'US', 'NASDAQ', '^ndx', ['Nasdaq 100', 'Nasdaq-100']),
  ix('^DJI', 'Dow Jones Industrial Average', 'Dow Jones', 'usa', 'US', 'NYSE', '^dji', ['Dow Jones', 'Dow Jones Industrial']),
  ix('^RUT', 'Russell 2000', 'Russell 2000', 'usa', 'US', 'NYSE', undefined, ['Russell 2000']),
  ix('^STOXX50E', 'Euro Stoxx 50', 'Euro Stoxx 50', 'europa', 'EU', 'XETRA', undefined, ['Euro Stoxx 50', 'Eurostoxx 50', 'EuroStoxx 50']),
  ix('^STOXX', 'Stoxx Europe 600', 'Stoxx 600', 'europa', 'EU', 'XETRA', undefined, ['Stoxx 600', 'STOXX 600', 'Stoxx Europe 600']),
  ix('^GDAXI', 'DAX 40 (Germania)', 'DAX', 'europa', 'DE', 'XETRA', '^dax', ['DAX']),
  ix('^FCHI', 'CAC 40 (Francia)', 'CAC 40', 'europa', 'FR', 'PAR', '^cac', ['CAC 40', 'Cac 40']),
  ix('^FTSE', 'FTSE 100 (Regno Unito)', 'FTSE 100', 'europa', 'GB', 'LSE', '^ukx', ['FTSE 100', 'Ftse 100']),
  ix('^IBEX', 'IBEX 35 (Spagna)', 'IBEX 35', 'europa', 'ES', 'MAD', '^ibex', ['IBEX 35', 'Ibex 35', 'Ibex']),
  ix('^AEX', 'AEX (Paesi Bassi)', 'AEX', 'europa', 'NL', 'AMS', '^aex', ['AEX']),
  ix('^SSMI', 'SMI (Svizzera)', 'SMI', 'europa', 'CH', 'SIX', '^smi', []),
  ix('^N225', 'Nikkei 225 (Giappone)', 'Nikkei', 'asia', 'JP', 'TYO', '^nkx', ['Nikkei', 'Topix', 'TOPIX']),
  ix('^HSI', 'Hang Seng (Hong Kong)', 'Hang Seng', 'asia', 'HK', 'HKEX', '^hsi', ['Hang Seng']),
  ix('000001.SS', 'Shanghai Composite (Cina)', 'Shanghai', 'asia', 'CN', 'SSE', '^shc', ['Shanghai Composite', 'CSI 300', 'Shenzhen']),
  ix('^BSESN', 'BSE Sensex (India)', 'Sensex', 'asia', 'IN', 'NSE', undefined, ['Sensex']),
  ix('^NSEI', 'Nifty 50 (India)', 'Nifty 50', 'asia', 'IN', 'NSE', undefined, ['Nifty']),
  ix('^KS11', 'KOSPI (Corea del Sud)', 'Kospi', 'asia', 'KR', 'KRX', undefined, ['Kospi', 'KOSPI']),
  ix('^TWII', 'TAIEX (Taiwan)', 'Taiwan', 'asia', 'TW', 'TWSE', undefined, ['Taiex', 'TAIEX']),
  ix('^AXJO', 'S&P/ASX 200 (Australia)', 'ASX 200', 'asia', 'AU', 'ASX', undefined, ['ASX 200', 'ASX200']),
  ix('^GSPTSE', 'S&P/TSX Composite (Canada)', 'TSX', 'americhe', 'CA', 'TSX', undefined, ['TSX']),
  ix('^BVSP', 'Bovespa (Brasile)', 'Bovespa', 'americhe', 'BR', 'B3', undefined, ['Bovespa', 'Ibovespa']),
  ix('^MXX', 'IPC (Messico)', 'IPC Messico', 'americhe', 'MX', 'BMV', undefined, []),

  /* ---------------- Indicatori che muovono le borse ---------------- */
  { y: '^VIX', name: 'VIX — volatilità attesa S&P 500', short: 'VIX', kind: 'macro', region: 'usa', country: 'US', ex: 'GLOBAL', aka: ['VIX', 'indice della paura'], major: true },
  { y: '^TNX', name: 'Rendimento Treasury USA 10 anni', short: 'T-Note 10a', kind: 'macro', region: 'usa', country: 'US', ex: 'GLOBAL', note: 'Valore in percentuale (rendimento), non un prezzo.' },
  { y: 'EURUSD=X', name: 'Cambio euro/dollaro', short: 'EUR/USD', kind: 'macro', region: 'europa', country: 'EU', ex: 'GLOBAL' },
  { y: 'BZ=F', name: 'Petrolio Brent (future)', short: 'Brent', kind: 'macro', region: 'europa', country: 'GB', ex: 'GLOBAL', aka: ['Brent'] },
  { y: 'GC=F', name: 'Oro (future)', short: 'Oro', kind: 'macro', region: 'usa', country: 'US', ex: 'GLOBAL' },

  /* ---------------- Italia (FTSE MIB e principali) ---------------- */
  sk('ENI.MI', 'Eni', 'italia', 'IT', 'MIL', 'energia', ['Eni'], true),
  sk('ENEL.MI', 'Enel', 'italia', 'IT', 'MIL', 'utility', ['Enel'], true),
  sk('ISP.MI', 'Intesa Sanpaolo', 'italia', 'IT', 'MIL', 'finanza', ['Intesa Sanpaolo', 'Intesa'], true),
  sk('UCG.MI', 'UniCredit', 'italia', 'IT', 'MIL', 'finanza', ['UniCredit', 'Unicredit'], true),
  sk('STLAM.MI', 'Stellantis', 'italia', 'IT', 'MIL', 'discrezionali', ['Stellantis'], true),
  sk('RACE.MI', 'Ferrari', 'italia', 'IT', 'MIL', 'discrezionali', ['Ferrari'], true),
  sk('G.MI', 'Assicurazioni Generali', 'italia', 'IT', 'MIL', 'finanza', ['Generali'], true),
  sk('STMMI.MI', 'STMicroelectronics', 'italia', 'IT', 'MIL', 'tech', ['STMicroelectronics', 'STMicro'], true),
  sk('LDO.MI', 'Leonardo', 'italia', 'IT', 'MIL', 'industria', ['Leonardo'], true),
  sk('PRY.MI', 'Prysmian', 'italia', 'IT', 'MIL', 'industria', ['Prysmian']),
  sk('BMPS.MI', 'Banca Monte dei Paschi di Siena', 'italia', 'IT', 'MIL', 'finanza', ['Monte dei Paschi', 'Mps', 'MPS']),
  sk('BAMI.MI', 'Banco BPM', 'italia', 'IT', 'MIL', 'finanza', ['Banco BPM', 'Banco Bpm']),
  sk('BPE.MI', 'BPER Banca', 'italia', 'IT', 'MIL', 'finanza', ['BPER', 'Bper']),
  sk('FBK.MI', 'FinecoBank', 'italia', 'IT', 'MIL', 'finanza', ['FinecoBank', 'Fineco']),
  sk('BMED.MI', 'Banca Mediolanum', 'italia', 'IT', 'MIL', 'finanza', ['Mediolanum']),
  sk('BGN.MI', 'Banca Generali', 'italia', 'IT', 'MIL', 'finanza', ['Banca Generali']),
  sk('UNI.MI', 'Unipol', 'italia', 'IT', 'MIL', 'finanza', ['Unipol']),
  sk('AZM.MI', 'Azimut', 'italia', 'IT', 'MIL', 'finanza', ['Azimut']),
  sk('PST.MI', 'Poste Italiane', 'italia', 'IT', 'MIL', 'finanza', ['Poste Italiane']),
  sk('NEXI.MI', 'Nexi', 'italia', 'IT', 'MIL', 'finanza', ['Nexi']),
  sk('MONC.MI', 'Moncler', 'italia', 'IT', 'MIL', 'discrezionali', ['Moncler']),
  sk('BC.MI', 'Brunello Cucinelli', 'italia', 'IT', 'MIL', 'discrezionali', ['Brunello Cucinelli', 'Cucinelli']),
  sk('PIRC.MI', 'Pirelli', 'italia', 'IT', 'MIL', 'discrezionali', ['Pirelli']),
  sk('LTMC.MI', 'Lottomatica', 'italia', 'IT', 'MIL', 'discrezionali', ['Lottomatica']),
  sk('TIT.MI', 'Telecom Italia (TIM)', 'italia', 'IT', 'MIL', 'comunicazione', ['Telecom Italia', 'TIM']),
  sk('INW.MI', 'Inwit', 'italia', 'IT', 'MIL', 'comunicazione', ['Inwit', 'INWIT']),
  sk('TRN.MI', 'Terna', 'italia', 'IT', 'MIL', 'utility', ['Terna']),
  sk('SRG.MI', 'Snam', 'italia', 'IT', 'MIL', 'utility', ['Snam']),
  sk('A2A.MI', 'A2A', 'italia', 'IT', 'MIL', 'utility', ['A2A']),
  sk('HER.MI', 'Hera', 'italia', 'IT', 'MIL', 'utility', ['Gruppo Hera']),
  sk('IG.MI', 'Italgas', 'italia', 'IT', 'MIL', 'utility', ['Italgas']),
  sk('ERG.MI', 'ERG', 'italia', 'IT', 'MIL', 'utility', []),
  sk('TEN.MI', 'Tenaris', 'italia', 'IT', 'MIL', 'energia', ['Tenaris']),
  sk('SPM.MI', 'Saipem', 'italia', 'IT', 'MIL', 'energia', ['Saipem']),
  sk('CPR.MI', 'Campari', 'italia', 'IT', 'MIL', 'base', ['Campari']),
  sk('AMP.MI', 'Amplifon', 'italia', 'IT', 'MIL', 'salute', ['Amplifon']),
  sk('DIA.MI', 'DiaSorin', 'italia', 'IT', 'MIL', 'salute', ['DiaSorin', 'Diasorin']),
  sk('REC.MI', 'Recordati', 'italia', 'IT', 'MIL', 'salute', ['Recordati']),
  sk('IP.MI', 'Interpump', 'italia', 'IT', 'MIL', 'industria', ['Interpump']),
  sk('BZU.MI', 'Buzzi', 'italia', 'IT', 'MIL', 'materiali', ['Buzzi']),

  /* ---------------- Stati Uniti ---------------- */
  sk('AAPL', 'Apple', 'usa', 'US', 'NASDAQ', 'tech', ['Apple'], true, 'aapl.us'),
  sk('MSFT', 'Microsoft', 'usa', 'US', 'NASDAQ', 'tech', ['Microsoft'], true, 'msft.us'),
  sk('NVDA', 'Nvidia', 'usa', 'US', 'NASDAQ', 'tech', ['Nvidia', 'NVIDIA'], true, 'nvda.us'),
  sk('AMZN', 'Amazon', 'usa', 'US', 'NASDAQ', 'discrezionali', ['Amazon'], true, 'amzn.us'),
  sk('GOOGL', 'Alphabet (Google)', 'usa', 'US', 'NASDAQ', 'comunicazione', ['Alphabet', 'Google'], true, 'googl.us'),
  sk('META', 'Meta Platforms', 'usa', 'US', 'NASDAQ', 'comunicazione', ['Meta Platforms', 'Meta', 'Facebook'], true, 'meta.us'),
  sk('TSLA', 'Tesla', 'usa', 'US', 'NASDAQ', 'discrezionali', ['Tesla'], true, 'tsla.us'),
  sk('AVGO', 'Broadcom', 'usa', 'US', 'NASDAQ', 'tech', ['Broadcom'], true, 'avgo.us'),
  sk('BRK-B', 'Berkshire Hathaway', 'usa', 'US', 'NYSE', 'finanza', ['Berkshire Hathaway', 'Berkshire'], true, 'brk-b.us'),
  sk('JPM', 'JPMorgan Chase', 'usa', 'US', 'NYSE', 'finanza', ['JPMorgan', 'JP Morgan'], true, 'jpm.us'),
  sk('V', 'Visa', 'usa', 'US', 'NYSE', 'finanza', ['Visa Inc'], false, 'v.us'),
  sk('MA', 'Mastercard', 'usa', 'US', 'NYSE', 'finanza', ['Mastercard'], false, 'ma.us'),
  sk('BAC', 'Bank of America', 'usa', 'US', 'NYSE', 'finanza', ['Bank of America'], false, 'bac.us'),
  sk('WFC', 'Wells Fargo', 'usa', 'US', 'NYSE', 'finanza', ['Wells Fargo'], false, 'wfc.us'),
  sk('GS', 'Goldman Sachs', 'usa', 'US', 'NYSE', 'finanza', ['Goldman Sachs', 'Goldman'], false, 'gs.us'),
  sk('MS', 'Morgan Stanley', 'usa', 'US', 'NYSE', 'finanza', ['Morgan Stanley'], false, 'ms.us'),
  sk('LLY', 'Eli Lilly', 'usa', 'US', 'NYSE', 'salute', ['Eli Lilly', 'Lilly'], true, 'lly.us'),
  sk('UNH', 'UnitedHealth', 'usa', 'US', 'NYSE', 'salute', ['UnitedHealth'], false, 'unh.us'),
  sk('JNJ', 'Johnson & Johnson', 'usa', 'US', 'NYSE', 'salute', ['Johnson & Johnson'], false, 'jnj.us'),
  sk('ABBV', 'AbbVie', 'usa', 'US', 'NYSE', 'salute', ['AbbVie'], false, 'abbv.us'),
  sk('MRK', 'Merck & Co.', 'usa', 'US', 'NYSE', 'salute', ['Merck'], false, 'mrk.us'),
  sk('PFE', 'Pfizer', 'usa', 'US', 'NYSE', 'salute', ['Pfizer'], false, 'pfe.us'),
  sk('XOM', 'ExxonMobil', 'usa', 'US', 'NYSE', 'energia', ['ExxonMobil', 'Exxon'], false, 'xom.us'),
  sk('CVX', 'Chevron', 'usa', 'US', 'NYSE', 'energia', ['Chevron'], false, 'cvx.us'),
  sk('WMT', 'Walmart', 'usa', 'US', 'NYSE', 'base', ['Walmart'], false, 'wmt.us'),
  sk('COST', 'Costco', 'usa', 'US', 'NASDAQ', 'base', ['Costco'], false, 'cost.us'),
  sk('PG', 'Procter & Gamble', 'usa', 'US', 'NYSE', 'base', ['Procter & Gamble'], false, 'pg.us'),
  sk('KO', 'Coca-Cola', 'usa', 'US', 'NYSE', 'base', ['Coca-Cola'], false, 'ko.us'),
  sk('PEP', 'PepsiCo', 'usa', 'US', 'NASDAQ', 'base', ['PepsiCo', 'Pepsi'], false, 'pep.us'),
  sk('HD', 'Home Depot', 'usa', 'US', 'NYSE', 'discrezionali', ['Home Depot'], false, 'hd.us'),
  sk('MCD', "McDonald's", 'usa', 'US', 'NYSE', 'discrezionali', ["McDonald's"], false, 'mcd.us'),
  sk('NKE', 'Nike', 'usa', 'US', 'NYSE', 'discrezionali', ['Nike'], false, 'nke.us'),
  sk('NFLX', 'Netflix', 'usa', 'US', 'NASDAQ', 'comunicazione', ['Netflix'], false, 'nflx.us'),
  sk('DIS', 'Walt Disney', 'usa', 'US', 'NYSE', 'comunicazione', ['Disney'], false, 'dis.us'),
  sk('ORCL', 'Oracle', 'usa', 'US', 'NYSE', 'tech', ['Oracle'], false, 'orcl.us'),
  sk('AMD', 'AMD', 'usa', 'US', 'NASDAQ', 'tech', ['Advanced Micro Devices'], false, 'amd.us'),
  sk('INTC', 'Intel', 'usa', 'US', 'NASDAQ', 'tech', ['Intel'], false, 'intc.us'),
  sk('CRM', 'Salesforce', 'usa', 'US', 'NYSE', 'tech', ['Salesforce'], false, 'crm.us'),
  sk('ADBE', 'Adobe', 'usa', 'US', 'NASDAQ', 'tech', ['Adobe'], false, 'adbe.us'),
  sk('CSCO', 'Cisco', 'usa', 'US', 'NASDAQ', 'tech', ['Cisco'], false, 'csco.us'),
  sk('IBM', 'IBM', 'usa', 'US', 'NYSE', 'tech', [], false, 'ibm.us'),
  sk('QCOM', 'Qualcomm', 'usa', 'US', 'NASDAQ', 'tech', ['Qualcomm'], false, 'qcom.us'),
  sk('PLTR', 'Palantir', 'usa', 'US', 'NASDAQ', 'tech', ['Palantir'], false, 'pltr.us'),
  sk('BA', 'Boeing', 'usa', 'US', 'NYSE', 'industria', ['Boeing'], false, 'ba.us'),
  sk('CAT', 'Caterpillar', 'usa', 'US', 'NYSE', 'industria', ['Caterpillar'], false, 'cat.us'),
  sk('GE', 'GE Aerospace', 'usa', 'US', 'NYSE', 'industria', ['GE Aerospace'], false, 'ge.us'),
  sk('LIN', 'Linde', 'usa', 'US', 'NASDAQ', 'materiali', ['Linde'], false, 'lin.us'),
  sk('NEE', 'NextEra Energy', 'usa', 'US', 'NYSE', 'utility', ['NextEra'], false, 'nee.us'),
  sk('PLD', 'Prologis', 'usa', 'US', 'NYSE', 'immobiliare', ['Prologis'], false, 'pld.us'),

  /* ---------------- Europa ---------------- */
  sk('ASML.AS', 'ASML', 'europa', 'NL', 'AMS', 'tech', ['ASML'], true),
  sk('SAP.DE', 'SAP', 'europa', 'DE', 'XETRA', 'tech', [], true),
  sk('NOVO-B.CO', 'Novo Nordisk', 'europa', 'DK', 'CPH', 'salute', ['Novo Nordisk'], true),
  sk('MC.PA', 'LVMH', 'europa', 'FR', 'PAR', 'discrezionali', ['LVMH'], true),
  sk('RMS.PA', 'Hermès', 'europa', 'FR', 'PAR', 'discrezionali', ['Hermès', 'Hermes']),
  sk('OR.PA', "L'Oréal", 'europa', 'FR', 'PAR', 'base', ["L'Oréal", "L'Oreal"]),
  sk('TTE.PA', 'TotalEnergies', 'europa', 'FR', 'PAR', 'energia', ['TotalEnergies']),
  sk('SAN.PA', 'Sanofi', 'europa', 'FR', 'PAR', 'salute', ['Sanofi']),
  sk('AIR.PA', 'Airbus', 'europa', 'FR', 'PAR', 'industria', ['Airbus']),
  sk('SU.PA', 'Schneider Electric', 'europa', 'FR', 'PAR', 'industria', ['Schneider Electric']),
  sk('BNP.PA', 'BNP Paribas', 'europa', 'FR', 'PAR', 'finanza', ['BNP Paribas', 'Bnp Paribas']),
  sk('SIE.DE', 'Siemens', 'europa', 'DE', 'XETRA', 'industria', ['Siemens']),
  sk('ALV.DE', 'Allianz', 'europa', 'DE', 'XETRA', 'finanza', ['Allianz']),
  sk('DTE.DE', 'Deutsche Telekom', 'europa', 'DE', 'XETRA', 'comunicazione', ['Deutsche Telekom']),
  sk('RHM.DE', 'Rheinmetall', 'europa', 'DE', 'XETRA', 'industria', ['Rheinmetall']),
  sk('BMW.DE', 'BMW', 'europa', 'DE', 'XETRA', 'discrezionali', ['BMW']),
  sk('MBG.DE', 'Mercedes-Benz', 'europa', 'DE', 'XETRA', 'discrezionali', ['Mercedes-Benz', 'Mercedes']),
  sk('VOW3.DE', 'Volkswagen', 'europa', 'DE', 'XETRA', 'discrezionali', ['Volkswagen']),
  sk('BAS.DE', 'BASF', 'europa', 'DE', 'XETRA', 'materiali', ['BASF']),
  sk('DBK.DE', 'Deutsche Bank', 'europa', 'DE', 'XETRA', 'finanza', ['Deutsche Bank']),
  sk('INGA.AS', 'ING Groep', 'europa', 'NL', 'AMS', 'finanza', ['ING Groep']),
  sk('ADYEN.AS', 'Adyen', 'europa', 'NL', 'AMS', 'finanza', ['Adyen']),
  sk('ABI.BR', 'AB InBev', 'europa', 'BE', 'BRU', 'base', ['AB InBev', 'Anheuser-Busch']),
  sk('SAN.MC', 'Banco Santander', 'europa', 'ES', 'MAD', 'finanza', ['Santander']),
  sk('IBE.MC', 'Iberdrola', 'europa', 'ES', 'MAD', 'utility', ['Iberdrola']),
  sk('ITX.MC', 'Inditex', 'europa', 'ES', 'MAD', 'discrezionali', ['Inditex', 'Zara']),
  sk('NESN.SW', 'Nestlé', 'europa', 'CH', 'SIX', 'base', ['Nestlé', 'Nestle']),
  sk('ROG.SW', 'Roche', 'europa', 'CH', 'SIX', 'salute', ['Roche']),
  sk('NOVN.SW', 'Novartis', 'europa', 'CH', 'SIX', 'salute', ['Novartis']),
  sk('UBSG.SW', 'UBS', 'europa', 'CH', 'SIX', 'finanza', []),
  sk('AZN.L', 'AstraZeneca', 'europa', 'GB', 'LSE', 'salute', ['AstraZeneca']),
  sk('SHEL.L', 'Shell', 'europa', 'GB', 'LSE', 'energia', ['Shell']),
  sk('BP.L', 'BP', 'europa', 'GB', 'LSE', 'energia', []),
  sk('HSBA.L', 'HSBC', 'europa', 'GB', 'LSE', 'finanza', ['HSBC']),
  sk('ULVR.L', 'Unilever', 'europa', 'GB', 'LSE', 'base', ['Unilever']),
  sk('RIO.L', 'Rio Tinto', 'europa', 'GB', 'LSE', 'materiali', ['Rio Tinto']),
  sk('ERIC-B.ST', 'Ericsson', 'europa', 'SE', 'STO', 'tech', ['Ericsson']),
  sk('NOKIA.HE', 'Nokia', 'europa', 'FI', 'HEL', 'tech', ['Nokia']),

  /* ---------------- Asia e Pacifico ---------------- */
  sk('7203.T', 'Toyota Motor', 'asia', 'JP', 'TYO', 'discrezionali', ['Toyota'], true),
  sk('6758.T', 'Sony Group', 'asia', 'JP', 'TYO', 'discrezionali', ['Sony']),
  sk('9984.T', 'SoftBank Group', 'asia', 'JP', 'TYO', 'comunicazione', ['SoftBank', 'Softbank']),
  sk('8306.T', 'Mitsubishi UFJ', 'asia', 'JP', 'TYO', 'finanza', ['Mitsubishi UFJ', 'MUFG']),
  sk('8035.T', 'Tokyo Electron', 'asia', 'JP', 'TYO', 'tech', ['Tokyo Electron']),
  sk('9983.T', 'Fast Retailing (Uniqlo)', 'asia', 'JP', 'TYO', 'discrezionali', ['Fast Retailing', 'Uniqlo']),
  sk('7974.T', 'Nintendo', 'asia', 'JP', 'TYO', 'comunicazione', ['Nintendo']),
  sk('0700.HK', 'Tencent', 'asia', 'CN', 'HKEX', 'comunicazione', ['Tencent'], true),
  sk('9988.HK', 'Alibaba', 'asia', 'CN', 'HKEX', 'discrezionali', ['Alibaba'], true),
  sk('3690.HK', 'Meituan', 'asia', 'CN', 'HKEX', 'discrezionali', ['Meituan']),
  sk('1211.HK', 'BYD', 'asia', 'CN', 'HKEX', 'discrezionali', ['BYD']),
  sk('1299.HK', 'AIA Group', 'asia', 'HK', 'HKEX', 'finanza', ['AIA Group']),
  sk('600519.SS', 'Kweichow Moutai', 'asia', 'CN', 'SSE', 'base', ['Moutai']),
  sk('300750.SZ', 'CATL', 'asia', 'CN', 'SSE', 'industria', ['CATL', 'Contemporary Amperex']),
  sk('2330.TW', 'TSMC', 'asia', 'TW', 'TWSE', 'tech', ['TSMC', 'Taiwan Semiconductor'], true),
  sk('005930.KS', 'Samsung Electronics', 'asia', 'KR', 'KRX', 'tech', ['Samsung'], true),
  sk('000660.KS', 'SK Hynix', 'asia', 'KR', 'KRX', 'tech', ['SK Hynix', 'SK hynix']),
  sk('RELIANCE.NS', 'Reliance Industries', 'asia', 'IN', 'NSE', 'energia', ['Reliance Industries']),
  sk('TCS.NS', 'Tata Consultancy Services', 'asia', 'IN', 'NSE', 'tech', ['Tata Consultancy']),
  sk('HDFCBANK.NS', 'HDFC Bank', 'asia', 'IN', 'NSE', 'finanza', ['HDFC Bank']),
  sk('INFY.NS', 'Infosys', 'asia', 'IN', 'NSE', 'tech', ['Infosys']),
  sk('BHP.AX', 'BHP Group', 'asia', 'AU', 'ASX', 'materiali', ['BHP']),
  sk('CBA.AX', 'Commonwealth Bank', 'asia', 'AU', 'ASX', 'finanza', ['Commonwealth Bank']),

  /* ---------------- Altre Americhe ---------------- */
  sk('SHOP.TO', 'Shopify', 'americhe', 'CA', 'TSX', 'tech', ['Shopify']),
  sk('RY.TO', 'Royal Bank of Canada', 'americhe', 'CA', 'TSX', 'finanza', ['Royal Bank of Canada']),
  sk('PETR4.SA', 'Petrobras', 'americhe', 'BR', 'B3', 'energia', ['Petrobras']),
  sk('VALE3.SA', 'Vale', 'americhe', 'BR', 'B3', 'materiali', []),

  /* ---------------- ETF settoriali USA (SPDR) ---------------- */
  ...SECTORS.map((s): Row => ({ y: s.etf.toUpperCase(), name: `ETF settore ${s.label} (SPDR ${s.etf.toUpperCase()})`, short: s.etf.toUpperCase(), kind: 'etf', region: 'usa', country: 'US', ex: 'NYSE', sector: s.id, st: `${s.etf}.us` })),
];

export const INSTRUMENTS: Instrument[] = ROWS.map((r) => ({ ...r, id: r.id ?? idOf(r.y) }));
export const INSTRUMENT_BY_ID: Record<string, Instrument> = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));
export const INDICES = INSTRUMENTS.filter((i) => i.kind === 'index');
export const STOCKS = INSTRUMENTS.filter((i) => i.kind === 'stock');
export const KIND_LABEL: Record<Kind, string> = { index: 'Indice', stock: 'Azione', etf: 'ETF', macro: 'Indicatore' };

/** Etichetta del simbolo (senza suffisso di borsa) mostrata nelle tabelle. */
export function displaySymbol(i: Pick<Instrument, 'y' | 'kind' | 'short'>) {
  if (i.kind !== 'stock') return i.short ?? i.y;
  return i.y.replace(/\.[A-Z]{1,2}$/, '');
}
