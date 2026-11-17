/**
 * Spec §1: every Layer B rendering is wrapped in <InterpretiveFrame>. Enforced twice:
 * at render time (CorrelationView throws outside a frame, so the static build fails), and by
 * a source scan that every file rendering interpretation fields imports the frame.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CorrelationBrowser from '../src/components/interp/CorrelationBrowser';
import CorrelationView from '../src/components/interp/CorrelationView';
import InterpretiveFrame from '../src/components/interp/InterpretiveFrame';
import { correlation } from './helpers';

const approved = { status: 'approved', reviewedBy: 'Synthetic Reviewer', reviewedAt: '2026-11-01T00:00:00Z' } as const;
const events = [{ id: 'test-event', title: 'Synthetic event', date: '2026-01-01' }];

describe('InterpretiveFrame', () => {
  it('refuses to render a correlation outside a frame', () => {
    expect(() => renderToStaticMarkup(<CorrelationView correlation={correlation()} events={events} sources={{}} />)).toThrow(/InterpretiveFrame/);
  });
  it('renders the INTERPRETATION chip, the reading and a one-click counter-reading', () => {
    const html = renderToStaticMarkup(
      <InterpretiveFrame><CorrelationView correlation={correlation()} events={events} sources={{}} /></InterpretiveFrame>,
    );
    expect(html).toContain('INTERPRETATION');
    expect(html).toContain('data-layer="interpretation"');
    expect(html).toMatch(/<details[^>]*>.*The case against this reading/);
    expect(html).not.toMatch(/<details[^>]*open/);
  });
});

describe('correlation browser defaults', () => {
  it('hides numerical-symbolic and speculative readings until the reader opts in', () => {
    const items = [
      { correlation: correlation({ id: 'a', review: approved } as never), events, domains: ['cyber'] },
      { correlation: correlation({ id: 'b', review: approved, strength: 'speculative', proposedReading: 'Could this synthetic pattern be read this way?' } as never), events, domains: ['cyber'] },
    ];
    const html = renderToStaticMarkup(<CorrelationBrowser items={items} sources={{}} domainLabels={{ cyber: 'Cyber' }} />);
    expect(html.replace(/<!-- -->/g, '')).toContain('Showing 1 of 2 published');
    expect(html).not.toContain('Could this synthetic pattern');
  });
});

describe('source scan', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  it('every page or component that renders interpretation fields imports InterpretiveFrame', () => {
    const offenders = walk('src')
      .filter((f) => /\.(astro|tsx|jsx)$/.test(f))
      .filter((f) => !f.endsWith('InterpretiveFrame.tsx'))
      .filter((f) => /\b(proposedReading|counterReading)\b/.test(readFileSync(f, 'utf8')))
      .filter((f) => !/useInterpretiveFrame|InterpretiveFrame/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
