/**
 * LAYER B — THE INTERPRETATION LAYER (spec §1, §4).
 *
 * A proposed relationship between Layer A events and scripture. Always interpretation,
 * never fact. Rules that need only the record itself are enforced here; rules that need
 * the source registry or other records live in the credibility gate.
 */
import { z } from 'zod';
import { NonBlank, Slug } from './common';
import { CorrelationStrength, HermeneuticTradition, SupportPosition } from './enums';
import { PassageRef } from './passage';
import { Review } from './review';

export const COUNTER_READING_MIN_CHARS = 80;

export const ScholarlySupport = z.strictObject({
  /** Bibliographic citation, exactly as the work gives it. Exempt from the certainty-term scan. */
  citation: NonBlank(),
  sourceId: Slug,
  position: SupportPosition,
});
export type ScholarlySupport = z.infer<typeof ScholarlySupport>;

/** Required for `numerical-symbolic`: disclose the method and show the arithmetic (spec §1). */
export const NumericalMethod = z.strictObject({
  method: NonBlank(40),
  arithmetic: NonBlank(),
});

export const ScripturalCorrelation = z
  .strictObject({
    id: Slug,
    eventIds: z.array(Slug).min(1),
    passages: z.array(PassageRef).min(1),
    strength: CorrelationStrength,
    hermeneuticTradition: z
      .array(HermeneuticTradition)
      .min(1)
      .refine((a) => new Set(a).size === a.length, 'hermeneuticTradition must not repeat'),
    /** The correlation, stated as a proposal. */
    proposedReading: NonBlank(40),
    /** REQUIRED. The strongest scholarly argument against this correlation. */
    counterReading: NonBlank(COUNTER_READING_MIN_CHARS),
    scholarlySupport: z.array(ScholarlySupport),
    numericalMethod: NumericalMethod.optional(),
    review: Review,
    /** Literal true: a correlation cannot be typed or stored as anything but interpretation. */
    isInterpretation: z.literal(true),
  })
  .superRefine((c, ctx) => {
    if (c.strength === 'numerical-symbolic' && c.numericalMethod === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['numericalMethod'],
        message: 'numerical-symbolic correlations must disclose numericalMethod (method + arithmetic)',
      });
    }
    if (c.strength !== 'numerical-symbolic' && c.numericalMethod !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['numericalMethod'],
        message: 'numericalMethod is only valid on numerical-symbolic correlations',
      });
    }
    if (c.strength === 'speculative' && !c.proposedReading.trim().endsWith('?')) {
      ctx.addIssue({
        code: 'custom',
        path: ['proposedReading'],
        message: 'speculative correlations must be phrased as a question (end with "?")',
      });
    }
  });
export type ScripturalCorrelation = z.infer<typeof ScripturalCorrelation>;
