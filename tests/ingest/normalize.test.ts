/**
 * Normalizer contracts for the Phase 2 ingesters, written before the ingesters.
 * Fixtures are SYNTHETIC (tests/ingest/fixtures/README.md).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeFederalRegister } from '../../scripts/ingest/sources/federal-register';
import { normalizeKev, parseNvd } from '../../scripts/ingest/sources/cisa-kev';
import { normalizeUsgs } from '../../scripts/ingest/sources/usgs';
import { partitionByArchive } from '../../scripts/ingest/lib/pipeline';
import { runCredibilityGate } from '../../src/validation/credibility';
import { Source, VerifiedEvent } from '../../src/schemas';

const fx = (name: string) => JSON.parse(readFileSync(`tests/ingest/fixtures/${name}.json`, 'utf8')) as unknown;
const NOW = new Date('2026-11-17T00:00:00Z');
const ARCHIVE = 'https://web.archive.org/web/20261116000000/https://www.cisa.gov/known-exploited-vulnerabilities-catalog';

describe('CISA KEV + NVD', () => {
  const nvd = parseNvd(fx('nvd'));
  const { events, sources } = normalizeKev(fx('kev'), nvd, { since: '2026-01-01', now: NOW, catalogArchiveUrl: ARCHIVE });

  it('keeps only additions inside the window', () => {
    expect(events.map((e) => e.id).sort()).toEqual(['kev-cve-0000-0001', 'kev-cve-0000-0002']);
  });
  it('produces schema-valid events and sources', () => {
    for (const e of events) expect(VerifiedEvent.safeParse(e).success).toBe(true);
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
  });
  it('dates the event on the catalog addition, at day precision', () => {
    const e = events.find((x) => x.id === 'kev-cve-0000-0001')!;
    expect(e.date).toEqual({ start: '2026-10-01', precision: 'day' });
    expect(e.domain).toBe('cyber');
    expect(e.geography).toEqual({ scope: 'us-federal', countries: ['US'] });
  });
  it('takes CVSS only from NVD, cited to the NVD record, and never invents one', () => {
    const withScore = events.find((x) => x.id === 'kev-cve-0000-0001')!;
    const cvss = withScore.metrics.find((m) => m.label.startsWith('CVSS'))!;
    expect(cvss).toMatchObject({ value: 9.8, sourceId: 'nvd-cve-0000-0001', asOf: '2026-10-05', isEstimate: false });
    const withoutScore = events.find((x) => x.id === 'kev-cve-0000-0002')!;
    expect(withoutScore.metrics.some((m) => m.label.startsWith('CVSS'))).toBe(false);
    expect(withoutScore.sources).not.toContain('nvd-cve-0000-0002');
  });
  it('records the remediation window from the catalog', () => {
    const e = events.find((x) => x.id === 'kev-cve-0000-0001')!;
    expect(e.metrics.find((m) => m.label === 'Remediation window')).toMatchObject({ value: 21, unit: 'days', sourceId: 'cisa-kev-catalog' });
  });
  it('mentions known ransomware use only when the catalog says Known', () => {
    expect(events.find((x) => x.id === 'kev-cve-0000-0001')!.summary).toMatch(/ransomware/);
    expect(events.find((x) => x.id === 'kev-cve-0000-0002')!.summary).not.toMatch(/ransomware/);
  });
  it('archives the shared catalog source', () => {
    expect(sources.find((s) => s.id === 'cisa-kev-catalog')?.archiveUrl).toBe(ARCHIVE);
  });
});

describe('USGS earthquakes', () => {
  const { events, sources } = normalizeUsgs(fx('usgs'), { minMagnitude: 6, now: NOW });

  it('keeps only events at or above the magnitude threshold', () => {
    expect(events.map((e) => e.id).sort()).toEqual(['usgs-xx0000abcd', 'usgs-xx0000efgh']);
  });
  it('produces schema-valid events and sources', () => {
    for (const e of events) expect(VerifiedEvent.safeParse(e).success).toBe(true);
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
  });
  it('places US events in their state and leaves unknown countries empty', () => {
    const us = events.find((e) => e.id === 'usgs-xx0000abcd')!;
    expect(us.geography).toMatchObject({ scope: 'us-state', countries: ['US'], usStates: ['CA'], coordinates: [-117.6, 35.7] });
    const other = events.find((e) => e.id === 'usgs-xx0000efgh')!;
    expect(other.geography.countries).toEqual([]);
  });
  it('records magnitude and depth with the USGS update date', () => {
    const e = events.find((x) => x.id === 'usgs-xx0000abcd')!;
    expect(e.metrics.map((m) => [m.label, m.value, m.unit])).toEqual([
      ['Magnitude (mww)', 6.4, 'magnitude'],
      ['Depth', 12.3, 'km'],
    ]);
    expect(e.domain).toBe('natural');
  });
});

describe('Federal Register executive orders', () => {
  const { events, sources } = normalizeFederalRegister(fx('federal-register'), { now: NOW });
  it('produces one schema-valid us-law event per order, dated by signing', () => {
    expect(events).toHaveLength(1);
    const e = events[0]!;
    expect(VerifiedEvent.safeParse(e).success).toBe(true);
    expect(e).toMatchObject({ id: 'eo-99999', domain: 'us-law', date: { start: '2026-09-30', precision: 'day' } });
    expect(e.title).toMatch(/^Executive Order 99999: /);
    for (const s of sources) expect(Source.safeParse(s).success).toBe(true);
  });
});

describe('archive partition', () => {
  it('holds back events with no archived source instead of publishing them', () => {
    const { events, sources } = normalizeUsgs(fx('usgs'), { minMagnitude: 6, now: NOW });
    const archived = sources.map((s) => (s.id === 'usgs-xx0000abcd' ? { ...s, archiveUrl: 'https://web.archive.org/web/2026/x' } : s));
    const { ready, pending } = partitionByArchive(events, archived);
    expect(ready.map((e) => e.id)).toEqual(['usgs-xx0000abcd']);
    expect(pending.map((p) => p.event.id)).toEqual(['usgs-xx0000efgh']);
  });
  it('ready events pass the credibility gate', () => {
    const { events, sources } = normalizeKev(fx('kev'), parseNvd(fx('nvd')), { since: '2026-01-01', now: NOW, catalogArchiveUrl: ARCHIVE });
    const { ready } = partitionByArchive(events, sources);
    const issues = runCredibilityGate(
      {
        sources: sources.map((record) => ({ file: 'sources.json', record })),
        events: ready.map((record) => ({ file: `events/${record.domain}/${record.id}.json`, record })),
        correlations: [],
        scenarios: [],
      },
      { now: NOW },
    );
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
