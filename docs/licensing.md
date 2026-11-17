# Licensing

Status: Phase 0. No scripture text is bundled yet. This file records the rules Phase 1 must follow
and the one decision the owner still has to make (§2).

This is a working record of the project's position, not legal advice.

## 1. Scripture text — public domain only

Bundle only public-domain text, as local JSON. No runtime Bible API.

| Translation | Scope | Status | Phase 1 check |
| --- | --- | --- | --- |
| KJV 1769 (Oxford/Cambridge standard text) | 66 books | Public domain in the US; Crown Copyright in the UK (§2) | — |
| KJV 1611 | 66 books + Apocrypha | Public domain in the US; Crown Copyright in the UK | Candidate dataset `Saorsa-Ind/King-James-Version-1611-JSON-Dataset`: confirm the repository's own licence on the data files and verify Apocrypha completeness by test |
| World English Bible (WEB) | incl. Deuterocanon / Apocrypha | Public domain | The publisher treats the name "World English Bible" as a trademark for unmodified text; confirm current terms before display |
| American Standard Version (1901) | 66 books | Public domain | — |
| Douay-Rheims (Challoner revision) | incl. Deuterocanon | Public domain | — |
| Brenton's Septuagint (1844/1851) | LXX + Apocrypha, Greek + English | Public domain | Expected source for 3–4 Maccabees and Psalm 151; verify |
| Berean Standard Bible (BSB) | 66 books | Dedicated to the public domain (2023) | Confirm the dedication text and keep a copy in the repo |
| R. H. Charles, *1 Enoch* (1912) and *Jubilees* (1902) | 1 Enoch, Jubilees | Public domain in the US (published before 1930) | Not in the spec's table; proposed because no listed translation covers these two books |

Reference works, also public domain: Strong's (1890), Thayer's lexicon (1889), Gesenius' lexicon
(Tregelles English translation), Treasury of Scripture Knowledge (1830s).

**Never bundled:** NIV, ESV, NASB, NKJV, NLT, or any other copyrighted modern translation. Link out
to the publisher instead.

## 2. KJV and UK Crown Copyright — decision needed

The KJV is public domain in the United States. In the United Kingdom it is under perpetual Crown
Copyright, administered through letters patent, with Cambridge University Press acting as the
King's Printer. A site served to UK readers must either:

- **(a)** use a public-domain modern translation (WEB, ASV or BSB) as the default display text and
  offer KJV as an opt-in, or
- **(b)** obtain permission for KJV display in the UK.

**Proposed: (a)**, with WEB as the default because it is the only fully public-domain modern
translation in the table that also covers the Deuterocanon / Apocrypha. KJV stays available as a
reader-selected toggle. The project's name verse (Habakkuk 2:2) is quoted in KJV wording; whether a
single-verse quotation needs the same treatment in the UK is an open question for the owner.

**Owner decision:** _pending_ (record the decision and date here).

## 3. Data sources

Each ingested feed keeps its own licence. Known so far (spec §6a): CISA KEV is CC0 1.0; World Bank
data is CC BY 4.0 (attribution required on every chart that uses it). Phase 2 adds a row per feed
with its licence and attribution text before the feed is ingested.

## 4. Code

No licence file has been chosen for the code yet. Owner decision.
