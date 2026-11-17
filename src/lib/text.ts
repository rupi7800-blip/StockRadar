/** Utility testuali condivise (server e client). Nessun HTML esterno viene mai renderizzato: solo testo. */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', euro: '€' };

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripHtml(s: string) {
  return decodeEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

/** Accetta solo URL http(s): impedisce javascript:, data: ecc. nei link renderizzati. */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  try {
    const url = new URL(u.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const STOP = new Set(
  'the a an and or of to in on for with at by from as is are was were be been has have had it its this that these those after before over under into about amid says said new will could may might not no yes but than then now just more most up down out why how what who when where which via vs per il lo la i gli le un una di da in con su tra fra e o che non del della dei delle al alla ai agli nel nella sul sulla è sono'.split(
    ' ',
  ),
);

export function tokens(title: string): string[] {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9$%. ]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}

export function jaccard(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function fmtUsd(n: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (n == null || !Number.isFinite(n)) return 'n.d.';
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 1e12) return '$' + (n / 1e12).toFixed(2) + ' T';
    if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + ' Mld';
    if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + ' Mln';
    if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'k';
  }
  const digits = Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 1 ? 2 : Math.abs(n) >= 0.01 ? 4 : 8;
  return '$' + n.toLocaleString('it-IT', { minimumFractionDigits: Math.min(digits, 2), maximumFractionDigits: digits });
}
export function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return 'n.d.';
  return n.toLocaleString('it-IT', { maximumFractionDigits: digits });
}
export function fmtPct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return 'n.d.';
  return (n > 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + '%';
}
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'mai';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'n.d.';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'adesso';
  if (s < 3600) return `${Math.floor(s / 60)} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} h fa`;
  return `${Math.floor(s / 86400)} g fa`;
}
export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return 'n.d.';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'n.d.';
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
}
export function fmtTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
}

const CUR_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CHF: 'CHF ', HKD: 'HK$', CNY: '¥', INR: '₹', KRW: '₩', TWD: 'NT$', AUD: 'A$', CAD: 'C$', BRL: 'R$', MXN: 'MX$', DKK: 'DKK ', SEK: 'SEK ' };

/** Prezzo nella valuta di quotazione (le azioni di Londra sono in pence: "GBp"). */
export function fmtPrice(n: number | null | undefined, currency: string | null | undefined, kind?: string) {
  if (n == null || !Number.isFinite(n)) return 'n.d.';
  const digits = Math.abs(n) >= 10000 ? 0 : Math.abs(n) >= 1 ? 2 : 4;
  const num = n.toLocaleString('it-IT', { minimumFractionDigits: Math.min(digits, 2), maximumFractionDigits: digits });
  if (kind === 'index') return num;
  if (!currency) return num;
  if (currency === 'GBp' || currency === 'GBX') return `${num} p`;
  const sym = CUR_SYMBOL[currency];
  return sym ? (sym.endsWith(' ') ? sym + num : sym + num) : `${num} ${currency}`;
}

export function fmtCompact(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return 'n.d.';
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2).replace('.', ',') + ' T';
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' Mld';
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' Mln';
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + 'k';
  return n.toLocaleString('it-IT');
}
