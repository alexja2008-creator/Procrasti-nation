---
version: alpha
name: ProcrastiNation-A2-Vintage-Passport
description: ProcrastiNation's own design system, "A2 · Vintage Passport, refined". A task app drawn as a passport. It's navy leather at night (the default) or cream paper by day, with faint security-print lines, ink stamps for rewards and a perforated ticket for the next step. Fraunces carries the voice, Instrument Sans the reading and IBM Plex Mono the official print. The values come from packages/core/src/tokens.ts, and packages/core/test/design-md.test.ts fails if they drift apart.

colors:
  # Night passport: the default in the app, and the only palette on the marketing site.
  bg: "#161B2E"
  security-line: "rgba(212,178,106,0.04)"
  ink: "#ECE6D8"
  ink-soft: "#C9C6BC"
  muted: "#A7AABB"
  accent: "#D4B26A"
  primary: "#7CC3A0"
  primary-text: "#9AD4B6"
  on-primary: "#0F1F17"
  card: "#1E2440"
  page: "#1B2139"
  page-border: "#2A3150"
  rule: "#2A3150"
  chip: "#10152A"
  outline: "#3A4163"
  dashed: "#5E6180"
  checkbox: "#8A8DA3"
  field-bg: "#1E2440"
  field-border: "#8A8DA3"
  error: "#E08A70"
  scrim: "rgba(5,8,18,0.6)"
  apple-bg: "#FFFFFF"
  apple-fg: "#000000"
  next-bg: "#1D2B28"
  next-border: "#34503F"
  next-stub: "#4F7A63"
  next-meta: "#B5C4BA"
  tab-bar-bg: "#10152A"
  tab-bar-border: "#2A3150"
  toggle-thumb: "#ECE6D8"
  toggle-track-off: "#3A4163"
  stamp-terracotta: "#E08A70"
  stamp-violet: "#A3A2D6"
  stamp-forest: "#7CC3A0"
  # Day passport: Settings → Appearance → Day, or Match my device in light mode.
  day-bg: "#F5F1E8"
  day-security-line: "rgba(35,42,69,0.025)"
  day-ink: "#232A45"
  day-ink-soft: "#4A4F63"
  day-muted: "#5C6070"
  day-accent: "#9A7B3C"
  day-primary: "#3A6B52"
  day-primary-text: "#2F5A44"
  day-on-primary: "#FFFFFF"
  day-card: "#FBF8F1"
  day-page: "#EFE8D8"
  day-page-border: "#D8CDB5"
  day-rule: "#DDD4C2"
  day-chip: "#ECE5D6"
  day-outline: "#CFC4AE"
  day-dashed: "#A99C80"
  day-checkbox: "#8E8A7E"
  day-field-bg: "#FBF8F1"
  day-field-border: "#8E8A7E"
  day-error: "#A8513B"
  day-scrim: "rgba(35,42,69,0.35)"
  day-apple-bg: "#000000"
  day-apple-fg: "#FFFFFF"
  day-next-bg: "#E4EADD"
  day-next-border: "#C9D5C0"
  day-next-stub: "#A9BFA6"
  day-next-meta: "#4A5A4E"
  day-tab-bar-bg: "#ECE5D6"
  day-tab-bar-border: "#D8CDB5"
  day-toggle-thumb: "#FFFFFF"
  day-toggle-track-off: "#CFC4AE"
  day-stamp-terracotta: "#A8513B"
  day-stamp-violet: "#5E5D8F"
  day-stamp-forest: "#3A6B52"

typography:
  title:
    fontFamily: Fraunces
    fontSize: 36px
    fontWeight: 500
    lineHeight: 38px
    letterSpacing: -0.36px
  page-title:
    fontFamily: Fraunces
    fontSize: 29px
    fontWeight: 500
    lineHeight: 31px
    letterSpacing: -0.29px
  section:
    fontFamily: Fraunces
    fontSize: 21px
    fontWeight: 500
    lineHeight: 26px
  step:
    fontFamily: Fraunces
    fontSize: 20px
    fontWeight: 500
    lineHeight: 24.5px
  lead:
    fontFamily: Instrument Sans
    fontSize: 15px
    fontWeight: 400
    lineHeight: 21px
  item:
    fontFamily: Instrument Sans
    fontSize: 15.5px
    fontWeight: 500
    lineHeight: 20px
  body:
    fontFamily: Instrument Sans
    fontSize: 14.5px
    fontWeight: 400
    lineHeight: 20px
  meta:
    fontFamily: Instrument Sans
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 16px
  button:
    fontFamily: Instrument Sans
    fontSize: 13.5px
    fontWeight: 600
    lineHeight: 18px
  tab:
    fontFamily: Instrument Sans
    fontSize: 11px
    fontWeight: 500
    lineHeight: 14px
  label:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: 1.1px
  label-small:
    fontFamily: IBM Plex Mono
    fontSize: 10.5px
    fontWeight: 400
    lineHeight: 13px
    letterSpacing: 0.6px

rounded:
  chip: 4px
  sm: 6px
  md: 10px
  lg: 12px
  card: 14px
  pill: 999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
  xxxl: 32px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.item}"
    fontWeight: 600
    rounded: "{rounded.lg}"
    height: 50px
    padding: "0px 18px"
  button-secondary:
    backgroundColor: "{colors.field-bg}"
    borderColor: "{colors.field-border}"
    textColor: "{colors.ink}"
    typography: "{typography.item}"
    fontWeight: 600
    rounded: "{rounded.lg}"
    height: 50px
  button-quiet:
    textColor: "{colors.primary-text}"
    typography: "{typography.item}"
    fontWeight: 600
    height: 44px
    padding: "0px 8px"
  chip:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.outline}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: 36px
    padding: "0px 14px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    borderColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  plan-it-pill:
    backgroundColor: "{colors.card}"
    borderColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.pill}"
    height: 44px
    padding: "0px 14px"
  next-step-card:
    backgroundColor: "{colors.next-bg}"
    borderColor: "{colors.next-border}"
    labelColor: "{colors.primary-text}"
    labelTypography: "{typography.label}"
    titleTypography: "{typography.step}"
    metaColor: "{colors.next-meta}"
    rounded: "{rounded.card}"
    padding: 16px
  next-step-start:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    fontFamily: Fraunces
    fontStyle: italic
    fontSize: 17px
    size: 66px
    rounded: "{rounded.pill}"
  task-row:
    textColor: "{colors.ink}"
    typography: "{typography.item}"
    dividerColor: "{colors.rule}"
    checkboxColor: "{colors.checkbox}"
    checkboxCheckedColor: "{colors.primary}"
    checkboxSize: 22px
    hitTarget: 44px
  duration-chip:
    backgroundColor: "{colors.chip}"
    typography: "{typography.label-small}"
    rounded: "{rounded.chip}"
    padding: "1px 6px"
  stamped-tag:
    borderColor: "{colors.stamp-terracotta}"
    textColor: "{colors.stamp-terracotta}"
    typography: "{typography.label-small}"
    rounded: "{rounded.chip}"
    rotate: -7deg
  declared-tag:
    borderColor: "{colors.stamp-violet}"
    textColor: "{colors.stamp-violet}"
    typography: "{typography.label-small}"
    rounded: "{rounded.chip}"
    rotate: -4deg
  customs-banner:
    borderColor: "{colors.dashed}"
    borderStyle: dashed
    borderWidth: 1.5px
    rounded: "{rounded.md}"
    padding: "0px 14px"
  text-field:
    backgroundColor: "{colors.field-bg}"
    borderColor: "{colors.field-border}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  sheet:
    backgroundColor: "{colors.card}"
    scrimColor: "{colors.scrim}"
    eyebrowTypography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "14px 16px 8px"
  tab-bar:
    backgroundColor: "{colors.tab-bar-bg}"
    borderColor: "{colors.tab-bar-border}"
    typography: "{typography.tab}"
  capture-button:
    backgroundColor: "{colors.primary}"
    ringColor: "{colors.tab-bar-bg}"
    size: 66px
    rounded: "{rounded.pill}"
  id-page:
    backgroundColor: "{colors.page}"
    borderColor: "{colors.page-border}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  round-stamp:
    typography: "{typography.label}"
    size: 116px
  count-stamp:
    titleTypography: "{typography.title}"
    captionTypography: "{typography.label-small}"
    width: 102px
---

# ProcrastiNation: A2 · Vintage Passport, refined

## Overview

ProcrastiNation helps people start what they're avoiding. The whole product is a small nation: you answer a Citizenship Application, carry a Passport, file things in Territories, sign Declarations and earn Stamps for starting. A2 draws that literally. Every screen is a page of a passport, every reward is a stamp in ink, and the next thing to do is a ticket with a stub you tear off by pressing Start.

The default is the **night passport**: navy leather (`{colors.bg}`), cream ink (`{colors.ink}`) and gold foil accents (`{colors.accent}`), because a US passport is navy. The **day passport** is cream paper (`{colors.day-bg}`) with navy ink (`{colors.day-ink}`) and a forest primary. People pick Night, Day or Match my device in Settings, per device. The marketing site is always night.

The look is quiet and printed rather than glossy. The decoration comes from the passport's own objects: security lines, ruled pages, machine-readable lines, perforations and stamps. There are no gradients, glass or drop shadows in the app.

**Key characteristics**
- Faint security-print lines at 135°, 1px every 7px, in `{colors.security-line}` over the page ground. It's the one texture, and it's always on.
- Three stamp inks, each with one meaning: **terracotta** for starting and finishing, **violet** for Declarations and counts, **forest** for approval and citizenship.
- One green primary (`{colors.primary}`) for every action: Start, the capture button, checked boxes, selected chips and Plan it.
- Fraunces 500 for anything that speaks (titles, the next step, the Start button in italic). Instrument Sans for anything you read. IBM Plex Mono in capitals with tracking for anything official (labels, eyebrows, stamp rims, the MRZ lines).
- Flat surfaces separated by hairline borders and fills, never shadows.

## Colors

Tokens live in `packages/core/src/tokens.ts`. Night names here are plain (`ink`); the day equivalent adds `day-` (`day-ink`). Components reference the night names; at day they take the `day-` value of the same token.

### Grounds and surfaces
- `bg`: the page, always under the security lines.
- `card`: lists, sheets and settings cards. One step lighter than `bg` at night, one step brighter by day.
- `page` and `page-border`: the passport's own pages (the ID page, visa pages on the site).
- `chip`: count chips, duration chips and the timer track. At night it's darker than `bg` and reads as an inset.
- `tab-bar-bg` and `tab-bar-border`: the nav bar on phones and the sidebar on laptops.
- `next-bg`, `next-border`, `next-stub` and `next-meta`: the next-step ticket only. It's the one tinted surface, a sage green, so the eye lands there first.

### Ink
- `ink` for primary text, `ink-soft` for secondary copy (MRZ lines, explainers) and `muted` for captions and meta. `muted` keeps at least 4.5:1 on `bg` in both palettes.
- `accent` (gold at night, brass by day) is small decoration only: the sun on Today, foil details. Never text you have to read, never a button.

### Action
- `primary` fills; `on-primary` is the text on it. `primary-text` is the primary used as text or an outline (darker than `primary` by day, lighter at night, for contrast).
- `outline` is for pill and secondary outlines, `dashed` for the Customs banner, `rule` for hairlines between rows and `checkbox` for the unchecked ring.
- `field-bg` and `field-border` are for inputs and secondary buttons; the border keeps at least 3:1 against `card`.
- `error` is for validation and failures only, and it's the terracotta ink, not a red.

### Stamp inks
| Ink | Means | Used on |
|---|---|---|
| `stamp-terracotta` | You started or finished | OFFICIALLY STARTED, OFFICIALLY DONE, the "stamped" tag on rows, "Part of" a plan |
| `stamp-violet` | You signed or counted | DECLARATION SIGNED, DECLARATIONS KEPT, SMALL STEPS AND COUNTING, the "declared" tag |
| `stamp-forest` | You were approved | APPLICATION APPROVED |

On the site the three nudge tones borrow the inks too: Diplomat is forest, Drill Sergeant is terracotta and Roast is violet.

### Fixed by someone else
`apple-bg` and `apple-fg` follow Apple's Sign in with Apple rules (black on light grounds, white on dark). Google's four brand colors live in `brandMarks` in `tokens.ts`. Neither is part of A2; don't reuse them elsewhere.

### What color never does
Nothing goes red because it's late. Missed things roll forward to today with no overdue styling, by design (see Voice). Color is never the only signal: a checked task is filled **and** struck through, and a selected chip is filled **and** announced as selected.

## Typography

### Faces
| Role | Face | Where |
|---|---|---|
| Display | Fraunces Medium (500), and Medium Italic for accents | Titles, section heads, the next step, the Start button, the passport cover, initials |
| Body | Instrument Sans Regular, Medium and SemiBold | Everything you read and every button label |
| Mono | IBM Plex Mono Regular and Medium | Labels and eyebrows in capitals, stamp text, MRZ lines, citizen numbers, times and durations |
| Logo | Space Grotesk Bold | The wordmark only |

### Rules
- Use a type role (`title`, `page-title`, `section`, `step`, `lead`, `item`, `body`, `meta`, `button`, `tab`, `label`, `label-small`) instead of setting sizes by hand. In the app that's `<Text variant="…">`.
- In the app each weight is its own font family (`Fraunces-Medium`, `InstrumentSans-SemiBold`…). Pick the family for the weight and never add `fontWeight`; iOS falls back to the system font if you do.
- Italic Fraunces is an accent, not a style for whole paragraphs: one word in a headline, the Start button, the passport cover.
- Mono labels are capitals with positive tracking (1.1px at 11px). `label-small` (10.5px) is the smallest mono allowed.
- Display type tightens slightly (−1% tracking) at the two largest sizes and nowhere else.
- Headings and buttons are sentence case ("Plan it", "Show everything"), never Title Case.

## Layout

- **Spacing** steps through `xxs` 2 … `xxxl` 32 (in px). Rows breathe at 5–11px vertical; cards pad 16–18px.
- **Phones:** one column, at most 640px wide, under a nav bar with four tabs (Today, Upcoming, Territories, Passport) and a raised green capture button in the middle.
- **Laptop width (≥900px, on the web):** the nav bar becomes a 236px sidebar. A list and its page sit side by side (up to 1040px), and the Upcoming month calendar sits beside the list. Sheets become centered 380px cards. Same features as the phone, laid out wider.
- **Touch targets** are at least 44 × 44 (`hitTarget`), even when the visible mark is smaller, like the 22px checkbox.
- Respect safe areas. Sheets pad the bottom inset and ride above the keyboard.

## Depth and texture

- **The app has no shadows.** Surfaces separate by fill (`bg` → `card` → `page`) and 1px borders (`page-border`, `rule`, `outline`).
- **Security lines** cover every page ground: `SecurityLines` in the app and a `repeating-linear-gradient(135deg, …)` on the site.
- **Ink has no fill.** Stamps are strokes and text, so one stamp laid over another lets it show through, like real ink.
- **On the marketing site only,** long soft shadows lift a passport spread or phone frame off the page (`0 18px 40px -28px rgba(11,15,28,0.45)`), plus a shadow into the binding where two visa pages meet.

## Shapes

- Radii: `chip` 4 (duration chips, stamped tags), `sm` 6, `md` 10 (the Customs banner), `lg` 12 (buttons), `card` 14 (cards, sheets, the ID page and the next-step ticket), `pill` 999 (chips, Plan it, Start, the capture button).
- **Perforation:** a 1.5px dashed line (4 on, 3 off) in `next-stub` divides the next-step ticket from its stub.
- **Dashed borders** mean "not filed yet": the Customs banner is dashed until it's selected, then solid green.
- **Stamps are tilted**, a few degrees each and never the same: rows −7° and −4°, the Passport's stamps −10°, 6°, −4° and −5°, a landing stamp −8°.

## Components

### The next step ticket (`NextStepCard`)
The most important object in the app: "Your next small step", top of Today. A sage card with a mono label ("YOUR NEXT SMALL STEP", and "1 OF 8" for plan steps), the step in `step` type, meta, and "Made smaller by AI" with a shrink icon on AI-built steps. A perforated line divides off a 92px stub holding a 66px green circle with **Start** in italic Fraunces. When it isn't a plan step, the label reads "Up next".

### Task rows (`TaskRow`)
A 22px ring checkbox inside a 44px target, the title in `item`, meta below and hairline `rule` dividers. On the right: a `chip`-filled duration in mono, the time, and tilted ink tags (a terracotta "stamped", a violet "declared"). Checking one fills the ring green, strikes the title and gives a success haptic. Row actions (Start, Plan it, Move to…, File in…) live behind press and hold (right-click on the web), with a permanent hint under the list. There's no Start button on every row.

### Plan it
The AI-plan button always reads **Plan it**. On a row it's a pill outlined in `primary` on `card`. It only appears when a task sounds bigger than one sitting, and never on steps, repeats or estimates of 30 minutes or less.

### Buttons and chips
- `Button`: primary (green fill), secondary (field fill, field border) and quiet (text only), at 50px tall with radius 12. Plain verbs: Start, Done, Snooze, Add.
- `Chip`: a 36px pill for date, time, repeat and estimate choices, filled green when picked.

### Sheets (`Sheet`)
A bottom sheet on phones and a centered card at laptop width, over the `scrim`. A mono eyebrow names it ("WHEN"); actions like Clear and Done are pinned in a footer above a hairline.

### The Passport
- **ID page:** a `page` card with an italic Fraunces cover line, a 78 × 96 photo box with initials, NAME / NOM and STATUS / STATUT fields in mono, the citizen number (mono, 2px tracking) and two MRZ lines ("ONE<STEP<AT<A<TIME" style) in `ink-soft`.
- **Visas & Stamps page:** round stamps laid down in the order they were earned, then the count stamp, shrinking to fit.
- **Round stamp (`RoundStamp`):** a 120-unit circle with a dashed outer ring (1.8px, 3.5/2.5 dashes), a solid inner ring (1.4px), "PROCRASTINATION" curved along the top rim, two words in Plex Mono Medium across the middle ("OFFICIALLY / DONE") and the date curved along the bottom.
- **Count stamp (`CountStamp`):** a double-ruled rectangle ("SMALL STEPS · 17 · AND COUNTING") with the number in `title` type.

### Customs
The inbox for things not filed in a Territory. A dashed banner (`dashed`, 1.5px, radius 10) on Today and Territories.

### Navigation
Four tabs with stroke icons and `tab` labels, plus the capture button: a 66px green circle raised 28px above the bar with a 5px ring of the bar's own color.

### Icons (`Icon`)
Strokes drawn on a 24 × 24 grid with round caps, 1.7px by default. **Never emoji**, anywhere.

### Marketing site (`apps/site`)
Always night, with the same tokens as CSS variables in `app/globals.css` (`--bg`, `--ink`, `--stamp-violet`…) and Tailwind for layout. Its signature pieces are all passport objects: the smaller features as an open passport's visa pages whose stamps land as they scroll into view, a slow 70-second drift of stamps under the hero (paused on hover), the nudge tones as a carousel of lock screens showing that tone's reminders, and night screenshots of the app in a phone frame.

## Motion and haptics

| Token | ms | For |
|---|---|---|
| `motion.quick` | 140 | Checkbox fill, chip press, a stamp settling |
| `motion.standard` | 240 | Sheets and cards |
| `motion.stamp` | 420 | An ink stamp coming down |

- **The stamp landing** is the signature motion: the stamp starts at 1.9× and transparent, accelerates down (ease-in cubic) to 0.94× over `motion.stamp`, then settles to 1× (ease-out) over `motion.quick`. As it hits, the phone gives a heavy impact plus a success haptic. The site's CSS version runs the same curve in 560ms (420 + 140).
- Haptics are semantic: `complete` = success (checking a task off), `stamp` = heavy, `select` = selection. None on the web.
- Motion clarifies cause and effect (you finished, so a stamp lands) or adds one deliberate moment of delight. The only loop in the app is Start Mode's breather, which someone asks for.
- **Reduced motion always has a fallback.** In the app, `useReducedMotion()` shows the stamp already in place, with the haptic straight away. On the site, `prefers-reduced-motion` stops the drift and shows landed stamps without animation.
- Animate `transform` and `opacity`. The app animates with Reanimated (iOS and web from one code path); the site uses CSS keyframes and an `IntersectionObserver`.

## Voice and copy

- **Nation names for places and rewards:** Passport, Customs, Territories, Stamps, Declaration, Citizenship Application, the Oath, Morning Briefing, State of the Union. Strings live in `packages/core/src/nation.ts` (`names`, `voice`).
- **Plain labels on buttons:** Start, Start 5 min, Done, Snooze, Add, Plan it (`actions`). The theme lives in the world, never in the controls.
- **No guilt, ever.** Procrastination is mostly short-term mood repair, and shame feeds it. Nothing says "you failed", "overdue" or "disappointed"; missed things roll forward kindly. Even the Roast tone jokes about the task or the situation, never the person.
- Warm and gentle: "A fresh page, Maya." on Today, "Your next small step", a passport STATUS of "Proudly in progress".
- Typographic punctuation: the ellipsis character in "Move to…", "Making it smaller…".

## Do's and don'ts

### Do
- Reach for the passport's own objects (pages, stamps, MRZ lines, perforations, notifications) when a screen or section needs character.
- Use tokens for every color, and add a token to `tokens.ts` when a new one is needed. In the app: `useStyles(makeStyles)` or `useTokens()`. On the site: the CSS variables.
- Check both palettes, phone and laptop widths, and reduced motion.
- Keep any action that finishes a task deliberate. Web notifications offer Start 5 min and Snooze 10 min, never Done.

### Don't
- Don't build a grid of identical rounded cards with icons; it reads as generic and was rejected for the landing page.
- Don't hard-code a hex in a component, use emoji, or set `fontWeight` on an app font family.
- Don't add drop shadows, gradients or glass in the app.
- Don't use red, overdue badges or guilt copy for anything late.
- Don't use Title Case, or theme the controls ("Engage!" instead of Start).
- Don't put a visible Start button on every row, or a one-tap Done where a stray tap could land.

## Working with design skills

- **design-taste-frontend** (`.claude/skills`): this is an existing brand. Run it with `--keep palette,type` and map its roles to the tokens above, rather than letting it deal a new direction.
- **web-design-guidelines** (Vercel): use its accessibility, forms, focus and motion rules. Skip its "Content & Copy" house style (Title Case, "&" over "and"); the voice above wins.
- **expo-animation** (the Expo plugin) for motion in the app.
