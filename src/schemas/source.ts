/**
 * Source registry (spec §5). Every citation anywhere on the site references a Source by id.
 * Nothing cites a bare URL.
 *
 * Extension over the spec: a `kind` discriminator. Evidentiary sources carry the five
 * tiers. Interpretive sources (commentaries, theology, reference works, lexicons) carry a
 * separate class and can never count as evidence for a factual claim (§5 rule 5).
 */
import { z } from 'zod';
import { HttpUrl, IsoDate, IsoDateTime, NonBlank, Slug } from './common';
import { EvidentiaryTier, InterpretiveClass } from './enums';

const SourceBase = {
  id: Slug,
  title: NonBlank(),
  publisher: NonBlank(),
  url: HttpUrl,
  /** Wayback Machine or archive.today snapshot, so the citation survives link rot. */
  archiveUrl: HttpUrl.optional(),
  doi: z
    .string()
    .regex(/^10\.\d{4,9}\/\S+$/, 'must be a bare DOI such as 10.1000/xyz123')
    .optional(),
  accessedAt: IsoDateTime,
  authors: z.array(NonBlank()).min(1).optional(),
  publishedAt: IsoDate.optional(),
};

export const EvidentiarySource = z.strictObject({
  kind: z.literal('evidentiary'),
  tier: EvidentiaryTier,
  /** Mark NBER-style working papers and other unrefereed material (spec §5 Tier 2). */
  isPreprint: z.boolean().optional(),
  ...SourceBase,
});
export type EvidentiarySource = z.infer<typeof EvidentiarySource>;

export const InterpretiveSource = z.strictObject({
  kind: z.literal('interpretive'),
  interpretiveClass: InterpretiveClass,
  /** Interpretive tradition of the work, e.g. "Reformed Protestant", "Roman Catholic", "Rabbinic". */
  tradition: NonBlank(),
  /** When the work was composed or first published, as written in the source (e.g. "1706", "1866–1891"). */
  composed: NonBlank(),
  ...SourceBase,
});
export type InterpretiveSource = z.infer<typeof InterpretiveSource>;

export const Source = z.discriminatedUnion('kind', [EvidentiarySource, InterpretiveSource]);
export type Source = z.infer<typeof Source>;

/** sources.json is a single array of Source records. */
export const SourceRegistry = z.array(Source);
export type SourceRegistry = z.infer<typeof SourceRegistry>;
