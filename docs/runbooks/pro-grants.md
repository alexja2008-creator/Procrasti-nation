# Runbook: Pro grants

Pro given without paying, kept in `pro_grants` (why it's apart from billing: `DECISIONS.md`, "Pro without paying"). Run everything here in the Supabase SQL Editor. The API can't write a grant, so this is the only way to give one.

**This repo is public.** Who got a grant, and why, stays in Alex's own records, never here. A grant's `reason` is a code from the list below; the database refuses anything else that isn't lowercase letters and underscores.

## Before the first grant

1. Apply section 13 of `supabase/v2/01_schema.sql` (`pro_grants`) to staging, then to production. It's additive and safe to run twice.
2. Re-dump production's structure (`supabase/v2/scripts/dump-prod-schema.sh`), so `npm run db:test` checks against it.

## Reasons in use

| Code | For | Ends |
|------|-----|------|
| `founding_tester` | Finished the beta: a week with the app, then the feedback form (Alex, 2026-11-09) | Never |

Add a code here before using a new one.

## 1. Find the account

Look first, grant second. An email can sit on an unconfirmed sign-up that someone else made with it, and a username can change hands, so check who it is before anything is granted.

```sql
SELECT u.id, u.email, u.email_confirmed_at, u.is_anonymous, u.created_at, p.username
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE lower(u.email) = lower('person@example.com')
   OR lower(p.username) = lower('their_username');
```

Grant only when exactly one row comes back and it holds up:
- `email_confirmed_at` is set (Apple and Google sign-ins are confirmed by the provider), and `is_anonymous` is false.
- `created_at` fits when they said they signed up, and the email or username is the one they gave you.

Anything else (no row, two rows, an unconfirmed email, an anonymous passport): ask the tester before granting.

## 2. Grant

With the `id` from step 1:

```sql
INSERT INTO public.pro_grants (user_id, reason)
VALUES ('00000000-0000-0000-0000-000000000000', 'founding_tester')
ON CONFLICT (user_id) DO NOTHING
RETURNING user_id, reason, granted_at, ends_at;
```

**One row back:** granted, and only then tell them they have Pro. **No row back:** they already have a grant, even one that has ended (Check, below; to renew it, Change).

For a grant that ends, name `ends_at` too: `INSERT INTO public.pro_grants (user_id, reason, ends_at) VALUES ('…', 'founding_tester', now() + interval '1 year')`.

## Check

```sql
SELECT g.reason, g.granted_at, g.ends_at, u.email, p.username
FROM public.pro_grants g
JOIN auth.users u ON u.id = g.user_id
LEFT JOIN public.profiles p ON p.user_id = g.user_id
ORDER BY g.granted_at DESC;
```

## Change

Renew a grant that ended, or make one for life:

```sql
UPDATE public.pro_grants SET ends_at = NULL
WHERE user_id = '00000000-0000-0000-0000-000000000000'
RETURNING user_id, reason, granted_at, ends_at;
```

Or give it an end, so it runs out: `SET ends_at = now() + interval '30 days'`.

## Revoke

```sql
DELETE FROM public.pro_grants
WHERE user_id = '00000000-0000-0000-0000-000000000000'
RETURNING user_id, reason;
```

No row back: there was no grant, and nothing was deleted.

## What a grant does

- **Plans:** `/api/generate-plan` treats an active grant like a subscription: no monthly count. The 20-plans-a-day cap still holds for everyone. It takes effect on their next plan; nothing to restart.
- **Download your data** includes it, as `account.proGrant`.
- **Deleting the passport** deletes the grant with it.
- **Not yet:** the paywall. When payments ship, `docs/plans/active/conversion.md` (Entitlement) makes an active grant count there too, on iPhone and the web.
