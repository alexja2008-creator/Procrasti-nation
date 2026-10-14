# ProcrastiNation 2.0: Decisions

Why the code is the way it is. It's written for an outside reviewer (another AI or a person) so they can tell a deliberate choice from a mistake, and for Alex, who decides between the two when a reviewer and Claude disagree.

There are two kinds of decision here, and they're open to challenge in different ways:
- **Alex decided** (product calls). If you think one is wrong, say so as a *challenge*, not a bug.
- **Claude chose** (technical calls made while building). These are fair game: if one is wrong, say why and what breaks.

More detail: `CLAUDE.md` (layout, data model, patterns), `docs/archive/handoff-2026-10.md` (state of the build, known limits), the plan files in `docs/plans/` (one per feature, each with its decisions), `supabase/v2/README.md` (the database migration), and `apps/site/evals/*/README.md` (the AI quality gates).

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
- **A fresh start at cutover (2026-10-12).** v1 has one real user (Alex), so nothing is migrated: `supabase/v2/04_fresh_start.sql` deletes every account, Alex's included, and citizen numbers start again at 000001, so everyone meets v2 through the Citizenship Application. `02_backfill.sql` stays in the repo, tested, unused.
- **Not a school or LMS product.** The schools tables (`organizations`, `classes`, `assignments` and so on) and the policy that lets teachers read students' assignment tasks are leftovers from an abandoned idea. They're still in production and are left alone on purpose: don't propose features or clean-up for them. Dropping them would be its own decision. A security hole in them still counts, since they're live.

**Platforms**
- An App Store app is required (Expo + React Native, with small Swift add-ons).
- The web has every core feature the iPhone has, from the same codebase. Layout adapts to a laptop; features don't drop.
- **Night passport is the default look** (Alex, 2026-10-13: a US passport is navy). Settings → Appearance → Theme offers Night, Day and Match my device, saved per device so it applies before sign-in too. The marketing site is always night too (no toggle there yet).

**The AI planner ("Plan it") is the heart of the product**
- Plans are built by Claude Sonnet. Haiku is used only for small jobs where an eval proved it's good enough. It failed both the plan eval (2/30) and the "I'm stuck" eval (8/16).
- Any change to a prompt or model must pass its eval first: `apps/site/evals/plan-quality` (plans) and `apps/site/evals/unstick` ("I'm stuck"). Findings about prompts are welcome; changes to them are gated.
- Not every task gets a plan. Quick add is instant and uses no AI. The "does this need a plan?" check (`packages/core/src/plan-offer.ts`) runs on the device with no AI call, because it runs on every keystroke.
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
- New people answer the Citizenship Application signed out. An **anonymous account** (Supabase anonymous sign-in) opens just before the Oath, so nobody waits on an email. They save it later with a username plus an email or a texted code.
- Passwords need at least 6 characters (the same as v1 and Supabase's default).
- New accounts confirm their email before the first sign-in.
- Usernames: 3 to 20 characters, lowercase letters, numbers and underscores (v1's rule).
- Sign-in links and texted codes work for **existing accounts only**. An unknown address or number gets the same "on its way" message, so nobody can test which accounts exist.
- **Sign out signs out this device only.**
- **Deleting an account is immediate** (no grace period) and confirmed by typing DELETE, which works for accounts with or without a password. Download your data is one JSON file.
- Texted codes are built but hidden until Twilio is paid for.

**Pricing**
- Free tier: 2 AI plans per 30.5-day window, counted from the account's creation (not calendar months).
- A 10-day Pro trial is counted from the account's creation date. Anonymous accounts get no trial.
- "I'm stuck" is free for everyone (20 a day), because Start Mode is what keeps people.
- Plans are capped at 20 a day for everyone, the trial and Pro included (Alex, 2026-10-13): no person needs more, and it stops one account from running up the AI bill. "Unlimited" means no monthly count; the Terms allow usage limits. Dating steps is capped at 60 a day.
- Planned, not built yet: a required 7-day trial with the payment method taken up front; cancelling keeps the free tier.
- The web launches free-only (2026-10-12): payments arrive with the App Store version through RevenueCat (which can take web payments through Stripe too). v1's Stripe checkout, portal and webhook retire at cutover.
- Prices (Alex, 2026-10-13; drafted in App Store Connect): **$4.99/month** (product `1A`), **$29.99/year** (`1B`), a **founding price** shown as "save 50%" against monthly (12 × $4.99 = $59.88, a price anyone can pick; the yearly billed amount stays the most prominent price, Apple 3.1.2). No made-up "was $49.99": a reference price nobody pays is a fake markdown. "Founding" is a promise: if the yearly price goes up later, it goes up for new subscribers only (App Store Connect: keep the current price for existing subscribers). Revisit after launch, **$12.99 for 3 months**, called Quarterly (`1C`; not "Semester", since a semester outlasts 3 months and the plan would end before finals). Down from v1's $7.99/month: $4.99 is an impulse buy for a student, $7.99 an instant turn-off.

**Legal pages** (`apps/site/app/privacy`, `/terms`; Alex, 2026-10-12)
- Run by Alex Anderson, New York City; contact procrasti.nation.marketing@gmail.com; 13 and older; New York State law; effective at launch (October 13, 2026: Alex moved the launch up from October 25, then from October 16, once everything was ready).
- The privacy policy promises deleted data is gone from backups within 7 days (there are none today). Turning on longer backups means changing the policy first.
- Formal wording, not conversational (Alex, 2026-10-13): numbered sections, defined terms for the app's own names (passport, territories, Start Mode, Declarations). Disputes go to the state and federal courts in New York County, small claims allowed; **no arbitration** (Alex: simpler, and an arbitration clause needs careful drafting to hold, more so with users under 18). Under-18s use it with a parent's or guardian's consent. Liability is capped at the greater of what was paid in 12 months or US$50 (a $0 cap on a free app is more likely to be thrown out). The Terms carry Apple's minimum terms for an app's license (section 9), which ask for a mailing address: the pages say only "New York, New York" (a PO box would do, or keep Apple's standard license in App Store Connect).

**Email**
- v1's daily nudge email retires at cutover (2026-10-12): v2 nudges through notifications.
- The Weekly Citizen Report becomes **State of the Union, every Monday morning** (2026-10-12; the original v2 plan said Sunday evening). Not built yet; it comes after the web launch.

**Reminders**
- Permission is asked the first time a task gets a time ("Want a nudge at 6:00 PM?"), never on launch.
- Snooze rings again in 10 minutes. The task itself doesn't move.
- Every device where reminders are on rings, each with its own off switch.
- A web reminder that can't be delivered within an hour is dropped (a 6 PM nudge at 9 PM is noise).
- No "send a test" button.

**Lists and features**
- Upcoming: the next 7 days always, then only busy days up to 8 weeks, then Later. A repeating task shows once, on its next date.
- Deleting a territory sends its tasks back to Customs (undated) or leaves them on their days, with Undo.
- Morning Briefing: repeats are left out (a missed repeat is already one item). Let it go takes the date off; it never deletes. Re-spread uses no AI.
- Morning Briefing, long lists (2026-10-12): 10 or more things to decide about (a plan counts once) opens on Pick three, with three suggested for today (deadlines still ahead, then the oldest) and the rest left carried over: nothing is moved, undated or spread unasked. Putting them on today rests the card for the day (Undo brings it back). Move all to today isn't offered at 10 or more.
- A "Declaration signed" stamp for the first Declaration ever (Alex, 2026-10-13: a new Passport looked bare with Approved alone). The Application's first Declaration earns it, so a new citizen starts with two stamps. Undoing that Declaration keeps the stamp. Round stamps sit in the order earned, so it usually lands left of Approved.
- Notes are capture-first, not an Apple Notes clone. A note's title is its first line. A checklist line is a real task. Deleting a note deletes its checklist tasks, with Undo.
- Search doesn't tolerate typos and doesn't search territory names (both possible later).
- **The Application asks what to call you, right after Welcome** (Alex, 2026-10-14): a first name is required to go on, a last name optional, both changeable in Settings → Name. Before this, only Sign in with Apple gave a passport a name, so email and anonymous passports read "PN<CITIZEN<<". The name lives in the auth profile's own fields (`given_name`, `family_name`, `full_name`, the ones Apple fills), so only the person sees it; it never goes on `profiles`, which anyone can read. It's for display only: nothing decides access from it. The privacy policy says it's collected.
- **Every day ends at midnight unless the person picks a later end** (Alex, 2026-10-14). Night owl used to end the day at 3 AM; at 1 AM Wednesday Alex saw Today still on Tuesday, with nothing left on it, and took it for a bug. Hours now sets only the morning list's time. A later end (up to 6 AM) is chosen only in Settings → Day ends at, so the app's date differs from the clock only when someone asked for it. Picking an Hours answer in Settings resets it to midnight. Considered and left for later: keeping yesterday open after midnight while its tasks are unfinished.
- Focus Pods (live video) were dropped: moderating live video wasn't worth the liability. Town Hall will only ever be an anonymous count of people working. **There's nothing one person can say to another anywhere in the app.**

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
- **`aria-checked` / `aria-selected` next to `accessibilityState`,** because React Native Web ignores `accessibilityState`.
- **The signed name's size is worked out from its length on web** (`webNameSize` in `signature-pad.tsx`): `adjustsFontSizeToFit` is native only, so without it a long name is cut off with an ellipsis. The iPhone still shrinks it to fit itself.

### Setup and style
- **Not an npm workspace:** the site is on React 18 and the Expo app on React 19, so each has its own `node_modules`. `packages/core` is shared through a tsconfig alias.
- **Core imports end in `.ts`,** because its tests run directly on TypeScript with `node --test`.
- **The iOS build script builds in `~/Library/Caches`** (`apps/app/scripts/ios-dev-build.sh`), because the repo sits on an iCloud-synced Desktop whose file attributes break code signing. It stays unsigned; signed builds come from EAS Build in Expo's cloud, which never sees the iCloud attributes.
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
