/** The persistent strength legend (spec §1): shown wherever correlations appear. */
import { CORRELATION_STRENGTHS, CORRELATION_STRENGTH_DEFINITIONS } from '../../schemas';
import { STRENGTH_LABEL } from './CorrelationView';

export default function StrengthLegend() {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3" aria-label="Correlation strength legend">
      {CORRELATION_STRENGTHS.map((s) => (
        <div key={s}>
          <dt className="font-semibold text-interp-chip-ink">{STRENGTH_LABEL[s]}{(s === 'numerical-symbolic' || s === 'speculative') && <span className="font-normal text-ink-muted"> · hidden by default</span>}</dt>
          <dd className="text-ink-secondary">{CORRELATION_STRENGTH_DEFINITIONS[s]}</dd>
        </div>
      ))}
    </dl>
  );
}
