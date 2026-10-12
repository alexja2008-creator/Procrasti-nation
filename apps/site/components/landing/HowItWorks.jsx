import Phone from './Phone';

const STEPS = [
  {
    screen: 'plan',
    alt: 'A plan in ProcrastiNation: a lab report broken into six short steps',
    label: 'PLAN IT',
    title: 'Name the thing you’re avoiding.',
    body: 'The planner asks a question or two, then breaks it into steps a few minutes long, spread out up to your deadline. Edit any of them. Simple tasks skip the AI: type “email Dr. Kim fri 4pm” and it’s set.',
  },
  {
    screen: 'start',
    alt: 'Start Mode in ProcrastiNation: a five-minute timer for one step',
    label: 'START MODE',
    title: 'Start for five minutes.',
    body: 'One step, one short timer. Stuck? One tap gets you a two-minute way in. Starting is the win, so every start counts, whether or not you finish.',
  },
  {
    screen: 'passport',
    alt: 'The Passport in ProcrastiNation: stamps and a rank earned by starting',
    label: 'THE PASSPORT',
    title: 'Watch your passport fill.',
    body: 'Stamps for starting, a rank earned by starts rather than perfection, and every start time you signed and kept. Proof, on the days it doesn’t feel like it, that you’re moving.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-16 md:px-8">
      <p className="eyebrow">HOW IT WORKS</p>
      <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">Small enough to start. That’s the whole trick.</h2>
      <div className="mt-14 flex flex-col gap-20">
        {STEPS.map((step, i) => (
          <div key={step.screen} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className={i % 2 ? 'md:order-2' : ''}>
              <p className="font-mono-pn text-sm" style={{ color: 'var(--accent)' }}>
                {String(i + 1).padStart(2, '0')} · {step.label}
              </p>
              <h3 className="font-display mt-3 text-3xl leading-snug">{step.title}</h3>
              <p className="mt-4 max-w-md text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                {step.body}
              </p>
            </div>
            <Phone name={step.screen} alt={step.alt} />
          </div>
        ))}
      </div>
    </section>
  );
}
