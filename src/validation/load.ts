/**
 * Reads the flat-file data layer (spec §2: "Flat JSON/NDJSON in /src/data").
 *
 *   src/data/sources.json                     one array of Source records
 *   src/data/events/<domain>/<id>.json        one VerifiedEvent per file
 *   src/data/correlations/<id>.yaml           one ScripturalCorrelation per file
 *   src/data/scenarios/<id>.yaml              one Scenario per file
 *   src/data/series/<id>.json                 one Series per file (measurements over time, not events)
 *   src/data/ingested/<source-id>/            raw feed snapshots; not records, not validated here
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { RawDataset, RawFile } from './types';

export const DEFAULT_DATA_DIR = 'src/data';

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function readFile(path: string, displayRoot: string): RawFile {
  const file = relative(displayRoot, path) || path;
  try {
    const text = readFileSync(path, 'utf8');
    const data: unknown = /\.ya?ml$/i.test(path) ? parseYaml(text) : JSON.parse(text);
    return { file, data };
  } catch (err) {
    return { file, data: undefined, readError: err instanceof Error ? err.message : String(err) };
  }
}

function readCollection(dir: string, extensions: RegExp, displayRoot: string): RawFile[] {
  return walk(dir).flatMap((path) => {
    if (extensions.test(path)) return [readFile(path, displayRoot)];
    return [
      {
        file: relative(displayRoot, path),
        data: undefined,
        readError: `unexpected file type in ${relative(displayRoot, dir)}; expected ${extensions.source}`,
      },
    ];
  });
}

export function loadDataset(dataDir: string = DEFAULT_DATA_DIR, displayRoot: string = process.cwd()): RawDataset {
  const sourcesPath = join(dataDir, 'sources.json');
  return {
    sources: existsSync(sourcesPath) ? readFile(sourcesPath, displayRoot) : undefined,
    events: readCollection(join(dataDir, 'events'), /\.json$/i, displayRoot),
    correlations: readCollection(join(dataDir, 'correlations'), /\.ya?ml$/i, displayRoot),
    scenarios: readCollection(join(dataDir, 'scenarios'), /\.ya?ml$/i, displayRoot),
    series: readCollection(join(dataDir, 'series'), /\.json$/i, displayRoot),
  };
}
