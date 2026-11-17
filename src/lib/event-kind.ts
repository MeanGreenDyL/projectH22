/** Event families by feed, derived from the id prefix each ingester assigns (docs/AGENT-REFRESH.md §3). */
import type { VerifiedEvent } from '../schemas';

export const EVENT_KINDS = [
  { id: 'kev', label: 'Known exploited vulnerabilities', test: /^kev-/ },
  { id: 'eo', label: 'Executive orders', test: /^eo-/ },
  { id: 'law', label: 'Acts of Congress', test: /^(pl|pvtl)-/ },
  { id: 'rule', label: 'Federal rules', test: /^fr-rule-/ },
  { id: 'state-law', label: 'State laws', test: /^os-/ },
  { id: 'quake', label: 'Earthquakes (M6+)', test: /^usgs-/ },
  { id: 'fema', label: 'Federal disaster declarations', test: /^fema-/ },
] as const;
export type EventKind = (typeof EVENT_KINDS)[number]['id'];

export function kindOf(e: Pick<VerifiedEvent, 'id'>): EventKind | undefined {
  return EVENT_KINDS.find((k) => k.test.test(e.id))?.id;
}
