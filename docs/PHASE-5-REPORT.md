# Phase 5 — scenarios and methodology report

Phase 5 (spec §11): `/scenarios` with every structural rule from §1 enforced in code and verified
by test, and `/methodology` in full.

**Order note.** The spec says not to ship Phase 5 before Phase 4's taxonomy works. The taxonomy
UI (InterpretiveFrame, strength legend, correlation browser, counter-readings) was built in
Phase 3 and is working. Phase 4's *content* (canon-badge explanations and the first ~20 draft
correlations) is still blocked: the reference and commentary sites it must cite are not reachable
from this environment yet. Nothing was drafted from memory in the meantime.

## Delivered

| Item | Where | Notes |
| --- | --- | --- |
| `/methodology` | `src/pages/methodology/index.astro` | Claims and non-claims, the two layers, the strength ladder with worked examples (including weak ones), selection bias named plainly, why scenarios carry no dates, the four traditions, source tiers, corrections, how to challenge a record |
| Corrections log | `src/schemas/correction.ts`, `src/data/corrections.json` | Dated, ordered, unique ids; a test fails if an existing entry is edited or removed (append-only) |
| Challenge a record | `.github/ISSUE_TEMPLATE/challenge-a-record.yml` | Linked from `/methodology` |
| `/scenarios` and `/scenarios/<id>` | `src/pages/scenarios/` | Full-width banner on the route and on every card; empty state until a reviewer approves one |
| Radial scenario diagram | `src/components/interp/ScenarioRing.tsx` | Steps evenly spaced on a ring, numbered, arrows 1 → n; the centre reads "Order only, no time axis" |
| Scenario card | `src/components/interp/ScenarioView.tsx` | Throws outside `<InterpretiveFrame>`; canon badge per passage; the passage's own figures labelled and never converted to dates; objections with sources |
| Tests | `tests/scenarios.test.tsx`, `tests/e2e/site.spec.ts` | Ring geometry, no time axis, banner on every card, frame required, approved-only; a browser check scans every page under `/scenarios` for dates, years, countdowns and windows |

Results: 706 unit tests pass; 150 browser checks pass (axe WCAG 2.2 AA, no horizontal scroll,
60-word rule, baselines) across desktop-light, desktop-dark and mobile on 12 pages; `astro check`
0 errors; both gates 0 errors.

## Decisions and flags

1. **No scenarios are written yet.** A scenario needs cited scholarly objections, and the
   reference sites are unreachable here. The route, rules and diagram are ready for them.
2. **The ring is a sequence, not a cycle.** Arcs run from the first step to the last and do not
   close. A scenario that is cyclical in its tradition would need an explicit flag; none is
   added until one is needed.
3. **The index page shows an illustrative ring** (five unlabelled steps) so the page opens with a
   visual. It is captioned "An illustration, not a scenario."
4. **The history of dated predictions** on `/methodology` (spec §10 item 4) is noted as pending: it
   needs sourced reference works, so it waits with Phase 4 content.
5. **Footer links** now have 24px tap targets (the extra links made them wrap on mobile).
