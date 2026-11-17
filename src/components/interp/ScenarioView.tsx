/**
 * One scenario. Must sit inside <InterpretiveFrame>. Carries the scenario banner on every card
 * (spec §1), the ring diagram, the numbered sequence as its table twin, the passage's own
 * figures labelled as such, what it does not claim, and the objections with their sources.
 */
import type { Scenario, Source } from '../../schemas';
import { HERMENEUTIC_TRADITION_DEFINITIONS, SCENARIO_BANNER, formatPassage } from '../../schemas';
import { useInterpretiveFrame } from './InterpretiveFrame';
import ScenarioRing from './ScenarioRing';

interface Props {
  scenario: Scenario;
  sources: Record<string, Pick<Source, 'id' | 'title' | 'publisher' | 'url'>>;
  /** Card mode: link the title to the scenario's page and keep the detail collapsed. */
  linkToDetail?: boolean;
}

export function ScenarioBanner() {
  return <p className="rounded-md border-l-4 border-interp-rule bg-interp-surface px-4 py-3 text-sm font-semibold text-interp-chip-ink" data-scenario-banner>{SCENARIO_BANNER}</p>;
}

export default function ScenarioView({ scenario: s, sources, linkToDetail = false }: Props) {
  useInterpretiveFrame('ScenarioView');
  const passages = s.passages.map(formatPassage);
  return (
    <article className="text-sm">
      <ScenarioBanner />
      <h3 className="mt-3 font-heading text-lg text-ink">
        {linkToDetail ? <a className="hover:text-accent" href={`/scenarios/${s.id}/`}>{s.title}</a> : s.title}
      </h3>
      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-interp-chip-ink">
        <span className="font-scripture">{passages.join('; ')}</span>
        {s.passages.map((p, i) => <span key={i} data-canon={p.canon} className="rounded-sm border border-border px-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-secondary">{p.canon}</span>)}
        <abbr className="no-underline" title={HERMENEUTIC_TRADITION_DEFINITIONS[s.tradition]}>Reading tradition: {s.tradition}</abbr>
      </p>
      {s.canonNote && <p className="mt-2 text-xs text-ink-secondary">{s.canonNote}</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-[260px_1fr]">
        <figure>
          <ScenarioRing steps={s.describedSequence} label={`Described sequence of ${s.describedSequence.length} steps, in order, with no time axis`} />
          <figcaption className="mt-1 text-xs text-ink-muted">Steps are evenly spaced. Spacing does not represent time.</figcaption>
        </figure>
        <div>
          <h4 className="text-xs font-semibold text-ink-secondary">Described sequence</h4>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink">
            {s.describedSequence.map((d) => (
              <li key={d.order}>{d.description} <span className="text-xs text-ink-muted">({d.passageIndexes.map((i) => passages[i]).join('; ')})</span></li>
            ))}
          </ol>
          {s.textualFigures && s.textualFigures.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-semibold text-ink-secondary">The text's own figures</h4>
              <ul className="mt-1 space-y-1">
                {s.textualFigures.map((f, i) => (
                  <li key={i}><span data-textual-figure className="font-semibold">{f.figure}</span> <span className="text-xs text-ink-muted">in {passages[f.passageIndex]}. The passage's own figure. It is not converted to dates.</span></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <details className="mt-3" open={!linkToDetail}>
        <summary className="min-h-6 cursor-pointer font-semibold text-interp-chip-ink">What this does not claim, and objections</summary>
        <p className="mt-2 text-ink-secondary">{s.whatThisDoesNotClaim}</p>
        <ul className="mt-2 space-y-2">
          {s.majorScholarlyObjections.map((o, i) => {
            const src = sources[o.sourceId];
            return (
              <li key={i} className="text-ink-secondary">
                {o.objection}{' '}
                {src && <a className="text-xs text-accent underline" href={src.url}>{src.title}{src.publisher ? `, ${src.publisher}` : ''}</a>}
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}
