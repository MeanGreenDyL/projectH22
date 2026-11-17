/**
 * Federal Register API: rule documents for a few topics that fill the site's thinner domains
 * (crypto, cyber, sanctions, monetary). Each rule becomes one VerifiedEvent dated on publication.
 */
import type { Domain, EvidentiarySource, VerifiedEvent } from '../../../src/schemas';
import { clip, isoTime, type NormalizeResult } from '../lib/pipeline';

export interface RuleTopic {
  slug: string;
  domain: Domain;
  /** When set, the rule title must match: full-text search alone is too loose. */
  title?: RegExp;
}

export const RULE_TOPICS: (RuleTopic & { conditions: Record<string, string> })[] = [
  { slug: 'crypto', domain: 'crypto', title: /stablecoin|crypto|digital asset|virtual currenc|blockchain/i, conditions: { 'conditions[term]': '"digital asset" | cryptocurrency | stablecoin | "crypto asset"' } },
  { slug: 'cyber', domain: 'cyber', title: /cyber|critical infrastructure protection|incident report/i, conditions: { 'conditions[term]': 'cybersecurity | "cyber incident"' } },
  { slug: 'sanctions', domain: 'geopolitical', conditions: { 'conditions[agencies][]': 'foreign-assets-control-office' } },
  { slug: 'federal-reserve', domain: 'economic', conditions: { 'conditions[agencies][]': 'federal-reserve-system' } },
];

interface Doc {
  document_number: string;
  title: string;
  publication_date: string;
  effective_on: string | null;
  citation: string | null;
  html_url: string;
  agencies: { raw_name?: string; name?: string }[];
}

export function normalizeFrRules(json: unknown, opts: { topic: RuleTopic; now: Date }): NormalizeResult {
  const accessedAt = isoTime(opts.now);
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  for (const d of (json as { results?: Doc[] }).results ?? []) {
    if (opts.topic.title && !opts.topic.title.test(d.title)) continue;
    const sourceId = `fr-${d.document_number.toLowerCase()}`;
    const agencies = [...new Set(d.agencies.map((a) => a.name ?? a.raw_name).filter((x): x is string => !!x))];
    sources.push({ kind: 'evidentiary', id: sourceId, tier: '1-primary', title: d.title, publisher: 'Office of the Federal Register (National Archives)', url: d.html_url, accessedAt, publishedAt: d.publication_date });
    const who = agencies.length ? agencies.join(' / ') : 'A federal agency';
    events.push({
      id: `fr-rule-${d.document_number.toLowerCase()}`,
      domain: opts.topic.domain,
      title: clip(`Federal rule: ${d.title}`, 120),
      summary: clip(
        `${who} published the rule "${d.title}" in the Federal Register on ${d.publication_date}${d.citation ? ` (${d.citation})` : ''}${d.effective_on ? `, effective ${d.effective_on}` : ''}.`,
        400,
      ),
      date: { start: d.publication_date, precision: 'day' },
      geography: { scope: 'us-federal', countries: ['US'] },
      metrics: [],
      sources: [sourceId],
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
