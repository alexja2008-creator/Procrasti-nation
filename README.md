# ProcrastiNation

An AI-powered productivity app that helps you break down tasks, stay focused, and track your progress.

## Features

- **AI Adherence Planner** - Break any task into micro-steps with AI-powered planning
- **Focus Pods** - Virtual co-working sessions to stay accountable
- **Reset Station** - Guided wellness videos for quick mental resets
- **Metrics Dashboard** - Track your streaks, completion rates, and progress

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Anthropic Claude API
- **Storage**: localStorage (client-side persistence)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/procrastination-app.git
   cd procrastination-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Deploying to Vercel

### Option 1: Deploy from GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your GitHub repository
4. **Important**: Add your environment variable:
   - Go to "Environment Variables"
   - Add `ANTHROPIC_API_KEY` with your API key value
5. Click "Deploy"

### Option 2: Deploy with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add your environment variable in the Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add `ANTHROPIC_API_KEY`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | Yes |

## Project Structure

```
procrastination-app/
├── app/
│   ├── api/
│   │   └── generate-plan/
│   │       └── route.js      # API route for AI planning
│   ├── dashboard/
│   │   └── page.jsx          # Metrics dashboard
│   ├── focus-pods/
│   │   └── page.jsx          # Virtual co-working
│   ├── planner/
│   │   └── page.jsx          # AI task planner
│   ├── reset-station/
│   │   └── page.jsx          # Wellness videos
│   ├── globals.css           # Global styles
│   ├── layout.jsx            # Root layout
│   ├── page.jsx              # Landing page
│   └── providers.jsx         # Theme context
├── components/
│   └── Navigation.jsx        # Shared nav component
├── lib/
│   └── storage.js            # localStorage wrapper
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── README.md
```

## Troubleshooting

### "API key not configured" error
Make sure you've added `ANTHROPIC_API_KEY` to your environment variables. On Vercel, go to Project Settings → Environment Variables.

### Build errors on Vercel
1. Make sure all dependencies are in `package.json`
2. Check that you're using Node.js 18+
3. Verify there are no TypeScript errors (this is a JavaScript project)

### localStorage not persisting
localStorage only works in the browser. Data will persist per device/browser but won't sync across devices.

## Future Enhancements

- [ ] User authentication
- [ ] Cloud database for cross-device sync
- [ ] Daily.co integration for real audio in Focus Pods
- [ ] Actual video embeds in Reset Station
- [ ] Push notifications for reminders
- [ ] Calendar integration

## License

MIT
