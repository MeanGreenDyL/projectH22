/**
 * Wayback Machine archiving (spec §1: citations must survive link rot).
 * Looks up an existing snapshot first; requests a new capture only when asked, within a budget.
 */
import { fetchJson } from './http';

interface Availability {
  archived_snapshots?: { closest?: { available?: boolean; url?: string } };
}

export async function findSnapshot(url: string): Promise<string | undefined> {
  const r = await fetchJson<Availability>(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { minDelayMs: 1000 });
  const c = r.archived_snapshots?.closest;
  return c?.available && c.url ? c.url.replace(/^http:/, 'https:') : undefined;
}

export async function requestCapture(url: string): Promise<string | undefined> {
  const res = await fetch(`https://web.archive.org/save/${url}`, { method: 'GET', redirect: 'manual' });
  const loc = res.headers.get('content-location') ?? res.headers.get('location');
  if (loc && /\/web\/\d{8,14}\//.test(loc)) return new URL(loc, 'https://web.archive.org').toString();
  return undefined;
}

/** Fills archiveUrl on sources that lack one. Never fabricates: a source with no snapshot stays unarchived. */
export async function archiveSources<T extends { url: string; archiveUrl?: string | undefined }>(
  sources: T[],
  opts: { captureBudget: number },
): Promise<T[]> {
  let budget = opts.captureBudget;
  const out: T[] = [];
  for (const s of sources) {
    if (s.archiveUrl) { out.push(s); continue; }
    let snap = await findSnapshot(s.url).catch(() => undefined);
    if (!snap && budget > 0) {
      budget--;
      snap = await requestCapture(s.url).catch(() => undefined);
    }
    out.push(snap ? { ...s, archiveUrl: snap } : s);
  }
  return out;
}
