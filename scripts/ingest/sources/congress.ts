/**
 * Congress.gov API v3, /law/{congress}: bills that became law (US federal work, public domain).
 * Free api.data.gov key (CONGRESS_API_KEY); falls back to DEMO_KEY, which is enough for one daily list call.
 */
import type { EvidentiarySource, VerifiedEvent } from '../../../src/schemas';
import { clip, isoTime, type NormalizeResult } from '../lib/pipeline';

export const CONGRESS_API = 'https://api.congress.gov/v3';
/** The 119th Congress runs 2025-01-03 to 2027-01-03. */
export const currentCongress = (now: Date) => Math.floor((now.getUTCFullYear() - 1789) / 2) + 1 - (now.getUTCMonth() === 0 && now.getUTCDate() < 3 && now.getUTCFullYear() % 2 === 1 ? 1 : 0);

const BILL_PATH: Record<string, string> = {
  HR: 'house-bill',
  S: 'senate-bill',
  HJRES: 'house-joint-resolution',
  SJRES: 'senate-joint-resolution',
};
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

interface Bill {
  congress: number;
  latestAction: { actionDate: string; text: string };
  laws: { number: string; type: string }[];
  number: string;
  originChamber: string;
  title: string;
  type: string;
}

export function normalizeCongressLaws(json: unknown, opts: { since: string; now: Date }): NormalizeResult & { held: { id: string; reason: string }[] } {
  const accessedAt = isoTime(opts.now);
  const events: VerifiedEvent[] = [];
  const sources: EvidentiarySource[] = [];
  const held: { id: string; reason: string }[] = [];
  for (const b of (json as { bills: Bill[] }).bills) {
    const law = b.laws[0];
    const path = BILL_PATH[b.type];
    if (!law || !path) continue;
    const isPrivate = law.type === 'Private Law';
    const id = `${isPrivate ? 'pvtl' : 'pl'}-${law.number}`;
    if (!/^Became (Public|Private) Law/.test(b.latestAction.text)) {
      held.push({ id, reason: 'enactment date not in the list response' });
      continue;
    }
    const date = b.latestAction.actionDate;
    if (date < opts.since) continue;
    const billLabel = `${b.type === 'HR' ? 'H.R.' : b.type === 'S' ? 'S.' : b.type === 'HJRES' ? 'H.J.Res.' : 'S.J.Res.'} ${b.number}`;
    const sourceId = `congress-${b.congress}-${b.type.toLowerCase()}-${b.number}`;
    sources.push({
      kind: 'evidentiary',
      id: sourceId,
      tier: '1-primary',
      title: `${billLabel} (${ordinal(b.congress)} Congress): ${b.title}`,
      publisher: 'Library of Congress (Congress.gov)',
      url: `https://www.congress.gov/bill/${ordinal(b.congress)}-congress/${path}/${b.number}`,
      accessedAt,
    });
    events.push({
      id,
      domain: 'us-law',
      title: clip(`${law.type} ${law.number}: ${b.title}`, 120),
      summary: clip(`${billLabel}, "${b.title}", originated in the ${b.originChamber} of the ${ordinal(b.congress)} Congress and became ${law.type} ${law.number} on ${date}, according to Congress.gov.`, 400),
      date: { start: date, precision: 'day' },
      geography: { scope: 'us-federal', countries: ['US'] },
      metrics: [],
      sources: [sourceId],
      lastVerified: accessedAt,
      confidence: 'confirmed',
    });
  }
  return { events, sources, held };
}
