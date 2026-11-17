# Phase 7 — hardening (interim report)

Phase 7 (spec §11): performance budget, accessibility audit, dead-link crawler, staleness
reporting, corrections log, sitemap, structured data, security headers, deploy.
**Status: everything that can run without the network or a hosting choice is built.**

## Delivered

| Item | Where | Notes |
| --- | --- | --- |
| Security headers | `scripts/dist/postbuild.ts` → `dist/_headers` | Strict CSP: scripts only from the site plus the exact hashes of the inline scripts the build emits; no framing, no plugins; nosniff, referrer and permissions policies, HSTS, long cache for hashed assets. One file format works on both Netlify and Cloudflare Pages |
| CSP proof | `tests/e2e/headers.spec.ts` | Five pages load under the generated policy with islands hydrated and no violations; the test fails if the hashes are removed (checked) |
| Sitemap and robots | `scripts/dist/postbuild.ts` | Written when `SITE_URL` is set at build time; skipped until the address is known |
| Internal link check | `pnpm check:dist`, CI | 3,470 pages, 0 broken links |
| Performance budget | `pnpm check:dist`, CI | Per page, gzipped: HTML ≤ 120 KB, JavaScript ≤ 150 KB. Every page is within budget |
| Source link check | `pnpm check:source-links`, `.github/workflows/links.yml` | Weekly; checks every cited URL and its archive copy; reports in the job summary, never edits data |
| Structured data | `src/lib/structured-data.ts` | `Dataset` on the homepage, `ScholarlyArticle` on methodology and each published correlation (genre "Interpretation"). Only fields the records state; no invented licence |
| Accessibility | `tests/e2e/site.spec.ts` | axe WCAG 2.2 AA in light, dark and mobile on 14 pages (already blocking in CI) |
| Staleness reporting, corrections log | Phase 2 and Phase 5 | `pnpm report:staleness`, `/data-health`, append-only `corrections.json` |

Results: 735 unit tests, 188 browser checks, `check:dist` clean, both gates 0 errors.

## Needs the owner

1. **Hosting and address.** Netlify or Cloudflare Pages (both read `_headers`), and the domain.
   Once chosen: set `SITE_URL` for the build, connect the repository, and the sitemap is emitted.
2. **Lighthouse ≥ 95** (spec §12) is run against the deployed site, where real headers, compression
   and caching apply.
3. **Manual keyboard pass** (spec §12): automated checks pass; a person should tab through the
   timeline, calculator and correlation browser once.
