/**
 * Closed vocabularies shared by every schema. Each enum is defined once here so the
 * data model, validators, legends and filters cannot drift apart.
 */
import { z } from 'zod';

// ---------- Fact layer ----------

export const DOMAINS = [
  'cyber',
  'crypto',
  'us-law',
  'geopolitical',
  'economic',
  'infrastructure',
  'natural',
] as const;
export const Domain = z.enum(DOMAINS);
export type Domain = z.infer<typeof Domain>;

export const DATE_PRECISIONS = ['day', 'month', 'quarter', 'year', 'approximate'] as const;
export const DatePrecision = z.enum(DATE_PRECISIONS);
export type DatePrecision = z.infer<typeof DatePrecision>;

export const GEO_SCOPES = ['us-federal', 'us-state', 'us-local', 'regional', 'global'] as const;
export const GeoScope = z.enum(GEO_SCOPES);
export type GeoScope = z.infer<typeof GeoScope>;

export const CONFIDENCE_LEVELS = ['confirmed', 'reported', 'disputed', 'unverified'] as const;
export const Confidence = z.enum(CONFIDENCE_LEVELS);
export type Confidence = z.infer<typeof Confidence>;

// ---------- Sources ----------

/** Evidentiary tiers (spec §5). Only these may support a factual claim. */
export const EVIDENTIARY_TIERS = [
  '1-primary',
  '2-peer-reviewed',
  '3-institutional',
  '4-quality-press',
  '5-specialist-press',
] as const;
export const EvidentiaryTier = z.enum(EVIDENTIARY_TIERS);
export type EvidentiaryTier = z.infer<typeof EvidentiaryTier>;

/** Plain-language tier labels and definitions (spec §5), for legends and the /sources page. */
export const TIER_LABELS: Record<EvidentiaryTier, string> = {
  '1-primary': 'Tier 1 · Primary',
  '2-peer-reviewed': 'Tier 2 · Peer-reviewed',
  '3-institutional': 'Tier 3 · Institutional research',
  '4-quality-press': 'Tier 4 · Quality press',
  '5-specialist-press': 'Tier 5 · Specialist press',
};
export const TIER_DEFINITIONS: Record<EvidentiaryTier, string> = {
  '1-primary': 'Government records and raw data, UN and agency data, court filings, original manuscripts and critical editions.',
  '2-peer-reviewed': 'Journal articles with DOIs, university press books, systematic reviews, and working papers (marked as preprints).',
  '3-institutional': 'Research institutions and international bodies such as the World Bank, IMF, RAND or Pew, and professional bodies.',
  '4-quality-press': 'News organisations with institutional editorial standards, such as Reuters, AP or the Financial Times. Always archived.',
  '5-specialist-press': 'Trade and specialist press. Credible in its field, but never the only source for a headline claim. Always archived.',
};

/**
 * Tiers that qualify a record for the fact layer. Spec §1 asked for Tier 1/2 only; the owner
 * decided on 2026-11-17 to admit Tier 3/4-sourced events, which then carry the SINGLE-SOURCE
 * marker (src/lib/policy.ts). Tier 5 is never the sole source (spec §5).
 */
export const FACT_LAYER_QUALIFYING_TIERS: readonly EvidentiaryTier[] = [
  '1-primary',
  '2-peer-reviewed',
  '3-institutional',
  '4-quality-press',
];

/** Events without at least one of these show the SINGLE-SOURCE marker. */
export const STRONG_EVIDENCE_TIERS: readonly EvidentiaryTier[] = ['1-primary', '2-peer-reviewed'];

/** Tiers that must always carry an archiveUrl (spec §5 Source schema comment). */
export const ARCHIVE_REQUIRED_TIERS: readonly EvidentiaryTier[] = ['4-quality-press', '5-specialist-press'];

/**
 * Interpretive source classes (spec §5 rule 5). Theological and interpretive sources are
 * tiered separately and can never count as evidence for a factual claim.
 */
export const INTERPRETIVE_CLASSES = [
  'commentary', // e.g. Keil & Delitzsch, Matthew Henry, Barnes, Gill
  'theological-scholarship', // academic biblical studies / theology monographs and articles
  'reference-work', // Britannica, Oxford Biblical Studies, Catholic / Jewish Encyclopedia
  'lexicon', // Strong's, Thayer's, Gesenius'
] as const;
export const InterpretiveClass = z.enum(INTERPRETIVE_CLASSES);
export type InterpretiveClass = z.infer<typeof InterpretiveClass>;

// ---------- Interpretation layer ----------

export const CORRELATION_STRENGTHS = [
  'direct-textual',
  'thematic-parallel',
  'typological',
  'numerical-symbolic',
  'speculative',
] as const;
export const CorrelationStrength = z.enum(CORRELATION_STRENGTHS);
export type CorrelationStrength = z.infer<typeof CorrelationStrength>;

/** Legend copy for the strength taxonomy (spec §1). Shown wherever correlations appear. */
export const CORRELATION_STRENGTH_DEFINITIONS: Record<CorrelationStrength, string> = {
  'direct-textual':
    'The passage names the specific entity, place, or nation involved, and mainstream scholarship agrees on the referent. Rare.',
  'thematic-parallel':
    'The passage describes a category of event that this event falls within. The most common honest value.',
  typological:
    'A recognized interpretive pattern (type/antitype) applied by named historical commentators, who are cited.',
  'numerical-symbolic':
    'Rests on numbers, counts, or calendar math. The method and arithmetic are shown. The weakest class of claim.',
  speculative: 'Offered as a question, not a claim.',
};

export const HERMENEUTIC_TRADITIONS = ['preterist', 'historicist', 'futurist', 'idealist'] as const;
export const HermeneuticTradition = z.enum(HERMENEUTIC_TRADITIONS);
export type HermeneuticTradition = z.infer<typeof HermeneuticTradition>;

export const HERMENEUTIC_TRADITION_DEFINITIONS: Record<HermeneuticTradition, string> = {
  preterist: 'Reads the described events as located in the first century.',
  historicist: 'Reads the described events as unfolding across church history.',
  futurist: 'Reads the described events as still to come.',
  idealist: 'Reads the passage as a symbolic, timeless moral pattern.',
};

export const CANONS = ['PROTESTANT-CANON', 'DEUTEROCANON', 'APOCRYPHA-WIDER', 'PSEUDEPIGRAPHA'] as const;
export const Canon = z.enum(CANONS);
export type Canon = z.infer<typeof Canon>;

export const SUPPORT_POSITIONS = ['supports', 'opposes', 'neutral-descriptive'] as const;
export const SupportPosition = z.enum(SUPPORT_POSITIONS);
export type SupportPosition = z.infer<typeof SupportPosition>;

/** Agents may write `draft`. Only a human may set `approved` (spec §6b). */
export const REVIEW_STATUSES = ['draft', 'approved'] as const;
export const ReviewStatus = z.enum(REVIEW_STATUSES);
export type ReviewStatus = z.infer<typeof ReviewStatus>;
