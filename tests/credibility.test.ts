import { describe, expect, it } from 'vitest';
import { runCredibilityGate } from '../src/validation/credibility';
import { FORBIDDEN_CERTAINTY_TERMS, findTerms } from '../src/validation/credibility/terms';
import type { ParsedDataset } from '../src/validation/types';
import { correlation, event, evidentiary, interpretive, NOW, rules, scenario, validDataset } from './helpers';

const run = (d: ParsedDataset) => runCredibilityGate(d, { now: NOW });

function withSources(d: ParsedDataset, ...sources: ReturnType<typeof evidentiary | typeof interpretive>[]) {
  d.sources = sources.map((record) => ({ file: 'sources.json', record }));
  return d;
}

describe('credibility gate baseline', () => {
  it('passes the valid synthetic dataset with no issues', () => {
    expect(run(validDataset())).toEqual([]);
  });
  it('passes an empty dataset', () => {
    expect(run({ sources: [], events: [], correlations: [], scenarios: [], series: [], guidance: [] })).toEqual([]);
  });
});

describe('sources', () => {
  it('Tier 4/5 sources must be archived', () => {
    const d = withSources(validDataset(), evidentiary(), interpretive(), evidentiary({ id: 'press', tier: '4-quality-press', archiveUrl: undefined } as never));
    expect(rules(run(d))).toContain('SRC-ARCHIVE-TIER45');
  });
});

describe('series', () => {
  it('must cite a Tier 1–4 evidentiary source', () => {
    const d = validDataset();
    d.series[0]!.record = { ...d.series[0]!.record, sourceId: 'test-commentary' };
    expect(rules(run(d))).toContain('SER-SOURCE');
    const t5 = withSources(validDataset(), evidentiary({ tier: '5-specialist-press' }), interpretive());
    expect(rules(run(t5))).toContain('SER-SOURCE');
  });
});

describe('fact layer (Layer A)', () => {
  it('accepts Tier 1 to Tier 4 sources (Tier 3/4-only events carry the SINGLE-SOURCE marker in the UI)', () => {
    for (const tier of ['1-primary', '2-peer-reviewed', '3-institutional', '4-quality-press'] as const) {
      const d = withSources(validDataset(), evidentiary({ tier }), interpretive());
      expect(rules(run(d))).not.toContain('EVT-QUALIFYING-TIER');
    }
  });
  it('never lets Tier 5 specialist press be the only source (spec §5)', () => {
    const d = withSources(validDataset(), evidentiary({ tier: '5-specialist-press' }), interpretive());
    expect(rules(run(d))).toContain('EVT-QUALIFYING-TIER');
  });
  it('never accepts an interpretive source as evidence for an event', () => {
    const d = validDataset();
    d.events[0]!.record = event({ sources: ['test-primary-source', 'test-commentary'] });
    expect(rules(run(d))).toContain('EVT-INTERPRETIVE-SOURCE');
  });
  it('requires at least one archived source per event', () => {
    const d = withSources(validDataset(), evidentiary({ archiveUrl: undefined } as never), interpretive());
    expect(rules(run(d))).toContain('EVT-ARCHIVE');
  });
  it('every metric source must be one of the event sources', () => {
    const d = withSources(validDataset(), evidentiary(), evidentiary({ id: 'other-primary' }), interpretive());
    const e = event();
    d.events[0]!.record = { ...e, metrics: [{ ...e.metrics[0]!, sourceId: 'other-primary' }] };
    expect(rules(run(d))).toContain('EVT-METRIC-SOURCE-CITED');
  });
  it('disputed events must cite sources on both sides', () => {
    const d = withSources(validDataset(), evidentiary(), evidentiary({ id: 'second-primary' }), interpretive());
    d.events[0]!.record = event({ confidence: 'disputed', sources: ['test-primary-source', 'second-primary'] });
    expect(rules(run(d))).toContain('EVT-DISPUTED-BOTH-SIDES');
    d.events[0]!.record = event({
      confidence: 'disputed',
      sources: ['test-primary-source', 'second-primary'],
      sourcePositions: [
        { sourceId: 'test-primary-source', position: 'affirms' },
        { sourceId: 'second-primary', position: 'contests' },
      ],
    });
    expect(rules(run(d))).not.toContain('EVT-DISPUTED-BOTH-SIDES');
  });
  it('source positions must reference the event sources', () => {
    const d = withSources(validDataset(), evidentiary(), evidentiary({ id: 'uncited' }), interpretive());
    d.events[0]!.record = event({ sourcePositions: [{ sourceId: 'uncited', position: 'affirms' }] });
    expect(rules(run(d))).toContain('EVT-POSITIONS-CITED');
  });
  it.each([
    'Analysts called it a prophecy coming true.',
    'A biblical-scale flood hit the region.',
    'Commentators described an apocalyptic scene.',
    'The outage was seen as a sign of the end times.',
    'Some called it Armageddon for the market.',
  ])('keeps interpretive vocabulary out of the fact layer: %j', (summary) => {
    const d = validDataset();
    d.events[0]!.record = event({ summary });
    expect(rules(run(d))).toContain('EVT-INTERPRETIVE-LANGUAGE');
  });
  it('warns (does not fail) when the US / global lens is missing', () => {
    const d = validDataset();
    const { usImpact: _u, globalContext: _g, ...rest } = event();
    d.events[0]!.record = rest;
    const issues = run(d);
    expect(rules(issues, 'warning')).toEqual(['EVT-LENS']);
    expect(rules(issues)).toEqual([]);
  });
  it('rejects lastVerified in the future', () => {
    const d = validDataset();
    d.events[0]!.record = event({ lastVerified: '2027-01-01T00:00:00Z' });
    expect(rules(run(d))).toContain('EVT-LAST-VERIFIED-FUTURE');
  });
});

describe('interpretation layer (Layer B)', () => {
  it('forbidden certainty terms list contains the spec terms', () => {
    for (const t of ['fulfilled', 'proves', 'confirms', 'exactly as predicted']) {
      expect(FORBIDDEN_CERTAINTY_TERMS).toContain(t);
    }
  });
  it.each([
    'This event fulfilled the passage.',
    'The record PROVES the reading.',
    'It confirms the prophecy.',
    'It happened exactly as predicted.',
    'A clear fulfillment of the text.',
    'The British spelling fulfilment counts too.',
    'This is proof of the reading.',
    'The reading was proven.',
  ])('fails the build on certainty language: %j', (text) => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({ proposedReading: `${text} Padding to reach the minimum length.` });
    expect(rules(run(d))).toContain('COR-CERTAINTY-TERMS');
  });
  it('scans every interpretive field, including counterReading', () => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({
      counterReading: `${'This is a structural analogy and nothing more. '.repeat(2)}It confirms nothing about the event.`,
    });
    expect(rules(run(d))).toContain('COR-CERTAINTY-TERMS');
  });
  it('does not scan bibliographic citations, which must be quoted exactly', () => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({
      scholarlySupport: [{ citation: 'Synthetic, "The Proof of Things" (Example Press)', sourceId: 'test-commentary', position: 'neutral-descriptive' }],
    });
    expect(rules(run(d))).not.toContain('COR-CERTAINTY-TERMS');
  });
  it('matches whole words only', () => {
    expect(findTerms('waterproof, approves, reconfirmsx', FORBIDDEN_CERTAINTY_TERMS)).toEqual([]);
  });
  it('direct-textual needs two supporting Tier 1 or Tier 2 citations', () => {
    const d = withSources(validDataset(), evidentiary(), evidentiary({ id: 'journal', tier: '2-peer-reviewed' }), evidentiary({ id: 'think-tank', tier: '3-institutional' }), interpretive());
    const support = (sourceId: string, position: 'supports' | 'opposes' = 'supports') => ({ citation: 'Synthetic citation', sourceId, position });
    d.correlations[0]!.record = correlation({ strength: 'direct-textual', scholarlySupport: [support('test-primary-source')] });
    expect(rules(run(d))).toContain('COR-DIRECT-TEXTUAL-SUPPORT');
    d.correlations[0]!.record = correlation({ strength: 'direct-textual', scholarlySupport: [support('test-primary-source'), support('think-tank')] });
    expect(rules(run(d))).toContain('COR-DIRECT-TEXTUAL-SUPPORT');
    d.correlations[0]!.record = correlation({ strength: 'direct-textual', scholarlySupport: [support('test-primary-source'), support('journal', 'opposes')] });
    expect(rules(run(d))).toContain('COR-DIRECT-TEXTUAL-SUPPORT');
    d.correlations[0]!.record = correlation({ strength: 'direct-textual', scholarlySupport: [support('test-primary-source'), support('test-commentary')] });
    expect(rules(run(d))).toContain('COR-DIRECT-TEXTUAL-SUPPORT');
    d.correlations[0]!.record = correlation({ strength: 'direct-textual', scholarlySupport: [support('test-primary-source'), support('journal')] });
    expect(rules(run(d))).not.toContain('COR-DIRECT-TEXTUAL-SUPPORT');
  });
  it('typological must cite a supporting commentator', () => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({ strength: 'typological' });
    expect(rules(run(d))).toContain('COR-TYPOLOGICAL-COMMENTATOR');
    d.correlations[0]!.record = correlation({
      strength: 'typological',
      scholarlySupport: [{ citation: 'Synthetic commentary, vol. 1', sourceId: 'test-commentary', position: 'supports' }],
    });
    expect(rules(run(d))).not.toContain('COR-TYPOLOGICAL-COMMENTATOR');
  });
  it('re-checks counterReading even if a record bypassed the schema', () => {
    const d = validDataset();
    d.correlations[0]!.record = { ...correlation(), counterReading: '   ' };
    expect(rules(run(d))).toContain('COR-COUNTER-READING');
  });
  it('canon badge must match the book registry', () => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({ passages: [{ book: 'Tobit', chapter: 1, verseStart: 1, canon: 'PROTESTANT-CANON' }] });
    expect(rules(run(d))).toContain('PASSAGE-CANON');
    d.correlations[0]!.record = correlation({ passages: [{ book: 'Tobit', chapter: 1, verseStart: 1, canon: 'DEUTEROCANON' }] });
    expect(rules(run(d))).not.toContain('PASSAGE-CANON');
  });
  it('rejects books that are not in the registry', () => {
    const d = validDataset();
    d.correlations[0]!.record = correlation({ passages: [{ book: 'Prov', chapter: 11, verseStart: 1, canon: 'PROTESTANT-CANON' }] });
    expect(rules(run(d))).toContain('PASSAGE-UNKNOWN-BOOK');
  });
});

describe('scenarios', () => {
  it('fails on any date, year, countdown or time window in any field', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({
      describedSequence: [{ order: 1, description: 'Within seven years a trusted measure is falsified.', passageIndexes: [0] }],
    });
    expect(rules(run(d))).toContain('SCN-NO-DATES');
    d.scenarios[0]!.record = scenario({ whatThisDoesNotClaim: 'This does not claim anything will happen before 2030 or after it.' });
    expect(rules(run(d))).toContain('SCN-NO-DATES');
  });
  it('allows the passage\'s own figures when declared in textualFigures', () => {
    const d = validDataset();
    const passages = [{ book: 'Revelation', chapter: 12, verseStart: 6, canon: 'PROTESTANT-CANON' as const }];
    const describedSequence = [{ order: 1, description: 'The woman is fed in the wilderness for "a thousand two hundred and threescore days".', passageIndexes: [0] }];
    d.scenarios[0]!.record = scenario({ passages, describedSequence });
    expect(rules(run(d))).toContain('SCN-NO-DATES');
    d.scenarios[0]!.record = scenario({
      passages,
      describedSequence,
      textualFigures: [{ passageIndex: 0, figure: 'a thousand two hundred and threescore days' }],
    });
    expect(rules(run(d))).not.toContain('SCN-NO-DATES');
  });
  it('the exception covers only the declared figure, not other dates in the same field', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({
      passages: [{ book: 'Revelation', chapter: 12, verseStart: 6, canon: 'PROTESTANT-CANON' }],
      describedSequence: [{ order: 1, description: 'For "a thousand two hundred and threescore days", ending in 2031.', passageIndexes: [0] }],
      textualFigures: [{ passageIndex: 0, figure: 'a thousand two hundred and threescore days' }],
    });
    expect(rules(run(d))).toContain('SCN-NO-DATES');
  });
  it('a declared figure may not itself be a calendar year or era date', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({
      describedSequence: [{ order: 1, description: 'The temple falls in "AD 70".', passageIndexes: [0] }],
      textualFigures: [{ passageIndex: 0, figure: 'AD 70' }],
    });
    expect(rules(run(d))).toContain('SCN-TEXTUAL-FIGURE');
  });
  it('fails on certainty language', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({
      describedSequence: [{ order: 1, description: 'The measure is falsified and the text is fulfilled.', passageIndexes: [0] }],
    });
    expect(rules(run(d))).toContain('SCN-CERTAINTY-TERMS');
  });
  it.each([
    'The described ruler resembles President Smith.',
    'The merchant resembles Example Holdings Inc.',
    'Sen. Jones fits the image.',
    'A company like Example Corp. is described.',
  ])('screens for named officials and companies: %j', (description) => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({ describedSequence: [{ order: 1, description, passageIndexes: [0] }] });
    expect(rules(run(d))).toContain('SCN-NAMED-ENTITY');
  });
  it('does not flag biblical titles', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({
      describedSequence: [{ order: 1, description: 'King Nebuchadnezzar sees the image; the prince of Persia withstands.', passageIndexes: [0] }],
    });
    expect(rules(run(d))).not.toContain('SCN-NAMED-ENTITY');
  });
  it('requires a canon note when a passage is outside the Protestant canon', () => {
    const d = validDataset();
    const passages = [{ book: '2 Esdras', chapter: 11, verseStart: 1, canon: 'APOCRYPHA-WIDER' as const }];
    d.scenarios[0]!.record = scenario({ passages });
    expect(rules(run(d))).toContain('SCN-CANON-NOTE');
    d.scenarios[0]!.record = scenario({ passages, canonNote: 'This book is not received as canonical by all traditions.' });
    expect(rules(run(d))).not.toContain('SCN-CANON-NOTE');
  });
  it('checks scenario passages against the canon registry too', () => {
    const d = validDataset();
    d.scenarios[0]!.record = scenario({ passages: [{ book: 'Sirach', chapter: 1, verseStart: 1, canon: 'PROTESTANT-CANON' }] });
    expect(rules(run(d))).toContain('PASSAGE-CANON');
  });
});
