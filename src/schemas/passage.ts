import { z } from 'zod';
import { NonBlank } from './common';
import { Canon } from './enums';

/** A scripture reference. Every rendering of one carries its canon badge (spec §1). */
export const PassageRef = z
  .strictObject({
    book: NonBlank(),
    chapter: z.number().int().min(1),
    verseStart: z.number().int().min(1),
    verseEnd: z.number().int().min(1).optional(),
    canon: Canon,
  })
  .refine((p) => p.verseEnd === undefined || p.verseEnd >= p.verseStart, {
    message: 'verseEnd must not be earlier than verseStart',
    path: ['verseEnd'],
  });
export type PassageRef = z.infer<typeof PassageRef>;

export function formatPassage(p: PassageRef): string {
  const verses = p.verseEnd !== undefined && p.verseEnd !== p.verseStart ? `${p.verseStart}–${p.verseEnd}` : `${p.verseStart}`;
  return `${p.book} ${p.chapter}:${verses}`;
}
