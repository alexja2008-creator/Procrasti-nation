import RoundStamp from './RoundStamp';
import { APP_URL } from '../../lib/site';

const FREE = [
  'Unlimited tasks, notes and reminders',
  'Two AI plans a month',
  '“I’m stuck” whenever you need it',
  'Start Mode, the Morning Briefing, Declarations and the Passport',
];

export default function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <div
        className="relative overflow-hidden rounded-3xl border px-6 py-12 md:px-14 md:py-16"
        style={{ background: 'var(--card)', borderColor: 'var(--page-border)' }}
      >
        <RoundStamp
          ink="var(--stamp-terracotta)"
          lines={['OFFICIALLY', 'STARTED']}
          date="ANY DAY NOW"
          size={150}
          className="mb-4 block h-[104px] w-[104px] rotate-6 opacity-90 md:absolute md:right-10 md:top-10 md:mb-0 md:h-[150px] md:w-[150px] md:rotate-12"
        />
        <p className="eyebrow">FREE TO JOIN</p>
        <h2 className="font-display mt-3 max-w-xl text-4xl leading-tight md:text-5xl">Your Citizenship Application is open.</h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          A few questions so it fits how you work, about three minutes. Then name one thing you&rsquo;ve been putting off,
          and watch it become a first step you can take today.
        </p>
        <ul className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
          {FREE.map((item) => (
            <li key={item} className="flex gap-3 leading-snug">
              <span aria-hidden="true" style={{ color: 'var(--primary-text)' }}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <a
          href={APP_URL}
          className="mt-10 inline-block rounded-xl px-7 py-3.5 text-base font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}
        >
          Start your application
        </a>
      </div>
    </section>
  );
}
