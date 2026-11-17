/**
 * Feed registry and freshness rules, shared by the ingest runner, /data-health, the header
 * freshness indicator and `pnpm report:staleness`. One list, so they cannot disagree.
 */
export interface Feed {
  id: string;
  name: string;
  publisher: string;
  license: string;
  produces: 'events' | 'series';
  /** Refresh SLA in hours. Past it, the feed is stale. */
  slaHours: number;
  /** Feeds the header indicator watches (spec §6c "oldest critical feed"). */
  critical: boolean;
  /** Env var holding the API key, when the feed takes one. */
  keyEnv?: string;
  /** True when the feed cannot run at all without that key. */
  keyRequired?: boolean;
}

export const FEEDS: readonly Feed[] = [
  { id: 'cisa-kev', name: 'CISA Known Exploited Vulnerabilities, with NVD scores', publisher: 'CISA / NIST', license: 'CC0 1.0 (KEV); US government work (NVD)', produces: 'events', slaHours: 48, critical: true, keyEnv: 'NVD_API_KEY' },
  { id: 'federal-register-eo', name: 'Federal Register: executive orders', publisher: 'Office of the Federal Register', license: 'US government work', produces: 'events', slaHours: 48, critical: true },
  { id: 'congress-laws', name: 'Congress.gov: bills that became law', publisher: 'Library of Congress', license: 'US government work', produces: 'events', slaHours: 48, critical: true, keyEnv: 'CONGRESS_API_KEY' },
  { id: 'open-states', name: 'Open States: state legislation', publisher: 'Plural Policy (Open States)', license: 'CC BY 4.0 (data); see openstates.org', produces: 'events', slaHours: 48, critical: false, keyEnv: 'OPENSTATES_API_KEY', keyRequired: true },
  { id: 'usgs-earthquakes', name: 'USGS earthquakes, magnitude 6 and above', publisher: 'U.S. Geological Survey', license: 'US government work', produces: 'events', slaHours: 48, critical: true },
  { id: 'fema-declarations', name: 'OpenFEMA disaster declarations', publisher: 'FEMA', license: 'US government work', produces: 'events', slaHours: 48, critical: true },
  { id: 'world-bank', name: 'World Bank development indicators', publisher: 'The World Bank', license: 'CC BY 4.0', produces: 'series', slaHours: 24 * 30, critical: false },
  { id: 'coingecko', name: 'CoinGecko market data', publisher: 'CoinGecko', license: 'CoinGecko API terms; attribution required', produces: 'series', slaHours: 48, critical: false },
  { id: 'gdelt', name: 'GDELT news coverage (media attention, not events)', publisher: 'The GDELT Project', license: 'Free and open, attribution requested', produces: 'series', slaHours: 48, critical: false },
];

export interface FeedStatus {
  source: string;
  lastAttempt: string;
  lastSuccess?: string;
  ok: boolean;
  error?: string;
  eventsWritten: number;
  eventsPending: number;
  seriesWritten?: number;
  slaHours: number;
}

export type Health = 'fresh' | 'stale' | 'failing' | 'never-run';

/**
 * fresh: last success within SLA, and the last attempt succeeded.
 * failing: the last attempt failed (whatever the age of older data).
 * stale: last success older than SLA.
 */
export function feedHealth(feed: Feed, status: FeedStatus | undefined, now: Date): Health {
  if (!status) return 'never-run';
  if (!status.ok) return 'failing';
  if (!status.lastSuccess) return 'failing';
  const ageHours = (now.getTime() - Date.parse(status.lastSuccess)) / 3_600_000;
  return ageHours > feed.slaHours ? 'stale' : 'fresh';
}

export type Indicator = 'green' | 'amber' | 'red';

/** Header indicator: green when every critical feed is fresh; red when any critical feed has never succeeded or is failing past its SLA; amber otherwise. */
export function overallIndicator(feeds: readonly Feed[], statuses: ReadonlyMap<string, FeedStatus>, now: Date): Indicator {
  let worst: Indicator = 'green';
  for (const f of feeds.filter((x) => x.critical)) {
    const s = statuses.get(f.id);
    const h = feedHealth(f, s, now);
    if (h === 'fresh') continue;
    const pastSla = !s?.lastSuccess || (now.getTime() - Date.parse(s.lastSuccess)) / 3_600_000 > f.slaHours;
    if (h === 'never-run' || (h === 'failing' && pastSla)) return 'red';
    worst = 'amber';
  }
  return worst;
}
