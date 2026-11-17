/**
 * `pnpm validate:credibility` — the rules that make epistemic honesty a structural property
 * of the codebase (spec §1, §5). Runs only on records that passed the schema gate.
 *
 * Every rule has a stable code. docs/AGENT-REFRESH.md lists them all.
 */
import {
  ARCHIVE_REQUIRED_TIERS,
  COUNTER_READING_MIN_CHARS,
  FACT_LAYER_QUALIFYING_TIERS,
  canonOf,
  formatPassage,
  type PassageRef,
  type Source,
} from '../../schemas';
import type { GateContext, Issue, ParsedDataset } from '../types';
import { findNamedEntities } from './named-entities';
import { CALENDAR_PATTERN_NAMES, findTemporalReferences } from './temporal';
import {
  FACT_LAYER_INTERPRETIVE_TERMS,
  FORBIDDEN_CERTAINTY_TERMS,
  collectStrings,
  findTerms,
} from './terms';

/** Bibliographic strings are quoted exactly as published and are not scanned for certainty terms. */
const BIBLIOGRAPHIC_KEYS = new Set(['citation']);
/** Structured fields that are not prose: ids, enums, passage refs, review metadata. */
const NON_PROSE_KEYS = new Set(['id', 'eventIds', 'sourceId', 'passages', 'review', 'strength', 'hermeneuticTradition', 'tradition', 'position']);

/**
 * Direct-textual support must come from these tiers. Spec §1 says "two Tier 1 citations"; the
 * owner widened it to Tier 1 or 2 on 2026-11-17 (scholarly agreement lives in peer-reviewed work).
 */
export const DIRECT_TEXTUAL_SUPPORT_TIERS: readonly string[] = ['1-primary', '2-peer-reviewed'];
export const DIRECT_TEXTUAL_MIN_SUPPORTS = 2;

type Push = (issue: Omit<Issue, 'severity'> & { severity?: Issue['severity'] }) => void;

function checkPassages(passages: PassageRef[], file: string, recordId: string, push: Push) {
  for (const p of passages) {
    const expected = canonOf(p.book);
    if (expected === undefined) {
      push({ rule: 'PASSAGE-UNKNOWN-BOOK', file, recordId, message: `"${p.book}" is not in the book registry (src/schemas/books.ts)` });
    } else if (expected !== p.canon) {
      push({ rule: 'PASSAGE-CANON', file, recordId, message: `${formatPassage(p)} is ${expected}, not ${p.canon}` });
    }
  }
}

export function runCredibilityGate(data: ParsedDataset, ctx: GateContext): Issue[] {
  const issues: Issue[] = [];
  const push: Push = (i) => issues.push({ severity: 'error', ...i });
  const sources = new Map<string, Source>(data.sources.map((s) => [s.record.id, s.record]));

  // ---------- Source registry ----------
  for (const { file, record: s } of data.sources) {
    if (s.kind === 'evidentiary' && ARCHIVE_REQUIRED_TIERS.includes(s.tier) && s.archiveUrl === undefined) {
      push({ rule: 'SRC-ARCHIVE-TIER45', file, recordId: s.id, message: `Tier ${s.tier} sources must carry an archiveUrl` });
    }
  }

  // ---------- Layer A: VerifiedEvent ----------
  for (const { file, record: e } of data.events) {
    const cited = e.sources.map((id) => sources.get(id)).filter((s): s is Source => s !== undefined);

    const interpretive = cited.filter((s) => s.kind === 'interpretive');
    if (interpretive.length > 0) {
      push({
        rule: 'EVT-INTERPRETIVE-SOURCE',
        file,
        recordId: e.id,
        message: `interpretive sources can never be evidence for a fact: ${interpretive.map((s) => s.id).join(', ')}`,
      });
    }
    if (!cited.some((s) => s.kind === 'evidentiary' && FACT_LAYER_QUALIFYING_TIERS.includes(s.tier))) {
      push({ rule: 'EVT-QUALIFYING-TIER', file, recordId: e.id, message: 'a VerifiedEvent needs at least one Tier 1–4 source; Tier 5 specialist press is never the sole source' });
    }
    if (!cited.some((s) => s.archiveUrl !== undefined)) {
      push({ rule: 'EVT-ARCHIVE', file, recordId: e.id, message: 'at least one cited source must have an archiveUrl' });
    }
    e.metrics.forEach((m, i) => {
      if (!e.sources.includes(m.sourceId)) {
        push({ rule: 'EVT-METRIC-SOURCE-CITED', file, recordId: e.id, message: `metrics.${i} ("${m.label}") cites "${m.sourceId}", which is not in the event's sources` });
      }
    });
    e.sourcePositions?.forEach((p, i) => {
      if (!e.sources.includes(p.sourceId)) {
        push({ rule: 'EVT-POSITIONS-CITED', file, recordId: e.id, message: `sourcePositions.${i} cites "${p.sourceId}", which is not in the event's sources` });
      }
    });
    if (e.confidence === 'disputed') {
      const positions = new Set(e.sourcePositions?.map((p) => p.position));
      if (!positions.has('affirms') || !positions.has('contests')) {
        push({ rule: 'EVT-DISPUTED-BOTH-SIDES', file, recordId: e.id, message: 'disputed events must cite at least one affirming and one contesting source in sourcePositions' });
      }
    }
    for (const field of collectStrings({ title: e.title, summary: e.summary, usImpact: e.usImpact, globalContext: e.globalContext, metrics: e.metrics.map((m) => m.label) })) {
      const hits = findTerms(field.value, FACT_LAYER_INTERPRETIVE_TERMS);
      if (hits.length > 0) {
        push({ rule: 'EVT-INTERPRETIVE-LANGUAGE', file, recordId: e.id, message: `${field.path} uses interpretive language (${hits.join(', ')}); the fact layer must stay neutral` });
      }
    }
    if (e.usImpact === undefined || e.globalContext === undefined) {
      push({ rule: 'EVT-LENS', severity: 'warning', file, recordId: e.id, message: 'usImpact and globalContext should both be present (spec §7)' });
    }
    if (Date.parse(e.lastVerified) > ctx.now.getTime()) {
      push({ rule: 'EVT-LAST-VERIFIED-FUTURE', file, recordId: e.id, message: `lastVerified ${e.lastVerified} is in the future` });
    }
  }

  // ---------- Series ----------
  for (const { file, record: s } of data.series) {
    const src = sources.get(s.sourceId);
    if (src && !(src.kind === 'evidentiary' && FACT_LAYER_QUALIFYING_TIERS.includes(src.tier))) {
      push({ rule: 'SER-SOURCE', file, recordId: s.id, message: `series must cite a Tier 1–4 evidentiary source; "${s.sourceId}" is not` });
    }
  }

  // ---------- Layer B: ScripturalCorrelation ----------
  for (const { file, record: c } of data.correlations) {
    if (typeof c.counterReading !== 'string' || c.counterReading.trim().length < COUNTER_READING_MIN_CHARS) {
      push({ rule: 'COR-COUNTER-READING', file, recordId: c.id, message: `counterReading is required and must have at least ${COUNTER_READING_MIN_CHARS} non-whitespace characters` });
    }
    for (const field of collectStrings(c, new Set([...BIBLIOGRAPHIC_KEYS, ...NON_PROSE_KEYS]))) {
      const hits = findTerms(field.value, FORBIDDEN_CERTAINTY_TERMS);
      if (hits.length > 0) {
        push({ rule: 'COR-CERTAINTY-TERMS', file, recordId: c.id, message: `${field.path} uses forbidden certainty language: ${hits.join(', ')}` });
      }
    }
    if (c.strength === 'direct-textual') {
      const qualifying = c.scholarlySupport.filter((s) => {
        const src = sources.get(s.sourceId);
        return s.position === 'supports' && src?.kind === 'evidentiary' && DIRECT_TEXTUAL_SUPPORT_TIERS.includes(src.tier);
      });
      if (new Set(qualifying.map((s) => s.sourceId)).size < DIRECT_TEXTUAL_MIN_SUPPORTS) {
        push({ rule: 'COR-DIRECT-TEXTUAL-SUPPORT', file, recordId: c.id, message: `direct-textual needs at least ${DIRECT_TEXTUAL_MIN_SUPPORTS} distinct supporting Tier 1 citations` });
      }
    }
    if (c.strength === 'typological') {
      const commentator = c.scholarlySupport.some((s) => {
        const src = sources.get(s.sourceId);
        return s.position === 'supports' && src?.kind === 'interpretive' && (src.interpretiveClass === 'commentary' || src.interpretiveClass === 'theological-scholarship');
      });
      if (!commentator) {
        push({ rule: 'COR-TYPOLOGICAL-COMMENTATOR', file, recordId: c.id, message: 'typological correlations must cite a named commentator (an interpretive source) that supports the reading' });
      }
    }
    checkPassages(c.passages, file, c.id, push);
  }

  // ---------- Scenarios ----------
  for (const { file, record: s } of data.scenarios) {
    // Owner decision 2026-11-17: the passage's own figures are allowed when declared in textualFigures.
    const figures = (s.textualFigures ?? []).map((f) => f.figure);
    for (const f of s.textualFigures ?? []) {
      const hits = findTemporalReferences(f.figure).filter((h) => CALENDAR_PATTERN_NAMES.has(h.name));
      if (hits.length > 0) {
        push({ rule: 'SCN-TEXTUAL-FIGURE', file, recordId: s.id, message: `textualFigures "${f.figure}" is a calendar date or year (${hits[0]!.name}); only the passage's own figures may be declared` });
      }
    }
    for (const field of collectStrings(s, new Set([...NON_PROSE_KEYS, 'textualFigures']))) {
      const scanned = figures.reduce((text, fig) => text.split(fig).join(' '), field.value);
      for (const hit of findTemporalReferences(scanned)) {
        push({ rule: 'SCN-NO-DATES', file, recordId: s.id, message: `${field.path} contains a ${hit.name} ("${hit.match}"); scenarios may not contain dates, years, countdowns or time windows` });
      }
      const terms = findTerms(field.value, FORBIDDEN_CERTAINTY_TERMS);
      if (terms.length > 0) {
        push({ rule: 'SCN-CERTAINTY-TERMS', file, recordId: s.id, message: `${field.path} uses forbidden certainty language: ${terms.join(', ')}` });
      }
      for (const hit of findNamedEntities(field.value)) {
        push({ rule: 'SCN-NAMED-ENTITY', file, recordId: s.id, message: `${field.path} appears to name a ${hit.name} ("${hit.match}"); scenarios may not reference living people, current officials or companies` });
      }
    }
    if (s.passages.some((p) => p.canon !== 'PROTESTANT-CANON') && s.canonNote === undefined) {
      push({ rule: 'SCN-CANON-NOTE', file, recordId: s.id, message: 'scenarios using books outside the Protestant canon need a canonNote explaining that not all traditions receive them' });
    }
    checkPassages(s.passages, file, s.id, push);
  }

  return issues;
}
