/** USGS ComCat earthquakes (public domain, US federal work). Significant events at or above a magnitude threshold. */
import { US_STATE_CODES, type EvidentiarySource, type VerifiedEvent } from '../../../src/schemas';
import { clip, isoDay, isoTime, type NormalizeResult } from '../lib/pipeline';

export const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

type StateCode = (typeof US_STATE_CODES)[number];
const STATE_NAMES: Record<string, StateCode> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI',
  Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR',
  Guam: 'GU', 'U.S. Virgin Islands': 'VI', 'American Samoa': 'AS', 'Northern Mariana Islands': 'MP',
};
const CODES = new Set<string>(US_STATE_CODES);
const isCode = (s: string): s is StateCode => CODES.has(s);

/** USGS place strings end in ", <state name or code>" for US events. Anything else stays unresolved. */
export function usStateFromPlace(place: string): StateCode | undefined {
  const tail = place.split(',').pop()?.trim() ?? '';
  if (STATE_NAMES[tail]) return STATE_NAMES[tail];
  return isCode(tail) && place.includes(',') ? tail : undefined;
}

interface Feature {
  id: string;
  properties: { mag: number | null; magType: string; place: string | null; time: number; updated: number; url: string; title: string; type: string; tsunami: number };
  geometry: { coordinates: [number, number, number] };
}

export function normalizeUsgs(json: unknown, opts: { minMagnitude: number; now: Date }): NormalizeResult {
  const accessedAt = isoTime(opts.now);
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  for (const f of (json as { features: Feature[] }).features) {
    const p = f.properties;
    if (p.type !== 'earthquake' || p.mag === null || p.mag < opts.minMagnitude) continue;
    const [lon, lat, depth] = f.geometry.coordinates;
    const state = p.place ? usStateFromPlace(p.place) : undefined;
    const sourceId = `usgs-${f.id.toLowerCase()}`;
    sources.push({ kind: 'evidentiary', id: sourceId, tier: '1-primary', title: p.title, publisher: 'U.S. Geological Survey', url: p.url, accessedAt });
    const where = !p.place ? '' : /^\d+(\.\d+)? km [NSEW]{1,3} of /.test(p.place) ? ` ${p.place}` : ` near ${p.place}`;
    events.push({
      id: sourceId,
      domain: 'natural',
      title: clip(p.title, 120),
      summary: clip(
        `A magnitude ${p.mag} earthquake occurred${where} at a depth of ${depth} km, according to the U.S. Geological Survey.${p.tsunami ? ' The USGS flagged the event for possible tsunami impact.' : ''}`,
        400,
      ),
      date: { start: isoDay(p.time), precision: 'day' },
      geography: state
        ? { scope: 'us-state', countries: ['US'], usStates: [state], coordinates: [lon, lat] }
        : { scope: 'regional', countries: [], coordinates: [lon, lat] },
      metrics: [
        { label: `Magnitude (${p.magType})`, value: p.mag, unit: 'magnitude', asOf: isoDay(p.updated), sourceId, isEstimate: false },
        { label: 'Depth', value: depth, unit: 'km', asOf: isoDay(p.updated), sourceId, isEstimate: false },
      ],
      sources: [sourceId],
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
