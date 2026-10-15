# Plan: <feature>

Copy this file to `docs/plans/active/<feature>.md`. Get Alex's approval on the Decisions section before writing code. When it ships, add a "Built <date>" note under each phase saying what was checked, and move the file to `docs/plans/shipped/`.

## Overview
What it does for the person using PN, in two or three sentences. Which STATUS.md item or feedback issue it answers.

## Decisions (Alex, <date>)
- Product calls this plan depends on. Open questions go here as questions until Alex answers them.

## Files to create or modify
| File | Action | What changes |
|---|---|---|

## Phases
Smallest slice that works end to end first. For each phase: what's built, what's checked (tests, iPhone, web at phone and laptop width, day and night), and what needs Alex (anything that creates real accounts, touches production, or costs money).

## Data and copy
Tables, columns and RLS (run the `database-reviewer` subagent). New copy goes in `@pn/core`'s `nation.ts` and follows the no-guilt voice. If it changes what's collected, the privacy policy changes in the same PR.

## Risks
What could break for a real person, and the fallback.

## Done when
- [ ] Checkable statements, each one verified.
