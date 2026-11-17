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
  // Corrections are republished under the same order number with an "R1-" document number.
  // The order is one event: dated and summarised from the original, citing every publication.
  const byOrder = new Map<number, FrDoc[]>();
  for (const d of (json as { results?: FrDoc[] }).results ?? []) {
    if (!d.executive_order_number || !d.signing_date) continue;
    const n = Number(d.executive_order_number);
    byOrder.set(n, [...(byOrder.get(n) ?? []), d]);
  }
  for (const [n, docs] of byOrder) {
    docs.sort((a, b) => a.publication_date.localeCompare(b.publication_date) || a.document_number.length - b.document_number.length);
    const [d, ...republished] = docs as [FrDoc, ...FrDoc[]];
    const ids = docs.map((x) => `fr-${x.document_number.toLowerCase()}`);
    docs.forEach((x, i) =>
      sources.push({
        kind: 'evidentiary',
        id: ids[i]!,
        tier: '1-primary',
        title: x.document_number.startsWith('R') ? `${x.title} (republished correction)` : x.title,
        publisher: 'Office of the Federal Register (National Archives)',
        url: x.html_url,
        accessedAt,
        publishedAt: x.publication_date,
      }),
    );
    const again = republished.length ? ` A correction was republished on ${republished.map((x) => x.publication_date).join(', ')}.` : '';
    events.push({
      id: `eo-${n}`,
      domain: 'us-law',
      title: clip(`Executive Order ${n}: ${d.title}`, 120),
      summary: clip(
        `Executive Order ${n}, "${d.title}", was signed on ${d.signing_date} and published in the Federal Register on ${d.publication_date}${d.citation ? ` (${d.citation})` : ''}.${again}`,
        400,
      ),
      date: { start: d.signing_date!, precision: 'day' },
      geography: { scope: 'us-federal', countries: ['US'] },
      metrics: [],
      sources: ids,
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources };
}
