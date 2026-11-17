/** Federal Register API: executive orders. Each order becomes one us-law VerifiedEvent. */
import type { EvidentiarySource, VerifiedEvent } from '../../../src/schemas';
import { clip, isoTime, type NormalizeResult } from '../lib/pipeline';

export const FR_API = 'https://www.federalregister.gov/api/v1/documents.json';

interface FrDoc {
  document_number: string;
  title: string;
  executive_order_number: number | null;
  signing_date: string | null;
  publication_date: string;
  citation: string | null;
  html_url: string;
}

export function normalizeFederalRegister(json: unknown, opts: { now: Date }): NormalizeResult {
  const accessedAt = isoTime(opts.now);
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  for (const d of (json as { results?: FrDoc[] }).results ?? []) {
    if (!d.executive_order_number || !d.signing_date) continue;
    const sourceId = `fr-${d.document_number.toLowerCase()}`;
    sources.push({
      kind: 'evidentiary',
      id: sourceId,
      tier: '1-primary',
      title: d.title,
      publisher: 'Office of the Federal Register (National Archives)',
      url: d.html_url,
      accessedAt,
      publishedAt: d.publication_date,
    });
    events.push({
      id: `eo-${d.executive_order_number}`,
      domain: 'us-law',
      title: clip(`Executive Order ${d.executive_order_number}: ${d.title}`, 120),
      summary: clip(
        `Executive Order ${d.executive_order_number}, "${d.title}", was signed on ${d.signing_date} and published in the Federal Register on ${d.publication_date}${d.citation ? ` (${d.citation})` : ''}.`,
        400,
      ),
      date: { start: d.signing_date, precision: 'day' },
      geography: { scope: 'us-federal', countries: ['US'] },
      metrics: [],
      sources: [sourceId],
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
