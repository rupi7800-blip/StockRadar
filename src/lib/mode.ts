/** Modalità di esecuzione (sicuro anche lato client).
 *  - server: app completa con API, database e scheduler (npm start / Docker / hosting Node)
 *  - statica: sito pre-generato per GitHub Pages, aggiornato da GitHub Actions (NEXT_PUBLIC_STATIC=1) */
export const STATIC = process.env.NEXT_PUBLIC_STATIC === '1';
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';
export const UPDATE_EVERY_MIN = Number(process.env.NEXT_PUBLIC_UPDATE_EVERY_MIN || 30);
export const withBase = (p: string) => BASE + p;
export const dataUrl = (file: string) => `${BASE}/data/${file}`;
