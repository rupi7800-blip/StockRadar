/**
 * Build della versione statica per GitHub Pages.
 * Copia il progetto in una cartella temporanea, rimuove le parti che richiedono un server (API, middleware, scheduler),
 * rende le pagine statiche e genera il sito in ./out leggendo il database prodotto da scripts/ingest.ts.
 *
 * Variabili: NEXT_PUBLIC_BASE_PATH (es. /StockRadar), STATIC_DAYS (giorni di notizie pubblicate, default 7),
 *            NEXT_PUBLIC_UPDATE_EVERY_MIN (frequenza dichiarata), DATABASE_PATH.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-static-'));
const skip = new Set(['node_modules', '.next', 'out', 'data', '.git']);
fs.cpSync(root, tmp, { recursive: true, filter: (src) => !skip.has(path.relative(root, src).split(path.sep)[0]) });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');

// 1) via le parti server
for (const p of ['src/app/api', 'src/middleware.ts', 'src/instrumentation.ts']) fs.rmSync(path.join(tmp, p), { recursive: true, force: true });

// 2) pagine statiche: force-dynamic -> force-static (cookies/searchParams diventano vuoti, nessun errore)
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(tmp, 'src/app')).filter((f) => /\.(ts|tsx)$/.test(f))) {
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes("'force-dynamic'")) fs.writeFileSync(f, s.replaceAll("export const dynamic = 'force-dynamic';", "export const dynamic = 'force-static';"));
}

// 3) manifest PWA con il percorso base
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
const mf = JSON.parse(fs.readFileSync(path.join(tmp, 'public/manifest.webmanifest'), 'utf8'));
mf.start_url = base + '/';
mf.scope = base + '/';
mf.icons = mf.icons.map((i) => ({ ...i, src: base + i.src }));
mf.shortcuts = (mf.shortcuts ?? []).map((s) => ({ ...s, url: base + s.url + '/' }));
fs.writeFileSync(path.join(tmp, 'public/manifest.webmanifest'), JSON.stringify(mf, null, 2));
fs.writeFileSync(path.join(tmp, 'public/.nojekyll'), '');

// 4) build
const env = {
  ...process.env,
  STATIC_EXPORT: '1',
  NEXT_PUBLIC_STATIC: '1',
  NEXT_PUBLIC_BASE_PATH: base,
  NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  NEXT_PUBLIC_UPDATE_EVERY_MIN: process.env.NEXT_PUBLIC_UPDATE_EVERY_MIN || '30',
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(root, 'data', 'stock-radar.db'),
  DISABLE_SCHEDULER: '1',
  NEXT_TELEMETRY_DISABLED: '1',
};
execSync('npx next build', { cwd: tmp, env, stdio: 'inherit' });
fs.rmSync(path.join(root, 'out'), { recursive: true, force: true });
fs.cpSync(path.join(tmp, 'out'), path.join(root, 'out'), { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });
const count = walk(path.join(root, 'out')).filter((f) => f.endsWith('.html')).length;
console.log(`Sito statico generato in ./out (${count} pagine)`);
