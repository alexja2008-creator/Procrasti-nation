# packages/core (@pn/core)

Shared, dependency-free TypeScript used by the app and, through `apps/site/lib/core.js`, by the server, so both plan, date and remind the same way. Module-by-module index: `docs/architecture.md`, "packages/core".

- **No dependencies.** Everything here must run in React Native, the browser, Next's server and plain Node.
- **Imports end in `.ts`** (`import { x } from './dates.ts'`): the tests run directly on TypeScript with `node --test`.
- **Tests:** `npm run core:test` from the repo root. Every exported rule that decides behavior gets a test; dates get tests around midnight, the day-rollover hour and daylight saving.
- **Pure functions only:** core computes patches and plans; the app's stores write them. No I/O. Time comes in as a parameter (`now`, `today`), defaulting to the current time only at the edge, so tests can pin it.
- **`tokens.ts` is the source of truth for the design system.** `DESIGN.md` repeats it for design tools, and `test/design-md.test.ts` fails when they drift: change both together.
- **All user-facing copy lives in `nation.ts`** (names, actions, voice, the three nudge tones). No guilt, ever: the Roast tone jokes about the task, never the person.
- `plan-offer.ts` decides whether a title sounds big enough to offer Plan it. Judge a change on a fresh, unseen batch of titles, not only `test/plan-offer-cases.ts`.
