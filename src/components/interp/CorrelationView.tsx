/**
 * One correlation. Must sit inside <InterpretiveFrame>. The counter-reading is collapsed but one
 * click away (spec §1 rule 4). Speculative readings are shown as the question they are.
 */
import type { ScripturalCorrelation, Source } from '../../schemas';
import { CORRELATION_STRENGTH_DEFINITIONS, HERMENEUTIC_TRADITION_DEFINITIONS, formatPassage } from '../../schemas';
import { useInterpretiveFrame } from './InterpretiveFrame';

export interface EventLink { id: string; title: string; date: string }

interface Props {
  correlation: ScripturalCorrelation;
  events: EventLink[];
  sources: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>>;
  /** Link the heading to the correlation's own page. */
  linkToDetail?: boolean;
  /** Open the counter-reading by default (detail page). */
  counterOpen?: boolean;
}

export const STRENGTH_LABEL: Record<ScripturalCorrelation['strength'], string> = {
  'direct-textual': 'Direct textual',
  'thematic-parallel': 'Thematic parallel',
  typological: 'Typological',
  'numerical-symbolic': 'Numerical-symbolic',
  speculative: 'Speculative',
};

export default function CorrelationView({ correlation: c, events, sources, linkToDetail = false, counterOpen = false }: Props) {
  useInterpretiveFrame('CorrelationView');
  const heading = c.passages.map(formatPassage).join('; ');
  return (
    <article className="text-sm">
      <h3 className="font-scripture text-lg text-ink">
        {linkToDetail ? <a className="hover:text-accent" href={`/correlations/${c.id}/`}>{heading}</a> : heading}
      </h3>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-interp-chip-ink">
        <span title={CORRELATION_STRENGTH_DEFINITIONS[c.strength]}>Strength: {STRENGTH_LABEL[c.strength]}</span>
        <span>Reading tradition: {c.hermeneuticTradition.map((t) => <abbr key={t} title={HERMENEUTIC_TRADITION_DEFINITIONS[t]} className="no-underline">{t} </abbr>)}</span>
      </p>
      <p className="mt-2 max-w-[var(--measure-prose)] text-ink">{c.proposedReading}</p>
      {c.numericalMethod && (
        <div className="mt-2 text-xs text-ink-secondary">
          <p>Method: {c.numericalMethod.method}</p>
          <p className="font-data">Arithmetic: {c.numericalMethod.arithmetic}</p>
        </div>
      )}
      <details className="mt-2" open={counterOpen}>
        <summary className="inline-flex min-h-6 cursor-pointer items-center font-semibold text-interp-chip-ink">The case against this reading</summary>
        <p className="mt-1 max-w-[var(--measure-prose)] text-ink-secondary">{c.counterReading}</p>
      </details>
      <p className="mt-2 text-xs text-ink-muted">
        Linked {events.length === 1 ? 'event' : 'events'}:{' '}
        {events.map((e, i) => <span key={e.id}>{i > 0 && '; '}<a className="text-accent underline" href={`/events/${e.id}/`}>{e.title}</a> ({e.date})</span>)}
      </p>
      {c.scholarlySupport.length > 0 && (
        <ul className="mt-1 text-xs text-ink-muted">
          {c.scholarlySupport.map((s) => (
            <li key={`${s.sourceId}-${s.citation}`}>
              {s.position === 'supports' ? 'Supports' : s.position === 'opposes' ? 'Opposes' : 'Discusses'}: {s.citation}
              {sources[s.sourceId] && <> (<a className="text-accent underline" href={`/sources/#${s.sourceId}`}>{sources[s.sourceId]!.publisher}</a>)</>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
