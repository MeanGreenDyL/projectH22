/**
 * pnpm scripture:ingest — build src/data/scripture from .cache/scripture-src.
 * Writes one JSON file per book per translation and the translations.json manifest.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ScriptureBook, Translation } from '../../src/schemas/scripture';
import { parseOsis, parseSaorsaBook, parseUsfx, parseZefania, type ParsedBook } from './parsers';
import { UPSTREAM } from './sources';

const CACHE_DIR = '.cache/scripture-src';
const OUT_DIR = 'src/data/scripture';
const retrievedAt = process.env.RETRIEVED_AT ?? new Date().toISOString().slice(0, 10);

const manifest: Translation[] = [];
for (const src of UPSTREAM) {
  const dir = join(CACHE_DIR, src.translation);
  const contents = src.files.map((f) => readFileSync(join(dir, f.name), 'utf8'));
  const sha256 = contents.map((c) => createHash('sha256').update(c).digest('hex'));

  let books: ParsedBook[];
  switch (src.format) {
    case 'usfx': books = contents.flatMap((c) => parseUsfx(c)); break;
    case 'osis': books = contents.flatMap((c) => parseOsis(c)); break;
    case 'zefania': books = contents.flatMap((c) => parseZefania(c)); break;
    case 'saorsa': books = contents.map((c) => parseSaorsaBook(c)); break;
  }

  const outDir = join(OUT_DIR, src.translation);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  let verseCount = 0;
  for (const b of books) {
    const renumber = src.renumberChapters?.[b.code];
    if (renumber) for (const c of b.chapters) c.chapter = renumber[c.chapter] ?? c.chapter;
    if (b.chapters.length === 0) throw new Error(`${src.translation} ${b.code}: no verses parsed`);
    const record = ScriptureBook.parse({ translation: src.translation, ...b });
    verseCount += record.chapters.reduce((n, c) => n + c.verses.length, 0);
    writeFileSync(join(outDir, `${b.code}.json`), `${JSON.stringify(record)}\n`);
  }
  manifest.push(
    Translation.parse({
      id: src.translation,
      name: src.name,
      license: src.license,
      versification: src.versification,
      source: { url: src.homepage, sha256, retrievedAt },
      books: books.map((b) => b.code),
      verseCount,
      ...(src.notes ? { notes: src.notes } : {}),
    }),
  );
  console.log(`${src.translation}: ${books.length} books, ${verseCount} verses`);
}
writeFileSync(join(OUT_DIR, 'translations.json'), `${JSON.stringify(manifest, null, 2)}\n`);
