/**
 * Open States API v3 (Plural Policy): state bills signed into law, for a short list of topics
 * that match the site's domains. Key in OPENSTATES_API_KEY; free tier ~30 req/min.
 * State bills in general are out of scope: tens of thousands a year, most unrelated to the site.
 */
import { US_STATE_CODES, type Domain, type EvidentiarySource, type VerifiedEvent } from '../../../src/schemas';
import { clip, isoTime, type NormalizeResult } from '../lib/pipeline';

export const OPENSTATES_API = 'https://v3.openstates.org';

export interface StateTopic {
  slug: string;
  /** The bill title must match, so a passing mention in the text is not enough. */
  title: RegExp;
  domain: Domain;
}
export const STATE_TOPICS: (StateTopic & { query: string })[] = [
  { slug: 'cybersecurity', query: 'cybersecurity', title: /cyber ?security|cyber ?attack|ransomware/i, domain: 'cyber' },
  { slug: 'data-breach', query: '"data breach"', title: /data breach|breach of security/i, domain: 'cyber' },
  { slug: 'crypto', query: 'cryptocurrency', title: /crypto ?currenc|virtual currenc|digital asset|blockchain|stablecoin/i, domain: 'crypto' },
];

type StateCode = (typeof US_STATE_CODES)[number];
const CODES = new Set<string>(US_STATE_CODES);
const isCode = (s: string): s is StateCode => CODES.has(s);

interface Bill {
  session: string;
  jurisdiction: { id: string; name: string };
  identifier: string;
  title: string;
  openstates_url: string;
  sources?: { url: string }[];
  actions?: { description: string; date: string; classification: string[] }[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function normalizeOpenStates(json: unknown, opts: { topic: StateTopic; since: string; now: Date }): NormalizeResult {
  const accessedAt = isoTime(opts.now);
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  for (const b of (json as { results: Bill[] }).results) {
    if (!opts.topic.title.test(b.title)) continue;
    const state = /state:([a-z]{2})/.exec(b.jurisdiction.id)?.[1]?.toUpperCase();
    if (!state || !isCode(state)) continue;
    const actions = b.actions ?? [];
    // Signature is the enactment date; "became-law" can be a later effective-date action. Use the first of either.
    const enacted = actions
      .filter((a) => a.classification.includes('executive-signature') || a.classification.includes('became-law'))
      .sort((x, y) => x.date.localeCompare(y.date))[0];
    if (!enacted) continue;
    const date = enacted.date.slice(0, 10);
    if (date < opts.since) continue;
    const id = `os-${slug(state)}-${slug(b.session)}-${slug(b.identifier)}`;
    const cited: string[] = [];
    const leg = b.sources?.[0]?.url;
    if (leg && /^https?:\/\//.test(leg)) {
      sources.push({ kind: 'evidentiary', id: `${id}-legislature`, tier: '1-primary', title: `${b.jurisdiction.name} ${b.identifier} (${b.session}): ${b.title}`, publisher: `${b.jurisdiction.name} Legislature`, url: leg, accessedAt });
      cited.push(`${id}-legislature`);
    }
    sources.push({ kind: 'evidentiary', id, tier: '3-institutional', title: `${b.jurisdiction.name} ${b.identifier} (${b.session}): ${b.title}`, publisher: 'Open States (Plural Policy)', url: b.openstates_url, accessedAt });
    cited.push(id);
    events.push({
      id,
      domain: opts.topic.domain,
      title: clip(`${b.jurisdiction.name} ${b.identifier}: ${b.title}`, 120),
      summary: clip(`${b.jurisdiction.name} ${b.identifier} (${b.session} session), "${b.title}", was recorded as "${enacted.description}" on ${date}, according to the legislature's record as collected by Open States.`, 400),
      date: { start: date, precision: 'day' },
      geography: { scope: 'us-state', countries: ['US'], usStates: [state] },
      metrics: [],
      sources: cited,
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
