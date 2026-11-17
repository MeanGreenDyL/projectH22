# Phase 3 — visual system report

Phase 3 (spec §11): design tokens, typography, chart component library, light and dark themes,
accessibility pass, the master timeline and the correlation matrix, Playwright baselines.

## Delivered

| Item | Where | Notes |
| --- | --- | --- |
| Tokens, light and dark | `src/styles/tokens.css` | Neutral chrome, one accent, seven validated domain hues, a separate interpretation tint (never red or gold) |
| Typography, self-hosted | Fontsource, SIL OFL 1.1 | Source Serif 4 headings, Inter body and data (tabular figures in tables and axes), Newsreader for scripture |
| Chart frame | `src/components/charts/ChartFrame.astro` | Every chart carries a one-line takeaway, an "as of" date, its source ids, and a data table (spec §8 rule 4) |
| Chart library | `src/components/charts/` | Stat tile with sparkline, small multiples (shared scale), line, box plot with every value drawn, US tile-grid map, correlation matrix |
| Master timeline | `src/components/islands/MasterTimeline.tsx` | One rail per domain; zoom from years to days by buttons, keyboard, ctrl-scroll and drag; the interpretation rail sits below a dashed seam |
| Correlation matrix | `src/components/charts/CorrelationMatrix.astro` | Domains × books; intensity = count, border = dominant strength. Counts approved, summary-eligible readings only; shows an empty state today |
| Shared tooltip | `src/scripts/tooltip.ts` | Same readout on hover and keyboard focus; text inserted with `textContent` |
| Pages | `/`, `/timeline`, `/domains/{cyber,crypto,us-law,global}`, `/events/<id>` (703 pages) | Event pages pair a US panel and a global panel at equal weight |
| Chart data helpers | `src/lib/chart-data.ts` | Tested: monthly counts, five-number summary, matrix rules (drafts and numerical-symbolic/speculative never counted) |
| Browser suite | `tests/e2e/`, `playwright.config.ts`, CI job `browser` | axe WCAG 2.2 AA, no horizontal scroll, the 60-words-before-first-visual rule, timeline controls; layout baselines in light, dark and mobile |

Results: 688 unit tests pass; 111 browser checks pass across desktop-light, desktop-dark and
mobile on 9 pages; `astro check` reports 0 errors.

## Decisions and flags

1. **Baselines mask live numbers and charts.** Data changes daily, so the screenshots compare page
   structure, not values. Chart rendering is covered by unit tests on the data and by the axe and
   layout checks. A fixed-data chart gallery would test chart pixels, but it would put invented
   numbers on the public site, so it is not built.
2. **Visual baselines are non-blocking in CI** until they are re-recorded on GitHub's runner
   (font rendering differs between environments). Accessibility and layout checks are blocking.
3. **Not built yet from the chart inventory:** the scripture-reference network (needs cited
   passages, so it comes with the correlation layer in Phase 4), Sankey diagrams (no flow data
   yet), the radial scenario diagram (Phase 5), and MapLibre world maps (the US tile-grid map covers
   the state-level case now).
4. **The freshness indicator reflects build time.** The site is static, so "fresh" means fresh when
   the page was built.
5. **Domain colours are the Phase 0 validated palette.** Text never wears a data colour; status
   colours are only used for feed health and the SINGLE-SOURCE chip, always with a word.
