/**
 * pnpm report:coverage — which domains and months are thin. JSON to stdout.
 * A month is "thin" for a domain when it has fewer than THIN_THRESHOLD events.
 */
import { DOMAINS } from '../src/schemas';
import { runSchemaGate } from '../src/validation/schema-gate';
import { loadDataset } from '../src/validation/load';

const MONTHS = Number(process.env.COVERAGE_MONTHS ?? 24);
const THIN = Number(process.env.THIN_THRESHOLD ?? 2);
const now = new Date();
const months: string[] = [];
for (let i = MONTHS - 1; i >= 0; i--) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
  months.push(d.toISOString().slice(0, 7));
}
const { parsed } = runSchemaGate(loadDataset());
const domains = DOMAINS.map((domain) => {
  const evs = parsed.events.filter((e) => e.record.domain === domain);
  const byMonth = Object.fromEntries(months.map((m) => [m, evs.filter((e) => e.record.date.start.startsWith(m)).length]));
  return { domain, total: evs.length, byMonth, thinMonths: months.filter((m) => byMonth[m]! < THIN) };
});
console.log(JSON.stringify({
  generatedAt: now.toISOString(),
  window: { from: months[0], to: months.at(-1), thinThreshold: THIN },
  totalEvents: parsed.events.length,
  totalSeries: parsed.series.length,
  domains,
  emptyDomains: domains.filter((d) => d.total === 0).map((d) => d.domain),
}, null, 2));
