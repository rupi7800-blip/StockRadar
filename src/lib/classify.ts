import 'server-only';
import { getSetting } from './db';
import { INSTRUMENTS, INSTRUMENT_BY_ID } from './market/catalog';

/**
 * Parole chiave predefinite per sezione (modificabili dal pannello admin → impostazione "category_keywords").
 * Le notizie sono in inglese e in italiano: le espressioni coprono entrambe le lingue.
 */
export const DEFAULT_CATEGORY_KEYWORDS: Record<string, string> = {
  italia: 'piazza affari|ftse ?mib|borsa (di )?milano|borsa italiana|euronext milan|\\bconsob\\b|\\bital(y|ian|ia|iana|iano|iane|iani)\\b|btp|spread btp|mef\\b|golden power|banca d.italia|bankitalia',
  usa: 'wall street|s&p ?500|\\bnasdaq\\b|dow jones|\\bnyse\\b|russell 2000|\\bu\\.?s\\.? (stocks|shares|equities|markets)|american stocks|borsa (usa|americana)|titoli usa',
  europa: 'stoxx|\\bdax\\b|cac ?40|ftse ?100|\\bibex\\b|\\baex\\b|euronext|european (stocks|shares|equities|markets)|europe.s (stocks|markets)|london stock exchange|\\blse\\b|frankfurt|borse europee|piazze europee|eurozon|euro zone',
  asia: 'nikkei|topix|hang seng|shanghai|shenzhen|csi 300|sensex|nifty|kospi|taiex|asx ?200|asian (stocks|shares|markets)|borse asiatiche|\\bchina|chinese|\\bjapan|japanese|\\bindia\\b|indian (stocks|market)|hong kong|taiwan|south korea|\\bkorea|cina|giappone',
  risultati: 'earnings|quarterly (results|profit|revenue|report)|\\bq[1-4] (results|earnings|revenue|profit)|first[- ]quarter|second[- ]quarter|third[- ]quarter|fourth[- ]quarter|full[- ]year results|revenue (beat|miss|rose|fell|grew)|profit (rose|fell|jumped|slumped)|beats estimates|misses estimates|\\beps\\b|guidance|outlook (raised|cut)|profit warning|cuts? (its )?(forecast|outlook)|taglia le stime|dividend|payout|trimestral|semestral|conti (del|dei|trimestrali|annuali)|bilancio|utile netto|ricavi|fatturato|risultati (del|dei|trimestrali|semestrali)|dividendo|cedola|stacco',
  operazioni: '\\bipo\\b|initial public offering|goes public|going public|listing debut|stock market debut|\\bmerger|acquisition|acquire[sd]?\\b|takeover|buyout|tender offer|bid for|buyback|share repurchase|stock split|spin[- ]?off|delist|rights issue|capital increase|\\bopa\\b|\\bops\\b|offerta pubblica|fusione|acquisizion|quotazione|matricol|aumento di capitale|riacquisto di azioni|azioni proprie|scorporo|frazionamento|delisting',
  macro: '\\bfed\\b|federal reserve|\\bfomc\\b|powell|\\becb\\b|\\bbce\\b|lagarde|bank of england|bank of japan|central bank|banca centrale|interest rates?|rate (cut|hike)|tassi|inflation|inflazione|\\bcpi\\b|\\bpce\\b|\\bgdp\\b|\\bpil\\b|payrolls|jobs report|unemployment|disoccupazione|recession|recessione|treasury yields?|bond yields?|rendimenti|tariffs?|dazi|trade war|guerra commerciale|\\bpmi\\b',
  regole: '\\bsec\\b|securities and exchange commission|\\bconsob\\b|\\besma\\b|\\bfinra\\b|regulator|regulation|regolament|normativa|antitrust|competition authority|lawsuit|court ruling|judge|tribunale|sentenza|\\bfine[sd]?\\b|multa|sanzion|tax(es)?\\b|fisco|tobin|golden power|vigilanza|delisting rule|trading halt|sospension',
  esperti: 'analyst|strategist|economist|interview|opinion|outlook|analista|strategist|intervista|opinione',
  rischi: 'fraud|frode|truff|scam|ponzi|insider trading|market manipulation|manipolazione|aggiotaggio|short seller|short report|accounting (irregularit|scandal)|restat|profit warning|bankrupt|bankruptcy|chapter 11|insolven|default|fallimento|crac|class action|investor alert|phishing|abusiv|oscurat|trading halt|halted|sospes|indagat|inchiesta|probe|investigation|charged with|accusat',
};

export const FLAG_PATTERNS: Record<string, RegExp> = {
  rumor: /\b(reportedly|rumou?rs?|according to (people|sources|a source|insiders)|people familiar|allegedly|unconfirmed|speculation|leaked|insiders say|indiscrezion\w*|secondo fonti|rumors?|voci di)\b/i,
  denial: /\b(denies|denied|deny|refutes?|debunk(s|ed)?|fake news|false (report|claim)s?|smentisc\w*|smentit\w*|not true|no plans? to)\b/i,
  urgent: /\b(trading (halt|halted|suspended)|halts? trading|circuit breaker|flash crash|files? for bankruptcy|chapter 11|insolven\w*|bankrupt\w*|default(s|ed)?\b|profit warning|accounting fraud|sospes[oa] (dalle contrattazioni|per eccesso)|sospensione (del titolo|delle contrattazioni)|fallimento|crac\b|emergency (rate|meeting)|taglio d.emergenza)\b/i,
  breaking: /^breaking\b|\bbreaking:|\bjust in\b|^ultim.ora\b|\bultim.ora:/i,
  prediction: /\b(price target|target price|upgrade[sd]?|downgrade[sd]?|could (rise|soar|surge|crash|fall)|predicts?|stock pick|buy rating|sell rating|previsione|previsioni|prezzo obiettivo|target price|raccomandazione|promuove|boccia)\b/i,
  sponsored: /\b(sponsored|press release|partner content|paid content|advertorial|comunicato sponsorizzato|contenuto sponsorizzato|publiredazionale)\b/i,
};

type IndexEntry = { id: string; re: RegExp; prio: number };
let idx: IndexEntry[] | null = null;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Indice per riconoscere titoli e indici nelle notizie:
 *  - nomi della società (sensibili alle maiuscole, per evitare parole comuni come "meta" o "visa");
 *  - ticker solo se preceduto da "$" o tra parentesi con la borsa, es. "(NASDAQ: AAPL)" o "(AAPL)".
 */
export function instrumentIndex(): IndexEntry[] {
  if (idx) return idx;
  const out: IndexEntry[] = [];
  for (const i of INSTRUMENTS) {
    const names = [...new Set([...(i.aka ?? []), ...(i.kind === 'stock' && (i.aka ?? []).length === 0 && i.name.length >= 4 && !/\(/.test(i.name) ? [i.name] : [])])].filter((n) => n.length >= 3);
    const prio = i.kind === 'index' ? 0 : i.major ? 1 : 2;
    if (names.length) out.push({ id: i.id, prio, re: new RegExp(`(?<![\\w-])(?:${names.map(escapeRe).join('|')})(?![\\w-])`) });
    if (i.kind === 'stock' && /^[A-Z][A-Z.-]{0,5}$/.test(i.y)) {
      const t = escapeRe(i.y.replace('-', '.'));
      out.push({ id: i.id, prio, re: new RegExp(`\\$${t}\\b|\\((?:(?:NASDAQ|NYSE|Nasdaq|Nyse)\\s*:\\s*)?${t}\\)`) });
    }
  }
  idx = out;
  return out;
}

export function detectInstruments(text: string): string[] {
  const found = new Map<string, number>();
  for (const e of instrumentIndex()) {
    if (found.has(e.id)) continue;
    if (e.re.test(text)) found.set(e.id, e.prio);
  }
  return [...found.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6).map(([id]) => id);
}

let kwCache: { key: string; compiled: Record<string, RegExp> } | null = null;
function categoryRegexes(): Record<string, RegExp> {
  const custom = getSetting<Record<string, string>>('category_keywords', {});
  const merged = { ...DEFAULT_CATEGORY_KEYWORDS, ...custom };
  const key = JSON.stringify(merged);
  if (kwCache?.key === key) return kwCache.compiled;
  const compiled: Record<string, RegExp> = {};
  for (const [k, v] of Object.entries(merged)) {
    try {
      compiled[k] = new RegExp(v, 'i');
    } catch {
      compiled[k] = new RegExp(DEFAULT_CATEGORY_KEYWORDS[k] ?? '(?!)', 'i');
    }
  }
  kwCache = { key, compiled };
  return compiled;
}

export function classify(title: string, excerpt: string, sourceCategory: string, sectionHint: string | null) {
  const text = `${title}. ${excerpt}`;
  const cats = new Set<string>();
  const res = categoryRegexes();
  for (const [cat, re] of Object.entries(res)) {
    if (cat === 'esperti') continue;
    // per le categorie "larghe" si usa solo il titolo, per ridurre i falsi positivi
    const target = ['regole', 'rischi', 'macro', 'asia'].includes(cat) ? title : text;
    if (re.test(target)) cats.add(cat);
  }
  if (sectionHint) cats.add(sectionHint);
  if (sourceCategory === 'expert') cats.add('esperti');
  if (sourceCategory === 'regulator') cats.add('regole');
  if (sourceCategory === 'macro') cats.add('macro');
  const flags: string[] = [];
  for (const [f, re] of Object.entries(FLAG_PATTERNS)) {
    const target = f === 'breaking' || f === 'denial' || f === 'rumor' || f === 'urgent' ? title : text;
    if (re.test(target)) flags.push(f);
  }
  if (flags.includes('urgent')) cats.add('rischi');
  const coins = detectInstruments(text);
  // la regione dei titoli citati si aggiunge alle sezioni (es. una notizia su Eni va in "Italia")
  for (const id of coins) {
    const r = INSTRUMENT_BY_ID[id]?.region;
    if (r && r !== 'americhe') cats.add(r);
  }
  return { categories: [...cats], coins, flags };
}
