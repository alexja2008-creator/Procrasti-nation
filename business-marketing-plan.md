# ProcrastiNation — Business & Marketing Plan

> Living document. Updated as strategy evolves.
> Current phase: **v2 launch.** The web app goes live free-only on October 16, 2026. The iPhone app goes to 10 students on TestFlight, then to the App Store with payments.
> Product and pricing decisions come from `DECISIONS.md` (Pricing) and `docs/plans/active/conversion.md`; if this document disagrees with them, they win.
> Numbers marked *estimate* are ours, not data: replace them with real ones as the launch cohorts come in.
> **Funnel model:** [ProcrastiNation Funnel](https://claude.ai/artifact/4vZQq3U5ktmiaZTUGYc4jv) (private to Alex until shared) runs this plan's numbers from views to revenue and keeps the post log (section 4, Phase 3).
> Market research sourced from Perplexity (February 2026) — see `/Downloads/i am building a productivity app...pdf`

---

## 0. Market Research — Key Findings

### Total Addressable Market (Perplexity, Feb 2026)
| Segment | 2026 Est. | 2032/33 Projection | CAGR |
|---------|-----------|-------------------|------|
| Virtual ADHD Productivity Suites | **~$2.8B** | $6.53B | 15.4% |
| ADHD Planner Apps (narrower) | **~$575M** | $1.8B | 15% |

**For early-stage deck:** Frame 2026 TAM as **$2.5–3B** globally, narrower planner niche at **~$600M**. Both growing at ~15% CAGR — one of the fastest-growing productivity niches.

---

### Competitor Pain Points — Direct From Reddit (Perplexity, Feb 2026)

**Notion's top complaints (r/Notion, r/productivity):**
- "Aesthetic trap" — requires too much upkeep to actually be productive
- Slow and cumbersome as setups grow; takes more time to maintain than it saves
- New features geared toward enterprise, not individual workflows
- Overhyped "all-in-one OS" promise that doesn't deliver for solo users

**Todoist's top complaints (r/todoist):**
- Sorting/manual control feel constrained — can't drag-reorder freely
- Calendar integration unreliable; older versions were better
- Visually cluttered UI, too much vertical space per task
- No flexible time-blocking or task duration
- No way to separate work vs. personal profiles

**What this means for us:** Both tools require users to *become systems designers*. ProcrastiNation's premise is the opposite: no setup, the AI breaks the task down, and the app tells you the next small step. People who are burnt out don't want to configure a productivity system. They want to be told what to do next.

---

### Pricing Benchmarks (Perplexity, Feb 2026)
| App | Free | Entry Paid | Business |
|-----|------|-----------|----------|
| Notion | Yes | ~$8/mo | ~$15/user/mo |
| Todoist | Yes | ~$4/mo | ~$6/user/mo |
| Market norm | Yes | $3–8/mo | $6–15/user/mo |

**Implication for our pricing:** We priced at the low end on purpose: **$4.99/month, $29.99/year** (section 5). For a student, $4.99 is an impulse buy and $7.99 an instant turn-off (Alex, 2026-10-13). v1's $7.99/month and $72/year are retired.

---

### Subscription App Benchmarks (RevenueCat, State of Subscription Apps 2026)
PN is now an App Store subscription app, so it's measured against those, not against web SaaS.

| Metric | Median | Source |
|--------|--------|--------|
| Downloads → paid by day 35, hard paywall | **10.7%** | RevenueCat 2026 |
| Downloads → paid by day 35, freemium | **2.1%** | RevenueCat 2026 |
| Trial → paid, trials of 4 days or less | 25.5% | RevenueCat 2026 |
| Trial → paid, 5–9 days (our 7-day trial) | ~37% | A secondary source citing RevenueCat 2026; unverified |
| Trial → paid, 17–32 days | 42.5% | RevenueCat 2026 |
| Yearly subscribers still paying after a year | ~27–28% | RevenueCat 2026 (hard paywall and freemium alike) |
| Downloads → trial, Prayer Lock (top of class, a 15-minute onboarding) | 43% | `docs/plans/active/conversion.md` |

"Hard paywall" means nobody uses the app without a trial or purchase; "freemium" means a free app with an optional upgrade. PN's planned model (a required trial to get in, the free tier for anyone who cancels) acts like a hard paywall at the door.

v1's benchmarks (visitor → signup 3–10%, freemium 2–5%, trial → paid 15–30%, consumer CAC ~$227) came from web SaaS with opt-in trials and no longer apply.

Sources: [State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps), [Free trial length](https://www.revenuecat.com/blog/growth/free-trial-length), [Subscription app benchmarks 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026), [Trial-to-paid benchmarks (5–9 day figure)](https://pricepush.app/blog/trial-to-paid-conversion-rate-benchmarks).

---

### Unit Economics (*estimate*)

**What we keep from each price** (App Store at 15% through the Small Business Program, which Alex has to enroll in; web through Stripe at about 2.9% + 30¢; RevenueCat's own fee is free at our early volume, so check its pricing as revenue grows):

| Plan | Price | Net on iPhone | Net on the web |
|------|-------|---------------|----------------|
| Monthly | $4.99 | $4.24 | $4.55 |
| Yearly (founding price) | $29.99 | $25.49 | $28.82 |
| Quarterly (after launch) | $12.99 | $11.04 | $12.31 |

**Lifetime value per paying user:**
- Yearly: $25.49 the first year; with ~27% renewing each year, about **$34** over its life.
- Monthly: students tend to pay through a crunch and cancel; at about 4 months, about **$17**.
- Blended, if ~70% pick yearly (the founding deal, and likely the default): about **$29**. Plan on **~$30 per paying user**, about a quarter of v1's $96–144, which assumed $7.99/month for 12–18 months.

**Revenue per download:** about **$1.50** at our planned 5% downloads → paid (section 5); about $3.20 at the hard-paywall median.

**What this means for acquisition:**
- **Paid ads don't pay at these prices.** At a healthy 3:1, a paying user can cost at most ~$10. At 5–10% downloads → paid, that's $0.50–1.00 per download, well under what US iPhone installs usually cost. Organic content and word of mouth are the plan out of necessity, not just preference. (Prayer Lock's $3–4 per trial works on a ~$50/year plan with a hard paywall.)
- **AI costs are bounded.** A free user gets 2 plans per 30.5 days plus "I'm stuck" (20 a day); everyone is capped at 20 plans a day. A plan costs cents. After launch, measure the real AI cost per active user from Anthropic's usage, since most users will be free.

**The critical variable is still retention,** now at lower prices. A monthly subscriber who stays one semester is worth ~$17; a yearly subscriber who renews through four years of college, ~$100. **Every feature should be judged on one question: does it bring them back to start something?** Today's answers: reminders in their chosen tone, the Morning Briefing, Declarations, Start Mode and the Passport's stamps. Next: State of the Union (a Monday email) and syllabus import (the semester rhythm).

---

## 1. Product Vision

An AI planner that breaks a task into steps small enough to begin, then nudges you to start. Built specifically for people whose brains resist traditional productivity systems.

**Core insight:** One-shot AI planning is a commodity. ChatGPT does it free. The moat is the relationship over time: getting someone to actually start, again and again.

**Product thesis (v2, October 2026): starting is the product.** Plan it turns a task into small steps. Reminders arrive in the voice the person picked (Diplomat, Drill Sergeant or Roast). Start Mode asks for just five minutes, with "I'm stuck" for when they freeze. A Declaration signs a start time. The Passport stamps every start. The Citizenship Application (onboarding) builds up to the Oath: the real planner on their real task, before any ask to pay.

---

## 2. Ideal Client Profile

The Application's purposes of visit (school, work, both, life) map onto these.

### Primary — The High-Stakes Student
- Age: 18–26, college or grad school; high schoolers too (13 and up; under 18 with a parent's or guardian's consent, and on iPhone purchases go through Ask to Buy)
- Pain: Deadlines with real GPA, scholarship, or academic standing consequences
- Already pays for: Spotify, ChatGPT
- Willingness to pay: $4.99/month is an impulse buy; $7.99 was a turn-off. Some have no card, which the required trial has to handle.
- Key insight: Motivation is seasonal (midterms, finals, the start of a semester), so content and re-engagement follow the academic calendar
- Hooks: Plan it on a real assignment during the Application; Roast reminders; syllabus import once it's back

### Secondary — The Early-Career Professional
- Age: 23–32, individual contributor
- Pain: Deliverables, performance reviews, side projects with career consequences
- Willingness to pay: High; at $4.99 there's no friction, and it may be expensed
- Key insight: Procrastination has salary-level stakes

### Tertiary — The ADHD-Diagnosed Adult
- Age: 25–45, has tried every productivity app
- Pain: Executive function challenges, dopamine-driven task avoidance
- Willingness to pay: Very high if the product *actually works*
- Key insight: Word-of-mouth in ADHD communities (r/ADHD, TikTok) is explosive

---

## 3. Positioning

**One-liner (the landing page's):**
> "Start the thing you've been putting off."

**Supporting line:** "ProcrastiNation breaks a big task into steps small enough to begin today, then nudges you when it's time. No guilt, no lectures. Just the next small step."

v1's "The only productivity app that…" is retired: "the only" is a claim we can't prove.

**Brand voice:**
- Nation and passport metaphor for places and rewards (the Citizenship Application, Customs, Territories, the Passport, stamps, Declarations); plain labels on buttons ("Plan it", "Start").
- **Relief, not shame.** Shame feeds procrastination. Roast jokes about the task, never the person.
- **True numbers only.** No "#1 app", made-up user counts or reviews (the FTC's 2024 rule bans fake reviews, and Apple rejects misleading claims). Real quotes from the TestFlight students later.

**Key differentiator:** It gets you started, not just organized. The first plan is built on your real task in the first few minutes; the nudges come in a voice you chose; Start Mode asks for five minutes; the Passport counts starts, not finished checklists.

---

## 4. Go-To-Market Strategy

### Phase 1 — Web launch and TestFlight (now)
- **October 16, 2026:** v2 replaces v1 at procrasti-nation.work (the landing page) and app.procrasti-nation.work (the app). The web launches **free-only**. It's a fresh start: no v1 accounts carry over.
- **iPhone:** TestFlight with 10 students (an external group with a public link), on production.
- Goal: Does the core loop hold? Application → the Oath (first plan) → a first start in Start Mode → back within a week.
- Success metric: the share of new passports that start something in their first 7 days, then come back and start again.
- Feedback: the TestFlight students (section 8).

### Phase 2 — The App Store, with payments
- RevenueCat (Apple's in-app purchase on iPhone, Stripe on the web), the required 7-day trial, Restore purchases, the trial reminder (`docs/plans/active/conversion.md`, phase 2).
- Accounts made in Phase 1 are offered the trial once and can skip it; they keep the free tier.

### Phase 3 — Organic content (the main channel)
**Beachhead: students, especially those with ADHD or executive function challenges.**

**The plan: 150 TikToks and 150 Instagram Reels, plus word of mouth.** No paid ads (section 0).

**Track it in the [funnel model](https://claude.ai/artifact/4vZQq3U5ktmiaZTUGYc4jv):** log each post's views as it goes out (and update them as they climb), plus the TikTok and Instagram answers to "Where did you hear about us?". It projects the rest of the plan from the real numbers and holds the assumptions below.

**Expectations (*estimate*, October 2026; replace with real numbers after the first 20–30 posts):**
On a new account, each 1,000 views brings about 5–15 profile visits, 1–4 link clicks and **0.3–1.5 sign-ups** (0.03–0.15% of views). Some viewers search for the app instead of tapping, so tracked numbers run low.

| Scenario | Views across all posts | Sign-ups | Rough odds |
|----------|------------------------|----------|------------|
| Stalls: most videos stay at 200–800 views | 60k–150k | 30–150 | ~40% |
| Finds an audience by post 40–80 | 300k–1.5M | 200–1,000 | ~45% |
| One or two videos break out | 3M+ | 1,500–5,000+ | ~15% |

- **Plan on 150–400 sign-ups.** Don't build a plan that needs the breakout.
- If the Reels repost the TikToks, that's 150 chances at a breakout, not 300. Reels usually reach fewer people than TikTok for small accounts; their strength is being shared in DMs between friends.
- **What 300 sign-ups would bring (*estimate*):** with the required trial at ~5% downloads → paid, about 15 paying users and ~$450 in lifetime revenue. Sign-ups made while the web is free-only convert more like freemium (~2%): about 6 paying users once payments arrive.
- **So time the push.** Post through the web launch to learn which formats work. Save the strongest posts for the moments students feel the pressure (finals in early to mid December, the spring semester's start in mid January), and if possible for after payments are live.

**Channels:**
- **TikTok and Instagram Reels** (primary): a repeating series beats one-off demos.
- **Word of mouth:** friends, and the TestFlight students' circles.
- **Reddit:** r/ADHD, r/productivity, r/GetMotivated, r/college. Authentic participation, not spam.
- **University channels:** disability resource centers, tutoring centers, student org partnerships.
- **Discord:** study servers, ADHD support communities.

**Content hooks (v2):**
- **Roast reminders as lock screens:** "My planner roasted my history paper." Roast is designed to be "funny enough to screenshot"; its jokes are about the task, never the person.
- **The three tones side by side:** the same reminder from the Diplomat, the Drill Sergeant and Roast.
- **Plan it on a real assignment:** a scary task turned into steps small enough to start tonight.
- **Start Mode's five-minute contract:** "I only had to do five minutes."
- **Signing a Declaration:** signing my name to a start time, then keeping it.
- **Passport stamps and ranks:** earned for starting, not finishing.
- v1's hooks retired: the syllabus upload (not in v2 yet), calendar screenshots and the nudge email.

**Findability (fix before the push):**
- The App Store name is **"ProcrastiNation: AI Planner"**, because a 2025 joke app called "Procrasti Nation" holds the plain name. People who search may install the wrong app, so show the exact name and icon on screen.
- **procrasti-nation.work** is easy to get wrong (the hyphen, the .work ending): show it, say it, and pin a comment with the link.
- **TikTok shows a bio link only from 1,000 followers** on a personal account; check whether a Business account gets one sooner.

**Attribution:**
- The Application asks **"Where did you hear about us?"** (TikTok / Instagram / YouTube / A friend / App Store / Other), which catches the people who searched instead of tapping.
- Tag each platform's link (e.g. `?utm_source=tiktok`) so the site's analytics can tell them apart.

### Phase 4 — Conversion and retention
- The trial page, measured page by page (funnel analytics: Vercel Analytics covers only the web; iOS needs PostHog or our own events table).
- If trial starts run low, test a reverse trial (7 days of Pro with no payment method, then free) against the required one with RevenueCat's paywall experiments.
- State of the Union (a Monday morning email) replaces the Weekly Citizen Report.
- An App Store rating prompt after the first stamp (not during onboarding); real testimonials from the TestFlight students.
- The Quarterly plan ($12.99), revisited after launch.
- v1's levers retired: email nudges and the weekly report (at cutover), and the streak freeze (v2 has stamps and ranks, not streaks).

---

## 5. Pricing Strategy

### Model: a required 7-day trial, with the free tier on the way out (planned; Alex, 2026-10-07)
- **New accounts start a 7-day free trial of Pro** to use the app. The payment method is taken at the start (Apple ID on iPhone, a card on the web), and nothing is charged until it ends. It can't be skipped.
- **Cancelling keeps the free tier:** Today, quick add, notes, reminders, Start Mode with "I'm stuck", territories, search, Declarations and the Passport, plus 2 AI plans per 30.5 days. The trial page says so: "Cancel anytime before it ends. You keep the free version."
- Accounts made before payments (Phase 1) are offered the trial once and can skip it.
- A pending Ask to Buy goes in on the free tier.

**Why this model:**
- A hard paywall turns ~5× more downloads into payers than freemium (10.7% vs 2.1%), and the free tier keeps people who cancel as users who can convert later and still recommend the app.
- **7 days, not 3:** PN's value is active (it pays off only when people come back and start something), and longer trials convert better.
- The risk: avoidant people defer at a payment step and never come back. That's why the free tier is said out loud, and why a reverse trial is the fallback test (Phase 4).

### Until payments ship (the web launch)
- **Free-only:** everyone gets the free tier.
- A saved passport also gets **10 days of Pro with no card**, counted from when the account was created (`apps/site/lib/trial.js`; never from `user_metadata`). An anonymous passport gets no trial. The required trial replaces this.

### Tiers
| Tier | Price | What it includes |
|------|-------|------------------|
| Free | $0 | Everything in the app; AI plans: 2 per 30.5-day window from the account's creation (the Oath's plan is the first) |
| Pro Monthly | $4.99/mo (`1A`) | Plans with no monthly count |
| Pro Yearly, founding price | $29.99/yr (`1B`) | Same as Pro; shown as "save 50%" against monthly |
| Pro Quarterly | $12.99 / 3 months (`1C`) | Same as Pro; revisit after launch |

- **Plans are capped at 20 a day for everyone,** the trial and Pro included (Alex, 2026-10-13): no person needs more, and it stops one account from running up the AI bill. "Unlimited" means no monthly count.
- **"I'm stuck" is free for everyone** (20 a day): Start Mode is what keeps people, so it isn't a Pro feature.

### Pricing rationale (Alex, 2026-10-13; drafted in App Store Connect)
- $4.99/month is an impulse buy for a student; $7.99 is an instant turn-off.
- $29.99/year: it was $49.99 at first, but 17% off monthly wasn't a deal.
- **"Founding" is a promise:** if the yearly price goes up later, it goes up for new subscribers only (App Store Connect: keep the current price for existing subscribers). This replaces v1's "Charter Membership" idea.
- "Save 50%" is measured against monthly (12 × $4.99 = $59.88, a price anyone can pick), never against a price nobody pays (no "was $49.99"). Apple requires the billed amount to be the most prominent price (3.1.2), so there's no per-week price over the yearly one.
- Apple allows one introductory offer per subscription, and the free trial is it, so there's no cheaper first year on top.
- The 3-month plan is "Quarterly", not "Semester": Apple has no 4-month length, and a 3-month "Semester" would end before finals.
- **Open (Alex):** is yearly the default on the trial page? Most trial funnels lead with yearly, and at $29.99 (save 50%) it's the obvious pick.

### Estimated conversion (*estimate*; replace with real numbers)
With the required trial on the App Store:

| Step | Estimate | Reasoning |
|------|----------|-----------|
| Downloads → trial starts | 15–30% | A long Application builds commitment before the ask (Prayer Lock reached 43%); students without cards and an avoidant audience pull it down |
| Trial → paid (7 days) | 25–40% | ~37% median for 5–9 day trials; students and pending Ask to Buy pull it down |
| **Downloads → paid** | **about 4–12%; plan on 5%** | Below the hard-paywall median (10.7%) until real numbers say otherwise |
| Free users (cancelled, or from Phase 1) → paid later | ~2% | The freemium median |

**What v1's plan got wrong:** it applied the 15–30% benchmark for opt-in trials to a trial everyone got automatically with no card. That kind of trial converts more like freemium: low single digits of sign-ups.

### Trial page copy (planned)
- "7 days free, then $29.99/year." (the billed amount is the most prominent price)
- "Cancel anytime before it ends. You keep the free version."
- "We'll remind you the day before it ends."
- Restore purchases; links to the Terms and Privacy policy (Apple requires them).
- v1's "14-day free trial, no credit card" is retired.

### Implementation
**Shipped (v2):**
- The free tier counts `plan_generations` (insert and read only, so a count can't be reset) per 30.5-day window from `auth.users.created_at` (core `planWindow`, `FREE_PLANS_PER_WINDOW` = 2). A 429 carries `limit: 'free' | 'daily'`, so the app says the right thing.
- The 10-day no-card trial from `created_at` (`lib/trial.js`); none for anonymous passports.
- Metered AI in `ai_requests` (`lib/limits.js`): "I'm stuck" and clarifying questions at 20 a day, one plan at a time, dating steps at 60 a day.
- Prices drafted in App Store Connect: `1A` monthly and `1B` yearly; `1C` (quarterly) waits until after launch.
- Retired: v1's `trial_ends_at` in `user_metadata` (people could rewrite their own and give themselves endless trials) and v1's Stripe checkout.

**Planned (`docs/plans/active/conversion.md`, phase 2):** RevenueCat with a server-side `entitlements` row written by a signed webhook; the trial page; Restore purchases; Ask to Buy; the trial reminder; Settings → Subscription. Alex, in App Store Connect: the Paid Apps agreement, tax and banking; enroll in the Small Business Program (15%).

---

## 6. Feature Roadmap

### Shipped in v2 (October 2026)
| Feature | Why it matters |
|---------|----------------|
| Citizenship Application and the Oath | Onboarding that ends with a real plan on their real task, before any ask |
| Anonymous passport, then Save your passport | No email before the Oath; saved later with a username and an email (texted codes once Twilio is set up) |
| Plan it (AI planner) | Clarifying questions, then steps saved as tasks |
| Start Mode and "I'm stuck" | The five-minute contract; a 2-minute action when they freeze (free for everyone) |
| Declarations | Sign a start time; it's kept when Start Mode opens around it |
| Reminders and nudge tones | iPhone notifications and Web Push in the Diplomat, Drill Sergeant or Roast voice; the morning list |
| Today and the Morning Briefing | The next step and the day's agenda; what carried over gets a place (or Pick three when there's a lot) |
| Upcoming, Territories, Notes, Search | The everyday organizer, with repeats and quick add ("fri 6pm #chem"); replaces v1's calendar views and boards |
| Passport | Citizen number, stamps, ranks from real starts |
| Account | Download your data, Delete your passport, Night / Day theme |
| Landing page, Privacy policy, Terms | procrasti-nation.work |

### Retired with v1 (2026-10-12)
Calendar views (→ Upcoming), Kanban boards (→ Territories), Focus Pods (2026-10-08), Reset Station, the daily email nudges, the Weekly Citizen Report (→ State of the Union), the interactive tutorial (→ the Application), streaks (→ stamps and ranks), friends and public profiles, the FAQ and Stripe checkout. Syllabus import and Google Calendar / .ics export aren't in v2 yet.

### Next
1. **Payments and the required trial** (RevenueCat; `docs/plans/active/conversion.md`, phase 2)
2. **The App Store release** after TestFlight
3. **Funnel analytics,** page by page
4. **State of the Union** (a Monday morning email)
5. **Syllabus import** for v2 (`parse-syllabus` is kept for it): the semester-start hook
6. **Apple and Google** to save a passport; texted codes (Twilio Verify)
7. **Offline mode and sync** between devices (the PowerSync trial)
8. **The Quarterly plan**

**Ideas, not scheduled:** task templates ("Study for an exam", "Write a thesis chapter", "Prepare for a job interview"); a mid-plan AI check-in (partly covered by "I'm stuck"); classroom mode (instructors share a syllabus, students import it; the schools tables already exist in production).

---

## 7. Success Metrics to Track

| Metric | Benchmark | Our target (first guess) |
|--------|-----------|--------------------------|
| Application → the Oath's plan built | — | >60% |
| New passports → a start in Start Mode within 7 days | — | >40% |
| Anonymous passports saved | — | >50% |
| Reminders allowed, of those asked | — | >50% |
| D7 / D30 retention (started something that day) | — | >30% / >15% |
| Starts per active user per week | — | >3 |
| Sign-ups per 1,000 views | — | 0.3–1.5 (*estimate*) |
| "Where did you hear about us?" by platform | — | Track |
| Downloads → trial starts | 43% (Prayer Lock) | 15–30% |
| Trial → paid | ~37% (5–9 day trials) | >30% |
| Downloads → paid by day 35 | 10.7% hard paywall / 2.1% freemium | >5% |
| Yearly share of new subscribers | — | >60% |
| Yearly renewal | ~27–28% | >30% |
| Cost per paying user (if paid ads are ever tried) | — | <$10 (3:1 on ~$30) |
| NPS | 30–50 avg | >50 |

---

## 8. Beta Feedback (TestFlight)

- 10 students on TestFlight, on production, after cutover.
- The form: `beta-feedback-form.md` (rewritten for v2, 2026-10-14), sent after about a week with the app. Bugs go through TestFlight's own feedback.
- **Target responses:** all 10. Its decision gate (4 of 10 started something, NPS ≥ 30) decides the App Store and the content push.

### What We're Listening For
| Signal | Indicates |
|--------|-----------|
| "I didn't know what to do next" | Today's next step isn't clear enough |
| "The plan felt too generic" | Clarifying questions need tuning (`evals/plan-quality`) |
| "I turned the reminders off" | The tone or the timing is wrong |
| "I screenshotted the Roast" | The shareable hook works |
| "Five minutes turned into an hour" | Start Mode works |
| "I signed it and actually started" | Declarations work |
| "I told [person] about it" | Word-of-mouth potential, note what they said |
| "I'd pay for it if..." | Direct pricing and Pro signal |
| "It actually helped me start" | Core loop validated |

---

## 9. Feedback Log

*Log insights from beta users here as they come in. Add to the form response tracker in `beta-feedback-form.md`.*

| Date | User | Key Insight | Action Taken |
|------|------|-------------|--------------|
| — | — | — | — |

---

*Last updated: October 14, 2026. v2's prices ($4.99/month, $29.99/year founding, Quarterly later), the free tier (2 plans per 30.5 days), the planned required 7-day trial, conversion estimates against RevenueCat's 2026 benchmarks, the organic content plan, and v2's features. Next review: after the TestFlight students' feedback and the first 20–30 posts.*
