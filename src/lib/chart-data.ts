/**
 * Pure data shaping for charts. Pages and components call these; tests pin their behaviour.
 * Nothing here invents a value: empty input gives empty output, and missing periods are zero
 * counts only where a count of zero is the truth (no record exists for that period).
 */
import { DOMAINS, type Domain, type ScripturalCorrelation, type VerifiedEvent } from '../schemas';
import { BOOKS, findBook } from '../schemas';
import { summaryEligible } from './policy';

export const monthKey = (iso: string) => iso.slice(0, 7);

/** Shift a YYYY-MM key by n months. */
export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** Inclusive list of YYYY-MM keys from `from` to `to`. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number) as [number, number];
  const [ty, tm] = to.split('-').map(Number) as [number, number];
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** Events per month per domain across a shared axis (for small multiples). */
export function monthlyCounts(events: readonly VerifiedEvent[], months: readonly string[]): Record<Domain, number[]> {
  const idx = new Map(months.map((m, i) => [m, i]));
  const out = Object.fromEntries(DOMAINS.map((d) => [d, months.map(() => 0)])) as Record<Domain, number[]>;
  for (const e of events) {
    const i = idx.get(monthKey(e.date.start));
    if (i !== undefined) out[e.domain][i]! += 1;
  }
  return out;
}

export interface FiveNumber { n: number; min: number; q1: number; median: number; q3: number; max: number }

/** Tukey-free five-number summary using linear interpolation (type 7). Undefined for no data. */
export function fiveNumber(values: readonly number[]): FiveNumber | undefined {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (v.length === 0) return undefined;
  const q = (p: number) => {
    const h = (v.length - 1) * p;
    const lo = Math.floor(h);
    return v[lo]! + (h - lo) * ((v[Math.min(lo + 1, v.length - 1)]!) - v[lo]!);
  };
  return { n: v.length, min: v[0]!, q1: q(0.25), median: q(0.5), q3: q(0.75), max: v[v.length - 1]! };
}

/** Values of one metric (by label prefix) across events, e.g. "CVSS". */
export function metricValues(events: readonly VerifiedEvent[], labelPrefix: string): number[] {
  return events.flatMap((e) => e.metrics.filter((m) => m.label.startsWith(labelPrefix)).map((m) => m.value));
}

export interface MatrixCell { domain: Domain; book: string; count: number; dominant: ScripturalCorrelation['strength'] | undefined }

/**
 * Correlation matrix: event domain × scripture book. Only summary-eligible correlations count
 * (approved, and not numerical-symbolic or speculative). Books are in canonical registry order.
 */
export function correlationMatrix(
  correlations: readonly ScripturalCorrelation[],
  eventsById: ReadonlyMap<string, VerifiedEvent>,
): { books: string[]; cells: MatrixCell[] } {
  const tally = new Map<string, Map<string, number>>();
  for (const c of correlations.filter(summaryEligible)) {
    const domains = new Set(c.eventIds.map((id) => eventsById.get(id)?.domain).filter((d): d is Domain => !!d));
    const books = new Set(c.passages.map((p) => findBook(p.book)?.name).filter((b): b is string => !!b));
    for (const d of domains) for (const b of books) {
      const key = `${d}|${b}`;
      const m = tally.get(key) ?? new Map<string, number>();
      m.set(c.strength, (m.get(c.strength) ?? 0) + 1);
      tally.set(key, m);
    }
  }
  const order = new Map(BOOKS.map((b, i) => [b.name, i]));
  const books = [...new Set([...tally.keys()].map((k) => k.split('|')[1]!))].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
  const cells: MatrixCell[] = [];
  for (const d of DOMAINS) for (const b of books) {
    const m = tally.get(`${d}|${b}`);
    const count = m ? [...m.values()].reduce((x, y) => x + y, 0) : 0;
    const dominant = m ? [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]![0] as MatrixCell['dominant'] : undefined;
    cells.push({ domain: d, book: b, count, dominant });
  }
  return { books, cells };
}

/** Latest date among events (YYYY-MM-DD), for "as of" lines. */
export function latestDate(events: readonly VerifiedEvent[]): string | undefined {
  return events.reduce<string | undefined>((max, e) => (!max || e.date.start > max ? e.date.start : max), undefined);
}
