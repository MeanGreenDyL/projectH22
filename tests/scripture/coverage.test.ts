/**
 * Completeness of the bundled scripture text — the Apocrypha is a common failure point.
 * Runs against src/data/scripture as committed.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BOOK_BY_CODE,
  BOOKS,
  ScriptureBook,
  Translation,
  TRANSLATION_IDS,
  type ScriptureBook as Book,
} from '../../src/schemas';
import { EXPECTED, PROTESTANT_CHAPTER_TOTAL } from './expected';

const ROOT = 'src/data/scripture';

describe('book registry', () => {
  it('has 66 Protestant-canon books totalling 1189 chapters', () => {
    const p = BOOKS.filter((b) => b.canon === 'PROTESTANT-CANON');
    expect(p).toHaveLength(66);
    expect(p.reduce((n, b) => n + b.chapters[1] - b.chapters[0] + 1, 0)).toBe(PROTESTANT_CHAPTER_TOTAL);
  });
  it('has unique codes', () => {
    expect(new Set(BOOKS.map((b) => b.code)).size).toBe(BOOKS.length);
  });
});

const manifest = existsSync(join(ROOT, 'translations.json'))
  ? (JSON.parse(readFileSync(join(ROOT, 'translations.json'), 'utf8')) as unknown[])
  : [];

describe('translation manifest', () => {
  it('lists every bundled translation exactly once and validates', () => {
    const parsed = manifest.map((t) => Translation.parse(t));
    expect(parsed.map((t) => t.id).sort()).toEqual([...TRANSLATION_IDS].sort());
  });
});

describe.each(TRANSLATION_IDS)('%s', (id) => {
  const exp = EXPECTED[id];
  const dir = join(ROOT, id);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const books = new Map<string, Book>(
    files.map((f) => {
      const b = ScriptureBook.parse(JSON.parse(readFileSync(join(dir, f), 'utf8')));
      return [b.code, b];
    }),
  );

  it('has exactly the expected books', () => {
    expect([...books.keys()].sort()).toEqual([...exp.books].sort());
  });

  it.each([...exp.books])('%s has the expected chapters, with verses in order and none repeated', (code) => {
    const book = books.get(code);
    expect(book, `${code} missing`).toBeDefined();
    const [first, last] = exp.chapterOverrides?.[code] ?? BOOK_BY_CODE.get(code)!.chapters;
    expect(book!.chapters.map((c) => c.chapter)).toEqual(Array.from({ length: last - first + 1 }, (_, i) => first + i));
    for (const ch of book!.chapters) {
      const nums = ch.verses.map(([n]) => n);
      expect(new Set(nums).size, `${code} ${ch.chapter} repeats a verse`).toBe(nums.length);
      expect([...nums].sort((a, b) => a - b), `${code} ${ch.chapter} out of order`).toEqual(nums);
    }
  });

  it('contains no leftover markup', () => {
    for (const b of books.values()) {
      for (const ch of b.chapters) {
        for (const [, text] of ch.verses) expect(text).not.toMatch(/<|>|\\[a-z]+\*?\s/);
      }
    }
  });

  if (exp.protestantVerseTotal !== undefined) {
    it(`has ${exp.protestantVerseTotal} verses in the Protestant canon`, () => {
      let n = 0;
      for (const b of books.values()) {
        if (BOOK_BY_CODE.get(b.code)?.canon === 'PROTESTANT-CANON') n += b.chapters.reduce((s, c) => s + c.verses.length, 0);
      }
      expect(n).toBe(exp.protestantVerseTotal);
    });
  }
});
