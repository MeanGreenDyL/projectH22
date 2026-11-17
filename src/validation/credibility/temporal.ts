/**
 * The no-dates bright line for /scenarios (spec §1): "No scenario may contain a date, a year,
 * a countdown, or a time window."
 *
 * Deliberately strict. The one exception (owner decision 2026-11-17): a scenario may declare
 * the passage's own figures ("1,260 days", "seventy weeks") in `textualFigures`, and those exact
 * strings are removed before scanning. A declared figure may never be a calendar year or date.
 *
 * Verse references like "13:18" or "9:24-27" are not dates and are not matched.
 */

const NUMBER_WORD =
  '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|(?:two|three|four|five|six|seven)?score|a\\s+few|several|many)';
const QUANTITY = `(?:\\d[\\d,]*|${NUMBER_WORD})(?:[\\s-]+(?:and[\\s-]+)?(?:a[\\s-]+half|${NUMBER_WORD}))*`;

const GREGORIAN_MONTHS =
  'January|February|April|June|July|August|September|October|November|December';
const HEBREW_MONTHS = 'Nisan|Abib|Iyar|Sivan|Tammuz|Elul|Tishri|Tishrei|Cheshvan|Heshvan|Kislev|Chislev|Tevet|Shevat|Sebat|Adar';

export interface TemporalPattern {
  name: string;
  pattern: RegExp;
}

export const TEMPORAL_PATTERNS: readonly TemporalPattern[] = [
  { name: 'four-digit year', pattern: /(?<!\d)[12]\d{3}s?(?!\d)/ },
  { name: 'decade', pattern: /(?:'|\b)\d0s\b/ },
  { name: 'era-suffixed year', pattern: /\b\d{1,4}\s*(?:A\.?D\.?|B\.?C\.?E?\.?|C\.?E\.?)(?![A-Za-z])/ },
  { name: 'era-prefixed year', pattern: /\bA\.?D\.?\s*\d{1,4}\b/ },
  { name: 'numeric date', pattern: /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/ },
  { name: 'month name', pattern: new RegExp(`\\b(?:${GREGORIAN_MONTHS}|${HEBREW_MONTHS})\\b`) },
  { name: 'month name with day', pattern: /\b(?:May|March)\s+\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:May|March)\b/ },
  {
    name: 'calendar unit',
    pattern: /\b(?:years?|months?|decades?|centur(?:y|ies)|generations?|millennium|millennia|annual(?:ly)?|anniversary|calendar)\b/i,
  },
  {
    name: 'duration',
    pattern: new RegExp(`\\b${QUANTITY}\\s+(?:days?|weeks?|hours?|evenings?)\\b`, 'i'),
  },
  { name: 'time, times and half a time', pattern: /\btimes?,?\s+(?:and\s+)?(?:half|the\s+dividing)\s+(?:a\s+|of\s+)?time\b/i },
  {
    name: 'relative window',
    pattern:
      /\b(?:within|in|over|during|before|by)\s+(?:the\s+)?(?:next|coming|following|few|several)\b|\bnext\s+(?:few|several)\b/i,
  },
  {
    name: 'imminence or countdown',
    pattern:
      /\b(?:countdown|count\s+down|deadline|imminent(?:ly)?|impending|any\s+day\s+now|in\s+our\s+lifetime|from\s+now|before\s+long|soon|shortly|near\s+future|at\s+hand|today|tomorrow|tonight|yesterday)\b/i,
  },
];

/** Patterns that denote a calendar position. A declared scripture figure may never match these. */
export const CALENDAR_PATTERN_NAMES: ReadonlySet<string> = new Set([
  'four-digit year',
  'decade',
  'era-suffixed year',
  'era-prefixed year',
  'numeric date',
  'month name with day',
]);

export function findTemporalReferences(text: string): { name: string; match: string }[] {
  const hits: { name: string; match: string }[] = [];
  for (const { name, pattern } of TEMPORAL_PATTERNS) {
    const m = pattern.exec(text);
    if (m) hits.push({ name, match: m[0] });
  }
  return hits;
}
