import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CorrectionsLog } from '../src/schemas';

const entry = (id: string, date: string) => ({ id, date, recordId: 'test-event', what: 'Synthetic correction text.', why: 'Synthetic reason for the change.' });

describe('corrections log', () => {
  it('accepts entries appended in date order', () => {
    expect(CorrectionsLog.safeParse([entry('c-001', '2026-01-01'), entry('c-002', '2026-02-01')]).success).toBe(true);
  });
  it('rejects out-of-order dates and duplicate ids', () => {
    expect(CorrectionsLog.safeParse([entry('c-002', '2026-02-01'), entry('c-001', '2026-01-01')]).success).toBe(false);
    expect(CorrectionsLog.safeParse([entry('c-001', '2026-01-01'), entry('c-001', '2026-02-01')]).success).toBe(false);
  });
  it('the committed log is valid', () => {
    expect(CorrectionsLog.safeParse(JSON.parse(readFileSync('src/data/corrections.json', 'utf8'))).success).toBe(true);
  });
  it('is append-only against main: every entry on main is still present, unchanged, in order', () => {
    let base: string;
    try {
      base = execFileSync('git', ['show', 'origin/main:src/data/corrections.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return; // main has no log yet (or no git history in this checkout)
    }
    const before = JSON.parse(base) as unknown[];
    const now = JSON.parse(readFileSync('src/data/corrections.json', 'utf8')) as unknown[];
    expect(now.slice(0, before.length)).toEqual(before);
  });
});
