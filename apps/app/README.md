# ProcrastiNation app (iOS + web)

The ProcrastiNation 2.0 client: one Expo (SDK 57, expo-router) codebase that ships to the App Store and to the web at `app.procrasti-nation.work`.

```bash
npm install
npx expo start --web     # web at http://localhost:8081
npx expo start --ios     # iOS Simulator (needs Xcode)
npx tsc --noEmit && npx expo lint
```

- Screens live in `src/app/` (expo-router). The four tabs are in `src/app/(tabs)/`; the nav bar is a bottom bar on phones and a sidebar at ≥900px.
- Design tokens, nation naming/voice, date helpers and data types come from `@pn/core` (`../../packages/core`). Style with `useTokens()` / `useStyles()` from `src/theme/tokens.ts`; never hard-code colors.
- Only public values go in `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`). Secret keys stay in `apps/site`, because anything bundled into the app can be extracted.
- See `AGENTS.md` for Expo-specific rules (always `npx expo install`, check the versioned docs).
