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

const CARDS = [
  { title: 'Reminders in your tone', body: 'At the time you set, in your browser now and on iPhone with the app. Start five minutes right from the notification.' },
  { title: 'Notes that become tasks', body: 'Lecture notes, packing lists, ideas. Any line can turn into a checkbox that’s a real task on your day.' },
  { title: 'Territories', body: 'School, work, home. Everything filed where it belongs, and Customs holds whatever you haven’t sorted yet.' },
  { title: 'Never “overdue”', body: 'Missed days roll forward kindly. Nothing here calls you lazy, because shame is what keeps people stuck.' },
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
      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.title} className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--page-border)' }}>
            <h3 className="text-lg font-semibold">{c.title}</h3>
            <p className="mt-2 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
