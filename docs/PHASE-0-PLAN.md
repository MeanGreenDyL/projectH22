# Phase 0 — plan, deliverables and spec flags

Phase 0 gate (spec §11): **show the plan and the scaffolding; do not start Phase 1 until the owner
approves.** This file is that report.

## 1. What Phase 0 delivered

| Spec item | Where | Notes |
| --- | --- | --- |
| Repo init, stack | `package.json`, `astro.config.mjs`, `tsconfig.json` | Astro 7 static + React, TypeScript strictest, Zod 4, Tailwind v4, Vitest. See flag F1. |
| Tailwind theme tokens | `src/styles/tokens.css` | Light + dark, neutral chrome, one accent, seven validated domain hues, interpretation tint (slate, never red/gold), status colors, type and motion tokens. Unused until Phase 3. |
| All Zod schemas | `src/schemas/` | `Source` (evidentiary / interpretive), `VerifiedEvent`, `ScripturalCorrelation`, `Scenario`, `PassageRef`, `Review`, enums, book → canon registry. |
| Source registry structure | `src/data/sources.json` | Empty array. Every citation references an id from it. |
| Astro content collections | `src/content.config.ts` | Uses the same schemas, so the site cannot load a record of the wrong shape. |
| `validate` gate | `scripts/validate.ts`, `src/validation/schema-gate.ts` | Zod, id = file name, domain folder, duplicates, referential integrity. |
| `validate:credibility` gate | `scripts/validate-credibility.ts`, `src/validation/credibility/` | 20 rule codes: tiers, archives, disputes, fact-layer neutrality, certainty terms, counterReading, direct-textual / typological support, canon badges, no-dates, named-entity screen, canon note. |
| Tests written first | `tests/` | 148 tests. Committed before the gate implementation (see git history). Includes a mutation check: removing one forbidden term fails the suite. |
| Display policy | `src/lib/policy.ts` | Approved-only publishing; `numerical-symbolic` and `speculative` hidden by default and excluded from summaries; SINGLE-SOURCE marker. |
| `CLAUDE.md` | repo root | Cold-start conventions. |
| `/docs/AGENT-REFRESH.md` | `docs/` | Paths, naming, write permissions, every rule code, the PR gate. |
| `/docs/licensing.md` | `docs/` | Translation table, KJV Crown Copyright position (decision pending). |
| CI | `.github/workflows/ci.yml` | check, test, validate, validate:credibility on every PR. |
| Human-review routing | `.github/CODEOWNERS` | Correlations, scenarios, schemas, validators → owner. |

No UI, no content, no scripture text. The guardrails exist before anything can violate them.

## 2. Spec flags — decisions for the owner

The spec asks for anything unsound, contradictory or mistaken to be flagged before it is built on.
Each flag lists what was implemented as the default. All defaults are one-line changes.

**F1. Astro 5 → Astro 7 (deviation).** Astro 5's last release was 5.18.2 in May 2026; Astro 7.4 is
current and maintained, and uses Zod 4 natively, which the schemas also use. Nothing in Phase 0
depends on Astro-specific APIs beyond content collections. *Default: Astro 7.* Revert is a
dependency change.

**F2. `direct-textual` requires two Tier 1 citations — but scholarly agreement is Tier 2.**
Tier 1 is government records, raw data, manuscripts and critical editions. "Mainstream scholarship
agrees on the referent" is evidenced by peer-reviewed work (Tier 2). As written, a direct-textual
record needs two critical editions or manuscripts that "support" a referent, which is an odd test.
*Default: implemented literally (Tier 1 only).* *Recommendation: Tier 1 or Tier 2.*
(`DIRECT_TEXTUAL_SUPPORT_TIERS` in `src/validation/credibility/index.ts`.)

**F3. Every event needs a Tier 1/2 source (§1) — so the SINGLE-SOURCE marker (§5 rule 1) can never
fire.** §5 says events sourced only from Tier 4/5 get a visible marker; §1 forbids such events from
existing. *Default: strict §1 rule; the marker helper exists but is unreachable.* Alternative: allow
Tier 3–5-only events, with the marker, as a lower-confidence class.

**F4. An archived citation on every event (§1).** Implemented as "at least one of the event's
sources has an `archiveUrl`". Phase 2 targets 300+ events; if each cites a per-record page (one NVD
page per CVE), each needs a Wayback snapshot, and the Wayback save API is slow and rate-limited.
Shared sources (one CISA KEV catalog snapshot per refresh) keep this cheap. *Default: error.*
Flagging the cost so it is a known Phase 2 workload, not a surprise.

**F5. Seven domains, four domain routes, "four to five" domain colors.** The enum has seven domains
(cyber, crypto, us-law, geopolitical, economic, infrastructure, natural); §7 has four
`/domains/*` routes; §8 asks for four to five hues. *Default: seven hues, from the validated
reference palette, colorblind-checked in both themes for adjacent pairs.* Needs a decision: which
domains roll up into `/domains/global` (proposed: geopolitical, economic, natural) and where
`infrastructure` lives. Charts that put more than three domains in one unordered view (scatter,
map) need labels or faceting regardless.

**F6. `usImpact` / `globalContext` are optional in §4 but "every event carries both" in §7.**
*Default: warning (`EVT-LENS`), not error,* so ingested events with no honest US angle are not
forced to invent one. Can be promoted to an error.

**F7. The no-dates rule vs. the passages' own numbers.** Daniel and Revelation state durations
("1,260 days", "seventy weeks", "a thousand years", "time, times and half a time"), and Matthew 24
says "this generation". The strict regex blocks all of these in authored scenario prose, as well as
words like "year", "generation" and "soon". Preterist scenarios also cannot name a year, such as the
fall of Jerusalem in AD 70; they have to describe the event instead. The verse text itself comes
from the scripture layer and is not scanned. *Default: strict.* Alternative: a narrowly-scoped
`textualFigures` field that quotes the passage's own number, labelled "the text's figure, not a
calendar window". 52 test cases pin the current behavior.

**F8. Certainty terms broadened.** The spec lists "fulfilled", "proves", "confirms", "exactly as
predicted". The list also blocks other forms of the same verbs ("fulfillment", "fulfilment",
"proof", "proven", "confirmed", "as predicted"), so the rule cannot be dodged. Cost: honest negations
like "this proves nothing" also fail and must be reworded. Bibliographic `citation` strings are
exempt, because changing a real title would be fabrication. *Default: broad list.*

**F9. Canon placement of 1 Enoch and Jubilees.** The spec puts them in `APOCRYPHA-WIDER`. They are
usually classed as pseudepigrapha, but they are canonical in the Ethiopian Orthodox Tewahedo Church,
so the spec's `PSEUDEPIGRAPHA` definition ("non-canonical in all major traditions") would not fit
them either. *Default: the spec's placement*, and the badge copy should mention Ethiopian reception.
Also: no translation in the spec's table covers 1 Enoch or Jubilees (proposed: R. H. Charles, public
domain in the US). Added `Letter of Jeremiah` to the deuterocanon (Baruch 6 in Catholic Bibles).

**F10. KJV / UK Crown Copyright.** Decision pending in `docs/licensing.md` §2. *Proposed:* WEB as
the default display text, with KJV as an opt-in.

**F11. Theological sources "tiered separately" (§5 rule 5), but the `Source` schema has one tier
enum.** *Implemented:* a `kind` discriminator. Evidentiary sources keep tiers 1–5. Interpretive
sources have their own class (commentary, theological scholarship, reference work, lexicon) plus a
tradition and a composition date. The gate rejects any interpretive source cited as evidence for an
event.

**F12. "Agent may draft, never publish" needs a GitHub setting.** The schema adds
`review.status` (draft / approved, with a named reviewer), only approved records render, and
CODEOWNERS routes the paths to the owner. Real enforcement needs **branch protection on `main`**
that requires code-owner review. That is an owner action in GitHub settings.

**F13. Smaller notes.**
- §5 Tier 3 lists APTA, the Foundation for Physical Therapy Research, Rochester and Howard. These
  look carried over from another project. They are harmless and not encoded anywhere.
- The "no living person / company" rule for scenarios can only be partly checked by patterns
  (titled officials, corporate suffixes). Human review remains the real gate.
- The `frontend-design` skill named in §8/§13 is not available in this environment. The palette
  was built and checked with the `dataviz` skill and its validator. Visual direction is Phase 3
  work.
- `date.start` for month / quarter / year precision is the first day of the period. Approximate
  dates must give an `end`.

## 3. Phase 1 plan (scripture layer) — not started

1. Resolve F9 and F10 first (canon placement, default display translation).
2. Licence-check each candidate dataset (data-file licence, not just text status) and record it in
   `docs/licensing.md`.
3. Write tests first: expected book count per canon set, chapter count per book, verse count
   checks for selected books, and Apocrypha completeness per translation (a known weak point).
4. Schemas: `ScriptureVerse`, `Translation`, `CrossReference`, `StrongsEntry`. Book registry gains
   chapter counts, aliases and per-tradition ordering (Protestant / Catholic / Orthodox).
5. Ingest scripts (`scripts/scripture/*`) that turn upstream files into
   `src/data/scripture/<translation>/<book>.json`, with a source and checksum recorded for each.
6. Cross-reference graph from the Treasury of Scripture Knowledge; Strong's numbers where the
   source text carries them.
7. Pagefind index and a minimal `/scripture` route (search, canon filter). Phase 1 needs a little
   UI before the Phase 3 visual system exists, so it will use the tokens with deliberately plain
   layout.
8. Canon-badge explainer copy, written from cited reference works. Never invented.
