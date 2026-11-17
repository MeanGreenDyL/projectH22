/** Shapes published correlations for the browser and detail pages. Drafts never get here. */
import type { Source } from '../schemas';
import type { SiteData } from './site-data';

export function browserPayload(data: SiteData) {
  const items = data.correlations.map((c) => {
    const evs = c.eventIds.map((id) => data.eventsById.get(id)).filter((e) => e !== undefined);
    return {
      correlation: c,
      events: evs.map((e) => ({ id: e.id, title: e.title, date: e.date.start })),
      domains: [...new Set(evs.map((e) => e.domain))],
    };
  });
  const ids = new Set(data.correlations.flatMap((c) => c.scholarlySupport.map((s) => s.sourceId)));
  const sources: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>> = {};
  for (const id of ids) {
    const s = data.sources.get(id);
    if (s) sources[id] = { id: s.id, title: s.title, publisher: s.publisher, url: s.url };
  }
  return { items, sources };
}
