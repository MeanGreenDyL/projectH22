# Project H 2:2 — conventions for agent sessions

Research-grade, visual-first site documenting real events (cyber, crypto, US law, geopolitics) and
**proposed, explicitly-labelled** correlations with scripture (including the Apocrypha). The full
spec is `PROJECT-H22-BUILD-PROMPT.md`; this file is the short version. Refresh/ingest work: read
`docs/AGENT-REFRESH.md`. Open decisions and spec flags: `docs/PHASE-0-PLAN.md`.

## Current phase

Phase 0 (scaffold & contracts) is done and awaiting owner approval. **Do not start a later phase
without the owner's explicit go-ahead.** Phases are gated (spec §11).

## The rule that outranks every other rule

Fact and interpretation are separate data models, types, validators and visual treatments.

- **Layer A — `VerifiedEvent`** (`src/schemas/event.ts`): observable facts. Needs a Tier 1/2
  source, a bounded date, an archived citation, `lastVerified`. Neutral language only: scriptural
  or prophetic vocabulary in an event fails the build.
- **Layer B — `ScripturalCorrelation`** (`src/schemas/correlation.ts`): always
  `isInterpretation: true`, always a non-empty `counterReading` (≥ 80 chars), a declared
  `strength`, at least one `hermeneuticTradition`. Never uses certainty language
  (`FORBIDDEN_CERTAINTY_TERMS` in `src/validation/credibility/terms.ts`).
- **Scenarios** (`src/schemas/scenario.ts`, route `/scenarios`): derived from scripture text only.
  Title begins "If …". **No dates, years, durations, countdowns or time windows** — regex-enforced
  (`src/validation/credibility/temporal.ts`). No living people, officials or companies.
- When a credibility rule and a feature conflict, the credibility rule wins.

## Never

- Never fabricate a data point, citation, statistic, quotation or scholarly source. If a value is
  unknown, leave the field empty; the UI will say "not available".
- Never set `review.status: approved` on a correlation or scenario. Agents draft; humans publish.
- Never cite a bare URL. Add the source to `src/data/sources.json` and cite its id.
- Never use an interpretive source (commentary, theology, reference work, lexicon) as evidence
  for a fact.
- Never bundle copyrighted Bible translations (NIV, ESV, NASB, NKJV, NLT …). See `docs/licensing.md`.
- Never loosen a validator, term list or regex without a test change and a human-reviewed PR.

## Commands

```
pnpm install
pnpm test                   # vitest: schemas, gates, policy, CLI
pnpm validate               # Zod + ids + referential integrity; exit 1 on error
pnpm validate:credibility   # tiers, certainty terms, counterReading, no-dates, canon; exit 1 on error
pnpm gate                   # all three
pnpm check                  # astro check + tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs all of these on every PR.

## Layout

```
src/schemas/            Zod schemas = the data contract (types are inferred, never hand-written)
src/validation/         schema gate, credibility gate (rules have stable codes), loader
src/lib/policy.ts       display policy: published / default-visible / summary-eligible / SINGLE-SOURCE
src/data/sources.json   the source registry (single array)
src/data/events/<domain>/<id>.json
src/data/correlations/<id>.yaml
src/data/scenarios/<id>.yaml
src/data/ingested/<source-id>/   raw feed snapshots (Phase 2)
src/styles/tokens.css   theme tokens (Tailwind v4 @theme), light + dark
scripts/                CLI entry points for the gates
tests/                  tests; tests/helpers.ts holds SYNTHETIC records only — never copy into src/data
```

## Stack

Astro 7 (static) + React islands, TypeScript strict, Zod 4, Tailwind v4, Vitest. Node ≥ 22.23.4,
pnpm 10. Later phases add D3 + Recharts, MapLibre + Natural Earth, Pagefind, Playwright.

## Working style

- Write the validator (and its test) before the content it validates.
- Small, reviewable commits. Data changes go through PRs.
- Read the `dataviz` skill before chart code or chart colors.
- Prefer fewer, better records. Thin content in a polished shell is the main failure mode.
