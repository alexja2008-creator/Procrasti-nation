# Plan: How to use ProcrastiNation

**Built 2026-10-16** on `feat/how-to-use`, as planned. `npm run core:test` (169 pass, 6 of them the guide's) and `npm run app:check` pass. Checked in the browser pane against staging at 375px and 1280px, Night and Day: the "?" (44 × 44, "How to use ProcrastiNation") opens the guide from Today, Upcoming and Territories, and Settings → Help opens it too; every section reads as drafted, with Ctrl or ⌘ shortcuts to match the keyboard; Close, Escape and (at laptop width) the scrim close it; no console errors. The iPhone's modal is left for the next TestFlight build (STATUS). Changed while building: the copy is a top-level `guide` export (not `voice.guide`), so it can reuse `voice` strings; the Settings row's spoken label drops its trailing ": " when a row has no value (Privacy policy and Terms of use too). After the code review: steps are "the first just a few minutes" (the planner makes later steps 15–60 minutes), the small-steps count is what's finished in Start Mode, Plan it's section names the + sheet and the task page, Declarations reuse `voice.declaration.why`, the header buttons moved to `components/header-buttons.tsx`, and on the web the guide takes keyboard focus when it opens (its Close button), so Tab and the arrow keys don't act on the page underneath.

## Overview
A short guide inside the app, opened from a "?" beside the search magnifier, that explains PN's own words in everyday ones and shows how to do the main things. It answers family testing (2026-10-16): Alex's mom said a fresh user is lost among Territories, Customs, tasks vs notes vs steps, a plan, Passport, Stamps, Declarations, Start Mode, Plan it and the Morning Briefing, names that are second nature to us. The words come from the marketing site's How it works, Features and visa-page entries (`apps/site/components/landing/`), cut down and brought in line with what the app does today.

```
 FRI · 16 OCT                 (?) (🔍)        HOW TO USE                         Close
 A fresh page, Maya.                          How to use ProcrastiNation
                                              It breaks big things into steps small enough
 tap ? ─────────────────────────────▶         to begin, then nudges you when it's time.
                                             ┌ OUR WORDS, IN PLAIN WORDS ──────────────┐
                                             │ Customs     Your inbox. Captures with…   │
                                             │ Territories Your areas: a class, a job…  │
                                             │ …                                         │
                                             └──────────────────────────────────────────┘
                                              Capture anything
                                              Tap + and type it the way you'd say it.
                                              [Essay due fri]   → due Friday
                                              [Gym every mon and wed 6pm] → repeats, with a nudge
                                              …
```

## Decisions (Alex, 2026-10-16)
Each was asked with a suggested default; Alex took every default and approved the plan, draft copy included.
1. **A page of its own** (`/guide`), not a sheet: a modal on iPhone (swipe down or Close), a full page on a phone-width browser, and a panel over the page at laptop width with Escape to close, exactly like Search. A bottom sheet tops out at 88% of the screen and 380px wide on a laptop, which is cramped for twelve sections.
2. **Sections, as drafted:** the word list first (it's what confused people), then the everyday loop in the order someone meets it: Capture → Today and Upcoming → Plan it → Start Mode and "I'm stuck" → Declarations → Times and reminders → Repeats → Changing a task → Notes → the Morning Briefing → your Passport → Search. One scrolling page, no accordions (screen readers on the web don't hear `aria-expanded` yet, `DECISIONS.md`), no contents list (each section is two to four lines).
3. **Also in Settings:** a "How to use ProcrastiNation" row in a new Help card at the top of Settings. The Passport tab has the Settings button but no magnifier, so this is its way in.
4. **The Citizenship Application doesn't link to it.** It's already 11 pages and ends on a required save; the "?" sits on Today, where everyone lands after it.
5. **Only what works today.** Nothing on State of the Union, Town Hall, payments and Pro, syllabus import or Upcoming's repeat previews; each section gets a line when its feature ships. No prices or plan counts either, since beta Pro ends on November 15.

Technical choices (mine; say if you disagree):
- The "?" is a circled question mark drawn as a new `help` stroke icon (never an emoji), to the left of the magnifier on Today, Upcoming and Territories. Both buttons get a real 44 × 44 box (`t.hitTarget`) with negative margins so the eyebrow row doesn't grow; the magnifier was 36 × 36 with an 8px `hitSlop`, which React Native Web ignores. Its label is "How to use ProcrastiNation".
- Copy is `guide` in `nation.ts` (beside `voice`, so it can reuse its strings): the word list and sections as data, with a `web` flag where the iPhone and the web differ (press and hold vs right-click, where reminders ring, ⌘K). Names come from `names` and `actions` (`names.customs`, `actions.planIt`) so a rename can't leave the guide behind.
- A core test checks the guide's copy: no guilt words ("overdue", "late", "failed", "lazy"), "Plan it" spelled as `actions.planIt`, and every nation name the brief lists has an entry in the word list.
- No new tables, storage keys or network calls. Nothing new is collected, so the privacy policy doesn't change.

## Draft copy
Everything below lives in `guide`. Where the web differs, the web's words are in brackets. As drafted and approved; the shipped wording, with the code review's corrections, is in `nation.ts`.

**Title:** How to use ProcrastiNation
**Lead:** ProcrastiNation breaks big things into steps small enough to begin, then nudges you when it's time. No guilt, no lectures. Just the next small step.

**Our words, in plain words**
- **Customs:** Your inbox. Anything you capture with no day and no territory waits here until you give it a day or file it.
- **Territories:** Your areas, like a class, a job or home. Each keeps its own tasks and notes.
- **Task:** One thing to do. It can have a day, a time, a due date and a repeat.
- **Plan:** A task that Plan it has broken into steps. The steps live under their task, and Today shows the plan as one row.
- **Step:** One piece of a plan, usually a few minutes long.
- **Note:** Lecture notes, lists, ideas. Any line can become a checkbox that's a real task.
- **Plan it:** The AI button. It turns a big task into a plan.
- **Start Mode:** One step and a short timer. Starting is the win.
- **Declaration:** A start time you pick and sign. A reminder rings then.
- **Morning Briefing:** A minute to sort whatever carried over from before today.
- **Passport:** Your page: your stamps, your rank and the Declarations you kept. Settings live here too.
- **Stamps:** Ink stamps for starting. Proof, on the days it doesn't feel like it, that you're moving.

**Capture anything**
Tap + [Capture] and type it the way you'd say it. Days, times and repeats are read from the words:
- `Essay due fri` → due Friday
- `Dentist tomorrow 3pm` → tomorrow, with a nudge at 3 PM
- `Gym every mon and wed 6pm` → repeats Mondays and Wednesdays
- `Lab report #chem` → filed in your Chem territory

No day in the words? Tap Today, Tomorrow or Pick a date beside Due, or just Add it: it waits in Customs. Switch to Note at the top for anything longer.

**Today and Upcoming**
Today is what's on for today, with your next small step at the top: tap Start on it. Anything from before today that's still open rolls forward to today, with no late marks. Upcoming shows the days ahead, with a calendar to jump to any day.

**Plan it**
Plan it shows on tasks that sound bigger than one sitting, and in any task's menu. It asks a question or two, then breaks the task into steps a few minutes long, spread out up to its due date. Change, add or reorder any step, or Re-plan the rest. Move a step to a later day and you'll be asked whether the rest of the plan should move too. Repeats don't get plans.

**Start Mode and "I'm stuck"**
Start opens Start Mode: one step and a short timer. Stop when it ends, or keep going; every start counts, finished or not. Tap I'm stuck, say what's in the way, and you'll get a two-minute way in, or a breather first. Settings → Start Mode sets the timer.

**Declarations**
Open a task and tap Declare, or press and hold it [right-click it] and choose Declare a start. Pick a day and time, then sign. Deciding exactly when you'll start makes starting likelier. A reminder rings then, and starting on time is a Declaration kept, recorded in your Passport.

**Times and reminders**
Give a task a time and it rings then. The first time, you'll be asked whether you want nudges. On iPhone a reminder has Start 5 min, Snooze 10 min and Done. [In a browser, reminders ring while the browser is open, with Start 5 min and Snooze 10 min.] Your nudge tone (Diplomat, Drill Sergeant or Roast) is in Settings, along with the reminders switch.

**Repeats**
Type it: `every day 7am`, `every weekday`, `gym tue/thu 6pm`, `walk the dog every M/W/Sat`. Or open the task and choose Repeat: Pick days… ticks the exact days, and Never stops it. A repeat shows on its next day, and comes back after you check it off.

**Changing a task**
Tap a task to open it and change When, Due, Repeat, its territory, its estimate or its notes. To rename it, tap the button beside its title, or just type over the title. Press and hold any task [right-click any task] for Start, Declare a start, Plan it, Move to…, Rename… and File in….

**Notes**
Switch the + sheet to Note, or open Notes in Territories. A note's first line is its title. To make a line a task, put the cursor on it and tap the checkbox at the top [or press ⌘⇧L]: it shows on your day, and ticking it in either place ticks both.

**The Morning Briefing**
When something from before today is still open, a card on Today offers to sort it: Today, Pick a day, or Let it go, which takes the date off and never deletes anything. With ten or more, it suggests three for today and lets the rest wait.

**Your Passport**
Stamps land for your approved application, your first Declaration and your first start, and every small step you finish adds to your count. Your rank grows with starts, not finishes. The sliders at the top open Settings: your name, nudge tone, Start Mode's timer, when your day ends, Night or Day, and your account.

**Search**
Tap the magnifier to find any task or note, finished ones too. Add #name to look in one territory. [On a computer, ⌘K (Ctrl+K) or / opens it from anywhere.]

**Consistency with the site** (noted, not changed in this PR):
- The site's How it works says "Start for five minutes"; Start Mode's first stretch is 2, 5, 10 or 25 minutes depending on the Application's "What stops you" answer and Settings. The guide says "a short timer".
- The site's free list says "Two AI plans a month"; during beta Pro there's no monthly limit. The guide leaves plan counts out.
- How it works says the planner makes "steps a few minutes long"; only the first is (2–5 minutes), and the rest are about one sitting each (15–60 minutes, `apps/site/lib/prompts/plan.js`). The guide says "the first just a few minutes long".
- Otherwise the guide repeats the site's own phrases (the hero's lead, Plan it's "spread out up to your deadline", the Passport's "Proof, on the days it doesn't feel like it, that you're moving", the Briefing's "lets the rest wait").

## Files to create or modify
| File | Action | What changes |
|---|---|---|
| `packages/core/src/nation.ts` | modify | `guide`: open label, eyebrow, title, lead, the word list, sections (some taking `web`), Close |
| `packages/core/test/guide.test.ts` | create | No guilt words; every listed nation name has an entry; Plan it's spelling |
| `apps/app/src/app/guide.tsx` | create | The guide: a page on phones, a panel at laptop width; Close and Escape |
| `apps/app/src/app/_layout.tsx` | modify | The `guide` route in the signed-in stack (modal on iPhone, transparent modal on web, like Search) |
| `apps/app/src/components/header-buttons.tsx` (was `search-button.tsx`) | modify | `HeaderButtons` (the "?" and the magnifier, 44 × 44 each), `openSearch` and `openGuide` |
| `apps/app/src/app/(tabs)/index.tsx`, `upcoming.tsx`, `territories.tsx` | modify | `<SearchButton />` becomes `<HeaderButtons />` |
| `apps/app/src/components/icon.tsx` | modify | A `help` glyph (a circled question mark) |
| `apps/app/src/app/settings.tsx` | modify | A Help card with the guide's row |
| `CHANGELOG.md`, `docs/architecture.md`, `STATUS.md` | modify | In users' words; the new route and file; the plan to shipped |

## Phases
1. **Copy and test:** `guide` and `guide.test.ts`. `npm run core:test`.
2. **The guide and the "?":** the route, the screen, the icon, the header buttons, the Settings row. `npm run app:check`. Checked in the browser pane at phone (375) and laptop width, Night and Day: open the guide from the "?" on each of the three tabs, read every section, close it with Close, the scrim and Escape; the Settings row. On iPhone the route is a plain modal like the task page, so the Simulator isn't needed for this; the next TestFlight build covers it.
3. **Docs and PR:** the code-reviewer subagent, CHANGELOG, architecture, STATUS, this plan to `shipped/`, then a PR.

Needs Alex: a signed-in staging session in the browser pane, if the pane doesn't already have one (Claude doesn't create accounts on staging).

## Data and copy
No tables, columns or storage keys. All copy in `guide`, in the no-guilt voice: nation names for places and rewards, plain verbs on buttons, "Plan it" for the AI button. Nothing new is collected, so the privacy policy stays as it is.

## Risks
- **The guide drifts from the app** as features change. Mitigation: names come from `names`/`actions`; the test catches guilt words; each feature's plan template gets no new step, but `docs-keeper` already updates copy after shipping, and this plan's Done list names the guide in CHANGELOG so it's findable.
- **Upcoming's repeat previews** (another session's work) changed how repeats show there. They shipped while this PR was open (PR #31), so Repeats gained a line: Upcoming shows each turn in the week ahead, and later ones read "Repeats · opens after Mon" (core's `previewLine`).
- **Two icons on the eyebrow row** at 320px wide: the date label on Today is short ("FRI · 16 OCT"), and Upcoming's and Territories' eyebrows are one word, so both fit.

## Done when
- [x] Alex has answered the questions above and approved this plan (2026-10-16).
- [x] `npm run core:test` and `npm run app:check` pass.
- [x] In the browser pane, at phone and laptop width, Night and Day: the "?" opens the guide from Today, Upcoming and Territories; every section reads correctly; Close, the scrim and Escape close it; the Settings row opens it.
- [x] The "?" is announced as "How to use ProcrastiNation" and its box is at least 44 × 44.
- [x] The code-reviewer subagent has run and its findings are handled.
- [x] CHANGELOG, `docs/architecture.md` and STATUS are updated; this plan moves to `docs/plans/shipped/`.
- [x] A PR is open with CI running (PR #32).
