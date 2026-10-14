import Phone from './Phone';
import RoundStamp from './RoundStamp';
import { APP_URL } from '../../lib/site';

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-16">
      <div>
        <p className="eyebrow">WELCOME TO THE NATION</p>
        <h1 className="font-display mt-4 text-[2.6rem] leading-[1.08] md:text-6xl">
          Start the thing you&rsquo;ve been putting off.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          ProcrastiNation breaks a big task into steps small enough to begin today, then nudges you when
          it&rsquo;s time. No guilt, no lectures. Just the next small step.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href={APP_URL}
            className="rounded-xl px-7 py-3.5 text-base font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            Open the app
          </a>
          <a href="#how" className="text-base font-semibold hover:underline" style={{ color: 'var(--primary-text)' }}>
            See how it works
          </a>
        </div>
        <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
          Free. Works in your browser; the iPhone app is on its way.
        </p>
      </div>
      <div className="relative">
        <Phone name="today" alt="Today in ProcrastiNation: the next small step, then the day's agenda" priority />
        <RoundStamp
          ink="var(--stamp-forest)"
          lines={['APPLICATION', 'APPROVED']}
          date="WELCOME · 2026"
          size={132}
          className="absolute -left-1 -top-9 h-[100px] w-[100px] -rotate-12 md:-left-6 md:top-10 md:h-[132px] md:w-[132px]"
          style={{ background: 'var(--bg)', borderRadius: '50%' }}
        />
      </div>
    </section>
  );
}
