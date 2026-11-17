import { describe, expect, it } from 'vitest';
import { FEEDS, feedHealth, overallIndicator, type Feed, type FeedStatus } from '../src/lib/feeds';

const NOW = new Date('2026-11-17T12:00:00Z');
const feed: Feed = { id: 'x', name: 'X', publisher: 'P', license: 'L', produces: 'events', slaHours: 48, critical: true };
const status = (over: Partial<FeedStatus> = {}): FeedStatus => ({
  source: 'x', lastAttempt: '2026-11-17T00:00:00Z', lastSuccess: '2026-11-17T00:00:00Z', ok: true, eventsWritten: 1, eventsPending: 0, slaHours: 48, ...over,
});

describe('feed health', () => {
  it('classifies fresh, stale, failing and never-run', () => {
    expect(feedHealth(feed, status(), NOW)).toBe('fresh');
    expect(feedHealth(feed, status({ lastSuccess: '2026-11-14T00:00:00Z' }), NOW)).toBe('stale');
    expect(feedHealth(feed, status({ ok: false, error: 'boom' }), NOW)).toBe('failing');
    expect(feedHealth(feed, undefined, NOW)).toBe('never-run');
  });
  it('turns the header amber for a recent failure and red once a critical feed is past SLA without success', () => {
    const one = [feed];
    expect(overallIndicator(one, new Map([['x', status()]]), NOW)).toBe('green');
    expect(overallIndicator(one, new Map([['x', status({ ok: false })]]), NOW)).toBe('amber');
    expect(overallIndicator(one, new Map([['x', status({ ok: false, lastSuccess: '2026-11-01T00:00:00Z' })]]), NOW)).toBe('red');
    expect(overallIndicator(one, new Map(), NOW)).toBe('red');
  });
  it('ignores non-critical feeds for the header', () => {
    expect(overallIndicator([{ ...feed, critical: false }], new Map(), NOW)).toBe('green');
  });
  it('has unique feed ids', () => {
    expect(new Set(FEEDS.map((f) => f.id)).size).toBe(FEEDS.length);
  });
});
