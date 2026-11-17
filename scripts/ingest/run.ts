/**
 * pnpm refresh:all | pnpm refresh:source <id>
 *
 * Each ingester: fetch → snapshot raw response to src/data/ingested/<id>/ → normalize →
 * archive sources (Wayback) → write events that have an archived source → hold back the rest
 * in pending.json → write status.json. Never commits; the workflow opens a PR.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveSources, findSnapshot } from './lib/archive';
import { fetchJson } from './lib/http';
import { DATA, isoDay, isoTime, partitionByArchive, readStatus, upsertSources, withKnownArchives, writeEvents, writePending, writeSeries, writeStatus, type NormalizeResult } from './lib/pipeline';
import { FEEDS } from '../../src/lib/feeds';
import type { Series, Source } from '../../src/schemas';
import { CG_API, CG_COINS, normalizeCoinGecko } from './sources/coingecko';
import { GDELT_TOPICS, gdeltUrl, normalizeGdelt } from './sources/gdelt';
import { WB_API, WB_INDICATORS, normalizeWorldBank } from './sources/world-bank';
import { KEV_FEED, KEV_PAGE, NVD_API, normalizeKev, parseNvd, type NvdScore } from './sources/cisa-kev';
import { CONGRESS_API, currentCongress, normalizeCongressLaws } from './sources/congress';
import { FEMA_API, normalizeFema } from './sources/fema';
import { FR_API, normalizeFederalRegister } from './sources/federal-register';
import { USGS_API, normalizeUsgs } from './sources/usgs';

const WINDOW_DAYS = Number(process.env.INGEST_WINDOW_DAYS ?? 365);
const CAPTURE_BUDGET = Number(process.env.ARCHIVE_CAPTURE_BUDGET ?? 25);

interface Ingester {
  id: string;
  run(now: Date, since: string): Promise<{ raw: unknown; result: NormalizeResult }>;
}

const INGESTERS: Ingester[] = [
  {
    id: 'cisa-kev',
    async run(now, since) {
      const raw = await fetchJson(KEV_FEED);
      const additions = (raw as { vulnerabilities: { cveID: string; dateAdded: string }[] }).vulnerabilities.filter((v) => v.dateAdded >= since);
      const key = process.env.NVD_API_KEY;
      const nvd = new Map<string, NvdScore>();
      for (const v of additions) {
        const json = await fetchJson(`${NVD_API}?cveId=${encodeURIComponent(v.cveID)}`, {
          minDelayMs: key ? 700 : 6500,
          ...(key ? { headers: { apiKey: key } } : {}),
        }).catch(() => undefined);
        if (json) for (const [id, s] of parseNvd(json)) nvd.set(id, s);
      }
      const catalogArchiveUrl = await findSnapshot(KEV_PAGE).catch(() => undefined);
      return { raw, result: normalizeKev(raw, nvd, { since, now, ...(catalogArchiveUrl ? { catalogArchiveUrl } : {}) }) };
    },
  },
  {
    id: 'usgs-earthquakes',
    async run(now, since) {
      const raw = await fetchJson(`${USGS_API}?format=geojson&starttime=${since}&minmagnitude=6&orderby=time`);
      return { raw, result: normalizeUsgs(raw, { minMagnitude: 6, now }) };
    },
  },
  {
    id: 'fema-declarations',
    async run(now, since) {
      const select = 'femaDeclarationString,disasterNumber,state,declarationType,declarationDate,incidentType,declarationTitle,incidentBeginDate,incidentEndDate,designatedArea';
      const q = `$filter=declarationDate ge '${since}'&$select=${select}&$top=10000&$orderby=declarationDate desc`;
      const raw = await fetchJson(`${FEMA_API}?${encodeURI(q)}`);
      return { raw, result: normalizeFema(raw, { now }) };
    },
  },
  {
    id: 'world-bank',
    async run(now) {
      const raw: Record<string, unknown> = {};
      const series: Series[] = [];
      const sources: Source[] = [];
      for (const ind of WB_INDICATORS) {
        for (const country of ind.countries) {
          const url = `${WB_API}/country/${country}/indicator/${ind.indicator}?format=json&per_page=100`;
          const json = await fetchJson(url, { minDelayMs: 300 });
          raw[url] = json;
          const r = normalizeWorldBank(json, { ...ind, country, now });
          if (r.series.points.length > 0) { series.push(r.series); sources.push(...r.sources); }
        }
      }
      return { raw, result: { events: [], sources, series } };
    },
  },
  {
    id: 'coingecko',
    async run(now) {
      const raw: Record<string, unknown> = {};
      const series: Series[] = [];
      const sources: Source[] = [];
      for (const c of CG_COINS) {
        const url = `${CG_API}/coins/${c.coin}/market_chart?vs_currency=usd&days=365&interval=daily`;
        const json = await fetchJson(url, { minDelayMs: 2500 });
        raw[url] = json;
        const r = normalizeCoinGecko(json, { ...c, now });
        series.push(...r.series);
        sources.push(...r.sources);
      }
      return { raw, result: { events: [], sources, series } };
    },
  },
  {
    id: 'gdelt',
    async run(now) {
      const raw: Record<string, unknown> = {};
      const series: Series[] = [];
      const sources: Source[] = [];
      for (const t of GDELT_TOPICS) {
        const url = gdeltUrl(t.query);
        const json = await fetchJson(url, { minDelayMs: 6000, timeoutMs: 60_000, retries: 3 });
        raw[url] = json;
        const r = normalizeGdelt(json, { ...t, now });
        if (r.series.points.length > 0) { series.push(r.series); sources.push(...r.sources); }
      }
      return { raw, result: { events: [], sources, series } };
    },
  },
  {
    id: 'congress-laws',
    async run(now, since) {
      const key = process.env.CONGRESS_API_KEY || 'DEMO_KEY';
      const bills: unknown[] = [];
      for (const c of new Set([currentCongress(new Date(since)), currentCongress(now)])) {
        for (let offset = 0; ; offset += 250) {
          const json = await fetchJson<{ bills: unknown[]; pagination: { count: number } }>(
            `${CONGRESS_API}/law/${c}?format=json&limit=250&offset=${offset}&api_key=${key}`,
            { minDelayMs: 1000 },
          );
          bills.push(...json.bills);
          if (offset + 250 >= json.pagination.count) break;
        }
      }
      const raw = { bills };
      return { raw, result: normalizeCongressLaws(raw, { since, now }) };
    },
  },
  {
    id: 'federal-register-eo',
    async run(now, since) {
      const q = new URLSearchParams({
        'conditions[presidential_document_type]': 'executive_order',
        'conditions[signing_date][gte]': since,
        per_page: '1000',
        order: 'newest',
      });
      for (const f of ['document_number', 'title', 'executive_order_number', 'signing_date', 'publication_date', 'citation', 'html_url']) q.append('fields[]', f);
      const raw = await fetchJson(`${FR_API}?${q}`);
      return { raw, result: normalizeFederalRegister(raw, { now }) };
    },
  },
];

async function runOne(ing: Ingester): Promise<boolean> {
  const feed = FEEDS.find((f) => f.id === ing.id);
  if (!feed) throw new Error(`ingester "${ing.id}" is not in FEEDS (src/lib/feeds.ts)`);
  const slaHours = feed.slaHours;
  const now = new Date();
  const since = isoDay(now.getTime() - WINDOW_DAYS * 86_400_000);
  const lastAttempt = isoTime(now);
  try {
    const { raw, result } = await ing.run(now, since);
    const dir = join(DATA, 'ingested', ing.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'latest.json'), `${JSON.stringify(raw)}\n`);
    const sources = await archiveSources(withKnownArchives(result.sources), { captureBudget: CAPTURE_BUDGET });
    const { ready, pending } = partitionByArchive(result.events, sources);
    const series = result.series ?? [];
    const used = new Set([...ready.flatMap((e) => e.sources), ...series.map((s) => s.sourceId)]);
    upsertSources(sources.filter((s) => used.has(s.id)));
    writeEvents(ready);
    writeSeries(series);
    const held = [...pending.map((p) => ({ id: p.event.id, reason: p.reason })), ...(result.held ?? [])];
    writePending(ing.id, held);
    writeStatus({ source: ing.id, lastAttempt, lastSuccess: lastAttempt, ok: true, eventsWritten: ready.length, eventsPending: held.length, ...(series.length ? { seriesWritten: series.length } : {}), slaHours });
    console.log(`${ing.id}: ${ready.length} events written, ${held.length} pending${series.length ? `, ${series.length} series` : ''}`);
    return true;
  } catch (err) {
    // Keep the last good run's time and counts: a failed refresh does not remove what is already published.
    const prev = readStatus(ing.id);
    writeStatus({
      source: ing.id,
      lastAttempt,
      ...(prev?.lastSuccess ? { lastSuccess: prev.lastSuccess } : {}),
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      eventsWritten: prev?.eventsWritten ?? 0,
      eventsPending: prev?.eventsPending ?? 0,
      ...(prev?.seriesWritten ? { seriesWritten: prev.seriesWritten } : {}),
      slaHours,
    });
    console.error(`${ing.id}: FAILED ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

const [cmd, id] = process.argv.slice(2);
const selected = cmd === 'source' ? INGESTERS.filter((i) => i.id === id) : INGESTERS;
if (cmd === 'source' && selected.length === 0) {
  console.error(`unknown source "${id}". Known: ${INGESTERS.map((i) => i.id).join(', ')}`);
  process.exit(2);
}
let ok = true;
for (const ing of selected) ok = (await runOne(ing)) && ok;
process.exitCode = ok ? 0 : 1;
