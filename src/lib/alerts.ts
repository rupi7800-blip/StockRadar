import 'server-only';
import { all, run, get, getCache, jparse } from './db';
import { pushToDevice } from './push';
import type { Quote } from './market/types';
import { fmtPrice, fmtPct } from './text';
import { findQuote } from './market/find';

/** Tipi di avviso (condivisi con la versione statica, che li valuta nel browser). */
export const ALERT_TYPES: Record<string, { label: string; needsTarget: boolean; needsThreshold: boolean; hint: string }> = {
  price_above: { label: 'Prezzo sopra soglia', needsTarget: true, needsThreshold: true, hint: 'Titolo o indice + prezzo nella sua valuta' },
  price_below: { label: 'Prezzo sotto soglia', needsTarget: true, needsThreshold: true, hint: 'Titolo o indice + prezzo nella sua valuta' },
  change_day: { label: 'Variazione nella seduta oltre ±%', needsTarget: true, needsThreshold: true, hint: 'Titolo o indice + percentuale (es. 4)' },
  volume_spike: { label: 'Volumi anomali', needsTarget: true, needsThreshold: true, hint: 'Titolo + multiplo della media di 20 sedute (es. 2)' },
  high_low: { label: 'Nuovo massimo o minimo a 52 settimane', needsTarget: true, needsThreshold: false, hint: 'Titolo o indice' },
  index_move: { label: 'Un indice mondiale si muove oltre ±%', needsTarget: false, needsThreshold: true, hint: 'Percentuale (es. 2)' },
  vix_above: { label: 'VIX (volatilità) sopra soglia', needsTarget: false, needsThreshold: true, hint: 'Livello (es. 25)' },
  stock_news: { label: 'Notizie su un titolo', needsTarget: true, needsThreshold: false, hint: 'Titolo (es. Eni, AAPL)' },
  watchlist_results: { label: 'Trimestrali e dividendi dei titoli in watchlist', needsTarget: false, needsThreshold: false, hint: '' },
  watchlist_news: { label: 'Tutte le notizie sui titoli in watchlist', needsTarget: false, needsThreshold: false, hint: '' },
  breaking: { label: 'Notizie urgenti (breaking)', needsTarget: false, needsThreshold: false, hint: '' },
  risk: { label: 'Allarmi confermati (frodi, sospensioni, fallimenti)', needsTarget: false, needsThreshold: false, hint: '' },
  operations: { label: 'IPO, OPA, fusioni e acquisizioni', needsTarget: false, needsThreshold: false, hint: '' },
  italy: { label: 'Notizie importanti su Piazza Affari', needsTarget: false, needsThreshold: false, hint: '' },
  macro: { label: 'Banche centrali e dati macro ufficiali', needsTarget: false, needsThreshold: false, hint: '' },
  keyword: { label: 'Parola chiave nelle notizie', needsTarget: true, needsThreshold: false, hint: 'Parola o frase' },
  expert: { label: 'Nuovi contributi di un esperto/fonte', needsTarget: true, needsThreshold: false, hint: 'Id della fonte (es. damodaran)' },
};

type Rule = { id: number; device_id: string; type: string; target: string | null; threshold: number | null; cooldown_min: number; push: number; last_fired: string | null };

function emit(rule: Rule, dedupe: string, title: string, body: string, url: string) {
  const r = run('INSERT OR IGNORE INTO alert_events(device_id, rule_id, title, body, url, dedupe_key) VALUES(?,?,?,?,?,?)', rule.device_id, rule.id, title, body, url, `${rule.id}:${dedupe}`);
  if (!r.changes) return false;
  run('UPDATE alert_rules SET last_fired = ? WHERE id = ?', new Date().toISOString(), rule.id);
  if (rule.push) pushToDevice(rule.device_id, { title, body, url, tag: `r${rule.id}` }).catch(() => null);
  return true;
}

function coolingDown(rule: Rule) {
  return rule.last_fired && Date.now() - Date.parse(rule.last_fired) < rule.cooldown_min * 60e3;
}

/** Valuta tutte le regole attive. Deduplica per evento e rispetta il periodo di silenzio (cooldown) di ogni regola. */
export function evaluateAlerts() {
  const rules = all<Rule>('SELECT * FROM alert_rules WHERE enabled = 1');
  if (!rules.length) return 0;
  const quotes = (getCache<Quote[]>('market:quotes').value ?? []).filter((q) => !q.stale);
  const since = new Date(Date.now() - 2 * 3600e3).toISOString();
  const recent = all<{ id: number; title: string; title_it: string | null; categories: string; coins: string; flags: string; source_id: string; is_breaking: number; cluster_id: number; status: string; source_cat: string; importance: number }>(
    `SELECT a.id, a.title, a.title_it, a.categories, a.coins, a.flags, a.source_id, a.is_breaking, a.cluster_id, COALESCE(c.status_override, c.status) AS status, s.category AS source_cat, a.importance
     FROM articles a JOIN clusters c ON c.id = a.cluster_id JOIN sources s ON s.id = a.source_id WHERE a.fetched_at >= ? OR a.published_at >= ? ORDER BY a.published_at DESC LIMIT 300`,
    since.replace('T', ' ').slice(0, 19), since,
  );
  const day = new Date().toISOString().slice(0, 10);
  let fired = 0;
  for (const rule of rules) {
    if (coolingDown(rule)) continue;
    const q = findQuote(quotes, rule.target);
    const t = rule.threshold ?? 0;
    const url = q ? `/titolo/${q.id}` : '/mercati';
    const ttl = (a: { title: string; title_it: string | null }) => a.title_it || a.title;
    const sess = q?.marketTime?.slice(0, 10) ?? day;
    switch (rule.type) {
      case 'price_above':
        if (q?.price != null && q.price >= t && emit(rule, `above:${sess}`, `${q.name} sopra ${fmtPrice(t, q.currency, q.kind)}`, `Ultimo prezzo ${fmtPrice(q.price, q.currency, q.kind)} (${q.source}, dato ritardato)`, url)) fired++;
        break;
      case 'price_below':
        if (q?.price != null && q.price <= t && emit(rule, `below:${sess}`, `${q.name} sotto ${fmtPrice(t, q.currency, q.kind)}`, `Ultimo prezzo ${fmtPrice(q.price, q.currency, q.kind)} (${q.source}, dato ritardato)`, url)) fired++;
        break;
      case 'change_day':
        if (q?.ch1d != null && Math.abs(q.ch1d) >= t && emit(rule, `ch:${sess}`, `${q.name} ${fmtPct(q.ch1d)} nella seduta`, `Soglia ±${t}% superata. Prezzo ${fmtPrice(q.price, q.currency, q.kind)}`, url)) fired++;
        break;
      case 'volume_spike':
        if (q?.volRatio != null && q.volRatio >= (t || 2) && emit(rule, `vol:${sess}`, `Volumi anomali su ${q.name}`, `${q.volRatio.toFixed(1)}× la media delle ultime 20 sedute`, url)) fired++;
        break;
      case 'high_low':
        if (q?.price != null && q.high52 != null && q.price >= q.high52 * 0.999 && emit(rule, `hi:${sess}`, `${q.name}: nuovo massimo a 52 settimane`, `Prezzo ${fmtPrice(q.price, q.currency, q.kind)}`, url)) fired++;
        else if (q?.price != null && q.low52 != null && q.price <= q.low52 * 1.001 && emit(rule, `lo:${sess}`, `${q.name}: nuovo minimo a 52 settimane`, `Prezzo ${fmtPrice(q.price, q.currency, q.kind)}`, url)) fired++;
        break;
      case 'index_move': {
        const m = quotes.filter((x) => x.kind === 'index' && x.ch1d != null && Math.abs(x.ch1d) >= (t || 2)).sort((a, b) => Math.abs(b.ch1d!) - Math.abs(a.ch1d!))[0];
        if (m && emit(rule, `ix:${m.id}:${m.marketTime?.slice(0, 10)}`, `${m.name} ${fmtPct(m.ch1d)}`, `Movimento oltre ±${t || 2}% nella seduta`, `/titolo/${m.id}`)) fired++;
        break;
      }
      case 'vix_above': {
        const v = quotes.find((x) => x.id === 'vix');
        if (v?.price != null && v.price >= (t || 25) && emit(rule, `vix:${v.marketTime?.slice(0, 10)}`, `VIX a ${v.price.toFixed(1)}`, `Sopra la soglia di ${t || 25}: volatilità attesa elevata sull'S&P 500`, '/titolo/vix')) fired++;
        break;
      }
      default: {
        const wl = rule.type.startsWith('watchlist') ? all<{ item_id: string }>("SELECT item_id FROM watchlist WHERE device_id = ? AND item_type = 'stock'", rule.device_id).map((x) => x.item_id) : [];
        for (const a of recent) {
          const cats = jparse<string[]>(a.categories, []);
          const cs = jparse<string[]>(a.coins, []);
          const flags = jparse<string[]>(a.flags, []);
          let match = false;
          if (rule.type === 'breaking') match = a.is_breaking === 1 && a.status !== 'SMENTITA';
          else if (rule.type === 'risk') match = flags.includes('urgent') && (a.status === 'CONFERMATA' || a.status === 'CONFERMATA PARZIALMENTE' || a.source_cat === 'regulator');
          else if (rule.type === 'operations') match = cats.includes('operazioni') && !flags.includes('rumor') && a.importance >= 30;
          else if (rule.type === 'italy') match = cats.includes('italia') && a.importance >= 35 && a.status !== 'SMENTITA';
          else if (rule.type === 'stock_news') match = !!q && cs.includes(q.id);
          else if (rule.type === 'keyword') match = !!rule.target && (ttl(a).toLowerCase().includes(rule.target.toLowerCase()) || a.title.toLowerCase().includes(rule.target.toLowerCase()));
          else if (rule.type === 'expert') match = a.source_id === rule.target;
          else if (rule.type === 'macro') match = a.source_cat === 'regulator' || a.source_cat === 'macro';
          else if (rule.type === 'watchlist_news') match = cs.some((c) => wl.includes(c));
          else if (rule.type === 'watchlist_results') match = cats.includes('risultati') && cs.some((c) => wl.includes(c));
          // una notifica per evento (cluster), non per ogni articolo che lo riprende
          if (match && emit(rule, `c${a.cluster_id}`, ALERT_TYPES[rule.type]?.label ?? 'Avviso', ttl(a), `/notizia/${a.id}`)) {
            fired++;
            break; // max 1 notifica per regola per ciclo: niente raffiche
          }
        }
      }
    }
  }
  return fired;
}

export function unreadCount(deviceId: string) {
  return get<{ n: number }>('SELECT COUNT(*) AS n FROM alert_events WHERE device_id = ? AND read = 0', deviceId)?.n ?? 0;
}
