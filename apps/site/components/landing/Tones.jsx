import { nudgeTones } from '../../lib/core';

// The three voices, in the app's own words (@pn/core: the samples the Citizenship Application shows).
const ORDER = ['diplomat', 'drill', 'roast'];

export default function Tones() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <p className="eyebrow">PICK YOUR NUDGE</p>
      <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">Gentle, firm, or funny enough to screenshot.</h2>
      <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        The same reminder, three ways. Pick one when you join; change it any time. Even Roast jokes about the task, never about you.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {ORDER.map((id) => {
          const tone = nudgeTones[id];
          return (
            <div key={id} className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--page-border)' }}>
              <p className="font-mono-pn text-sm tracking-widest" style={{ color: 'var(--accent)' }}>{tone.name.toUpperCase()}</p>
              <p className="mt-2 font-semibold">{tone.blurb}</p>
              <div className="mt-5 flex flex-col gap-3">
                {tone.samples.map((line) => (
                  <p key={line} className="rounded-xl px-4 py-3 leading-snug" style={{ background: 'var(--page)', color: 'var(--ink)' }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
