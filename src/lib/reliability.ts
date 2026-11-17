import 'server-only';
import { all, get, run, jparse } from './db';

export type Status = 'CONFERMATA' | 'CONFERMATA PARZIALMENTE' | 'NON VERIFICATA' | 'SMENTITA';

type Member = { id: number; title: string; source_id: string; source_name: string; tier: string; official: number; owner_group: string | null; category: string; flags: string; published_at: string };

/**
 * Sistema di affidabilità trasparente: ogni stato è accompagnato dall'elenco dei motivi.
 * Regole (documentate anche nella pagina /metodologia):
 *  - SMENTITA: un articolo del gruppo riporta una smentita esplicita nel titolo.
 *  - CONFERMATA: almeno una fonte primaria/ufficiale (autorità di vigilanza, banca centrale, istituto statistico) riporta l'evento.
 *  - CONFERMATA PARZIALMENTE: almeno 2 gruppi editoriali indipendenti (testate affermate), senza linguaggio da indiscrezione.
 *  - NON VERIFICATA: tutti gli altri casi (fonte singola, indiscrezioni, solo community).
 * Più testate dello stesso gruppo editoriale contano come UNA fonte. Anche testate diverse possono riprendere
 * la stessa fonte originale: per questo, senza una fonte primaria, lo stato massimo è "confermata parzialmente".
 */
export function evaluateCluster(clusterId: number) {
  const members = all<Member>(
    `SELECT a.id, a.title, a.source_id, s.name AS source_name, s.tier, s.official, s.owner_group, s.category, a.flags, a.published_at
     FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.cluster_id = ? ORDER BY a.published_at ASC`,
    clusterId,
  );
  if (!members.length) return;
  const reasons: string[] = [];
  const flagsOf = (m: Member) => jparse<string[]>(m.flags, []);
  const groups = new Map<string, Member[]>();
  for (const m of members) {
    const g = m.owner_group || m.source_id;
    groups.set(g, [...(groups.get(g) ?? []), m]);
  }
  const official = members.filter((m) => m.official === 1 || m.tier === 'A');
  const denial = members.filter((m) => flagsOf(m).includes('denial'));
  const rumor = members.filter((m) => flagsOf(m).includes('rumor'));
  const indepB = [...groups.entries()].filter(([, ms]) => ms.some((m) => (m.tier === 'B' || m.tier === 'A') && !flagsOf(m).includes('rumor')));
  const community = members.every((m) => m.tier === 'D');

  let status: Status;
  if (denial.length) {
    status = 'SMENTITA';
    for (const d of denial.slice(0, 3)) reasons.push(`${d.source_name} riporta una smentita: «${d.title}».`);
    reasons.push('Verificare la fonte originale: una smentita può riguardare solo una parte della notizia.');
  } else if (official.length) {
    status = 'CONFERMATA';
    for (const o of official.slice(0, 3)) reasons.push(`Riportata da fonte primaria/ufficiale: ${o.source_name}.`);
  } else if (indepB.length >= 2 && !rumor.length) {
    status = 'CONFERMATA PARZIALMENTE';
    reasons.push(`Riportata da ${indepB.length} gruppi editoriali indipendenti: ${indepB.map(([g]) => g).slice(0, 5).join(', ')}.`);
    reasons.push('Nessuna conferma da fonte ufficiale: le testate potrebbero riprendere la stessa fonte originale.');
  } else {
    status = 'NON VERIFICATA';
    if (community) reasons.push('Presente solo su canali community (Reddit/social): non costituisce conferma.');
    if (rumor.length) reasons.push(`Linguaggio da indiscrezione («reportedly», «secondo fonti»…) in ${rumor.length} articolo/i.`);
    if (groups.size === 1) reasons.push(`Una sola fonte${members.length > 1 ? ' (più articoli dello stesso gruppo editoriale)' : ''}: ${members[0].source_name}.`);
    else if (indepB.length < 2) reasons.push(`${groups.size} fonti, ma meno di 2 testate affermate indipendenti.`);
  }
  if (members.length > 1 && groups.size < members.length) reasons.push(`${members.length} articoli raggruppati, ${groups.size} gruppi editoriali distinti (gli articoli dello stesso gruppo non contano come conferme indipendenti).`);
  reasons.push(`Prima pubblicazione rilevata: ${new Date(members[0].published_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}.`);

  const cur = get<{ status: string; status_override: string | null }>('SELECT status, status_override FROM clusters WHERE id = ?', clusterId);
  if (cur && cur.status !== status) {
    run('INSERT INTO reliability_history(cluster_id, old_status, new_status, note) VALUES(?,?,?,?)', clusterId, cur.status, status, reasons[0] ?? null);
  }
  run(
    'UPDATE clusters SET status = ?, reasons = ?, size = ?, independent_groups = ?, last_seen = ? WHERE id = ?',
    status, JSON.stringify(reasons), members.length, groups.size, members[members.length - 1].published_at, clusterId,
  );
}

export function effectiveStatus(c: { status: string; status_override: string | null }) {
  return (c.status_override || c.status) as Status;
}
