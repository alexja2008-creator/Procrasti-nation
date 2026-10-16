# Plan: Dates, repeats and editing (family testing, 2026-10-15)

**Status: approved 2026-10-15.** Alex answered decisions 1–8 and approved the plan as written, defaults D1–D14 included. Phase 1 started on `feat/capture-repeats-dates`.

## Overview

New family testers hit six problems on 2026-10-14 and 2026-10-15, all about dates, repeats and editing:

1. Moving a plan's first step to Monday left the next steps on Saturday and Sunday, before it.
2. The + sheet has no way to give a task a date unless you know to type one.
3. A repeating walk-the-dog task got a Plan it step telling them to set an alarm on their phone.
4. "Mondays, Wednesdays and Saturdays", typed on a Thursday, wasn't understood as a repeat starting Saturday.
5. "Other time" can't be scrolled with a mouse on the web.
6. Nobody found how to rename a task or change a repeat's days.

What the investigation found (2026-10-15, six read-only passes over the code):

1. **Plan steps out of order.** The presets weren't the cause. Nothing re-dates later steps when one step moves (`whenPatch` changes one row). The planner never gets a start date, so step 1 is always today (`plans.ts:39-57`, `prompts/plan.js:76`). The "pre-selected due date" was the Oath page's In a week default (`welcome.tsx:149`).
2. **No date at capture.** The questions that asked for a date were the Oath page, which Skip removes. The capture sheet's chips only display what was parsed (`capture.tsx:177-199`); there's no date control.
3. **Alarm advice.** The plan prompt knows nothing about reminders. In the saved eval results, 5 of 30 plans suggest alarms, calendar reminders or another app's reminder. A task rings only with a day and a time (`reminders.ts:114`). Plan steps never get a time. "every M/W/Sat" parsed as a one-off Saturday with no time, so it would never have rung. Plan it is held back for repeats everywhere except the + sheet (`capture.tsx:92-93`, `:206-213`). A repeat that gets a plan breaks: every later occurrence shows "7/7 · Mark plan done".
4. **Cadence.** The repeat engine already handles several weekdays and intervals (`dates.ts:164-188`), and quick add already snaps to the first matching day (`quick-add.ts:276-280`). The parser just doesn't recognise the wording: `takeRepeat` needs "every" (`quick-add.ts:159-191`). Two real bugs: "every Monday Wednesday and Saturday" starts on Mon Oct 26, titled "walk the dog and Saturday"; "daily 8am" becomes a one-off tomorrow.
5. **Time picker.** Both time strips are horizontal `ScrollView`s with the scrollbar hidden (`date-sheet.tsx:116-124`, `use-declaration.tsx:138-143`). On the web, a mouse wheel only scrolls vertically, so about 5 chips from 6 AM are reachable on a laptop. On iPhone, 8 PM is the 29th chip.
6. **Editing.** The title on the task page is already an editable field (`task/[id].tsx:163-175`) but looks like plain text. The Repeat sheet has fixed choices only (`when.ts:52-60`). A Mon/Wed/Sat repeat shows nothing ticked, and tapping "Every week on Sat" quietly replaces three days with one.

## Decisions (Alex, 2026-10-15)

1. **Later steps: ask each time.** When a plan step moves to a later day (task detail's When, Move to…, a Declaration), a notice asks "Move the rest of the plan too?" with **Move them**. It shifts every later open step by the same number of days and keeps their times, with one Undo. Moving a step earlier doesn't ask.
2. **Day chips are Today / Tomorrow / Pick a date everywhere**, plus typing where a typed field exists today. One shared `dayChips` (`when.ts:19-28`) covers When, Due, Move to…, the Briefing's Pick a day and the Declaration. The Declaration gets a `MonthCalendar` (it has none today). The Oath's due question becomes Today / Tomorrow / Pick a date / No date, **with nothing pre-selected**.
3. **The + sheet gets a day row that sets the due date** (`dueOn`): Today · Tomorrow · Pick a date, with nothing selected, so Enter still saves at once (into Customs when there's no date). A date typed in the text still wins. The row hides when a repeat is understood. Plan it from capture gets a real deadline.
4. **Time picker: the iPhone gets a native wheel, the web gets an hour grid.** The difference is on purpose (Alex: a minor detail, fine to differ).
   - **iPhone:** `@expo/ui`'s `DateTimePicker`, `mode="time"`, `display="spinner"`. It's already in the build through expo-router; it gets added to `apps/app/package.json` directly.
   - **Web:** a wrapping grid of hours (6 AM to 11 PM). Tapping one shows :00 / :15 / :30 / :45.
   - Both replace both strips: the When / Due / Move to… / Pick a day sheet and the Declaration's Start at.
5. **Alarm advice: app fixes now, then a prompt rule behind the eval.**
   - **App, now:** the + sheet holds back Plan it when a repeat is understood, as everywhere else. A repeat with no time gets a quiet hint (D14).
   - **Prompt, after the eval:** the planner learns that PN reminds people. About $2 of eval runs.
6. **The rule bans alarms and other reminder or to-do apps only.** Putting an appointment in your calendar stays allowed ("add the dentist appointment to your calendar"). So does "check your calendar". A phone's own Reminders app counts as another reminder app.
7. **Two or more days mean a weekly repeat, with or without "every".**
   - "walk the dog on Mondays, Wednesdays and Saturdays" and "gym tue/thu" repeat.
   - A single day without "every" stays a one-off ("call mom monday").
   - Titles like "Tuesdays with Morrie", "TGI Fridays" and "SAT exam" stay titles.
8. **The iPhone wheel moves a minute at a time.** No new native module: `@react-native-community/datetimepicker` (which has 15-minute steps) isn't added.

### Claude's defaults (stand unless Alex changes them)

- **D1. Moving later steps never passes the due date.** If shifting would push steps past `dueOn`, the rest are spread evenly from the new day to the due date. If the new day is already after the due date, the rest go one a day after it. The deadline never moves on its own.
- **D2.** A later step with its own signed Declaration stays where it is.
- **D3.** The Morning Briefing's Pick a day doesn't ask; its Re-spread already covers that case.
- **D4. Plan it starts from the task's When day.** If the task has a When day after today, the resolved step dates shift to start there. The shift is done in the app, so there's no prompt change.
- **D5. The Oath ignores cadence words.** A repeat can't hold a plan, and the Oath always makes one. Alex may want something else here (see Risks).
- **D6.** When a repeat is understood, the capture sheet's date chip reads "Starts Sat".
- **D7.** A day picked in the + sheet resets after Add. The day Upcoming's "+" presets stays.
- **D8. Renaming becomes visible.**
  - The task page gets a pencil button by the title that focuses it, and an underline on focus and hover.
  - The row menu gets **Rename…**, a one-field sheet like Move to…. It isn't offered on finished rows; their task page still allows renaming.
- **D9. The Repeat sheet gets Pick days….**
  - Seven toggles, Monday first, set from the current days (or the task's own day).
  - A custom repeat shows as ticked.
  - Save is off with no day picked (Never is how a repeat stops).
  - An interval ("every 2 weeks") is kept.
  - Mon–Fri saves as the same rule as Every weekday.
- **D10. One rule for where a repeat lands when its days change:** the first new day from today. Today is skipped if the task already sat after today, because today's turn is done. Typed and picked changes both follow it; today they disagree (`when.ts:130-136` vs the typed path).
- **D11. Web times use 15-minute steps everywhere** (When / Due use 30 today). The Declaration's "only times still ahead today" rule carries over on both platforms.
- **D12. Prompt wording (draft, eval-gated):** "ProcrastiNation puts these steps on their days and can remind them at a time they pick. Never tell them to set an alarm or to use another reminder or to-do app. For a repeating habit, plan the first one."
- **D13.** The older parser misreads ("Monday meeting notes" becoming "meeting notes" on Monday; "Study for sat" becoming a Saturday) get their own small PR.
- **D14. The nudge hint is a line of text, not a button.** When a repeat with no time is understood, the capture sheet says "Add a time, like 6pm, to get a nudge each Mon, Wed and Sat." It's never a forced prompt, and no second sheet opens over the capture sheet.

**Kept as is:** Upcoming shows a repeat once, on its next date (`DECISIONS.md`). The "Starts Sat" chip makes the first date clear without changing that.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `packages/core/src/quick-add.ts` | Modify | Cadence grammar (below); "daily" before a time; the due day from the capture row (`withDue`) |
| `packages/core/test/quick-add.test.ts` | Modify | Every example from this plan; about 40 fresh ordinary titles that must stay titles |
| `packages/core/src/when.ts` | Modify | `dayChips` → Today / Tomorrow / Pick a date; hour and quarter helpers; `weeklyDays`, `weeklyRule`; one landing rule in `repeatPatch` |
| `packages/core/test/when.test.ts` | Modify | Cases for the above |
| `packages/core/src/planning.ts` (or `briefing.ts`) | Modify | `followPatches(steps, moved, newDay, dueOn)`; the spread generalised to take a start day |
| `packages/core/test/planning.test.ts` | Modify | Shift, squeeze, past-due and signed-Declaration cases |
| `packages/core/src/nation.ts` | Modify | All new copy (Data and copy, below) |
| `packages/core/src/onboarding.ts` | Modify | The Oath's due choices with no default; it ignores cadence (D5) |
| `apps/app/src/components/capture.tsx` | Modify | The day row; "Starts Sat"; the nudge hint; Plan it held back for repeats |
| `apps/app/src/components/time-picker.tsx` | Create | The web hour grid and quarters, also the fallback on other platforms |
| `apps/app/src/components/time-picker.ios.tsx` | Create | The `@expo/ui` wheel |
| `apps/app/package.json` | Modify | `@expo/ui` as a direct dependency (`npx expo install @expo/ui`) |
| `apps/app/src/components/task/date-sheet.tsx` | Modify | New day chips; the time picker in place of the strip |
| `apps/app/src/components/declare/use-declaration.tsx` | Modify | New day chips with a calendar; the time picker; the "move the rest?" notice |
| `apps/app/src/app/welcome.tsx` | Modify | The Oath's due chips, nothing pre-selected |
| `apps/app/src/app/task/[id].tsx` | Modify | The rename pencil; the "move the rest?" notice after When |
| `apps/app/src/components/row-menu.tsx` | Modify | Rename…; the "move the rest?" notice after Move to… |
| `apps/app/src/components/task/repeat-sheet.tsx` | Modify | Pick days… with seven toggles; custom repeats ticked |
| `apps/app/src/data/plans.ts`, `apps/app/src/app/plan/[id].tsx` | Modify | Steps start from the When day (D4) |
| `apps/site/lib/prompts/plan.js` | Modify | The reminder rule (D12), after the eval passes |
| `apps/site/evals/plan-quality/cases.json`, `run.mjs`, `README.md` | Modify | Repeat cases; a step-text check for alarms and other apps |
| `DECISIONS.md`, `CHANGELOG.md`, `STATUS.md`, `docs/architecture.md` | Modify | Decisions 1–8; what shipped; the new time-picker files |

## Phases

Five pull requests. Phases 1–4 run one after another, since they share `nation.ts`, `when.ts`, `use-declaration.tsx`, `task/[id].tsx` and `row-menu.tsx`. Phase 5 only touches `apps/site`, so it can run alongside them.

None of this reaches the iPhone until the next TestFlight build (there are no over-the-air updates). That build is needed before the students get the app anyway. The web gets each phase when it merges.

**Phase 1: Capture understands repeats and dates** (issues 2, 3 and 4 on the app's side)

- **Cadence grammar in `quick-add.ts`:**
  - `every`/`each` [`other`] + a list of days means weekly; `other` means every 2 weeks.
  - `on` + 2 or more days, or `on` + a plural day ("on Mondays"), means weekly.
  - A list of 2 or more days with no cue, at least one a full-name plural, means weekly.
  - `every`/`on` + `weekdays`/`weekends`.
  - `daily` and `weekly` count at the end or before a time.
  - Days in a list can be separated by `,`, `and`, `&`, `/` or `+`, or by a space once the list has a cue.
  - Short days (M, Tu, W, Th, F, Sa, Su, MWF, TTh) count only inside a list after a cue. A lone "S" never counts.
- **False-positive guard:**
  - A single plural day needs a cue or a time after it.
  - All-caps and short plurals ("SAT", "SATs") are never days without `every`/`each`.
  - Single letters count only inside a cued list ("Plan A/B" stays a title).
- **Capture sheet:** the day row (decision 3), the "Starts Sat" chip (D6), the nudge hint (D14), and Plan it held back when `parsed.rrule` is set.
- **Checked:** `npm run core:test` with every example in this plan and about 40 fresh titles that must stay titles. `npm run app:check`. In the browser pane at phone and laptop width, day and night: type each example and watch the chips; add with Enter and nothing picked; pick Tomorrow; pick a date.
- **Needs Alex:** nothing beyond the PR review.
- **Built 2026-10-15 (`feat/capture-repeats-dates`).**
  - **Grammar as built** (`quick-add-repeat.ts`, split out of `quick-add.ts`):
    - Letter codes count only after every/each, never after "on", and only one per day between separators ("M/W/F", "T/Th") or as a known run ("MWF", "TTh", "MTWTF"). A lone T is Tuesday only beside Thursday. So "Work on MWF schedule", "Check every sum" and "Answer every T/F question" stay titles.
    - "SAT" in capitals never counts, even after "each" ("Review each SAT section"). "MON/WED/FRI" in capitals does.
    - Days after "due", "due on", "by", "before", "until", "between" or "from" aren't repeats. A list turned down as a whole isn't read again from its middle, so "Reading due Mon, Wed and Fri" and "this fri, sat and sun" stay one-offs.
    - "every/each week on <days>" and "every 2 weeks on <days>" are understood.
    - A list of days starts on its first matching day, interval included ("every other tue"). A repeat without days keeps its own rhythm ("every 2 weeks").
  - **Found in review and changed:**
    - A note's checklist line only repeats with every/each or "daily" (`repeats: 'cued'`), because nothing on the line shows a misread before it's saved ("Sat and Sun brunch").
    - In the + sheet, a time typed alone ("dentist 3pm") doesn't hide the day row; it goes with the picked deadline.
    - The month closes when the input is focused, so the keyboard and the calendar never stack on a phone.
  - **The Oath (D5):** a repeat's words leave the title, and the task becomes a one-off. It's due when they picked, unless they typed a day or a time, which stays.
  - **Checked:**
    - Core tests (147 cases), including every example here, the review's misreads, and 48 fresh titles.
    - `npm run site:test` (the server compiles core too).
    - `npm run app:check`.
    - The + sheet in the browser pane, at laptop and phone width, Night and Day: the repeat chips, "Starts Sat", the nudge hint, no Plan it for repeats, Tomorrow and Pick a date, a typed day winning, focus coming back after a tap, and the screen-reader labels ("Due tomorrow").
    - Nothing was saved to staging.
  - **Not checked:** Add with a picked day writing `due_on`. The store's `add` is unchanged and `withDue` is tested. The iPhone comes with the next build.

**Phase 2: Day chips and the time picker** (issue 5, and issue 1's chips)

- `dayChips` changes everywhere (decision 2). The Declaration gets a `MonthCalendar`, and the Oath has nothing pre-selected.
- `time-picker.tsx` (web grid) and `time-picker.ios.tsx` (wheel) replace both strips.
- **Checked:** core and app checks. On the web, with a mouse only, then the keyboard only: set 8:15 PM in When, Due, Move to… and the Declaration. A screen reader hears "8:15 PM". On iPhone, in the Simulator: the wheel inside each sheet, and that dragging the wheel doesn't scroll the sheet.
- **Needs Alex:** the wheel on his iPhone with the next TestFlight build.

**Phase 3: The rest of the plan can follow** (issue 1)

- `followPatches` in core (decision 1, D1, D2), with the notice and one Undo after When, Move to… and a Declaration.
- Plan it starts from the When day (D4).
- **Checked:** core tests (shift, squeeze before the due date, already past the due date, a signed Declaration staying put). In the browser pane: plan a task, move step 1 from today to Monday, see the notice, tap **Move them**, and check that every later step comes after Monday and on or before the due date; then Undo.
- **Needs Alex:** nothing beyond the PR review. Making a real plan on staging uses the API, so it's Alex's check, as for earlier plan work.

**Phase 4: Rename and pick days** (issue 6)

- Pencil and underline on the title, and Rename… in the row menu (D8).
- Pick days… in the Repeat sheet (D9), with the one landing rule (D10).
- **Checked:** core tests for `weeklyDays`, `weeklyRule` and the landing rule (Thursday, task next on Saturday under Mon/Wed/Sat, switched to Tue/Thu/Sun, lands Sunday). In the browser pane: rename from the task page and from the row menu; the new title shows on Today, in the note that holds it as a checklist line, and in Search; switch the days and see the task land on the right day.
- **Needs Alex:** on iPhone, a renamed task with a reminder rings with the new title.

**Phase 5: The planner knows PN reminds people** (issue 3's prompt)

- **New eval cases** in `cases.json`: "Walk the dog every Monday, Wednesday and Saturday" and "Take my vitamins every morning". The gym, dentist and professor-email cases stay.
- **A step-text check** in `run.mjs`, `checks()`: no step mentions an alarm, the phone's Reminders, or another reminder or to-do app. Calendar entries are allowed (decision 6).
- **Eval runs:** first the current prompt on the bigger case set, as the new baseline. Then the candidate with D12's rule. The candidate passes if it has zero alarm or other-app hits and is no worse than the baseline on passing cases, overall score, first-step score and due dates. The grader's rubric doesn't change, so results stay comparable.
- **Needs Alex:** about $2 for the two runs, already agreed (decision 5).
- **If the candidate fails:** phases 1–4 still ship, and the prompt stays as it is.

## Data and copy

**Database:** no change. `tasks.title` and `tasks.rrule` are plain text, and the repeat engine already handles several days and intervals. No `database-reviewer` pass is needed unless a phase ends up touching a query.

**Copy:** new copy goes in `nation.ts`, in the no-guilt voice:

- The capture day row's labels.
- "Starts Sat".
- The nudge hint.
- "Move the rest of the plan too?" and **Move them**, then "Moved 4 steps." with Undo. Never "late" or "behind".
- Rename….
- Pick days…, with the full day names in screen-reader labels.
- The time picker's labels ("8:15 PM").
- The Oath's Pick a date.

**Accessibility:** day toggles use `role="checkbox"` with `aria-checked` (`aria-selected` on buttons is ignored on the web, a tabled limit). Chips are at least `t.hitTarget`.

**Privacy:** nothing new is collected and nothing new goes to Anthropic (the planner already gets the title and due date). The policy doesn't change.

## Risks

- **A title read as a repeat.** The guard and the 40 fresh titles test it, and the chips show what was understood before Add. If a misread shows up after launch, narrow the no-cue rule first.
- **The notice gets missed** (decision 1). The steps then stay out of order, as they are today. A knock-on to watch: Today orders by date, but Start opens the first open step by order. A missed notice leaves Today showing step 2 on Saturday while Start opens step 1 (Monday).
- **The iPhone wheel fights the sheet's scroll.** Fallback: the wheel's `compact` style, a "7:45 PM" pill that opens the wheel in a popover.
- **The Oath and repeats (D5).** Someone who types a repeat on the Oath gets a one-off plan. Alex may prefer the Oath to say that repeats get reminders, not plans.
- **The prompt rule weakens plans.** The eval gate catches this, and phases 1–4 don't depend on it.

**Found in passing, not fixed here:**

- **Move to… on a repeating task can pick a day that isn't one of its days.** The task shows on that day but first rings on the next matching day. This needs its own call: snap to a matching day, or ring on the picked day too.
- **Repeats that already have a plan stay broken** ("7/7 · Mark plan done" on every later occurrence). Phase 1 closes the last way in. Existing ones could be found with a query, and Alex runs anything on production.
- **A rename that fails to save** rolls the row back, but the open page keeps showing the typed text.
- **"Set a 20-minute timer"** steps could point to Start Mode's timer instead.

## Done when

- [ ] Typed on a Thursday, "walk the dog on Mondays, Wednesdays and Saturdays", "walk the dog every M/W/Sat" and "every Monday Wednesday and Saturday" each make a weekly Mon/Wed/Sat repeat titled "walk the dog", starting that Saturday.
- [ ] "take vitamins daily 8am" makes a daily repeat at 8 AM.
- [ ] The ordinary-titles test, with about 40 new titles, still passes.
- [ ] The + sheet's day row sets a due date, and Enter with nothing picked still saves at once.
- [ ] The + sheet holds back Plan it for a repeat, and a repeat with no time shows the nudge hint.
- [ ] Every day chooser offers Today, Tomorrow and Pick a date, the Declaration included. The Oath has nothing pre-selected.
- [ ] On the web, any time from 6 AM to 11:45 PM is reachable with a mouse alone and with a keyboard alone, at phone and laptop width.
- [ ] On iPhone, the wheel sets the time in each sheet.
- [ ] Moving a plan step later asks to move the rest. Move them keeps every later step after it and on or before the due date. Undo restores them all.
- [ ] A task whose When day is after today gets plan steps starting that day.
- [ ] A task can be renamed from its page (visibly editable) and from the row menu, and the new title shows in its note, Search and its reminder.
- [ ] A repeat's days can be changed in the Repeat sheet, and the task lands on the first new day by D10.
- [ ] The plan-quality eval passes with zero alarm or other-app suggestions, or phase 5 is dropped with the results recorded.
- [ ] `DECISIONS.md` records decisions 1–8. `CHANGELOG.md` and `STATUS.md` say what shipped. `docs/architecture.md` lists the time-picker files.
