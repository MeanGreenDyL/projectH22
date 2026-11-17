/** Congress.gov enacted laws. Fixture is SYNTHETIC (tests/ingest/fixtures/README.md). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeCongressLaws } from '../../scripts/ingest/sources/congress';
import { Source, VerifiedEvent } from '../../src/schemas';

const raw = JSON.parse(readFileSync('tests/ingest/fixtures/congress-laws.json', 'utf8')) as unknown;
const NOW = new Date('2026-11-17T00:00:00Z');
const { events, sources, held } = normalizeCongressLaws(raw, { since: '2026-01-01', now: NOW });

describe('Congress.gov enacted laws', () => {
  it('produces one schema-valid us-law event per law inside the window', () => {
    expect(events.map((e) => e.id).sort()).toEqual(['pl-119-901', 'pvtl-119-902']);
    for (const e of events) expect(VerifiedEvent.safeParse(e).success).toBe(true);
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
  });
  it('dates the law on the "Became Law" action and cites the congress.gov bill page', () => {
    const e = events.find((x) => x.id === 'pl-119-901')!;
    expect(e).toMatchObject({ domain: 'us-law', date: { start: '2026-10-20', precision: 'day' }, title: 'Public Law 119-901: Example Infrastructure Act' });
    expect(e.geography).toEqual({ scope: 'us-federal', countries: ['US'] });
    expect(sources.find((s) => s.id === e.sources[0])).toMatchObject({ tier: '1-primary', url: 'https://www.congress.gov/bill/119th-congress/house-bill/9901' });
  });
  it('holds back a law whose enactment date is not in the response instead of guessing it', () => {
    expect(held).toEqual([{ id: 'pl-119-903', reason: 'enactment date not in the list response' }]);
  });
});
