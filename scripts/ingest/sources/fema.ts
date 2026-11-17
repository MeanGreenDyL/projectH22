/**
 * OpenFEMA Disaster Declarations Summaries (US federal work, public domain). The API returns one row
 * per designated area; rows are grouped by disaster number into one event per declaration.
 */
import { US_STATE_CODES, type Domain, type EvidentiarySource, type VerifiedEvent } from '../../../src/schemas';
import { clip, isoDay, isoTime, type NormalizeResult } from '../lib/pipeline';

export const FEMA_API = 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries';

const TYPE_LABEL: Record<string, string> = {
  DR: 'Major disaster declaration',
  EM: 'Emergency declaration',
  FM: 'Fire management assistance declaration',
};
/** Incident types that are not natural hazards. Everything else is filed under natural. */
const NON_NATURAL = new Set(['Chemical', 'Biological', 'Terrorist', 'Toxic Substances', 'Dam/Levee Break', 'Human Cause', 'Other']);

type StateCode = (typeof US_STATE_CODES)[number];
const CODES = new Set<string>(US_STATE_CODES);
const isCode = (s: string): s is StateCode => CODES.has(s);

interface Row {
  femaDeclarationString: string;
  disasterNumber: number;
  state: string;
  declarationType: string;
  declarationDate: string;
  incidentType: string;
  declarationTitle: string;
  incidentBeginDate: string | null;
  incidentEndDate: string | null;
  designatedArea: string;
}

const lower = (s: string) => s.toLowerCase();

export function normalizeFema(json: unknown, opts: { now: Date }): NormalizeResult {
  const accessedAt = isoTime(opts.now);
  const groups = new Map<number, Row[]>();
  for (const r of (json as { DisasterDeclarationsSummaries: Row[] }).DisasterDeclarationsSummaries) {
    if (!TYPE_LABEL[r.declarationType]) continue;
    groups.set(r.disasterNumber, [...(groups.get(r.disasterNumber) ?? []), r]);
  }
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  for (const [n, rows] of groups) {
    const r = rows[0]!;
    const id = `fema-${lower(r.declarationType)}-${n}`;
    const label = TYPE_LABEL[r.declarationType]!;
    const areas = new Set(rows.map((x) => x.designatedArea)).size;
    sources.push({
      kind: 'evidentiary',
      id,
      tier: '1-primary',
      title: `${r.femaDeclarationString}: ${r.declarationTitle}`,
      publisher: 'Federal Emergency Management Agency',
      url: `https://www.fema.gov/disaster/${n}`,
      accessedAt,
    });
    const domain: Domain = NON_NATURAL.has(r.incidentType) ? 'infrastructure' : 'natural';
    const where = isCode(r.state) ? ` for ${r.state}` : '';
    const began = r.incidentBeginDate ? ` The incident period began on ${isoDay(r.incidentBeginDate)}${r.incidentEndDate ? ` and ended on ${isoDay(r.incidentEndDate)}` : ''}.` : '';
    events.push({
      id,
      domain,
      title: clip(`${label} ${r.femaDeclarationString}: ${r.incidentType}`, 120),
      summary: clip(
        `FEMA records a ${lower(label)} (${r.femaDeclarationString}, "${r.declarationTitle}")${where}, dated ${isoDay(r.declarationDate)}, for an incident of type "${r.incidentType}".${began} The declaration lists ${areas} designated area${areas === 1 ? '' : 's'}.`,
        400,
      ),
      date: { start: isoDay(r.declarationDate), precision: 'day' },
      geography: isCode(r.state) ? { scope: 'us-state', countries: ['US'], usStates: [r.state] } : { scope: 'us-federal', countries: [] },
      metrics: [{ label: 'Designated areas', value: areas, unit: 'areas', asOf: isoDay(opts.now), sourceId: id, isEstimate: false }],
      sources: [id],
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
