# apps/app

The PN app for iPhone and the web (app.procrasti-nation.work) from one Expo codebase. File-by-file map, device storage keys and data loading: `docs/architecture.md`, "apps/app".

@AGENTS.md

## Commands (inside apps/app)

```bash
npx expo start --web               # http://localhost:8081
npx tsc --noEmit && npx expo lint  # before calling anything done
npx expo install <pkg>             # always, instead of npm install
sh scripts/ios-dev-build.sh        # iOS development build on the Simulator (reminders, Swift add-ons); METRO_PORT=… for another Metro
```

Expo Go can't schedule local notifications on iOS 27, and it lacks the Apple sign-in module, so reminders and Apple sign-in need the development build. Signed builds for TestFlight and the App Store come from EAS Build (`eas.json`: `staging` reads EAS's preview environment, `production` its production one). `plugins/with-scene-lifecycle.js` adopts the scene life cycle iOS 27 requires.

## Rules

- **Only `EXPO_PUBLIC_*` values** (`.env.example`; real values in the gitignored `.env.local`). Anything needing a secret calls `apps/site` through `src/lib/api.ts`.
- **Styling:** `StyleSheet` with A2 tokens, `const s = useStyles(makeStyles)` with a module-level `makeStyles = (t: Tokens) => …`, or `useTokens()` for a one-off color. Never hard-code a hex: add a token to `packages/core/src/tokens.ts`. The `Text` component's `variant` for type roles; the `Icon` component (SVG strokes), never emoji.
- **Night is the default theme** (a US passport is navy); Day and Match my device are per-device choices in Settings.
- **Copy** comes from `@pn/core` (`names`, `actions`, `voice`). Nation names for places and rewards, plain verbs on buttons, "Plan it" for the AI button.
- **Anything that can grow loads through `fetchAllPages`** (`src/data/paging.ts`): Supabase returns at most 1,000 rows and a cut-off list fails silently.
- **Writes for one task go out in order** (`queueWrite` in the stores), with optimistic updates that roll back on failure. Settings saves check that a row actually changed.
- **Sign out is this device only** (`signOut({ scope: 'local' })`). Never call the default `signOut()`.
- **Web parity:** every core feature works on the web too; layouts adapt at ≥900px. React Native Web quirks (focus rings, textareas, keyboard events, `accessibilityState`) are handled in `src/lib/web-styles.ts`, `useAutoHeight` and `useShortcuts`; see `docs/dev-gotchas.md` before fighting one.
- **Never finish a task by accident:** row actions sit behind press and hold; web notifications have no Done.

**Web deploys:** `vercel.json` builds the web export (`npx expo export --platform web` → `dist`), serves real files first and every other path as `index.html` (a notification can open `/task/<id>` in a new tab), and keeps `public/sw.js` (the Web Push service worker) uncached.

Testing on the Simulator, in the browser pane and in real Chrome (Web Push): `docs/dev-gotchas.md`.
