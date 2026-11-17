/** Phase 7 JSON-LD: built only from what the records state. SYNTHETIC records. */
import { describe, expect, it } from 'vitest';
import { correlationArticle, eventsDataset, jsonLd } from '../src/lib/structured-data';
import { correlation, event, evidentiary } from './helpers';

describe('structured data', () => {
  it('Dataset covers the events and names source publishers, with no invented licence', () => {
    const src = evidentiary();
    const d = eventsDataset([event()], new Map([[src.id, src]]));
    expect(d['@type']).toBe('Dataset');
    expect(d.size).toBe('1 event');
    expect(d.isBasedOn).toEqual([{ '@type': 'Organization', name: src.publisher }]);
    expect(d).not.toHaveProperty('license');
  });
  it('a correlation is labelled as interpretation', () => {
    expect(correlationArticle(correlation()).genre).toBe('Interpretation');
  });
  it('escapes < so content cannot close the script tag', () => {
    expect(jsonLd({ t: '</script><script>x()</script>' })).not.toContain('</script>');
  });
});
