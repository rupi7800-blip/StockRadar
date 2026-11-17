'use client';
import { dataUrl } from './mode';
import { searchInstruments } from './market/search';

/** Indice di ricerca della versione statica (generato a ogni aggiornamento in /data/search.json). */
export type IdxNews = { id: number; t: string; ti: string | null; s: string; sid: string; at: string; st: string; c: string[]; k: string[]; u: string };
export type Idx = {
  generatedAt: string;
  news: IdxNews[];
  sources: { id: string; name: string; category: string }[];
};

let idx: Promise<Idx> | null = null;
export function loadIndex() {
  idx ??= fetch(dataUrl('search.json')).then((r) => {
    if (!r.ok) throw new Error('indice non disponibile');
    return r.json();
  });
  idx.catch(() => { idx = null; });
  return idx;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Corrispondenza: tutti i termini presenti (supporta "A OR B"). */
export function matcher(q: string) {
  const groups = q.split(/\s+OR\s+/).map((g) => norm(g).split(/\s+/).filter((t) => t.length > 1));
  return (text: string) => {
    const n = norm(text);
    return groups.some((g) => g.length > 0 && g.every((t) => n.includes(t)));
  };
}

export function searchIdx(ix: Idx, q: string, f: { section?: string; status?: string; source?: string; from?: string; to?: string } = {}) {
  const m = q.trim() ? matcher(q) : () => true;
  const news = ix.news.filter((n) =>
    m(`${n.t} ${n.ti ?? ''} ${n.s} ${n.c.join(' ')}`) &&
    (!f.section || n.k.includes(f.section)) && (!f.status || n.st === f.status) && (!f.source || n.sid === f.source) &&
    (!f.from || n.at >= f.from) && (!f.to || n.at <= f.to + 'T23:59:59'),
  );
  const ql = norm(q.trim());
  const has = (s: string) => !!ql && norm(s).includes(ql);
  return {
    news,
    instruments: q.trim() ? searchInstruments(q, 10) : [],
    sources: ix.sources.filter((s) => has(s.name) || has(s.id)).slice(0, 8),
  };
}
