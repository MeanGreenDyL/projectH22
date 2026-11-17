import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCrossReferences } from '../../scripts/scripture/crossrefs';

describe('parseCrossReferences', () => {
  it('parses single verses and ranges, keeping votes', () => {
    const map = parseCrossReferences('From Verse\tTo Verse\tVotes\nGen.1.1\tProv.8.22-Prov.8.30\t59\nGen.1.1\tJohn.1.1\t-2\n');
    expect(map.get('GEN')).toEqual({ '1:1': [['PRO', 8, 22, 8, 30, 59], ['JHN', 1, 1, 1, 1, -2]] });
  });
  it('keeps ranges that run into the next book', () => {
    const map = parseCrossReferences('Isa.44.28\t2Chr.36.22-Ezra.1.3\t9\n');
    expect(map.get('ISA')).toEqual({ '44:28': [['2CH', 36, 22, 1, 3, 9, 'EZR']] });
  });
  it('rejects unknown books', () => {
    expect(() => parseCrossReferences('Foo.1.1\tGen.1.1\t1')).toThrow(/bad cross-reference/);
  });
});

const DIR = 'src/data/scripture/crossrefs';
/**
 * The cross-reference set uses modern versification, which splits KJV 3 John 1:14 into verses
 * 14–15. Kept as published and listed here, rather than silently renumbered.
 */
const KNOWN_VERSIFICATION_DIFFERENCES = new Set(['3JN 1:15']);
describe('bundled cross-references', () => {
  it('has a source record with licence and attribution', () => {
    const src = JSON.parse(readFileSync(join(DIR, 'source.json'), 'utf8'));
    expect(src.license).toMatch(/CC BY/);
    expect(src.count).toBeGreaterThan(300000);
  });
  it('every source and target verse exists in the KJV text', () => {
    const kjv = new Map<string, Set<string>>();
    for (const f of readdirSync('src/data/scripture/kjv')) {
      const b = JSON.parse(readFileSync(join('src/data/scripture/kjv', f), 'utf8'));
      kjv.set(b.code, new Set(b.chapters.flatMap((c: { chapter: number; verses: [number, string][] }) => c.verses.map(([v]) => `${c.chapter}:${v}`))));
    }
    const missing: string[] = [];
    expect(readdirSync(DIR).length).toBeGreaterThan(60);
    for (const f of readdirSync(DIR).filter((x) => x !== 'source.json')) {
      const { code, refs } = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      for (const [from, list] of Object.entries(refs as Record<string, [string, number, number, number, number, number][]>)) {
        if (!kjv.get(code)?.has(from)) missing.push(`${code} ${from}`);
        for (const [t, c, v, c2, v2, , tEnd] of list as (string | number)[][]) {
          const end = (tEnd as string | undefined) ?? (t as string);
          if (!kjv.get(t as string)?.has(`${c}:${v}`)) missing.push(`${t} ${c}:${v}`);
          if (!kjv.get(end)?.has(`${c2}:${v2}`)) missing.push(`${end} ${c2}:${v2}`);
        }
      }
    }
    expect(missing.filter((m) => !KNOWN_VERSIFICATION_DIFFERENCES.has(m)).slice(0, 20)).toEqual([]);
  }, 60000);
});
