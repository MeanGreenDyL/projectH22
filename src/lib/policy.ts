/**
 * Display policy shared by every page and chart. UI code must go through these helpers
 * rather than re-deriving the rules.
 */
import {
  STRONG_EVIDENCE_TIERS,
  type CorrelationStrength,
  type Domain,
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

/**
 * Spec §5 rule 1, widened by the owner's 2026-11-17 decision: any event without a Tier 1 or
 * Tier 2 source shows the SINGLE-SOURCE marker.
 */
export function needsSingleSourceMarker(e: VerifiedEvent, sources: ReadonlyMap<string, Source>): boolean {
  return !e.sources.some((id) => {
    const s = sources.get(id);
    return s?.kind === 'evidentiary' && STRONG_EVIDENCE_TIERS.includes(s.tier);
  });
}

/** The four /domains/* pages (spec §7). */
export const DOMAIN_PAGES = ['cyber', 'crypto', 'us-law', 'global'] as const;
export type DomainPage = (typeof DOMAIN_PAGES)[number];

/**
 * Which page each data domain appears on (owner left this to Claude, 2026-11-17). Domain colors
 * stay per-domain, so global-page charts can still tell geopolitical from economic events.
 */
export const DOMAIN_ROUTE: Record<Domain, DomainPage> = {
  cyber: 'cyber',
  crypto: 'crypto',
  'us-law': 'us-law',
  geopolitical: 'global',
  economic: 'global',
  infrastructure: 'global',
  natural: 'global',
};
