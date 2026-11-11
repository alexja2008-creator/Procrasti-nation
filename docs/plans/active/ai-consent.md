# Plan: Ask before Plan it sends anything to the AI

**Status: approved 2026-11-05** (Alex took every recommendation below). Phase 1 in progress.

## Overview

Plan it and I'm stuck send a person's task to Anthropic. Today only the privacy policy says so (section 3); the app never mentions it. Since November 2025, App Review guideline 5.1.2(i) requires an app to say when personal data goes to a third-party AI, and to get permission first. Apps are being rejected for it, including one whose consent screen reviewers didn't notice because it was part of the launch page instead of a sheet. This plan adds a one-time sheet, "Plan it uses AI". It says what goes to Anthropic and what doesn't, and nothing is sent until the person taps Allow. It answers the App Store release (STATUS.md, Next 2) and is the likeliest rejection found in the repo.

No prompt, model or request body changes, so there's no eval to run.

## Where the AI is called today

| Feature | Screen | Route(s) | What's sent |
|---|---|---|---|
| Plan it (and its clarifying questions) | `apps/app/src/app/plan/[id].tsx` (a modal on iPhone), opened from Today, Upcoming, a task's page, a row's menu, the + sheet, a territory, and the Application's **Oath** (`welcome.tsx`, `oath=1`) | `/api/generate-plan`, `/api/resolve-step-dates` | the task's title and due date, answers to its questions, finished steps on a re-plan, the planning style from the Application, today's date and time zone |
| I'm stuck | Start Mode, `apps/app/src/components/start/stuck-panel.tsx` | `/api/unstick` | the step's title and notes, its plan's title, the reason picked, the planning style, earlier suggestions for the step |
| Syllabus import | none (its route is switched off) | `/api/parse-syllabus` | gets the same check when it's turned back on |

All of them go through `apps/site/lib/ai.js`. Every way into Plan it opens the same screen, so one check there covers the Oath too.

## Decisions (Alex, 2026-11-05)

All eight approved as recommended.

1. **Ask once per account, not per device.** The answer goes in its own column, `user_settings.ai_consent_at`: when Allow was tapped, or null meaning not asked or turned off. *Changed 2026-11-05 (Alex)* from a key in `preferences`, after code review: devices save `preferences` whole from their own copy, so one holding an old copy could turn the AI back on after Off. The column is written on its own, and Plan it reads it fresh every time it opens. **Alex adds the column on production before this merges.**
2. **Ask on the web too.** Apple only requires it on iPhone, but web parity is a house rule, and one answer covers both since it's stored on the account. *Recommended.*
3. **Check consent in the app only, not on the server.** A server check would make Plan it fail for testers still on TestFlight builds 10 and 11, which have no sheet. Apple reviews what the app shows. *Recommended for now.* Revisit if a web or API client ever calls the routes on its own.
4. **One sheet covers both Plan it and I'm stuck.** One question, asked the first time either one is used. *Recommended.*
5. **Not now is never final.** In Plan it, Not now closes the screen without sending anything. On the Oath that brings back its "try again" line, and the Oath's own Not now still moves the Application on, so the funnel isn't blocked. In I'm stuck, Not now goes back to the timer. The next tap asks again; there's no "never ask". *Recommended.*
6. **Settings gets a way to turn it off.** A row under Account: "AI for Plan it and I'm stuck", On or Off. Off clears `aiConsentAt`, so the sheet comes back next time. That's also how a reviewer, or Claude, can see the sheet again without a new account. *Recommended.*
7. **The privacy policy says the app asks first,** and `LEGAL_EFFECTIVE` moves to the ship date since section 3's text changes. *Recommended.*
8. **The copy below.** Alex approves or rewrites it.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `supabase/v2/01_schema.sql`, `supabase/v2/test/migration.test.mjs` | Modify | `user_settings.ai_consent_at TIMESTAMPTZ` (nullable); the owner can set it, nobody else |
| `apps/app/src/data/user-settings.tsx` | Modify | `fetchAiConsent(userId)`: a fresh read that returns null on failure. `saveAiConsent(userId, allowed)`: writes only that column. Neither is part of the settings load |
| `packages/core/src/export.ts`, `apps/app/src/data/account.ts` | Modify | The export's `settings.aiAllowedAt`, read fresh |
| `packages/core/src/nation.ts` | Modify | `voice.aiConsent`: the sheet's title, what goes, what doesn't, Allow, Not now, the Settings row |
| `apps/app/src/components/ai-consent.tsx` | Create | The sheet's content: title, two short lists, a Privacy policy link (`openSitePage('/privacy')`), Allow and Not now. A2 tokens, the `Text` and `Button` components. Shared by both places |
| `apps/app/src/app/plan/[id].tsx` | Modify | A `consent` phase before `reading` or `building` when `aiConsentAt` is missing. The effect that calls the API waits until settings have loaded and consent exists. Allow saves `aiConsentAt`, then starts; Not now closes |
| `apps/app/src/components/start/stuck-panel.tsx` | Modify | The same check before the first `shrink`; Not now goes back to the timer |
| `apps/app/src/app/settings.tsx` | Modify | The On/Off row under Account |
| `apps/site/app/privacy/page.jsx` | Modify | Section 3: "Before the first request, the app asks for your permission; you can turn this off in Settings, and nothing is sent while it's off." |
| `apps/site/lib/site.js` | Modify | `LEGAL_EFFECTIVE` to the ship date (decision 7) |
| `docs/architecture.md`, `DECISIONS.md` | Modify | The new preferences key; why consent is checked in the app and not the server (decision 3) |
| `docs/runbooks/what-to-test.md` | Modify | The sheet, for the build that carries it |

## Phases

**Phase 1: Plan it asks first (the Oath included).** Core type and copy, the component, the `consent` phase in Plan it, the privacy policy line.
- Checked on staging with Alex's existing account (Settings' Off isn't built yet, so clear `aiConsentAt` from the browser pane's console through the app's own client):
  - The web at 375 and 1024 px, day and night: the sheet shows, and **the network panel shows no `/api/generate-plan` request until Allow**.
  - Allow builds the plan; the next Plan it doesn't ask.
  - Not now closes without a request.
  - The iOS Simulator development build: the sheet inside the Plan it modal, with the keyboard down.
- `npm run app:check`, `npm run core:test`.
- **Needs Alex:** a new staging account through the Application, to see the Oath ask first (Claude doesn't create accounts).

**Built 2026-11-05** (branch `docs/ai-consent-plan`).
- **The copy changed from the draft** so it matches what the routes send: "What's sent" adds the plan's steps and today's date and time zone.
- **The data export** gains `settings.aiAllowedAt`.
- **Checked on staging with Alex's account in the browser pane:**
  - At 1024 px in night and 375 px in day, Plan it on "Essay" showed the sheet with **no `/api/` request**, after a direct page load too.
  - Not now went back to Today, still with no request.
  - Allow sent `/api/generate-plan`, and the questions came back.
  - `aiConsentAt` was saved on his `user_settings` row (read with psql), and the next Plan it went straight to "Reading the task…".
  - Afterwards the test plan was closed unused, `aiConsentAt` was removed from his row, and the pane's theme was put back.
- **The privacy policy** shows the new sentence and "Effective November 5, 2026".
- `app:check` passes; `core:test` 103/103.
- **Not checked:**
  - **The iPhone.** The Simulator's development build is signed out, and signing in needs Alex's password.
  - **The Oath on a new account.** Needs Alex.
- **Don't merge before Phase 2.** The policy's new sentence promises the Settings switch and covers I'm stuck, which Phase 2 adds. On the day it merges, set `LEGAL_EFFECTIVE` (and the comment above it) to that date.
- **Code review (2026-11-05):** approved. Plan it can't reach the AI before consent, and Allow can't send a paid request twice. Two findings:
  - **The policy over-promised.** "Nothing is transmitted while it is withdrawn or before it is given" isn't true for TestFlight builds 10 and 11, or for a web tab still running the old code. It now says only what the code guarantees: the app asks first, and Settings can withdraw it.
  - **Fixed the same day (Alex chose a column):** keeping consent in the `preferences` JSON isn't safe once Off exists. `savePreferences` writes the whole object from that device's copy. So a web tab that loaded before someone turned AI Off on their iPhone writes `aiConsentAt` back the next time it saves any preference, and AI is quietly on again. Settings also load once per sign-in, so that tab keeps sending until it reloads. Recommended: a column, `user_settings.ai_consent_at`, written on its own (decision 1's alternative; SQL that Alex applies, and a `database-reviewer` pass), plus reloading settings when the app comes back into view. Phase 1's harmless direction (consent lost, so asked again) is fine as it is.
- **The column, built 2026-11-05.** `ai_consent_at` is in `01_schema.sql` and on staging; `db:test` 22/22, including on production's structure.
  - Plan it now asks the database each time it opens, rather than trusting the copy the device loaded, so an Off made elsewhere takes effect without a reload.
  - **Checked on staging in the browser pane:**
    - The sheet showed with no `/api/` request.
    - Allow sent exactly one `/api/generate-plan` and wrote `ai_consent_at`, with nothing put in `preferences`.
    - Then, with the tab still open, `ai_consent_at` was cleared in the database (as Off on another device would). Reopening Plan it showed the sheet again and sent nothing.
    - Alex's row was left with `ai_consent_at` null.
  - **Database review:** approved with notes. Adding the column alone is safe on production. The owner policy, the citizen-number and `updated_at` triggers, and the grants all cover it, checked on PGlite against a populated table. The SQL above follows its advice: one line, a lock timeout, and a read-only check.
  - **Code review:** approved. Fixed the same day:
    - **A "Making your task smaller" flash before the sheet** (it's on App Review's path). While consent is being read, Plan it shows only a spinner. Checked: right after the tap the page read just "PLAN IT".
    - **Merging before production had the column would have broken settings for everyone.** Consent is no longer in the settings load (`COLUMNS`), only in `fetchAiConsent`.
    - **A failed read used to fall back to the device's copy.** It now counts as not allowed.
    - **Plan it waits for settings again,** so a cold load still sends their style.
    - **The export reads consent fresh,** and its test checks `aiAllowedAt`.
  - Rechecked on staging afterwards: a spinner, then the sheet, with no request; Allow sent one request and wrote the column; Alex's row was cleared again.
  - **For Phase 2's Settings switch** (from the code review): disable the switch while its save is running, so a quick On then Off can't land in the wrong order. Read the switch's value with `fetchAiConsent` when Settings opens.

**Phase 2: I'm stuck and Settings.** The check in the stuck panel and the Settings row.
- Checked:
  - Settings Off, then I'm stuck: the sheet shows and Not now goes back to a paused timer.
  - Off, then Plan it asks again.
  - On another device or browser (same account), nothing asks after Allow.
  - Web and Simulator, day and night.

**Phase 3: the build and App Review.**
- A production EAS build. Its What to Test names the sheet.
- **Needs Alex:**
  - Check it on his iPhone through TestFlight.
  - Paste the notes below into App Store Connect → App Review Information, with a screenshot of the sheet attached.

### App Review notes (draft)

> Plan it and I'm stuck send the task the person asks about to Anthropic, a third-party AI provider. The app asks permission first. On a new account, the first Plan it (on the Application's Oath page, or on any task) opens a sheet titled "Plan it uses AI" listing what is sent and what isn't, with Allow and Not now. Nothing is sent until Allow is tapped. I'm stuck shows the same sheet if Plan it hasn't been allowed yet. Settings → AI for Plan it and I'm stuck turns it off, and the sheet appears again on the next use. A screenshot of the sheet is attached.

## Data and copy

**Data:** one new nullable column, `user_settings.ai_consent_at`, under the table's existing owner-only RLS (no new policy). The data export includes it as `settings.aiAllowedAt`. Private data stays off `profiles`.

**For Alex, in production's SQL Editor, before the PR merges.** Paste only this, never the whole `01_schema.sql`: re-running the file on a live database recreates policies and triggers, resets the citizen-number sequence and gives settings rows to accounts that haven't opened the app.

The column is additive. Nothing on production reads it until this merges: not TestFlight builds 10 and 11, the live web app, the push cron or the SQL files. The lock lasts milliseconds.

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';   -- if it times out, run it again
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;
COMMIT;

-- Check (read-only). Expect one row: timestamp with time zone, YES, NULL; then true.
SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'ai_consent_at';
SELECT has_column_privilege('authenticated', 'public.user_settings', 'ai_consent_at', 'UPDATE');
```

If merged too early, nothing breaks. The app never loads the column with settings, so Plan it would ask every time and Allow wouldn't save until the column exists. If a save fails with PGRST204 after adding it, run `NOTIFY pgrst, 'reload schema';`. Afterwards, re-dump production's structure (`supabase/v2/scripts/dump-prod-schema.sh`) and run `npm run db:test`. Today's dump is from before the cutover, so that run is the first on top of the real v2 tables. Staging got the same line on 2026-11-05 (Claude).

**Copy (draft, for `voice.aiConsent`; plain verbs, no guilt):**

- Title: **Plan it uses AI**
- Lead: To write a plan or shrink a step, PN sends what you're asking about to Anthropic, the AI company behind Claude.
- What goes: the task or step, its notes and due date, your answers to its questions or why you're stuck, and your planning style.
- What doesn't: your name, your email, your other tasks, or anything else in your passport.
- Anthropic doesn't use it to train its AI.
- Link: Privacy policy
- Buttons: **Allow** · **Not now**
- Settings row: AI for Plan it and I'm stuck · On / Off

## Risks

- **A reviewer misses the sheet.** It's a sheet over Plan it, not part of a page, and the review notes say where it is, with a screenshot attached.
- **Consent hasn't been read yet.** Plan it shows only a spinner and calls nothing until the database answers. A failed read counts as not allowed, so the sheet asks again rather than sending. It also waits for settings, so the plan gets their style.
- **Saving Allow fails.** They tapped Allow, so this one request goes ahead. The save is retried the next time; at worst they're asked once more.
- **One more tap in the Application.** The sheet sits right before the Oath's plan, the funnel's best moment. If fewer people finish the Oath's plan once it ships (a count for the funnel queries in STATUS.md, Next 3), shorten the copy before anything else. Not now never blocks the Application.
- **Testers on builds 10 and 11** see no sheet until they update. Nothing breaks for them, because the server doesn't check (decision 3).

## Done when

- [ ] `ai_consent_at` is on production (Alex, SQL above) **before** the PR merges, and production's structure is re-dumped.
- [ ] Off on one device makes the next Plan it on another, already-open device ask again (checked on staging by clearing the column, 2026-11-05).
- [ ] On a new account, the Oath's Plan it shows the sheet before any request, checked on the network panel (web) and on the iPhone.
- [ ] Not now on the Oath sends nothing, brings back its "try again" line, and the Oath's own Not now still moves the Application on.
- [ ] Allow builds the plan; later Plan its and I'm stucks don't ask, on that device or another.
- [ ] I'm stuck with no consent shows the sheet; Not now goes back to the timer.
- [ ] Settings Off brings the sheet back on the next use, and nothing is sent while it's off.
- [ ] The web at 375 and 1024 px, day and night, and the iOS Simulator, checked.
- [ ] The privacy policy's section 3 says the app asks first and how to turn it off; `LEGAL_EFFECTIVE` updated.
- [ ] `npm run app:check` and `npm run core:test` pass; `code-reviewer` run before each commit.
- [ ] The App Review notes and screenshot are in App Store Connect (Alex).
