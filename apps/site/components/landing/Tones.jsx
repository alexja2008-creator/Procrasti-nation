import { actions, nudgeTones, voice } from '../../lib/core';
import ToneCarousel from './ToneCarousel';

// The three voices, in the app's own words (@pn/core: the samples the Citizenship Application shows),
// as the reminders they'd send: the task is the title, the tone's line the body, with the buttons a
// reminder has.
const ORDER = ['diplomat', 'drill', 'roast'];

export default function Tones() {
  const tones = ORDER.map((id) => ({ id, ...nudgeTones[id] }));
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <p className="eyebrow">PICK YOUR NUDGE</p>
      <h2 className="font-display mt-3 max-w-2xl text-4xl leading-tight md:text-5xl">Gentle, firm, or funny enough to screenshot.</h2>
      <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        The same reminder, three ways. Pick one when you join; change it any time. Even Roast jokes about the task, never about you.
      </p>
      <ToneCarousel tones={tones} task="History paper" buttons={[actions.startFive, voice.reminders.snooze]} />
    </section>
  );
}
