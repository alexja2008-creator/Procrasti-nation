# ProcrastiNation — Business & Marketing Plan

> Living document. Updated as strategy evolves.
> Current phase: **Friends & family beta → feedback collection**
> Market research sourced from Perplexity (February 2026) — see `/Downloads/i am building a productivity app...pdf`

---

## 0. Market Research — Key Findings (Perplexity, Feb 2026)

### Total Addressable Market
| Segment | 2026 Est. | 2032/33 Projection | CAGR |
|---------|-----------|-------------------|------|
| Virtual ADHD Productivity Suites | **~$2.8B** | $6.53B | 15.4% |
| ADHD Planner Apps (narrower) | **~$575M** | $1.8B | 15% |

**For early-stage deck:** Frame 2026 TAM as **$2.5–3B** globally, narrower planner niche at **~$600M**. Both growing at ~15% CAGR — one of the fastest-growing productivity niches.

---

### Competitor Pain Points — Direct From Reddit

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

**What this means for us:** Both tools require users to *become systems designers*. ProcrastiNation's entire premise is the opposite — zero setup, AI does the thinking. Users who are burnt out don't want to configure a productivity system. They want to be told what to do next.

---

### Pricing Benchmarks
| App | Free | Entry Paid | Business |
|-----|------|-----------|----------|
| Notion | Yes | ~$8/mo | ~$15/user/mo |
| Todoist | Yes | ~$4/mo | ~$6/user/mo |
| Market norm | Yes | $3–8/mo | $6–15/user/mo |

**Implication for our pricing:** Our $7.99/mo Pro sits squarely in the sweet spot — clears the "is this worth it?" hurdle and is competitive with Notion at a tighter, more focused value prop. With Tier 1 features live (nudges, weekly reports, syllabus import, calendar), the full-stack accountability offering justifies the price point. Room to raise to $9.99–$12/mo after Tier 2 ships.

---

### SaaS Financial Benchmarks
| Metric | Industry Benchmark | Our Target |
|--------|-------------------|------------|
| Freemium → paid conversion | 2–5% avg | >5% (tight ICP helps) |
| Free trial → paid conversion | 15–30% avg | — |
| Visitor → signup | 3–10% | 7% |
| LTV:CAC ratio (healthy) | 3:1 | ≥3:1 |
| LTV:CAC ratio (B2C SaaS) | ~2.5:1 | — |
| Project mgmt CAC (consumer) | ~$227 | <$50 via organic |

**Our unit economics model (conservative):**
- ARPU: $7.99/mo → $95.88/yr
- Avg paying customer lifetime: 12–18 months (semester + post-grad)
- CLV: **$96–144 per paying user**
- Target CAC via organic (TikTok, Reddit, word-of-mouth): **$20–40**
- LTV:CAC at $25 CAC / $120 CLV = **4.8:1** — comfortably above the 3:1 benchmark
- Path to $12/mo: unlock after Tier 2 features ship, grandfather existing users at $7.99

**The critical variable:** Retention. A student who churns after one semester at $7.99/mo = $32 CLV. A student who stays through all 4 years = $384 CLV. **Every feature we build should be evaluated against: does this extend the customer lifetime?** Re-engagement nudges, streaks, syllabus import (semester rhythm), calendar (daily habit), and the Weekly Citizen Report all directly answer yes.

---

## 1. Product Vision

An AI-powered productivity tool that doesn't just organize chaos — it breaks tasks down until starting is easier than avoiding them. Built specifically for people whose brains resist traditional productivity systems.

**Core insight:** One-shot AI planning is a commodity. ChatGPT does it free. The moat is maintaining an ongoing relationship with a user's goals across sessions — accountability over time.

**Updated product thesis (March 2026):** The planner is the entry point, but the *system* is the moat. Syllabus import hooks students at semester start. Calendar keeps them coming back daily. Boards organize across courses/projects. Recurrence builds habits. Email nudges and weekly reports re-engage between sessions. Every feature reinforces the next.

---

## 2. Ideal Client Profile

### Primary — The High-Stakes Student
- Age: 18–26, college or grad school
- Pain: Deadlines with real GPA, scholarship, or academic standing consequences
- Already pays for: Spotify, ChatGPT, Notion
- Willingness to pay: High — $7.99/mo is less than two coffees vs. a failing grade
- Key insight: Semester rhythm creates built-in re-engagement cycles
- **New hook:** Syllabus import captures them at semester start — one upload, all deadlines tracked

### Secondary — The Early-Career Professional
- Age: 23–32, individual contributor
- Pain: Deliverables, performance reviews, side projects with career consequences
- Willingness to pay: High — likely to expense it or pay without friction
- Key insight: Procrastination has salary-level stakes

### Tertiary — The ADHD-Diagnosed Adult
- Age: 25–45, has tried every productivity app
- Pain: Executive function challenges, dopamine-driven task avoidance
- Willingness to pay: Very high if the product *actually works*
- Key insight: Word-of-mouth in ADHD communities (r/ADHD, TikTok) is explosive

---

## 3. Positioning

**One-liner:**
> "The only productivity app that doesn't just organize your chaos — it breaks it down until starting is easier than avoiding it."

**Brand voice:** Nation/flag metaphor. Inclusive, self-aware, aspirational without being preachy. Speaks to the procrastinator's identity ("citizen of procrastination") and invites transformation ("change your status").

**Key differentiator:** Contextual AI accountability over time — not just a one-shot planner. Upload your syllabus, get a full semester plan. The AI remembers your tasks, nudges you when you stall, and reports your progress weekly.

---

## 4. Go-To-Market Strategy

### Phase 1 — Friends & Family Beta (current)
- Soft launch via personal network at procrasti-nation.work
- Goal: Surface UX bugs, validate core loop (plan → steps → dashboard → streak)
- Success metric: Do users create a second task after completing their first?
- Feedback form: `beta-feedback-form.md`

### Phase 2 — Community Seeding
**Beachhead: College students with ADHD/executive function challenges**

Channels:
- **TikTok** — "study with me" + "ADHD productivity" content. 30-second real plan breakdown videos. Syllabus upload demo is highly shareable.
- **Reddit** — r/ADHD, r/productivity, r/GetMotivated, r/college. Authentic participation, not spam.
- **University channels** — Disability resource centers, tutoring centers, student org partnerships
- **Discord** — Study servers, ADHD support communities

**Content hooks (new with recent features):**
- "I uploaded my entire syllabus and got a plan for every assignment" — viral demo potential
- "This app just scheduled my whole semester" — calendar view screenshot
- "I set my thesis to recur weekly and it just keeps coming back" — recurrence demo
- "My productivity app literally emailed me to finish my essay" — nudge screenshot

### Phase 3 — Conversion Optimization
- Email re-engagement nudges live (Tier 1 shipped)
- Weekly Citizen Report email = high open-rate retention driver (shipped)
- Streak freeze mechanic drives Free → Pro conversion (Tier 2, next)
- Syllabus import is a natural "aha moment" for trial → paid conversion

---

## 5. Pricing Strategy

### Model: Option C — 14-Day Pro Trial Hybrid

Every signup automatically gets a **14-day full Pro trial** (no credit card required). After the trial:
- If they upgrade → $7.99/mo or $72/yr
- If they don't → they drop to the **limited free tier** (5 AI plans/month) rather than a hard cutoff

**Why this model:**
- Free trial → paid conversion benchmarks at **15–30%** vs 2–5% for freemium cold-start
- Students especially respond well: they've experienced real value before being asked to pay
- No credit card friction on signup = higher top-of-funnel volume
- Limited free fallback (5 tasks/month) keeps them in the ecosystem for re-engagement rather than churning completely
- Psychology: "I had it, I lost it" is a stronger upgrade trigger than "I never had it"

| Tier | Price | Key Limits |
|------|-------|------------|
| Free (post-trial) | $0/mo | 5 AI plans/month, public Focus Pods, basic metrics |
| Pro Monthly | $7.99/mo | Unlimited plans, private pods, nudges, streak freeze, templates |
| Pro Annual | $72/yr ($6/mo) | Same as Pro — 25% discount, early adopter lock-in |

**Implementation (shipped):**
- `trial_ends_at` stored in Supabase `user_metadata` on signup (set to +14 days)
- `trialStatus` computed in AuthContext: `'trial'` | `'free'` | `'pro'`
- Trial/free badge shown in nav bar with days remaining
- Free-tier users hit a paywall (UpgradeModal) after 5 tasks/month
- Upgrade modal shows full Pro feature list + pricing + "Continue on Free" escape

**Pricing rationale:**
- Market norm for individual productivity apps: $3–8/mo
- $7.99/mo sits squarely in the sweet spot — clears the "is this worth it?" hurdle faster than $12
- Well below Notion ($8/mo) with a tighter, more focused value prop — easy comparison win
- Annual plan at $72/yr ($6/mo) — clean number, better psychology than $63.99
- 25% discount vs monthly is meaningful enough to drive annual commitment
- Leaves room to raise to $9.99–$12/mo after Tier 2 features (streak freeze, templates) are live
- Consider framing annual as "Charter Membership" for first 100 users

**CTA language:**
- Signup: "14-day free trial, no credit card"
- Free tier: "Claim Your Citizenship"
- Pro tier: "Join the Nation"
- Annual tier: "Charter Membership"

---

## 6. Feature Roadmap (prioritized by ROI)

### Shipped Features (as of March 2026)

| Feature | Status | Impact |
|---------|--------|--------|
| AI Adherence Planner | Shipped | Core loop — plan any task into micro-steps |
| Clarification questions | Shipped | Smarter plans for vague tasks |
| Step editing (add/edit/delete/reorder) | Shipped | Users customize AI output |
| Priority & due dates | Shipped | Urgency-based sorting on dashboard |
| Recurring tasks (daily/weekly/monthly) | Shipped | Habit building, extends retention |
| Syllabus import (PDF/DOCX/image) | Shipped | Semester-start hook for students |
| Calendar (day/week/month views) | Shipped | Daily engagement driver |
| AI step scheduling | Shipped | Auto-resolves "when" for each step |
| Dashboard with stats & archive | Shipped | Progress visibility, streak motivation |
| Kanban boards | Shipped | Organization by project/course |
| Focus Pods (Whereby video) | Shipped | Social accountability |
| Reset Station (wellness videos) | Shipped | Burnout recovery |
| Interactive onboarding tutorial | Shipped | Reduces first-session drop-off |
| Supabase auth + 14-day Pro trial | Shipped | Conversion model |
| Free tier (5 plans/month) | Shipped | Retention fallback |
| Email nudges (daily cron) | Shipped | Re-engagement for stale tasks |
| Weekly Citizen Report (Monday cron) | Shipped | Retention, AI pep talk |
| FAQ page | Shipped | Self-serve support |
| Google Calendar / .ics export | Shipped | External calendar integration |

### Tier 2 — Build for Conversion (next)
**1. Streak Freeze (Pro only)**
- Allow Pro users to "freeze" their streak once per month (Duolingo mechanic)
- Single mechanic that drives more Free → Pro upgrades than almost anything else
- Low effort to build

**2. Task Templates by Category**
- Pre-built AI plan starters for high-frequency high-stakes tasks:
  - "Write a thesis chapter"
  - "Prepare for a job interview"
  - "Launch a freelance project"
  - "Study for an exam"
  - "Plan a difficult conversation"
- Students love a fast path to a plan

### Tier 3 — Delight & Retention
**3. Mid-Task AI Check-In**
- Trigger: User marks ~50% of steps complete
- Prompt: "How are you feeling? Any blockers?"
- Action: Encourage, reframe remaining steps, or regenerate revised plan
- This is the "coach in your pocket" moment

**4. Private Focus Pods (Pro only)**
- Free: Public pods (join anyone)
- Pro: Private 1–3 person pods — invite your study partner, accountability buddy
- Genuinely social, hard to replicate with a free tool

### Tier 4 — Growth & Platform
**5. Stripe integration for payments**
- Required before any real Pro revenue
- Webhook for subscription status → update `trialStatus` to `'pro'`

**6. Push notifications / mobile**
- Step reminders, streak warnings, pod invites
- PWA or React Native wrapper

**7. Team/classroom mode**
- Instructor creates syllabus → students auto-import
- Group streaks, shared boards
- University licensing opportunity

---

## 7. Success Metrics to Track

| Metric | Industry Benchmark | Our Target (Phase 2) |
|--------|-------------------|---------------------|
| Visitor → signup rate | 3–10% | >7% |
| Freemium → paid conversion | 2–5% | >5% |
| D7 retention | varies | >40% |
| Tasks per user per week | — | >2 |
| Email nudge click-through | — | >25% |
| NPS | 30–50 avg SaaS | >50 |
| LTV:CAC ratio | 3:1 healthy | ≥3:1 |
| Avg customer lifetime | — | >14 months |
| Syllabus imports per user | — | 1+ per semester |
| Calendar daily active users | — | >30% of registered |

---

## 8. Beta Feedback Form

*See `beta-feedback-form.md` for the full form with questions, rationale, and response log.*

**Form link (add when live):** _____

**Target responses before Phase 2:** 10 minimum, 25 ideal

### What We're Listening For
| Signal | Indicates |
|--------|-----------|
| "I didn't know what to do next" | Onboarding gap (tutorial may address) |
| "The plan felt too generic" | Clarification questions need tuning |
| "I forgot to come back" | Need re-engagement nudges (shipped) |
| "The syllabus import got my whole semester set up" | Student hook validated |
| "I use the calendar every day" | Daily engagement loop working |
| "The boards help me organize by class" | Kanban resonating with students |
| "I told [person] about it" | Word-of-mouth potential, note what they said |
| "I'd pay for it if..." | Direct feature prioritization signal |
| "It actually helped me finish" | Core loop validated |

---

## 9. Feedback Log

*Log insights from beta users here as they come in. Add to the form response tracker in `beta-feedback-form.md`.*

| Date | User | Key Insight | Action Taken |
|------|------|-------------|--------------|
| — | — | — | — |

---

*Last updated: March 2026. All Tier 1 features shipped. Syllabus import, calendar, boards, recurrence, and onboarding tutorial added. Next review: after 10 beta responses collected.*
