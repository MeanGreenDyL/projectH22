/**
 * OpenBible.info cross-references (CC BY; seeded from the Treasury of Scripture Knowledge and
 * ranked by reader votes). Parsed into one file per source book. Votes are a crowd relevance
 * signal, not scholarship, and are kept so the UI can threshold them openly.
 */
import { findBook } from '../../src/schemas/books';

/**
 * [toCode, toChapter, toVerse, toChapterEnd, toVerseEnd, votes, toCodeEnd?]
 * toCodeEnd is present only for the few ranges that run into the next book (e.g. 2 Chr 36:22–Ezra 1:3).
 */
export type CrossRef = [string, number, number, number, number, number] | [string, number, number, number, number, number, string];

function parseRef(ref: string): [string, number, number] {
  const [b, c, v] = ref.split('.');
  const book = findBook(b ?? '');
  const ch = parseInt(c ?? '', 10);
  const vs = parseInt(v ?? '', 10);
  if (!book || Number.isNaN(ch) || Number.isNaN(vs)) throw new Error(`bad cross-reference "${ref}"`);
  return [book.code, ch, vs];
}

/** Returns refs grouped by source book code, then "chapter:verse". */
export function parseCrossReferences(tsv: string): Map<string, Record<string, CrossRef[]>> {
  const out = new Map<string, Record<string, CrossRef[]>>();
  for (const line of tsv.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('From Verse')) continue;
    const [from, to, votes] = line.split('\t');
    const [fCode, fCh, fV] = parseRef(from ?? '');
    const [start, end = start] = (to ?? '').split('-');
    const [tCode, tCh, tV] = parseRef(start!);
    const [eCode, eCh, eV] = parseRef(end!);
    const byVerse = out.get(fCode) ?? {};
    out.set(fCode, byVerse);
    const v = parseInt(votes ?? '0', 10);
    (byVerse[`${fCh}:${fV}`] ??= []).push(eCode === tCode ? [tCode, tCh, tV, eCh, eV, v] : [tCode, tCh, tV, eCh, eV, v, eCode]);
  }
  return out;
}
