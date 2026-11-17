/** Series normalizers. Fixtures are SYNTHETIC (tests/ingest/fixtures/README.md). */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeCoinGecko } from '../../scripts/ingest/sources/coingecko';
import { normalizeGdelt } from '../../scripts/ingest/sources/gdelt';
import { normalizeWorldBank } from '../../scripts/ingest/sources/world-bank';
import { Series, Source } from '../../src/schemas';

const fx = (name: string) => JSON.parse(readFileSync(`tests/ingest/fixtures/${name}.json`, 'utf8')) as unknown;
const NOW = new Date('2026-11-17T06:00:00Z');

describe('World Bank indicator', () => {
  const { series, sources } = normalizeWorldBank(fx('world-bank'), { indicator: 'XX.EXAMPLE.ZS', country: 'US', domain: 'economic', unit: '%', now: NOW });
  it('produces an ascending annual series that omits missing years', () => {
    expect(Series.safeParse(series).success).toBe(true);
    expect(series.points).toEqual([['2021', 1], ['2023', 3.25], ['2024', 2.5]]);
    expect(series).toMatchObject({ id: 'wb-xx-example-zs-us', frequency: 'annual', measure: 'measurement', countries: ['US'], asOf: '2026-11-11' });
  });
  it('cites the World Bank indicator page as a Tier 3 source', () => {
    expect(Source.safeParse(sources[0]).success).toBe(true);
    expect(sources[0]).toMatchObject({ id: 'wb-xx-example-zs-us', tier: '3-institutional', url: 'https://data.worldbank.org/indicator/XX.EXAMPLE.ZS?locations=US' });
  });
  it('maps the world aggregate to no country', () => {
    const w = normalizeWorldBank(fx('world-bank'), { indicator: 'XX.EXAMPLE.ZS', country: 'WLD', domain: 'economic', unit: '%', now: NOW });
    expect(w.series).toMatchObject({ id: 'wb-xx-example-zs-wld', countries: [] });
    expect(w.sources[0]!.url).toBe('https://data.worldbank.org/indicator/XX.EXAMPLE.ZS?locations=1W');
  });
});

describe('CoinGecko market chart', () => {
  const { series, sources } = normalizeCoinGecko(fx('coingecko'), { coin: 'examplecoin', name: 'Examplecoin', now: NOW });
  it('keeps only whole-day (00:00 UTC) points, dropping the partial current day', () => {
    const price = series.find((s) => s.id === 'cg-examplecoin-price-usd')!;
    expect(Series.safeParse(price).success).toBe(true);
    expect(price.points).toEqual([['2026-11-15', 100.5], ['2026-11-16', 101.25], ['2026-11-17', 99]]);
    expect(series.map((s) => s.id).sort()).toEqual(['cg-examplecoin-market-cap-usd', 'cg-examplecoin-price-usd']);
    for (const s of series) expect(s).toMatchObject({ domain: 'crypto', frequency: 'daily', unit: 'USD', sourceId: 'coingecko-examplecoin' });
  });
  it('produces a valid source', () => {
    expect(Source.safeParse(sources[0]).success).toBe(true);
  });
  it('stores nothing when GDELT answers at a resolution other than daily', () => {
    const hourly = { query_details: { date_resolution: 'hour' }, timeline: [{ series: 'Volume Intensity', data: [{ date: '20261101T010000Z', value: 0.1 }] }] };
    expect(normalizeGdelt(hourly, { slug: 'x-topic', topic: 'x', query: 'x', domain: 'cyber', now: NOW }).series.points).toEqual([]);
  });
});

describe('GDELT coverage', () => {
  const { series, sources } = normalizeGdelt(fx('gdelt'), { slug: 'example-topic', topic: 'example topic', query: '"example topic"', domain: 'cyber', now: NOW });
  it('is labelled as media attention, never as a measure of events', () => {
    expect(Series.safeParse(series).success).toBe(true);
    expect(series.measure).toBe('media-attention');
    expect(series.title).toMatch(/coverage/i);
    expect(series.notes?.join(' ')).toMatch(/not a measure of the events/i);
  });
  it('converts GDELT timestamps to days and keeps zero values', () => {
    expect(series.points).toEqual([['2026-11-01', 0.1201], ['2026-11-02', 0], ['2026-11-03', 0.0954]]);
    expect(Source.safeParse(sources[0]).success).toBe(true);
  });
});
