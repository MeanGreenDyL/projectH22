/**
 * Upstream sources for bundled scripture. The sha256 of every file used is recorded in
 * src/data/scripture/translations.json, so any upstream change shows up as a reviewable diff.
 */
import type { TranslationId } from '../../src/schemas/scripture';

const OPEN_BIBLES = 'https://raw.githubusercontent.com/seven1m/open-bibles/master';
const SAORSA = 'https://raw.githubusercontent.com/Saorsa-Ind/King-James-Version-1611-JSON-Dataset/main/books';

/** Saorsa file names are the book names with spaces removed. Its books.json omits AdditionstoEsther. */
const SAORSA_FILES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1Samuel', '2Samuel',
  '1Kings', '2Kings', '1Chronicles', '2Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'SongofSolomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1Corinthians', '2Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1Thessalonians', '2Thessalonians', '1Timothy', '2Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1Peter', '2Peter', '1John', '2John', '3John', 'Jude', 'Revelation', '1Esdras', '2Esdras',
  'Tobit', 'Judith', 'AdditionstoEsther', 'WisdomofSolomon', 'Ecclesiasticus', 'Baruch', 'LetterofJeremiah',
  'PrayerofAzariah', 'Susanna', 'BelandtheDragon', 'PrayerofManasseh', '1Maccabees', '2Maccabees',
];

export interface UpstreamSource {
  translation: TranslationId;
  name: string;
  format: 'usfx' | 'osis' | 'zefania' | 'saorsa';
  license: string;
  versification: 'english' | 'vulgate';
  /** Landing page shown in the manifest. */
  homepage: string;
  files: { url: string; name: string }[];
  /** Chapter renumbering to the registry's numbering: { CODE: { from: to } }. Numbering only, never text. */
  renumberChapters?: Record<string, Record<number, number>>;
  notes?: string[];
}

export const UPSTREAM: readonly UpstreamSource[] = [
  {
    translation: 'web',
    name: 'World English Bible',
    format: 'usfx',
    license: 'Public domain',
    versification: 'english',
    homepage: 'https://github.com/seven1m/open-bibles',
    files: [{ url: `${OPEN_BIBLES}/eng-web.usfx.xml`, name: 'eng-web.usfx.xml' }],
    notes: [
      'Includes the Deuterocanon and the wider apocrypha (3–4 Maccabees, 1–2 Esdras, Prayer of Manasseh, Psalm 151).',
      'Esther is given twice: the Hebrew book (EST) and the whole book translated from the Greek (ESG).',
      '"World English Bible" is a trademark for the unmodified text; the bundled text is unmodified apart from removal of notes and headings.',
    ],
  },
  {
    translation: 'kjv',
    name: 'King James Version (1769 standard text, with Apocrypha)',
    format: 'osis',
    license: 'Public domain in the United States; Crown Copyright in the United Kingdom',
    versification: 'english',
    homepage: 'https://github.com/seven1m/open-bibles',
    files: [{ url: `${OPEN_BIBLES}/eng-kjv.osis.xml`, name: 'eng-kjv.osis.xml' }],
  },
  {
    translation: 'kjv1611',
    name: 'King James Version (1611)',
    format: 'saorsa',
    license: 'Public domain in the United States; Crown Copyright in the United Kingdom',
    versification: 'english',
    homepage: 'https://github.com/Saorsa-Ind/King-James-Version-1611-JSON-Dataset',
    files: SAORSA_FILES.map((f) => ({ url: `${SAORSA}/${f}.json`, name: `${f}.json` })),
    renumberChapters: { LJE: { 1: 6 } },
    notes: [
      'Original 1611 spelling. The dataset index (books.json) lists 80 books; the 81st file, AdditionstoEsther, is included here.',
      'The dataset numbers the Letter of Jeremiah as chapter 1; it is renumbered to chapter 6 (Baruch 6), as printed in 1611.',
      'Psalm superscriptions are not present in this dataset.',
      'Two verse records in the dataset have empty text (Sirach 1:7 and 17:5); they are omitted, not filled in from another edition.',
    ],
  },
  {
    translation: 'asv',
    name: 'American Standard Version (1901)',
    format: 'zefania',
    license: 'Public domain',
    versification: 'english',
    homepage: 'https://github.com/seven1m/open-bibles',
    files: [{ url: `${OPEN_BIBLES}/eng-asv.zefania.xml`, name: 'eng-asv.zefania.xml' }],
    notes: ['Psalm superscriptions are not present in this source file.'],
  },
  {
    translation: 'bsb',
    name: 'Berean Standard Bible',
    format: 'usfx',
    license: 'Dedicated to the public domain (2023)',
    versification: 'english',
    homepage: 'https://github.com/seven1m/open-bibles',
    files: [{ url: `${OPEN_BIBLES}/eng-bsb.usfx.xml`, name: 'eng-bsb.usfx.xml' }],
  },
  {
    translation: 'dra',
    name: 'Douay-Rheims (1899 American Edition, Challoner revision)',
    format: 'usfx',
    license: 'Public domain',
    versification: 'vulgate',
    homepage: 'https://github.com/seven1m/open-bibles',
    files: [{ url: `${OPEN_BIBLES}/eng-dra.usfx.xml`, name: 'eng-dra.usfx.xml' }],
    notes: [
      'Vulgate versification: Psalm numbering differs from English Bibles for most of the Psalter.',
      'The additions to Esther and Daniel sit inside those books (Esther 10:4–16, Daniel 3:24–90, 13–14); the Letter of Jeremiah is Baruch 6.',
    ],
  },
];

/**
 * Cross-references. The spec names the Treasury of Scripture Knowledge (public domain); the
 * reachable machine-readable set is OpenBible.info's, which starts from the TSK and adds reader
 * votes. It is CC BY, so every page that shows it must credit OpenBible.info.
 */
export const CROSS_REFERENCES = {
  name: 'OpenBible.info Cross References',
  license: 'CC BY (attribution: OpenBible.info)',
  homepage: 'https://www.openbible.info/labs/cross-references/',
  file: {
    url: 'https://raw.githubusercontent.com/scrollmapper/bible_databases/2025/sources/extras/cross_references.txt',
    name: 'cross_references.txt',
  },
  notes: [
    'Seeded from the Treasury of Scripture Knowledge and ranked by reader votes. Votes are a crowd relevance signal, not scholarship; some are negative.',
    'Covers the 66-book Protestant canon only. Uses modern versification: 3 John has 15 verses (KJV 1:14 is split in two), so five references point at 3 John 1:15, which the KJV does not number.',
  ],
} as const;
