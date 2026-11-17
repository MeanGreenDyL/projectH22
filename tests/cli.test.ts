import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { correlation, event, evidentiary, interpretive } from './helpers';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function dataset(counterReading: string, proposedReading = correlation().proposedReading) {
  const dir = mkdtempSync(join(tmpdir(), 'h22-cli-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'sources.json'), JSON.stringify([evidentiary(), interpretive()]));
  mkdirSync(join(dir, 'events', 'cyber'), { recursive: true });
  writeFileSync(join(dir, 'events', 'cyber', 'test-event.json'), JSON.stringify(event()));
  mkdirSync(join(dir, 'correlations'));
  writeFileSync(join(dir, 'correlations', 'test-correlation.yaml'), stringify(correlation({ counterReading, proposedReading })));
  return dir;
}

function run(script: string, dir: string) {
  return spawnSync('pnpm', ['exec', 'tsx', `scripts/${script}.ts`, '--data', dir], { encoding: 'utf8' });
}

describe('CLI exit codes', () => {
  it('both gates exit 0 on the real (empty) data layer', () => {
    expect(spawnSync('pnpm', ['exec', 'tsx', 'scripts/validate.ts'], { encoding: 'utf8' }).status).toBe(0);
    expect(spawnSync('pnpm', ['exec', 'tsx', 'scripts/validate-credibility.ts'], { encoding: 'utf8' }).status).toBe(0);
  });
  it('validate exits non-zero when a counterReading is empty', () => {
    const r = run('validate', dataset(''));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/SCHEMA-ZOD/);
  });
  it('validate:credibility refuses to run on schema-invalid data', () => {
    expect(run('validate-credibility', dataset('')).status).toBe(1);
  });
  it('validate:credibility exits non-zero on certainty language', () => {
    const r = run('validate-credibility', dataset(correlation().counterReading, 'This event fulfilled the passage, padded past the minimum length.'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/COR-CERTAINTY-TERMS/);
  });
  it('validate:credibility exits 0 on clean data', () => {
    expect(run('validate-credibility', dataset(correlation().counterReading)).status).toBe(0);
  });
});
