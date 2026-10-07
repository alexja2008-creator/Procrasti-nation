# Plan: Passwords (ProcrastiNation 2.0, `v2` branch)

**Status: approved 2026-10-07** (decisions below confirmed by Alex). **Phases 1 and 2 built 2026-10-07** in `9e5f83e` (password sign-in, Settings → Password) and `a78ba7c` (create account with a username, forgot password, sign-in link for existing accounts only, Settings → Username).

**Checked:** core tests (the password and username rules; error codes and messages → words, unknown codes generic); on web (signed out, at `127.0.0.1:8081`, which has its own storage): the form in each mode, autofill hints (`current-password` / `new-password`), show / hide, Enter moving to the password, every local check (bad email, no password, too short, Forgot with no email), the username cleaned as typed and checked free against staging, switching modes keeps the email; on iOS: sign in and create account, day theme.

**Still to check live** (each needs Alex, since Claude doesn't type real passwords or create accounts): set a password in Settings, then sign in with it on another device; a wrong password; create an account with a throwaway address (one email) → confirm → Application with a `profiles` row; a taken username; Forgot → reset link → Choose a new password; Settings → Username. **Phase 3** (password managers on web, night theme pass) follows those checks.

Read `PN2-HANDOFF.md` and `CLAUDE.md` first. Build in three phases, committing and pushing each to `v2`, then check in with web and iOS screenshots.

## Why

v2 signs in by magic link only. Alex doesn't like that, and it has practical costs:
- Every sign-in costs an email. Supabase's built-in email allows a couple per hour for the whole project, so on staging two links lock testing out for an hour; on production it would lock out real users (handoff, open item 7).
- A PKCE link only works in the browser or app that asked for it. Opening the email on the phone to sign in on the laptop fails.
- v1 had passwords. Every v1 user has one, and they'd expect it to work in v2.

## How passwords work here

Supabase Auth stores them, not us: bcrypt hashes in its own `auth.users` table, which the app's database role can't read. RLS isn't involved; our tables only ever see the user id. v2 uses the same Supabase project as v1, so **v1 users' existing passwords work in v2 unchanged**: no migration.

The app calls supabase-js: `signInWithPassword`, `signUp`, `resetPasswordForEmail` and `updateUser({ password })`. Nothing new on the site or in the database.

```
 ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
 │ PASSPORT CONTROL             │  │ PASSPORT CONTROL             │  │ Choose a new password        │
 │ Welcome to the Nation.       │  │ Become a citizen.            │  │                              │
 │ ┌──────────────────────────┐ │  │ ┌──────────────────────────┐ │  │ PASSWORD / MOT DE PASSE      │
 │ │ EMAIL / COURRIEL         │ │  │ │ USERNAME                 │ │  │ [••••••••••          ] 👁    │
 │ │ [you@school.edu        ] │ │  │ │ [your_username         ] │ │  │ At least 6 characters.       │
 │ │ PASSWORD / MOT DE PASSE  │ │  │ │ EMAIL / COURRIEL         │ │  │                              │
 │ │ [••••••••          ] 👁  │ │  │ │ [                      ] │ │  │      [ Save and sign in ]    │
 │ │ [       Sign in        ] │ │  │ │ PASSWORD / MOT DE PASSE  │ │  │                              │
 │ │ Forgot your password?    │ │  │ │ [                  ] 👁  │ │  │                              │
 │ └──────────────────────────┘ │  │ │ At least 6 characters.   │ │  │                              │
 │ New here? Create an account  │  │ │ [   Create account     ] │ │  │                              │
 │ Email me a sign-in link      │  │ └──────────────────────────┘ │  │                              │
 │                              │  │ Have a passport? Sign in     │  │                              │
 └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

## Decisions

Confirmed by Alex on 2026-10-07:
1. **Magic links stay, as a quiet option.** "Email me a sign-in link instead" under the form. Passwords are the main way in. Because new accounts pick a username (decision 3), the link signs in existing accounts only (`shouldCreateUser: false`); new people use Create account.
2. **New accounts confirm their email** before the first sign-in (Supabase's "Confirm email" on, as v1 has it). It stops someone claiming another person's address. It costs one email per sign-up, so custom SMTP (open item 7) comes first on production.
3. **A username at sign-up, as in v1:** 3 to 20 characters, lowercase letters, numbers and underscores, unique (`profiles`, case-insensitive). Checked as they type; kept in `user_metadata.pending_username` until the email is confirmed, then the `profiles` row is created on the first signed-in load (v1's way). Settings shows it; an account without one (made by magic link) can choose one there.
4. **Passwords need at least 6 characters,** the same as v1 and Supabase's default. No change in Supabase.

## The flows

**Sign in.** Email and password, then the gate as now (the Application, then Today).
- A wrong email or password reads the same either way ("That email and password don't match. Try again, or reset your password."), so the form never reveals which addresses have accounts.
- An account that hasn't confirmed its email gets "Confirm your email first. Want a fresh link?"

**Create an account.** Username, email and a new password.
- The username is checked as it's typed ("alex_j is taken"). Sign-up also sets `trial_ends_at` (10 days) like v1, so v2 citizens get the trial too, until the separate free-tier fix moves it somewhere users can't edit.
- With confirmation on: "Check your email to confirm your passport." The link goes through `auth/callback` as now and signs them in on that device. Opened on another device, the email is still confirmed; the callback then says "Email confirmed. Sign in with your password."
- If the address already has an account, Supabase sends nothing and doesn't say so. The confirmation screen covers it: "Already have an account? Sign in or reset your password."

**Forgot your password?** It sends a reset link (`resetPasswordForEmail`, redirecting to `auth/callback`).
- supabase-js reports `redirectType: 'recovery'` for reset links, so the callback sends them to **Choose a new password** (`auth/new-password`) instead of Today. No new redirect URLs.
- Saving it (`updateUser({ password })`) signs them in, then the gate as usual.
- The link works on the device that asked for it, like sign-in links today.

**Settings → Account → Password.** "Set a password" (or change it) in a sheet: a new password, then Save. No email involved.
- This is also how magic-link accounts get a password: Alex's staging account first, which ends the email-cap problem for testing.
- Supabase's "Secure password change" (re-authenticate before changing) stays off; it would cost an email.

**Password fields** (one `PasswordField` component):
- Show / hide toggle with an eye icon; "At least 6 characters" under new passwords.
- Password managers: `textContentType` `username` / `password` / `newPassword` on iOS; `autoComplete` `email` / `current-password` / `new-password` on web.
- iOS strong-password suggestions and saving to iCloud Keychain need Associated Domains (`webcredentials:procrasti-nation.work` plus a file on the site), so they wait for the Apple Developer account.

## Files

| Area | File | Change |
|---|---|---|
| Core | `packages/core/src/nation.ts` | `signIn` copy for both modes, reset, new password; `authErrors` for wrong password, unconfirmed, weak; `settings` password and username copy |
| Core | `packages/core/src/account.ts` (new) + tests | `MIN_PASSWORD_LENGTH` (6), `cleanUsername` / `isValidUsername` (v1's rule) |
| Data | `apps/app/src/data/profile.ts` (new) | `isUsernameTaken`, `ensureProfile` (from `pending_username` once signed in), `fetchUsername`, `setUsername` |
| Auth | `apps/app/src/auth/sign-in.ts` | `signInWithPassword`, `createAccount`, `sendPasswordReset`, `setPassword`; `finishSignIn` returns the redirect type; `friendlyAuthError` maps the new errors |
| App | `apps/app/src/app/sign-in.tsx` | sign in / create account modes, Forgot, link fallback (the forms move into `components/sign-in/*` to keep the screen under 400 lines) |
| App | `apps/app/src/components/password-field.tsx` (new) | the field, show / hide, autofill hints |
| App | `apps/app/src/components/icon.tsx` | `eye` / `eyeOff` |
| App | `apps/app/src/app/auth/callback.tsx` | recovery → Choose a new password; confirmed elsewhere → "sign in with your password" |
| App | `apps/app/src/app/auth/new-password.tsx` (new), `_layout.tsx` | the screen, reachable while signed in (Application or not) |
| App | `apps/app/src/app/settings.tsx`, `components/settings/password-sheet.tsx`, `username-sheet.tsx` (new) | Account → Password, Username |
| App | `apps/app/src/auth/auth-provider.tsx` | `ensureProfile` after sign-in |
| Docs | `CLAUDE.md`, `PN2-HANDOFF.md` | auth section, structure, Supabase settings |

No database or site changes: `profiles` and its policies already exist (v1).

## Supabase settings (Alex, in the dashboard, each project)

- Authentication → Sign In / Providers → Email: **Confirm email** on (decision 2). Check what production has.
- Authentication → Emails → SMTP: custom SMTP (handoff open item 7) before sign-ups depend on email.
- The "Confirm signup" and "Reset password" templates keep the default `{{ .ConfirmationURL }}` (PKCE-ready).
- Redirect allow list: unchanged (resets use `auth/callback`).
- Later: leaked-password protection (Have I Been Pwned) is a paid-plan feature; turn it on with Pro.

## Phases (commit + push `v2` after each)

1. **Sign in with a password; set one in Settings.**
   - `PasswordField`, the sign-in form with email + password (magic link below it), the Settings sheet, the error copy.
   - Verify: Alex sets a password on web (no email), signs in on the iPhone with it; wrong password, unknown email and network errors read right.
2. **Create an account; forgot password; usernames.**
   - The create mode (username, email, password), confirmation copy, the profile on first sign-in, Settings → Username, the magic link for existing accounts only.
   - The reset request, the recovery route and Choose a new password.
   - Verify on staging with a throwaway address (each costs one email): sign up → confirm → Application, with a `profiles` row; a taken username; confirm on another device; reset on the same device → new password → Today; an existing address at sign-up; a magic link for an unknown address sends nothing.
3. **Polish and checks.**
   - Password managers on web (Chrome offers to save), keyboard order and Return to submit, night theme, laptop width, iOS pass.
   - `agents/security-review.md` on the diff; docs.

## Related, separate

- **Free-tier bypasses (found while planning this; spun off as its own task):** the plan route trusts `user_metadata.trial_ends_at`, which any user can rewrite, and `profiles.stripe_subscription_status`, which any user can update on their own row. Both are on production now. That fix also decides how v2 sign-ups get the 10-day trial (they currently get none).
- Sign in with Apple and Google stay hidden until their accounts exist. Once Google is shown, Apple must be too (App Store rule 4.8); email and password alone don't need either.

## Done when

- [ ] A person with a v1 password signs in on iPhone and web.
- [ ] A new person creates an account with a username, confirms it and lands on the Application, with a `profiles` row.
- [ ] Forgot password sets a new one and signs them in.
- [ ] A magic-link account sets a password in Settings and uses it on another device.
- [ ] Errors never say whether an address has an account; magic links still work.
- [ ] `npm run core:test`, `npm run app:check` pass; security review done.
