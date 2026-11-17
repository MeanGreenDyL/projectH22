import { describe, expect, it } from 'vitest';
import { ScripturalCorrelation, Scenario, Source, VerifiedEvent } from '../src/schemas';
import { correlation, event, evidentiary, interpretive, scenario } from './helpers';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

describe('Source', () => {
  it('accepts evidentiary and interpretive sources', () => {
    expect(ok(Source, evidentiary())).toBe(true);
    expect(ok(Source, interpretive())).toBe(true);
  });
  it('rejects a source with no kind, so theological sources cannot slip in as evidence', () => {
    const { kind: _kind, ...rest } = evidentiary();
    expect(ok(Source, rest)).toBe(false);
  });
  it('rejects an interpretive source carrying an evidentiary tier', () => {
    expect(ok(Source, { ...interpretive(), tier: '1-primary' })).toBe(false);
  });
  it('requires tradition and composition date on interpretive sources', () => {
    const { tradition: _t, ...noTradition } = interpretive();
    expect(ok(Source, noTradition)).toBe(false);
  });
  it('rejects non-http URLs and malformed DOIs', () => {
    expect(ok(Source, evidentiary({ url: 'ftp://example.gov/x' }))).toBe(false);
    expect(ok(Source, evidentiary({ doi: 'https://doi.org/10.1/x' }))).toBe(false);
    expect(ok(Source, evidentiary({ doi: '10.1000/xyz123' }))).toBe(true);
  });
  it('rejects unknown keys (strict records catch typos)', () => {
    expect(ok(Source, { ...evidentiary(), teir: '1-primary' })).toBe(false);
  });
});

describe('VerifiedEvent', () => {
  it('accepts a complete event', () => {
    expect(ok(VerifiedEvent, event())).toBe(true);
  });
  it('requires at least one source', () => {
    expect(ok(VerifiedEvent, event({ sources: [] }))).toBe(false);
  });
  it('rejects end before start and unbounded approximate dates', () => {
    expect(ok(VerifiedEvent, event({ date: { start: '2026-02-01', end: '2026-01-01', precision: 'day' } }))).toBe(false);
    expect(ok(VerifiedEvent, event({ date: { start: '2026-02-01', precision: 'approximate' } }))).toBe(false);
    expect(
      ok(VerifiedEvent, event({ date: { start: '2026-02-01', end: '2026-03-01', precision: 'approximate' } })),
    ).toBe(true);
  });
  it('rejects non-calendar dates and naive timestamps', () => {
    expect(ok(VerifiedEvent, event({ date: { start: '2026-13-01', precision: 'day' } }))).toBe(false);
    expect(ok(VerifiedEvent, event({ lastVerified: '2026-11-01T00:00:00' }))).toBe(false);
  });
  it('requires upper-case ISO country codes and real US state codes', () => {
    expect(ok(VerifiedEvent, event({ geography: { scope: 'global', countries: ['us'] } }))).toBe(false);
    expect(ok(VerifiedEvent, event({ geography: { scope: 'us-state', countries: ['US'], usStates: ['XX'] } }))).toBe(false);
    expect(ok(VerifiedEvent, event({ geography: { scope: 'us-state', countries: ['US'], usStates: ['TX'] } }))).toBe(true);
  });
  it('checks coordinates are [lng, lat] in range', () => {
    expect(ok(VerifiedEvent, event({ geography: { scope: 'global', countries: [], coordinates: [-97.7, 30.3] } }))).toBe(true);
    expect(ok(VerifiedEvent, event({ geography: { scope: 'global', countries: [], coordinates: [30.3, -197.7] } }))).toBe(false);
  });
  it('requires every metric to carry asOf and sourceId', () => {
    const [m] = event().metrics;
    const { asOf: _a, ...noAsOf } = m!;
    expect(ok(VerifiedEvent, event({ metrics: [noAsOf as never] }))).toBe(false);
  });
  it('only allows an estimateRange on estimates, and it must contain the value', () => {
    const m = event().metrics[0]!;
    expect(ok(VerifiedEvent, event({ metrics: [{ ...m, estimateRange: [5, 15] }] }))).toBe(false);
    expect(ok(VerifiedEvent, event({ metrics: [{ ...m, isEstimate: true, estimateRange: [11, 15] }] }))).toBe(false);
    expect(ok(VerifiedEvent, event({ metrics: [{ ...m, isEstimate: true, estimateRange: [5, 15] }] }))).toBe(true);
  });
  it('caps title and summary length', () => {
    expect(ok(VerifiedEvent, event({ title: 'x'.repeat(121) }))).toBe(false);
    expect(ok(VerifiedEvent, event({ summary: 'x'.repeat(401) }))).toBe(false);
  });
});

describe('ScripturalCorrelation', () => {
  it('accepts the spec example shape', () => {
    expect(ok(ScripturalCorrelation, correlation())).toBe(true);
  });
  it('isInterpretation must be literally true', () => {
    expect(ok(ScripturalCorrelation, { ...correlation(), isInterpretation: false })).toBe(false);
    const { isInterpretation: _i, ...rest } = correlation();
    expect(ok(ScripturalCorrelation, rest)).toBe(false);
  });
  it('counterReading is required, non-blank and at least 80 characters', () => {
    const { counterReading: _c, ...rest } = correlation();
    expect(ok(ScripturalCorrelation, rest)).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ counterReading: '' }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ counterReading: ' '.repeat(200) }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ counterReading: 'x'.repeat(79) }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ counterReading: `  ${'x'.repeat(79)}  ` }))).toBe(false);
  });
  it('requires at least one tradition, one passage and one event, with no repeated tradition', () => {
    expect(ok(ScripturalCorrelation, correlation({ hermeneuticTradition: [] }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ hermeneuticTradition: ['idealist', 'idealist'] }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ passages: [] }))).toBe(false);
    expect(ok(ScripturalCorrelation, correlation({ eventIds: [] }))).toBe(false);
  });
  it('only accepts the five declared strength values', () => {
    expect(ok(ScripturalCorrelation, { ...correlation(), strength: 'strong' })).toBe(false);
  });
  it('numerical-symbolic must disclose method and arithmetic', () => {
    expect(ok(ScripturalCorrelation, correlation({ strength: 'numerical-symbolic' }))).toBe(false);
    expect(
      ok(
        ScripturalCorrelation,
        correlation({
          strength: 'numerical-symbolic',
          numericalMethod: {
            method: 'Synthetic method description long enough to satisfy the minimum.',
            arithmetic: '6 × 111 = 666',
          },
        }),
      ),
    ).toBe(true);
    expect(
      ok(
        ScripturalCorrelation,
        correlation({ numericalMethod: { method: 'x'.repeat(40), arithmetic: '1 + 1 = 2' } }),
      ),
    ).toBe(false);
  });
  it('speculative must be phrased as a question', () => {
    expect(ok(ScripturalCorrelation, correlation({ strength: 'speculative' }))).toBe(false);
    expect(
      ok(
        ScripturalCorrelation,
        correlation({ strength: 'speculative', proposedReading: 'Could the image of a falsified measure illuminate this event?' }),
      ),
    ).toBe(true);
  });
  it('approved records must name a human reviewer and time', () => {
    expect(ok(ScripturalCorrelation, { ...correlation(), review: { status: 'approved' } })).toBe(false);
    expect(
      ok(ScripturalCorrelation, correlation({ review: { status: 'approved', reviewedBy: 'Reviewer', reviewedAt: '2026-11-17T00:00:00Z' } })),
    ).toBe(true);
  });
  it('rejects verseEnd before verseStart', () => {
    expect(
      ok(ScripturalCorrelation, correlation({ passages: [{ book: 'Proverbs', chapter: 11, verseStart: 5, verseEnd: 2, canon: 'PROTESTANT-CANON' }] })),
    ).toBe(false);
  });
});

describe('Scenario', () => {
  it('accepts a conditional scenario', () => {
    expect(ok(Scenario, scenario())).toBe(true);
  });
  it('requires a conditional title', () => {
    expect(ok(Scenario, scenario({ title: 'The described sequence will be a moral pattern' }))).toBe(false);
  });
  it('cannot carry event input — scenarios are derived from scripture only', () => {
    expect(ok(Scenario, { ...scenario(), eventIds: ['test-event'] })).toBe(false);
    expect(ok(Scenario, { ...scenario(), metrics: [] })).toBe(false);
  });
  it('requires whatThisDoesNotClaim and at least one sourced objection', () => {
    expect(ok(Scenario, scenario({ whatThisDoesNotClaim: '' }))).toBe(false);
    expect(ok(Scenario, scenario({ majorScholarlyObjections: [] }))).toBe(false);
  });
  it('requires sequence steps numbered 1..n that point at real passages', () => {
    expect(
      ok(Scenario, scenario({ describedSequence: [{ order: 2, description: 'x', passageIndexes: [0] }] })),
    ).toBe(false);
    expect(
      ok(Scenario, scenario({ describedSequence: [{ order: 1, description: 'x', passageIndexes: [3] }] })),
    ).toBe(false);
  });
  it('takes exactly one tradition', () => {
    expect(ok(Scenario, { ...scenario(), tradition: ['idealist'] })).toBe(false);
  });
});
