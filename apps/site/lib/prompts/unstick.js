// Prompt + schema for "I'm stuck" in Start Mode: one tiny first action that
// gets the person moving again. Any change here must pass evals/unstick.
import { sanitizeForXml } from '../ai.js';

export const UNSTICK_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', description: 'One tiny first action: a direct instruction, one sentence, at most 20 words' },
  },
  required: ['action'],
  additionalProperties: false,
};

// What's in the way (one tap in the app) and how to answer it.
export const STUCK_REASONS = {
  start: {
    said: "I don't know where to begin.",
    guidance: 'Give the literal first physical motion that begins this step, so there is nothing left to figure out.',
  },
  big: {
    said: 'It feels too big.',
    guidance: 'Carve off the smallest visible slice of this step that still counts as real progress.',
  },
  mood: {
    said: "I'm not in the mood.",
    guidance:
      'Start with the easiest or least dreaded piece, and route around the dreaded part for now (book online instead of calling, copy the problem out before solving it). Lower the bar so far it is hard to say no, and say plainly that this is all they have to do.',
  },
  missing: {
    said: "I'm missing something.",
    guidance:
      'Never ask them to work out or list what is missing; that is more thinking. Either take the one physical step that gets the missing piece (open the exact site, text the person, find the file), or start a part that does not need it and leave a placeholder like [DATES].',
  },
};

const STYLE_HINTS = {
  avoider: 'They avoid tasks that feel threatening: keep it gentle and make it feel trivially safe.',
  perfectionist: 'They stall trying to get it perfect: make clear that rough or messy is the goal.',
  overwhelmed: 'They shut down when things feel big: make it the smallest possible piece.',
  boredom: 'They drift when work feels dull: a tiny hook or a quick challenge helps.',
};

export function buildUnstickPrompt({ step, notes, parent, reason, procrastinationType, avoid = [] }) {
  const why = STUCK_REASONS[reason];
  const style = STYLE_HINTS[procrastinationType];
  return `You are the "I'm stuck" helper inside ProcrastiNation, an app for students who procrastinate. Someone is in Start Mode, a focus timer on one step, and just pressed "I'm stuck".

${parent ? `<task>${sanitizeForXml(parent)}</task>\n` : ''}<step>${sanitizeForXml(step)}</step>
${notes ? `<step_details>${sanitizeForXml(notes)}</step_details>\n` : ''}<whats_in_the_way>${why ? why.said : 'They did not say.'}</whats_in_the_way>

Give exactly one tiny first action that:
- takes two minutes or less,
- is a concrete physical action (open, write, list, find, text, set out), never "think about", "plan" or "research",
- needs no decisions: if a choice is unavoidable, make it for them, and if it involves writing, hand them the opening words,
- is specific to this step and names the actual thing involved,
- never depends on knowing something they may not know yet: point them at where it is (the slide, the page, the site) instead,
- leaves them visibly closer to finishing the step, so continuing feels easy.
${why ? why.guidance : ''}${style ? `\n${style}` : ''}

Write it as a direct instruction in second person: one sentence, at most 20 words, warm but plain. No preamble, no praise, no emoji.${
    avoid.length
      ? `\n\nThey already saw these and want a different way in: a different starting point or a different piece of the step, not the same move in new words:\n${avoid.map((a) => `<earlier>${sanitizeForXml(a)}</earlier>`).join('\n')}`
      : ''
  }`;
}
