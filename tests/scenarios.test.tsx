/**
 * /scenarios structure (spec §1 Prediction Module, §7 radial diagram). SYNTHETIC records only.
 * The records themselves are gated by the credibility rules; these tests cover what the page
 * renders from them: banner on every card, frame required, no time axis, no dates in output.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import InterpretiveFrame from '../src/components/interp/InterpretiveFrame';
import ScenarioRing from '../src/components/interp/ScenarioRing';
import ScenarioView from '../src/components/interp/ScenarioView';
import { isPublished } from '../src/lib/policy';
import { ringArcs, ringLayout, scenarioDisplayText, temporalHitsInPageText } from '../src/lib/scenario-layout';
import { SCENARIO_BANNER } from '../src/schemas';
import { scenario } from './helpers';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('ring layout', () => {
  it('spaces nodes evenly, clockwise from the top, whatever the step content', () => {
    const n = ringLayout(4, 100, 100, 50);
    expect(n.map((p) => [p.order, Math.round(p.x), Math.round(p.y)])).toEqual([[1, 100, 50], [2, 150, 100], [3, 100, 150], [4, 50, 100]]);
  });
  it('handles one step and none', () => {
    expect(ringLayout(1, 10, 10, 5)).toEqual([{ order: 1, x: 10, y: 5 }]);
    expect(ringLayout(0, 10, 10, 5)).toEqual([]);
  });
  it('draws n-1 arcs: a sequence, not a closed cycle', () => {
    expect(ringArcs(5, 100, 100, 50, 0.2)).toHaveLength(4);
    expect(ringArcs(1, 100, 100, 50, 0.2)).toEqual([]);
  });
});

describe('ScenarioRing', () => {
  it('has no time axis and says so', () => {
    const html = renderToStaticMarkup(<ScenarioRing steps={scenario().describedSequence} label="x" />);
    expect(html).toContain('Order only');
    expect(html).toContain('no time axis');
    expect(html).not.toMatch(/class="[^"]*axis/);
  });
  it('gives each ring its own arrow marker id', () => {
    const html = renderToStaticMarkup(<><ScenarioRing steps={scenario().describedSequence} label="a" /><ScenarioRing steps={scenario().describedSequence} label="b" /></>);
    const ids = [...html.matchAll(/<marker id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('ScenarioView', () => {
  it('refuses to render outside an InterpretiveFrame', () => {
    expect(() => renderToStaticMarkup(<ScenarioView scenario={scenario()} sources={{}} />)).toThrow(/InterpretiveFrame/);
  });
  it('carries the banner on every card', () => {
    const html = renderToStaticMarkup(
      <InterpretiveFrame><ScenarioView scenario={scenario()} sources={{}} linkToDetail /><ScenarioView scenario={scenario({ id: 'second' })} sources={{}} linkToDetail /></InterpretiveFrame>,
    );
    expect(html.split(SCENARIO_BANNER)).toHaveLength(3);
    expect(html).toContain('INTERPRETATION');
  });
  it('renders no date, year or time window; declared figures are labelled and exempt', () => {
    const s = scenario({
      passages: [{ book: 'Daniel', chapter: 12, verseStart: 11, canon: 'PROTESTANT-CANON' }],
      textualFigures: [{ passageIndex: 0, figure: '1,290 days' }],
    });
    const out = text(renderToStaticMarkup(<InterpretiveFrame><ScenarioView scenario={s} sources={{}} /></InterpretiveFrame>));
    expect(out).toContain("The passage's own figure");
    expect(temporalHitsInPageText(out, ['1,290 days'])).toEqual([]);
    expect(temporalHitsInPageText(out, []).map((h) => h.name)).toContain('duration');
  });
  it('lists every record string it displays for the scan', () => {
    const s = scenario({ canonNote: 'A canon note that is long enough.' });
    expect(scenarioDisplayText(s)).toEqual(expect.arrayContaining([s.title, s.whatThisDoesNotClaim, 'A canon note that is long enough.', ...s.describedSequence.map((d) => d.description)]));
  });
});

describe('publication', () => {
  it('only approved scenarios are published', () => {
    expect(isPublished(scenario())).toBe(false);
    expect(isPublished(scenario({ review: { status: 'approved', reviewedBy: 'Synthetic Reviewer', reviewedAt: '2026-11-01T00:00:00Z' } }))).toBe(true);
  });
});
