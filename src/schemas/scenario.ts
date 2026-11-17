/**
 * Scripture-derived scenarios (spec §1 "The Prediction Module"). Strictest rules in the project.
 *
 * Derived from scripture text only: the schema is strict, so a scenario structurally cannot
 * carry event ids, metrics, trend data or any other input. The no-dates rule, certainty
 * terms, named-entity screen and canon note live in the credibility gate.
 */
import { z } from 'zod';
import { NonBlank, Slug } from './common';
import { HermeneuticTradition } from './enums';
import { PassageRef } from './passage';
import { Review } from './review';

export const SCENARIO_BANNER = 'Derived from scripture text only. Not a forecast. No dates are assigned.';

export const ScenarioStep = z.strictObject({
  /** Position in the described sequence. Order only — never a time. */
  order: z.number().int().min(1),
  description: NonBlank(),
  /** Which of the scenario's passages this step is drawn from. */
  passageIndexes: z.array(z.number().int().min(0)).min(1),
});

export const MajorObjection = z.strictObject({
  objection: NonBlank(40),
  sourceId: Slug,
});

export const Scenario = z
  .strictObject({
    id: Slug,
    /** A conditional, never an assertion: "If the <tradition> reading of <passage> is applied, …" */
    title: NonBlank().regex(/^If /, 'scenario titles must be conditional and begin with "If "'),
    passages: z.array(PassageRef).min(1),
    tradition: HermeneuticTradition,
    describedSequence: z.array(ScenarioStep).min(1),
    whatThisDoesNotClaim: NonBlank(40),
    majorScholarlyObjections: z.array(MajorObjection).min(1),
    /** Required when any passage is outside the Protestant canon (enforced at the credibility gate). */
    canonNote: NonBlank().optional(),
    review: Review,
    isInterpretation: z.literal(true),
  })
  .superRefine((s, ctx) => {
    s.describedSequence.forEach((step, i) => {
      if (step.order !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['describedSequence', i, 'order'],
          message: 'describedSequence must be numbered 1..n in order',
        });
      }
      step.passageIndexes.forEach((p, j) => {
        if (p >= s.passages.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['describedSequence', i, 'passageIndexes', j],
            message: `passage index ${p} does not exist in passages`,
          });
        }
      });
    });
  });
export type Scenario = z.infer<typeof Scenario>;
