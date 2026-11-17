import { describe, expect, it } from 'vitest';
import { Series } from '../src/schemas';

/** SYNTHETIC. */
const base = {
  id: 'wb-example-us',
  title: 'Example indicator, United States',
  domain: 'economic',
  measure: 'measurement',
  unit: '%',
  frequency: 'annual',
  countries: ['US'],
  sourceId: 'wb-example',
  asOf: '2026-11-17',
  points: [['2023', 1.5], ['2024', 2]],
} as const;

describe('Series schema', () => {
  it('accepts a well-formed series', () => {
    expect(Series.safeParse(base).success).toBe(true);
  });
  it('rejects periods that do not match the frequency', () => {
    expect(Series.safeParse({ ...base, points: [['2024-01', 1]] }).success).toBe(false);
    expect(Series.safeParse({ ...base, frequency: 'daily', points: [['2024-02-30x', 1]] }).success).toBe(false);
  });
  it('rejects unsorted or duplicate periods', () => {
    expect(Series.safeParse({ ...base, points: [['2024', 1], ['2023', 2]] }).success).toBe(false);
    expect(Series.safeParse({ ...base, points: [['2024', 1], ['2024', 2]] }).success).toBe(false);
  });
  it('rejects non-finite values and empty series', () => {
    expect(Series.safeParse({ ...base, points: [['2024', Number.NaN]] }).success).toBe(false);
    expect(Series.safeParse({ ...base, points: [] }).success).toBe(false);
  });
  it('requires a media-attention series to say so in its title', () => {
    const media = { ...base, measure: 'media-attention', frequency: 'daily', points: [['2026-11-01', 0.4]] };
    expect(Series.safeParse({ ...media, title: 'Ransomware' }).success).toBe(false);
    expect(Series.safeParse({ ...media, title: 'News coverage of ransomware' }).success).toBe(true);
  });
});
