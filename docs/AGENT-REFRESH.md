# Agent refresh contract

How an automated agent (scheduled Claude Code run, cron job, GitHub Action) refreshes and extends
the data layer without a human in the loop — and where a human is always required.

Status: everything below is live (Phase 2). Feeds and their refresh targets are listed once, in
`src/lib/feeds.ts`; the runner, `/data-health`, the header indicator and the reports all read it.

## 1. Commands

| Command | Status | Does |
| --- | --- | --- |
| `pnpm validate` | live | Zod validation of every collection, id = file name, events in their domain folder, duplicate ids, referential integrity. Exit 1 on any error. |
| `pnpm validate:credibility` | live | Runs `validate` first, then the credibility rules in §5. Exit 1 on any error; warnings print but pass. |
| `pnpm test` | live | Unit tests for schemas, gates, policy and CLI exit codes. |
| `pnpm refresh:all` | live | Run every ingester. A failing feed records its error and the others still run; exit 1 if any failed. |
| `pnpm refresh:source <feed-id>` | live | Run one ingester. Feed ids: `cisa-kev`, `usgs-earthquakes`, `fema-declarations`, `congress-laws`, `open-states`, `federal-register-rules`, `federal-register-eo`, `world-bank`, `coingecko`, `gdelt`. |
| `pnpm report:staleness` | live | JSON: each feed's health against its SLA, plus events whose `lastVerified` is older than `RECORD_SLA_DAYS` (default 90). Exit 1 if a critical feed is failing or has never run. |
| `pnpm report:coverage` | live | JSON: events per domain per month over `COVERAGE_MONTHS` (default 24), months under `THIN_THRESHOLD` (default 2), empty domains. |

Ingest environment variables: `INGEST_WINDOW_DAYS` (default 365), `ARCHIVE_CAPTURE_BUDGET` (new
Wayback captures requested per run, default 25), `NVD_API_KEY`, `CONGRESS_API_KEY` (falls back to
`DEMO_KEY`), `OPENSTATES_API_KEY`. Keys live in GitHub Actions secrets, never in the repo.

What one ingester run does: fetch → save the raw response to `src/data/ingested/<feed>/latest.json`
→ normalize → look up a Wayback snapshot for every new source (and request up to the capture
budget) → write events that have at least one archived source → list the rest, with a reason, in
`pending.json` → write `status.json`. Held-back records publish on a later run once archived.
`.github/workflows/refresh.yml` runs this daily, runs the full gate, and opens a PR.

Both gates accept `--data <dir>` to validate a directory other than `src/data`.

## 2. Where files go

| Collection | Path | Format | Schema |
| --- | --- | --- | --- |
| Source registry | `src/data/sources.json` | one JSON array | `Source` (`src/schemas/source.ts`) |
| Events (Layer A) | `src/data/events/<domain>/<id>.json` | one record per file | `VerifiedEvent` (`src/schemas/event.ts`) |
| Correlations (Layer B) | `src/data/correlations/<id>.yaml` | one record per file | `ScripturalCorrelation` (`src/schemas/correlation.ts`) |
| Scenarios | `src/data/scenarios/<id>.yaml` | one record per file | `Scenario` (`src/schemas/scenario.ts`) |
| Series | `src/data/series/<id>.json` | one record per file | `Series` (`src/schemas/series.ts`) |
| Raw feed snapshots | `src/data/ingested/<source-id>/` | as fetched (JSON / NDJSON) | not validated as records |

The Zod schemas in `src/schemas/` are the exact JSON schema of each collection. Read them; do not
work from a copy in prose. All records are strict: unknown keys fail validation.

## 3. Naming conventions

- `id` is a lowercase kebab-case slug, stable forever, and equals the file name without extension.
- Event ids: `<what>-<where-or-who>-<yyyy>[-<mm>]`, e.g. `kev-addition-<cve-id>` for feed-derived
  events. Never rename a published id; add a new record and link it from the corrections log.
- Source ids: `<publisher>-<short-title>[-<yyyy>]`, e.g. `cisa-kev-catalog`.
- Feed-derived ids in use: `kev-<cve>`, `usgs-<event id>`, `fema-<dr|em|fm>-<number>`,
  `pl-<congress>-<n>` / `pvtl-<congress>-<n>`, `eo-<number>`, `fr-rule-<document number>`, `os-<state>-<session>-<bill>`; series `wb-<indicator>-<country>`,
  `cg-<coin>-<measure>-usd`, `gdelt-<topic>`.
- A series with `measure: media-attention` (GDELT) counts news coverage. It is never evidence that
  an event happened, its title must say "coverage" or "media attention", and every chart of it
  carries `MEDIA_ATTENTION_LABEL`.
- Dates are `YYYY-MM-DD`; timestamps are ISO 8601 with `Z` or an offset.
- For `month` / `quarter` / `year` precision, `date.start` is the first day of that period.
  `approximate` requires `date.end`.
- Coordinates are `[longitude, latitude]`.

## 4. What an agent may write

| Area | Agent may | Human required |
| --- | --- | --- |
| `src/data/ingested/**` | write freely (via PR) | — |
| `src/data/sources.json` | add sources whose URL it has fetched and resolved; add `archiveUrl` snapshots | changing a source's tier |
| `src/data/events/**` | add and update events (via PR); refresh `metrics`, `lastVerified` | setting `confidence: disputed`; deleting an event |
| `src/data/correlations/**` | **draft only**: `review.status: draft` | everything that publishes: `review.status: approved`, `reviewedBy`, `reviewedAt`; editing an approved record |
| `src/data/scenarios/**` | **draft only**, as above | as above |
| `src/schemas/**`, `src/validation/**`, term lists, book registry | never | always |
| `docs/licensing.md`, scripture translations | never | always |

**All Layer B interpretation records require human review. An agent may draft but never publish a
correlation.** Only `approved` records render on the site (`src/lib/policy.ts`). CODEOWNERS routes
these paths to the owner.

Agents must never fabricate. If a value cannot be fetched from a cited source, leave the field
out. Every `metrics[]` entry needs the `sourceId` it came from and an `asOf` date.

## 5. Rule codes

### Schema gate (`pnpm validate`)

| Code | Meaning |
| --- | --- |
| `SCHEMA-MISSING-REGISTRY` | `src/data/sources.json` is missing |
| `SCHEMA-READ` | file is not valid JSON / YAML, or a stray file type sits in a record folder |
| `SCHEMA-ZOD` | record fails its Zod schema (message includes the field path) |
| `SCHEMA-ID-FILENAME` | file name ≠ record id |
| `SCHEMA-EVENT-DOMAIN-FOLDER` | event is not under `events/<its domain>/` |
| `SCHEMA-DUPLICATE-ID` | id used twice in a collection |
| `REF-SOURCE` | a source id is not in the registry |
| `REF-EVENT` | a correlation names an event that does not exist |

### Credibility gate (`pnpm validate:credibility`)

| Code | Severity | Meaning |
| --- | --- | --- |
| `SRC-ARCHIVE-TIER45` | error | Tier 4/5 source without `archiveUrl` |
| `EVT-QUALIFYING-TIER` | error | event has no Tier 1–4 source (Tier 5 is never the sole source); events without a Tier 1/2 source show the SINGLE-SOURCE marker |
| `EVT-INTERPRETIVE-SOURCE` | error | event cites an interpretive source as evidence |
| `EVT-ARCHIVE` | error | none of the event's sources has an `archiveUrl` |
| `EVT-METRIC-SOURCE-CITED` | error | a metric's `sourceId` is not one of the event's `sources` |
| `EVT-POSITIONS-CITED` | error | a `sourcePositions` entry cites a source the event does not list |
| `EVT-DISPUTED-BOTH-SIDES` | error | `confidence: disputed` without both an affirming and a contesting source |
| `EVT-INTERPRETIVE-LANGUAGE` | error | prophetic / scriptural vocabulary in a fact-layer field |
| `EVT-LAST-VERIFIED-FUTURE` | error | `lastVerified` is in the future |
| `EVT-LENS` | warning | `usImpact` or `globalContext` missing |
| `COR-COUNTER-READING` | error | `counterReading` missing or under 80 non-whitespace characters |
| `COR-CERTAINTY-TERMS` | error | forbidden certainty language in any prose field (bibliographic `citation` strings are exempt) |
| `COR-DIRECT-TEXTUAL-SUPPORT` | error | `direct-textual` without two distinct supporting Tier 1 or Tier 2 citations |
| `COR-TYPOLOGICAL-COMMENTATOR` | error | `typological` without a supporting commentator (interpretive source) |
| `PASSAGE-UNKNOWN-BOOK` | error | book name not in `src/schemas/books.ts` |
| `PASSAGE-CANON` | error | canon badge disagrees with the book registry |
| `SER-SOURCE` | error | a series cites a source that is not Tier 1–4 evidentiary |
| `SCN-NO-DATES` | error | a date, year, duration, countdown or time window in a scenario (strings declared in `textualFigures` are exempt) |
| `SCN-TEXTUAL-FIGURE` | error | a `textualFigures` entry is a calendar year or date rather than the passage's own figure |
| `SCN-CERTAINTY-TERMS` | error | forbidden certainty language in a scenario |
| `SCN-NAMED-ENTITY` | error | a titled official or company name in a scenario (partial screen; review still required) |
| `SCN-CANON-NOTE` | error | non-Protestant-canon passage without `canonNote` |

Per-record rules enforced inside the Zod schemas (reported as `SCHEMA-ZOD`): `isInterpretation`
is literal `true`; `numerical-symbolic` requires `numericalMethod`; `speculative` must end with
`?`; scenario titles begin `If `; scenarios cannot carry event ids or metrics; `approved` requires
`reviewedBy` and `reviewedAt`.

## 6. The gate before a PR is opened

An agent opens a PR only when all of these exit 0, run in this order:

```
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm validate
pnpm validate:credibility
```

The PR body lists: records added / changed per collection, sources added, any warnings the gate
printed, and every field left empty because a value was not available. CI re-runs the same gate.
