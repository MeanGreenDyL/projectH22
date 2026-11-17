# Phase 1 — scripture layer report

Phase 1 gate (spec §11): stop and report before Phase 2 (fact-layer ingestion).

## Delivered

| Item | Where | Status |
| --- | --- | --- |
| Book registry: 82 books with codes, OSIS ids, canon, expected chapter ranges | `src/schemas/books.ts` | done |
| Completeness tests, written before ingestion | `tests/scripture/` | 632 tests pass |
| Parsers (USFX, OSIS, Zefania, Saorsa JSON) + fetch / ingest | `scripts/scripture/` | done |
| Six public-domain translations | `src/data/scripture/<id>/` | WEB 84 books, KJV 81, KJV 1611 81, ASV 66, BSB 66, Douay-Rheims 73 |
| Cross-reference graph | `src/data/scripture/crossrefs/` | 344,799 references; every target verse checked against the KJV text |
| Search index | Pagefind, built by `pnpm build` | 1,391 WEB chapter pages indexed |
| `/scripture` route | `src/pages/scripture/` | book table with canon badges and filter, chapter pages for WEB and KJV, top cross-references per verse |

## What the tests caught

- The KJV 1611 dataset's own index lists 80 books; the 81st file (Additions to Esther) exists and is included.
- The same dataset numbers the Letter of Jeremiah as chapter 1; it is renumbered to chapter 6 (Baruch 6), as printed in 1611.
- Two verse records in that dataset are empty (Sirach 1:7, 17:5). They are omitted, not filled from another edition.
- The cross-reference set uses modern versification, so five references point at 3 John 1:15, which the KJV does not number. Kept as published and listed in the test.
- KJV Protestant-canon verse total is exactly 31,102. BSB has 31,086 because it omits verses absent from its base text.

## Open items and flags

1. **Cross-references are OpenBible.info (CC BY), not the plain TSK.** They start from the TSK and add reader votes. Attribution is shown on every page. Votes are labelled as reader agreement, not scholarship.
2. **Strong's numbers are not bundled.** No reachable source was both public domain and reliably aligned. The field stays empty.
3. **Not yet bundled:** Brenton's Septuagint, and 1 Enoch / Jubilees (R. H. Charles). Their hosts are blocked from this environment. 1 Enoch and Jubilees are in the registry and show "no text bundled yet".
4. **Canon badge explainers.** Badges show the classification. The hover explanation of which traditions receive each book must be written from cited reference works (spec §1), and those sites are not reachable from here, so the explainer copy is still pending rather than written from memory.
5. **Douay-Rheims uses Vulgate numbering** (the Psalms especially). Verse-level comparison across translations does not assume a shared numbering.
6. **Repository size.** The bundled text and cross-references are about 36 MB of JSON. That is fine for git, but it is the largest part of the repository.
7. **Search is chapter-level** in WEB. Verse-level results and KJV search are possible later; for now they would roughly triple the index size.
8. **Visual design.** The `/scripture` pages use the tokens with plain layout. The cross-reference network diagram and the visual system are Phase 3.
