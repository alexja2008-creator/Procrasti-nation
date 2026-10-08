# Plan: Delete your passport, and download your data (ProcrastiNation 2.0, `v2` branch)

**Status: approved 2026-10-07** (decisions below confirmed by Alex). **Built 2026-10-08** in `1475bc4` (Download your data) and `4ca5446` (Delete your passport).

**Checked:** the export's shape (core tests); on web, the file intercepted and read (the test passport's account, answers, territory, 11 tasks with steps linked to their plan, stamp, AI plan); on the iPhone, the share sheet with a 32 KB file (Save to Files); deleting a user leaves no row of theirs anywhere and nobody else's changes (migration test, stand-in and production structure); the route refuses no session (401) and anything but DELETE (400) with a real session; the sheet's button stays off until DELETE is typed.

**Still to check live (Alex: Claude doesn't permanently delete data):** delete a throwaway passport and confirm Welcome's note and that its rows are gone on staging.

Read `PN2-HANDOFF.md` and `CLAUDE.md` first.

## Why

- **Apple requires it.** An app that lets people create an account must let them delete it from inside the app (App Store guideline 5.1.1(v)): the account and its data, not just a sign-out or a "deactivate". Without it, App Review rejects the app.
- **Their data is theirs.** A copy they can download is good practice (and what privacy laws like GDPR and California's CCPA expect), and it's reassuring for an app that asks people to move their notes and tasks into it.

Both live in **Settings → Account**.

## Delete your passport

**What it removes:** the account itself (sign-in, email, phone) and everything in it: tasks and plans, notes, territories, settings, stamps, starts, reminders on the server, the public username. Every table that points at a person deletes their rows with them (`ON DELETE CASCADE`, checked on production's structure and v2's), so deleting the account deletes the data. A database test proves it on both.

**How:**
1. Settings → Account → **Delete your passport** opens a sheet: what goes, that it can't be undone, a nudge to **download your data first**, and the confirmation (decision 2).
2. The app calls a new site route, `/api/account/delete`, with their session. The route:
   - checks the session (`requireAuth`);
   - **cancels a Stripe subscription** if the person has one (v1's Pro on the web; otherwise they'd keep being billed with no account);
   - deletes the user with the service role (`auth.admin.deleteUser`): the only step that needs it, on the server only.
3. The app clears the device: scheduled reminders, this person's saved state on the device, the Web Push subscription. It lands on the Application's Welcome with a short, kind note ("Your passport is deleted. Thanks for being part of the Nation.").

**Later (noted, not built now):**
- **App Store subscriptions** (phase 2): deleting an account can't cancel them; Apple requires telling people how ("Cancel it in Settings, then your Apple ID, then Subscriptions"). The sheet gets that line once payments exist.
- **Sign in with Apple** (once it ships): Apple requires revoking the person's Apple token when they delete their account.

## Download your data

Settings → Account → **Download your data** builds the file on the device from what the person can already read (their own rows, through row security; no new server route), then:
- **web:** downloads `procrastination-<date>.json`;
- **iPhone:** opens the share sheet ("Save to Files", AirDrop, Mail).

**What's in it:** account (citizen number, email or phone, when it was made), username, settings and Application answers, territories, every task (open, finished, steps and repeats; not ones they deleted), notes (with checklist lines written out as text and ticked or not), stamps, Start Mode sessions, and when each AI plan was made. Not included: device push tokens and internal counters (meaningless outside the app), and v1-only tables (boards, friends, focus pods), which retire at cutover.

## Decisions (confirmed by Alex, 2026-10-07)

1. **Deletion happens at once.** A grace period (deleted after 7 days unless they sign back in) prevents mistakes but needs a scheduled job and an "about to be deleted" state everywhere. The confirmation and the export nudge cover mistakes well enough.
2. **Confirm by typing DELETE.** It works for every account (password, link, phone, anonymous passports alike); asking for the password wouldn't work for accounts without one.
3. **The export is one JSON file.** Complete and simple. A readable version (tasks as a spreadsheet, notes as text files, zipped) could come later.

## Files

| Area | File | Change |
|---|---|---|
| Site | `apps/site/app/api/account/delete/route.js` (new) | the route above |
| Site | `apps/site/lib/stripe.js` (new, or inline) | cancel a customer's subscription |
| DB | `supabase/v2/test/migration.test.mjs` | deleting a user removes every row of theirs (stand-in and production structure) |
| Core | `packages/core/src/nation.ts` | the copy |
| Core | `packages/core/src/export.ts` (new) + tests | the export's shape, notes' checklist lines as text |
| Data | `apps/app/src/data/account.ts` (new) | `exportMyData`, `deleteMyAccount` |
| App | `apps/app/src/lib/save-file.ts` / `.web.ts` (new) | share sheet on iPhone, download on web (`expo-file-system`, `expo-sharing`) |
| App | `apps/app/src/components/settings/delete-sheet.tsx` (new), `settings.tsx` | the two rows and the sheet |
| App | `apps/app/src/auth/sign-out.ts` | a shared "forget this device" for sign-out and deletion |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | structure, the route, what's left |

## Phases (commit + push `v2` after each)

1. **Download your data:** the export, the rows, iPhone and web.
2. **Delete your passport:** the route (security review), the database test, the sheet, the device cleanup. Verified with a test account Alex makes (Claude doesn't create accounts on staging): delete it, check every row is gone and the app lands on Welcome.
3. Docs.

## Done when

- [ ] Settings → Account → Download your data gives a complete JSON file on iPhone (share sheet) and web (download).
- [ ] Delete your passport removes the account and all its rows (database test on both structures, and a live test account), cancels a Stripe subscription first, and leaves the device signed out on Welcome.
- [ ] Works for an unsaved (anonymous) passport too.
- [ ] Security review of the route; `npm run core:test`, `npm run db:test`, `npm run app:check`, the site build pass.
