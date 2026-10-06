# ProcrastiNation 2.0: Session Handoff (as of 2026-10-06)

Paste this into a new Claude Code session together with the approved plan ("ProcrastiNation 2.0: Re-envisioning & Rebuild Plan", saved at `~/.claude/plans/ProcrastiNation2.md`). Project memory lives in `~/.claude/projects/-Users-alexanderson-Desktop-Procrasti-nation/memory/` (the folder changed when the repo moved) and holds four entries: `feedback_git_workflow`, `product-direction-v2`, `plan-quality-evals` and `design-direction-a2`.

---

## 1. Where things stand

- **Repo:** `~/Desktop/Procrasti-nation` (moved 2026-10-01 to drop the space and curly apostrophe from the path).
- **Production (`main`, `94763ed`)** runs the v1 site with all Phase 0 fixes plus the Next 14.2.35 security patch, live on procrasti-nation.work.
- **`v2`** is pushed to origin and up to date. Vercel shows failed preview builds for it until the Root Directory flip at merge (expected).
- **Staging Supabase:** project `mbuakrohovzjegonrplp`. It has production's structure only (no production data) plus v2's `01_schema.sql` (including `ai_requests` and `tasks.note_id`). Alex is signed in there as **citizen #000001**, with a few test tasks and one test plan ("Write 5-page history paper on WWI", 10 steps; step 1 is done and stamped).

**What works on v2 today** (verified on web in the browser pane, signed in against staging):
- **Sign-in:** email magic link (PKCE) with a sign-in gate. Apple and Google are built but hidden behind `EXPO_PUBLIC_AUTH_PROVIDERS=email` until the providers are configured.
- **Quick add:** natural-language capture ("walk Biscuit every day 6pm", "essay due fri", "call mom tomorrow at 5") with live chips; undated captures go to Customs.
- **Today:** real data. Timed items first; missed items roll forward without overdue styling; finished-today items show STAMPED; Customs expands inline; repeating tasks move to their next date ("Stretch · back tomorrow").
- **Plan it:** the eval-gated Adherence Planner (prompts and models unchanged), with optional clarifying questions, a preview showing per-step estimates and dates, and steps saved as child tasks. The next step appears as the A2 "Your next small step" ticket on Today. Entry points: a pill on big-sounding tasks, and a button in quick add.
- **Start Mode:** full-screen focus view from the next-step card or a row's menu. Wall-clock timer, the "just N minutes" contract (keep going / stop here), Pause, Done → ink stamp + haptic → "Start the next step". **I'm stuck:** one-tap reason → `/api/unstick` (Sonnet 5.5, low effort, eval-gated) → a two-minute first action, or a box-breathing breather. Sessions resume after the app is closed or the page reloads. Web: Space pauses, Esc leaves.
- **Today extras:** "Up next" card when no plan step is due; press and hold a row (right-click on web) for Start / Plan it / Move to… (reschedule with the When sheet) / File in… (a territory), with a standing hint under the agenda heading (Alex prefers press-and-hold to a visible Start button per row); step counts include steps finished on earlier days.
- **Upcoming:** everything after today, by day: the next 7 days always (empty ones say "Nothing yet."), then only busy days up to 8 weeks, then Later. Repeats show once on their next date; plan steps show on their days with "step i of n"; a task's due day gets a terracotta DUE marker (tap to open) when its work happens on other days. Phones: a week strip with dots, pinned while the list scrolls, and a Month toggle. Laptop width: the month calendar sits beside the list. Picking a day scrolls to it. Each day has a "+" (quick add for that day: "for Thu 8 Oct"; a typed date still wins). Rows work like Today's (tap, press and hold, check); checking one off hides it and offers Undo.
- **Territories:** Customs at the top (the same undated, unfiled captures Today shows), then the person's territories as cards: stamp-ink stripe, kind icon (School / Work / Home / Other), open count and next dated item ("3 open · Tomorrow: Read chapter 4"); drag the handle to reorder. New territory (name, kind, ink) or one-tap starters (School, Work, Home) when there are none. A territory's page lists Coming up, then Anytime (a plan shows "1 of 8 steps"), with "+" to capture into it and Edit (rename, kind, ink, Delete: its tasks go back to Customs or stay on their days, with Undo). Laptop width puts the list and the page side by side. Filing: task detail's Territory field, File in… in the row menu ("Filed in Chem 201." + Undo), or "#chem" in quick add; a plan's steps follow their plan. Today and Upcoming rows name the territory ("Chem 201 · due Fri").
- **Notes:** a Notes card under Customs (all notes, most recently edited first) and each territory's notes on its page. A note is a title plus lines; ☐ in the top bar (⌘⇧L on web) turns the line you're on into a **live checklist line**: a real task, read like quick add ("read ch 5 fri" → Fri), that shows on Today and Upcoming with the note's name and ticks both ways. Return adds the next line, Return on an empty one ends the checklist, Backspace on an empty one removes it. A checklist line's chevron opens its task. Notes autosave; filing a note in a territory files its checklist tasks too; deleting one takes its open lines with it (Undo brings both back); an emptied note goes away quietly. The + sheet has a **Task / Note** switch for jotting a few lines (⌘↩ saves on web). Checklist tasks stay out of Customs and territory counts (the note shows "1 of 4").
- **Task detail** (tap a row or the next-step card): checkbox and title, Start and Plan it, When / Due / Repeat / Estimate (one-tap chips, a month calendar, or "type it" like "fri 6pm"), notes, delete with Undo. Steps: check off, open, add your own, drag the handle to reorder (one row written per move), and "Re-plan the rest" (keeps finished steps, replaces open ones). Everything autosaves.
- **Passport:** A2 ID page with citizen number, bilingual fields, passport code lines, real stamps ("Officially started", "Small steps N") and a rank bar counting real starts. Sign out.
- **Navigation:** bottom tab bar on phones, sidebar at ≥900px. Day and night ("night passport") themes follow the system.
- **iOS:** checked on the iOS Simulator through Expo Go, signed in (Today, Start Mode, Passport, row menu).

**Not built yet:** Live Activity / lock-screen timer and the timer-end notification (need a development build and notifications), Town Hall, capture-first notes (beyond a task's notes field), search, notifications, onboarding (Citizenship Application) and Settings, account deletion and export, and offline sync.

**Commits on `v2`** (oldest first; branched from `main` at `bc120c2`):

| Commit | What |
|---|---|
| `5361366` | Move the Next.js site into `apps/site` (pure renames) |
| `253f943` | Expo app + `@pn/core` + A2 Today screen (mock data) |
| `9c9d094` | Merge `main` (Next 14.2.35 security patch) |
| `6127466` | v2 DB migration: schema, cutover backfill, rollback, PGlite tests |
| `bea8421` | Sign-in screen and Supabase session handling |
| `1736bb0` | Scripts to copy production's structure into staging; prod-stats query |
| `f6d84ae` | Migration fixed for production's real structure (`tasks.source`, step `completedAt`) |
| `abb1cfb` | Docs: staging state |
| `e7fbdc0` | Real Today, quick add, citizen passport on Supabase |
| `f2dc189` | Copy fix for the repeating-task notice |
| `53fa373` | No wasted citizen numbers; capture keeps focus; dev server watch mode |
| `20a7550` | Plan it on the v2 task model; `plan_generations`; CORS middleware |
| `434bcf2` | This handoff |
| `d1124c0` | Start Mode, I'm stuck (`/api/unstick`, `evals/unstick`), stamps, ranks, row menu, `ai_requests` |
| `de588a2` | Start Mode: resume after close, full step counts, race-safe stuck cap, `useStartSession` |
| `4dbe12e` | Sign-in callback handles a newer link after a failed one (found on iOS) |
| `b0d27a7` | Press-and-hold hint always shown |
| `3859eed` | Task detail: fields, date sheet, repeat, delete + Undo |
| `35bf539` | Task detail: steps (add, open, drag to reorder) |
| `e655e58` | Re-plan the rest, type-a-date, estimates |
| `c87e8a5` | Upcoming: `buildUpcoming`, day sections, DUE markers, Undo on check-off |
| `bb8aad3` | Upcoming: week strip (pinned) + Month toggle, two columns at laptop width, scroll to a day |
| `5a4b398` | Upcoming: "+" per day (quick add preset), Move to… in the row menu |
| `b388a51` | Today orders timed items by time of day (missed ones too); one rule (`timeOnItsDay`) for a row's time |
| `e95600f` | Territories: tab, territory and Customs pages, lists store, create / edit / delete with Undo, laptop columns |
| `8a7937a` | Territories: Territory field, File in…, territory on Today / Upcoming rows, steps follow their plan |
| `b8e72be` | Territories: `#tag` in quick add, drag to reorder (shared `useDragReorder`), sheets above the keyboard on iOS |
| `87ae8cf` | Notes: `tasks.note_id`, notes store, Notes card and page, the note editor, each territory's notes |
| `d7c40b5` | Notes: live checklist lines that are real tasks (☐, Return / Backspace rules, ticks both ways, refile and delete with the note) |
| `33a2386` | Notes: Task / Note switch in +, ⌘⇧L, caret placement, unsaved checklist words survive Close |

**Run it locally:**
1. Start both preview servers from `.claude/launch.json`: `site` (port 3000; `apps/site/.env.development.local` points it at staging) and `app-web` (port 8081; `apps/app/.env.local` points at staging).
2. Open `http://localhost:8081`. To sign in inside Claude's browser pane, Alex requests a link there and pastes it from his email into the pane's address bar (a PKCE link only works in the browser that requested it).
   On the iOS Simulator: request the link from the simulator, then open Alex's link with `xcrun simctl openurl booted "<link>"` and tap Open. Only the **newest** link works (each request cancels the previous one), and the link must come from the device that asked for it.
3. For iOS: from `apps/app`, run `npx expo start --port 8082 < /dev/null`, then `xcrun simctl openurl booted exp://127.0.0.1:8082`.

**Checks:**
- `npm run core:test`: 60 tests.
- `npm run db:test`: 19 migration tests, on the stand-in schema and, when the local dump exists, the real production structure.
- `npm run app:check`: typecheck + lint.
- `npm --prefix apps/site run build`.

---

## 2. Open items for Alex (in priority order)

1. **Apple Developer Program enrollment** ($99/yr). Needed for Sign in with Apple, development builds and TestFlight; approval can take a day or two. Then decide the **App Store bundle ID**, which is hard to change later.
2. **Google Cloud OAuth client** for "Continue with Google". Google's slow verification only applies to Calendar scopes later.
3. **PowerSync account** (free tier) for the offline-sync spike.
4. **Confirm one real plan on the live site** (procrasti-nation.work). Still unconfirmed since Phase 0; plans have only been verified locally against staging.
5. **Before launch:** Vercel Pro (Hobby is non-commercial only) and a **privacy policy page** (required by the App Store; the site has none).
6. **At v2 merge (in this order):** apply `supabase/v2/01_schema.sql` to production **before** the v2 site deploys (its plan route needs `plan_generations`, and `/api/unstick` needs `ai_requests`), then flip Vercel's Root Directory to `apps/site` at the moment `v2` merges. `02_backfill.sql` runs only at cutover, when the v1 pages retire.

Done: Xcode installed (27.0, license accepted, iOS 27 runtime); staging project created; staging redirect URLs added.

---

## 3. Decisions Alex made (don't re-ask)

| Topic | Decision |
|---|---|
| Ambition | Replace Apple **Notes + Reminders** on students' iPhones |
| Audience | **Students first.** Adults later: they won't adopt another thing to check on top of Teams, Outlook and Google Calendar |
| AI planner | **The Adherence Planner stays the core of the product.** It isn't the only way to add a task: simple things like "walk the dog daily 6pm" go in through non-AI quick add |
| Plan quality | Must stay solid. Sonnet builds plans; Haiku only for cheap jobs, and only with eval proof |
| Platform | **An App Store app is mandatory:** Expo (React Native) + Swift add-ons |
| Web | **100% feature parity with iOS.** Layout can adapt to the laptop, but every core feature exists on both |
| Notes | Capture-first notes, not a full Apple Notes clone |
| Theme | Logo stays. **Lean harder** into the nation theme (Passport, Stamps, Territories, Customs, Declarations, State of the Union, Residency, Holidays, Town Hall, Allies) |
| Rollout | Rebuild the UI on the `v2` branch; critical fixes go on `main` |
| Design | **A2 · Vintage Passport, refined** (section 7) |
| Copy | The button that generates an AI plan on a task reads **"Plan it"**. Alex rejected "Make it smaller" and "Want a plan?". The marketing line "Big tasks, made smaller by AI" and the "Made smaller by AI" tag on AI-built steps may stay |
| Git | Claude may commit and push feature branches (`v2`) directly; never push to `main` without asking |
| Staging | Gets production's **structure only**, never real users' data |

---

## 4. Technical decisions made along the way (and why)

- **Cutover strategy.** `01_schema.sql` is additive and safe on production any time; v1 ignores it. `02_backfill.sql` (steps JSONB → child rows) runs **only at cutover**, because v1 would show each step as its own task. `99_rollback.sql` restores v1 exactly. v1 columns stay until a later contract migration. All of this is tested on PGlite against both a stand-in and the real production structure, and rehearsed on staging inside rolled-back transactions.
- **`user_settings`, not `profiles`.** `profiles` is publicly readable (public profile pages) and requires a username, so private settings (Citizenship Application answers, timezone, rollover hour) live in an owner-only table keyed by `user_id`.
- **Citizen numbers.** Assigned by the database in signup order and immutable (enforced by a trigger). The app reads before inserting, and concurrent first loads share one request, because every insert attempt draws a sequence number.
- **`tasks.source` predates v2.** The schools feature uses `'self' | 'assignment'`, and a teacher RLS policy reads it. v2 widens it (`self, assignment, ai, syllabus, lms, reminders`) and never drops it; plan steps are `'ai'`, and parents keep their own source.
- **Free tier counts `plan_generations`.** Counting tasks broke once quick add arrived. The table is insert-and-read only, so a count can't be reset. Clarifying-question checks stay free.
- **Ownership triggers.** `list_id`, `task_id` and `parent_id` can't point at another user's rows; a foreign key alone would accept them. Nesting is one level deep.
- **Start Mode records.** Opening Start Mode is a Start: a `start_sessions` row is upserted whole on every change (writes for one session run in order, so a slow begin can't wipe the end). Outcomes: `done`, `stopped`, `kept-going` (left after the timer), `stuck` (restarted on a tiny action, which is a new session and a new start). The first Start ever earns `first-start` ("Officially started", unique per user); each Done earns `task-done`. Ranks count all starts.
- **"I'm stuck" is free** (Start Mode is the moat, not Pro) with a 20/day cap counted in `ai_requests` (insert and read only; the route logs before counting so parallel bursts can't slip under). Sonnet 5.5 at low effort beat Haiku 12/16 vs 8/16 on `evals/unstick` at ~2s, so Haiku isn't used.
- **Town Hall footer left out** of Start Mode until Town Hall exists: no made-up "12 citizens working" count.
- **Online-first data layer for now.** supabase-js with an optimistic store that rolls back on failure. It's written to be swapped for PowerSync if the spike succeeds.
- **Quick-add parser in `@pn/core`** (no dependencies, not chrono-node). The grammar is deliberately narrow so titles like "Call Tom", "Study for May exam" and "Problem set 2a" survive; times without am/pm use a heuristic; repeats produce RRULEs. Recurrence math lives in core too.
- **Core tests run with `node --test`** directly on TypeScript (Node 24), so core imports use explicit `.ts` extensions (allowed via `allowImportingTsExtensions`).
- **Sign-in:** PKCE magic links (the link must open in the requesting browser); the callback route handles every platform, with `detectSessionInUrl` off; providers are shown only if listed in `EXPO_PUBLIC_AUTH_PROVIDERS`; Apple uses the native button plus `signInWithIdToken` with a hashed nonce.
- **CORS** moved from `next.config.js` to `apps/site/middleware.js`, with an origin allowlist (the site's origin, `app.procrasti-nation.work`, and `localhost:8081` in development). Native iOS isn't subject to CORS.
- **Web output is `single`** (a single-page app) since the app sits behind sign-in; there's no static-rendering hydration flash.

---

## 5. Roadmap status

- **Phase 0 (fixes on `main`):** done and live. One open check: a real plan on the live site.
- **Phase 1 (design):** done; A2 locked.
- **Phase 2 (foundation):**
  - Done: monorepo restructure; `@pn/core`; Expo app scaffold; auth; data-model migration plus staging; AI service layer (done in Phase 0).
  - Remaining: **PowerSync spike** (needs Alex's account, and a development build since Expo Go can't load native modules); the `integrations` table (Phase 5).
- **Phase 3 (core app MVP), in progress:**
  - Done: quick add; Today; Customs (inline); Passport v1 (ID page, real stamps and rank); Plan it; task detail (fields, steps, reorder, re-plan, delete + Undo); Upcoming (days, DUE markers, calendar, add to a day, Move to…); Territories (Customs, territories, filing, #tags, reorder); capture-first notes (live checklist lines, Task / Note in +).
  - Remaining:
    - search
    - local notifications (Done / Snooze / Start) and Web Push
    - Citizenship Application onboarding and Settings
    - account deletion and data export
    - a smarter "does this need a plan?" check (currently a keyword heuristic)
  - Then the TestFlight gate with 10 students.
- **Phase 4:** Start Mode done (timer, contract, I'm stuck, breather, Done → stamp, resume). Remaining: Live Activity (Swift add-on, needs Apple Developer + a development build), Declarations, Morning Briefing / roll-forward, server push, State of the Union, Holidays.
- **Checked on iOS (2026-10-06, Expo Go, signed in):** Today, Start Mode (timer, resume after the app was killed, I'm stuck → `/api/unstick`, two-minute restart, Done → stamp, next step), Passport stamps and rank, the press-and-hold row menu, Upcoming (pinned week strip and scroll to a day, Move to… → When sheet, "+" → quick add for that day, day and night), Territories (cards, territory page, drag to reorder with real touch, File in… → picker → New territory…, day and night), and Notes (☐ with the keyboard up, Return / Backspace, ticking, Close mid-line, the + sheet's Note side, day and night).
- **Next: search.** Notes shipped as planned in `PN2-NOTES-PLAN.md`.
- **Known rough edges:** picking a day near the end of Upcoming can't lift it to the top (the list ends a few days later). The "Plan it" pill's keyword check flags small tasks like "Email Dr. Ruiz about the quiz" (the smarter check is on the roadmap). v1 boards (`localStorage['task-boards']` on procrasti-nation.work) can't be read from the v2 app's origin: bring them over from the v1 site at cutover, or let them go.
- **Known gap:** no live sync between devices yet; each device refreshes on foreground and day change (PowerSync spike pending). For notes this means the last device to save a note's body wins.
- **Notes rough edges:** keys typed within a few milliseconds of Return in a checklist line can land in the old line before focus moves (seen only with the simulator's burst typing, not at human speed). Ticked checklist tasks are always fetched (Today's fetch keeps them so notes can show them), so that fetch grows with use; page it when notes get big. On web the nav bar needs 328px, so a 320px-wide window scrolls sideways by 8px.

---

## 6. Phase 0: shipped to production (`main`)

Commits on `main`: `df426dd`, `e79f893`, `6acd10b`, `7623c37`, `bc120c2`, plus `94763ed` (Next 14.2.35 security patch, made in a separate session). They were rebased on top of 11 newer remote commits by Alex, whose decisions were kept: 10-day trial, **free limit of 3 plans a month**, and the spotlight digest email design.

- **AI outage fixed.** `claude-sonnet-4-20250514` had been retired and returned "not found", so every AI feature was down. `lib/ai.js` provides `callClaude()` and `resolveToday()`:
  - `callClaude()`: raw fetch, structured JSON output via `output_config.format`, refusal and truncation handling, and `fallbacks: "default"` on Sonnet 5.5 with the `server-side-fallback-2026-07-01` beta header.
  - Models: `MODELS.plan = claude-sonnet-5-5` for plans, clarifying questions and syllabus parsing, with `PLAN_EFFORT = 'medium'`; `MODELS.fast = claude-haiku-4-5` for step dates and the weekly pep talk.
- **Prompts** live in `lib/prompts/plan.js` (the "v3" plan prompt) and `lib/prompts/dates.js` (with a 14-day weekday lookup table). The step-dates route clamps every date to fall between today and the due date.
- **Plan-quality eval** is in `apps/site/evals/plan-quality/` (`npm run evals` from the root): 30 cases with today fixed at 2026-09-30, and a Sonnet grader. About $1 per full run; it gates any prompt or model change.

  | Config | Pass | Overall | First step | Timing |
  |---|---|---|---|---|
  | Haiku, original prompt | 2/30 | 2.87 | 2.33 | 3.03 |
  | Sonnet 5.5 medium, original | 20/30 | 3.73 | 2.93 | 3.57 |
  | **Sonnet 5.5 medium, v3 (live)** | **27/30** | **3.93** | **4.23** | **3.60** |

- **Other fixes:**
  - Pro subscribers were no longer blocked by the free limit (profile lookup uses `.eq('user_id')`).
  - Local dates everywhere (`lib/dates.js`).
  - Drag-reordered steps are saved.
  - Signed one-click unsubscribe and `List-Unsubscribe` headers; crons skip opted-out users; migration section 8 was run by Alex.
  - The fake social proof and unbuilt Pro features were removed.
  - Icon, share image and `metadataBase` were added.
  - `NEXT_PUBLIC_BASE_URL` was fixed to `procrasti-nation.work`.

---

## 7. Design direction A2 (locked)

- **Canvas:** https://claude.ai/artifact/9zBPQwmDCUNtrQuumqrrg1 (rows A, **A2**, B and C; read it with the Artifact tool to recover the screen sources). Screens: Landing (desktop), Today (day and night), Start Mode, Passport.
- **Figma inspiration:** https://www.figma.com/make/9IWr6VIpOgDLXo7WiMq8tg/Improve-ProcrastiNation-Design. Figma shows a sign-up wall to logged-out visitors. Workaround: in the browser, run JS to set `location.href` to the `iframe[title="Preview"]` src (its token expires in 60s), then open the preview with `preview_start`.
- **Tokens** live in `packages/core/src/tokens.ts`. The night values for violet and the passport page are inferred; the canvas didn't draw them. Key values:

| Role | Light | Night ("night passport") |
|---|---|---|
| Background | `#F5F1E8` + faint 135° security lines | `#161B2E` + gold-tinted lines |
| Ink / muted | `#232A45` / `#5C6070` | `#ECE6D8` / `#A7AABB` |
| Primary (forest) | `#3A6B52`, text `#2F5A44` | `#7CC3A0`, text `#9AD4B6` |
| Next-step card | sage `#E4EADD` | `#1D2B28` |
| Stamp inks | terracotta `#A8513B`, slate violet `#5E5D8F`, forest | terracotta `#E08A70` |
| Accent | `#9A7B3C` (sun icon) | gold `#D4B26A` |

- **Type:** Fraunces 500 (italic for emphasis) for headings, Instrument Sans for body, IBM Plex Mono for labels (at least 10.5px). The logo wordmark is Space Grotesk 700 with a −5° skew; the flag gradient is unchanged.
- **Motifs:**
  - the ticket-style next-step card with a dashed stub and a round Start button
  - SVG stamps with curved rim text
  - the passport code line `000042<2026<ONE<STEP<AT<A<TIME`
  - bilingual ID labels
  - a tilted STAMPED mark on done tasks
  - the tab bar: Today · Upcoming · (+) · Territories · Passport
- **Voice:** warm and gentle; the nation theme lives in names, places and rewards; buttons stay plain. All copy lives in `@pn/core` (`names`, `actions`, `voice`).

---

## 8. Setup decisions

1. **Separate dependencies per project** (not an npm workspace): the site needs React 18 and Expo SDK 57 needs React 19. `packages/core` is imported through the `@pn/core` tsconfig alias plus Metro `watchFolders`. Revisit if the site moves to Next 15 and React 19.
2. **Styling:** React Native `StyleSheet` with typed A2 tokens (`useTokens()` / `useStyles()`), not NativeWind. Never hard-code a hex in a component.
3. **Vercel:** Root Directory → `apps/site` must flip **at the moment `v2` merges** (the setting applies to every branch). For live previews before then, Alex can create a second Vercel project with production branch `v2`. The Expo web app gets its own project at `app.procrasti-nation.work`.
4. **Env files** (all gitignored):
   - `apps/site/.env.local`: production secrets for the site.
   - `apps/site/.env.development.local`: points `next dev` at **staging** Supabase.
   - `apps/app/.env.local`: public values only, pointing at staging (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AUTH_PROVIDERS`, `EXPO_PUBLIC_API_BASE_URL`). **The Expo app never holds secrets**; it calls the site's `/api/*`.
   - `supabase/v2/.env.staging`: the staging database URL (owner-only file).
   - `supabase/v2/.local/prod-schema.sql`: production's structure dump.

---

## 9. Open product question: the schools feature

The production dump showed tables the plan never mentioned: `organizations`, `org_memberships`, `classes`, `enrollments`, `class_invites`, `assignment_templates` and `assignments`, plus `reset_sessions`. Teachers can see students' assignment tasks through an RLS policy. v2 keeps all of it working (the migration tests check teacher visibility), but how it fits into v2's product and UI is undecided.

---

## 10. Practical notes and gotchas

- **Node** comes from nvm: `export PATH="$HOME/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin:$PATH"` (Node 24).
- **Stray dev servers:** previous sessions can leave Expo running on 8081/8082 (watch mode, so they serve current code). The browser pane can use them; `preview_start` refuses a port another chat holds.
- **Expo dev server:** don't run it with `CI=1`; that disables file watching, and it serves a stale build (this showed the old "Maya" screen once). After an env change, restart the server, since `EXPO_PUBLIC_*` values are compiled in. In Expo Go, re-opening the same URL resumes the cached bundle; run `xcrun simctl terminate booted host.exp.Exponent` first.
- **Expo Go lacks the Apple Authentication native module** on SDK 57, despite what the docs say. Apple sign-in (and PowerSync) need a development build.
- **Staging DB work:** run SQL with `/opt/homebrew/opt/libpq/bin/psql "$STAGING_DB_URL"` after `set -a; . supabase/v2/.env.staging`. Rehearse writes inside `BEGIN … ROLLBACK`, but remember that **sequence numbers aren't rolled back**: never test `user_settings` inserts that way, or citizen numbers get burned.
- **Re-dump production's structure** with `supabase/v2/scripts/dump-prod-schema.sh` whenever it changes, so the migration tests keep checking against reality.
- **Don't use the production service-role key** for exploration; ask first.
- **Typed routes** regenerate while the Expo dev server runs; a fresh `tsc` may flag new routes until then.
- **Browser pane viewport emulation:** with a custom size (e.g. 1100 wide in a narrow pane), clicks by coordinate and by ref miss; test laptop-width interactions at the pane's own size or check them through the DOM. The pane also can't draw (or click) while Claude's window is hidden; the iOS Simulator tools still work. Drags (`left_click_drag`, synthetic pointer events) don't reach react-native-gesture-handler on web, so test drag-to-reorder on the iOS Simulator with `touch_path`. The simulator's `text` action types faster than a person, so a trailing newline can submit before the input's state catches up (truncated titles are a test artifact).
- **Web text fields (React Native Web):** a multiline TextInput renders a textarea that defaults to 2 rows (`oneRowOnWeb`), shows a focus outline unless `outlineStyle: 'none'` (`noFocusRing`), and never shrinks on its own (`useAutoHeight`). TextInput also stops keydown from bubbling, which is why `useShortcuts` listens in the capture phase. On iOS, `focus()` puts the caret at the end, on web at the start: place it with `setSelection` / `setSelectionRange` (see `placeCaret` in the note editor). Screens use `keyboardShouldPersistTaps="handled"`, so tapping a button with the keyboard up does **not** blur the field: don't rely on `onBlur` to save.
- **Testing tools:** the browser pane's `type` with a multi-line string doubles text in React Native Web textareas; type each line and press Return between them. iOS Simulator screenshots taken right after a tap can show the screen before it reacts; wait a second.
- **macOS shell:** `sed` lacks `\|` alternation (use `-E`), and parallel shell calls can race on the working directory, so use absolute paths.
- **Site ESLint** was never configured (`npm run lint` opens a setup prompt); use `npm run build` to check the site. The build prints "Dynamic server usage" logs from the friends routes; that's harmless noise.
- **Git:** commits use the noreply author email and still auto-deploy. Pushing `main` deploys to production. Avoid interactive history rewrites.
- **Crons:** nudge digest daily at 14:00 UTC; weekly report Mondays at 13:00 UTC; both need the `CRON_SECRET` bearer token. Timed jobs move to Supabase Cron later.
- **Before committing,** follow the `agents/*.md` guides: code review before each commit, security review after API or auth changes, database review for SQL, and doc-updater after shipping.
