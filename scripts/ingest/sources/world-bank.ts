/** World Bank Indicators API v2 (CC BY 4.0, attribution: The World Bank). Annual series. */
import type { Domain, EvidentiarySource, Series } from '../../../src/schemas';
import { isoTime } from '../lib/pipeline';

export const WB_API = 'https://api.worldbank.org/v2';

interface Row {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  date: string;
  value: number | null;
}

export interface WorldBankSpec {
  indicator: string;
  /** ISO alpha-2, or WLD for the world aggregate. */
  country: string;
  domain: Domain;
  unit: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function normalizeWorldBank(json: unknown, spec: WorldBankSpec & { now: Date }): { series: Series; sources: EvidentiarySource[] } {
  const [meta, rows] = json as [{ lastupdated: string }, Row[] | null];
  const data = (rows ?? []).filter((r): r is Row & { value: number } => r.value !== null && Number.isFinite(r.value));
  const first = (rows ?? [])[0];
  const id = `wb-${slug(spec.indicator)}-${slug(spec.country)}`;
  const world = spec.country === 'WLD';
  const place = first?.country.value ?? spec.country;
  const name = first?.indicator.value ?? spec.indicator;
  const source: EvidentiarySource = {
    kind: 'evidentiary',
    id,
    tier: '3-institutional',
    title: `${name}: ${place}`,
    publisher: 'The World Bank',
    url: `https://data.worldbank.org/indicator/${spec.indicator}?locations=${world ? '1W' : spec.country}`,
    accessedAt: isoTime(spec.now),
  };
  return {
    series: {
      id,
      title: `${name}, ${place}`.slice(0, 120),
      domain: spec.domain,
      measure: 'measurement',
      unit: spec.unit,
      frequency: 'annual',
      countries: world ? [] : [spec.country],
      sourceId: id,
      asOf: meta.lastupdated,
      points: data.map((r) => [r.date, r.value] as [string, number]).sort((a, b) => a[0].localeCompare(b[0])),
      notes: ['World Bank World Development Indicators, CC BY 4.0. Years with no reported value are left out, not filled in.'],
    },
    sources: [source],
  };
}

/** Curated indicators. Each becomes one series per listed country. */
export const WB_INDICATORS: (Omit<WorldBankSpec, 'country'> & { countries: string[] })[] = [
  { indicator: 'NY.GDP.MKTP.KD.ZG', domain: 'economic', unit: '% annual growth', countries: ['US', 'WLD'] },
  { indicator: 'FP.CPI.TOTL.ZG', domain: 'economic', unit: '% annual', countries: ['US', 'WLD'] },
  { indicator: 'SL.UEM.TOTL.ZS', domain: 'economic', unit: '% of labor force', countries: ['US', 'WLD'] },
  { indicator: 'MS.MIL.XPND.GD.ZS', domain: 'geopolitical', unit: '% of GDP', countries: ['US', 'WLD'] },
  { indicator: 'SM.POP.REFG', domain: 'geopolitical', unit: 'people', countries: ['WLD'] },
  { indicator: 'IT.NET.USER.ZS', domain: 'cyber', unit: '% of population', countries: ['US', 'WLD'] },
  { indicator: 'EG.ELC.ACCS.ZS', domain: 'infrastructure', unit: '% of population', countries: ['WLD'] },
];
