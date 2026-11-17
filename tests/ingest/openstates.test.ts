/** Open States v3 bills. Fixture is SYNTHETIC and shaped after the published v3 API docs. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeOpenStates } from '../../scripts/ingest/sources/openstates';
import { Source, VerifiedEvent } from '../../src/schemas';

const raw = JSON.parse(readFileSync('tests/ingest/fixtures/openstates.json', 'utf8')) as unknown;
const NOW = new Date('2026-11-17T00:00:00Z');
const topic = { slug: 'cybersecurity', title: /cyber ?security/i, domain: 'cyber' as const };
const { events, sources } = normalizeOpenStates(raw, { topic, since: '2026-01-01', now: NOW });

describe('Open States enacted state bills', () => {
  it('keeps only enacted bills whose title matches the topic', () => {
    expect(events.map((e) => e.id)).toEqual(['os-tx-2026-hb-9901']);
  });
  it('dates the event on the governor signature, not on a later effective-date action', () => {
    const e = events[0]!;
    expect(VerifiedEvent.safeParse(e).success).toBe(true);
    expect(e).toMatchObject({ domain: 'cyber', date: { start: '2026-06-10', precision: 'day' } });
    expect(e.geography).toEqual({ scope: 'us-state', countries: ['US'], usStates: ['TX'] });
  });
  it('cites the legislature record as Tier 1 and Open States as Tier 3', () => {
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
    expect(sources.map((s) => [s.id, s.kind === 'evidentiary' && s.tier])).toEqual([
      ['os-tx-2026-hb-9901-legislature', '1-primary'],
      ['os-tx-2026-hb-9901', '3-institutional'],
    ]);
    expect(events[0]!.sources).toEqual(['os-tx-2026-hb-9901-legislature', 'os-tx-2026-hb-9901']);
  });
});
