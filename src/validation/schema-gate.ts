/**
 * `pnpm validate` — structural gate. Zod validation of every collection, id/file-name
 * agreement, duplicate ids, and referential integrity. The credibility gate runs only on
 * what passes here.
 */
import { basename, dirname, extname } from 'node:path';
import type { z } from 'zod';
import { ScripturalCorrelation, Scenario, Source, VerifiedEvent } from '../schemas';
import type { Issue, Located, ParsedDataset, RawDataset, RawFile } from './types';

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ');
}

function parseRecord<T>(raw: RawFile, schema: z.ZodType<T>, issues: Issue[]): Located<T> | undefined {
  if (raw.readError !== undefined) {
    issues.push({ rule: 'SCHEMA-READ', severity: 'error', file: raw.file, message: raw.readError });
    return undefined;
  }
  const result = schema.safeParse(raw.data);
  if (!result.success) {
    const id = (raw.data as { id?: unknown } | null)?.id;
    issues.push({
      rule: 'SCHEMA-ZOD',
      severity: 'error',
      file: raw.file,
      ...(typeof id === 'string' ? { recordId: id } : {}),
      message: formatZodError(result.error),
    });
    return undefined;
  }
  return { file: raw.file, record: result.data };
}

function checkFileName(loc: Located<{ id: string }>, issues: Issue[]) {
  const expected = basename(loc.file, extname(loc.file));
  if (expected !== loc.record.id) {
    issues.push({
      rule: 'SCHEMA-ID-FILENAME',
      severity: 'error',
      file: loc.file,
      recordId: loc.record.id,
      message: `file name "${expected}" must equal record id "${loc.record.id}"`,
    });
  }
}

function checkDuplicates(kind: string, records: Located<{ id: string }>[], issues: Issue[]) {
  const seen = new Map<string, string>();
  for (const loc of records) {
    const prior = seen.get(loc.record.id);
    if (prior !== undefined) {
      issues.push({
        rule: 'SCHEMA-DUPLICATE-ID',
        severity: 'error',
        file: loc.file,
        recordId: loc.record.id,
        message: `duplicate ${kind} id "${loc.record.id}" (also in ${prior})`,
      });
    } else {
      seen.set(loc.record.id, loc.file);
    }
  }
}

export function runSchemaGate(raw: RawDataset): { issues: Issue[]; parsed: ParsedDataset } {
  const issues: Issue[] = [];
  const parsed: ParsedDataset = { sources: [], events: [], correlations: [], scenarios: [] };

  // ---- source registry ----
  if (raw.sources === undefined) {
    issues.push({ rule: 'SCHEMA-MISSING-REGISTRY', severity: 'error', message: 'src/data/sources.json is missing' });
  } else if (raw.sources.readError !== undefined) {
    issues.push({ rule: 'SCHEMA-READ', severity: 'error', file: raw.sources.file, message: raw.sources.readError });
  } else if (!Array.isArray(raw.sources.data)) {
    issues.push({ rule: 'SCHEMA-ZOD', severity: 'error', file: raw.sources.file, message: 'sources.json must be a JSON array' });
  } else {
    const file = raw.sources.file;
    raw.sources.data.forEach((entry, index) => {
      const loc = parseRecord({ file: `${file}[${index}]`, data: entry }, Source, issues);
      if (loc) parsed.sources.push({ file, record: loc.record });
    });
  }

  // ---- record collections ----
  for (const f of raw.events) {
    const loc = parseRecord(f, VerifiedEvent, issues);
    if (!loc) continue;
    checkFileName(loc, issues);
    const folder = basename(dirname(loc.file));
    if (folder !== loc.record.domain) {
      issues.push({
        rule: 'SCHEMA-EVENT-DOMAIN-FOLDER',
        severity: 'error',
        file: loc.file,
        recordId: loc.record.id,
        message: `event with domain "${loc.record.domain}" must live in events/${loc.record.domain}/`,
      });
    }
    parsed.events.push(loc);
  }
  for (const f of raw.correlations) {
    const loc = parseRecord(f, ScripturalCorrelation, issues);
    if (!loc) continue;
    checkFileName(loc, issues);
    parsed.correlations.push(loc);
  }
  for (const f of raw.scenarios) {
    const loc = parseRecord(f, Scenario, issues);
    if (!loc) continue;
    checkFileName(loc, issues);
    parsed.scenarios.push(loc);
  }

  checkDuplicates('source', parsed.sources, issues);
  checkDuplicates('event', parsed.events, issues);
  checkDuplicates('correlation', parsed.correlations, issues);
  checkDuplicates('scenario', parsed.scenarios, issues);

  // ---- referential integrity ----
  const sourceIds = new Set(parsed.sources.map((s) => s.record.id));
  const eventIds = new Set(parsed.events.map((e) => e.record.id));
  const refSource = (file: string, recordId: string, field: string, id: string) => {
    if (!sourceIds.has(id)) {
      issues.push({
        rule: 'REF-SOURCE',
        severity: 'error',
        file,
        recordId,
        message: `${field} references "${id}", which is not in sources.json`,
      });
    }
  };

  for (const { file, record: e } of parsed.events) {
    e.sources.forEach((id) => refSource(file, e.id, 'sources', id));
    e.metrics.forEach((m, i) => refSource(file, e.id, `metrics.${i}.sourceId`, m.sourceId));
    e.sourcePositions?.forEach((p, i) => refSource(file, e.id, `sourcePositions.${i}.sourceId`, p.sourceId));
  }
  for (const { file, record: c } of parsed.correlations) {
    c.scholarlySupport.forEach((s, i) => refSource(file, c.id, `scholarlySupport.${i}.sourceId`, s.sourceId));
    for (const id of c.eventIds) {
      if (!eventIds.has(id)) {
        issues.push({
          rule: 'REF-EVENT',
          severity: 'error',
          file,
          recordId: c.id,
          message: `eventIds references "${id}", which is not a VerifiedEvent`,
        });
      }
    }
  }
  for (const { file, record: s } of parsed.scenarios) {
    s.majorScholarlyObjections.forEach((o, i) =>
      refSource(file, s.id, `majorScholarlyObjections.${i}.sourceId`, o.sourceId),
    );
  }

  return { issues, parsed };
}
