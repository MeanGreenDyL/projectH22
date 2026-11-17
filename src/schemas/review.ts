import { z } from 'zod';
import { IsoDateTime, NonBlank } from './common';

/**
 * Publication gate for Layer B and scenarios (spec §6b): an agent may draft, never publish.
 * Only `approved` records render on the site. `approved` requires a named human reviewer.
 */
export const Review = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('draft'),
    draftedBy: NonBlank().optional(),
  }),
  z.strictObject({
    status: z.literal('approved'),
    draftedBy: NonBlank().optional(),
    reviewedBy: NonBlank(),
    reviewedAt: IsoDateTime,
  }),
]);
export type Review = z.infer<typeof Review>;
