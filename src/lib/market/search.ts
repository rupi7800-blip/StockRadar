import { INSTRUMENTS, displaySymbol, KIND_LABEL, type Instrument } from './catalog';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export type InstrumentHit = { id: string; name: string; symbol: string; kind: string; country: string };

/** Ricerca nel catalogo (nome, simbolo, nomi alternativi). Funziona anche nel browser: nessuna chiamata di rete. */
export function searchInstruments(q: string, limit = 10): InstrumentHit[] {
  const ql = norm(q.trim());
  if (ql.length < 1) return [];
  const score = (i: Instrument) => {
    const sym = norm(displaySymbol(i)), y = norm(i.y.replace(/^\^/, '')), name = norm(i.name);
    if (sym === ql || y === ql || i.id === ql) return 0;
    if (name.startsWith(ql)) return 1;
    if ((i.aka ?? []).some((a) => norm(a).startsWith(ql))) return 2;
    if (ql.length >= 3 && (name.includes(ql) || (i.aka ?? []).some((a) => norm(a).includes(ql)))) return 3;
    return 99;
  };
  return INSTRUMENTS.map((i) => [i, score(i)] as const).filter(([, s]) => s < 99).sort((a, b) => a[1] - b[1]).slice(0, limit)
    .map(([i]) => ({ id: i.id, name: i.name, symbol: displaySymbol(i), kind: KIND_LABEL[i.kind], country: i.country }));
}
