/**
 * Independent expectations for bundled scripture (spec §11 Phase 1: "write a test asserting
 * expected book and chapter counts"). Written from standard references, not derived from the
 * data. When data and expectation disagree, investigate the data first.
 */
import type { TranslationId } from '../../src/schemas';

const PROTESTANT = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH',
  'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS',
  'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK',
  'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT',
  'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];

/** The 1611 Authorized Version's Apocrypha (and the KJV editions that keep it). */
const KJV_APOCRYPHA = ['1ES', '2ES', 'TOB', 'JDT', 'ADE', 'WIS', 'SIR', 'BAR', 'LJE', 'S3Y', 'SUS', 'BEL', 'MAN', '1MA', '2MA'];

export interface Expectation {
  books: readonly string[];
  /** Chapter ranges that differ from the registry for this translation. */
  chapterOverrides?: Readonly<Record<string, readonly [number, number]>>;
  /** Exact verse total for the 66 Protestant-canon books, where a standard figure exists. */
  protestantVerseTotal?: number;
}

export const EXPECTED: Record<TranslationId, Expectation> = {
  web: {
    books: [...PROTESTANT, 'TOB', 'JDT', 'ESG', 'WIS', 'SIR', 'BAR', 'LJE', 'S3Y', 'SUS', 'BEL', '1MA', '2MA', '1ES', 'MAN', 'PS2', '3MA', '2ES', '4MA'],
  },
  kjv: { books: [...PROTESTANT, ...KJV_APOCRYPHA], protestantVerseTotal: 31102 },
  kjv1611: { books: [...PROTESTANT, ...KJV_APOCRYPHA] },
  asv: { books: PROTESTANT },
  bsb: { books: PROTESTANT },
  // Douay-Rheims keeps the additions inside Esther and Daniel, and the Letter of Jeremiah as Baruch 6.
  dra: {
    books: [...PROTESTANT, 'TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA'],
    chapterOverrides: { EST: [1, 16], DAN: [1, 14], BAR: [1, 6] },
  },
};

/** 1189 chapters in the 66-book Protestant canon. */
export const PROTESTANT_CHAPTER_TOTAL = 1189;
