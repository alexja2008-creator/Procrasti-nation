// The nation: names for places, rewards and moments, plus the voice. Rule of
// thumb: theme lives in the world (Passport, Customs, Stamps), never in the
// controls. Buttons stay plain: Add, Done, Snooze, Start.

export const names = {
  passport: 'Passport',
  customs: 'Customs',
  customsSubtitle: 'Inbox',
  territories: 'Territories',
  stamps: 'Stamps',
  declaration: 'Declaration',
  residency: 'Residency',
  holidays: 'Holidays',
  stateOfTheUnion: 'State of the Union',
  termReport: 'Term Report',
  townHall: 'Town Hall',
  allies: 'Allies',
  citizenship: 'Citizenship Application',
  oath: 'The Oath',
} as const;

export const actions = {
  add: 'Add',
  done: 'Done',
  snooze: 'Snooze',
  start: 'Start',
  startFive: 'Start 5 min',
  /** Generates an AI plan for a task. Alex rejected "Make it smaller" and "Want a plan?". */
  planIt: 'Plan it',
} as const;

export const tabs = ['Today', 'Upcoming', 'Territories', 'Passport'] as const;

// ---------------------------------------------------------------------------
// Ranks are earned by starts, not completions. Thresholds are a first guess,
// to be tuned with beta data (the A2 Passport shows Citizen at 25).

export const ranks = [
  { id: 'visitor', name: 'Visitor', minStarts: 0 },
  { id: 'resident', name: 'Resident', minStarts: 5 },
  { id: 'citizen', name: 'Citizen', minStarts: 25 },
  { id: 'delegate', name: 'Delegate', minStarts: 75 },
  { id: 'founder', name: 'Founder', minStarts: 200 },
] as const;

export type Rank = (typeof ranks)[number];

export function rankFor(starts: number): { rank: Rank; next: Rank | null; startsToNext: number } {
  let i = 0;
  while (i + 1 < ranks.length && starts >= ranks[i + 1].minStarts) i++;
  const next = ranks[i + 1] ?? null;
  return { rank: ranks[i], next, startsToNext: next ? next.minStarts - starts : 0 };
}

// ---------------------------------------------------------------------------
// Nudge tones (chosen in the Citizenship Application, changeable in Settings).

export type NudgeTone = 'diplomat' | 'drill' | 'roast';

export const nudgeTones: Record<NudgeTone, { name: string; blurb: string; samples: string[] }> = {
  diplomat: {
    name: 'Diplomat',
    blurb: 'Gentle. A kind word and the next small step.',
    samples: [
      'When you are ready: open the doc and write the title. Just five minutes.',
      'Your history paper is still here, no rush. Want to try the first step?',
    ],
  },
  drill: {
    name: 'Drill Sergeant',
    blurb: 'Firm. Short orders, no excuses.',
    samples: [
      'Open the doc. Write the title. Five minutes. Go.',
      'The history paper has waited three days. Today it moves.',
    ],
  },
  roast: {
    name: 'Roast',
    blurb: 'Brutal. Funny enough to screenshot.',
    samples: [
      'Your history paper has been "tomorrow" since Tuesday. Bold strategy.',
      'Your future self called. Not mad, just disappointed. Five minutes?',
    ],
  },
};

// ---------------------------------------------------------------------------
// Voice: warm and gentle. Small numbers are spelled out.

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const spell = (n: number) => NUMBER_WORDS[n] ?? String(n);
const things = (n: number) => (n === 1 ? '1 thing' : `${n} things`);

export const voice = {
  /** Today styles the name separately: "A fresh page, *Maya.*" */
  greetingLead: 'A fresh page',
  greeting: (firstName?: string | null) => (firstName ? `A fresh page, ${firstName}.` : 'A fresh page.'),
  todaySubtitle: (count: number) => {
    if (count === 0) return 'Nothing on the agenda. Enjoy the quiet.';
    if (count === 1) return "One small thing today. That's plenty.";
    if (count <= 5) return `${spell(count)} small things today. That's plenty.`;
    return `${spell(count)} things today. Start with just one.`;
  },
  things,
  customsWaiting: (count: number) => `${things(count)} waiting at ${names.customs}`,
  nextStepLabel: 'Your next small step',
  madeSmaller: 'Made smaller by AI',
  startModeLead: 'Just five minutes. No pressure, just a beginning. Stop when the timer ends, or keep going.',
  passportStatus: 'Proudly in progress',
  passportLead: 'A little proof of progress.',
  encouragement: 'Starting counts. So does coming back, and asking for help.',
  stamped: 'Stamped',
  signIn: {
    eyebrow: 'Passport control',
    titleLead: 'Welcome to the',
    titleAccent: 'Nation.',
    lead: 'Sign in to pick up where you left off. New here? This is where your passport begins.',
    /** Shown bilingually like the passport ID labels; screen readers get `emailLabelSpoken`. */
    emailLabel: 'Email / Courriel',
    emailLabelSpoken: 'Email',
    emailPlaceholder: 'you@school.edu',
    continueWithApple: 'Continue with Apple',
    continueWithGoogle: 'Continue with Google',
    sendLink: 'Email me a sign-in link',
    sending: 'Sending…',
    hint: 'No password needed. Open the link on this device and you’re in.',
    invalidEmail: 'That email doesn’t look quite right.',
    sentTitle: 'Check your email.',
    sentBody: (email: string) => `We sent a sign-in link to ${email}. Open it on this device and you’re in.`,
    resend: 'Resend the link',
    resendIn: (seconds: number) => `Resend in ${seconds}s`,
    differentEmail: 'Use a different email',
    checking: 'Checking your papers…',
    callbackFailedTitle: 'That link didn’t work.',
    backToSignIn: 'Back to sign in',
    signedInAs: (email: string) => `Signed in as ${email}`,
    signOut: 'Sign out',
  },
  capture: {
    eyebrow: 'Capture',
    placeholder: 'Walk Biscuit every day 6pm',
    landsInCustoms: 'Lands in Customs',
    due: (day: string) => `Due ${day}`,
    added: (where: string) => `Added ${where}.`,
    whereToday: 'to Today',
    whereCustoms: 'to Customs',
    whereDay: (day: string) => `for ${day}`,
  },
  today: {
    emptyHint: 'Capture anything: “Walk Biscuit every day 6pm”, “Essay due fri”, or just “Buy stamps”.',
    captureCta: 'Capture something',
    loadFailed: 'Couldn’t load your day. Check your connection.',
    saveFailed: 'Couldn’t save that change. Check your connection and try again.',
    retry: 'Try again',
    /** A repeating task moved on: "Walk Biscuit · back tomorrow". */
    movedOn: (title: string, day: string) => `${title} · back ${day}`,
    due: (day: string) => `due ${day}`,
  },
  passport: {
    eyebrow: 'Passport · Passeport',
    cover: 'Citizen passport',
    nameLabel: 'Name / Nom',
    statusLabel: 'Status / Statut',
    citizenLabel: 'Citizen no. / No de citoyen',
    noName: 'Not given yet',
    stampsLabel: 'Visas & stamps',
    noStamps: 'Your first stamp lands the first time you finish something.',
    toNextRank: (n: number, rank: string) => `${n} more ${n === 1 ? 'start' : 'starts'} to ${rank}`,
    loadFailed: 'Couldn’t load your passport. Check your connection.',
  },
  authErrors: {
    rateLimited: 'Too many tries. Give it a minute, then try again.',
    offline: 'Can’t reach the Nation right now. Check your connection and try again.',
    staleLink: 'That link has expired, or it was opened on a different device or browser. Request a fresh one.',
    generic: 'Something went wrong signing you in. Please try again.',
  },
} as const;

// ---------------------------------------------------------------------------
// Passport identity: citizen numbers and the machine-readable code lines.

/** 42 → "000042". Early users get low numbers. */
export function formatCitizenNumber(n: number): string {
  return String(n).padStart(6, '0');
}

const mrzClean = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, '<')
    .replace(/^<+|<+$/g, '');

/** "PN<REYES<<MAYA<<<<<<<<<<<<<<<<", padded or cut to `width`. */
export function mrzNameLine(firstName: string, lastName: string, width = 30): string {
  const line = `PN<${mrzClean(lastName)}<<${mrzClean(firstName)}`;
  return line.padEnd(width, '<').slice(0, width);
}

/** "000042<2026<ONE<STEP<AT<A<TIME". */
export function mrzMottoLine(citizenNumber: number, year: number): string {
  return `${formatCitizenNumber(citizenNumber)}<${year}<ONE<STEP<AT<A<TIME`;
}
