/**
 * Astro content collections. The schemas are the same Zod schemas the validators use, so a
 * record the site can load is, by construction, a record the gates have checked the shape of.
 * Cross-record credibility rules run in `pnpm validate:credibility`, which CI requires.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { ScripturalCorrelation, Scenario, Series, Source, VerifiedEvent } from './schemas';

export const collections = {
  sources: defineCollection({ loader: file('src/data/sources.json'), schema: Source }),
  events: defineCollection({ loader: glob({ pattern: '**/*.json', base: 'src/data/events' }), schema: VerifiedEvent }),
  correlations: defineCollection({ loader: glob({ pattern: '*.{yaml,yml}', base: 'src/data/correlations' }), schema: ScripturalCorrelation }),
  series: defineCollection({ loader: glob({ pattern: '*.json', base: 'src/data/series' }), schema: Series }),
  scenarios: defineCollection({ loader: glob({ pattern: '*.{yaml,yml}', base: 'src/data/scenarios' }), schema: Scenario }),
};
