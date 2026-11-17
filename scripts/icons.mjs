// Genera le icone PNG della PWA dall'SVG (richiede Playwright, solo in sviluppo).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
const svg = fs.readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
for (const s of [192, 512]) {
  await p.setViewportSize({ width: s, height: s });
  await p.setContent(`<html><body style="margin:0;background:#0b0d10">${svg.replace('<svg ', `<svg width="${s}" height="${s}" `)}</body></html>`);
  await p.screenshot({ path: `public/icons/icon-${s}.png`, omitBackground: false });
}
await b.close();
