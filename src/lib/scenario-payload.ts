/** Source lookups a scenario page needs: only the objections' sources, trimmed for the island. */
import type { Scenario, Source } from '../schemas';

export function scenarioSources(scenarios: readonly Scenario[], all: ReadonlyMap<string, Source>): Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>> {
  const out: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>> = {};
  for (const s of scenarios) for (const o of s.majorScholarlyObjections) {
    const src = all.get(o.sourceId);
    if (src) out[src.id] = { id: src.id, title: src.title, publisher: src.publisher, url: src.url };
  }
  return out;
}
