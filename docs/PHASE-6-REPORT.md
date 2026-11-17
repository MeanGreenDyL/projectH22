# Phase 6 — preparedness (interim report)

Phase 6 (spec §9). **Status: the structure is built; the guidance content is not.** Every piece of
preparedness guidance must quote an official or professional source, and none of those sites
(ready.gov, epa.gov, fsis.usda.gov, cdc.gov, eia.gov, redcross.org, nist.gov, nfpa.org) is
reachable from this environment yet. Nothing was written from memory.

## Delivered

| Item | Where | Notes |
| --- | --- | --- |
| `Guidance` record | `src/schemas/guidance.ts`, `src/data/guidance/` | Topic, plain-language statement, the source's verbatim quote, source id, locator, hazard flag, stages, optional calculator quantity |
| Credibility rules | `src/validation/credibility/index.ts`, `terms.ts` | `GUI-SOURCE` (Tier 1 official or Tier 3 professional body only), `GUI-ARCHIVE`, `GUI-SAFETY-TERMS` (dosing, weapons/tactical and dread wording fail the build), `GUI-HAZARD-FIRST` (CO, generator and heating topics need a hazard statement), `GUI-QUANTITY-DUPLICATE` |
| Supply calculator | `src/lib/supply-calc.ts`, `src/components/prep/SupplyCalculator.tsx` | People × days × cited figure, with the working shown; hot-climate figure replaces the base only when cited; "not available" with no number otherwise; print and plain-text download |
| `/preparedness` | `src/pages/preparedness/index.astro` | Stage rail (2 hours → 30 days, evenly spaced, not a time scale), community resources box (911, 211, local emergency management) before anything else, carbon monoxide section before any instructions, stages, topics |
| `/preparedness/print` | `src/pages/preparedness/print.astro`, print CSS in `tokens.css` | Black on white in either theme, chrome hidden, bordered tables |
| Tests | `tests/preparedness.test.ts`, e2e | 19 unit tests; axe, scroll, 60-word and baselines on both pages |

## Not built yet

1. **All guidance content** (water, EPA disinfection ratios, USDA FSIS food thresholds, CDC carbon
   monoxide, NFPA generator placement, Red Cross first-aid referral). Waits on the sites above.
2. **Illustrated how-to diagrams** (disinfection decision tree, food-safety timelines, generator
   placement, gas shutoff). Each diagram's numbers must come from cited records, so they follow
   the content.
3. **Outage statistics dashboard** (EIA/DOE). Needs a new feed from eia.gov, which is unreachable.
4. **A link for local emergency management.** The box names the office but links only 211, whose
   address is known; a national office-finder link will be added once its URL can be checked.
