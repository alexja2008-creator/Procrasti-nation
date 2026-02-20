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

**What this means for us:** Both tools require users to *become systems designers*. ProcrastiNation's entire premise is the opposite — zero setup, AI does the thinking. This is the gap. Users who are burnt out don't want to configure a productivity system. They want to be told what to do next.

---

### Pricing Benchmarks
| App | Free | Entry Paid | Business |
|-----|------|-----------|----------|
| Notion | Yes | ~$8/mo | ~$15/user/mo |
| Todoist | Yes | ~$4/mo | ~$6/user/mo |
| Market norm | Yes | $3–8/mo | $6–15/user/mo |

**Implication for our pricing:** Our $12/mo Pro sits at the *premium end* of individual productivity apps. This is defensible **only if** we deliver genuine AI accountability (nudges, check-ins, reports) — not just planning. If we ship only the planner, $8/mo is more appropriate. $12/mo requires the full Tier 1 feature set.

**Consider:** An annual plan at $96/yr ($8/mo equivalent) as an early adopter offer to lock in retention.

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
- Path to $12/mo: unlock after Tier 1 features ship, grandfather existing users at $7.99

**The critical variable:** Retention. A student who churns after one semester at $12/mo = $48 CLV. A student who stays through all 4 years = $576 CLV. **Every feature we build should be evaluated against: does this extend the customer lifetime?** Re-engagement nudges, streaks, and the Weekly Citizen Report all directly answer yes.

---

## 1. Product Vision

An AI-powered productivity tool that doesn't just organize chaos — it breaks tasks down until starting is easier than avoiding them. Built specifically for people whose brains resist traditional productivity systems.

**Core insight:** One-shot AI planning is a commodity. ChatGPT does it free. The moat is maintaining an ongoing relationship with a user's goals across sessions — accountability over time.

---

## 2. Ideal Client Profile

### Primary — The High-Stakes Student
- Age: 18–26, college or grad school
- Pain: Deadlines with real GPA, scholarship, or academic standing consequences
- Already pays for: Spotify, ChatGPT, Notion
- Willingness to pay: High — $12/mo is two coffees vs. a failing grade
- Key insight: Semester rhythm creates built-in re-engagement cycles

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

**Key differentiator:** Contextual AI accountability over time — not just a one-shot planner.

---

## 4. Go-To-Market Strategy

### Phase 1 — Friends & Family Beta (current)
- Soft launch via personal network
- Goal: Surface UX bugs, validate core loop (plan → steps → dashboard)
- Success metric: Do users create a second task after completing their first?

### Phase 2 — Community Seeding
**Beachhead: College students with ADHD/executive function challenges**

Channels:
- **TikTok** — "study with me" + "ADHD productivity" content. 30-second real plan breakdown videos. Study communities go viral fast.
- **Reddit** — r/ADHD, r/productivity, r/GetMotivated. Authentic participation, not spam.
- **University channels** — Disability resource centers, tutoring centers, student org partnerships
- **Discord** — Study servers, ADHD support communities

### Phase 3 — Conversion Optimization
- Add email re-engagement nudges (see Feature Roadmap)
- Weekly Citizen Report email = high open-rate retention driver
- Streak freeze mechanic drives Free → Pro conversion

---

## 5. Pricing Strategy

| Tier | Price | Key Limits |
|------|-------|------------|
| Free | $0/mo | 5 AI plans/month, public Focus Pods, basic metrics |
| Pro Monthly | $7.99/mo | Unlimited plans, private pods, nudges, streak freeze, templates |
| Pro Annual | $63.99/yr ($5.33/mo) | Same as Pro — ~33% discount, early adopter lock-in |

**Pricing rationale (from market research):**
- Market norm for individual productivity apps: $3–8/mo
- $7.99/mo sits squarely in the sweet spot — clears the "is this worth it?" hurdle faster than $12
- Well below Notion ($8/mo) with a tighter, more focused value prop — easy comparison win
- Annual plan at $63.99/yr (~$5.33/mo) locks in retention through the critical first year
- Leaves room to raise to $9.99–$12/mo after Tier 1 features (nudges, Weekly Report) are live
- Consider framing annual as "Charter Membership" for first 100 users

**CTA language:**
- Free tier: "Claim Your Citizenship"
- Pro tier: "Join the Nation"
- Annual tier: "Charter Membership"

---

## 6. Pro Feature Roadmap (prioritized by ROI)

### 🔥 Tier 1 — Build First
**1. Email Re-engagement Nudges**
- Trigger: Task in-progress, untouched for 24hrs
- Message: "Hey — you've got 3 steps left on '[Task Title].' Want to knock one out right now?" with deep link back to exact task
- Stack: Resend API (free up to 3k/mo emails) + Vercel cron job checking `tasks` table for stale `in_progress` rows
- Impact: Single highest-ROI feature. Contextual + actionable = high click-through. No other tool does this with the actual remaining steps.

**2. Weekly Citizen Report**
- Trigger: Every Monday morning
- Content: Tasks completed, current streak, in-progress summary, AI-generated pep talk calibrated to their week
- Impact: Makes product feel alive between sessions. High open rates if copy matches brand voice.

### 🟡 Tier 2 — Build for Conversion
**3. Streak Freeze (Pro only)**
- Allow Pro users to "freeze" their streak once per month (Duolingo mechanic)
- Single mechanic that drives more Free → Pro upgrades than almost anything else
- Low effort to build

**4. Task Templates by Category**
- Pre-built AI plan starters for high-frequency high-stakes tasks:
  - "Write a thesis chapter"
  - "Prepare for a job interview"
  - "Launch a freelance project"
  - "Study for an exam"
  - "Plan a difficult conversation"
- Students love a fast path to a plan

### 🟢 Tier 3 — Delight & Retention
**5. Mid-Task AI Check-In**
- Trigger: User marks ~50% of steps complete
- Prompt: "How are you feeling? Any blockers?"
- Action: Encourage, reframe remaining steps, or regenerate revised plan
- This is the "coach in your pocket" moment

**6. Private Focus Pods (Pro only)**
- Free: Public pods (join anyone)
- Pro: Private 1–3 person pods — invite your study partner, accountability buddy
- Genuinely social, hard to replicate with a free tool

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

---

## 8. Beta Feedback Form

*See `beta-feedback-form.md` for the full form with questions, rationale, and response log.*

**Form link (add when live):** _____

**Target responses before Phase 2:** 10 minimum, 25 ideal

### What We're Listening For
| Signal | Indicates |
|--------|-----------|
| "I didn't know what to do next" | Onboarding gap |
| "The plan felt too generic" | Clarification questions need tuning |
| "I forgot to come back" | Need re-engagement nudges (Tier 1 feature) |
| "I told [person] about it" | Word-of-mouth potential, note what they said |
| "I'd pay for it if..." | Direct feature prioritization signal |
| "It actually helped me finish" | Core loop validated ✅ |

---

## 9. Feedback Log

*Log insights from beta users here as they come in. Add to the form response tracker in `beta-feedback-form.md`.*

| Date | User | Key Insight | Action Taken |
|------|------|-------------|--------------|
| — | — | — | — |

---

*Last updated: February 2026. Market research added from Perplexity session. Next review: after 10 beta responses collected.*
