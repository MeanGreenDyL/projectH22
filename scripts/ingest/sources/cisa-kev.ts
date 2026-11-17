/**
 * CISA Known Exploited Vulnerabilities catalog (CC0 1.0), enriched with CVSS from NVD CVE API 2.0.
 * Each catalog addition inside the window becomes one VerifiedEvent.
 */
import type { EvidentiarySource, Metric, VerifiedEvent } from '../../../src/schemas';
import { clip, isoDay, isoTime, type NormalizeResult } from '../lib/pipeline';

export const KEV_FEED = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
export const KEV_PAGE = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
export const NVD_API = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}
interface KevCatalog {
  catalogVersion: string;
  dateReleased: string;
  vulnerabilities: KevEntry[];
}

export interface NvdScore {
  baseScore: number;
  version: string;
  lastModified: string;
}

interface NvdResponse {
  vulnerabilities?: {
    cve: {
      id: string;
      lastModified: string;
      metrics?: Record<string, { type?: string; cvssData: { baseScore: number; version: string } }[] | undefined>;
    };
  }[];
}

/** Primary CVSS v3.1, else v3.0, else v4.0 score per CVE. No score → absent. */
export function parseNvd(json: unknown): Map<string, NvdScore> {
  const out = new Map<string, NvdScore>();
  for (const { cve } of (json as NvdResponse).vulnerabilities ?? []) {
    for (const key of ['cvssMetricV31', 'cvssMetricV30', 'cvssMetricV40']) {
      const list = cve.metrics?.[key];
      const m = list?.find((x) => x.type === 'Primary') ?? list?.[0];
      if (m) {
        out.set(cve.id, { baseScore: m.cvssData.baseScore, version: m.cvssData.version, lastModified: cve.lastModified });
        break;
      }
    }
  }
  return out;
}

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function normalizeKev(
  json: unknown,
  nvd: ReadonlyMap<string, NvdScore>,
  opts: { since: string; now: Date; catalogArchiveUrl?: string },
): NormalizeResult {
  const cat = json as KevCatalog;
  const accessedAt = isoTime(opts.now);
  const catalog: EvidentiarySource = {
    kind: 'evidentiary',
    id: 'cisa-kev-catalog',
    tier: '1-primary',
    title: 'Known Exploited Vulnerabilities Catalog',
    publisher: 'Cybersecurity and Infrastructure Security Agency (CISA)',
    url: KEV_PAGE,
    accessedAt,
    ...(opts.catalogArchiveUrl ? { archiveUrl: opts.catalogArchiveUrl } : {}),
  };
  const sources: EvidentiarySource[] = [catalog];
  const events: VerifiedEvent[] = [];
  const asOf = isoDay(cat.dateReleased);

  for (const v of cat.vulnerabilities) {
    if (v.dateAdded < opts.since) continue;
    const cveLower = v.cveID.toLowerCase();
    const metrics: Metric[] = [
      { label: 'Remediation window', value: days(v.dateAdded, v.dueDate), unit: 'days', asOf, sourceId: catalog.id, isEstimate: false },
    ];
    const eventSources = [catalog.id];
    const score = nvd.get(v.cveID);
    if (score) {
      const nvdId = `nvd-${cveLower}`;
      sources.push({
        kind: 'evidentiary',
        id: nvdId,
        tier: '1-primary',
        title: `${v.cveID} Detail`,
        publisher: 'National Vulnerability Database (NIST)',
        url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
        accessedAt,
      });
      eventSources.push(nvdId);
      metrics.unshift({ label: `CVSS base score (v${score.version})`, value: score.baseScore, unit: 'score', asOf: isoDay(score.lastModified + (score.lastModified.endsWith('Z') ? '' : 'Z')), sourceId: nvdId, isEstimate: false });
    }
    const ransomware = v.knownRansomwareCampaignUse === 'Known' ? ' CISA lists it as known to be used in ransomware campaigns.' : '';
    events.push({
      id: `kev-${cveLower}`,
      domain: 'cyber',
      title: clip(`${v.cveID}: ${v.vulnerabilityName}`, 120),
      summary: clip(
        `CISA added ${v.cveID} (${v.vendorProject} ${v.product}) to its Known Exploited Vulnerabilities catalog, based on evidence of active exploitation.${ransomware} Federal civilian agencies were given until ${v.dueDate} to remediate.`,
        400,
      ),
      date: { start: v.dateAdded, precision: 'day' },
      geography: { scope: 'us-federal', countries: ['US'] },
      metrics,
      sources: eventSources,
      lastVerified: accessedAt,
      confidence: 'confirmed',
      usImpact: clip(`Under Binding Operational Directive 22-01, federal civilian executive branch agencies must remediate this vulnerability by ${v.dueDate}.`, 400),
    });
  }
  return { events, sources };
}
