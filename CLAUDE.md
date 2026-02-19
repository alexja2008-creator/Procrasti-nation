# ProcrastiNation – Claude Code Guide

## Project Overview
AI-powered productivity SaaS app that helps users overcome procrastination via:
- AI task breakdown (Anthropic claude-sonnet-4-20250514 model)
- Focus pods (virtual co-working)
- Reset station (wellness videos)
- Metrics dashboard

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript/JSX
- **Styling**: Tailwind CSS 3 (class-based dark mode)
- **Icons**: Lucide React
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Storage**: localStorage (no backend DB)

## Dev Commands
```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm start        # Run production build
npm run lint     # ESLint
```

## Environment Setup
Requires `.env.local` with:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Project Structure
```
app/
  page.jsx                    # Landing page
  layout.jsx                  # Root layout (wraps ThemeProvider)
  providers.jsx               # Dark mode context provider
  planner/page.jsx            # AI task planner (main feature)
  dashboard/page.jsx          # Metrics & analytics
  focus-pods/page.jsx         # Virtual co-working sessions
  reset-station/page.jsx      # Wellness videos
  api/generate-plan/route.js  # Anthropic API endpoint
components/
  Navigation.jsx              # Shared nav bar
lib/
  storage.js                  # localStorage utility (get/set/delete/list)
```

## Key Patterns

### Dark Mode
- Use `useTheme()` hook from `app/providers.jsx`
- Apply dark styles via ternary: `` `${darkMode ? 'bg-slate-800' : 'bg-white'}` ``
- Never use Tailwind's `dark:` prefix — the project uses class-based JS toggling

### Styling
- All styling via Tailwind utility classes
- No CSS modules or styled-components
- Responsive breakpoints: `md:` and `lg:`

### State Management
- Local state: `useState` in components
- App-wide state: ThemeProvider context only
- No Redux or Zustand — keep state local or in localStorage

### localStorage Keys
- `theme` — dark/light preference
- `user-tasks` — task array
- `user-streak` — current streak
- `highest-streak` — best streak
- `focus-pods` — active pods
- `completed-resets` — wellness sessions

### API Communication
- Use native `fetch()` with POST to `/api/generate-plan`
- The API returns: `{ title, analysis, estimatedTime, steps[] }`

### Naming Conventions
- Components: PascalCase
- Functions/variables: camelCase
- File names: lowercase with hyphens for directories, `.jsx` for React files

### Component Pattern
All pages use `'use client'` directive and follow:
```jsx
'use client'
import { useTheme } from '../providers'
export default function PageName() {
  const { darkMode } = useTheme()
  // ...
}
```

## Deployment
- Target platform: Vercel
- Set `ANTHROPIC_API_KEY` in Vercel environment variables
