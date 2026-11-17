/**
 * Radial scenario diagram (spec §7). The described sequence sits around a ring, numbered in
 * order. There is deliberately no time axis: steps are evenly spaced whatever the passage says,
 * and the centre of the ring says so. Arcs run 1 → n and do not close the loop.
 */
import { useId } from 'react';
import { ringArcs, ringLayout } from '../../lib/scenario-layout';

interface Props {
  steps: { order: number; description: string }[];
  /** Accessible name for the figure. */
  label: string;
  /** Muted nodes for the explainer illustration on the index page. */
  illustrative?: boolean;
}

const S = 260, C = S / 2, R = 96, NODE = 15;

export default function ScenarioRing({ steps, label, illustrative = false }: Props) {
  const marker = `h22-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const nodes = ringLayout(steps.length, C, C, R);
  const gap = steps.length > 1 ? Math.min(0.5, (NODE + 6) / R) : 0;
  const arcs = ringArcs(steps.length, C, C, R, gap);
  return (
    <svg className="h22-chart w-full max-w-[260px]" viewBox={`0 0 ${S} ${S}`} role="img" aria-label={label}>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--h22-interp-rule)" />
        </marker>
      </defs>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--h22-rule)" strokeDasharray="2 4" />
      {arcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--h22-interp-rule)" strokeWidth="2" markerEnd={`url(#${marker})`} />
      ))}
      <text x={C} y={C - 6} textAnchor="middle" style={{ fill: 'var(--h22-ink-secondary)', fontSize: 12, fontWeight: 600 }}>Order only</text>
      <text x={C} y={C + 12} textAnchor="middle" style={{ fill: 'var(--h22-ink-muted)', fontSize: 11 }}>no time axis</text>
      {nodes.map((n, i) => (
        <g key={n.order}>
          <circle cx={n.x} cy={n.y} r={NODE + 6} className="h22-hit" tabIndex={0}
            data-tip={`Step ${n.order}|${steps[i]?.description ?? ''}`} />
          <circle cx={n.x} cy={n.y} r={NODE} fill={illustrative ? 'var(--h22-surface)' : 'var(--h22-interp-surface)'}
            stroke="var(--h22-interp-rule)" strokeWidth="2" pointerEvents="none" />
          <text x={n.x} y={n.y + 4.5} textAnchor="middle" pointerEvents="none"
            style={{ fill: 'var(--h22-interp-chip-ink)', fontSize: 13, fontWeight: 600 }}>{n.order}</text>
        </g>
      ))}
    </svg>
  );
}
