/**
 * Screen for living persons, named current officials and specific companies in scenarios
 * (spec §1). This is a partial, pattern-based screen. It cannot know who is alive or which
 * proper noun is a company, so human review of every scenario remains mandatory.
 *
 * Biblical royal titles (King, Queen, Prince, Pharaoh) are not screened, since the passages use them.
 */
export const NAMED_ENTITY_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'titled official',
    pattern:
      /\b(?:President|Vice\s+President|Senator|Sen\.|Representative|Rep\.|Congressman|Congresswoman|Governor|Gov\.|Mayor|Prime\s+Minister|Chancellor|Secretary|Ambassador|Justice|Chief\s+Justice|General|Gen\.|Pope|Ayatollah|Premier|Chairman|Chairwoman|CEO)\s+[A-Z][a-z]+/,
  },
  {
    name: 'company suffix',
    pattern: /\b[A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*\s+(?:Inc\.?|Corp\.?|Corporation|LLC|L\.L\.C\.|Ltd\.?|PLC|plc|GmbH|S\.A\.|AG|N\.V\.|Holdings|& Co\.?)(?![A-Za-z])/,
  },
];

/** Explicit names to block. Kept empty in code; add entries only through a reviewed PR. */
export const NAMED_ENTITY_BLOCKLIST: readonly string[] = [];

export function findNamedEntities(text: string): { name: string; match: string }[] {
  const hits: { name: string; match: string }[] = [];
  for (const { name, pattern } of NAMED_ENTITY_PATTERNS) {
    const m = pattern.exec(text);
    if (m) hits.push({ name, match: m[0] });
  }
  for (const entry of NAMED_ENTITY_BLOCKLIST) {
    if (text.toLowerCase().includes(entry.toLowerCase())) hits.push({ name: 'blocklist', match: entry });
  }
  return hits;
}
