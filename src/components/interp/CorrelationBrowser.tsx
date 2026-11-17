/**
 * Correlation browser: filter by strength, reading tradition, event domain and canon.
 * Numerical-symbolic and speculative readings are off by default (spec §1 rule 2).
 */
import { useMemo, useState } from 'react';
import { CANONS, CORRELATION_STRENGTHS, HERMENEUTIC_TRADITIONS, type ScripturalCorrelation, type Source } from '../../schemas';
import { DEFAULT_EXCLUDED_STRENGTHS } from '../../lib/policy';
import CorrelationView, { STRENGTH_LABEL, type EventLink } from './CorrelationView';
import InterpretiveFrame from './InterpretiveFrame';

export interface BrowserItem { correlation: ScripturalCorrelation; events: EventLink[]; domains: string[] }
interface Props {
  items: BrowserItem[];
  sources: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>>;
  domainLabels: Record<string, string>;
}

function toggle<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v); else next.add(v);
  return next;
}

export default function CorrelationBrowser({ items, sources, domainLabels }: Props) {
  const [strengths, setStrengths] = useState(new Set(CORRELATION_STRENGTHS.filter((s) => !DEFAULT_EXCLUDED_STRENGTHS.includes(s))));
  const [traditions, setTraditions] = useState(new Set<string>(HERMENEUTIC_TRADITIONS));
  const [domains, setDomains] = useState(new Set(Object.keys(domainLabels)));
  const [canons, setCanons] = useState(new Set<string>(CANONS));
  const shown = useMemo(() => items.filter(({ correlation: c, domains: ds }) =>
    strengths.has(c.strength) &&
    c.hermeneuticTradition.some((t) => traditions.has(t)) &&
    ds.some((d) => domains.has(d)) &&
    c.passages.some((p) => canons.has(p.canon))), [items, strengths, traditions, domains, canons]);

  const group = (legend: string, all: readonly string[], set: Set<string>, set_: (s: Set<string>) => void, label: (v: string) => string) => (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <legend className="mr-2 text-xs font-semibold text-ink-muted">{legend}</legend>
      {all.map((v) => (
        <label key={v} className="inline-flex min-h-6 items-center gap-1">
          <input type="checkbox" checked={set.has(v)} onChange={() => set_(toggle(set, v))} />
          {label(v)}
        </label>
      ))}
    </fieldset>
  );

  return (
    <div>
      <div className="flex flex-col gap-2 border-y border-rule py-3 text-sm">
        {group('Strength', CORRELATION_STRENGTHS, strengths as Set<string>, setStrengths as never, (v) => STRENGTH_LABEL[v as keyof typeof STRENGTH_LABEL])}
        {group('Tradition', HERMENEUTIC_TRADITIONS, traditions, setTraditions, (v) => v)}
        {group('Event domain', Object.keys(domainLabels), domains, setDomains, (v) => domainLabels[v] ?? v)}
        {group('Canon', CANONS, canons, setCanons, (v) => v.toLowerCase().replace(/-/g, ' '))}
      </div>
      <p className="mt-3 text-sm text-ink-muted" aria-live="polite">Showing {shown.length} of {items.length} published correlations.</p>
      <div className="mt-3 flex flex-col gap-4">
        {shown.map(({ correlation: c, events }) => (
          <InterpretiveFrame key={c.id} muted={DEFAULT_EXCLUDED_STRENGTHS.includes(c.strength)}>
            <CorrelationView correlation={c} events={events} sources={sources} linkToDetail />
          </InterpretiveFrame>
        ))}
      </div>
    </div>
  );
}
