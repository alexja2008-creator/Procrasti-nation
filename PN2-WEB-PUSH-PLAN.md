# Plan: Web Push (ProcrastiNation 2.0, `v2` branch)

**Status: approved 2026-10-07** (decisions below confirmed by Alex).

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with screenshots.

## What it is

The reminders the iPhone app already has, on the web: a task with a time rings at that time in the browser, **even with the tab closed**. A timed deadline rings when it's due, and the optional **morning list** rings once a day. In Chrome and Edge the notification carries **Start 5 min** (opens Start Mode with a five-minute timer) and **Snooze 10 min** (acts without opening the page). There's deliberately no Done: dismissing a notification must never finish a task by accident. Clicking it opens the task, and the morning list opens Today. The words are the same as on the iPhone because they come from the same code in `@pn/core`.

```
 ┌──────────────────────────────────────────┐
 │ ● ProcrastiNation · localhost      now   │
 │ Walk Biscuit                             │
 │ Every day · Home                         │
 │ [ Start 5 min ]  [ Snooze 10 min ]       │   ← Chrome / Edge; Firefox and Safari show no buttons
 └──────────────────────────────────────────┘
```

## How it works

- **The server works out what rings, every minute.**
  - Supabase Cron (pg_cron) calls the site's `/api/cron/push` every minute. Vercel's cron runs only once a day, and the overall plan already chose Supabase Cron for timed jobs.
  - For each person with web reminders on, the route runs core's `planReminders` on their open tasks in their own timezone (`user_settings.timezone`, which the app keeps current). It sends whatever came due since the last run.
  - Every sent reminder is logged, so nothing rings twice. A missed run catches up for up to 10 minutes, and anything older is skipped.
  - Because the server reads the tasks when it sends, a task finished, re-timed or deleted on any device is right at its next ring. The iPhone's "rings for something finished elsewhere" limit doesn't apply to the web.
  - *Why not have each device upload its plan, the way the iPhone schedules its own?* Two devices with different views of the tasks would overwrite each other's rows. Reading the tasks on the server has no such race.
- **Timezones.**
  - Core's date helpers use the runtime's local timezone: right on a phone, UTC on Vercel.
  - So the sender plans each person inside a `withTimeZone(tz, fn)` helper. Node lets `process.env.TZ` change at runtime.
  - The helper is synchronous, so no other request runs in between. It checks that the switch took, and puts the old value back.
  - This keeps core untouched. The alternative is threading a timezone through every date helper.
- **Subscriptions.**
  - Each browser where reminders are on is a `push_tokens` row with `platform = 'web'`. The browser's push endpoint goes in `token`, and its keys go in a new `keys` JSONB column.
  - Rows are saved through a `save_web_push(endpoint, keys)` database function. It also removes that browser from any other account, for when someone else used this computer before.
  - Signing out removes the browser's row. If the push service says a browser is gone, the sender deletes it.
- **Buttons.**
  - **Start 5 min** opens the app at Start Mode for that task with a five-minute timer (`/start/<id>?minutes=5`), focusing an open tab or opening one.
  - **Snooze 10 min** acts without opening the page. The notification carries a signed token that is good for one thing only: snoozing that one task. It expires in 7 days. The service worker posts the token to `/api/push/action`, which saves a one-off that the sender rings 10 minutes later (with the same buttons).
  - **No Done on the web** (Alex): a click near a notification's close button must never finish a task. The iPhone keeps Done, which sits behind press-and-hold.
- **The service worker.**
  - It lives at `apps/app/public/sw.js` (plain JS, served at `/sw.js`). It shows the notification and handles clicks and buttons.
  - A click focuses an open tab and navigates it without reloading; with no tab open, it opens a new one.
- **The ask.** It's the same sheet as on the iPhone, the first time a task gets a time ("Want a nudge at 6:00 PM?"). **Allow** opens the browser's own prompt, then subscribes. **Not now** is remembered in that browser.
- **Reminders card (Passport), web version:**
  - **On:** "On in this browser…", with **Turn off here**.
  - **Undecided:** **Turn on**.
  - **Blocked:** how to allow notifications in the browser's site settings.
  - **Unsupported:** e.g. Safari on iPhone, which only allows Web Push for home-screen web apps. The card points to the iPhone app.
  - **Morning list:** works as it does today. It's one setting per person, and rings on the iPhone and on every browser where reminders are on.

## Decisions

Confirmed by Alex on 2026-10-07:
1. **Buttons on web notifications:** **Start 5 min + Snooze 10 min.** No Done, so dismissing can never finish a task by accident. Clicking opens the task. Firefox and Safari show no buttons at all.
2. **Where reminders ring:** **every device where they're on** (the iPhone app plus each browser), each with its own off switch (Turn off here).
3. **Late reminders:** if the computer is asleep or offline at ring time, the push service holds it **up to 1 hour**, then drops it. A 6 PM nudge at 9 PM is noise.
4. **No "Send a test" button.**

Technical choices (mine; say if you disagree):
- The `web-push` npm package is the sender, in `apps/site`.
- VAPID keys live in `apps/site`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. The public key is also `EXPO_PUBLIC_VAPID_PUBLIC_KEY` in the app, which is fine because it's public.
- Snooze tokens are an HMAC of the CRON_SECRET with their own prefix, as the unsubscribe links already are, so there's no new secret.
- Two new server-only tables, with RLS on and no policies, so only the service role reaches them:
  - `push_sends`: what was sent, pruned after 2 days.
  - `push_snoozes`: web snoozes waiting to ring.
- Both are additive in `01_schema.sql`, with rollback and PGlite tests.
- Morning list words are worked out at send time, so they match Today at that moment. This is better than the iPhone, which works them out when it schedules.

## Setup needed

- **For local testing (Alex):** the **staging service-role key** in `apps/site/.env.development.local` as `SUPABASE_SERVICE_ROLE_KEY`. It's in Supabase → staging project → Settings → API Keys.
  - The sender and the button route run as the server. Without the key, the dev site falls back to production's key from `.env.local`, which staging rejects.
- Development VAPID keys: I generate them into the gitignored env files.
- **At the v2 deploy (Alex, in the dashboards; listed in the handoff checklist):**
  - Production VAPID keys in both Vercel projects.
  - Apply `01_schema.sql`.
  - Run `supabase/v2/03_push_cron.sql` once on production. It schedules the every-minute call, with the CRON_SECRET kept in Supabase Vault.
- **In development:** a small script calls the local `/api/cron/push` every minute instead.

## Files

| Area | File | Change |
|---|---|---|
| DB | `supabase/v2/01_schema.sql`, `99_rollback.sql`, `test/` | `push_tokens.keys`; `save_web_push()`; `push_sends`, `push_snoozes` |
| DB | `supabase/v2/03_push_cron.sql` (new) | the Supabase Cron job (run once at deploy) |
| Core | `packages/core/src/reminders.ts` + tests | `remindersDue(tasks, since, now, options)`: what came due in a window (DST and timezone tests) |
| Core | `packages/core/src/nation.ts` | web wording for the card |
| Site | `apps/site/package.json` | `web-push` |
| Site | `apps/site/lib/push.js` (new) | VAPID setup, send to a person's browsers, `withTimeZone`, action tokens |
| Site | `app/api/cron/push/route.js` (new) | the every-minute sender |
| Site | `app/api/push/action/route.js` (new) | Snooze from a notification |
| App | `apps/app/public/sw.js` (new) | show notifications; clicks and buttons |
| App | `src/notifications/permission.web.ts`, `scheduler.web.ts`, `responses.web.ts` | real web versions (subscribe, keep the subscription fresh, unsubscribe on sign-out; clicks and Start from the service worker) |
| App | `src/components/reminders-card.tsx`, `reminder-prompt.tsx` | web states, Turn off here |
| Scripts | `apps/site/scripts/push-cron-dev.sh` (new) | calls the local sender every minute |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure, env vars, deploy checklist, what works |

## Phases (commit + push `v2` after each)

1. **The server.**
   - Build:
     - The schema changes, with tests.
     - Core `remindersDue`, with timezone and DST tests.
     - `withTimeZone`, the sender, the Snooze route.
   - Verify against staging with curl:
     - Due reminders are picked, and each one only once.
     - A gone subscription is removed.
     - Snooze rings 10 minutes later; a bad or expired token is refused.
2. **The browser.**
   - Build:
     - The service worker.
     - Subscribe on Allow, keep the subscription fresh, unsubscribe on sign-out.
     - Clicks and buttons.
     - The ask on web.
     - The card's web states and Turn off here.
   - Verify end to end in Chrome at `localhost:8081`, with real pushes through Google's push service:
     - It rings with the tab closed.
     - Start 5 min opens Start Mode; Snooze rings again 10 minutes later.
     - A click opens the task, and the morning list opens Today.
     - Signing out stops it.
3. **Ship prep and polish.**
   - The Supabase Cron SQL and the dev script.
   - The deploy checklist.
   - Night theme, phone and laptop widths, Firefox/Safari behavior (no buttons; click opens).
   - Code and security reviews.
   - Docs.

## Testing note

The browser pane inside the Claude app probably can't receive Web Push, because that needs a real browser's push service. End-to-end checks use Claude in Chrome (Alex's Chrome), or Alex clicks through once on the laptop. Everything else (sender, routes, card, ask) is checked in the pane as usual.

## Out of scope (noted)

- Server push to the iPhone app (Phase 4: Morning Briefing, AI check-ins, Allies). The sender is shaped so APNs can plug in later.
- Web Push on iPhone Safari (home-screen web app).
- Nudge tones and custom reminder offsets.
- An email fallback.

## Done when

- [ ] In Chrome, a task with a time rings at that time with the tab closed. A timed deadline and each repeat ring too, and nothing rings twice.
- [ ] Finishing, deleting, re-timing or retitling a task on any device changes what rings next on the web, with no tab open.
- [ ] Start 5 min opens Start Mode with a five-minute timer. Snooze rings again in 10 minutes without opening the page. A click opens the task, and the morning list opens Today.
- [ ] Permission is asked the first time a task gets a time, and Not now is respected. The card shows on, off, blocked and unsupported correctly; Turn off here stops it.
- [ ] Signing out of a browser stops its reminders. A browser used by two accounts gets only the signed-in one's.
- [ ] The iPhone is unaffected. `npm run core:test`, `npm run app:check`, the `supabase/v2` tests and the site build pass.
