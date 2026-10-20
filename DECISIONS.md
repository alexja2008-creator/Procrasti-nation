# ProcrastiNation 2.0: Decisions

Why the code is the way it is. It's written for an outside reviewer (another AI or a person) so they can tell a deliberate choice from a mistake, and for Alex, who decides between the two when a reviewer and Claude disagree.

There are two kinds of decision here, and they're open to challenge in different ways:
- **Alex decided** (product calls). If you think one is wrong, say so as a *challenge*, not a bug.
- **Claude chose** (technical calls made while building). These are fair game: if one is wrong, say why and what breaks.

More detail: `CLAUDE.md` and each folder's own `CLAUDE.md` (rules and patterns), `docs/architecture.md` (layout and data model), `STATUS.md` (what's live and what's next), `docs/archive/handoff-2026-10.md` (the full build history), the plan files in `docs/plans/` (one per feature, each with its decisions), `supabase/v2/README.md` (the database migration), and `apps/site/evals/*/README.md` (the AI quality gates).

---

## For reviewers: what's useful

**Wanted most:** bugs, security holes, data loss, and edge cases that break things for a real person. Code that's slow at real sizes. Places where iPhone and web behave differently when they shouldn't.

**Please give each finding:**
1. The file and line.
2. What's wrong, in a sentence.
3. A concrete way it fails: "a person does X, then Y happens." If you can't name one, it's probably a style preference; list those separately at the end.
4. How sure you are, and how you'd check it (a test, or steps in the app).

**Please don't edit code.** Report only; Alex brings the findings back to Claude, who checks each one against the code.

**Before calling something redundant or over-built,** check the "Looks wrong, isn't" section below. A lot of the defensive code exists because the simple version failed once.

---

## Product decisions (Alex decided)

**Who it's for**
- Students first, as individuals. Adults come later.
- The goal is to replace Apple Notes and Reminders on a student's phone, with the AI planner as the reason to switch.
- **A fresh start at cutover (2026-10-12).** v1 has one real user (Alex), so nothing is migrated: `supabase/v2/04_fresh_start.sql` deletes every account, Alex's included, and citizen numbers start again at 000001, so everyone meets v2 through the Citizenship Application. `02_backfill.sql` stays in the repo, unused, and untested since 2026-10-16.
- **Not a school or LMS product.** The schools tables (`organizations`, `classes`, `assignments` and so on) and the policy that lets teachers read students' assignment tasks are leftovers from an abandoned idea. They're still in production and are left alone on purpose: don't propose features or clean-up for them. Dropping them would be its own decision. A security hole in them still counts, since they're live.

**Platforms**
- An App Store app is required (Expo + React Native, with small Swift add-ons).
- The web has every core feature the iPhone has, from the same codebase. Layout adapts to a laptop; features don't drop.
- **Night passport is the default look** (Alex, 2026-10-13: a US passport is navy). Settings → Appearance → Theme offers Night, Day and Match my device, saved per device so it applies before sign-in too. The marketing site is always night too (no toggle there yet).

**The AI planner ("Plan it") is the heart of the product**
- Plans are built by Claude Sonnet. Haiku is used only for small jobs where an eval proved it's good enough. It failed both the plan eval (2/30) and the "I'm stuck" eval (8/16).
- Any change to a prompt or model must pass its eval first: `apps/site/evals/plan-quality` (plans) and `apps/site/evals/unstick` ("I'm stuck"). Findings about prompts are welcome; changes to them are gated.
- Not every task gets a plan. Quick add is instant and uses no AI. The "does this need a plan?" check (`packages/core/src/plan-offer.ts`) runs on the device with no AI call, because it runs on every keystroke.
- **What the planner may suggest about reminders** (Alex, 2026-10-15, after Plan it told a family tester to set a phone alarm for a repeating walk): it should not tell people to set alarms or use another reminder or to-do app, since PN reminds them at a time they pick. Putting an appointment in their calendar, or checking a calendar, is fine. The prompt rule for this **failed the plan-quality eval** (27/32 against 31/32), so the prompt is unchanged, and Alex chose to keep only the eval's new check (2026-10-16). The rule is parked. A second try, and why the first lost, is in `docs/plans/shipped/dates-and-repeats.md`, Phase 5. Meanwhile the app keeps Plan it away from repeats, which was the testers' case.
- **A repeat never gets a plan** (Alex, 2026-10-15): Plan it is held back for repeats everywhere, the + sheet included. A plan's steps are one-offs, so on a repeat they'd show "7/7 · Mark plan done" on every later occurrence. The Application's Oath always makes a plan, so a repeat typed there plans one go (its repeat words leave the title; a typed day or time stays).
- The button always reads **"Plan it"** (Alex rejected "Make it smaller" and "Want a plan?").

**Voice: no guilt, ever**
- Procrastination is mostly short-term mood repair, and shame feeds it (Pychyl and Sirois; Wohl, Pychyl & Bennett 2010). So nothing in the app says "you failed", "overdue" or "disappointed".
- Missed things roll forward to today with no red and no overdue styling. That's deliberate, not a missing feature.
- Even the Roast nudge tone jokes about the task or the situation, never the person.
- Copy that breaks this is a real finding.
- Places and rewards get nation names (Passport, Customs, Territories, Stamps). Buttons stay plain (Start, Done, Snooze).

**Never finish a task by accident**
- Web notifications have **Start 5 min** and **Snooze 10 min**, and deliberately **no Done**, because a click meant to dismiss could land on it. On iPhone, Done sits behind press and hold, so it stays.
- Row actions (Start, Plan it, Move to…, File in…) live behind press and hold (right-click on web), with a permanent hint under the list. There's no Start button on every row.

**Accounts and sign-in**
- New people answer the Citizenship Application signed out. An **anonymous account** (Supabase anonymous sign-in) opens just before the Oath, so nobody waits on an email.
- **Saving the passport is required** (Alex, 2026-10-15, after family testers tapped Later and never came back): Save your passport is the Application's last page, with no Later, and an unsaved passport can't reach Today until a save link is out (`docs/plans/active/required-save.md`). Sending the link is enough; confirming it isn't required to carry on. Skip skips the questions, not saving. When sending fails on our side (a 5xx), they're let in for that run of the app, so a mail outage never locks anyone out. The iPhone gets the same rule; Sign in with Apple becomes its first way to save before App Store review (guideline 5.1.1(v)).
- Passwords need at least 6 characters (the same as v1 and Supabase's default).
- New accounts confirm their email before the first sign-in.
- Usernames: 3 to 20 characters, lowercase letters, numbers and underscores (v1's rule).
- Sign-in links and texted codes work for **existing accounts only**. An unknown address or number gets the same "on its way" message, so nobody can test which accounts exist.
- **Sign out signs out this device only.**
- **Deleting an account is immediate** (no grace period) and confirmed by typing DELETE, which works for accounts with or without a password. Download your data is one JSON file.
- Texted codes are built but hidden until Twilio is paid for.
- **An age check before any account** (COPPA; 2026-10-14, carried over from the legal audit's v1 fix): the Application asks for a date of birth right after the name (page 2 of 11), before the anonymous passport opens. It's a neutral age screen, as the FTC asks: blank fields, nothing on the page or in the message says what age is needed ("Sorry, you're not eligible."), and the date is checked on the device, never kept or sent (the device keeps only the result). Under 13, the device is turned away for good, so a different year can't just be typed in (sign-in still works for existing accounts), and the Application's answers and name on it go. Someone signed in when they fail it (an account made with Apple or Google, which the sign-in screen can create) has that account deleted. Skip only shows once the check is passed, so nobody skips past it.

**Pricing**
- Free tier: 2 AI plans per 30.5-day window, counted from the account's creation (not calendar months).
- **Beta Pro** (Alex, 2026-10-15, after a family tester hit the free limit on his third plan): until the close of November 15, 2026 in New York, every account, unsaved passports included, plans without the monthly limit, so testers can try everything. The 20-a-day cap still holds. `BETA_PRO_UNTIL` in `packages/core/src/account.ts`; the plan route checks `inBetaPro()`.
- A 10-day Pro trial is counted from the account's creation date. Anonymous accounts get no trial.
- "I'm stuck" is free for everyone (20 a day), because Start Mode is what keeps people.
- Plans are capped at 20 a day for everyone, the trial and Pro included (Alex, 2026-10-13): no person needs more, and it stops one account from running up the AI bill. "Unlimited" means no monthly count; the Terms allow usage limits. Dating steps is capped at 60 a day.
- Planned, not built yet: a required 7-day trial with the payment method taken up front; cancelling keeps the free tier.
- The web launches free-only (2026-10-12): payments arrive with the App Store version through RevenueCat (which can take web payments through Stripe too). v1's Stripe checkout, portal and webhook retire at cutover.
- **Renewal terms next to every subscribe button** (California's auto-renewal law, ROSCA, Apple 3.1.2; the legal audit, 2026-10-09): the amount charged, how often, that it renews automatically until cancelled, how to cancel, and when a trial turns into a paid subscription, right by the button on the paywall and on the web's checkout. Nothing is sold yet; it's part of the paywall's build.
- Prices (Alex, 2026-10-13; drafted in App Store Connect): **$4.99/month** (product `1A`), **$29.99/year** (`1B`), a **founding price** shown as "save 50%" against monthly (12 × $4.99 = $59.88, a price anyone can pick; the yearly billed amount stays the most prominent price, Apple 3.1.2). No made-up "was $49.99": a reference price nobody pays is a fake markdown. "Founding" is a promise: if the yearly price goes up later, it goes up for new subscribers only (App Store Connect: keep the current price for existing subscribers). Revisit after launch, **$12.99 for 3 months**, called Quarterly (`1C`; not "Semester", since a semester outlasts 3 months and the plan would end before finals). Down from v1's $7.99/month: $4.99 is an impulse buy for a student, $7.99 an instant turn-off.

**Legal pages** (`apps/site/app/privacy`, `/terms`; Alex, 2026-10-12)
- **The site's fonts are self-hosted** (`next/font` in `apps/site/app/layout.jsx`), never loaded from Google Fonts or another font CDN: a German court fined a site for sending visitors' IP addresses to Google that way (LG München, 2022). The app's fonts ship inside it.
- Run by Alex Anderson, New York City; contact procrasti.nation.marketing@gmail.com; 13 and older; New York State law; effective at launch (October 13, 2026: Alex moved the launch up from October 25, then from October 16, once everything was ready); revised October 14, 2026 (the policy's name and age-check paragraphs; Alex moved `LEGAL_EFFECTIVE`, which both pages share); revised October 15, 2026 (saving the passport before continuing past the Application: policy §1.1, terms §3.1; wording approved by Alex in PR #19).
- The privacy policy promises deleted data is gone from backups within 7 days (there are none today). Turning on longer backups means changing the policy first.
- Formal wording, not conversational (Alex, 2026-10-13): numbered sections, defined terms for the app's own names (passport, territories, Start Mode, Declarations). Disputes go to the state and federal courts in New York County, small claims allowed; **no arbitration** (Alex: simpler, and an arbitration clause needs careful drafting to hold, more so with users under 18). Under-18s use it with a parent's or guardian's consent. Liability is capped at the greater of what was paid in 12 months or US$50 (a $0 cap on a free app is more likely to be thrown out). The Terms carry Apple's minimum terms for an app's license (section 9), which ask for a mailing address: the pages say only "New York, New York" (a PO box would do, or keep Apple's standard license in App Store Connect).

**Email**
- v1's daily nudge email retires at cutover (2026-10-12): v2 nudges through notifications.
- **Every marketing email carries a postal address and a one-click unsubscribe** (CAN-SPAM; the legal audit, 2026-10-09). Nothing sends one today (Supabase's sign-in emails are transactional). State of the Union's footer needs the address from an env var (a PO box or private mailbox will do, so a home address never lands in git) and `lib/unsubscribe.js`'s signed link with `List-Unsubscribe` headers.
- The Weekly Citizen Report becomes **State of the Union, every Monday morning** (2026-10-12; the original v2 plan said Sunday evening). Not built yet; it comes after the web launch.

**Reminders**
- Permission is asked the first time a task gets a time ("Want a nudge at 6:00 PM?"), never on launch.
- Snooze rings again in 10 minutes. The task itself doesn't move.
- Every device where reminders are on rings, each with its own off switch.
- A web reminder that can't be delivered within an hour is dropped (a 6 PM nudge at 9 PM is noise).
- No "send a test" button.

**Lists and features**
- Upcoming: the next 7 days always, then only busy days up to 8 weeks, then Later. **A repeat shows each of its turns in those 7 days** (Alex, 2026-10-16, replacing "a repeating task shows once": a Mon/Wed repeat hid Wednesday until Monday was done, though Wednesday's reminder would ring). Its next turn is the real row; later ones are previews, with a repeat mark instead of a checkbox, the line "Repeats · opens after Mon", and a notice in that line when the mark is tapped (in the row itself, so nothing shifts under the finger). A preview has no row menu and holding it does nothing, since Move to… on Wednesday would move Monday's turn; tapping it opens the task. Beyond the 7 days a repeat still shows once, so a daily habit doesn't make 8 weeks look busy. The dots count previews. Today is unchanged. Repeats stay one row each: a row per occurrence, or a log of finished turns plus skipped dates, were weighed and left for later (`docs/plans/shipped/repeat-previews.md`).
- Deleting a territory sends its tasks back to Customs (undated) or leaves them on their days, with Undo.
- Morning Briefing: repeats are left out (a missed repeat is already one item). Let it go takes the date off; it never deletes. Re-spread uses no AI.
- Morning Briefing, long lists (2026-10-12): 10 or more things to decide about (a plan counts once) opens on Pick three, with three suggested for today (deadlines still ahead, then the oldest) and the rest left carried over: nothing is moved, undated or spread unasked. Putting them on today rests the card for the day (Undo brings it back). Move all to today isn't offered at 10 or more.
- A "Declaration signed" stamp for the first Declaration ever (Alex, 2026-10-13: a new Passport looked bare with Approved alone). The Application's first Declaration earns it, so a new citizen starts with two stamps. Undoing that Declaration keeps the stamp. Round stamps sit in the order earned, so it usually lands left of Approved.
- Notes are capture-first, not an Apple Notes clone. A note's title is its first line. A checklist line is a real task. Deleting a note deletes its checklist tasks, with Undo.
- Search doesn't tolerate typos and doesn't search territory names (both possible later).
- **Renaming is findable** (Alex's plan, 2026-10-15, after family testers never found that a task's title can be typed over): a button beside the title on the task page focuses it (the rename glyph, since Declare's pencil sits just below), the title is underlined on hover and while it's typed in, and the row menu has Rename… (a one-field sheet, the title selected).
- **A repeat's days are picked, and changed, in the Repeat sheet** (same plan): Pick days… opens seven toggles, Monday first, set from the repeat's days or the task's own day. A repeat on its own days shows ticked there, so a one-day choice never quietly drops days, and no days can't be saved (Never stops a repeat). Mon–Fri is the same rule as Every weekday, and "every 2 weeks" stays. When a repeat's weekdays change, typed or picked, it lands on the first new day from today, or from tomorrow if it already sat after today (today's turn is done), and an every-other-week repeat keeps its weeks. Saving the same rule again moves nothing. A new repeat starts on or after the task's own day, never on a day already gone; a monthly one keeps its day.
- **When a plan's step moves later, the app asks whether the rest should follow** (Alex, 2026-10-15, after a family tester moved step 1 to Monday and the next steps stayed on Saturday and Sunday). After When, Move to… or a Declaration puts a step on a later day, a notice asks "Move the rest of the plan too?" with **Move them**, which moves every open, dated step after it by as many days, keeping their times, with one Undo. Never automatic. None lands before the moved step or the step ahead of it, so a plan already out of order comes back into order. The deadline never moves on its own: steps that would pass it spread out up to it (none earlier than it already was), and if the step itself is past it, the rest go one a day after. A later step with its own signed Declaration stays put. After a Declaration, the ask replaces its Undo, since Undo beside a yes/no question reads as "no". Moving a step earlier doesn't ask, nor does the Morning Briefing's Pick a day (Re-spread covers that). Plan it starts a task's steps on its When day when that's after today (in the app, no prompt change).
- **Days are picked from Today, Tomorrow or the calendar, everywhere** (Alex, 2026-10-15, after a family tester picked "Next week" for a plan whose later steps then came before it): When, Due, Move to…, the Morning Briefing's Pick a day, the Declaration (which now has a calendar, from today on) and the Oath offer Today · Tomorrow · Pick a date (and No date where a day is optional), plus typing where a typed field exists. This weekend, Next week and In a week are gone. The Oath's "When is it due?" has nothing picked at first.
- **Times: a wheel on the iPhone, an hour grid on the web** (Alex, 2026-10-15; the two differ on purpose). Other time used to be a sideways strip of times that a mouse couldn't scroll. On the web it's now 6 AM to 11 PM as chips, then :00 :15 :30 :45: two or three clicks or key presses for any quarter hour, no scrolling. On the iPhone it's iOS's own wheel (`@expo/ui`'s DateTimePicker, already in the build through expo-router), any minute; it opens on 6 PM (or the first quarter hour still ahead) and picks it, so what's shown is what's saved. Times already gone today are left out of a Declaration on both.
- **The + sheet asks for a due date with taps** (Alex, 2026-10-15, after a family tester skipped the Application and couldn't find how to date a task): Due · Today · Tomorrow · Pick a date under the input, nothing picked, so Enter still adds at once (to Customs when there's no date). A tap sets the deadline (`dueOn`), so Plan it has one to plan back from; a day, deadline or repeat typed in the text wins, and the row steps aside. A time typed alone ("dentist 3pm") goes with the picked deadline. A repeat with no time shows a line saying a time brings a nudge each time (not a button).
- **Two or more days mean a weekly repeat, with or without "every"** (Alex, 2026-10-15): "walk the dog on Mondays, Wednesdays and Saturdays", "gym tue/thu" and "every M/W/Sat" repeat, starting on the first matching day ("Starts Sat"). One day stays a one-off ("call mom monday") unless it's said with every/each ("each sunday"), as a plural after "on" ("on tuesdays"), or as a plural before a time ("gym tuesdays 6pm"). Letter codes count only after every/each, one per day between separators ("M/W/F", "T/Th"; a lone T only beside Thursday) or as a run people write ("MWF", "TTh"), and "SAT" in capitals never counts, so "Work on MWF schedule", "Check every sum" and "SAT exam" stay titles. Days after "due", "by", "before", "between" and the like are deadlines or ranges, not repeats. A note's checklist line only repeats with every/each or "daily", since nothing on the line shows a misread before it's saved. The grammar is `packages/core/src/quick-add-repeat.ts`.
- **Start Mode's timer runs for a step's estimate** (Alex, 2026-10-20: "if a step is estimated to take 30 minutes, the timer should start at 30"). Every step of a plan counts down from its estimate, the first included (the planner keeps that one to 2–5 minutes). With no estimate, a first step gets the person's start length (Settings, or 2/5/10/25 from what stops them; not capped at 5) and a later step a 25-minute timebox. A task that isn't a step keeps the start length, whatever its estimate. A reminder's Start 5 min still starts 5 and "I'm stuck" still 2. No timer runs past 3 hours, since `start_sessions.planned_minutes` takes 1–180 (`startMinutesFor` in `packages/core/src/start-mode.ts`). A timer over 25 minutes has its own words in each tone ("Thirty minutes for this step. Settle in.", then "Thirty minutes in. You stayed with it."). The plan: `docs/plans/shipped/step-timers.md`.
- **A plan is one row on Today** (Alex, 2026-10-14): its steps sit behind Show steps, and it counts once ("Two things today", not "Fourteen"), in the morning list too. The row shows progress ("2/7") instead of a checkbox, so one tap never finishes a whole plan; once every step is done it asks "Mark plan done" (the plan never finishes itself), and a notice asks the same right after the last step is checked off in the app. **Start on a plan starts its next open step** (a reminder's Start 5 min had timed the plan, with no step to read). **Show steps keeps a plan's finished steps** (Alex, 2026-10-20: seeing what's done, and which step came last, is the context for picking it back up): every finished step, from any day, stays in the list in plan order, struck through and checked, with its time (today) or "done Sat 17 Oct" (earlier). Its checkbox undoes it, as a finished task's does on Today; a step un-checked there stays listed while Today is open, even when its day is later, so the row never vanishes under the finger. Open steps are listed as before, and the toggle counts only them ("Show steps (2 for today)", or just "Show steps" when none are left for today).
- **The Application asks what to call you, right after Welcome** (Alex, 2026-10-14): a first name is required to go on, a last name optional, both changeable in Settings → Name. Before this, only Sign in with Apple gave a passport a name, so email and anonymous passports read "PN<CITIZEN<<". The name lives in the auth profile's own fields (`given_name`, `family_name`, `full_name`, the ones Apple fills), so only the person sees it; it never goes on `profiles`, which anyone can read. It's for display only: nothing decides access from it. The privacy policy says it's collected.
- **Every day ends at midnight unless the person picks a later end** (Alex, 2026-10-14). Night owl used to end the day at 3 AM; at 1 AM Wednesday Alex saw Today still on Tuesday, with nothing left on it, and took it for a bug. Hours now sets only the morning list's time. A later end (up to 6 AM) is chosen only in Settings → Day ends at, so the app's date differs from the clock only when someone asked for it. Picking an Hours answer in Settings resets it to midnight. Considered and left for later: keeping yesterday open after midnight while its tasks are unfinished.
- **The syllabus-import route is off** (Alex, 2026-10-15): `/api/parse-syllabus` answers 404 (`SYLLABUS_IMPORT_ON = false` in `apps/site/app/api/parse-syllabus/route.js`) until syllabus import comes back to v2. Nothing in the app reaches it, and left on, any session could send files to Claude with no per-person cap. Its code stays. **When syllabus import returns, turn the route back on, all in one PR:**
  1. A daily cap through `logAndCount` (`apps/site/lib/limits.js`), with a client made from the session's token as in `unstick` (the route doesn't make one today).
  2. A new kind in both `ai_requests_kind_check` constraints in `supabase/v2/01_schema.sql` (and in `supabase/v2/test/migration.test.mjs` and `docs/architecture.md`), applied to production by Alex before the flag ships.
  3. Decide whether unsaved passports may use it: a per-person cap starts fresh with every new passport.
  4. The privacy policy's section 3 lists syllabus files among what goes to Anthropic, and `LEGAL_EFFECTIVE` moves.
  5. An eval in `apps/site/evals/` (new AI features get one).
  6. Then set `SYLLABUS_IMPORT_ON` to true.
- Focus Pods (live video) were dropped: moderating live video wasn't worth the liability. Town Hall will only ever be an anonymous count of people working. **There's nothing one person can say to another anywhere in the app.**

**How changes ship**
- **CI isn't a required check on `main`** (Alex, 2026-10-14). Every pull request still runs `.github/workflows/ci.yml` (core, db and site tests, the app's type check and lint) and nothing red gets merged; GitHub's branch settings just don't enforce it.
- **Tests are kept for six reasons only** (Alex, 2026-10-16, after core's tests grew from 15 to 166 in two weeks). A test is required when breaking what it checks would quietly: (1) let someone see or change another person's data, or forge a server-only field or signed token; (2) lose or rewrite data (a save, an undo, a bulk move, the export, account deletion, paging); (3) break the age check, required saving, plan limits or beta Pro; (4) ring a reminder at the wrong time, twice, not at all, or with Done; or (5) break a written rule that points at a test (`DESIGN.md`). Kept as a nice to have, (6): what every person sees most (Today, the + sheet, the lock screen's words, the Plan it pill, Start Mode's clock, the Application and saving the passport, Upcoming), with a new test of that kind only after the bug has reached a real person. Copy, labels, layout and ordering get no tests otherwise. The audit: `docs/plans/shipped/test-audit.md`.

---

## Looks wrong, isn't (Claude chose)

Each of these looks redundant, over-built or odd, and each exists because the simpler version breaks something. Challenge the reasoning if it's wrong; please don't report the code itself as unnecessary.

### Sign-in and accounts
- **The tabs redirect to `auth/new-password` while `recovering`** (`apps/app/src/app/(tabs)/_layout.tsx`), although `auth/callback` already does. Signing in swaps the signed-out stack for the signed-in one (`_layout.tsx` wraps it in `SignedInProviders`), and on iPhone that drops the callback screen mid-exchange, so a reset link opened while signed out landed on Today without asking for the new password (TestFlight build 1, 2026-10-13). Web rebuilds from the address bar, so the callback catches it there.
- **`signOut({ scope: 'local' })`** in `apps/app/src/auth/sign-out.ts`. supabase-js's default signs out *every* device, so leaving a lab computer would sign you out of your phone.
- **`shouldCreateUser: false`** on sign-in links and texted codes (`apps/app/src/auth/sign-in.ts`, `auth/passport.ts`). Those are for existing accounts; new people go through the Application.
- **The trial is counted from `user.created_at`** (`apps/site/lib/trial.js`), never from `user_metadata`, because users can write their own metadata. A v1 bug let people give themselves endless trials that way.
- **The Stripe columns on `profiles` are server-only.** A trigger rejects users setting them, and the API can only read the public columns (`supabase/migrations/profiles_billing_*.sql`); people read their own status through `my_subscription_status()`. `profiles` is publicly readable.
- **Private settings live in `user_settings`, not `profiles`**, for the same reason.
- **A new username waits in `user_metadata.pending_username`** until the email is confirmed, so nobody can claim a name with an address they don't own.
- **"Send it again" for a save link calls `updateUser({ email })` again, not `auth.resend({ type: 'email_change' })`** (`resendSaveLink` in `apps/app/src/auth/passport.ts`). It's the exact call the first send makes, which is known to work with PKCE and the Change Email Address template; the new link replaces the first. Its countdown reads `email_change_sent_at`, so every screen shares Supabase's one-a-minute limit (2026-10-15).
- **`usePassportStatus` keys its effects on `id`, `waiting` and `confirmed`, not on the user object, and throttles `refreshSession` to once in 30 s** (`apps/app/src/hooks/use-passport-status.ts`). Keyed on the user, each refresh made a new object, which re-ran the focus effect, which refreshed again: a loop for anyone with a save link out, rotating tokens until Supabase's per-IP limit refused them, and an anonymous passport whose session is dropped is lost (code review, 2026-10-15).
- **Deleting an account has no billing step** (`apps/site/app/api/account/delete/route.js`; removed 2026-10-12, Alex). v1's Stripe retired, no v2 account has a Stripe customer after the fresh start, and the Stripe keys are gone from Vercel. When payments return through RevenueCat, deletion needs its own rule (App Store subscriptions can't be cancelled for the person: tell them where to cancel).
- **`detectSessionInUrl: false`** (`apps/app/src/lib/supabase.ts`). Sign-in links use PKCE, and one callback screen (`src/app/auth/callback.tsx`) handles links, confirmations, resets and OAuth on every platform.

### Loading and saving data
- **`fetchAllPages`** (`apps/app/src/data/paging.ts`). Supabase returns at most 1,000 rows per request, and a cut-off list fails silently. An account with 1,050 old checklist lines lost its newest tasks from Today before this existed.
- **The tasks store loads only what's current** (open tasks, today's finished ones, plan steps), never history. Notes load 25 at a time, with exact counts from the `note_counts` view.
- **Settings saves check that a row actually changed** (`apps/app/src/data/user-settings.tsx`). With a dead session the request goes out signed out, row security quietly matches nothing, and the save "succeeds" without saving.
- **The first settings load is shared** (the `inFlight` map in the same file). Citizen numbers come from a database sequence, and every insert attempt uses one up, even a failed one.
- **Each task's writes go out one at a time, in order** (`queueWrite` in `apps/app/src/data/tasks-store.tsx`; notes do the same). Otherwise a quick Undo can reach the server before the change it undoes.
- **Changes show at once and roll back if the save fails** (optimistic updates), across tasks, territories and notes.
- **Start Mode saves the whole session row on every change, in order** (`apps/app/src/hooks/use-start-session.ts`), so a slow first save can't overwrite the end of the session.

### Database
- **Ownership triggers** on `list_id`, `task_id`, `parent_id` and `note_id`. A foreign key alone would accept an id belonging to *another* user's row.
- **`ai_requests` and `plan_generations` are insert-and-read only,** so nobody can reset their own count. The routes **log first, then count** (`logAndCount` in `apps/site/app/api/generate-plan/route.js`), so a burst of parallel requests can't all slip under the limit.
- **Search has no full-text (GIN) index.** Postgres can't use one under row security (`@@` isn't leakproof). Instead each search is bounded by an explicit `user_id = auth.uid()`, which the user index serves (`search_items` in `supabase/v2/01_schema.sql`).
- **`push_sends` and `push_snoozes` have row security on and no policies.** That's on purpose: only the server (service role) can reach them.
- **`save_web_push` is `SECURITY DEFINER`** so it can remove the same browser from another account (one account per browser).
- **`tasks.source` is widened, never dropped.** The teacher policy in production reads it.
- **The v1 columns (`steps`, `step_dates`, `recurrence`, `due_date`) stay** until a later clean-up migration, because the v1 site still runs on them. `02_backfill.sql` runs only at cutover; before that, v1 would show each step as its own task.
- **Soft deletes** (`deleted_at`) everywhere, so future sync has tombstones and Undo works.
- **Steps take their plan's territory when read** (`effectiveListId` in `packages/core/src/territories.ts`). Filing a plan needs no cascade of writes.
- **A note's checklist line is a token, `[[task:<uuid>]]`, in the note body,** and the task row owns the words and the done state. One source of truth, so ticking it on Today shows ticked in the note.

### Dates and time
- **Local calendar dates never use `toISOString()`** (that's UTC, so evenings land on the wrong day); they use `localDateString`. Timestamps for moments in time (`completedAt`, `deletedAt`) do use `toISOString()`, correctly.
- **Clients send `today` and their timezone to the AI routes,** so "Friday" means the person's Friday.
- **The quick-add parser is hand-written and deliberately narrow** (`packages/core/src/quick-add.ts`, no chrono-node), so titles like "Call Tom", "Study for May exam" and "Problem set 2a" aren't misread as dates.

### Reminders
- **iPhone reminders are reconciled, not tracked.** Core works out what *should* be scheduled (the next 14 days, the soonest 64, which is iOS's cap); the app compares that with what iOS has and fixes the difference. That's why finishing, re-timing or deleting a task needs no special case.
- **Each notification response is handled once** (the last 50 are remembered in `pn.reminders.handled`, `apps/app/src/notifications/responses.ts`). A response arrives either live or as the one that launched the app, and the launch one comes back after a reload; without this, the same Snooze or Start could run twice.
- **A Done from a notification is saved on the phone first and sent later** (the done-outbox). iOS suspends the app right after the tap; a Done the server refuses is dropped so it can't block the rest.
- **The Swift add-on** (`apps/app/modules/reminder-actions/`): with the app closed, iOS hands Done and Snooze only to native code; the JavaScript never starts.
- **`apps/app/plugins/with-scene-lifecycle.js`**: iOS 27 requires the scene life cycle, and Expo SDK 57's generated app delegate doesn't adopt it.
- **The Web Push sender claims each reminder in `push_sends` before sending it** (`apps/site/app/api/cron/push/route.js`), so nothing rings twice. It catches up on a missed minute for 10 minutes.
- **An unknown timezone is refused, not read as UTC** (`checkZone` in `apps/site/lib/push.js`). A wrong zone would ring at the wrong hour.
- **Snooze tokens** are an HMAC of `CRON_SECRET` with their own prefix, compared in constant time; no new secret to manage.
- **Supabase Cron runs the sender every minute,** not Vercel's cron, which runs once a day on the Hobby plan.

### Web (React Native Web)
- **`useShortcuts` listens in the capture phase** (`apps/app/src/hooks/use-shortcuts.web.ts`), because React Native Web's text fields stop key presses from bubbling.
- **Nothing relies on `onBlur` to save.** Screens use `keyboardShouldPersistTaps="handled"`, so tapping a button with the keyboard up doesn't blur the field.
- **The small casts in `apps/app/src/lib/web-styles.ts`** (`oneRowOnWeb`, `noFocusRing`, `switchThumbOnWeb`) fix web-only quirks that React Native's types don't describe.
- **`submitOnReturnWeb` next to `submitBehavior`** (Plan it's answer boxes): React Native Web reads the deprecated `blurOnSubmit`, not `submitBehavior`, so without it Return adds a new line on the web instead of moving to the next question.
- **`useAutoHeight`'s `onChange` and `onLayout` beside `onContentSizeChange`** (`apps/app/src/hooks/use-auto-height.ts`): React Native Web only reports a size when the textarea's scroll size changes, so a box that shrank on delete stayed one row tall, and a resized window never measured again. They measure the textarea itself.
- **`aria-checked` / `aria-selected` next to `accessibilityState`,** because React Native Web ignores `accessibilityState`.
- **The signed name's size is worked out from its length on web** (`webNameSize` in `signature-pad.tsx`): `adjustsFontSizeToFit` is native only, so without it a long name is cut off with an ellipsis. The iPhone still shrinks it to fit itself.

### Setup and style
- **Not an npm workspace:** the site is on React 18 and the Expo app on React 19, so each has its own `node_modules`. `packages/core` is shared through a tsconfig alias.
- **Core imports end in `.ts`,** because its tests run directly on TypeScript with `node --test`.
- **The iOS build script builds in `~/Library/Caches`** (`apps/app/scripts/ios-dev-build.sh`), because the repo used to sit on an iCloud-synced Desktop whose file attributes broke code signing (it moved to `~/PNDEV` on 2026-10-14). Building outside the repo also keeps generated native folders out of git. It stays unsigned; signed builds come from EAS Build in Expo's cloud, which never sees the iCloud attributes.
- **The site calls Claude with raw `fetch()`** (`apps/site/lib/ai.js`), not the SDK.
- **The app never holds secrets.** It gets only `EXPO_PUBLIC_*` values and calls the site's `/api/*` for anything needing a key.
- **App styling:** `StyleSheet` with design tokens, never a hard-coded color in a component, and SVG icons, never emoji. **Site styling:** Tailwind for layout, plus the night palette as CSS variables in `apps/site/app/globals.css` (the site is always night, so no `dark:` prefix and no theme ternaries).
- **`DESIGN.md` repeats the tokens** that `packages/core/src/tokens.ts` already holds, because design tools and agents read a DESIGN.md at the repo root. `tokens.ts` stays the source of truth; `packages/core/test/design-md.test.ts` fails when the copy drifts.
- **The site's ESLint was never set up;** `npm run build` is the check there.

---

## Known limits (accepted for now)

These are known and written down. Report one only if it's worse than described, or if you think it should block launch.

- **No offline mode and no live sync between devices** yet (the PowerSync trial is pending). Each device refreshes when it comes back to the foreground. The last device to save a note wins.
- **Each iPhone schedules reminders from what it last saw,** so a task finished on the web can still ring on the phone until the app is next opened.
- **The Web Push sender loads every subscribed person's timed tasks each minute.** Fine for now; at thousands of people it should store each person's next ring time instead.
- **Web reminders need the browser running** (except Safari on a Mac). Firefox and Safari show no buttons. A snooze whose send fails is dropped.
- **Search scans the person's own rows:** about 40–100 ms at 10,000 tasks on staging.
- **The morning list setting is last-write-wins** across devices.
- **Up past midnight with yesterday's tasks open** (with the day ending at midnight): the Morning Briefing card offers to sort them right away, and Not now then hides it for the rest of that day, the morning included. A daily repeat checked off after midnight moves to the day after, skipping that day's turn.
- **Upcoming:** a day near the end of the list can't scroll to the top.
- **Notes:** keys typed within milliseconds of Return can land in the old line (seen only with the Simulator's burst typing). At 320px wide, the web nav bar scrolls sideways by 8px.
- **Web screen readers** are parked. Known gaps: `aria-selected` on elements with `role="button"` (ignored by screen readers), and no `aria-expanded` on Today's Customs toggle or Upcoming's Month toggle. Native iOS VoiceOver is fine.
- **v1 boards** live in the v1 site's browser storage and can't be read from the v2 app's domain.
- **Not handled yet, needed with payments:** App Store subscriptions can't be cancelled for someone when they delete their account, and Sign in with Apple's token isn't revoked on deletion.

---

## Out of scope for a review

- **The v1 pages in `apps/site`** (`planner`, `dashboard`, `calendar`, `syllabus`, `reset-station`, `faq`, `friends`, `profile`). They keep running until cutover, then retire. Don't refactor them, but security or data-loss bugs in them still matter while they're live. The `/api/*` routes the v2 app uses are fully in scope.
- **The schools tables and teacher policy** (see above), and the retired `focus_pods` table.
- **Not built yet:** payments, Live Activities, Declarations, Town Hall, Allies, calendar and LMS integrations, offline sync.
