/** Federal Register rules by topic. Fixture is SYNTHETIC (tests/ingest/fixtures/README.md). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeFrRules } from '../../scripts/ingest/sources/federal-register-rules';
import { Source, VerifiedEvent } from '../../src/schemas';

const raw = JSON.parse(readFileSync('tests/ingest/fixtures/federal-register-rules.json', 'utf8')) as unknown;
const NOW = new Date('2026-11-17T00:00:00Z');
const topic = { slug: 'crypto', domain: 'crypto' as const, title: /stablecoin|crypto|digital asset/i };
const { events, sources } = normalizeFrRules(raw, { topic, now: NOW });

describe('Federal Register rules by topic', () => {
  it('keeps rules whose title matches the topic, not full-text hits', () => {
    expect(events.map((e) => e.id).sort()).toEqual(['fr-rule-0000-10001', 'fr-rule-0000-10003']);
  });
  it('dates on publication, names the agencies, and records the effective date when given', () => {
    const e = events.find((x) => x.id === 'fr-rule-0000-10001')!;
    expect(VerifiedEvent.safeParse(e).success).toBe(true);
    expect(e).toMatchObject({ domain: 'crypto', date: { start: '2026-10-23', precision: 'day' }, sources: ['fr-0000-10001'] });
    expect(e.summary).toContain('Comptroller of the Currency');
    expect(e.summary).toContain('effective 2027-01-18');
    expect(events.find((x) => x.id === 'fr-rule-0000-10003')!.summary).not.toContain('effective');
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
  });
  it('keeps every rule when the topic has no title filter (agency-scoped topics)', () => {
    expect(normalizeFrRules(raw, { topic: { slug: 'x', domain: 'geopolitical' }, now: NOW }).events).toHaveLength(3);
  });
});
