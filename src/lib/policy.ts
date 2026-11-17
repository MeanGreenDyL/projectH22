/**
 * Display policy shared by every page and chart. UI code must go through these helpers
 * rather than re-deriving the rules.
 */
import {
  type CorrelationStrength,
  type Source,
  type ScripturalCorrelation,
  type VerifiedEvent,
} from '../schemas';

/** Spec §1 hard rule 2: hidden by default, excluded from summary statistics, opt-in via filter. */
export const DEFAULT_EXCLUDED_STRENGTHS: readonly CorrelationStrength[] = ['numerical-symbolic', 'speculative'];

/** Only human-approved interpretation is ever rendered (spec §6b). */
export function isPublished(c: ScripturalCorrelation): boolean {
  return c.review.status === 'approved';
}

export function isVisibleByDefault(c: ScripturalCorrelation): boolean {
  return isPublished(c) && !DEFAULT_EXCLUDED_STRENGTHS.includes(c.strength);
}

/** Counts, matrices and homepage totals use only these. */
export function summaryEligible(c: ScripturalCorrelation): boolean {
  return isVisibleByDefault(c);
}

/** Spec §5 rule 1: an event whose only sources are Tier 4/5 shows a SINGLE-SOURCE marker. */
export function needsSingleSourceMarker(e: VerifiedEvent, sources: ReadonlyMap<string, Source>): boolean {
  const cited = e.sources.map((id) => sources.get(id));
  return cited.every((s) => s?.kind === 'evidentiary' && (s.tier === '4-quality-press' || s.tier === '5-specialist-press'));
}
