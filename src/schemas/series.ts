/**
 * Time series (World Bank indicators, CoinGecko prices, GDELT coverage). A series is a
 * measurement over time, not an event, so it never becomes a VerifiedEvent.
 *
 * `measure: 'media-attention'` marks a series that counts news coverage (GDELT). It measures how
 * much the press wrote about something, which is a different variable from the thing itself
 * (spec §6). Its title must say so, and every chart that draws it must carry MEDIA_ATTENTION_LABEL.
 */
import { z } from 'zod';
import { CountryCode, IsoDate, NonBlank, Slug } from './common';
import { Domain } from './enums';

export const SERIES_MEASURES = ['measurement', 'media-attention'] as const;
export const SeriesMeasure = z.enum(SERIES_MEASURES);

export const SERIES_FREQUENCIES = ['daily', 'monthly', 'annual'] as const;
export const SeriesFrequency = z.enum(SERIES_FREQUENCIES);

export const MEDIA_ATTENTION_LABEL = 'Media attention: volume of news coverage. This is not a measure of the events themselves.';

/** Period format per frequency: annual "2024", monthly "2024-03", daily "2024-03-09". */
const PERIOD: Record<z.infer<typeof SeriesFrequency>, RegExp> = {
  annual: /^\d{4}$/,
  monthly: /^\d{4}-(0[1-9]|1[0-2])$/,
  daily: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

export const Series = z
  .strictObject({
    id: Slug,
    title: NonBlank().max(120),
    domain: Domain,
    measure: SeriesMeasure,
    unit: NonBlank(),
    frequency: SeriesFrequency,
    /** Empty means world / not country-specific. */
    countries: z.array(CountryCode),
    sourceId: Slug,
    /** Date the series was last refreshed from its source. */
    asOf: IsoDate,
    /** [period, value], ascending, no duplicates. Missing periods are omitted, never filled. */
    points: z.array(z.tuple([z.string(), z.number().finite()])).min(1),
    notes: z.array(NonBlank()).optional(),
  })
  .superRefine((s, ctx) => {
    const re = PERIOD[s.frequency];
    s.points.forEach(([p], i) => {
      if (!re.test(p)) ctx.addIssue({ code: 'custom', path: ['points', i, 0], message: `period "${p}" does not match ${s.frequency} format` });
      const prev = s.points[i - 1];
      if (prev && prev[0] >= p) ctx.addIssue({ code: 'custom', path: ['points', i, 0], message: 'points must be strictly ascending by period' });
    });
    if (s.measure === 'media-attention' && !/\b(coverage|media attention)\b/i.test(s.title)) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'a media-attention series must say "coverage" or "media attention" in its title' });
    }
  });
export type Series = z.infer<typeof Series>;
