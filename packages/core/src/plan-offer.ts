// Whether to offer "Plan it" on a task: the pill on its row, and the + sheet leading with Plan it.
// It runs on every row and on every keystroke in the + sheet, so it reads the title on the device:
// the lead verb first (an errand stays an errand whatever it mentions), then what it acts on.
// Labeled cases: test/plan-offer-cases.ts. Plan it stays in every row's menu either way.

import type { Task } from './types.ts';

// Lead verbs of one-sitting tasks: "Email Dr. Ruiz about the quiz" is an email, not a quiz.
const QUICK = new Set(
  (
    'email e-mail text call phone facetime message dm reply respond ask tell remind ping invite thank ' +
    'book schedule reschedule cancel confirm rsvp register renew pay venmo zelle buy order purchase return ' +
    'send mail submit print scan sign download upload install check read watch listen go meet attend talk ' +
    'see visit bring grab walk feed water wash shower charge cook eat take forward share post'
  ).split(' '),
);

// Lead verbs of work that takes several sittings, unless what follows is small ("Write grocery list").
const BIG = new Set(
  (
    'write rewrite study prepare prep research plan organize organise build develop launch learn practice ' +
    'rehearse revise redo draft declutter apply cram memorize memorise train overhaul redesign'
  ).split(' '),
);

// Two-word leads, read before the one-word sets. `null` skips them and lets the rest decide ("Fill out FAFSA").
const PHRASES: Record<string, 'quick' | 'big' | null> = {
  'pick up': 'quick', 'drop off': 'quick', 'turn in': 'quick', 'hand in': 'quick', 'sign up': 'quick',
  'look up': 'quick', 'write down': 'quick', 'take out': 'quick', 'follow up': 'quick', 'check in': 'quick',
  'figure out': 'big', 'sort out': 'big', 'deal with': 'big', 'catch up': 'big', 'get ready': 'big',
  'move out': 'big', 'move in': 'big', 'move into': 'big', 'deep clean': 'big',
  'fill out': null, 'go over': null, 'work on': null, 'get started': null,
};

// Said before the task itself: "Need to", "Finish", "Start".
const PREAMBLE = new Set(
  "need have got gotta must should remember don't dont forget please pls to todo finish start begin continue keep up on".split(' '),
);

// Things that take several sittings, wherever they appear in a title led by anything but a quick verb.
const BIG_THINGS = new Set(
  (
    'essay essays paper papers report reports project projects presentation presentations thesis dissertation ' +
    'portfolio exam exams midterm midterms final finals capstone application applications taxes fafsa proposal ' +
    'grant speech novel website resume cv internship internships scholarship scholarships lsat mcat gre'
  ).split(' '),
);
const BIG_PHRASES = ['book report', 'cover letter', 'lit review', 'literature review', 'personal statement', 'statement of purpose', 'study guide', 'the move', 'my move'];
// Small things that happen to contain one of the words above.
const NOT_BIG = ['toilet paper', 'paper towels', 'printer paper', 'wrapping paper', 'report card', 'application fee'];

// What a big verb can act on and still be one sitting: "Write thank-you note", "Plan my week", "Apply for parking permit".
const SMALL_THINGS = new Set(
  'note card email text message comment list reminder caption post tweet reply account week day tomorrow today tonight outfit meals route permit pass refund'.split(' '),
);
// Verbs that are a project in a whole space ("Clean my room", "Pack up my dorm") and quick otherwise ("Clean the litter box", "Pack lunch", "Move car").
const SPACE_VERBS = new Set(['clean', 'tidy', 'pack', 'move']);
const SPACES = new Set('room bedroom house apartment place dorm garage closet kitchen bathroom basement attic office'.split(' '));

const PREPOSITIONS = new Set('to for on about with from at in into by before after due of'.split(' '));

// Long titles without a verb are usually vague, and vague is what Plan it is for.
const VAGUE_WORDS = 7;
// An estimate this short (theirs, from the task's details) says it's one sitting.
const QUICK_MINUTES = 30;

/** Lowercase words without edge punctuation; a label of up to three words ("Chem:", "Bio 101:") is dropped. */
function wordsOf(title: string): string[] {
  const text = title.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^\s:]+(?: [^\s:]+){0,2}:\s+/, '');
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean);
}

/** "Studying" → "study", "writing" → "write", "planning" → "plan"; other words as they are. */
function verbOf(word: string): string {
  if (!word.endsWith('ing') || word.length < 5) return word;
  const stem = word.slice(0, -3);
  for (const candidate of [stem, `${stem}e`, stem.slice(0, -1)]) {
    if (QUICK.has(candidate) || BIG.has(candidate) || SPACE_VERBS.has(candidate)) return candidate;
  }
  return word;
}

/** The last word of what the verb acts on: "for parking permit" → "permit", "thank-you note to grandma" → "note". */
function headOf(rest: string[]): string | undefined {
  const start = PREPOSITIONS.has(rest[0]) ? 1 : 0;
  const end = rest.findIndex((w, i) => i >= start && PREPOSITIONS.has(w));
  return rest.slice(start, end === -1 ? undefined : end).at(-1);
}

function mentionsBigThing(words: string[]): boolean {
  const text = ` ${words.join(' ')} `;
  const cleared = NOT_BIG.reduce((t, phrase) => t.replaceAll(` ${phrase} `, ' '), text);
  return BIG_PHRASES.some((phrase) => cleared.includes(` ${phrase} `)) || cleared.split(' ').some((w) => BIG_THINGS.has(w));
}

/**
 * Whether a task's title sounds bigger than one sitting, or too vague to start: "Study for orgo
 * midterm", "Clean my room", "FAFSA". Errands stay errands: "Email Dr. Ruiz about the quiz", "Turn
 * in lab report", "Walk Biscuit" never get a patronizing breakdown offer.
 */
export function suggestsPlan(title: string): boolean {
  const words = wordsOf(title);
  if (!words.length) return false;
  let i = 0;
  while (i < words.length - 1 && PREAMBLE.has(words[i])) i++;

  // A big thing leading the title is a noun, not a verb: "Book report on Of Mice and Men".
  if (BIG_PHRASES.includes(`${words[i]} ${words[i + 1]}`)) return true;
  const pair = `${verbOf(words[i])} ${words[i + 1]}`;
  if (pair in PHRASES) {
    const kind = PHRASES[pair];
    if (kind === 'quick') return false;
    if (kind === 'big') return true;
    i += 2;
    if (words[i] === 'on') i++;
  }

  const verb = verbOf(words[i] ?? '');
  const rest = words.slice(i + 1);
  if (QUICK.has(verb)) return false;
  if (BIG.has(verb)) return !SMALL_THINGS.has(headOf(rest) ?? '');
  if (SPACE_VERBS.has(verb)) return rest.some((w) => SPACES.has(w)) || mentionsBigThing(rest);
  // "Report the broken heater" is an errand; "Report on Gatsby" is a report.
  if (verb === 'report' && /^(the|a|an|my|this|that|it)$/.test(rest[0] ?? '')) return false;
  return mentionsBigThing(words) || words.length >= VAGUE_WORDS;
}

/**
 * Whether a task's row offers "Plan it": a top-level task of the person's own with no plan yet,
 * not a habit (a repeat), not a note's checklist line, not one they've estimated at half an hour
 * or less, and whose title sounds big (`suggestsPlan`).
 */
export function offersPlan(
  task: Pick<Task, 'title' | 'parentId' | 'noteId' | 'source' | 'status' | 'rrule' | 'estimateMinutes'>,
  hasPlan: boolean,
): boolean {
  if (hasPlan || task.parentId || task.noteId || task.source === 'ai' || task.status === 'completed') return false;
  if (task.rrule) return false;
  if (task.estimateMinutes !== null && task.estimateMinutes <= QUICK_MINUTES) return false;
  return suggestsPlan(task.title);
}
