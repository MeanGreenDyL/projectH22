/**
 * pnpm scripture:fetch [translation...] — download upstream files into .cache/scripture-src.
 * Uses curl so the environment's HTTPS proxy settings apply.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CROSS_REFERENCES, UPSTREAM } from './sources';

export const CACHE_DIR = '.cache/scripture-src';

const wanted = new Set(process.argv.slice(2));
for (const src of UPSTREAM) {
  if (wanted.size > 0 && !wanted.has(src.translation)) continue;
  const dir = join(CACHE_DIR, src.translation);
  mkdirSync(dir, { recursive: true });
  for (const f of src.files) {
    const dest = join(dir, f.name);
    if (existsSync(dest) && !process.env.REFETCH) continue;
    execFileSync('curl', ['-sSfL', '--retry', '3', '-o', dest, f.url], { stdio: 'inherit' });
  }
  console.log(`fetched ${src.translation}: ${src.files.length} file(s)`);
}

if (wanted.size === 0 || wanted.has('crossrefs')) {
  mkdirSync(join(CACHE_DIR, 'crossrefs'), { recursive: true });
  const dest = join(CACHE_DIR, 'crossrefs', CROSS_REFERENCES.file.name);
  if (!existsSync(dest) || process.env.REFETCH) execFileSync('curl', ['-sSfL', '--retry', '3', '-o', dest, CROSS_REFERENCES.file.url], { stdio: 'inherit' });
  console.log('fetched crossrefs');
}
