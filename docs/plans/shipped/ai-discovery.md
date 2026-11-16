# Plan: AI discovery (making the site readable by answer engines)

**Status: approved by Alex 2026-11-16, with the recommended answer to each decision. Built the same day** (notes under each phase).

## Overview
When someone asks ChatGPT, Claude, Perplexity or Google's AI answers for "an app that helps me start homework I'm avoiding", the engine can only recommend PN if it can read what PN is, who it's for and what it costs. Today the site gives it a title, a description and a landing page: no structured data, no `robots.txt` (the live address returns 404), no sitemap, no `llms.txt`, no question-and-answer content. This plan adds those to `apps/site`. Nothing changes in the app, the API or the database.

It answers an outside audit Alex ran on 2026-11-16 (nine recommendations, scored). Checked against the code:

| # | Recommendation | Points | In this plan |
|---|---|---|---|
| 1 | JSON-LD: who you are and what you sell | 12 | Yes, phase 1 |
| 2 | `llms.txt` | 5 | Yes, phase 1 |
| 3 | Sitemap, with `robots.txt` pointing at it | 5 | Yes, phase 1 |
| 4 | Questions and answers with FAQ schema | 2 | Yes, phase 2 |
| 5 | `robots.txt` allows answer engines | 1 | Yes, phase 1 (same file as 3) |
| 6 | Real links for navigation | 1 | No: already true. The only `onClick` handlers are the tone carousel's buttons |
| 7 | Describe images | 1 | No: already true. Every screenshot has alt text; the decorative icon is correctly empty |
| 8 | Title, description, social tags | 1 | Yes, phase 1: canonical URL, `og:url`, a fuller Open Graph title |
| 9 | Pricing discoverable | 1 | Yes, as "free" in JSON-LD, `llms.txt` and the FAQ; no pricing page (decision 3) |

## Decisions (Alex, 2026-11-16: the recommended answer to each)
1. **Which crawlers are let in?** Recommended: everyone, everywhere except `/api/`. That includes the crawlers that gather training data (GPTBot, ClaudeBot, CCBot, Google-Extended) as well as the ones that fetch a page to answer a question (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-User). The site is marketing and legal text only, and being in the training data is part of how a model comes to know PN exists. The alternative is to allow only the answer-time crawlers.
2. **Where does the FAQ live?** Recommended: a "Questions" section on the landing page, above the closing section, with `/faq` sent to it (`/#questions`). One page carries all the weight, and `/faq` stops landing people in the app's sign-in. The alternative is a page of its own at `/faq`.
3. **How is pricing stated?** Recommended: "Free" now, in the structured data, `llms.txt` and one FAQ answer, and no pricing page until payments ship (`conversion.md`, phase 2). That PR then updates all three. Open question inside this: should the FAQ say anything yet about paid plans coming?
4. **The FAQ's words.** The draft is under "Data and copy" below. Alex edits or approves each answer; nothing ships that he hasn't read.
5. **The iPhone app's wording.** The hero says "the iPhone app is on its way". Recommended: the same in the FAQ and `llms.txt`, with no TestFlight link (the beta link is for people Alex invites).

## Files to create or modify
| File | Action | What changes |
|---|---|---|
| `packages/core/src/nation.ts` | Modify | New `site` copy: the one-paragraph summary, and `faq` (question and answer pairs) |
| `apps/site/lib/site.js` | Modify | `SITE_URL`, shared by the layout, sitemap, robots and JSON-LD |
| `apps/site/components/JsonLd.jsx` | Create | The script tag both JSON-LD blocks use |
| `apps/site/components/landing/Closing.jsx` | Modify | Reads the free list from core |
| `apps/site/lib/structuredData.js` | Create | Builds the JSON-LD objects: `Organization`, `WebSite`, `SoftwareApplication`, `FAQPage` |
| `apps/site/app/layout.jsx` | Modify | The JSON-LD script tag; canonical URL; `og:url`; a fuller Open Graph title |
| `apps/site/app/privacy/page.jsx`, `terms/page.jsx` | Modify | Each page's own canonical URL |
| `apps/site/app/robots.js` | Create | Allow all, disallow `/api/`, point at the sitemap |
| `apps/site/app/sitemap.js` | Create | `/`, `/privacy`, `/terms` |
| `apps/site/app/llms.txt/route.js` | Create | Plain-text summary built from the same core copy, so it can't drift from the page |
| `apps/site/components/landing/Faq.jsx` | Create | The Questions section |
| `apps/site/app/page.jsx` | Modify | Adds the section |
| `apps/site/components/landing/SiteFooter.jsx` | Modify | A "Questions" link |
| `apps/site/next.config.js` | Modify | `/faq` leaves the v1 list and goes to `/#questions` |
| `docs/architecture.md`, `STATUS.md`, `CHANGELOG.md` | Modify | After shipping |

## Phases

### Phase 1: the machine-readable layer (no new copy on the page)
- `robots.js`, `sitemap.js`, `llms.txt`, and JSON-LD for `Organization`, `WebSite` and `SoftwareApplication` (name, description, category, "Web, iOS", a free offer, the app's address).
- Canonical URLs and `og:url`; the Open Graph title becomes the full title, not the bare name.
- **Checked:** `npm run build` in `apps/site`; `/robots.txt`, `/sitemap.xml` and `/llms.txt` return 200 locally with the right content; the page's JSON-LD parses and passes Schema.org's validator; the preview deploy's social card still renders.
- **Needs Alex:** decisions 1, 3 and 5.

**Built 2026-11-16.** As planned, plus: the AI crawlers are named in `robots.txt` as well as covered by `*`, so the choice is written down; `SITE_URL` is always production's, so a preview deploy never claims to be the original; the free list moved from `Closing.jsx` into core's `site.free`, which the page, the JSON-LD's `featureList` and `/llms.txt` share. Checked: `next build` (all three files prerender as static); locally `/robots.txt`, `/sitemap.xml` and `/llms.txt` return 200 with the right content; the page's JSON-LD parses as `Organization`, `WebSite` and `SoftwareApplication`; canonical is `/` on the landing page and each legal page's own. Not checked: Schema.org's validator and the social card on a deployed URL (both need the preview deploy).

### Phase 2: questions and answers
- The FAQ copy in `@pn/core`, the Questions section, `FAQPage` JSON-LD built from the same array as the visible text (Google requires the two to match), the footer link, the `/faq` redirect.
- The section goes through the design skills (`design-taste-frontend --keep palette,type`): A2's type and rules, no card grid.
- **Checked:** `npm run core:test`; the section at phone and laptop width, day and night; keyboard and screen-reader pass on the questions; `/faq` lands on the section; the validator accepts `FAQPage`.
- **Needs Alex:** decisions 2 and 4.

**Built 2026-11-16.** Eight questions in core's `site.faq`, each answer rewritten against the landing page's own claims and the privacy policy's sections 2 and 3 (the last answer names Anthropic, as the policy does). Every answer is always open, no accordion. Changes from the plan: no core test for the FAQ, because `DECISIONS.md` keeps tests for six reasons and copy isn't one; no day check, because the site is always night; the `design-taste-frontend` skill wasn't run, since the section reuses How it works' type, numbering and rules. Checked: `core:test` (104), `site:test` (4), `app:check`; the section at 1024 and 375 px with no sideways scroll; `/faq` answers 307 to `/#questions` and the page lands on the section; the `FAQPage` JSON-LD has all eight pairs, built from the same list as the visible text. Not checked: a screen reader.

### Afterwards (Alex, outside the repo)
- Add the site to Google Search Console and Bing Webmaster Tools and submit the sitemap. Bing's index feeds ChatGPT's search, so that one matters as much as Google's.
- Run the audit again and note the score in `STATUS.md`.

## Data and copy
No tables, no new data collected, no new processor: the privacy policy doesn't change.

The FAQ draft, for Alex to edit (decision 4). Answers lead with the answer, since engines quote the first sentence.

1. **What is ProcrastiNation?** An AI planner for the task you're avoiding. You tell it what you've been putting off, tap Plan it, and it breaks the task into steps small enough to start today.
2. **How does Plan it work?** You type the task and when it's due. Plan it turns it into a short list of small, concrete steps, each one sized so that starting takes a couple of minutes, and puts the first one on Today.
3. **Who is it for?** Students first: essays, problem sets, applications, studying for exams. It works for anything you keep meaning to start.
4. **How much does it cost?** It's free. *(wording depends on decision 3)*
5. **Is there an iPhone app?** PN works in your browser today, on a phone or a laptop. The iPhone app is on its way.
6. **How is it different from a to-do list or a reminders app?** A list holds the task; PN helps you begin it. It makes the first step small, nudges you at the time you chose, and Start Mode keeps you on one step at a time.
7. **Will it make me feel bad about what I haven't done?** No. Nothing in PN is marked overdue or failed. You pick the voice your nudges come in, and all three are on your side.
8. **What happens to what I type?** Your tasks and notes are private to your account. The privacy policy says exactly what's stored and who processes it. *(links to `/privacy`; no claim here the policy doesn't make)*

Before it ships, each answer is checked against the app as it is that day (answers 2 and 6 name features).

## Risks
- **The structured data says "free" after payments ship.** The payments PR must change the JSON-LD, `llms.txt` and FAQ answer 4. A line goes into `conversion.md`'s phase 2 checklist so it isn't missed.
- **FAQ rich results won't appear in Google.** Since 2023 Google shows them only for government and health sites. The schema is still worth having: it's how other engines read the pairs. The points are small (2) for that reason.
- **Letting training crawlers in can't be undone** for pages already fetched. The site has nothing private on it, and `/api/` is excluded.
- **`llms.txt` is a proposal, not a standard.** Not every engine reads it. It costs one small route.
- **The app's own address** (`app.procrasti-nation.work`) isn't in this plan. It's behind sign-in and has nothing for a crawler; whether it should say `noindex` is a separate, small question.

## Done when
- [ ] `https://procrasti-nation.work/robots.txt`, `/sitemap.xml` and `/llms.txt` return 200 in production.
- [ ] The landing page's JSON-LD passes Schema.org's validator with no errors, for all four types.
- [ ] The Questions section is on the page, matches its JSON-LD word for word, and reads right at both widths, day and night.
- [ ] `/faq` lands on the section.
- [ ] `npm run core:test` and `npm run site:test` pass; CI is green.
- [ ] The sitemap is submitted in Search Console and Bing Webmaster Tools (Alex).
- [ ] The audit's score is re-run and recorded.
