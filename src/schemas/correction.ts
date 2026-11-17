/** Public corrections log (spec §10.7). Append-only: entries are never edited or removed. */
import { z } from 'zod';
import { IsoDate, NonBlank, Slug } from './common';

export const Correction = z.strictObject({
  id: Slug,
  date: IsoDate,
  /** The record that was corrected, by id (event, correlation, scenario or source). */
  recordId: Slug,
  what: NonBlank(10),
  why: NonBlank(10),
});
export type Correction = z.infer<typeof Correction>;

export const CorrectionsLog = z.array(Correction).superRefine((log, ctx) => {
  log.forEach((c, i) => {
    const prev = log[i - 1];
    if (prev && prev.date > c.date) ctx.addIssue({ code: 'custom', path: [i, 'date'], message: 'entries are appended in date order' });
  });
  if (new Set(log.map((c) => c.id)).size !== log.length) ctx.addIssue({ code: 'custom', message: 'correction ids must be unique' });
});
