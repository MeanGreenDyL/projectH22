/**
 * Scripture layer (spec §3). Public-domain text only, bundled as local JSON.
 *
 *   src/data/scripture/translations.json        Translation[] manifest
 *   src/data/scripture/<translation>/<CODE>.json one ScriptureBook per file
 */
import { z } from 'zod';
import { HttpUrl, IsoDate, NonBlank } from './common';

export const TRANSLATION_IDS = ['web', 'kjv', 'kjv1611', 'asv', 'bsb', 'dra'] as const;
export const TranslationId = z.enum(TRANSLATION_IDS);
export type TranslationId = z.infer<typeof TranslationId>;

/** Owner decision 2026-11-17 (docs/licensing.md §2): WEB by default, KJV as an opt-in. */
export const DEFAULT_TRANSLATION: TranslationId = 'web';

export const Translation = z.strictObject({
  id: TranslationId,
  name: NonBlank(),
  /** Licence status as published by the source, e.g. "Public domain". */
  license: NonBlank(),
  /** English (KJV-tradition) or Vulgate numbering. Verse-level alignment across schemes is not assumed. */
  versification: z.enum(['english', 'vulgate']),
  source: z.strictObject({
    url: HttpUrl,
    /** sha256 of the exact upstream file(s) the bundled JSON was built from. */
    sha256: z.array(z.string().regex(/^[0-9a-f]{64}$/)).min(1),
    retrievedAt: IsoDate,
  }),
  /** Book codes bundled for this translation (src/schemas/books.ts). */
  books: z.array(z.string()).min(1),
  verseCount: z.number().int().positive(),
  notes: z.array(NonBlank()).optional(),
});
export type Translation = z.infer<typeof Translation>;

/** A verse is [number, text]. */
export const Verse = z.tuple([z.number().int().min(1), NonBlank()]);

export const ScriptureChapter = z.strictObject({
  chapter: z.number().int().min(1),
  /** Canonical superscription (e.g. Psalm titles) where the translation prints it unnumbered. */
  title: NonBlank().optional(),
  verses: z.array(Verse).min(1),
});

export const ScriptureBook = z.strictObject({
  translation: TranslationId,
  code: z.string().regex(/^[0-9A-Z]{3}$/),
  name: NonBlank(),
  chapters: z.array(ScriptureChapter).min(1),
});
export type ScriptureBook = z.infer<typeof ScriptureBook>;
