/**
 * GDELT DOC 2.0 API, mode=timelinevol. The value is the share of all articles GDELT monitored that
 * day which match the query. It measures MEDIA ATTENTION, which is a different variable from the
 * events themselves (spec §6). Series from here are always measure: 'media-attention'.
 */
import { MEDIA_ATTENTION_LABEL, type Domain, type EvidentiarySource, type Series } from '../../../src/schemas';
import { isoDay, isoTime } from '../lib/pipeline';

export const GDELT_API = 'https://api.gdeltproject.org/api/v2/doc/doc';

export interface GdeltTopic {
  slug: string;
  /** Plain-language topic used in the title. */
  topic: string;
  query: string;
  domain: Domain;
}

export const GDELT_TOPICS: GdeltTopic[] = [
  { slug: 'ransomware', topic: 'ransomware', query: 'ransomware', domain: 'cyber' },
  { slug: 'cryptocurrency-hack', topic: 'cryptocurrency hacks', query: '(cryptocurrency OR crypto) (hack OR exploit OR stolen)', domain: 'crypto' },
  { slug: 'executive-order', topic: 'US executive orders', query: '"executive order" (president OR White House)', domain: 'us-law' },
  { slug: 'earthquake', topic: 'earthquakes', query: 'earthquake', domain: 'natural' },
];

export const gdeltUrl = (query: string) =>
  `${GDELT_API}?${new URLSearchParams({ query, mode: 'timelinevol', format: 'json', timespan: '3months' })}`;

export function normalizeGdelt(json: unknown, spec: GdeltTopic & { now: Date }): { series: Series; sources: EvidentiarySource[] } {
  const raw = json as { query_details?: { date_resolution?: string }; timeline?: { data: { date: string; value: number }[] }[] };
  // GDELT picks the resolution from the timespan. Only daily values are stored; anything else is skipped, not resampled.
  const daily = raw.query_details?.date_resolution === 'day';
  const points = (daily ? (raw.timeline?.[0]?.data ?? []) : [])
    .filter((d) => Number.isFinite(d.value))
    .map((d) => [`${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`, d.value] as [string, number]);
  const id = `gdelt-${spec.slug}`;
  return {
    series: {
      id,
      title: `News coverage of ${spec.topic} (share of monitored articles)`,
      domain: spec.domain,
      measure: 'media-attention',
      unit: '% of monitored articles',
      frequency: 'daily',
      countries: [],
      sourceId: id,
      asOf: isoDay(spec.now),
      points,
      notes: [MEDIA_ATTENTION_LABEL, `GDELT DOC 2.0 query: ${spec.query}. Rolling three-month window, all monitored languages.`],
    },
    sources: [
      {
        kind: 'evidentiary',
        id,
        tier: '3-institutional',
        title: `GDELT DOC 2.0 coverage timeline: ${spec.topic}`,
        publisher: 'The GDELT Project',
        url: gdeltUrl(spec.query),
        accessedAt: isoTime(spec.now),
      },
    ],
  };
}
