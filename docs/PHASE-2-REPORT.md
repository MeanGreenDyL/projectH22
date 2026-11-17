# Phase 2 — fact layer ingestion report

Phase 2 gate (spec §11): report, then continue (owner decision 2026-11-17: carry straight through
the phases and send each report).

## Result

**703 verified events** (target 300+) and **15 data series**, all from live feeds, all passing
`pnpm validate` and `pnpm validate:credibility` with 0 errors. 696 of 718 sources carry a Wayback
Machine snapshot. 186 records are held back because none of their sources is archived yet; they
publish automatically once a snapshot exists.

| Feed | Events / series | Held back | Notes |
| --- | --- | --- | --- |
| CISA KEV + NVD | 321 | 0 | Every addition in the last 365 days; all 321 have an NVD CVSS score, cited to the NVD record |
| Federal Register: executive orders | 78 | 0 | Corrections (R1- republications) fold into the original order |
| Federal Register: rules | 46 | 41 | Crypto, cyber, OFAC sanctions, Federal Reserve. Title must match, not just full text |
| Congress.gov: laws | 100 | 7 | 6 awaiting archive; 1 whose enactment date is not in the list response (not guessed) |
| USGS earthquakes, M6+ | 112 | 28 | Worldwide; US events placed in their state |
| OpenFEMA declarations | 46 | 110 | Most FEMA disaster pages have no Wayback snapshot yet |
| Open States | — | — | Built and tested; first live run is the scheduled workflow (key is a GitHub secret) |
| World Bank | 11 series | — | GDP growth, inflation, unemployment, military spending, refugees, internet use, electricity |
| CoinGecko | 4 series | — | BTC and ETH price and market cap, daily |
| GDELT | 0 | — | Failing from this environment (429 / dropped connection); shown as failing on /data-health |

Events by domain: cyber 324, us-law 178, natural 157, geopolitical 26, economic 14, crypto 3,
infrastructure 1.

## Delivered

| Item | Where |
| --- | --- |
| Ingest library: polite HTTP with backoff and timeouts, Wayback lookup and capture budget, archive gate, status and pending files | `scripts/ingest/lib/` |
| One normalizer per feed, each tested against a SYNTHETIC fixture written first | `scripts/ingest/sources/`, `tests/ingest/` |
| `Series` schema (measurement vs media-attention) and `SER-SOURCE` rule | `src/schemas/series.ts`, credibility gate |
| Feed registry and freshness rules, shared by runner, pages, header and reports | `src/lib/feeds.ts` |
| `pnpm refresh:all`, `refresh:source`, `report:staleness`, `report:coverage` | `package.json`, `scripts/` |
| Daily refresh workflow: runs every feed and the full gate, opens a PR | `.github/workflows/refresh.yml` |
| `/sources` and `/data-health`, header freshness indicator | `src/pages/` |
| Docs: refresh contract, feed licences | `docs/AGENT-REFRESH.md`, `docs/licensing.md` |

## Decisions and flags for review

1. **Events without an archived source are held back, not published** (EVT-ARCHIVE). Wayback's
   save endpoint is unreachable from this environment, so no new captures were made. The refresh
   workflow requests up to 25 captures a day, so the 186 held-back records should drain over about a week.
2. **CoinGecko and GDELT are placed at Tier 3.** Neither is named in the spec's tier list. Both
   feed only series, never events. GDELT series are typed `media-attention`, must say "coverage" in
   their title, and carry the media-attention label on every chart.
3. **`usImpact` / `globalContext` are empty on most events** (703 EVT-LENS warnings). Writing them
   from templates would add claims the sources do not make. Event pages say "not available yet".
   KEV events carry the BOD 22-01 deadline as their US impact because the catalog states it.
4. **Series are a new collection** (`src/data/series/`). They are measurements, not events, and are
   never counted as events.
5. **FEMA fire-management declarations (FM) are included** as natural-hazard events. They are FEMA
   approvals, not presidential declarations; the title says which type each one is.
6. **State laws are limited to cyber and crypto topics.** Ingesting every enacted state bill
   (tens of thousands a year) would bury the rest of the site.
7. **Secrets:** `NVD_API_KEY` and `OPENSTATES_API_KEY` added by the owner. `CONGRESS_API_KEY`
   pending; Congress.gov falls back to `DEMO_KEY` meanwhile.
8. **Repository setting needed:** Settings → Actions → General → "Allow GitHub Actions to create
   and approve pull requests", or the refresh workflow cannot open its PR. Pull requests it opens
   do not trigger CI, so it runs the full gate itself first.
9. **Thin domains:** crypto has 3 events and infrastructure 1. More Tier 1 sources for crypto
   incidents (e.g. enforcement actions) would need new feeds; flagged rather than padded.
