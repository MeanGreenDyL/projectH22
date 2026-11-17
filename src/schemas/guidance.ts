/**
 * Preparedness guidance (spec §9). One record = one piece of official or professional guidance,
 * quoted from its source and restated in plain language. Facts, not interpretation: the module is
 * built "entirely from official and professional guidance, cited the same way as everything else".
 *
 * A figure the calculator uses (water per person per day, a food-safety threshold) lives in
 * `quantity`, so no number reaches the page without a quote and a source behind it.
 * Safety wording rules (no dosing, no weapons, no dread) live in the credibility gate.
 */
import { z } from 'zod';
import { IsoDate, NonBlank, Slug } from './common';

export const GUIDANCE_TOPICS = [
  'carbon-monoxide',
  'generator',
  'heating',
  'water',
  'food',
  'power',
  'communication',
  'sanitation',
  'first-aid-referral',
  'kit',
] as const;
export const GuidanceTopic = z.enum(GUIDANCE_TOPICS);

/** Topics whose content must lead with the hazard (spec §9 safety rule 2). */
export const HAZARD_FIRST_TOPICS: readonly z.infer<typeof GuidanceTopic>[] = ['carbon-monoxide', 'generator', 'heating'];

/** The tiered view's thresholds (spec §9). Labels only; content comes from records. */
export const PREPAREDNESS_STAGES = ['first-2-hours', 'first-24-hours', 'first-72-hours', 'first-2-weeks', 'first-30-days'] as const;
export const PreparednessStage = z.enum(PREPAREDNESS_STAGES);
export const STAGE_LABEL: Record<z.infer<typeof PreparednessStage>, string> = {
  'first-2-hours': 'First 2 hours',
  'first-24-hours': 'First 24 hours',
  'first-72-hours': 'First 72 hours',
  'first-2-weeks': 'First 2 weeks',
  'first-30-days': 'First 30 days',
};

/** How a calculator quantity scales: per person per day, per person, or once per household. */
export const QUANTITY_BASES = ['person-day', 'person', 'household'] as const;

export const GuidanceQuantity = z.strictObject({
  /** Stable key the calculator looks up, e.g. "drinking-water". */
  key: Slug,
  value: z.number().positive(),
  unit: NonBlank(),
  per: z.enum(QUANTITY_BASES),
  /** Applies only when the household selects this condition (e.g. a hot climate), if set. */
  condition: z.enum(['hot-climate']).optional(),
});

export const Guidance = z.strictObject({
  id: Slug,
  topic: GuidanceTopic,
  title: NonBlank().max(120),
  /** Plain-language restatement. Must not add anything the quote does not say. */
  statement: NonBlank(20),
  /** The source's own words, verbatim. */
  quote: NonBlank(20),
  sourceId: Slug,
  /** Where in the source: a section heading or page. */
  locator: NonBlank().optional(),
  /** True for a hazard statement; hazard records render before any instructions in their topic. */
  hazard: z.boolean(),
  stages: z.array(PreparednessStage).default([]),
  quantity: GuidanceQuantity.optional(),
  lastVerified: IsoDate,
});
export type Guidance = z.infer<typeof Guidance>;
export type GuidanceTopic = z.infer<typeof GuidanceTopic>;
export type PreparednessStage = z.infer<typeof PreparednessStage>;
