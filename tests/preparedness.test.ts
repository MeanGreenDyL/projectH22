/** Spec §9: preparedness guidance rules and the supply calculator. SYNTHETIC records only. */
import { describe, expect, it } from 'vitest';
import { calculate, clampInput, hazardFirst } from '../src/lib/supply-calc';
import { Guidance } from '../src/schemas';
import { runCredibilityGate } from '../src/validation/credibility';
import { PREPAREDNESS_DOSING_TERMS, PREPAREDNESS_DREAD_TERMS, PREPAREDNESS_WEAPONS_TERMS, findTerms } from '../src/validation/credibility/terms';
import type { ParsedDataset } from '../src/validation/types';
import { evidentiary, guidance, interpretive, NOW, rules, validDataset } from './helpers';

const run = (d: ParsedDataset) => runCredibilityGate(d, { now: NOW });
const withGuidance = (...gs: ReturnType<typeof guidance>[]) => ({ ...validDataset(), guidance: gs.map((record) => ({ file: `guidance/${record.id}.json`, record })) });

describe('Guidance schema', () => {
  it('accepts the synthetic record', () => {
    expect(Guidance.safeParse(guidance()).success).toBe(true);
  });
  it('requires a quote and a source', () => {
    expect(Guidance.safeParse({ ...guidance(), quote: '' }).success).toBe(false);
    const { sourceId: _s, ...noSource } = guidance();
    expect(Guidance.safeParse(noSource).success).toBe(false);
  });
  it('rejects a non-positive quantity', () => {
    expect(Guidance.safeParse(guidance({ quantity: { key: 'drinking-water', value: 0, unit: 'units', per: 'person-day' } })).success).toBe(false);
  });
});

describe('guidance credibility rules', () => {
  it('the valid dataset passes', () => {
    expect(rules(run(validDataset()))).toEqual([]);
  });
  it('GUI-SOURCE: interpretive, press and peer-reviewed sources are refused', () => {
    const d = withGuidance(guidance({ sourceId: 'test-commentary' }));
    expect(rules(run(d))).toContain('GUI-SOURCE');
    const press = { ...validDataset(), sources: [{ file: 'sources.json', record: evidentiary({ id: 'p', tier: '4-quality-press' }) }, { file: 'sources.json', record: interpretive() }], guidance: [{ file: 'guidance/g.json', record: guidance({ id: 'g', sourceId: 'p' }) }] };
    expect(rules(run(press))).toContain('GUI-SOURCE');
  });
  it('GUI-ARCHIVE: the source must be archived', () => {
    const d = { ...withGuidance(guidance({ sourceId: 'na' })), sources: [...validDataset().sources, { file: 'sources.json', record: evidentiary({ id: 'na', archiveUrl: undefined }) }] };
    expect(rules(run(d))).toContain('GUI-ARCHIVE');
  });
  it.each([
    ['dosing', 'Take a dose of medicine every few hours.'],
    ['weapons', 'Keep a firearm by the door during an outage.'],
    ['dread', 'Get ready for societal collapse with this kit.'],
  ])('GUI-SAFETY-TERMS: %s language fails', (_k, statement) => {
    expect(rules(run(withGuidance(guidance({ statement }))))).toContain('GUI-SAFETY-TERMS');
  });
  it('kit lists may still name prescription medications', () => {
    expect(rules(run(withGuidance(guidance({ statement: 'Include prescription medications in the kit, per the source.' }))))).toEqual([]);
  });
  it('GUI-HAZARD-FIRST: generator guidance needs a hazard statement', () => {
    const op = guidance({ id: 'gen-op', topic: 'generator', quantity: undefined });
    expect(rules(run(withGuidance(op)))).toContain('GUI-HAZARD-FIRST');
    expect(rules(run(withGuidance(op, guidance({ id: 'gen-hazard', topic: 'generator', hazard: true, quantity: undefined }))))).toEqual([]);
  });
  it('GUI-QUANTITY-DUPLICATE: one record per key and condition', () => {
    expect(rules(run(withGuidance(guidance({ id: 'a' }), guidance({ id: 'b' }))))).toContain('GUI-QUANTITY-DUPLICATE');
    const hot = guidance({ id: 'b', quantity: { key: 'drinking-water', value: 3, unit: 'units', per: 'person-day', condition: 'hot-climate' } });
    expect(rules(run(withGuidance(guidance({ id: 'a' }), hot)))).toEqual([]);
  });
  it('term lists match whole words only', () => {
    expect(findTerms('a gunnel and a dosimeter', [...PREPAREDNESS_WEAPONS_TERMS, ...PREPAREDNESS_DOSING_TERMS])).toEqual([]);
    expect(findTerms('Doomsday kit', PREPAREDNESS_DREAD_TERMS)).toEqual(['doomsday']);
  });
});

describe('supply calculator', () => {
  const water = guidance();
  it('multiplies a cited per-person-per-day figure and shows its working', () => {
    const [line] = calculate([water], { people: 4, days: 3, hotClimate: false });
    expect(line).toMatchObject({ key: 'drinking-water', amount: 24, unit: 'units', working: '2 units × 4 people × 3 days', sourceId: 'test-primary-source' });
  });
  it('shows no number for an item with no cited figure', () => {
    const lines = calculate([], { people: 2, days: 3, hotClimate: false }, [{ key: 'drinking-water', title: 'Drinking water' }]);
    expect(lines).toEqual([{ key: 'drinking-water', title: 'Drinking water', amount: undefined, unit: undefined, working: undefined, sourceId: undefined, guidanceId: undefined }]);
  });
  it('a hot-climate record replaces the base record only when selected', () => {
    const hot = guidance({ id: 'hot', quantity: { key: 'drinking-water', value: 3, unit: 'units', per: 'person-day', condition: 'hot-climate' } });
    expect(calculate([water, hot], { people: 1, days: 1, hotClimate: false })[0]?.amount).toBe(2);
    expect(calculate([water, hot], { people: 1, days: 1, hotClimate: true })[0]?.amount).toBe(3);
    expect(calculate([hot], { people: 1, days: 1, hotClimate: false })[0]?.amount).toBeUndefined();
  });
  it('per-household and per-person bases', () => {
    const kit = guidance({ id: 'k', quantity: { key: 'radio', value: 1, unit: 'radio', per: 'household' } });
    const masks = guidance({ id: 'm', quantity: { key: 'masks', value: 1, unit: 'mask', per: 'person' } });
    const out = calculate([kit, masks], { people: 5, days: 10, hotClimate: false });
    expect(out.map((l) => [l.key, l.amount])).toEqual([['radio', 1], ['masks', 5]]);
  });
  it('clamps inputs to the supported range', () => {
    expect(clampInput({ people: 0, days: 400, hotClimate: false })).toEqual({ people: 1, days: 30, hotClimate: false });
    expect(clampInput({ people: Number.NaN, days: 2.6, hotClimate: true })).toEqual({ people: 1, days: 3, hotClimate: true });
  });
  it('orders hazard statements first', () => {
    expect(hazardFirst([{ id: 'a', hazard: false }, { id: 'b', hazard: true }]).map((x) => x.id)).toEqual(['b', 'a']);
  });
});
