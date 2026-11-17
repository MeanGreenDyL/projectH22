/** Shared steps: archive partition, writing records, status files. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Source, SourceRegistry, VerifiedEvent } from '../../../src/schemas';

export interface NormalizeResult {
  events: VerifiedEvent[];
  sources: Source[];
}

/** An event is publishable only if at least one of its sources is archived (EVT-ARCHIVE). */
export function partitionByArchive(events: VerifiedEvent[], sources: Source[]) {
  const archived = new Set(sources.filter((s) => s.archiveUrl).map((s) => s.id));
  const ready: VerifiedEvent[] = [];
  const pending: { event: VerifiedEvent; reason: string }[] = [];
  for (const e of events) {
    if (e.sources.some((id) => archived.has(id))) ready.push(e);
    else pending.push({ event: e, reason: 'no archived source yet' });
  }
  return { ready, pending };
}

export const DATA = 'src/data';

/** Upsert sources by id. An existing archiveUrl is never dropped. */
export function upsertSources(incoming: Source[]): void {
  const path = join(DATA, 'sources.json');
  const current = SourceRegistry.parse(JSON.parse(readFileSync(path, 'utf8')));
  const byId = new Map(current.map((s) => [s.id, s]));
  for (const s of incoming) {
    const prev = byId.get(s.id);
    byId.set(s.id, prev?.archiveUrl && !s.archiveUrl ? { ...s, archiveUrl: prev.archiveUrl } : s);
  }
  const sorted = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

export function writeEvents(events: VerifiedEvent[]): void {
  for (const e of events) {
    const dir = join(DATA, 'events', e.domain);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${e.id}.json`), `${JSON.stringify(VerifiedEvent.parse(e), null, 2)}\n`);
  }
}

export interface IngestStatus {
  source: string;
  lastAttempt: string;
  lastSuccess?: string;
  ok: boolean;
  error?: string;
  eventsWritten: number;
  eventsPending: number;
  /** Refresh SLA in hours, used by report:staleness and /data-health. */
  slaHours: number;
}

export function readStatus(id: string): IngestStatus | undefined {
  const p = join(DATA, 'ingested', id, 'status.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as IngestStatus) : undefined;
}

export function writeStatus(s: IngestStatus): void {
  const dir = join(DATA, 'ingested', s.source);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'status.json'), `${JSON.stringify(s, null, 2)}\n`);
}

export function writePending(id: string, pending: { event: VerifiedEvent; reason: string }[]): void {
  const dir = join(DATA, 'ingested', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'pending.json'), `${JSON.stringify(pending.map((p) => ({ id: p.event.id, reason: p.reason })), null, 2)}\n`);
}

export const isoDay = (d: Date | string | number) => new Date(d).toISOString().slice(0, 10);
export const isoTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
export function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}
