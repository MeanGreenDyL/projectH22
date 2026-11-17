/**
 * Supply calculator (spec §9). Quantities come only from guidance records that carry a quoted,
 * cited `quantity`. With no record for an item, the line says "not available" and shows no
 * number: nothing is estimated, defaulted or rounded up from memory.
 */
import type { Guidance } from '../schemas';

export interface CalcInput {
  people: number;
  days: number;
  hotClimate: boolean;
}

export interface CalcLine {
  key: string;
  title: string;
  /** Undefined when no cited figure exists. */
  amount: number | undefined;
  unit: string | undefined;
  /** How the amount was worked out, in words, e.g. "2 units × 4 people × 3 days". */
  working: string | undefined;
  sourceId: string | undefined;
  guidanceId: string | undefined;
}

export const LIMITS = { people: [1, 20], days: [1, 30] } as const;

export function clampInput(i: CalcInput): CalcInput {
  const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : lo)));
  return { people: clamp(i.people, LIMITS.people), days: clamp(i.days, LIMITS.days), hotClimate: i.hotClimate };
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

/**
 * One line per quantity key. A conditional record (hot climate) replaces the base record for the
 * same key when its condition is selected; it never stacks on top of it.
 */
export function calculate(records: readonly Guidance[], raw: CalcInput, wanted: readonly { key: string; title: string }[] = []): CalcLine[] {
  const input = clampInput(raw);
  const withQty = records.filter((g): g is Guidance & { quantity: NonNullable<Guidance['quantity']> } => g.quantity !== undefined);
  const keys = [...new Set([...wanted.map((w) => w.key), ...withQty.map((g) => g.quantity.key)])];
  return keys.map((key) => {
    const base = withQty.find((g) => g.quantity.key === key && g.quantity.condition === undefined);
    const hot = withQty.find((g) => g.quantity.key === key && g.quantity.condition === 'hot-climate');
    const g = input.hotClimate && hot ? hot : base;
    const title = g?.title ?? wanted.find((w) => w.key === key)?.title ?? key;
    if (!g) return { key, title, amount: undefined, unit: undefined, working: undefined, sourceId: undefined, guidanceId: undefined };
    const q = g.quantity;
    const [mult, words] =
      q.per === 'person-day' ? [input.people * input.days, `× ${input.people} ${input.people === 1 ? 'person' : 'people'} × ${input.days} ${input.days === 1 ? 'day' : 'days'}`]
      : q.per === 'person' ? [input.people, `× ${input.people} ${input.people === 1 ? 'person' : 'people'}`]
      : [1, 'per household'];
    const amount = +(q.value * mult).toFixed(2);
    return { key, title, amount, unit: q.unit, working: `${fmt(q.value)} ${q.unit} ${words}`, sourceId: g.sourceId, guidanceId: g.id };
  });
}

/** Hazard statements first within a topic, then the rest in id order (spec §9 safety rule 2). */
export function hazardFirst<T extends Pick<Guidance, 'hazard' | 'id'>>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Number(b.hazard) - Number(a.hazard) || a.id.localeCompare(b.id));
}
