# Plan: Ask before Plan it sends anything to the AI

**Status: draft, 2026-11-05. Waiting on Alex's answers to the Decisions below.**

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

## Decisions (Alex, open)

Each has a recommendation. Change any of them before coding starts.

1. **Ask once per account, not per device.** The answer goes in `user_settings.preferences` as `aiConsentAt` (when Allow was tapped; missing means not asked or turned off). `user_settings` is owner-only, and `preferences` is already written through `savePreferences`, so **there's no SQL to run on production**. *Recommended.* (A dedicated column only becomes worth it if the server ever enforces consent; see 3.)
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
| `packages/core/src/types.ts` | Modify | `Preferences.aiConsentAt: string \| null` (ISO time Allow was tapped) |
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

**Data:** one new key, `preferences.aiConsentAt`, on `user_settings` (owner-only RLS, unchanged). No new table, column or policy, so no `database-reviewer` pass is needed unless decision 1 changes to a column. The data export already includes `preferences`. Private data stays off `profiles`.

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
- **Settings haven't loaded yet.** Plan it shows its waiting state and calls nothing until settings are ready, so the sheet never flashes for someone who already said yes and no request goes out before the answer is known.
- **Saving Allow fails.** They tapped Allow, so this one request goes ahead. The save is retried the next time; at worst they're asked once more.
- **One more tap in the Application.** The sheet sits right before the Oath's plan, the funnel's best moment. If fewer people finish the Oath's plan once it ships (a count for the funnel queries in STATUS.md, Next 3), shorten the copy before anything else. Not now never blocks the Application.
- **Testers on builds 10 and 11** see no sheet until they update. Nothing breaks for them, because the server doesn't check (decision 3).

## Done when

- [ ] On a new account, the Oath's Plan it shows the sheet before any request, checked on the network panel (web) and on the iPhone.
- [ ] Not now on the Oath sends nothing, brings back its "try again" line, and the Oath's own Not now still moves the Application on.
- [ ] Allow builds the plan; later Plan its and I'm stucks don't ask, on that device or another.
- [ ] I'm stuck with no consent shows the sheet; Not now goes back to the timer.
- [ ] Settings Off brings the sheet back on the next use, and nothing is sent while it's off.
- [ ] The web at 375 and 1024 px, day and night, and the iOS Simulator, checked.
- [ ] The privacy policy's section 3 says the app asks first and how to turn it off; `LEGAL_EFFECTIVE` updated.
- [ ] `npm run app:check` and `npm run core:test` pass; `code-reviewer` run before each commit.
- [ ] The App Review notes and screenshot are in App Store Connect (Alex).
