import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { loadDataset } from '../src/validation/load';
import { runSchemaGate } from '../src/validation/schema-gate';
import { correlation, event, evidentiary, interpretive, rules, scenario } from './helpers';

let dir: string;

function writeDataset(opts: {
  sources?: unknown;
  events?: Record<string, unknown>;
  correlations?: Record<string, unknown>;
  scenarios?: Record<string, unknown>;
  raw?: Record<string, string>;
}) {
  dir = mkdtempSync(join(tmpdir(), 'h22-'));
  if (opts.sources !== undefined) writeFileSync(join(dir, 'sources.json'), JSON.stringify(opts.sources));
  for (const [path, rec] of Object.entries(opts.events ?? {})) {
    mkdirSync(join(dir, 'events', path, '..'), { recursive: true });
    writeFileSync(join(dir, 'events', path), JSON.stringify(rec));
  }
  for (const [name, rec] of Object.entries(opts.correlations ?? {})) {
    mkdirSync(join(dir, 'correlations'), { recursive: true });
    writeFileSync(join(dir, 'correlations', name), stringify(rec));
  }
  for (const [name, rec] of Object.entries(opts.scenarios ?? {})) {
    mkdirSync(join(dir, 'scenarios'), { recursive: true });
    writeFileSync(join(dir, 'scenarios', name), stringify(rec));
  }
  for (const [path, text] of Object.entries(opts.raw ?? {})) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return loadDataset(dir, dir);
}

function validFiles() {
  return {
    sources: [evidentiary(), interpretive()],
    events: { 'cyber/test-event.json': event() },
    correlations: { 'test-correlation.yaml': correlation() },
    scenarios: { 'test-scenario.yaml': scenario() },
  };
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('schema gate (pnpm validate)', () => {
  it('passes an empty data layer — Phase 0 ships with no content', () => {
    const { issues } = runSchemaGate(writeDataset({ sources: [] }));
    expect(issues).toEqual([]);
  });

  it('passes a valid dataset and returns parsed records', () => {
    const { issues, parsed } = runSchemaGate(writeDataset(validFiles()));
    expect(issues).toEqual([]);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.correlations[0]?.file).toBe('correlations/test-correlation.yaml');
  });

  it('fails when sources.json is missing', () => {
    expect(rules(runSchemaGate(writeDataset({})).issues)).toContain('SCHEMA-MISSING-REGISTRY');
  });

  it('reports unparseable files', () => {
    const raw = writeDataset({ sources: [], raw: { 'events/cyber/bad.json': '{ nope' } });
    expect(rules(runSchemaGate(raw).issues)).toEqual(['SCHEMA-READ']);
  });

  it('rejects stray file types in record folders', () => {
    const raw = writeDataset({ sources: [], raw: { 'correlations/notes.md': '# hi' } });
    expect(rules(runSchemaGate(raw).issues)).toEqual(['SCHEMA-READ']);
  });

  it('reports Zod failures with the field path', () => {
    const files = validFiles();
    const raw = writeDataset({ ...files, correlations: { 'test-correlation.yaml': { ...correlation(), counterReading: '' } } });
    const { issues } = runSchemaGate(raw);
    expect(rules(issues)).toContain('SCHEMA-ZOD');
    expect(issues.find((i) => i.rule === 'SCHEMA-ZOD')?.message).toMatch(/counterReading/);
  });

  it('requires the file name to match the record id', () => {
    const raw = writeDataset({ ...validFiles(), events: { 'cyber/other-name.json': event() } });
    expect(rules(runSchemaGate(raw).issues)).toContain('SCHEMA-ID-FILENAME');
  });

  it('requires events to sit in the folder for their domain', () => {
    const raw = writeDataset({ ...validFiles(), events: { 'crypto/test-event.json': event() } });
    expect(rules(runSchemaGate(raw).issues)).toContain('SCHEMA-EVENT-DOMAIN-FOLDER');
  });

  it('rejects duplicate ids', () => {
    const raw = writeDataset({ ...validFiles(), sources: [evidentiary(), evidentiary(), interpretive()] });
    expect(rules(runSchemaGate(raw).issues)).toContain('SCHEMA-DUPLICATE-ID');
  });

  it('rejects references to sources that are not in the registry', () => {
    const raw = writeDataset({ ...validFiles(), events: { 'cyber/test-event.json': event({ sources: ['nope-source'] }) } });
    expect(rules(runSchemaGate(raw).issues)).toContain('REF-SOURCE');
  });

  it('rejects metric, position, support and objection references to missing sources', () => {
    const e = event();
    const raw = writeDataset({
      ...validFiles(),
      events: {
        'cyber/test-event.json': {
          ...e,
          metrics: [{ ...e.metrics[0], sourceId: 'missing-a' }],
          sourcePositions: [{ sourceId: 'missing-b', position: 'affirms' }],
        },
      },
      correlations: {
        'test-correlation.yaml': correlation({
          scholarlySupport: [{ citation: 'x', sourceId: 'missing-c', position: 'supports' }],
        }),
      },
      scenarios: {
        'test-scenario.yaml': scenario({
          majorScholarlyObjections: [{ objection: 'x'.repeat(40), sourceId: 'missing-d' }],
        }),
      },
    });
    const refIssues = runSchemaGate(raw).issues.filter((i) => i.rule === 'REF-SOURCE');
    expect(refIssues.map((i) => i.message).join(' ')).toMatch(/missing-a.*missing-b.*missing-c.*missing-d/s);
  });

  it('rejects correlations pointing at events that do not exist', () => {
    const raw = writeDataset({ ...validFiles(), correlations: { 'test-correlation.yaml': correlation({ eventIds: ['ghost-event'] }) } });
    expect(rules(runSchemaGate(raw).issues)).toContain('REF-EVENT');
  });
});
