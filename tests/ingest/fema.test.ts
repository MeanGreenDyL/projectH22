/** OpenFEMA disaster declarations. Fixture is SYNTHETIC (tests/ingest/fixtures/README.md). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeFema } from '../../scripts/ingest/sources/fema';
import { Source, VerifiedEvent } from '../../src/schemas';

const raw = JSON.parse(readFileSync('tests/ingest/fixtures/fema.json', 'utf8')) as unknown;
const NOW = new Date('2026-11-17T00:00:00Z');
const { events, sources } = normalizeFema(raw, { now: NOW });
const byId = (id: string) => events.find((e) => e.id === id)!;

describe('OpenFEMA disaster declarations', () => {
  it('produces one event per declaration, not one per designated area', () => {
    expect(events.map((e) => e.id).sort()).toEqual(['fema-dr-9901', 'fema-dr-9904', 'fema-em-9903', 'fema-fm-9902']);
  });
  it('produces schema-valid events and tier-1 sources', () => {
    for (const e of events) expect(VerifiedEvent.safeParse(e).success).toBe(true);
    for (const s of sources) {
      expect(Source.safeParse(s).success).toBe(true);
      expect(s).toMatchObject({ kind: 'evidentiary', tier: '1-primary' });
    }
  });
  it('dates the event on the declaration and counts designated areas', () => {
    const e = byId('fema-dr-9901');
    expect(e.date).toEqual({ start: '2026-08-02', precision: 'day' });
    expect(e.metrics).toEqual([
      { label: 'Designated areas', value: 2, unit: 'areas', asOf: '2026-11-17', sourceId: 'fema-dr-9901', isEstimate: false },
    ]);
    expect(e.title).toBe('Major disaster declaration DR-9901-CA: Flood');
    expect(sources.find((s) => s.id === 'fema-dr-9901')?.url).toBe('https://www.fema.gov/disaster/9901');
  });
  it('places state declarations in their state and leaves non-state areas unresolved', () => {
    expect(byId('fema-dr-9901').geography).toEqual({ scope: 'us-state', countries: ['US'], usStates: ['CA'] });
    expect(byId('fema-dr-9904').geography).toEqual({ scope: 'us-federal', countries: [] });
  });
  it('classifies natural hazards as natural and other incidents as infrastructure', () => {
    expect(byId('fema-fm-9902').domain).toBe('natural');
    expect(byId('fema-em-9903').domain).toBe('infrastructure');
  });
});
