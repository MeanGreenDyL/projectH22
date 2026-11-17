/**
 * Geometry and display text for /scenarios. Pure functions, unit-tested.
 *
 * The scenario diagram places the described steps around a ring, numbered in order. There is no
 * time axis: angle encodes order only, and steps are spaced evenly whatever the passage says
 * about intervals between them (spec §7 "Radial scenario diagram").
 */
import type { Scenario } from '../schemas';
import { findTemporalReferences } from '../validation/credibility/temporal';

export interface RingNode { order: number; x: number; y: number }

/** Evenly spaced nodes clockwise from 12 o'clock on a circle of radius r centred at (cx, cy). */
export function ringLayout(n: number, cx: number, cy: number, r: number): RingNode[] {
  if (n <= 0) return [];
  if (n === 1) return [{ order: 1, x: cx, y: cy - r }];
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    return { order: i + 1, x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) };
  });
}

/**
 * Arc from node i to node i+1 along the ring, trimmed by `gap` radians at each end so it starts
 * and stops outside the node circles. The last step does not loop back to the first: a sequence
 * is drawn, not a cycle, unless the scenario says so.
 */
export function ringArcs(n: number, cx: number, cy: number, r: number, gap: number): string[] {
  if (n < 2) return [];
  const pt = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const step = (2 * Math.PI) / n;
  return Array.from({ length: n - 1 }, (_, i) => {
    const a0 = -Math.PI / 2 + i * step + gap;
    const a1 = -Math.PI / 2 + (i + 1) * step - gap;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M${pt(a0)} A${r},${r} 0 ${large} 1 ${pt(a1)}`;
  });
}

/** Every string a scenario page renders from the record, except declared textual figures. */
export function scenarioDisplayText(s: Scenario): string[] {
  return [
    s.title,
    s.whatThisDoesNotClaim,
    ...(s.canonNote ? [s.canonNote] : []),
    ...s.describedSequence.map((d) => d.description),
    ...s.majorScholarlyObjections.map((o) => o.objection),
  ];
}

/** Temporal references in rendered text after removing the declared figures (page-level check). */
export function temporalHitsInPageText(text: string, figures: readonly string[]): { name: string; match: string }[] {
  let t = text;
  for (const f of [...figures].sort((a, b) => b.length - a.length)) t = t.split(f).join(' ');
  return findTemporalReferences(t);
}
