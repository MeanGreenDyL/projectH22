/**
 * `pnpm check:source-links` — weekly scheduled check that every cited source URL, and its archive
 * copy, still answers. Reports; does not fail the job or change data. A dead live URL with a
 * working archive copy is expected over time; a dead archive copy needs a human look.
 */
import { appendFileSync, readFileSync } from 'node:fs';

const UA = 'project-h22-linkcheck/0.1 (+https://github.com/MeanGreenDyL/projectH22)';
interface Src { id: string; url: string; archiveUrl?: string }

export function linkTargets(sources: readonly Src[]): { id: string; kind: 'live' | 'archive'; url: string }[] {
  return sources.flatMap((s) => [
    { id: s.id, kind: 'live' as const, url: s.url },
    ...(s.archiveUrl ? [{ id: s.id, kind: 'archive' as const, url: s.archiveUrl }] : []),
  ]);
}

async function status(url: string): Promise<number> {
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const r = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (method === 'HEAD' && (r.status === 405 || r.status === 403)) continue;
      return r.status;
    } catch { if (method === 'GET') return 0; }
  }
  return 0;
}

async function main() {
  const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as Src[];
  const targets = linkTargets(sources);
  const bad: string[] = [];
  const perHost = new Map<string, number>();
  let i = 0;
  const worker = async () => {
    while (i < targets.length) {
      const t = targets[i++]!;
      const host = new URL(t.url).host;
      const last = perHost.get(host) ?? 0;
      const wait = last + 1000 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      perHost.set(host, Date.now());
      const s = await status(t.url);
      if (s === 0 || s >= 400) bad.push(`| ${t.id} | ${t.kind} | ${s || 'no response'} | ${t.url} |`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const report = [`### Source links: ${targets.length} checked, ${bad.length} not answering`, '', ...(bad.length ? ['| Source | Link | Status | URL |', '| --- | --- | --- | --- |', ...bad.sort()] : [])].join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
}

if (process.argv[1]?.endsWith('source-links.ts')) void main();
