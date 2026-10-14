# Plan: Search (ProcrastiNation 2.0, `v2` branch)

**Built 2026-10-06** in `8ca3ea6`, `98b42ab` and `b5386ed`; checked on web (phone and laptop widths, day and night) and the iOS Simulator. One change from the plan: no GIN indexes (see Technical choices).

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

One place to find anything: a task (open or finished, plan steps included), a note, or the words inside either. Search runs on the server, because the app only keeps what's on the go (finished tasks and older notes aren't loaded), and it starts matching as you type: "chem" finds "Chemistry lab". "#chem" narrows the search to Chem 201, as it files a task there in quick add.

```
 TUE · 6 OCT                         [🔍]      ┌──────────────────────────────────┐
 A fresh page.                                 │ 🔍 #chem lab                Cancel │
 Six things today. Start with just one.        └──────────────────────────────────┘
                                                [▣ Chem 201 ×]
 tap 🔍 (or ⌘K / on web) ───────────────▶       TASKS
                                                 ○ Lab report draft        Due Thu
                                                 ○ Return the lab key  · Lab checklist
                                                 FINISHED
                                                 ● Lab safety quiz        Done 2 Sep
                                                NOTES
                                                 ✎ Lecture 7: cell energy
                                                   …bring goggles to «lab» on Fri…
```

## Decisions

Confirmed by Alex on 2026-10-06:
- **Entry point:** a magnifier in the header of **Today, Upcoming and Territories** opens a full-screen search. On web, **⌘K** (Ctrl+K) or **/** opens it from anywhere.
- **What it finds:** open tasks and plan steps, **finished tasks**, **notes** (their text, checklist lines included), and the text in a **task's Notes field**. Not territory names.
- **Results grouped by kind:** Tasks (open first, then Finished), then Notes; best match first within each.
- **"#name" narrows to a territory**, with the same matching as quick add ("#chem" finds Chem 201); an unknown #word is searched as a word.

Technical choices (mine; say if you disagree):
- **Postgres full-text search, one SQL function.** `search(query, list)` runs as the signed-in person (`SECURITY INVOKER`, so RLS applies) and returns matches with their rows, a rank and a snippet. English stemming plus prefix matching on every word ("read ch" finds "Reading chapter 4"); words are cleaned server-side, so typed punctuation can't break the query. Checklist tokens (`[[task:…]]`) are stripped from note text before matching.
- ~~**Two GIN expression indexes**, on tasks (title + Notes field) and notes (text without tokens), so search stays fast however much piles up.~~ **Changed while building:** Postgres can't use a full-text index under RLS (`@@` isn't leakproof), so instead every query is bounded to the person's own rows with an explicit `user_id = auth.uid()` (served by the user indexes). Measured on staging: ~40–100 ms for a typical search in a 10,000-task account, ~300 ms for a word matching 9,000. No new columns. In `01_schema.sql`, dropped by `99_rollback.sql`, covered by the PGlite tests, applied to staging.
- **A checklist line is a task result** showing its note's name; tapping it opens the note (where it lives). Its note also appears under Notes when the note's own text matches.
- **Steps search with their plan:** "#chem" includes the steps of plans filed in Chem 201, and a step's row says which plan it belongs to.
- **25 results per group, then "Show more"** (the same pattern as Notes). No silent cut-off.
- **As you type,** with a short pause (about a quarter second) before each search; an answer that arrives after a newer one is dropped.
- **Result rows behave like everywhere else:** check off (with Undo), tap for task detail, press and hold for the row menu. A note row shows a snippet with the match highlighted.
- **Laptop width:** search opens as a centered panel over the page, like quick add; phones get a full-screen page.

## Files

| Area | File | Change |
|---|---|---|
| DB | `supabase/v2/01_schema.sql`, `99_rollback.sql`, `test/migration.test.mjs` | GIN indexes on tasks and notes; `search(query, list)`; rollback; tests (own rows only, prefix and stemming, Notes field, finished included, deleted excluded, tokens never match, #territory incl. plan steps) |
| Core | `packages/core/src/search.ts` (new) + `test/search.test.ts` | `parseSearch(text, lists)` → words + territory; grouping and ordering of results |
| Core | `packages/core/src/nation.ts` | `voice.search` (placeholder, hint, group names, no matches, failed) |
| Data | `apps/app/src/data/search.ts` (new) | calls `search`, maps rows; results merged into the task store so check-off works |
| App | `apps/app/src/app/search.tsx` (new), `components/search/` (new) | the search page: field, territory chip, grouped results, Show more, empty / no-match / error states |
| App | `components/search-button.tsx` (new); `(tabs)/index.tsx`, `upcoming.tsx`, `territories.tsx` | the magnifier in each header |
| App | `app/_layout.tsx`, `(tabs)/_layout.tsx` | the `search` route; ⌘K and / on web |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure lines, schema note, what works, commits |

## Phases (commit + push `v2` after each)

1. **The search engine:** indexes and the `search` function with tests, applied to staging; core `parseSearch` and grouping with tests; the data layer; a plain search page that shows grouped results. Verify on web against staging.
2. **The experience:** the magnifier on Today, Upcoming and Territories; ⌘K and / on web; result rows that check off (with Undo) and open tasks and notes (a checklist line opens its note); snippets with the match highlighted; the territory chip for "#name"; Show more; empty, no-match and error states; the laptop panel.
3. **Polish:** checks on the iOS Simulator and web (phone and laptop widths, day and night, keyboard up); speed check on a large test account (the 1,050-line setup) with `EXPLAIN` on staging; code, database and security reviews (the function's input handling and RLS); docs.

## Out of scope (noted)

- Recent searches and saved searches.
- Searching territory names, Passport stamps and Start Mode sessions.
- Typo tolerance ("chemsitry"); possible later with trigram matching.
- Offline search (waits on the PowerSync spike, like the rest).

## Done when

- [x] The magnifier on Today, Upcoming and Territories (and ⌘K or / on web) opens search with the field ready to type.
- [x] Typing finds open and finished tasks, plan steps, words in a task's Notes field, and notes; partial words match ("chem" → "Chemistry").
- [x] Results are grouped (Tasks, Finished, Notes), best match first, 25 per group with Show more.
- [x] "#chem lab" shows only Chem 201's matches (plan steps included), with a removable territory chip.
- [x] Rows check off with Undo and open task detail; a checklist line opens its note; note rows show a highlighted snippet.
- [x] Only the person's own items ever appear; deleted ones never do.
- [x] Same on iOS and web; light and night; `npm run core:test`, `npm run db:test`, `npm run app:check` pass.
