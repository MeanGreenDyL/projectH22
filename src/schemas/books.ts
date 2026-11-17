/**
 * Book registry and canon classification (spec §1 "Canon Disclosure").
 *
 * This is the single source of truth for which canon badge a book carries. A passage
 * reference whose `canon` disagrees with this table fails the credibility gate.
 *
 * Phase 0 scope: names and classification only. Chapter and verse counts, aliases and
 * translation coverage arrive with the scripture layer in Phase 1, together with a test
 * asserting expected book and chapter counts.
 */
import type { Canon } from './enums';

export const PROTESTANT_CANON_BOOKS = [
  // Old Testament (39)
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
  'Malachi',
  // New Testament (27)
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
] as const;

/** Spec list, plus the Letter of Jeremiah (Baruch 6 in Catholic Bibles, separate in the LXX). */
export const DEUTEROCANON_BOOKS = [
  'Tobit', 'Judith', 'Wisdom', 'Sirach', 'Baruch', 'Letter of Jeremiah',
  '1 Maccabees', '2 Maccabees',
  'Additions to Esther',
  'Prayer of Azariah', // includes the Song of the Three Holy Children (Daniel 3:24–90 in Catholic numbering)
  'Susanna', 'Bel and the Dragon',
] as const;

/** Spec list, verbatim. See docs/PHASE-0-PLAN.md flag on 1 Enoch and Jubilees. */
export const APOCRYPHA_WIDER_BOOKS = [
  '1 Esdras', '2 Esdras', 'Prayer of Manasseh', '3 Maccabees', '4 Maccabees', 'Psalm 151',
  '1 Enoch', 'Jubilees',
] as const;

/** Added only with a scholarly note on dating and reception. Empty until such a note exists. */
export const PSEUDEPIGRAPHA_BOOKS = [] as const;

export const BOOK_CANON: ReadonlyMap<string, Canon> = new Map<string, Canon>([
  ...PROTESTANT_CANON_BOOKS.map((b) => [b, 'PROTESTANT-CANON'] as const),
  ...DEUTEROCANON_BOOKS.map((b) => [b, 'DEUTEROCANON'] as const),
  ...APOCRYPHA_WIDER_BOOKS.map((b) => [b, 'APOCRYPHA-WIDER'] as const),
]);

export function canonOf(book: string): Canon | undefined {
  return BOOK_CANON.get(book);
}
