# Plan: Onboarding that converts (ProcrastiNation 2.0, `v2` branch)

**Status: approved 2026-10-07** (decisions below confirmed by Alex; prices stay v1's for now, a semester plan comes up later). **Phase 1 built 2026-10-07** in `f0422e4` (server limits) and `a25def5` (the funnel). Changes from the plan:
- The anonymous passport opens on answering "Where did you hear about us?", not at Begin: the questions are answered on the device (`pn.application.draft`) and move into the passport then. People who stop mid-quiz leave no accounts behind, and bots must get through nine pages before they cost anything.
- A saved-by-email passport's username waits in `pending_username` until the email confirms, so an unsaved passport never holds a public name.
- The plan route also allows one plan request at a time per person (a parallel burst used to pass the free count) and caps clarifying questions at 20 a day.

**Checked (web, signed out, without opening a passport):** every question page through "Where did you hear about us?", answers kept on the device and resumed after a reload, Your result and How PN helps for "It feels too big", the sign-in screen's three ways in and its local checks, "New here?" back to the Application; a saved account's Passport and Settings unchanged on the iPhone; core tests (93), database tests (ai_requests kinds), the site build and its tests.

**Still to check live (needs Alex: opening a passport creates an account on staging, which Claude doesn't do):** answering the last question opens the passport and lands on the Oath with the answers moved in; Your first week; the nudge (the system prompt on iOS); Approved → Save your passport by texted code (after Twilio is wired) and by email (confirm the link lands on Choose a password); Later → the Passport card and the Settings row; signing out of an unsaved passport warns; the free-plan limit message after two plans.

**Texted codes are hidden for now (Alex, 2026-10-07):** Twilio requires a paid account to create a Verify service, so "Text me a code" shows only when `EXPO_PUBLIC_AUTH_PROVIDERS` includes `phone`; saving a passport is email + password until then. Flagged for production in `PN2-HANDOFF.md`, open item 8.

**Before anonymous sign-ins reach production:** a `profiles` insert policy that refuses anonymous users (today only the app keeps them from claiming a name; the API wouldn't stop a script). Database review, and rehearsal against the production structure.

Read `PN2-HANDOFF.md`, `CLAUDE.md` and `PN2-ONBOARDING-PLAN.md` (the Citizenship Application this builds on) first.

## Why

The Application tailors the app, but nothing in it sells the app, and v2 has no paywall at all. Alex looked at the onboarding funnel of Prayer Lock (a $150k+ app; its founder's playbook: Quiz → Results → Symptoms → How the app helps → Reviews → Features → Custom plan → Paywall / discounted paywall) as context, not a script: take what fits PN, adapt or drop the rest.

**What PN keeps from it:** a quiz whose answers come back as a result; a plain "here's how this helps *you*"; a custom plan before the paywall; a primed notification ask; a trial reminder; a required trial.

**What PN changes:**
- **Relief, not shame.** Prayer Lock's "pain screens" run on guilt ("you'll spend 6 years of your life on your phone"). Shame feeds procrastination (Pychyl & Sirois; memory `self-compassion-voice`), so PN's emotional beat is the loop named kindly, then the relief.
- **Our custom plan is real.** Theirs is a template ("here's what your first 7 days look like"); ours is the Oath: the real planner on their real task. That's the strongest thing we have; the funnel builds up to it.
- **Our "analyzing" is real.** Their progress loader is theatre; the planner genuinely takes 10–20 seconds, which we stage as the passport being processed.
- **No invented proof.** No "#1 app", made-up user counts or reviews: the FTC's 2024 rule bans fake reviews and Apple rejects misleading claims. Research credibility now; real quotes from the TestFlight students later.
- **Honest prices.** Apple requires the billed amount to be the most prominent price (3.1.2), so no "$0.76/week" over a small yearly price.

## Prayer Lock's model vs ours

**Why it works for Prayer Lock:**
- **The value is passive.** The lock works on every unlock with no effort, so a 3-day trial is enough to feel it.
- **The motivation is identity.** Faith is durable and emotional; guilt motivates in that context.
- **Serving a user costs almost nothing** (no AI per action), and there's one simple promise.
- **A long onboarding is a commitment ramp.** Going from 5 to 15 minutes tripled its download-to-trial rate (to 43%): every page invests the person further before the ask.
- **It's built for paid acquisition.** TikTok Spark Ads at $3–4 per trial on a ~$50/year plan only pay off with a hard paywall. Industry-wide, hard paywalls turn ~10.7% of downloads into payers by day 35 vs 2.1% for freemium, and earn ~8× more per install by day 60 (RevenueCat, 2026).

**Where PN differs:**
- **PN's value is active.** It pays off only when the person comes back and starts something, so the trial has to bring them back: the Oath's plan across the week, the morning nudge, Start Mode. Longer trials convert better (RevenueCat: 42.5% median for 17–32 days vs 25.5% under 4), which is why 7 days, not 3.
- **The audience avoids decisions.** A required payment step is exactly where avoidant people defer ("I'll do it later") and never come back. The counterweight: paying can work as a commitment device, and self-imposed commitments help procrastinators (Ariely & Wertenbroch, 2002).
- **The competition is free and preinstalled** (Notes, Reminders). Nobody moves their notes into an app that might lock them out, so the free tier after cancelling (decision 2) has to be said out loud.
- **Students and payment.** Some have no card; under-18s buy through Ask to Buy (a parent approves). That's also an opening (parents approve study tools), but a pending approval must not leave them stuck.
- **Motivation is seasonal** (midterms, finals), not daily devotion: a semester-length plan may fit better than monthly or yearly.
- **The growth plan is organic** (`business-marketing-plan.md`: TikTok, Reddit, word of mouth, $20–40 per user). Free users are what spreads; Prayer Lock's paid funnel doesn't need them.
- **The voice.** Guilt works for Prayer Lock's audience; it backfires on procrastination.

**The hybrid (required trial to get in, free tier on the way out):** it captures most of a hard paywall's conversion while keeping people who cancel as free users who keep their data, can convert later and can still recommend the app. Its weak spots, and the fix for each (**all four adopted by Alex**; the semester plan's price comes later):
1. **The free tier is reachable only by starting the trial and cancelling,** which feels like a trick if found out. *Fix:* say it on the trial page: "Cancel anytime before it ends. You keep the free version."
2. **People who'd never add a payment method are lost at the door,** including the free users who'd have spread the app. *Fix:* measure trial starts page by page from day one; if they're low, test a reverse trial (Pro for 7 days with no payment method, then free; v1's model) against it with RevenueCat's paywall experiments.
3. **Ask to Buy and pending purchases.** *Fix:* let them in on the free tier while it's pending.
4. **Price shape.** *Fix:* offer a semester plan (Apple allows 6 months) beside monthly and yearly.

## Decisions (confirmed by Alex, 2026-10-07)

1. **A required free trial.** New accounts start a **7-day free trial** of Pro to use the app; the payment method is taken at the start (Apple ID on iPhone, card on the web) and nothing is charged until the trial ends. It can't be skipped.
2. **Cancelling keeps the free tier.** Someone who cancels the trial keeps the app (Today, quick add, notes, reminders, Start Mode, territories) with the free tier's plans.
3. **Free tier: 2 AI plans per 30.5 days,** counted in windows from the account's creation (not calendar months). Was 3 per calendar month. The Oath is the first plan of the first window.
4. **Existing accounts** (v1 users, anyone signed up before this ships) are **offered** the trial once and can skip it; they keep the free tier.
5. **An anonymous passport through the funnel; saved later.** Begin creates a real but anonymous account (Supabase anonymous sign-in), so nothing waits on an email: answers, the Oath's plan (metered like any account's), the trial. **Save your passport** (username, then Apple / Google in one tap once available, or email + password) comes after the trial starts, at moments with a reason, and keeps the same account and data. (Revised from "account mid-quiz": every email step before the Oath meant leaving the app for Mail.)
6. **Relief, not shame,** everywhere in the funnel; true numbers only.
7. **"Text me a code" saves the passport and signs in** (phase 1, US and Canada first). A texted code autofills over the keyboard in seconds (and in Safari on a Mac with Text Message Forwarding), and students live in their texts. Order offered: on iPhone, Apple (once it exists), then phone, then email + password; on the web, phone, then email + password, then Apple / Google.

## The flow

Pages marked **new**; the rest exist today. Everything before 15 runs on the anonymous passport.

| # | Page | What it does |
|---|---|---|
| 1 | Welcome | "Citizenship Application" + **Begin** (creates the anonymous passport), and "Already a citizen? Sign in" |
| 2 | Purpose of visit | as now |
| 3 | Your hours | as now |
| 4 | What usually stops you? | as now |
| 5 | First, you're not broken | as now: the loop named kindly, then the relief (PN's "pain screen") |
| 6 | How should we nudge you? | as now |
| 7 | **Your result** | Their answers read back as a fixable mechanism, with one true, normalizing fact. Draft: "You're in good company: most college students put things off, and about half say it's a real problem for them (Steel, 2007). Yours is *it feels too big*: when the first step isn't visible, starting feels impossible. That's fixable." One version per style |
| 8 | **How PN helps you** | 2–3 cards picked by the answer, each a small real piece of the app: too big → **Plan it** (a task becoming steps); avoid → **Start Mode** ("just 5 minutes"); perfect → the timer + "done beats perfect"; bored → stamps, ranks and their nudge tone's sample line |
| 9 | **Where did you hear about us?** | TikTok / Instagram / YouTube / A friend / App Store / Other. One tap; for marketing |
| 10 | The Oath | as now; the planner's wait is staged as "Processing your application…" |
| 11 | **Your first week** | The Oath's plan laid out by day ("Thu: List the midterm chapters · 15 min"), not a template |
| 12 | **A nudge for step 1** | Primed ask: "Want a nudge each morning with your next step?" → turns on the morning list at their hours' time → the system prompt (iOS) or browser prompt (web). "Not now" is fine |
| 13 | Approved | the stamp, as now |
| 14 | **The trial** | 7 days free, then the price; "Cancel anytime before it ends. You keep the free version."; "We'll remind you the day before it ends"; Restore purchases; terms and privacy links (Apple requires them). Required for new accounts; existing ones get "Not now"; a pending Ask to Buy goes in on the free tier |
| 15 | **Save your passport** | "Keep your passport: sign in on your laptop, never lose it." Username, then Apple (once available), **text me a code**, or email + password. "Later" is allowed; it comes back (below) |

Existing accounts that haven't done the Application start at 1 already signed in and skip 15. Anyone who has done it sees only page 14, once.

**When "Save your passport" comes back** (until it's saved): when they open PN on another device or the web ("Already a citizen? Sign in" explains a passport needs saving first, from the phone), as a quiet card on Passport, the day before the trial ends (with the trial reminder), and as a warning before signing out of an unsaved passport ("This passport isn't saved. Signing out loses it.").

## How it works

**The anonymous passport.** The gate today sends anyone signed out to sign-in; it will send them to the Application instead, with "Already a citizen? Sign in" on Welcome. **Begin** calls `signInAnonymously()`: a real user (`is_anonymous` in its token, the `authenticated` role), so `user_settings`, the citizen number, tasks, RLS and the plan meter all work as they do today, with no device-only draft.
- **Saving it** keeps the same user id and everything in it:
  - Apple / Google: link the identity (one tap; needs the developer account and the Google client).
  - Phone: `updateUser({ phone })` texts a code; `verifyOtp({ phone, token, type: 'phone_change' })` attaches the number. The code field is `oneTimeCode` (iOS) / `one-time-code` (web), so it autofills. Then a gentle nudge to add a second way back (email or Apple), since carriers recycle numbers.
  - Email + password: the username is saved to `profiles` at once; `updateUser({ email })` sends a confirmation they can open whenever, on any device, while they keep using the app (Supabase attaches an email only once it's confirmed, so nobody can claim someone else's); then **Choose a password** (the existing `auth/new-password` screen).
- **Signing in to an existing account** from an anonymous passport replaces it (a warning first if the passport has tasks).
- **The sign-in screen** keeps Sign in, Forgot and the link (`PN2-PASSWORDS-PLAN.md`) and gains **Text me a code** (`signInWithOtp({ phone, options: { shouldCreateUser: false } })`, then `verifyOtp` with `type: 'sms'`; an unknown number hears the same "on its way"); its Create account form becomes Save your passport's, and "New here?" starts the Application instead.
- **Texted codes: cost and fraud.** Supabase sends them through **Twilio Verify**: about $0.058 per successful US verification (a failed attempt still costs the ~$0.008 text). Sessions last, so it's mostly once per device. SMS pumping (codes triggered to premium numbers abroad) is the risk: only US and Canada numbers at first, Twilio's fraud guard, limits per number and per IP, and Turnstile on the web. Phone numbers also go in the privacy policy and the App Store privacy label.
- **Abuse:** anonymous sign-ins are free to create, and each can make the Oath's plan. Supabase caps them per IP (default 30 an hour); add Cloudflare Turnstile on the web, and Apple's App Attest on iOS if abuse shows up. A plan costs cents, so the exposure is bounded.
- **Cleanup:** a scheduled job deletes anonymous passports untouched for 30 days with no subscription (database review: what cascades).
- **Restore purchases** on a reinstalled, unsaved passport: RevenueCat moves the subscription to the new passport; the old data is gone, which is why saving keeps coming back.

**Entitlement.** One server-side truth for "Pro right now" (in trial or subscribed), from **RevenueCat**, which handles Apple's in-app purchases on iPhone and Stripe on the web:
- A webhook (`/api/billing/webhook`, signed) writes a server-only `entitlements` row (user, product, trial / active / expired, period end); RLS: the owner can read, nobody can write.
- `/api/generate-plan` checks it; otherwise the free tier's count: `plan_generations` since the start of the current 30.5-day window from `auth.users.created_at`.
- The 10-day no-card trial (counted from `created_at` since the free-tier fix) ends for new accounts; the required trial replaces it.
- The app reads entitlement through RevenueCat's SDK (and the row, for the web).

**Paywall gate.** A new account (anonymous or saved) without an entitlement that has finished the Application sees page 14 until the trial starts. It's a client gate (the server only meters AI plans), which is how paywalled apps work.

**Trial reminder.** A notification the day before the trial ends (iOS local, Web Push on the web), from the entitlement's period end. Apple's own emails don't cover it everywhere.

## Phases (commit + push `v2` after each)

1. **The funnel, before payments** (no Apple account needed):
   - the anonymous passport (Begin, the gate, signing in from it, the sign-out warning), Your result, How PN helps, Where did you hear, Your first week, the primed nudge, the staged wait;
   - Save your passport with a texted code or email + password (confirmation in the background, then Choose a password) and its reminders; Text me a code on the sign-in screen; Apple / Google join in phase 2;
   - the free tier at 2 plans per 30.5-day window (site route + core window math, tested);
   - verify on iPhone and web: a new passport through every page; saving it; an existing account; answers landing.
   - Alex, in Supabase (staging now, production at launch): turn on **Anonymous sign-ins**; Turnstile for the web; a **Twilio account with a Verify service**, its keys under Authentication → Providers → Phone, and US / Canada only in Twilio's geo permissions.
2. **Payments** (needs the Apple Developer account, App Store Connect products, RevenueCat and a privacy policy page):
   - `entitlements` + webhook (database review + security review), the trial page with Apple's purchase sheet and Stripe on the web, Restore purchases, Ask to Buy, the trial reminder, Settings → Subscription (manage / restore);
   - Save your passport with Apple / Google; the anonymous-passport cleanup job;
   - the plan route reads entitlements; the created-at trial goes.
3. **Polish and measure:**
   - funnel analytics: where people stop, page by page (Vercel Analytics only covers the web; iOS needs PostHog or our own events table);
   - App Store rating prompt after the first stamp (not during onboarding);
   - real testimonials once the TestFlight students give them;
   - if trial starts run low: test a reverse trial (7 days of Pro, no payment method, then free) against the required one.

## Open (Alex)

- **A semester plan's price** (6 months), beside v1's $7.99/month and $72/year.
- **Is the yearly plan the default?** Most trial funnels lead with yearly.

## Out of scope

- A discounted offer on decline (the trial can't be declined; maybe later for existing accounts who skip).
- Screen-time-style blocking (Prayer Lock's core mechanic): not what PN is.
