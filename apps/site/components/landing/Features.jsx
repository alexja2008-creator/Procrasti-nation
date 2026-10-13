import Entries from './Entries';
import Phone from './Phone';

const HIGHLIGHTS = [
  {
    screen: 'briefing',
    alt: 'The Morning Briefing: pick up to three things for today from what carried over',
    label: 'MORNING BRIEFING',
    title: 'A pile becomes three things.',
    body: 'Whatever slipped yesterday waits for you in the morning, sorted in a minute: today, another day, or let it go. When there’s a lot, it suggests three for today and lets the rest wait.',
  },
  {
    screen: 'declare',
    alt: 'A Declaration: a start time chosen and signed',
    label: 'DECLARATIONS',
    title: 'Sign a start time.',
    body: 'Pick exactly when you’ll begin and sign for it. A small ceremony that works: deciding the moment makes starting likelier. Your reminder rings then, and starting on time earns a stamp.',
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <p className="eyebrow">MADE FOR HOW PUTTING THINGS OFF ACTUALLY WORKS</p>
      <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">Less to look at. More to start.</h2>
      <div className="mt-14 grid gap-16 md:grid-cols-2 md:gap-12">
        {HIGHLIGHTS.map((f) => (
          <div key={f.screen} className="flex flex-col gap-8">
            <Phone name={f.screen} alt={f.alt} />
            <div>
              <p className="font-mono-pn text-sm" style={{ color: 'var(--accent)' }}>{f.label}</p>
              <h3 className="font-display mt-2 text-2xl leading-snug">{f.title}</h3>
              <p className="mt-3 text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Entries />
    </section>
  );
}
