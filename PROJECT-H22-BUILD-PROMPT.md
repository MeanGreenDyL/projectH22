# Project H 2:2 — Claude Code Build Prompt

> **How to use this file:** Save it to an empty project directory as `PROJECT-H22-BUILD-PROMPT.md`.
> Start Claude Code in that directory, select the **Fable** model, and paste:
>
> ```
> Read PROJECT-H22-BUILD-PROMPT.md in full before writing any code. Then execute Phase 0,
> stop, and show me the plan and scaffolding for approval before continuing to Phase 1.
> ```
>
> Phase gating matters. A one-shot attempt at this scope will produce thin content in a
> polished shell. Build the data model and the credibility layer first; the visuals are
> worthless without them.

---

## 0. Mission

Build **Project H 2:2** — a research-grade, visual-first web platform that documents real-world
events across cybersecurity, cryptocurrency markets, US law, and global geopolitics, and presents
scholarly correlations between those events and the text of the Holy Bible including the Apocrypha.

The name comes from **Habakkuk 2:2** — *"Write the vision, and make it plain upon tables, that he
may run that readeth it."* (KJV, public domain)

That verse is the product specification. Three design mandates come directly from it:

| Phrase | Mandate |
| --- | --- |
| "Write the vision" | Everything is recorded, sourced, dated, and permanent. Nothing is asserted without provenance. |
| "Make it plain upon tables" | The primary medium is charts, tables, diagrams, maps, and timelines — not prose. |
| "That he may run that readeth it" | Comprehensible at a glance, at speed. No clutter. No decoding required. |

---

## 1. The Non-Negotiable Architectural Principle

**This is the single most important section of this document. Read it twice.**

The project has an inherent credibility risk: a site correlating scripture with current events
is, by default, the genre of thing a serious reader dismisses in four seconds. The stated
credibility target is Johns Hopkins, MIT, The Economist, NIST, Oxford, the UN. The only way to
reach that bar is to make epistemic honesty a **structural property of the codebase**, not a
disclaimer in the footer.

Therefore: **the fact layer and the interpretation layer are separate data models, separate
TypeScript types, separate visual treatments, and separate validation rules. They may appear on
the same screen, never inside the same visual boundary without an explicit, visible seam.**

### Layer A — The Fact Layer (`VerifiedEvent`)

Observable, independently verifiable reality. A record cannot enter this layer without:

- at least one **Tier 1 or Tier 2 source** (see §5) with a resolvable URL
- a precise or explicitly bounded date
- quantitative fields where the source provides them
- a `lastVerified` ISO timestamp
- an `archiveUrl` (Wayback / archive.today) so citations survive link rot

Visual treatment: neutral, data-ink-first, sober. This layer must be defensible to a hostile
statistician. Nothing in it depends on any theological position being true.

### Layer B — The Interpretation Layer (`ScripturalCorrelation`)

Proposed relationships between a Layer A event and a scripture passage. Every record is
**explicitly marked as interpretation** in the data model and in the UI. A correlation is never
rendered as a fact, and a fact is never rendered as prophecy fulfilled.

Visual treatment: visually distinct container — a different surface color, a left rule, and a
persistent `INTERPRETATION` chip in the component's own header. Use a dedicated React component
`<InterpretiveFrame>` that **every** Layer B rendering must be wrapped in. Enforce this with a
lint rule or a runtime dev-mode assertion.

### The Correlation Strength Taxonomy

Correlation strength is a **declared, defined enum** — never an unlabeled impression. Exactly
these five values, with these definitions, shown in a persistent legend wherever correlations
appear:

```ts
type CorrelationStrength =
  | 'direct-textual'     // The passage names the specific entity, place, or nation involved,
                         // and mainstream scholarship agrees on the referent. Rare. Use sparingly.
  | 'thematic-parallel'  // The passage describes a category of event (famine, plague, deceit in
                         // commerce) that this event falls within. The most common honest value.
  | 'typological'        // A recognized interpretive pattern (type/antitype) applied by named
                         // historical commentators. Must cite the commentator.
  | 'numerical-symbolic' // Correlation rests on numbers, counts, or calendar math. Must disclose
                         // the method and show the arithmetic. Flagged as weakest class of claim.
  | 'speculative'        // Offered as a question, not a claim. Must be phrased interrogatively
                         // in the UI copy.
```

**Hard rules, enforced in code:**

1. `direct-textual` requires a `scholarlySupport[]` array with at least two Tier 1 citations. A
   build-time validator rejects the record otherwise.
2. `numerical-symbolic` and `speculative` render with reduced visual weight and are **excluded
   by default** from the homepage and from all summary statistics. The user opts in via filter.
3. No correlation may use the word "fulfilled," "proves," "confirms," or "exactly as predicted"
   in any field. Maintain a `FORBIDDEN_CERTAINTY_TERMS` array and fail the build on a match.
4. Every correlation carries a `counterReading` field — the strongest scholarly argument against
   this correlation, or against reading the passage this way. **This field is required and may
   not be empty.** It renders in the UI, collapsed but one click away. This is the thing that
   will make serious readers trust the site: it argues against itself in public.
5. Every correlation carries `hermeneuticTradition[]` from the enum below, because the same
   passage reads four different ways depending on interpretive school, and a credible site says
   so rather than silently picking one:

```ts
type HermeneuticTradition =
  | 'preterist'    // fulfilled in the first century
  | 'historicist'  // unfolding across church history
  | 'futurist'     // awaiting future fulfillment
  | 'idealist'     // symbolic/timeless moral pattern
```

### The Prediction Module — Strictest Rules in the Project

The prediction section is **derived from scripture text only**. It takes no input from current
events, trend extrapolation, model output, or the author's reasoning about where things are going.

- Route: `/scenarios`. Never `/predictions`, never `/prophecy-watch`.
- Each scenario is titled as a conditional, not an assertion: *"If [tradition] reading of
  [passage] is applied, the described sequence would be…"*
- Required fields: `passages[]` (the only permitted basis), `tradition`, `describedSequence`,
  `whatThisDoesNotClaim` (required, non-empty), `majorScholarlyObjections[]`.
- A full-width banner at the top of the route, and on every scenario card: **"Derived from
  scripture text only. Not a forecast. No dates are assigned."**
- **No scenario may contain a date, a year, a countdown, or a time window.** Enforce with a regex
  validator on the content files that fails the build. This is a bright line. Dated prophecy
  claims are the fastest way to destroy the site's credibility and they harm readers who act on
  them.
- No scenario may reference a living person, a named current official, or a specific company.
- Deuterocanonical / Apocryphal material in a scenario is flagged with a `CANON` badge (see §4)
  **and** a note that these books are not received as canonical by all traditions.

### Canon Disclosure

Every scripture citation anywhere on the site carries a canon badge, because the user requirement
is explicit that biblical literature be called out:

- `PROTESTANT-CANON` — 66 books
- `DEUTEROCANON` — Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees, additions to Esther/Daniel
- `APOCRYPHA-WIDER` — 1–2 Esdras, Prayer of Manasseh, 3–4 Maccabees, Psalm 151, Enoch, Jubilees
- `PSEUDEPIGRAPHA` — non-canonical in all major traditions; include only with this badge and a
  scholarly note on dating and reception

A hover/tap on any badge opens a short, neutral explanation of which traditions receive that book
and why. Write these from reference sources (Britannica, Oxford Biblical Studies, Catholic
Encyclopedia, Jewish Encyclopedia) and cite them.

---

## 2. Technical Stack

Default to this unless you have a concrete reason to deviate — and if you deviate, say why before
you build.

```
Framework      Astro 5 with React islands
                 — content-first, ships near-zero JS by default, excellent for heavy
                   static data + selectively interactive charts. This matters: a
                   chart-dense site built as a SPA will be slow and will not score well.
Language       TypeScript, strict mode, no `any` in data models
Styling        Tailwind CSS v4 + CSS custom properties for the theme tokens
Charts         D3 (custom/bespoke: timelines, correlation matrix, Sankey, radial)
               + Recharts (standard: line, area, bar, stacked)
               Rule: D3 where the form is custom, Recharts where it is conventional.
Maps           MapLibre GL JS + Natural Earth vectors (no API key, no vendor lock)
Validation     Zod schemas for every content collection, run in CI
Content        Astro Content Collections — MDX for narrative, JSON/YAML for datasets
Search         Pagefind (static, no server)
Data store     Flat JSON/NDJSON in /src/data, version-controlled. No database in v1.
Testing        Vitest (schema + transform logic), Playwright (visual regression on charts)
Deploy         Cloudflare Pages or Netlify, static output
Refresh        GitHub Actions scheduled workflows (see §6)
```

**Why no database:** a git-versioned flat-file data layer gives free provenance — every data
change is a commit with a timestamp and a diff. For a project whose entire value proposition is
verifiability, that audit trail *is* the feature. Revisit only if record count exceeds ~50k.

---

## 3. Scripture Text — Licensing (Get This Right)

Use **public-domain translations only**. Bundle the text locally as JSON in the repo; do not call
a third-party Bible API at runtime (latency, rate limits, and dependency risk for no benefit).

| Translation | Scope | Status |
| --- | --- | --- |
| KJV 1769 (Oxford/Cambridge standardization) | 66 books | Public domain in the US |
| KJV 1611 | 66 books + Apocrypha | Public domain in the US. Machine-readable JSON dataset including the Apocrypha: `github.com/Saorsa-Ind/King-James-Version-1611-JSON-Dataset` |
| World English Bible (WEB) | Includes Apocrypha/Deuterocanon | Public domain, modern English — use as the readability-parallel translation |
| American Standard Version (ASV) 1901 | 66 books | Public domain |
| Douay-Rheims (Challoner) | Includes Deuterocanon | Public domain — valuable for Catholic canon ordering |
| Brenton's Septuagint (1851) | LXX + Apocrypha, Greek + English | Public domain |
| Berean Standard Bible (BSB) | 66 books | Dedicated to the public domain (2023) |

**Critical caveat to document in the repo README:** the KJV is public domain in the United States
but is under perpetual **Crown Copyright in the United Kingdom**, administered via the Cambridge
University Press letters patent. If the site is served to UK users, either rely on WEB/ASV/BSB as
the primary display translation with KJV as an opt-in, or obtain the relevant permission. Note
this decision explicitly in `/docs/licensing.md` rather than leaving it implicit.

Do **not** bundle NIV, ESV, NASB, NKJV, NLT, or any other modern copyrighted translation. Link
out to publisher sites for those instead.

Build a scripture index with: book, chapter, verse, canon classification, Strong's numbers where
available (public-domain lexicons: Strong's 1890, Thayer's, Gesenius'), and a cross-reference
graph (Treasury of Scripture Knowledge, 1830s, public domain).

---

## 4. Data Models

Write these as Zod schemas with inferred TypeScript types. These are illustrative and intended to
be extended, not copied verbatim.

```ts
// ---------- LAYER A: FACT ----------

const VerifiedEvent = z.object({
  id: z.string(),                        // slug, stable forever
  domain: z.enum(['cyber', 'crypto', 'us-law', 'geopolitical', 'economic',
                  'infrastructure', 'natural']),
  title: z.string().max(120),
  summary: z.string().max(400),          // neutral, factual, no interpretive language
  date: z.object({
    start: z.string().date(),
    end: z.string().date().optional(),
    precision: z.enum(['day', 'month', 'quarter', 'year', 'approximate']),
  }),
  geography: z.object({
    scope: z.enum(['us-federal', 'us-state', 'us-local', 'regional', 'global']),
    countries: z.array(z.string().length(2)),   // ISO 3166-1 alpha-2
    usStates: z.array(z.string().length(2)).optional(),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
  }),
  metrics: z.array(z.object({
    label: z.string(),
    value: z.number(),
    unit: z.string(),
    asOf: z.string().date(),
    sourceId: z.string(),                // every single number traces to a source
    isEstimate: z.boolean(),
    estimateRange: z.tuple([z.number(), z.number()]).optional(),
  })),
  sources: z.array(z.string()).min(1),   // source registry IDs
  lastVerified: z.string().datetime(),
  confidence: z.enum(['confirmed', 'reported', 'disputed', 'unverified']),
  usImpact: z.string().optional(),       // the US-centered lens, see §7
  globalContext: z.string().optional(),
});

// ---------- LAYER B: INTERPRETATION ----------

const ScripturalCorrelation = z.object({
  id: z.string(),
  eventIds: z.array(z.string()).min(1),
  passages: z.array(z.object({
    book: z.string(),
    chapter: z.number(),
    verseStart: z.number(),
    verseEnd: z.number().optional(),
    canon: z.enum(['PROTESTANT-CANON', 'DEUTEROCANON',
                   'APOCRYPHA-WIDER', 'PSEUDEPIGRAPHA']),
  })).min(1),
  strength: CorrelationStrength,
  hermeneuticTradition: z.array(HermeneuticTradition).min(1),
  proposedReading: z.string(),           // the correlation, stated as a proposal
  counterReading: z.string().min(80),    // REQUIRED. The best argument against. Non-empty.
  scholarlySupport: z.array(z.object({
    citation: z.string(),
    sourceId: z.string(),
    position: z.enum(['supports', 'opposes', 'neutral-descriptive']),
  })),
  isInterpretation: z.literal(true),     // literal true — structurally unforgeable
});
```

Example record demonstrating the required honesty level (use this tone throughout):

```yaml
id: supply-chain-attack-thematic-deceitful-balances
eventIds: [major-sbom-compromise-2026]
passages:
  - { book: Proverbs, chapter: 11, verseStart: 1, canon: PROTESTANT-CANON }
strength: thematic-parallel
hermeneuticTradition: [idealist]
proposedReading: >
  The passage condemns a falsified measuring instrument — a tool whose trustworthiness
  is assumed by everyone who relies on it. A software supply-chain compromise operates
  on the same structure: the integrity of a widely trusted dependency is silently
  altered, and every downstream party transacts on a corrupted measure.
counterReading: >
  This is a structural analogy, not a reference. Proverbs 11:1 addresses individual
  commercial honesty in an agrarian economy and makes no claim about technology,
  institutions, or future events. Any ancient or modern instance of fraud fits this
  pattern equally well, which means the passage has no specific explanatory or
  predictive power regarding this event. The correlation is illustrative only.
```

Note what that record does: it makes the connection, and then it tells the reader plainly why the
connection proves nothing. That combination is what distinguishes research from assertion — and
it is what will make a skeptical reader keep reading.

---

## 5. Source Registry & Credibility Tiers

A single source registry (`/src/data/sources.json`) that every citation references by ID. Nothing
anywhere on the site cites a bare URL.

```ts
const Source = z.object({
  id: z.string(),
  tier: z.enum(['1-primary', '2-peer-reviewed', '3-institutional',
                '4-quality-press', '5-specialist-press']),
  title: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  archiveUrl: z.string().url().optional(),   // populate for every Tier 4/5 source
  doi: z.string().optional(),
  accessedAt: z.string().datetime(),
  authors: z.array(z.string()).optional(),
  publishedAt: z.string().date().optional(),
});
```

**Tier definitions**

- **Tier 1 — Primary**: government records and raw data (NIST, CISA, NVD, Federal Register,
  Congress.gov, GovInfo, National Archives, C-SPAN, SEC/EDGAR, BLS, Census, Treasury, FRED,
  state legislature records); UN and agency data; court filings; original manuscripts and
  critical editions.
- **Tier 2 — Peer-reviewed**: journal articles with DOIs; university press books; Cochrane and
  systematic reviews; working papers from NBER and equivalents (flag as preprint where relevant).
- **Tier 3 — Institutional research**: Johns Hopkins, MIT, Oxford, Harvard, Rochester, Howard
  University, RAND, Pew, Brookings, CSIS, Chatham House, World Bank, IMF, BIS; professional
  bodies (APTA, Foundation for Physical Therapy Research); reference works (Britannica, OED,
  Oxford Biblical Studies).
- **Tier 4 — Quality press with institutional standards**: The Economist, Reuters, AP, Financial
  Times, Nature News, Science News. Archive every one.
- **Tier 5 — Specialist/trade press**: BleepingComputer, Krebs on Security, The Record, Ars
  Technica, CoinDesk. Credible in their domain; never the sole source for a headline claim.

**Enforcement rules:**

1. Any `VerifiedEvent` whose only sources are Tier 4/5 renders a visible `SINGLE-SOURCE` marker.
2. Any claim with `confidence: 'disputed'` must cite sources on both sides.
3. A build-time script crawls the registry, checks for dead links, and opens a GitHub issue
   listing them. Run weekly.
4. Build a public `/sources` page: the full registry, filterable and sortable by tier, with
   counts. Showing your work publicly is itself a credibility artifact.
5. **Theological and interpretive sources are tiered separately** and never counted as Tier 1
   evidence for a factual claim. Commentaries (Keil & Delitzsch, Matthew Henry, Barnes, Gill —
   all public domain) are cited as interpretive authorities, labeled as such, with their
   tradition and date noted.

---

## 6. Live Data & Self-Updating Architecture

True real-time is the wrong target here: these are durable research records, not a ticker. The
honest and more robust design is **scheduled automated refresh plus an explicit agent-refresh
contract**, with freshness made visible to the user. Build it in three parts.

### 6a. Scheduled ingestion (GitHub Actions)

One workflow per source, writing to `/src/data/ingested/<source>/`, opening a PR rather than
committing to main so every data change is reviewable.

**Verified endpoints — all free, all confirmed available:**

```
CYBERSECURITY
  CISA KEV catalog    https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
                      No key. Licensed CC0 1.0 Universal. Refresh: daily.
  NVD CVE API 2.0     https://services.nvd.nist.gov/rest/json/cves/2.0
                      Rate limit: 5 req / 30s without key, 50 req / 30s with a free key.
                      Get a key. Implement exponential backoff — NIST firewalls will
                      throttle you aggressively. Refresh: every 6h, incremental by
                      lastModStartDate.
  CISA advisories     RSS from cisa.gov/news-events. Daily.
  BleepingComputer    RSS. Tier 5 — corroborate before promoting to an event record.

US LAW — FEDERAL
  Federal Register    https://www.federalregister.gov/api/v1
                      No key, no signup. Polite rate cap only. Rules, proposed rules,
                      notices, executive orders. Refresh: daily.
  Congress.gov        https://api.congress.gov/v3
                      Free key via api.data.gov. Bills, amendments, votes, members,
                      Congressional Record. Refresh: daily.
  GovInfo             https://api.govinfo.gov
                      Free api.data.gov key, 1,000 req/hour default. Full document text
                      (bills, hearings, US Code, CFR). Refresh: weekly.

US LAW — STATE
  Open States v3      https://v3.openstates.org
                      Free key, X-API-KEY header. 50 states + DC + PR. Free tier is
                      roughly 30 req/min — throttle to ~2.2s between calls. Note: the
                      project is operated by Plural Policy; register at
                      open.pluralpolicy.com. Refresh: daily, by updated_since.
  LegiScan (fallback) https://api.legiscan.com — free key, 30,000 queries/month.
                      Use if Open States coverage or availability degrades.

CRYPTO
  CoinGecko           Market data, global market cap, dominance, categories. Free tier
                      is rate-limited; cache aggressively. Refresh: hourly for market
                      state, daily for the historical series.
  Etherscan           On-chain: large transfers, contract activity, gas. Free key.
                      Use for documenting specific incidents, not continuous polling.
  Rekt / incident DBs Exploit and bridge-hack records — Tier 5, corroborate.

GLOBAL EVENTS & ECONOMICS
  GDELT DOC 2.0       https://api.gdeltproject.org — no credential. Global news volume
                      and tone across 65 languages, rolling 3-month window. Use for
                      coverage-volume and tone time series, NOT as a source of fact.
                      This distinction is important: GDELT measures media attention,
                      which is a different variable from the event itself. Label it as
                      such on every chart that uses it.
  World Bank API      https://api.worldbank.org/v2 — no key, no quota. CC-BY 4.0.
                      ~17,000 indicators, 200+ countries, back to 1960.
  UN Data / UNdata    Population, conflict, food security, displacement.
  FRED (St. Louis Fed) US macro series. Free key.
  USGS earthquakes    https://earthquake.usgs.gov/fdsnws/event/1/ — no key.
  NOAA / FEMA         Disaster declarations, severe weather. OpenFEMA API, no key.
```

### 6b. The agent-refresh contract

Build a documented, deterministic interface so an AI agent (a scheduled Claude Code run, a cron
job, or a GitHub Action) can refresh and extend the site without a human in the loop:

```
pnpm refresh:all                  # run every ingester
pnpm refresh:source <source-id>   # one source
pnpm validate                     # Zod validation across all collections; non-zero exit on failure
pnpm validate:credibility         # tier rules, forbidden-terms scan, required counterReading,
                                  #   no-dates-in-scenarios regex
pnpm report:staleness             # JSON report of records past their refresh SLA
pnpm report:coverage              # which domains/date-ranges are thin
```

Write `/docs/AGENT-REFRESH.md` specifying: the exact JSON schema for each collection, where new
files go, naming conventions, which fields an agent may write and which require human review
(**all Layer B interpretation records require human review — an agent may draft but never
publish a correlation**), and the full validation gate that must pass before a PR is opened.

Also write a `CLAUDE.md` at the repo root with the project conventions so future Claude Code
sessions have the context without re-reading this entire file.

### 6c. Freshness surfaced in the UI

- Every data card and chart shows `as of <date>` — never an undated number.
- A global freshness indicator in the header: green / amber / red by the oldest critical feed.
- A `/data-health` page: per-source last-successful-refresh, record counts, failed runs, dead
  links. Public. A site that shows its own data gaps is more trustworthy than one that hides them.

---

## 7. Content Architecture & Routes

```
/                       Dashboard. Visual-first. Current state across all domains.
/timeline               Master interactive timeline — the spine of the site.
/correlations           The correlation matrix and browser, with the strength legend.
/scripture              Scripture index: search, canon filter, cross-reference graph.
/domains/cyber          Cybersecurity events, attack-surface stats, KEV trends.
/domains/crypto         Market events, exploits, regulatory shifts, dominance shifts.
/domains/us-law         Federal + state legislative change tracker.
/domains/global         Geopolitical events, US-centered with global context.
/scenarios              Scripture-derived scenarios. Strict rules, §1.
/preparedness           Blackout and disruption survival. §9.
/methodology            How correlations are classified. Published, detailed, honest.
/sources                The full source registry.
/data-health            Feed status and known gaps.
```

### The US-centered, globally-aware lens

Every event record carries both `usImpact` and `globalContext`. Visually, this is expressed as a
consistent pattern used across the site: a US-detail panel paired with a global-context panel,
side by side at the same visual weight. The US is the analytical center; it is never presented as
the whole picture. On maps, default view is CONUS with an always-visible global inset and a
one-click toggle to world view.

---

## 8. Visual System

The user requirement is explicit: **primarily graphics, charts, infographics, diagrams, visual
timelines, imagery — more than raw text.** Enforce it as a hard constraint.

### Enforcement rules

1. **No page may open with more than 60 words before its first visual.**
2. **No prose block may exceed 150 words without an intervening visual, table, or callout.**
3. Every statistic appears in a visual form at least once; a number that exists only in a
   sentence is a bug.
4. Every chart carries: a one-line plain-language takeaway above it, the `as of` date, and the
   source ID(s) below it. A chart without a stated takeaway makes the reader do work the site
   should have done — that violates "that he may run that readeth it."

### Chart inventory to build

| Component | Purpose |
| --- | --- |
| **Master timeline** | Horizontal multi-rail timeline. One rail per domain. Zoomable from decade to day. Correlation markers on a visually separated rail below the fact rails — the seam between Layer A and Layer B made literal. |
| **Correlation matrix** | Heatmap: event domains × scripture books. Cell intensity = correlation count, cell border style = dominant strength class. The signature visual of the site. |
| **Scripture-reference network** | Force-directed graph of cross-references among cited passages. Reveals interpretive clustering. |
| **Choropleth maps** | US state-level (law changes, incidents) and world-level (global events). MapLibre. |
| **Sankey diagrams** | Flows: attack vector → sector → impact magnitude; bill introduced → committee → enacted. |
| **Small multiples** | Domain comparison across a shared time axis — the most information-dense honest form available. Use liberally. |
| **Stat tiles** | KPI row with sparkline, delta, and `as of`. Never a bare number. |
| **Radial scenario diagram** | For `/scenarios`: the described sequence as a cycle or sequence diagram, deliberately **without a time axis**, since no dates are permitted. The absence of a time axis is a feature — make it visually obvious. |
| **Severity distributions** | Violin or box plots for CVSS, financial loss, duration. |
| **Annotated event cards** | Compact cards: title, metrics, sources, confidence chip, correlation count. |

### Design direction — "sober instrument," not "doom aesthetic"

The temptation with this subject matter is apocalyptic styling: blood reds, distressed textures,
dramatic serif headlines. **Reject that completely.** It is the single fastest way to lose a
credible reader, and it will undercut the research in a way no amount of citation can repair.

Target the visual register of a national statistical agency or a research institute's data
portal: confident, quiet, precise, dense but uncluttered.

```
Typography    Headings: a restrained grotesque or transitional serif (Söhne, Inter Tight,
              Source Serif 4, Newsreader). Body: optimized for long-form reading at 16–18px.
              Data: tabular lining figures, always. Scripture: a distinct serif, set at a
              slightly larger measure, visually separated from editorial voice.
Color         Neutral structural palette (warm grays, deep ink). ONE restrained accent for
              interactive affordances. Domain colors: four to five muted, colorblind-safe
              hues, consistent sitewide. Interpretation surfaces: a distinct low-saturation
              tint, never red, never gold.
              Reserve saturated color for data only. Chrome stays neutral.
Density       High information density, generous whitespace between information groups.
              Dense ≠ cluttered. Grid-disciplined. No decorative elements that carry no data.
Charts        Minimal gridlines, direct labeling over legends where possible, no chartjunk,
              no 3D, no gradients-as-decoration, no dual y-axes.
Imagery       Diagrams and data graphics, not stock photography. No AI-generated imagery.
              No photographs of identifiable private individuals.
Motion        Transitions under 200ms, respect prefers-reduced-motion. Motion clarifies
              state change only; nothing animates for drama.
Accessibility WCAG 2.2 AA minimum. Full keyboard navigation. Every chart has an accessible
              data table equivalent. Never encode meaning in color alone — pair with shape,
              pattern, or label. Light and dark themes, both validated for contrast.
Performance   Lighthouse ≥ 95 across the board. LCP under 2s on 4G. Charts code-split and
              lazy-mounted per island. Server-render static chart shells where possible.
```

Read the **`dataviz` skill** before writing the first line of chart code, and the
**`frontend-design` skill** before establishing the visual direction.

---

## 9. Preparedness Module (`/preparedness`)

Blackout and infrastructure-disruption readiness. The tone target is: *clear, engaging,
university-level, professionally grounded* — a well-made field manual, not a prepper blog and not
a fear funnel.

### Source discipline

Build this **entirely from official and professional guidance**, cited the same way as everything
else. These are US federal works and largely public domain:

- Ready.gov / FEMA (preparedness, kit contents, Ready Business)
- FEMA IS-series course material; the FEMA App data
- CDC (food safety during outages, carbon monoxide, water)
- EPA (emergency disinfection of drinking water — follow their ratios exactly)
- American Red Cross (first aid, shelter)
- NIST (power-grid and resilience research)
- USDA FSIS (refrigerated/frozen food safety thresholds and timelines)
- DOE / EIA (grid reliability data, outage statistics)
- NFPA (generator and fuel-storage safety codes)
- US Army / Navy survival field manuals (public domain)

### Content structure — visual-first, same as the rest of the site

- **Interactive supply calculator**: household size, climate zone, duration → generated checklist
  with quantities. Water at 1 gal/person/day per Ready.gov, adjusted for climate per their
  guidance. Printable and exportable.
- **Illustrated how-to diagrams**: water disinfection decision tree (EPA ratios), food-safety
  timelines by appliance (USDA FSIS thresholds — 4°F/40°F rules), manual water-heater draining,
  safe generator placement with CO exposure distances, gas-shutoff procedure.
- **Tiered timeline view**: first 2 hours / 24 hours / 72 hours / 2 weeks / 30 days. What changes
  at each threshold. Visual, not a wall of text.
- **Outage statistics dashboard**: EIA/DOE historical outage frequency, duration, and cause data.
  Grounds the module in evidence rather than speculation.
- **Printable one-pagers**: high-contrast, works in black and white, works with no power and no
  phone. This is the module's real deliverable — information that survives the thing it's about.

### Safety rules — non-negotiable

1. **No medical dosing, no pharmaceutical guidance, no improvised medical procedures.** Point to
   official first-aid training and to consulting a clinician. First aid stays at the Red Cross
   certified-curriculum level.
2. **Generator, fuel, and heating content leads with the hazard.** Carbon monoxide kills people
   in outages every single year. CO safety is stated before operating instructions, not after,
   and never in a footnote.
3. **No weapons content, no firearms guidance, no tactical or defensive-confrontation material.**
   Out of scope. This is an infrastructure-resilience module.
4. **No water-source or foraging advice beyond official guidance.** Cite EPA/CDC methods only.
5. Every page in this module links to local emergency management and to 211. Frame community
   resources as primary, not as a fallback after self-reliance.
6. Keep the copy warm and capable — "here is how to be ready" — and strip anything that trades on
   dread. Fear degrades decision-making, which is the opposite of what a preparedness resource is
   for.

---

## 10. Methodology Page — Publish Your Own Limitations

`/methodology` is load-bearing. It is where a skeptical reader decides whether the rest of the
site is serious. Write it with real intellectual honesty. Required sections:

1. **What this project claims and does not claim.** Explicit, in plain language, near the top.
2. **The correlation taxonomy**, with worked examples of each strength class, including a
   deliberately weak example labeled as weak.
3. **Selection bias, stated plainly.** Acknowledge directly that a project looking for scriptural
   parallels will find them, that the Bible's thematic breadth means almost any event can be
   paired with some passage, and that this is precisely why the strength taxonomy and the required
   counter-reading exist. Name the relevant failure modes by name: confirmation bias, apophenia,
   the Texas sharpshooter fallacy, post-hoc narrative fitting, survivorship in which correlations
   get recorded.
4. **Why no dates are assigned to scenarios**, and the historical track record of dated
   predictive claims.
5. **The four hermeneutic traditions**, described neutrally, with the note that the project does
   not adjudicate among them.
6. **Source tiering rules** and why theological sources are tiered separately from factual ones.
7. **Known gaps and open corrections.** Maintain a public corrections log with dates. Corrections
   are published, never silently edited. Append-only.
8. **How to challenge a record.** A real contact route for submitting a counter-argument, and a
   commitment to publish substantive ones alongside the record they challenge.

---

## 11. Build Phases

Stop at each gate and report before continuing.

**Phase 0 — Scaffold & contracts** *(gate: show me the plan)*
Repo init, stack, Tailwind theme tokens, all Zod schemas, source registry structure, the
`validate` and `validate:credibility` gates with their tests written **first**, `CLAUDE.md`,
`/docs/AGENT-REFRESH.md`, `/docs/licensing.md`. No UI yet. The guardrails exist before any
content can violate them.

**Phase 1 — Scripture layer**
Ingest public-domain translations with Apocrypha. Canon classification. Cross-reference graph.
Search index. The `/scripture` route. Verify Apocrypha coverage is actually complete — this is a
common failure point in Bible datasets, so write a test asserting expected book and chapter counts.

**Phase 2 — Fact layer ingestion**
Build ingesters for CISA KEV, NVD, Federal Register, Congress.gov, Open States, World Bank,
USGS, CoinGecko, GDELT. Normalize to `VerifiedEvent`. Wire the GitHub Actions workflows.
`/data-health` and `/sources` routes. **Target: 300+ verified events before any correlation work
begins.** The fact layer must be substantial and self-sufficient first — if the site would be
valuable with the correlation layer switched off, the foundation is right.

**Phase 3 — Visual system**
Design tokens, typography, the chart component library, light/dark themes, accessibility pass.
Build the master timeline and the correlation matrix as the two flagship components. Playwright
visual-regression baselines.

**Phase 4 — Correlation layer**
`<InterpretiveFrame>`, the strength taxonomy UI, the correlation browser, required
counter-readings, canon badges, hermeneutic-tradition filters. Author an initial set of
correlations — **quality over volume. Twenty rigorous, well-sourced, honestly-labeled
correlations with real counter-readings are worth more than three hundred thin ones, and
thin ones will sink the project's credibility.**

**Phase 5 — Scenarios & methodology**
`/scenarios` with every structural rule from §1 enforced in code and verified by test. Write
`/methodology` in full. Do not ship Phase 5 before Phase 4's taxonomy is working.

**Phase 6 — Preparedness module**
Per §9. Calculator, diagrams, printables, outage statistics.

**Phase 7 — Hardening**
Performance budget, full a11y audit, dead-link crawler, staleness reporting, corrections log,
sitemap, structured data (schema.org `Dataset` and `ScholarlyArticle`), security headers, deploy.

---

## 12. Definition of Done

The build is complete when all of the following are objectively true:

- [ ] `pnpm validate && pnpm validate:credibility` exits clean; both run in CI on every PR
- [ ] Zero factual claims without a tiered source ID; zero numbers without `asOf` and a source
- [ ] Zero correlations with an empty `counterReading` — enforced by schema, verified by test
- [ ] Zero occurrences of `FORBIDDEN_CERTAINTY_TERMS` anywhere in content
- [ ] Zero dates, years, or countdowns anywhere under `/scenarios` — verified by regex test
- [ ] Every Layer B rendering is wrapped in `<InterpretiveFrame>` — verified by test
- [ ] Every scripture citation carries a canon badge
- [ ] No page opens with more than 60 words before its first visual
- [ ] Every chart has a plain-language takeaway, an `as of` date, and a source citation
- [ ] Every chart has an accessible data-table equivalent
- [ ] Lighthouse ≥ 95 performance / accessibility / best-practices / SEO
- [ ] WCAG 2.2 AA verified in both themes with an automated checker plus manual keyboard pass
- [ ] All ingesters run green on schedule; `/data-health` reflects reality
- [ ] `/methodology` published in full, including the selection-bias section
- [ ] Only public-domain scripture text is bundled; `/docs/licensing.md` documents the KJV Crown
      Copyright position
- [ ] Preparedness module cites only official sources; CO safety precedes all generator content
- [ ] `CLAUDE.md` and `/docs/AGENT-REFRESH.md` are sufficient for a cold-start agent session

---

## 13. Standing Instructions for the Build Session

- **When the credibility rules and a feature conflict, the credibility rules win.** Every time.
  They are the product.
- **Never fabricate a data point, a citation, a statistic, or a scholarly source.** If a number
  isn't available, the field stays empty and the UI says "not available" rather than filling it.
  A single invented citation would destroy the entire project's value.
- Prefer fewer, better records over volume. Thin content in a beautiful shell is the primary
  failure mode for this kind of site.
- Write the validator before the content it validates.
- Flag anything in this spec that is technically unsound, internally contradictory, or that you
  believe is a mistake — before building it, not after.
- Commit in small, reviewable units with clear messages. Open PRs for data changes.
- Read the `dataviz` skill before chart code and the `frontend-design` skill before visual
  direction.
