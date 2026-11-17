/**
 * LAYER A — THE FACT LAYER (spec §1, §4).
 *
 * Observable, independently verifiable reality. Nothing in this layer depends on any
 * theological position being true. Cross-record rules (source tiers, archive coverage,
 * dispute sourcing, interpretive vocabulary) live in the credibility gate.
 */
import { z } from 'zod';
import { CountryCode, IsoDate, IsoDateTime, NonBlank, Slug, UsStateCode } from './common';
import { Confidence, DatePrecision, Domain, GeoScope } from './enums';

/**
 * Convention: for month / quarter / year precision, `start` is the first day of that
 * period and `precision` says how much of it is real. `approximate` requires `end` so the
 * uncertainty is explicitly bounded (spec §1: "a precise or explicitly bounded date").
 */
export const EventDate = z
  .strictObject({
    start: IsoDate,
    end: IsoDate.optional(),
    precision: DatePrecision,
  })
  .refine((d) => d.end === undefined || d.end >= d.start, {
    message: 'date.end must not be earlier than date.start',
    path: ['end'],
  })
  .refine((d) => d.precision !== 'approximate' || d.end !== undefined, {
    message: 'approximate dates must be bounded with date.end',
    path: ['end'],
  });

export const Metric = z
  .strictObject({
    label: NonBlank(),
    value: z.number().finite(),
    unit: NonBlank(),
    asOf: IsoDate,
    /** Every single number traces to a source, and that source must be in the event's `sources`. */
    sourceId: Slug,
    isEstimate: z.boolean(),
    estimateRange: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  })
  .refine((m) => m.estimateRange === undefined || m.isEstimate, {
    message: 'estimateRange is only allowed when isEstimate is true',
    path: ['estimateRange'],
  })
  .refine(
    (m) =>
      m.estimateRange === undefined ||
      (m.estimateRange[0] <= m.value && m.value <= m.estimateRange[1]),
    { message: 'estimateRange must be [low, high] and contain value', path: ['estimateRange'] },
  );
export type Metric = z.infer<typeof Metric>;

/** For confidence: 'disputed' — which cited sources affirm and which contest the claim (spec §5 rule 2). */
export const SourcePosition = z.strictObject({
  sourceId: Slug,
  position: z.enum(['affirms', 'contests']),
});

export const VerifiedEvent = z.strictObject({
  id: Slug,
  domain: Domain,
  title: NonBlank().max(120),
  /** Neutral and factual. Interpretive or scriptural vocabulary fails the credibility gate. */
  summary: NonBlank().max(400),
  date: EventDate,
  geography: z.strictObject({
    scope: GeoScope,
    countries: z.array(CountryCode),
    usStates: z.array(UsStateCode).optional(),
    /** [longitude, latitude] — MapLibre / GeoJSON order. */
    coordinates: z
      .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
      .optional(),
  }),
  metrics: z.array(Metric),
  sources: z.array(Slug).min(1),
  sourcePositions: z.array(SourcePosition).optional(),
  lastVerified: IsoDateTime,
  confidence: Confidence,
  /** The US-centered lens (spec §7). */
  usImpact: NonBlank().optional(),
  globalContext: NonBlank().optional(),
});
export type VerifiedEvent = z.infer<typeof VerifiedEvent>;
