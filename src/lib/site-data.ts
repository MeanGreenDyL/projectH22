/** Loads the collections once per build for pages. Only published interpretation is exposed. */
import { getCollection } from 'astro:content';
import type { Scenario, ScripturalCorrelation, Series, Source, VerifiedEvent } from '../schemas';
import { isPublished } from './policy';

let cache: Promise<SiteData> | undefined;

export interface SiteData {
  events: VerifiedEvent[];
  eventsById: Map<string, VerifiedEvent>;
  sources: Map<string, Source>;
  series: Map<string, Series>;
  /** Approved correlations only. Drafts never reach a page. */
  correlations: ScripturalCorrelation[];
  /** Approved scenarios only. */
  scenarios: Scenario[];
  correlationCount: (eventId: string) => number;
}

async function load(): Promise<SiteData> {
  const events = (await getCollection('events')).map((e) => e.data).sort((a, b) => b.date.start.localeCompare(a.date.start) || a.id.localeCompare(b.id));
  const sources = new Map((await getCollection('sources')).map((s) => [s.data.id, s.data]));
  const series = new Map((await getCollection('series')).map((s) => [s.data.id, s.data]));
  const correlations = (await getCollection('correlations')).map((c) => c.data).filter(isPublished);
  const scenarios = (await getCollection('scenarios')).map((c) => c.data).filter(isPublished).sort((a, b) => a.id.localeCompare(b.id));
  const counts = new Map<string, number>();
  for (const c of correlations) for (const id of c.eventIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return { events, eventsById: new Map(events.map((e) => [e.id, e])), sources, series, correlations, scenarios, correlationCount: (id) => counts.get(id) ?? 0 };
}

export const siteData = () => (cache ??= load());
