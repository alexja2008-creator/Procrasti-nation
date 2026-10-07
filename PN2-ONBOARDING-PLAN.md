# Plan: Citizenship Application (onboarding) and Settings (ProcrastiNation 2.0, `v2` branch)

**Status: approved 2026-10-07** (decisions below confirmed by Alex). **Built 2026-10-07** in `ef6fa61` (the Application), `8ae3c5e` (the Oath, Settings) and `a064850` (tone, overwhelmed Today). Changes from the plan:
- The Approved stamp reads CITIZEN / APPROVED, because APPLICATION didn't fit the stamp.
- Settings opens from sliders at the top right of Passport.
- Two fixes surfaced while testing: Sign out now signs out this device only (supabase-js signs out every device by default), and a save that changes no row now counts as failed.

**Checked:**
- The whole Application on web and on the iPhone (Expo Go), signed in on staging: the gate, every page, answers saved and taking effect, resume, Back, Skip, Approved, Today.
- The Oath: creating the task, opening Plan it, and coming back without a plan.
- Settings: on the iPhone, it showed and changed the answers.

**Checked with a live session (2026-10-07):** on web, accepting a plan from the Oath, Settings saves landing, the focused Today (its notices fixed in `87c6ce9`) and the tone lines in Start Mode; on the iPhone, Alex's own run through the Application, the Approved stamp and Passport's stamps (layout fixes in `87c6ce9`, `bca5ef6`, `8890c13`). Details in `PN2-HANDOFF.md`, section 5.

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## What it is

A short, passport-styled form (about 90 seconds) the first time someone opens v2. Every answer changes something real. It ends with the Oath: one real thing they've been putting off, planned live. A **Settings** screen then lets them change any answer at any time.

```
 ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
 │ CITIZENSHIP APPLICATION  1/6 │  │ CITIZENSHIP APPLICATION  4/6 │  │            ╭───────╮          │
 │ Purpose of visit             │  │ First, you’re not broken.    │  │            │APPROVED│         │
 │ ┌──────────┐ ┌──────────┐    │  │ Putting things off isn’t a   │  │            ╰───────╯          │
 │ │ School   │ │ Work     │    │  │ character flaw. It’s mostly  │  │ Welcome, citizen No. 000042  │
 │ └──────────┘ └──────────┘    │  │ mood repair: …               │  │ Your first step is on Today. │
 │ ┌──────────┐ ┌──────────┐    │  │                              │  │                              │
 │ │ Both     │ │ Life     │    │  │            [ Continue ]      │  │          [ Go to Today ]     │
 └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

## Decisions

Confirmed by Alex on 2026-10-07:
1. **Who sees it:** everyone who hasn't done it. That covers new sign-ups, Alex's staging account, and every v1 user the first time they open v2. It's skippable, and Settings holds every answer afterwards.
2. **The Oath** ends the Application. They name one thing they've been putting off and when it's due, Plan it runs live, and they can accept the plan. It's skippable.
3. **Nudge tone is asked now and used now.** The morning list and Start Mode's lines speak in the chosen tone (Diplomat, Drill Sergeant or Roast). Reminder titles stay the task's own words.
4. **Overwhelmed → Today shows just the next step,** with a "Show everything" link.
5. **Self-forgiveness is part of the Application.** Alex's brief:
   - Procrastination isn't permanent, and people shouldn't beat themselves up about it.
   - Pychyl and Sirois: it's mostly short-term mood repair.
   - Self-criticism feeds the loop.
   - Wohl, Pychyl & Bennett (2010): students who forgave themselves for procrastinating before one exam procrastinated less before the next.
   - The message: you aren't broken; the shame is part of the mechanism; treating yourself better is how you change, not your reward for changing; PN is there to help.
   - This is also the voice everywhere, Roast included: it jokes about the task, never the person's worth.

## The pages

One question per page. Big tappable answer cards on passport paper, with a mono "PAGE 2 OF 6" line. Back is always available. Each answer is saved as it's picked, so leaving halfway keeps what's done.

0. **Welcome.**
   - "Citizenship Application", then "A few questions so ProcrastiNation fits how you work. About a minute and a half."
   - The citizen number is shown as reserved ("No. 000042").
   - **Begin**, or a quiet **Skip for now**. Skip counts as done, and Settings has everything.
1. **Purpose of visit:** School / Work / Both / Life admin.
   - Creates matching territories, but only if they have none yet: School; Work; School + Work; Home.
2. **Your hours:** Early bird / Daytime / Night owl.
   - Night owl: the day ends at 3 AM ("a late night still counts as today"). The others end at midnight.
   - Sets the morning list's time for when it's turned on: 7:00, 8:00 or 10:00 AM.
3. **What usually stops you?** One question, four plain answers:
   - "I avoid it" (avoid)
   - "It has to be perfect" (perfectionist)
   - "It feels too big" (overwhelmed)
   - "It's boring" (bored)

   The original plan said two questions; one keeps it short, and the four styles map directly. The answer already sets Start Mode's timer (2 / 5 / 10 / 25 min) and the plan and "I'm stuck" style. Overwhelmed now also changes Today (decision 4).
4. **You're not broken.** Draft copy (edit freely):
   > **First, you're not broken.**
   > Putting things off isn't a character flaw. It's mostly mood repair: a task feels bad, so avoiding it feels better, for a while. Then the bad feeling comes back bigger.
   > Beating yourself up feeds that loop. In one study, students who forgave themselves for putting off studying for an exam put off studying less for the next one.
   > So go easy on yourself. Not as a reward for changing: it's how the change happens. We'll help with the rest, one small step at a time.
   >
   > *Based on research by Tim Pychyl and Fuschia Sirois, and Wohl, Pychyl & Bennett (2010).*
5. **How should we nudge you?**
   - Diplomat / Drill Sergeant / Roast, each with a sample line.
   - The Roast samples get reworded so they never guilt: "Your future self called… disappointed" goes.
6. **The Oath.**
   - "One thing you've been putting off", then when it's due: Today / Tomorrow / This week / Pick a date / No date.
   - **Plan it** runs the real Adherence Planner (the same screen, with Oath wording). Accepting saves the plan, and its first step becomes the next step on Today.
   - **Not now** skips to the end.
7. **Approved.**
   - An APPROVED ink stamp (with the existing haptic) and "Welcome, citizen No. 000042".
   - "Your first step is on Today" if they took the Oath.
   - **Go to Today**. This marks the Application done.

Notification permission stays as it is: asked the first time a task gets a time. The Oath's steps get days, not times, so it doesn't ask there.

## Settings

A gear on Passport opens **Settings**, a full screen on phones and a centered panel on laptops. Sections:
- **Your application:** Purpose, Hours, What stops you, Nudge tone. Each opens a sheet with the same choices as the form.
- **Start Mode:** timer length. Automatic follows what stops you; or 2 / 5 / 10 / 25 min.
- **Your day ends at:** midnight to 6 AM. Hours sets it; this changes it directly.
- **Reminders:** the Reminders card, moved here from Passport.
- **Account:** "Signed in as …" and Sign out, moved from Passport. Account deletion and data export are the next feature and will live here.

Passport keeps the ID page, stamps and rank.

## Tone in use (decision 3)

- The current copy is **Diplomat**. Drill Sergeant and Roast get their own versions of:
  - the morning list's title and line
  - Start Mode's lead line
  - the 5-minute check-in ("Five minutes. You started.")
  - "You started. That counts."
- These are fixed lines in `@pn/core` (`voice` by tone), not AI. Reminder titles stay the task's words.
- Roast stays funny about the task or the situation, never shaming (decision 5).

## Overwhelmed Today (decision 4)

When `style` is overwhelmed, Today shows the greeting, then the next step (or Up next), then a quiet **Show everything (N more)** that opens the agenda and Customs for that visit. With nothing next, it shows the normal empty state.

## Data

No schema changes. Everything already exists on `user_settings`:
- **`preferences`:** `persona`, `hours`, `style`, `nudgeTone`, `startMinutes` (only when chosen in Settings), `reminders`.
- **`day_rollover_hour`**
- **`onboarding_completed_at`:** set on Approved or Skip.

Saves go through `savePreferences`, plus a small `saveSettings` for the rollover hour and the completion time.

**Gate:** once settings have loaded, a signed-in person with no `onboarding_completed_at` lands on the Application (`/welcome`). A link to a task, note or search waits until they're done or skip.

## Files

| Area | File | Change |
|---|---|---|
| Core | `packages/core/src/onboarding.ts` (new) + tests | the pages, answer → effects (territories to create, rollover, morning time), validation |
| Core | `packages/core/src/nation.ts` | Application, not-broken, Approved and Settings copy; tone versions of the morning list and Start Mode lines; reworded Roast samples |
| Core | `packages/core/src/reminders.ts`, `start-mode.ts` | the morning list's words by tone |
| Data | `apps/app/src/data/user-settings.tsx` | `saveSettings` (rollover, onboarding done) |
| App | `src/app/welcome.tsx` (new), `src/components/application/*` (new) | the Application pages, Approved stamp |
| App | `src/app/_layout.tsx` | the gate |
| App | `src/app/plan/[id].tsx` | Oath wording and where accepting goes (`?oath=1`) |
| App | `src/app/settings.tsx` (new), `src/components/settings/*` (new) | Settings |
| App | `(tabs)/passport.tsx` | gear → Settings; card and Sign out move |
| App | `(tabs)/index.tsx` | overwhelmed Today |
| App | `start/[id].tsx`, `notifications/scheduler*.ts` | tone lines |
| Site | `apps/site/lib/push.js` / cron | the morning list's words by tone (from preferences) |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure, what works |

## Phases (commit + push `v2` after each)

1. **The Application.**
   - The gate, Welcome through Approved (without the Oath), saving each answer.
   - Territories from Purpose, rollover and morning time from Hours, the not-broken page.
   - Verify on web and in Expo Go: a fresh account goes through it, Skip works, and answers land in staging.
2. **The Oath and Settings.**
   - Plan it live in the Application.
   - The Settings screen (every answer, timer, day ends at, Reminders card, account); Passport's gear.
   - Verify: a real plan accepted from the Oath shows its first step on Today, and every Settings change takes effect.
3. **Tone and overwhelmed Today, then polish.**
   - Tone lines in the morning list (iPhone and Web Push) and Start Mode.
   - Overwhelmed Today.
   - Night theme, laptop and phone widths, iOS Simulator pass, code review, docs.

## Out of scope (noted)

- **"Bring your stuff"** imports (Apple Reminders, LMS feed, syllabus, calendar): these arrive with Phase 5 integrations and get added to the Application then.
- **Declarations** (signing a start time): Phase 4. The Oath's first step lands on Today for now.
- **Account deletion and data export:** the next feature, which will live in Settings.
- **Tone in AI copy** (plans, I'm stuck) and in emails: later, behind the eval gates.

## Done when

- [ ] A new account goes Welcome → Approved in about 90 seconds on iPhone and web. Skip lands on Today and doesn't ask again.
- [ ] Every answer lands in `user_settings` and takes effect:
  - territories created (only when there are none)
  - a night owl's day ends at 3 AM
  - the morning time follows Hours
  - the Start Mode timer follows what stops you
  - overwhelmed shows just the next step on Today
  - the morning list and Start Mode speak in the chosen tone
- [ ] The not-broken page shows after "What stops you".
- [ ] The Oath plans one real task live, and its first step is on Today.
- [ ] Settings changes every answer, the timer and the day's end. The Reminders card and Sign out live there.
- [ ] Existing accounts see the Application once. `npm run core:test`, `npm run app:check`, the site build and site tests pass.
