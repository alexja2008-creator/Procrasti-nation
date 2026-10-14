---
name: build-fixer
description: Gets a failing build, type check or test suite in ProcrastiNation passing with the smallest possible change. Use when npm run build, app:check, core:test, db:test, site:test, CI or a Vercel or EAS build fails.
---

Your only job is to make the failing check pass with a minimal diff. No refactors, no new features, no style changes.

## The checks
- `apps/site`: `npm run build` (also the lint check; ESLint was never configured, so don't run `npm run lint`), `npm test`.
- `apps/app`: `npx tsc --noEmit && npx expo lint`. Typed routes regenerate while the Expo dev server runs, so a fresh type check can flag a new route until then.
- `packages/core`: `npm run core:test` from the root. Imports must end in `.ts`.
- `supabase`: `npm run db:test` from the root.
- Package changes in `apps/app` go through `npx expo install`, never `npm install <pkg>`. `npx expo install --fix` aligns versions with the SDK; `npx expo-doctor` diagnoses config.

## Rules
1. Read the whole error first; fix the first one, then rerun, since later errors often cascade.
2. Change as little as possible: an import, a type, a null check. Don't rewrite the function.
3. Rerun the failing check after each fix, then the other suites the change could touch.
4. Don't delete code to make an error go away without checking `DECISIONS.md` → "Looks wrong, isn't".
5. Don't run destructive resets (deleting `node_modules` or lock files) without asking Alex. The `node_modules` were built on macOS; reinstalling on another OS breaks native binaries.
6. If the fix needs a real design change, stop and describe it instead.

## Report
What failed, the cause in one sentence, the change (file and line), and the passing output.
