import { describe, expect, it } from 'vitest';
import { addMonths, correlationMatrix, fiveNumber, metricValues, monthlyCounts, monthRange } from '../src/lib/chart-data';
import { correlation, event } from './helpers';

const approved = { status: 'approved', reviewedBy: 'Synthetic Reviewer', reviewedAt: '2026-11-01T00:00:00Z' } as const;

describe('chart data', () => {
  it('builds inclusive month ranges across a year boundary', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('shifts month keys across years', () => {
    expect(addMonths('2026-11', -23)).toBe('2024-12');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('counts events per domain per month on a shared axis, ignoring events outside it', () => {
    const months = ['2026-01', '2026-02'];
    const evs = [
      event({ id: 'a', domain: 'cyber', date: { start: '2026-01-05', precision: 'day' } }),
      event({ id: 'b', domain: 'cyber', date: { start: '2026-02-05', precision: 'day' } }),
      event({ id: 'c', domain: 'natural', date: { start: '2026-02-09', precision: 'day' } }),
      event({ id: 'd', domain: 'natural', date: { start: '2025-12-31', precision: 'day' } }),
    ];
    const c = monthlyCounts(evs, months);
    expect(c.cyber).toEqual([1, 1]);
    expect(c.natural).toEqual([0, 1]);
    expect(c.crypto).toEqual([0, 0]);
  });
  it('computes a five-number summary and returns nothing for no data', () => {
    expect(fiveNumber([1, 2, 3, 4, 5])).toEqual({ n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5 });
    expect(fiveNumber([])).toBeUndefined();
  });
  it('collects metric values by label prefix', () => {
    const e = event();
    expect(metricValues([e], e.metrics[0]!.label.slice(0, 3))).toEqual([e.metrics[0]!.value]);
    expect(metricValues([e], 'NoSuchMetric')).toEqual([]);
  });
});

describe('correlation matrix', () => {
  const ev = event({ id: 'test-event', domain: 'cyber' });
  const byId = new Map([[ev.id, ev]]);
  it('ignores drafts: only approved, summary-eligible correlations count', () => {
    expect(correlationMatrix([correlation()], byId).books).toEqual([]);
  });
  it('excludes numerical-symbolic and speculative even when approved', () => {
    const c = correlation({ review: approved, strength: 'speculative', proposedReading: 'Could this be read as a pattern?' } as never);
    expect(correlationMatrix([c], byId).books).toEqual([]);
  });
  it('counts approved correlations by domain and book, with the dominant strength', () => {
    const c1 = correlation({ id: 'c1', review: approved } as never);
    const c2 = correlation({ id: 'c2', review: approved, strength: 'typological' } as never);
    const c3 = correlation({ id: 'c3', review: approved } as never);
    const m = correlationMatrix([c1, c2, c3], byId);
    expect(m.books).toEqual(['Proverbs']);
    expect(m.cells.find((x) => x.domain === 'cyber')).toEqual({ domain: 'cyber', book: 'Proverbs', count: 3, dominant: 'thematic-parallel' });
    expect(m.cells.find((x) => x.domain === 'crypto')).toMatchObject({ count: 0, dominant: undefined });
  });
});
