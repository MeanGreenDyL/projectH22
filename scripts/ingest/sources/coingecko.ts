/** CoinGecko public API, /coins/{id}/market_chart (attribution required: "Data provided by CoinGecko"). Daily series. */
import type { EvidentiarySource, Series } from '../../../src/schemas';
import { isoDay, isoTime } from '../lib/pipeline';

export const CG_API = 'https://api.coingecko.com/api/v3';
export const CG_COINS = [
  { coin: 'bitcoin', name: 'Bitcoin' },
  { coin: 'ethereum', name: 'Ether' },
];

type Pair = [number, number];

/** CoinGecko appends a live intraday point; only whole-day (00:00 UTC) closes are kept. */
function daily(pairs: Pair[]): [string, number][] {
  const out = new Map<string, number>();
  for (const [t, v] of pairs) if (t % 86_400_000 === 0 && Number.isFinite(v)) out.set(isoDay(t), v);
  return [...out].sort((a, b) => a[0].localeCompare(b[0]));
}

export function normalizeCoinGecko(json: unknown, opts: { coin: string; name: string; now: Date }): { series: Series[]; sources: EvidentiarySource[] } {
  const raw = json as { prices: Pair[]; market_caps: Pair[] };
  const sourceId = `coingecko-${opts.coin}`;
  const source: EvidentiarySource = {
    kind: 'evidentiary',
    id: sourceId,
    tier: '3-institutional',
    title: `${opts.name} historical market data`,
    publisher: 'CoinGecko',
    url: `https://www.coingecko.com/en/coins/${opts.coin}/historical_data`,
    accessedAt: isoTime(opts.now),
  };
  const notes = ['Data provided by CoinGecko. Values are daily snapshots at 00:00 UTC aggregated across exchanges; they are not a single exchange price.'];
  const make = (id: string, title: string, pairs: Pair[]): Series => ({
    id, title, domain: 'crypto', measure: 'measurement', unit: 'USD', frequency: 'daily',
    countries: [], sourceId, asOf: isoDay(opts.now), points: daily(pairs), notes: [...notes],
  });
  return {
    series: [
      make(`cg-${opts.coin}-price-usd`, `${opts.name} price (USD)`, raw.prices),
      make(`cg-${opts.coin}-market-cap-usd`, `${opts.name} market capitalization (USD)`, raw.market_caps),
    ].filter((s) => s.points.length > 0),
    sources: [source],
  };
}
