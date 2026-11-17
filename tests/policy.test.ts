import { describe, expect, it } from 'vitest';
import { isPublished, isVisibleByDefault, needsSingleSourceMarker, summaryEligible } from '../src/lib/policy';
import { CORRELATION_STRENGTHS } from '../src/schemas';
import { correlation, event, evidentiary } from './helpers';

const approved = { status: 'approved', reviewedBy: 'Reviewer', reviewedAt: '2026-11-17T00:00:00Z' } as const;

describe('correlation display policy (spec §1 hard rule 2)', () => {
  it('only human-approved correlations are published', () => {
    expect(isPublished(correlation())).toBe(false);
    expect(isPublished(correlation({ review: approved }))).toBe(true);
  });
  it('numerical-symbolic and speculative are hidden by default and excluded from summaries', () => {
    for (const strength of CORRELATION_STRENGTHS) {
      const c = correlation({ strength, review: approved });
      const weak = strength === 'numerical-symbolic' || strength === 'speculative';
      expect(isVisibleByDefault(c)).toBe(!weak);
      expect(summaryEligible(c)).toBe(!weak);
    }
  });
  it('drafts are never visible or counted', () => {
    expect(isVisibleByDefault(correlation())).toBe(false);
    expect(summaryEligible(correlation())).toBe(false);
  });
});

describe('SINGLE-SOURCE marker (spec §5 rule 1)', () => {
  it('fires when every source is Tier 4/5', () => {
    const sources = new Map([
      ['a', evidentiary({ id: 'a', tier: '4-quality-press' })],
      ['b', evidentiary({ id: 'b', tier: '5-specialist-press' })],
    ]);
    expect(needsSingleSourceMarker(event({ sources: ['a', 'b'] }), sources)).toBe(true);
  });
  it('does not fire when a stronger source is present', () => {
    const sources = new Map([
      ['a', evidentiary({ id: 'a', tier: '4-quality-press' })],
      ['c', evidentiary({ id: 'c', tier: '1-primary' })],
    ]);
    expect(needsSingleSourceMarker(event({ sources: ['a', 'c'] }), sources)).toBe(false);
  });
});
