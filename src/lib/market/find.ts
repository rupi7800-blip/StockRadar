import type { Quote } from './types';

/** Trova lo strumento indicato dall'utente: id, simbolo (con o senza suffisso di borsa) o nome. */
export function findQuote<T extends Pick<Quote, 'id' | 'symbol' | 'name'>>(quotes: T[], target: string | null | undefined): T | undefined {
  if (!target) return undefined;
  const t = target.trim().toLowerCase();
  return quotes.find((q) => q.id === t) ?? quotes.find((q) => q.symbol.toLowerCase() === t || q.symbol.toLowerCase().replace(/\.[a-z]{1,2}$/, '') === t || q.symbol.toLowerCase().replace(/^\^/, '') === t)
    ?? quotes.find((q) => q.name.toLowerCase() === t) ?? quotes.find((q) => q.name.toLowerCase().startsWith(t));
}

