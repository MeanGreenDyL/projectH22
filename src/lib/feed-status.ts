/** Build-time reads of src/data/ingested/<feed>/{status,pending}.json. Node only. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FEEDS, type FeedStatus } from './feeds';

const DIR = 'src/data/ingested';

export function readFeedStatuses(): Map<string, FeedStatus> {
  const out = new Map<string, FeedStatus>();
  for (const f of FEEDS) {
    const p = join(DIR, f.id, 'status.json');
    if (existsSync(p)) out.set(f.id, JSON.parse(readFileSync(p, 'utf8')) as FeedStatus);
  }
  return out;
}

export function readPending(feedId: string): { id: string; reason: string }[] {
  const p = join(DIR, feedId, 'pending.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as { id: string; reason: string }[]) : [];
}
