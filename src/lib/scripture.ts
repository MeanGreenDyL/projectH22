/** Build-time access to the bundled scripture layer. Never called in the browser. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, ScriptureBook, Translation, type BookInfo, type TranslationId } from '../schemas';

const ROOT = join(process.cwd(), 'src/data/scripture');
const bookCache = new Map<string, ScriptureBook>();

export function translations(): Translation[] {
  return (JSON.parse(readFileSync(join(ROOT, 'translations.json'), 'utf8')) as unknown[]).map((t) => Translation.parse(t));
}

export function loadBook(translation: TranslationId, code: string): ScriptureBook {
  const key = `${translation}/${code}`;
  let b = bookCache.get(key);
  if (!b) {
    b = ScriptureBook.parse(JSON.parse(readFileSync(join(ROOT, translation, `${code}.json`), 'utf8')));
    bookCache.set(key, b);
  }
  return b;
}

/** Books bundled for a translation, in registry order. */
export function booksFor(translation: TranslationId): BookInfo[] {
  const codes = new Set(readdirSync(join(ROOT, translation)).map((f) => f.replace(/\.json$/, '')));
  return BOOKS.filter((b) => codes.has(b.code));
}

export type CrossRef = [string, number, number, number, number, number, string?];
const xrefCache = new Map<string, Record<string, CrossRef[]>>();

export function crossRefs(code: string): Record<string, CrossRef[]> {
  if (!xrefCache.has(code)) {
    try {
      xrefCache.set(code, (JSON.parse(readFileSync(join(ROOT, 'crossrefs', `${code}.json`), 'utf8')) as { refs: Record<string, CrossRef[]> }).refs);
    } catch {
      xrefCache.set(code, {});
    }
  }
  return xrefCache.get(code)!;
}

export function bookSlug(code: string): string {
  return code.toLowerCase();
}
