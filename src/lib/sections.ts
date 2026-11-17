/** Definizione delle sezioni (condivisa server/client). */
export type SectionId = 'italia' | 'usa' | 'europa' | 'asia' | 'risultati' | 'operazioni' | 'macro' | 'regole' | 'esperti' | 'rischi';

export const SECTIONS: { id: SectionId; label: string; href: string; color: string; icon: string; desc: string }[] = [
  { id: 'italia', label: 'Italia', href: '/italia', color: '#22c55e', icon: '◧', desc: 'Piazza Affari, FTSE MIB, società italiane quotate, Consob' },
  { id: 'usa', label: 'Wall Street', href: '/usa', color: '#3b82f6', icon: '$', desc: 'S&P 500, Nasdaq, Dow Jones e grandi società americane' },
  { id: 'europa', label: 'Europa', href: '/europa', color: '#a78bfa', icon: '€', desc: 'Stoxx, DAX, CAC 40, FTSE 100, IBEX e titoli europei' },
  { id: 'asia', label: 'Asia', href: '/asia', color: '#f43f5e', icon: '◐', desc: 'Giappone, Cina e Hong Kong, India, Corea, Taiwan, Australia' },
  { id: 'risultati', label: 'Trimestrali e dividendi', href: '/risultati', color: '#eab308', icon: '∑', desc: 'Conti trimestrali, stime, guidance, dividendi e calendario' },
  { id: 'operazioni', label: 'IPO e operazioni', href: '/operazioni', color: '#ec4899', icon: '⇄', desc: 'Quotazioni, fusioni, acquisizioni, OPA, buyback, aumenti di capitale' },
  { id: 'macro', label: 'Macro e banche centrali', href: '/macro', color: '#06b6d4', icon: '%', desc: 'Fed, BCE, tassi, inflazione, lavoro, dazi: ciò che muove le borse' },
  { id: 'regole', label: 'Regole e vigilanza', href: '/regole', color: '#a3a3a3', icon: '§', desc: 'SEC, Consob, ESMA, sospensioni, fisco e normative' },
  { id: 'esperti', label: 'Esperti', href: '/esperti', color: '#14b8a6', icon: '✎', desc: 'Analisi e opinioni a confronto' },
  { id: 'rischi', label: 'Rischi e tutele', href: '/rischi', color: '#ef4444', icon: '⛨', desc: 'Frodi, insider trading, sanzioni, profit warning, truffe agli investitori' },
];

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));

export const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  CONFERMATA: { label: 'Confermata', cls: 'bg-up/15 text-up border-up/40' },
  'CONFERMATA PARZIALMENTE': { label: 'Confermata parzialmente', cls: 'bg-info/15 text-info border-info/40' },
  'NON VERIFICATA': { label: 'Non verificata', cls: 'bg-warn/15 text-warn border-warn/40' },
  SMENTITA: { label: 'Smentita', cls: 'bg-down/15 text-down border-down/40' },
};
export const STATUSES = Object.keys(STATUS_STYLE);
