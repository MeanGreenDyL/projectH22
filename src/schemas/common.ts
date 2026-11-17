import { z } from 'zod';

/** Stable, URL-safe record id. Doubles as the file name of the record. */
export const Slug = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');

/** Calendar date, YYYY-MM-DD. */
export const IsoDate = z.iso.date();

/** Timestamp with explicit offset or Z, e.g. 2026-11-17T05:39:18Z. */
export const IsoDateTime = z.iso.datetime({ offset: true });

export const HttpUrl = z.url({ protocol: /^https?$/ });

/** ISO 3166-1 alpha-2, upper case. Shape only for now; a membership check against the official list lands with Phase 2 ingestion. */
export const CountryCode = z.string().regex(/^[A-Z]{2}$/, 'must be an upper-case ISO 3166-1 alpha-2 code');

/** USPS codes for the 50 states, DC, and inhabited territories. */
export const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'GU', 'VI', 'AS', 'MP',
] as const;
export const UsStateCode = z.enum(US_STATE_CODES);

/** Non-empty after trimming. */
export const NonBlank = (min = 1) =>
  z
    .string()
    .trim()
    .min(min, `must contain at least ${min} non-whitespace characters`);
