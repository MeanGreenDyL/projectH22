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
import { DATA, isoDay, isoTime, partitionByArchive, upsertSources, writeEvents, writePending, writeStatus, type NormalizeResult } from './lib/pipeline';
import { KEV_FEED, KEV_PAGE, NVD_API, normalizeKev, parseNvd, type NvdScore } from './sources/cisa-kev';
import { FR_API, normalizeFederalRegister } from './sources/federal-register';
import { USGS_API, normalizeUsgs } from './sources/usgs';

const WINDOW_DAYS = Number(process.env.INGEST_WINDOW_DAYS ?? 365);
const CAPTURE_BUDGET = Number(process.env.ARCHIVE_CAPTURE_BUDGET ?? 25);

interface Ingester {
  id: string;
  slaHours: number;
  run(now: Date, since: string): Promise<{ raw: unknown; result: NormalizeResult }>;
}

const INGESTERS: Ingester[] = [
  {
    id: 'cisa-kev',
    slaHours: 48,
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
    slaHours: 48,
    async run(now, since) {
      const raw = await fetchJson(`${USGS_API}?format=geojson&starttime=${since}&minmagnitude=6&orderby=time`);
      return { raw, result: normalizeUsgs(raw, { minMagnitude: 6, now }) };
    },
  },
  {
    id: 'federal-register-eo',
    slaHours: 48,
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
  const now = new Date();
  const since = isoDay(now.getTime() - WINDOW_DAYS * 86_400_000);
  const lastAttempt = isoTime(now);
  try {
    const { raw, result } = await ing.run(now, since);
    const dir = join(DATA, 'ingested', ing.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'latest.json'), `${JSON.stringify(raw)}\n`);
    const sources = await archiveSources(result.sources, { captureBudget: CAPTURE_BUDGET });
    const { ready, pending } = partitionByArchive(result.events, sources);
    const used = new Set(ready.flatMap((e) => e.sources));
    upsertSources(sources.filter((s) => used.has(s.id)));
    writeEvents(ready);
    writePending(ing.id, pending);
    writeStatus({ source: ing.id, lastAttempt, lastSuccess: lastAttempt, ok: true, eventsWritten: ready.length, eventsPending: pending.length, slaHours: ing.slaHours });
    console.log(`${ing.id}: ${ready.length} events written, ${pending.length} pending archive`);
    return true;
  } catch (err) {
    writeStatus({ source: ing.id, lastAttempt, ok: false, error: err instanceof Error ? err.message : String(err), eventsWritten: 0, eventsPending: 0, slaHours: ing.slaHours });
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
