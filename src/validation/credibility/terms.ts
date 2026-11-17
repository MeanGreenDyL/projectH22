/**
 * Term lists enforced by the credibility gate. Matching is whole-word and case-insensitive.
 * Changing a list is a credibility decision: it needs a test change and human review.
 */

/**
 * Spec §1 hard rule 3 lists "fulfilled", "proves", "confirms", "exactly as predicted".
 * The list also covers the other inflections of the same three verbs, so a record cannot
 * pass by writing "fulfillment" or "proof" instead.
 */
export const FORBIDDEN_CERTAINTY_TERMS: readonly string[] = [
  'fulfilled',
  'fulfill',
  'fulfil',
  'fulfills',
  'fulfils',
  'fulfilling',
  'fulfillment',
  'fulfilment',
  'proves',
  'prove',
  'proved',
  'proven',
  'proof',
  'confirms',
  'confirm',
  'confirmed',
  'confirmation',
  'exactly as predicted',
  'as predicted',
];

/**
 * Keeps the fact layer neutral (spec §1 Layer A, §4 "no interpretive language"). An event
 * summary that uses these words has crossed the seam into Layer B.
 */
export const FACT_LAYER_INTERPRETIVE_TERMS: readonly string[] = [
  'prophecy',
  'prophecies',
  'prophetic',
  'prophesied',
  'biblical',
  'scripture',
  'scriptural',
  'apocalypse',
  'apocalyptic',
  'end times',
  'end-times',
  'antichrist',
  'armageddon',
  'rapture',
  'tribulation',
  'divine judgment',
  'judgment of god',
  'sign of the times',
  'signs of the times',
  ...FORBIDDEN_CERTAINTY_TERMS.filter((t) => t.startsWith('fulfil')),
];

function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]+');
}

export function findTerms(text: string, terms: readonly string[]): string[] {
  const hits: string[] = [];
  for (const term of terms) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(text)) hits.push(term);
  }
  return hits;
}

export interface StringField {
  path: string;
  value: string;
}

/** Every string value in a record, with its path. Keys in `skip` are not descended into. */
export function collectStrings(value: unknown, skip: ReadonlySet<string> = new Set(), path = ''): StringField[] {
  if (typeof value === 'string') return [{ path: path || '(root)', value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, skip, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      skip.has(k) ? [] : collectStrings(v, skip, path ? `${path}.${k}` : k),
    );
  }
  return [];
}
