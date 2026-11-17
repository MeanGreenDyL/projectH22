/**
 * The no-dates bright line for /scenarios (spec §1). These cases are the contract: if you
 * loosen a pattern, a case here must change, and that change is reviewable.
 */
import { describe, expect, it } from 'vitest';
import { findTemporalReferences } from '../src/validation/credibility/temporal';

const blocked = [
  // years and eras
  'This would happen in 2031.',
  'between 2027 and 2030',
  'the 1990s',
  "the '90s",
  'the year 70 AD',
  'AD 70',
  'in 586 BC',
  '539 B.C.',
  '33 CE',
  '722 BCE',
  'the 21st century',
  // calendar dates
  '2027-04-01',
  '4/1/2027',
  '12.25.2030',
  'March 3',
  'on 14 Nisan', // Hebrew calendar date
  '3rd of October',
  'September',
  'Tishri',
  'by Passover next year',
  // windows, countdowns, durations
  'within 7 years',
  'in the next decade',
  'within a generation',
  'this generation',
  'over the next few years',
  'a countdown to',
  'imminent',
  'any day now',
  'in our lifetime',
  'years from now',
  'before long',
  '1,260 days',
  'seventy weeks',
  'a thousand two hundred and threescore days',
  'fourscore days',
  'forty-two months',
  'a thousand years',
  'three and a half years',
  'the 2300 evenings and mornings',
  'the year of jubilee falls',
  'the next few weeks',
  'the end of this decade',
  'by the year',
];

const allowed = [
  'If the idealist reading of Proverbs 11:1 is applied, the described sequence would be a moral pattern.',
  'Revelation 13:18 is cited; see verse 18.',
  'A trusted measure is falsified.',
  'The passage describes a sequence in three parts.',
  'Step 2 follows step 1 in the text, without any time axis.',
  'The kingdom may be divided.', // "may" as a verb
  'The armies march to the valley.', // "march" as a verb
  'The first beast and the second beast.',
  'Chapter 9 and chapter 12 are read together.',
  'The text names seven churches and twelve tribes.', // counts, not durations
  'The described sequence would be a moral pattern rather than an event.',
  'Daniel 9:24-27 is the passage.',
];

describe('findTemporalReferences', () => {
  it.each(blocked)('blocks %j', (text) => {
    expect(findTemporalReferences(text).length).toBeGreaterThan(0);
  });
  it.each(allowed)('allows %j', (text) => {
    expect(findTemporalReferences(text)).toEqual([]);
  });
});
