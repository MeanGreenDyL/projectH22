import { describe, expect, it } from 'vitest';
import { kindOf } from '../src/lib/event-kind';

describe('event kinds', () => {
  it('maps feed id prefixes to families', () => {
    expect(['kev-cve-0000-0001', 'eo-99999', 'pl-119-1', 'pvtl-119-2', 'fr-rule-0000-1', 'os-tx-2026-hb-1', 'usgs-xx0000abcd', 'fema-dr-9901', 'hand-written'].map((id) => kindOf({ id })))
      .toEqual(['kev', 'eo', 'law', 'law', 'rule', 'state-law', 'quake', 'fema', undefined]);
  });
});
