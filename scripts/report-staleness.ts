/**
 * pnpm report:staleness — JSON report of feeds and records past their refresh SLA.
 * Exit 1 when a critical feed is failing or has never run; 0 otherwise.
 */
import { FEEDS, feedHealth, overallIndicator } from '../src/lib/feeds';
import { readFeedStatuses } from '../src/lib/feed-status';
import { runSchemaGate } from '../src/validation/schema-gate';
import { loadDataset } from '../src/validation/load';

const RECORD_SLA_DAYS = Number(process.env.RECORD_SLA_DAYS ?? 90);
const now = new Date();
const statuses = readFeedStatuses();
const feeds = FEEDS.map((f) => {
  const s = statuses.get(f.id);
  return { id: f.id, critical: f.critical, health: feedHealth(f, s, now), slaHours: f.slaHours, lastSuccess: s?.lastSuccess ?? null, lastAttempt: s?.lastAttempt ?? null, error: s?.error ?? null };
});
const { parsed } = runSchemaGate(loadDataset());
const cutoff = now.getTime() - RECORD_SLA_DAYS * 86_400_000;
const staleEvents = parsed.events.filter((e) => Date.parse(e.record.lastVerified) < cutoff).map((e) => ({ id: e.record.id, lastVerified: e.record.lastVerified }));
const report = {
  generatedAt: now.toISOString(),
  indicator: overallIndicator(FEEDS, statuses, now),
  feeds,
  records: { slaDays: RECORD_SLA_DAYS, total: parsed.events.length, stale: staleEvents.length, staleEvents },
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = feeds.some((f) => f.critical && (f.health === 'failing' || f.health === 'never-run')) ? 1 : 0;
