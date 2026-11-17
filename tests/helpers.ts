/**
 * Test factories. Every record below is SYNTHETIC test data — ids, URLs and text are
 * placeholders that exist only to exercise the validators. None of it is content, none of
 * it may be copied into src/data, and none of it is a real citation.
 */
import type {
  EvidentiarySource,
  InterpretiveSource,
  ScripturalCorrelation,
  Scenario,
  VerifiedEvent,
} from '../src/schemas';
import type { ParsedDataset } from '../src/validation/types';

export const NOW = new Date('2026-11-17T00:00:00Z');

export function evidentiary(overrides: Partial<EvidentiarySource> = {}): EvidentiarySource {
  return {
    kind: 'evidentiary',
    id: 'test-primary-source',
    tier: '1-primary',
    title: 'Synthetic primary record',
    publisher: 'Example Agency',
    url: 'https://example.gov/record',
    archiveUrl: 'https://web.archive.org/web/2026/https://example.gov/record',
    accessedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

export function interpretive(overrides: Partial<InterpretiveSource> = {}): InterpretiveSource {
  return {
    kind: 'interpretive',
    id: 'test-commentary',
    interpretiveClass: 'commentary',
    tradition: 'Synthetic tradition',
    composed: 'synthetic',
    title: 'Synthetic commentary',
    publisher: 'Example Press',
    url: 'https://example.org/commentary',
    accessedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

export function event(overrides: Partial<VerifiedEvent> = {}): VerifiedEvent {
  return {
    id: 'test-event',
    domain: 'cyber',
    title: 'Synthetic test event',
    summary: 'A synthetic record used only to exercise the validators.',
    date: { start: '2026-01-15', precision: 'day' },
    geography: { scope: 'us-federal', countries: ['US'] },
    metrics: [
      {
        label: 'Affected systems',
        value: 10,
        unit: 'systems',
        asOf: '2026-01-20',
        sourceId: 'test-primary-source',
        isEstimate: false,
      },
    ],
    sources: ['test-primary-source'],
    lastVerified: '2026-11-01T00:00:00Z',
    confidence: 'confirmed',
    usImpact: 'Synthetic US impact text.',
    globalContext: 'Synthetic global context text.',
    ...overrides,
  };
}

export const VALID_COUNTER_READING =
  'This is a structural analogy, not a reference. The passage addresses individual commercial honesty in an agrarian economy and makes no claim about technology or future events.';

export function correlation(overrides: Partial<ScripturalCorrelation> = {}): ScripturalCorrelation {
  return {
    id: 'test-correlation',
    eventIds: ['test-event'],
    passages: [{ book: 'Proverbs', chapter: 11, verseStart: 1, canon: 'PROTESTANT-CANON' }],
    strength: 'thematic-parallel',
    hermeneuticTradition: ['idealist'],
    proposedReading:
      'The passage condemns a falsified measuring instrument whose trustworthiness everyone assumes.',
    counterReading: VALID_COUNTER_READING,
    scholarlySupport: [],
    review: { status: 'draft' },
    isInterpretation: true,
    ...overrides,
  } as ScripturalCorrelation;
}

export function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'test-scenario',
    title: 'If the idealist reading of Proverbs 11 is applied, the described sequence would be a moral pattern',
    passages: [{ book: 'Proverbs', chapter: 11, verseStart: 1, canon: 'PROTESTANT-CANON' }],
    tradition: 'idealist',
    describedSequence: [
      { order: 1, description: 'A trusted measure is falsified.', passageIndexes: [0] },
      { order: 2, description: 'The passage pronounces the falsification abominable.', passageIndexes: [0] },
    ],
    whatThisDoesNotClaim:
      'This does not claim that any present-day event is described by the passage, nor assign any timing.',
    majorScholarlyObjections: [
      {
        objection: 'Wisdom literature states general observations, not sequences of future events.',
        sourceId: 'test-commentary',
      },
    ],
    review: { status: 'draft' },
    isInterpretation: true,
    ...overrides,
  } as Scenario;
}

/** A small dataset that passes every gate. Tests mutate one thing at a time. */
export function validDataset(): ParsedDataset {
  return {
    sources: [
      { file: 'sources.json', record: evidentiary() },
      { file: 'sources.json', record: interpretive() },
    ],
    events: [{ file: 'events/cyber/test-event.json', record: event() }],
    correlations: [{ file: 'correlations/test-correlation.yaml', record: correlation() }],
    scenarios: [{ file: 'scenarios/test-scenario.yaml', record: scenario() }],
  };
}

export function rules(issues: { rule: string; severity: string }[], severity = 'error'): string[] {
  return issues.filter((i) => i.severity === severity).map((i) => i.rule);
}
