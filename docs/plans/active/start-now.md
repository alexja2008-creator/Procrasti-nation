# Plan: The Oath ends in a start

**Status: draft, waiting on Alex.** Nothing is built. The Decisions section holds questions with a recommendation each; coding starts once they're answered.

## Overview

Today the Citizenship Application ends with a plan, a Declaration for later and a save screen. This plan makes it end with the person **doing the plan's first step, right then, in Start Mode**: a few minutes on the thing they've been putting off, before they ever see Today. "Later" stays possible, and it means what it means now: signing a Declaration for a time.

It also closes the way past the Oath without a plan: "Not now" on the Oath page shows only when Plan it couldn't make a plan.

It answers the production numbers from 2026-11-11 (`supabase/v2/funnel.sql` and `passports.sql`, 18 passports since launch):

- 12 passports kept a plan; 4 ever used Start Mode. Every finished step belongs to three passports: Alex and two people he knows. No outside user has finished a step.
- A plan not acted on in its first day wasn't acted on at all: 10 of 20 plans within 24 hours, still 10 within 7 days.
- Outside those three, only one passport shows activity on a second day. Most were active for a few minutes: the Application was the whole visit.
- The three newest saved passports (two from TikTok) are approved with no plan built. The Oath's "Not now" is the only way to get there.
- Start Mode works when it's reached: 28 of 39 sessions ended in Done.

So the one visit most people make has to contain a start, not a promise of one. Making a plan and feeling done is planning as one more way to put the thing off.

## Decisions (Alex, to answer)

1. **After the plan is accepted, the next page offers its first step now.** "Start now · 3 min" is the main button; "Later" is the quiet one. *Recommended.* The planner already keeps a first step to 2–5 minutes with no decisions in it, so it's the smallest honest ask the app has.
2. **"Later" goes to the Declaration page, as now.** Someone who can't do it this minute (it's 2 AM, the step needs their desk) names a time and signs it. Nobody is pushed, and nothing reads as having failed. *Recommended.*
3. **After a start, the Declaration page is for the next open step.** Done on step 1 means the Declaration (and the nudge page after it) is about step 2; stopping early or "I'm stuck" leaves it on step 1. Either way the page after Start Mode says they started, in the tone they picked. Starting is the win, whether or not they finished. *Recommended.*
4. **"Not now" on the Oath shows only when there's no plan to be had:** Plan it failed or was refused by a limit, or (once the AI consent change ships) they answered Not now to "Plan it uses AI". Otherwise the Oath's buttons are Back and Plan it. *Recommended over removing it outright:* an outage, or saying no to the AI, must never trap anyone in the Application. **Question:** keep it visible but quieter instead (a text link under the hint)?
5. **The first-start stamp lands during the Application.** It already does for any start (`awardFirstStart`), so a new passport that starts would open with First start, Declaration signed and Approved. **Question:** is three stamps on a brand-new passport right, or should Approved stay the moment?
6. **Fold "Your first week" into the Start now page?** The rest of the week would sit under the button, and one page goes. Four passports kept a plan and left somewhere in the pages after the Oath (first week, Declaration, nudge, Approved, Save). *Recommended:* yes; one page fewer between the plan and the start. **Question for Alex.**
7. **In Start Mode from the Application, Done doesn't offer "Start the next step".** It goes back to the Application. One start is the point; the rest of the plan is spread over the week on purpose.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/onboarding.ts` | modify | A `startNow` page after `oath` (replacing `firstWeek` if decision 6 is yes); `resumePage` lands a planned, unfinished Application on it instead of Approved; `firstStepOf` stays, plus the next open step for decision 3 |
| `packages/core/src/nation.ts` | modify | Copy: the Start now page's title, lead, button ("Start now · 3 min") and Later; the "you started" line after it, per tone; the Oath's words when Not now is offered |
| `packages/core/test/onboarding.test.ts` | modify | The page order, `resumePage` with a plan, and which step the Declaration is for after a start |
| `apps/app/src/components/application/after-oath.tsx` | modify | `StartNowPage`: step 1's title and estimate, the two buttons, and the week below it (decision 6) |
| `apps/app/src/app/welcome.tsx` | modify | The new page between the Oath and the Declaration; opens Start Mode with `oath=1`; the Declaration's step after a start; when Not now shows on the Oath |
| `apps/app/src/app/start/[id].tsx` | modify | `oath=1`: no "Start the next step" on Done; closing returns to the Application (it already goes back) |
| `supabase/v2/funnel.sql` | modify | `started_in_application`: a start within an hour of the passport opening, so the change can be read |
| `docs/architecture.md`, `DECISIONS.md`, `CHANGELOG.md`, `STATUS.md` | modify | The new page and the decisions above, when it ships |

Seven code files, so this is past the three-file line for a plan.

## Phases

1. **The start (web first).** The Start now page, Start Mode from it and back, the Declaration for the right step, `resumePage`.
   - Checked: core tests; on the web at 375 and 1024 px, night and day: Start now → Done → the Declaration is for step 2; Start now → stop early → still step 1; Later → the Declaration as today; closing the tab mid-timer and reopening (Start Mode's resume, then the Application picks up after the Oath, never asking for a second plan).
   - Needs Alex: a new passport on staging through the whole Application (Claude doesn't create accounts).
2. **The Oath's Not now.** Shown only when Plan it failed, was refused, or the AI wasn't allowed.
   - Checked: each of those three ways shows it; a normal run doesn't. The AI consent case waits for that change to ship (`docs/plans/active/ai-consent.md`).
3. **iPhone.** The same on the Simulator, then the next TestFlight build.
   - Checked on the Simulator: the stack returns to the Application after Start Mode (the swap that dropped a callback screen in build 1 is the thing to watch), and keep-awake during the timer.
   - Needs Alex: a real iPhone on the next build.
4. **Read the result.** Two weeks after it ships, run `funnel.sql` with `since` set to the ship date.

## Data and copy

- **No new tables or columns.** A start in the Application is a `start_sessions` row like any other. `funnel.sql` gains one count (database review for that query).
- **No prompt or model change,** so no eval run. The plan leans on the planner's existing rule that a first step takes 2–5 minutes.
- **Nothing new is collected,** so the privacy policy doesn't change.
- **Copy** goes in `nation.ts`, in all three tones where it nudges. No guilt: Later is a plain choice, stopping early still counts as a start, and nothing says they should have done more.

## Risks

- **The first step can't be done here and now** (wrong place, wrong hour). Later, and a signed time, is the answer; it's one tap away and worded as equal.
- **It feels like pressure to someone who avoids.** The ask is three minutes on a step with no decisions, with Later beside it. If Later is picked far more than Start now, that's the finding, and the page's wording is the first thing to change.
- **Leaving mid-timer.** Start Mode already resumes a session in progress; the Application must come back to the page after the start, not the Oath (a second plan would cost a second free one).
- **A longer Application.** One page is added and, with decision 6, one removed. Without decision 6 it's a page longer in the stretch where four people left.
- **Small numbers.** With a handful of new passports a week, two weeks won't prove much. The check below is about direction, read together with what the people themselves say.

## Done when

- [ ] A new passport that accepts the Oath's plan is offered its first step with Start now and Later.
- [ ] Start now runs Start Mode for that step's estimate and returns to the Application; the Declaration page is for the next open step after Done, and the same step otherwise.
- [ ] Later reaches the Declaration page exactly as today.
- [ ] The Oath shows Not now only when no plan could be made.
- [ ] Reopening the app mid-Application never asks for the Oath twice.
- [ ] Web (375 and 1024 px, night and day) and the iOS Simulator checked; a real iPhone by Alex.
- [ ] Two weeks after shipping, `funnel.sql` shows `started_in_application` for at least half of the new passports that kept a plan (today: 3 of 12 started on their first day).
