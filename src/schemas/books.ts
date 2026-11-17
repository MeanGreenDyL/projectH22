/**
 * Book registry and canon classification (spec §1 "Canon Disclosure", §3).
 *
 * The single source of truth for which canon badge a book carries, and for each book's
 * standard identifiers. A passage reference whose `canon` disagrees with this table fails the
 * credibility gate.
 *
 * `chapters` is the expected first and last chapter number in English (KJV-tradition)
 * versification. Some books do not start at chapter 1: the Additions to Esther are numbered
 * 10–16, the Letter of Jeremiah is chapter 6 (of Baruch), and Psalm 151 is chapter 151.
 * Translations with other versification (Douay-Rheims follows the Vulgate) declare their
 * differences in tests/scripture/expected.ts — never by editing this table to fit the data.
 */
import type { Canon } from './enums';

export interface BookInfo {
  /** Display name, used in passage references. */
  name: string;
  canon: Canon;
  /** Paratext / USFX book code (internal code where Paratext has none). */
  code: string;
  /** OSIS book id(s) seen in source files. */
  osis: readonly string[];
  chapters: readonly [first: number, last: number];
  /** Other names used by source datasets. */
  aliases?: readonly string[];
}

const P = 'PROTESTANT-CANON' as const;
const D = 'DEUTEROCANON' as const;
const A = 'APOCRYPHA-WIDER' as const;

export const BOOKS: readonly BookInfo[] = [
  // ---- Old Testament (39) ----
  { name: 'Genesis', canon: P, code: 'GEN', osis: ['Gen'], chapters: [1, 50] },
  { name: 'Exodus', canon: P, code: 'EXO', osis: ['Exod'], chapters: [1, 40] },
  { name: 'Leviticus', canon: P, code: 'LEV', osis: ['Lev'], chapters: [1, 27] },
  { name: 'Numbers', canon: P, code: 'NUM', osis: ['Num'], chapters: [1, 36] },
  { name: 'Deuteronomy', canon: P, code: 'DEU', osis: ['Deut'], chapters: [1, 34] },
  { name: 'Joshua', canon: P, code: 'JOS', osis: ['Josh'], chapters: [1, 24] },
  { name: 'Judges', canon: P, code: 'JDG', osis: ['Judg'], chapters: [1, 21] },
  { name: 'Ruth', canon: P, code: 'RUT', osis: ['Ruth'], chapters: [1, 4] },
  { name: '1 Samuel', canon: P, code: '1SA', osis: ['1Sam'], chapters: [1, 31] },
  { name: '2 Samuel', canon: P, code: '2SA', osis: ['2Sam'], chapters: [1, 24] },
  { name: '1 Kings', canon: P, code: '1KI', osis: ['1Kgs'], chapters: [1, 22] },
  { name: '2 Kings', canon: P, code: '2KI', osis: ['2Kgs'], chapters: [1, 25] },
  { name: '1 Chronicles', canon: P, code: '1CH', osis: ['1Chr'], chapters: [1, 29] },
  { name: '2 Chronicles', canon: P, code: '2CH', osis: ['2Chr'], chapters: [1, 36] },
  { name: 'Ezra', canon: P, code: 'EZR', osis: ['Ezra'], chapters: [1, 10] },
  { name: 'Nehemiah', canon: P, code: 'NEH', osis: ['Neh'], chapters: [1, 13] },
  { name: 'Esther', canon: P, code: 'EST', osis: ['Esth'], chapters: [1, 10] },
  { name: 'Job', canon: P, code: 'JOB', osis: ['Job'], chapters: [1, 42] },
  { name: 'Psalms', canon: P, code: 'PSA', osis: ['Ps'], chapters: [1, 150] },
  { name: 'Proverbs', canon: P, code: 'PRO', osis: ['Prov'], chapters: [1, 31] },
  { name: 'Ecclesiastes', canon: P, code: 'ECC', osis: ['Eccl'], chapters: [1, 12] },
  { name: 'Song of Solomon', canon: P, code: 'SNG', osis: ['Song'], chapters: [1, 8], aliases: ['Song of Songs'] },
  { name: 'Isaiah', canon: P, code: 'ISA', osis: ['Isa'], chapters: [1, 66] },
  { name: 'Jeremiah', canon: P, code: 'JER', osis: ['Jer'], chapters: [1, 52] },
  { name: 'Lamentations', canon: P, code: 'LAM', osis: ['Lam'], chapters: [1, 5] },
  { name: 'Ezekiel', canon: P, code: 'EZK', osis: ['Ezek'], chapters: [1, 48] },
  { name: 'Daniel', canon: P, code: 'DAN', osis: ['Dan'], chapters: [1, 12] },
  { name: 'Hosea', canon: P, code: 'HOS', osis: ['Hos'], chapters: [1, 14] },
  { name: 'Joel', canon: P, code: 'JOL', osis: ['Joel'], chapters: [1, 3] },
  { name: 'Amos', canon: P, code: 'AMO', osis: ['Amos'], chapters: [1, 9] },
  { name: 'Obadiah', canon: P, code: 'OBA', osis: ['Obad'], chapters: [1, 1] },
  { name: 'Jonah', canon: P, code: 'JON', osis: ['Jonah'], chapters: [1, 4] },
  { name: 'Micah', canon: P, code: 'MIC', osis: ['Mic'], chapters: [1, 7] },
  { name: 'Nahum', canon: P, code: 'NAM', osis: ['Nah'], chapters: [1, 3] },
  { name: 'Habakkuk', canon: P, code: 'HAB', osis: ['Hab'], chapters: [1, 3] },
  { name: 'Zephaniah', canon: P, code: 'ZEP', osis: ['Zeph'], chapters: [1, 3] },
  { name: 'Haggai', canon: P, code: 'HAG', osis: ['Hag'], chapters: [1, 2] },
  { name: 'Zechariah', canon: P, code: 'ZEC', osis: ['Zech'], chapters: [1, 14] },
  { name: 'Malachi', canon: P, code: 'MAL', osis: ['Mal'], chapters: [1, 4] },
  // ---- New Testament (27) ----
  { name: 'Matthew', canon: P, code: 'MAT', osis: ['Matt'], chapters: [1, 28] },
  { name: 'Mark', canon: P, code: 'MRK', osis: ['Mark'], chapters: [1, 16] },
  { name: 'Luke', canon: P, code: 'LUK', osis: ['Luke'], chapters: [1, 24] },
  { name: 'John', canon: P, code: 'JHN', osis: ['John'], chapters: [1, 21] },
  { name: 'Acts', canon: P, code: 'ACT', osis: ['Acts'], chapters: [1, 28] },
  { name: 'Romans', canon: P, code: 'ROM', osis: ['Rom'], chapters: [1, 16] },
  { name: '1 Corinthians', canon: P, code: '1CO', osis: ['1Cor'], chapters: [1, 16] },
  { name: '2 Corinthians', canon: P, code: '2CO', osis: ['2Cor'], chapters: [1, 13] },
  { name: 'Galatians', canon: P, code: 'GAL', osis: ['Gal'], chapters: [1, 6] },
  { name: 'Ephesians', canon: P, code: 'EPH', osis: ['Eph'], chapters: [1, 6] },
  { name: 'Philippians', canon: P, code: 'PHP', osis: ['Phil'], chapters: [1, 4] },
  { name: 'Colossians', canon: P, code: 'COL', osis: ['Col'], chapters: [1, 4] },
  { name: '1 Thessalonians', canon: P, code: '1TH', osis: ['1Thess'], chapters: [1, 5] },
  { name: '2 Thessalonians', canon: P, code: '2TH', osis: ['2Thess'], chapters: [1, 3] },
  { name: '1 Timothy', canon: P, code: '1TI', osis: ['1Tim'], chapters: [1, 6] },
  { name: '2 Timothy', canon: P, code: '2TI', osis: ['2Tim'], chapters: [1, 4] },
  { name: 'Titus', canon: P, code: 'TIT', osis: ['Titus'], chapters: [1, 3] },
  { name: 'Philemon', canon: P, code: 'PHM', osis: ['Phlm'], chapters: [1, 1] },
  { name: 'Hebrews', canon: P, code: 'HEB', osis: ['Heb'], chapters: [1, 13] },
  { name: 'James', canon: P, code: 'JAS', osis: ['Jas'], chapters: [1, 5] },
  { name: '1 Peter', canon: P, code: '1PE', osis: ['1Pet'], chapters: [1, 5] },
  { name: '2 Peter', canon: P, code: '2PE', osis: ['2Pet'], chapters: [1, 3] },
  { name: '1 John', canon: P, code: '1JN', osis: ['1John'], chapters: [1, 5] },
  { name: '2 John', canon: P, code: '2JN', osis: ['2John'], chapters: [1, 1] },
  { name: '3 John', canon: P, code: '3JN', osis: ['3John'], chapters: [1, 1] },
  { name: 'Jude', canon: P, code: 'JUD', osis: ['Jude'], chapters: [1, 1] },
  { name: 'Revelation', canon: P, code: 'REV', osis: ['Rev'], chapters: [1, 22] },
  // ---- Deuterocanon (spec list + Letter of Jeremiah + Greek Esther) ----
  { name: 'Tobit', canon: D, code: 'TOB', osis: ['Tob'], chapters: [1, 14] },
  { name: 'Judith', canon: D, code: 'JDT', osis: ['Jdt'], chapters: [1, 16] },
  { name: 'Wisdom', canon: D, code: 'WIS', osis: ['Wis'], chapters: [1, 19], aliases: ['Wisdom of Solomon'] },
  { name: 'Sirach', canon: D, code: 'SIR', osis: ['Sir'], chapters: [1, 51], aliases: ['Ecclesiasticus'] },
  { name: 'Baruch', canon: D, code: 'BAR', osis: ['Bar'], chapters: [1, 5] },
  { name: 'Letter of Jeremiah', canon: D, code: 'LJE', osis: ['EpJer'], chapters: [6, 6], aliases: ['Epistle of Jeremy'] },
  { name: '1 Maccabees', canon: D, code: '1MA', osis: ['1Macc'], chapters: [1, 16] },
  { name: '2 Maccabees', canon: D, code: '2MA', osis: ['2Macc'], chapters: [1, 15] },
  /** The KJV "Rest of Esther": the Greek additions alone, numbered 10:4–16:24. */
  { name: 'Additions to Esther', canon: D, code: 'ADE', osis: ['EsthGr', 'AddEsth'], chapters: [10, 16], aliases: ['Rest of Esther'] },
  /** The whole book of Esther translated from the Greek, additions in place (WEB). */
  { name: 'Esther (Greek)', canon: D, code: 'ESG', osis: [], chapters: [1, 10] },
  { name: 'Prayer of Azariah', canon: D, code: 'S3Y', osis: ['PrAzar'], chapters: [1, 1], aliases: ['Song of the Three Holy Children'] },
  { name: 'Susanna', canon: D, code: 'SUS', osis: ['Sus'], chapters: [1, 1] },
  { name: 'Bel and the Dragon', canon: D, code: 'BEL', osis: ['Bel'], chapters: [1, 1] },
  // ---- Wider apocrypha (spec list) ----
  { name: '1 Esdras', canon: A, code: '1ES', osis: ['1Esd'], chapters: [1, 9] },
  { name: '2 Esdras', canon: A, code: '2ES', osis: ['2Esd'], chapters: [1, 16] },
  { name: 'Prayer of Manasseh', canon: A, code: 'MAN', osis: ['PrMan'], chapters: [1, 1] },
  { name: '3 Maccabees', canon: A, code: '3MA', osis: ['3Macc'], chapters: [1, 7] },
  { name: '4 Maccabees', canon: A, code: '4MA', osis: ['4Macc'], chapters: [1, 18] },
  { name: 'Psalm 151', canon: A, code: 'PS2', osis: ['AddPs'], chapters: [151, 151] },
  { name: '1 Enoch', canon: A, code: 'ENO', osis: ['1En'], chapters: [1, 108] },
  { name: 'Jubilees', canon: A, code: 'JUB', osis: ['Jub'], chapters: [1, 50] },
];

export const PROTESTANT_CANON_BOOKS = BOOKS.filter((b) => b.canon === P).map((b) => b.name);
export const DEUTEROCANON_BOOKS = BOOKS.filter((b) => b.canon === D).map((b) => b.name);
export const APOCRYPHA_WIDER_BOOKS = BOOKS.filter((b) => b.canon === A).map((b) => b.name);
/** Added only with a scholarly note on dating and reception. Empty until such a note exists. */
export const PSEUDEPIGRAPHA_BOOKS: readonly string[] = [];

export const BOOK_CANON: ReadonlyMap<string, Canon> = new Map(BOOKS.map((b) => [b.name, b.canon]));
export const BOOK_BY_CODE: ReadonlyMap<string, BookInfo> = new Map(BOOKS.map((b) => [b.code, b]));

const BY_ANY_NAME = new Map<string, BookInfo>();
for (const b of BOOKS) {
  for (const n of [b.name, ...(b.aliases ?? []), ...b.osis, b.code]) {
    BY_ANY_NAME.set(n.toLowerCase().replace(/\s+/g, ''), b);
  }
}

/** Look a book up by name, alias, OSIS id or code, ignoring case and spaces. */
export function findBook(nameOrCode: string): BookInfo | undefined {
  return BY_ANY_NAME.get(nameOrCode.toLowerCase().replace(/\s+/g, ''));
}

export function canonOf(book: string): Canon | undefined {
  return BOOK_CANON.get(book);
}
