/**
 * Parsers for upstream scripture formats → normalized books. Pure functions on strings so
 * they can be unit-tested on small snippets (tests/scripture/parsers.test.ts).
 *
 * Only canonical text is kept: footnotes, cross-references, section headings, introductions
 * and editorial apparatus are dropped. Psalm superscriptions printed unnumbered are kept as
 * the chapter `title`. Word-level tags (Strong's <w>, <add>, <wj>, <transChange>, …) keep their
 * text; the Strong's attributes in these files are not used (see docs/licensing.md).
 */
import { BOOKS, findBook, type BookInfo } from '../../src/schemas/books';

export interface ParsedChapter {
  chapter: number;
  title?: string;
  verses: [number, string][];
}
export interface ParsedBook {
  code: string;
  name: string;
  chapters: ParsedChapter[];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, ' ').replace(/\s+([,.;:!?’”)\]])/g, '$1').trim();
}

interface Token {
  kind: 'open' | 'close' | 'self' | 'text';
  name: string;
  attrs: Record<string, string>;
  text: string;
}

function* tokenize(xml: string): Generator<Token> {
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[5] !== undefined) {
      yield { kind: 'text', name: '', attrs: {}, text: m[5] };
      continue;
    }
    if (m[2] === undefined) continue; // comment / processing instruction
    const attrs: Record<string, string> = {};
    for (const a of (m[3] ?? '').matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]!] = a[2] ?? a[3] ?? '';
    const kind = m[1] === '/' ? 'close' : m[4] === '/' ? 'self' : 'open';
    yield { kind, name: m[2], attrs, text: '' };
  }
}

class BookBuilder {
  private chapters = new Map<number, ParsedChapter>();
  private current: { ch: number; v: number; parts: string[] } | undefined;
  constructor(readonly info: BookInfo) {}
  chapter(n: number): ParsedChapter {
    let c = this.chapters.get(n);
    if (!c) {
      c = { chapter: n, verses: [] };
      this.chapters.set(n, c);
    }
    return c;
  }
  startVerse(ch: number, v: number) {
    this.endVerse();
    this.current = { ch, v, parts: [] };
  }
  text(t: string) {
    this.current?.parts.push(t);
  }
  get inVerse() {
    return this.current !== undefined;
  }
  endVerse() {
    if (!this.current) return;
    const text = clean(this.current.parts.join(''));
    const c = this.chapter(this.current.ch);
    if (text.length > 0) {
      const existing = c.verses.find(([n]) => n === this.current!.v);
      if (existing) existing[1] = clean(`${existing[1]} ${text}`);
      else c.verses.push([this.current.v, text]);
    }
    this.current = undefined;
  }
  build(): ParsedBook {
    this.endVerse();
    const chapters = [...this.chapters.values()].filter((c) => c.verses.length > 0).sort((a, b) => a.chapter - b.chapter);
    return { code: this.info.code, name: this.info.name, chapters };
  }
}

function requireBook(id: string, codeHint?: string): BookInfo {
  const b = (codeHint && BOOKS.find((x) => x.code === codeHint)) || findBook(id);
  if (!b) throw new Error(`unknown book id "${id}"`);
  return b;
}

// ---------------------------------------------------------------- USFX

const USFX_SKIP = new Set(['f', 'x', 's', 'r', 'h', 'toc', 'id', 'rem', 'fig', 'ide', 'periph', 'restore']);
/** Paragraph styles that are titles, introductions or reference lines, not scripture. */
const USFX_SKIP_P = /^(mt\d?|mte\d?|imt\d?|is\d?|ip|ipi|im|imi|ipq|imq|ipr|iq\d?|ib|ili\d?|iot|io\d?|ior|iex|ie|r|mr|sr|ms\d?|cl|cd|sp|d?s\d?)$/;

export function parseUsfx(xml: string, skipBooks: ReadonlySet<string> = new Set(['FRT', 'GLO', 'BAK', 'OTH', 'INT', 'CNC', 'TDX', 'NDX'])): ParsedBook[] {
  const out: ParsedBook[] = [];
  let book: BookBuilder | undefined;
  let skipBook = false;
  let chapter = 0;
  let skipDepth = 0;
  const pStack: boolean[] = [];
  let titleParts: string[] | undefined;

  for (const t of tokenize(xml)) {
    if (t.name === 'book' && (t.kind === 'open' || t.kind === 'self')) {
      book?.endVerse();
      if (book) out.push(book.build());
      const id = t.attrs.id ?? '';
      skipBook = skipBooks.has(id);
      book = skipBook ? undefined : new BookBuilder(requireBook(id, id));
      chapter = 0;
      continue;
    }
    if (t.name === 'book' && t.kind === 'close') {
      if (book) out.push(book.build());
      book = undefined;
      continue;
    }
    if (!book || skipBook) continue;

    if (t.kind === 'open' && USFX_SKIP.has(t.name)) { skipDepth++; continue; }
    if (t.kind === 'close' && USFX_SKIP.has(t.name)) { skipDepth = Math.max(0, skipDepth - 1); continue; }
    if (t.name === 'p' && t.kind === 'open') {
      const skip = USFX_SKIP_P.test(t.attrs.sfm ?? t.attrs.style ?? '');
      pStack.push(skip);
      if (skip) skipDepth++;
      continue;
    }
    if (t.name === 'p' && t.kind === 'close') {
      if (pStack.pop()) skipDepth = Math.max(0, skipDepth - 1);
      continue;
    }
    if (t.name === 'd') {
      if (t.kind === 'open') titleParts = [];
      else if (t.kind === 'close' && titleParts) {
        const title = clean(titleParts.join(''));
        if (title && chapter > 0) book.chapter(chapter).title = title;
        titleParts = undefined;
      }
      continue;
    }
    if (t.name === 'c' && (t.kind === 'self' || t.kind === 'open')) {
      book.endVerse();
      chapter = parseInt(t.attrs.id ?? '', 10);
      continue;
    }
    if (t.name === 'v' && (t.kind === 'self' || t.kind === 'open')) {
      const v = parseInt(t.attrs.id ?? '', 10);
      if (Number.isNaN(v) || chapter === 0) throw new Error(`bad verse marker in ${book.info.code} ${chapter}`);
      book.startVerse(chapter, v);
      continue;
    }
    if (t.name === 've') { book.endVerse(); continue; }
    if (t.kind === 'text' && skipDepth === 0) {
      if (titleParts) titleParts.push(t.text);
      else if (book.inVerse) book.text(t.text);
    }
  }
  if (book) out.push(book.build());
  return out;
}

// ---------------------------------------------------------------- OSIS

const OSIS_SKIP = new Set(['note', 'reference', 'header', 'rdg']);

export function parseOsis(xml: string): ParsedBook[] {
  const books = new Map<string, BookBuilder>();
  let current: BookBuilder | undefined;
  let chapter = 0;
  let skipDepth = 0;
  let titleParts: string[] | undefined;
  let titleDepth = 0;

  for (const t of tokenize(xml)) {
    if (t.kind === 'open' && OSIS_SKIP.has(t.name)) { skipDepth++; continue; }
    if (t.kind === 'close' && OSIS_SKIP.has(t.name)) { skipDepth = Math.max(0, skipDepth - 1); continue; }
    if (t.name === 'div' && t.kind === 'open' && t.attrs.type === 'book') {
      current?.endVerse();
      const id = t.attrs.osisID ?? '';
      const info = requireBook(id);
      current = books.get(info.code) ?? new BookBuilder(info);
      books.set(info.code, current);
      continue;
    }
    if (!current) continue;
    if (t.name === 'chapter' && (t.kind === 'open' || t.kind === 'self') && !t.attrs.eID) {
      current.endVerse();
      const ref = t.attrs.osisRef ?? t.attrs.osisID ?? t.attrs.sID ?? '';
      chapter = parseInt(ref.split('.')[1] ?? t.attrs.n ?? '', 10);
      continue;
    }
    if (t.name === 'title') {
      if (t.kind === 'open') {
        titleDepth++;
        if (titleDepth === 1) titleParts = t.attrs.type === 'psalm' || t.attrs.canonical === 'true' ? [] : undefined;
        if (titleDepth === 1 && titleParts === undefined) skipDepth++;
      } else if (t.kind === 'close') {
        if (titleDepth === 1) {
          if (titleParts) {
            const title = clean(titleParts.join(''));
            if (title && chapter > 0 && !current.inVerse) current.chapter(chapter).title = title;
            else if (title && current.inVerse) current.text(` ${title} `);
          } else skipDepth = Math.max(0, skipDepth - 1);
          titleParts = undefined;
        }
        titleDepth = Math.max(0, titleDepth - 1);
      }
      continue;
    }
    if (t.name === 'verse' && (t.kind === 'self' || t.kind === 'open')) {
      if (t.attrs.eID) { current.endVerse(); continue; }
      const parts = (t.attrs.osisID ?? '').split(/\s+/)[0]!.split('.');
      const ch = parseInt(parts[1] ?? '', 10);
      const v = parseInt(parts[2] ?? '', 10);
      if (Number.isNaN(ch) || Number.isNaN(v)) throw new Error(`bad OSIS verse ${t.attrs.osisID}`);
      chapter = ch;
      current.startVerse(ch, v);
      continue;
    }
    if (t.name === 'verse' && t.kind === 'close') { current.endVerse(); continue; }
    if (t.kind === 'text' && skipDepth === 0) {
      if (titleParts) titleParts.push(t.text);
      else if (current.inVerse) current.text(t.text);
    }
  }
  return [...books.values()].map((b) => b.build());
}

// ---------------------------------------------------------------- Zefania

const PROTESTANT_ORDER = BOOKS.filter((b) => b.canon === 'PROTESTANT-CANON');

export function parseZefania(xml: string): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const bm of xml.matchAll(/<BIBLEBOOK\b([^>]*)>([\s\S]*?)<\/BIBLEBOOK>/g)) {
    const n = parseInt(/bnumber="(\d+)"/.exec(bm[1]!)?.[1] ?? '', 10);
    const info = PROTESTANT_ORDER[n - 1];
    if (!info) throw new Error(`Zefania book number ${n} is outside the 66-book canon`);
    const builder = new BookBuilder(info);
    for (const cm of bm[2]!.matchAll(/<CHAPTER\b[^>]*cnumber="(\d+)"[^>]*>([\s\S]*?)<\/CHAPTER>/g)) {
      const ch = parseInt(cm[1]!, 10);
      for (const vm of cm[2]!.matchAll(/<VERS\b[^>]*vnumber="(\d+)"[^>]*>([\s\S]*?)<\/VERS>/g)) {
        const body = vm[2]!.replace(/<NOTE\b[\s\S]*?<\/NOTE>/g, '').replace(/<[^>]+>/g, '');
        builder.startVerse(ch, parseInt(vm[1]!, 10));
        builder.text(body);
        builder.endVerse();
      }
    }
    out.push(builder.build());
  }
  return out;
}

// ---------------------------------------------------------------- Saorsa KJV 1611 JSON

interface SaorsaBook {
  book: string;
  chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
}

export function parseSaorsaBook(json: string): ParsedBook {
  const data = JSON.parse(json) as SaorsaBook;
  const builder = new BookBuilder(requireBook(data.book));
  for (const c of data.chapters) {
    for (const v of c.verses) {
      builder.startVerse(c.chapter, v.verse);
      builder.text(v.text);
      builder.endVerse();
    }
  }
  return builder.build();
}
