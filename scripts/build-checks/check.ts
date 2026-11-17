/**
 * `pnpm check:dist` — fails on a broken internal link or a page over the performance budget.
 * External links are checked by a separate scheduled job (they need the network).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { candidates, internalTargets, walk } from './lib';

const DIST = 'dist';
/** Per-page budget, gzipped: the HTML itself and the JavaScript it loads (spec §11 Phase 7). */
export const BUDGET = { htmlKb: 120, jsKb: 150 };

const gz = (p: string) => gzipSync(readFileSync(p)).length / 1024;
const pages = walk(DIST).filter((f) => f.endsWith('.html') && !f.includes(`${sep}pagefind${sep}`));
const broken: string[] = [];
const over: string[] = [];
const jsCache = new Map<string, number>();

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const pagePath = '/' + relative(DIST, file).split(sep).join('/');
  for (const t of new Set(internalTargets(html, pagePath))) {
    if (!candidates(t).some((c) => existsSync(join(DIST, c)) && statSync(join(DIST, c)).isFile())) broken.push(`${pagePath} → ${t}`);
  }
  const htmlKb = gzipSync(html).length / 1024;
  // JS: module scripts and island component/renderer URLs referenced from the page.
  const js = new Set([...html.matchAll(/(?:src|component-url|renderer-url)="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]!));
  let jsKb = 0;
  for (const j of js) {
    const p = join(DIST, j);
    if (!existsSync(p)) continue;
    if (!jsCache.has(p)) jsCache.set(p, gz(p));
    jsKb += jsCache.get(p)!;
  }
  if (htmlKb > BUDGET.htmlKb) over.push(`${pagePath}: HTML ${htmlKb.toFixed(1)} KB gz > ${BUDGET.htmlKb}`);
  if (jsKb > BUDGET.jsKb) over.push(`${pagePath}: JS ${jsKb.toFixed(1)} KB gz > ${BUDGET.jsKb}`);
}

console.log(`check:dist: ${pages.length} pages, ${broken.length} broken internal links, ${over.length} over budget`);
for (const b of broken.slice(0, 50)) console.log(`  BROKEN ${b}`);
for (const o of over) console.log(`  BUDGET ${o}`);
if (broken.length || over.length) process.exit(1);
