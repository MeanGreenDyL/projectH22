/**
 * schema.org JSON-LD (spec §11 Phase 7). Built only from fields the records carry; nothing is
 * added that the data does not state (no licence, no author names, no dates the data lacks).
 */
import type { ScripturalCorrelation, Source, VerifiedEvent } from '../schemas';
import { formatPassage } from '../schemas';
import { DOMAIN_LABEL } from './labels';

const PUBLISHER = { '@type': 'Organization', name: 'Project H 2:2' } as const;

export function eventsDataset(events: readonly VerifiedEvent[], sources: ReadonlyMap<string, Source>) {
  const dates = events.map((e) => e.date.start).sort();
  const publishers = [...new Set(events.flatMap((e) => e.sources.map((id) => sources.get(id)?.publisher)).filter((p): p is string => !!p))].sort();
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Project H 2:2 verified events',
    description: `Verified events across ${[...new Set(events.map((e) => DOMAIN_LABEL[e.domain]))].join(', ')}, each cited to tiered, archived sources. Interpretation is published separately and labelled.`,
    creator: PUBLISHER,
    isAccessibleForFree: true,
    ...(dates.length ? { temporalCoverage: `${dates[0]}/${dates[dates.length - 1]}` } : {}),
    variableMeasured: ['event date', 'event domain', 'source tier'],
    size: `${events.length} event${events.length === 1 ? "" : "s"}`,
    isBasedOn: publishers.map((name) => ({ '@type': 'Organization', name })),
  };
}

export function methodologyArticle() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: 'Methodology: what this project claims, and its known limits',
    about: ['source tiers', 'interpretation strength taxonomy', 'selection bias'],
    publisher: PUBLISHER,
    isAccessibleForFree: true,
  };
}

export function correlationArticle(c: ScripturalCorrelation) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: `Proposed reading: ${c.passages.map(formatPassage).join('; ')}`,
    genre: 'Interpretation',
    publisher: PUBLISHER,
    isAccessibleForFree: true,
    citation: c.scholarlySupport.map((s) => s.citation),
  };
}

/** Serialize for a <script type="application/ld+json"> block; `<` is escaped so text cannot close the tag. */
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
