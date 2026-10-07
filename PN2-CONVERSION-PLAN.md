# Plan: Onboarding that converts (ProcrastiNation 2.0, `v2` branch)

**Status: proposed 2026-10-07.** Decisions 1–6 confirmed by Alex; the open ones are at the end.

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

**The hybrid (required trial to get in, free tier on the way out):** it captures most of a hard paywall's conversion while keeping people who cancel as free users who keep their data, can convert later and can still recommend the app. Its weak spots, and the fix for each:
1. **The free tier is reachable only by starting the trial and cancelling,** which feels like a trick if found out. *Fix:* say it on the trial page: "Cancel anytime before it ends. You keep the free version."
2. **People who'd never add a payment method are lost at the door,** including the free users who'd have spread the app. *Fix:* measure trial starts page by page from day one; if they're low, test a reverse trial (Pro for 7 days with no payment method, then free; v1's model) against it with RevenueCat's paywall experiments.
3. **Ask to Buy and pending purchases.** *Fix:* let them in on the free tier while it's pending.
4. **Price shape.** *Fix:* offer a semester plan (Apple allows 6 months) beside monthly and yearly.

## Decisions (confirmed by Alex, 2026-10-07)

1. **A required free trial.** New accounts start a **7-day free trial** of Pro to use the app; the payment method is taken at the start (Apple ID on iPhone, card on the web) and nothing is charged until the trial ends. It can't be skipped.
2. **Cancelling keeps the free tier.** Someone who cancels the trial keeps the app (Today, quick add, notes, reminders, Start Mode, territories) with the free tier's plans.
3. **Free tier: 2 AI plans per 30.5 days,** counted in windows from the account's creation (not calendar months). Was 3 per calendar month. The Oath is the first plan of the first window.
4. **Existing accounts** (v1 users, anyone signed up before this ships) are **offered** the trial once and can skip it; they keep the free tier.
5. **The account is made mid-quiz, before the Oath.** The questions, the result and "how PN helps" run before sign-up (answers kept on the device); "Save your passport" asks for the account just before the AI plan, so the costly call always has an account behind it.
6. **Relief, not shame,** everywhere in the funnel; true numbers only.

## The flow

Pages marked **new**; the rest exist today.

| # | Page | Signed in? | What it does |
|---|---|---|---|
| 1 | Welcome | no | "Citizenship Application" + **Begin**, and "Already a citizen? Sign in" |
| 2 | Purpose of visit | no | as now (territories made after sign-up) |
| 3 | Your hours | no | as now |
| 4 | What usually stops you? | no | as now |
| 5 | First, you're not broken | no | as now: the loop named kindly, then the relief (PN's "pain screen") |
| 6 | How should we nudge you? | no | as now |
| 7 | **Your result** | no | Their answers read back as a fixable mechanism, with one true, normalizing fact. Draft: "You're in good company: most college students put things off, and about half say it's a real problem for them (Steel, 2007). Yours is *it feels too big*: when the first step isn't visible, starting feels impossible. That's fixable." One version per style |
| 8 | **How PN helps you** | no | 2–3 cards picked by the answer, each a small real piece of the app: too big → **Plan it** (a task becoming steps); avoid → **Start Mode** ("just 5 minutes"); perfect → the timer + "done beats perfect"; bored → stamps, ranks and their nudge tone's sample line |
| 9 | **Where did you hear about us?** | no | TikTok / Instagram / YouTube / A friend / App Store / Other. One tap; for marketing |
| 10 | **Save your passport** | → yes | Create account (username, email, password) or sign in; then the answers kept on the device are saved and territories made |
| 11 | The Oath | yes | as now; the planner's wait is staged as "Processing your application…" |
| 12 | **Your first week** | yes | The Oath's plan laid out by day ("Thu: List the midterm chapters · 15 min"), not a template |
| 13 | **A nudge for step 1** | yes | Primed ask: "Want a nudge each morning with your next step?" → turns on the morning list at their hours' time → the system prompt (iOS) or browser prompt (web). "Not now" is fine |
| 14 | Approved | yes | the stamp, as now |
| 15 | **The trial** | yes | 7 days free, then the price; "We'll remind you the day before it ends"; Restore purchases; terms and privacy links (Apple requires them). Required for new accounts; existing ones get "Not now" |

Existing accounts that haven't done the Application start at 1 signed in and skip 9–10. Anyone who has done it sees only page 15, once.

## How it works

**Signed-out quiz.** The gate today sends anyone signed out to sign-in; it will send them to the Application instead, with "Already a citizen? Sign in" on Welcome. Answers go to device storage (`pn.application.draft`) and are written to `user_settings` at "Save your passport" (the same saves as today, then cleared). The citizen number shows after sign-up (it's assigned then).

**Entitlement.** One server-side truth for "Pro right now" (in trial or subscribed), from **RevenueCat**, which handles Apple's in-app purchases on iPhone and Stripe on the web:
- A webhook (`/api/billing/webhook`, signed) writes a server-only `entitlements` row (user, product, trial / active / expired, period end); RLS: the owner can read, nobody can write.
- `/api/generate-plan` checks it; otherwise the free tier's count: `plan_generations` since the start of the current 30.5-day window from `auth.users.created_at`.
- The 10-day no-card trial (counted from `created_at` since the free-tier fix) ends for new accounts; the required trial replaces it.
- The app reads entitlement through RevenueCat's SDK (and the row, for the web).

**Paywall gate.** A signed-in new account without an entitlement that has finished the Application sees page 15 until the trial starts. It's a client gate (the server only meters AI plans), which is how paywalled apps work.

**Trial reminder.** A notification the day before the trial ends (iOS local, Web Push on the web), from the entitlement's period end. Apple's own emails don't cover it everywhere.

## Phases (commit + push `v2` after each)

1. **The funnel, before payments** (no Apple account needed):
   - signed-out quiz with the device draft, Save your passport, Your result, How PN helps, Where did you hear, Your first week, the primed nudge, the staged wait;
   - the free tier at 2 plans per 30.5-day window (site route + core window math, tested);
   - verify on iPhone and web: a new account through every page; an existing account; answers landing.
2. **Payments** (needs the Apple Developer account, App Store Connect products, RevenueCat and a privacy policy page):
   - `entitlements` + webhook (database review + security review), the trial page with Apple's purchase sheet and Stripe on the web, Restore purchases, the trial reminder, Settings → Subscription (manage / restore);
   - the plan route reads entitlements; the created-at trial goes.
3. **Polish and measure:**
   - funnel analytics: where people stop, page by page (Vercel Analytics only covers the web; iOS needs PostHog or our own events table);
   - App Store rating prompt after the first stamp (not during onboarding);
   - real testimonials once the TestFlight students give them.

## Open (Alex)

- **The confirmation email mid-funnel.** With "Confirm email" on, Save your passport sends people to their inbox right before the Oath. Options: (a) a **6-digit code** instead of a link: they type it (iOS offers it from Mail), never leaving the app; (b) sign in at once and confirm the email later (softer, but someone could register an address they don't own); (c) keep the link. Sign in with Apple, once the developer account exists, needs none of this. Recommended: (a).
- **Prices.** v1: $7.99/month or $72/year on Stripe. Needed for App Store Connect in phase 2.
- **Is the yearly plan the default?** Most trial funnels lead with yearly.

## Out of scope

- A discounted offer on decline (the trial can't be declined; maybe later for existing accounts who skip).
- Screen-time-style blocking (Prayer Lock's core mechanic): not what PN is.
