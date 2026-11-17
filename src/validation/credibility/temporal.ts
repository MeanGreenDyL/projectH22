/**
 * The no-dates bright line for /scenarios (spec §1): "No scenario may contain a date, a year,
 * a countdown, or a time window."
 *
 * Deliberately strict. It blocks the passages' own durations too ("1,260 days", "a thousand
 * years", "seventy weeks"), because in authored scenario prose those read as time windows.
 * The scripture text itself is rendered from the scripture layer and is not scanned. See
 * docs/PHASE-0-PLAN.md for this trade-off.
 *
 * Verse references like "13:18" or "9:24-27" are not dates and are not matched.
 */

const NUMBER_WORD =
  '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|a\\s+few|several|many)';
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

export function findTemporalReferences(text: string): { name: string; match: string }[] {
  const hits: { name: string; match: string }[] = [];
  for (const { name, pattern } of TEMPORAL_PATTERNS) {
    const m = pattern.exec(text);
    if (m) hits.push({ name, match: m[0] });
  }
  return hits;
}
