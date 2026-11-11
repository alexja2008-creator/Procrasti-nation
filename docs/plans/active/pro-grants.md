# Plan: Pro grants (Pro without paying, kept apart from billing)

**Status: approved 2026-11-09.** Alex approved the Decisions below, including the privacy sentence's draft, and phase 1 started.

## Overview

Alex is giving Pro for life to the testers who finish the beta (2026-11-09). Today the only way to give one account Pro is to set `profiles.stripe_subscription_status` to `'active'` in the SQL Editor. That column belongs to billing: v1's Stripe wrote it, and `conversion.md` phase 2 replaces it with RevenueCat and an `entitlements` table synced by a webhook. A grant stored in billing's place can be overwritten by a sync, or stop counting when the plan route moves to `entitlements`. "For life" needs its own place.

This plan adds that place: a `pro_grants` table that only the SQL Editor writes, and that the plan route reads alongside the subscription. Testers' forms start coming in about November 16, and each is granted when its form is in. Beta Pro runs through the close of December 31 (moved from November 15 on 2026-11-11), so until then a grant changes nothing a tester sees: the table has to be on production, and every finished tester granted, before beta Pro ends. From then on the plan route's Pro check matters.

## Decisions (Alex, 2026-11-09)

1. **Grants get their own table, `pro_grants`,** apart from the Stripe column and from `conversion.md`'s `entitlements`. A webhook that keeps `entitlements` in step with RevenueCat must never be able to remove a grant. *The alternative:* RevenueCat's promotional entitlements, which can be lifetime. But RevenueCat isn't set up yet (STATUS.md), and the first grants are due before it will be.
2. **For life by default.** `ends_at` is empty for a lifetime grant, and set for a time-limited one (a month of Pro, say). Past `ends_at`, the grant stops counting. The row stays as a record until it's deleted.
3. **`reason` is a short code** (`founding_tester`), checked by the database (lowercase letters and underscores, up to 40 characters), so it can't hold a name, an email or a note. Who got a grant and why stays in Alex's own records, never in this public repo or the database.
4. **The owner can read their grant; nobody writes it through the API.** RLS allows `SELECT` on their own row and nothing else, the same as `conversion.md` plans for `entitlements`. Alex grants and revokes in the SQL Editor (a runbook gives the SQL). Owner-read lets the plan route read it as the signed-in person, and lets Download your data include it.
5. **Download your data includes the grant** (reason, granted at, ends at), because the privacy policy promises a copy of account information.
6. **The privacy policy gets one sentence,** and `LEGAL_EFFECTIVE` moves to the ship date. Draft, for §1.1 after the passwords sentence: "If we give your account access to paid features without charge, for example for helping test the Services, we record that grant, why it was given and when it ends." Alex's wording.
7. **When payments ship, the grant counts everywhere Pro does.** `conversion.md` plans one server-side truth for "Pro right now" and a paywall gate that reads RevenueCat's SDK on iPhone. An active grant has to pass both, or a lifetime tester meets the paywall on iPhone. This plan adds that requirement to `conversion.md`'s Entitlement section now. How (the app also reads `pro_grants`, or each grant is mirrored into RevenueCat as a promotional lifetime entitlement) is decided there.
8. **Out of scope:** Settings showing "Pro for life", redeemable codes, an admin screen. The SQL Editor is enough for a few dozen grants.

## Files to create or modify

| File | Action | What changes |
|---|---|---|
| `supabase/v2/01_schema.sql` | Modify | Section 13, `pro_grants`: `user_id` (primary key, references `auth.users`, `ON DELETE CASCADE`), `reason` (checked code), `granted_at`, `ends_at`. RLS on; one policy, "Owners read their grant" (`SELECT`, `user_id = (SELECT auth.uid())`) |
| `supabase/v2/test/migration.test.mjs` | Modify | The owner reads their grant; another user can't; the owner can't insert, update or delete one; a bad `reason` is refused; deleting the user deletes the grant |
| `packages/core/src/account.ts` | Modify | `proGrantActive(grant, now)`: true for a grant with no `ends_at`, or one that ends after `now` |
| `packages/core/test/account.test.ts` | Modify | Cases: no grant, lifetime, ends later, ended |
| `apps/site/app/api/generate-plan/route.js` | Modify | Past the trial and beta Pro, read the subscription and the grant together; either one lifts the free tier's count. If the grant can't be read (say the table isn't on production yet), log it and go on as if there's none: the subscription check is unchanged |
| `packages/core/src/export.ts`, `packages/core/test/export.test.ts` | Modify | `account.proGrant`: `{ reason, grantedAt, endsAt }` or `null` |
| `apps/app/src/data/account.ts` | Modify | `downloadMyData` reads their `pro_grants` row |
| `apps/site/app/privacy/page.jsx`, `apps/site/lib/site.js` | Modify | The §1.1 sentence (decision 6); `LEGAL_EFFECTIVE` |
| `docs/runbooks/pro-grants.md` | Create | Grant, check and revoke in the SQL Editor, by email or by username (Hide My Email accounts have a relay address the person may not know) |
| `docs/architecture.md`, `DECISIONS.md`, `STATUS.md`, `CHANGELOG.md` | Modify | The table; the decision; the open item for Alex (apply the SQL); a changelog line |
| `docs/plans/active/conversion.md` | Modify | Decision 7, under Entitlement |

## Phases

**Phase 1 (one PR): grants count for plans.** Everything above. Checked: `npm run db:test`, `npm run core:test`, `npm run app:check`, and the site's lint and build. Download your data on the web at phone width shows `proGrant` for a granted passport and `null` otherwise. The `database-reviewer` and `security-reviewer` subagents run before the PR.

**Needs Alex:**
- Approve the privacy sentence.
- Apply section 13 to staging, then to production, in the SQL Editor. Then re-dump `v2/.local/prod-schema.sql`.
- The live check, on January 1, 2027 or later, on production (beta Pro has ended by then, and staging has no copy of the site API to run Plan it): a saved test passport past its 10-day trial is refused a third plan in its window; grant it Pro; the third plan goes through; revoke it; refused again.

## Data and copy

- One new table, server-written and owner-read; no new copy in the app. The plan route's "Upgrade to Pro" message is unchanged.
- It changes what's recorded about an account, so the privacy policy changes in the same PR (decision 6).

## Risks

- **Someone gives themselves Pro.** There's no write policy, and the tests prove an owner can't insert, update or delete their own row.
- **A grant goes to the wrong account** (a typo in the email, an unconfirmed sign-up someone else made with the tester's address, a username that changed hands). The runbook looks the account up first and checks it (one row, a confirmed email, not anonymous, a sign-up date that fits), then grants by its id; no row back from the grant means the account already has one. Revoking is one `DELETE` (security review, 2026-11-09).
- **The code deploys before the table exists.** The grant read fails, the route logs it and carries on as before; a subscriber is unaffected.
- **The AI consent branch (`docs/ai-consent-plan`) also changes the privacy policy and `LEGAL_EFFECTIVE`.** Whichever merges second rebases and takes the later date.

## Done when

- [x] Alex approved the Decisions and the privacy sentence (2026-11-09).
- [ ] On the day it merges, `LEGAL_EFFECTIVE` (`apps/site/lib/site.js`) and the changelog entry say that day.
- [ ] `db:test`, `core:test`, `app:check` and the site's build pass, with the new tests.
- [ ] Download your data includes the grant, and `null` without one.
- [ ] `pro_grants` is on staging and production, and `prod-schema.sql` is re-dumped.
- [ ] The live check (January 1, 2027 or later) passed: refused, granted and allowed, revoked and refused.
- [ ] `docs/runbooks/pro-grants.md` has the SQL, and `conversion.md` has decision 7.
