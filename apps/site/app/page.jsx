import Logo from '../components/Logo';

// Where the app lives. next.config.js sends v1's old pages there too.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.procrasti-nation.work';

// A placeholder until the v2 landing page (PN2-LAUNCH-PLAN.md, phase 2): what it is, and the way in.
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <Logo size="lg" color="var(--ink)" accent="var(--primary)" />
      <p className="mt-10 text-xs tracking-[0.2em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>
        PROCRASTINATION 2.0
      </p>
      <h1 className="mt-3 max-w-xl text-4xl md:text-5xl leading-tight" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        A planner that gets you to start.
      </h1>
      <p className="mt-5 max-w-md text-lg" style={{ color: 'var(--ink-soft)' }}>
        It breaks the task you&rsquo;re avoiding into steps small enough to begin today, and nudges you when it&rsquo;s time.
      </p>
      <a
        href={APP_URL}
        className="mt-9 inline-block rounded-xl px-7 py-3.5 text-base font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
      >
        Open the app
      </a>
    </main>
  );
}
