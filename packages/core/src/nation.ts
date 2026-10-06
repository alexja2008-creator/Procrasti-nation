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
/** Start Mode timer lengths, spelled: "Just five minutes." */
const minutesWord = (n: number) => ({ 2: 'two', 5: 'five', 10: 'ten', 25: 'twenty-five' })[n] ?? String(n);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  /** The Today ticket when no plan step is due: the most pressing task. */
  upNextLabel: 'Up next',
  madeSmaller: 'Made smaller by AI',
  /** Today's standing hint about the row menu, always shown under the agenda heading. */
  rowMenuHint: (web: boolean) =>
    web ? 'Right-click or press and hold any task to Start it or Plan it.' : 'Press and hold any task to Start it or Plan it.',
  cancel: 'Cancel',
  /** VoiceOver's name for the row menu action. */
  rowMenuLabel: 'Start, Plan it or Move to',
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
    /** Captured into a territory: the chip reads "in Chem 201", the note "Added to Chem 201." */
    inTerritory: (name: string) => `in ${name}`,
    whereTerritory: (name: string) => `to ${name}`,
    /** The switch at the top of the sheet. */
    task: 'Task',
    note: 'Note',
    notePlaceholder: 'Lecture notes, a list, an idea…',
    saveNote: 'Save note',
    savedTo: (where: string) => `Saved to ${where}.`,
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
  upcoming: {
    eyebrow: 'Upcoming',
    title: 'The week ahead.',
    nothingYet: 'Nothing yet.',
    later: 'Later',
    /** The deadline marker on the day a task is due. */
    due: 'Due',
    dueSpoken: (title: string, day: string) => `Due ${day}: ${title}`,
    /** Finished items leave Upcoming, so the note offers Undo. */
    stamped: (title: string) => `Stamped “${title}”.`,
    loadFailed: 'Couldn’t load what’s coming up. Check your connection.',
    /** The calendar toggle on phones: the week strip expands to the month. */
    month: 'Month',
    week: 'Week',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    /** The "+" on a day's heading, read aloud: "Add to Thu 8 Oct". */
    addTo: (day: string) => `Add to ${day}`,
  },
  territories: {
    eyebrow: 'Territories',
    title: 'Every corner of your life.',
    customsCount: (n: number) => (n === 0 ? 'All clear' : `${n} waiting`),
    customsLead: 'Captures with no day and no territory wait here. Give each one a day, or file it in a territory.',
    customsEmpty: 'All clear. Anything you capture without a day lands here first.',
    open: (n: number) => (n === 0 ? 'Nothing open' : `${n} open`),
    /** A territory card's next item: "Fri: Write lab report". */
    next: (when: string, title: string) => `${when}: ${title}`,
    newTerritory: 'New territory',
    /** In the territory picker. */
    newTerritoryMore: 'New territory…',
    none: 'No territory',
    filed: (name: string) => `Filed in ${name}.`,
    emptyLead: 'A territory holds one part of your life: a class, a job, home. Start with one.',
    /** One-tap starters while there are no territories yet. */
    starters: [
      { name: 'School', kind: 'school', ink: 'violet' },
      { name: 'Work', kind: 'work', ink: 'terracotta' },
      { name: 'Home', kind: 'home', ink: 'forest' },
    ],
    kinds: { school: 'School', work: 'Work', home: 'Home', custom: 'Other' },
    inks: { terracotta: 'Terracotta', violet: 'Violet', forest: 'Forest' },
    nameLabel: 'Name',
    namePlaceholder: 'Chem 201',
    kindLabel: 'Kind',
    inkLabel: 'Stamp ink',
    create: 'Create',
    save: 'Save',
    edit: 'Edit',
    back: 'Territories',
    comingUp: 'Coming up',
    anytime: 'Anytime',
    empty: 'Nothing here yet. Add something with +, or file a task here from its menu.',
    stepsDone: (done: number, total: number) => `${done} of ${total} steps`,
    addTo: (name: string) => `Add to ${name}`,
    delete: 'Delete territory',
    deleteNote: 'Its tasks stay: undated ones go back to Customs, dated ones stay on their days.',
    deleted: (name: string) => `Deleted “${name}”. Its tasks are back in Customs.`,
    loadFailed: 'Couldn’t load your territories. Check your connection.',
    saveFailed: 'Couldn’t save that change to your territories. Try again.',
    notFound: 'That territory isn’t here anymore.',
  },
  notes: {
    title: 'Notes',
    lead: 'Lecture notes, lists, ideas. Any line can become a checkbox that’s a real task.',
    newNote: 'New note',
    /** A note with no words yet. */
    untitled: 'New note',
    empty: 'No notes yet. Capture one with +, or start one here.',
    eyebrow: 'Note',
    titlePlaceholder: 'Title',
    placeholder: 'Write anything.',
    /** The ☐ button: the line you're on becomes a checkbox task, or back. */
    checklist: 'Checklist',
    /** Under a note's title until they've made a line a task (or hidden the tip). */
    checklistHint: 'To make a line a task, put the cursor on it and tap the checkbox at the top.',
    checklistHintWeb: (keys: string) => `To make a line a task, put the cursor on it and click the checkbox at the top, or press ${keys}.`,
    hideHint: 'Hide tip',
    openTask: (title: string) => `Open “${title}”`,
    close: 'Close',
    delete: 'Delete',
    deleted: (title: string) => `Deleted “${title}”.`,
    saveFailed: 'Couldn’t save your note. It’s still here; check your connection.',
    loadFailed: 'Couldn’t load your notes. Check your connection.',
    notFound: 'That note isn’t here anymore.',
    progress: (done: number, total: number) => `${done} of ${total}`,
    count: (n: number) => (n === 1 ? '1 note' : `${n} notes`),
    edited: (day: string) => `Edited ${day}`,
    noTerritory: 'No territory',
    /** Loads the next 25. */
    showOlder: 'Show older',
  },
  search: {
    title: 'Search',
    placeholder: 'Search tasks and notes',
    cancel: 'Cancel',
    hint: 'Find any task or note, finished ones too. Add #name to look in one territory.',
    hintIn: (name: string) => `Type to search in ${name}.`,
    tasks: 'Tasks',
    finished: 'Finished',
    notes: 'Notes',
    showMore: 'Show more',
    noMatches: (words: string) => `Nothing matches “${words}”.`,
    noMatchesIn: (words: string, name: string) => `Nothing in ${name} matches “${words}”.`,
    failed: 'Couldn’t search. Check your connection.',
    /** The chip for a #tag's territory; tapping it searches everywhere again. */
    clearTerritory: (name: string) => `Searching ${name} only. Search everywhere`,
    done: (day: string) => `Done ${day}`,
  },
  start: {
    eyebrow: 'Start mode',
    /** Non-breaking spaces keep "step 2 of 10" on one line when the plan's title wraps. */
    step: (parent: string, index: number, count: number) => `${parent} · step\u00A0${index}\u00A0of\u00A0${count}`,
    of: (clock: string) => `of ${clock}`,
    andCounting: 'and counting',
    paused: 'paused',
    lead: (minutes: number) =>
      `Just ${minutesWord(minutes)} minutes. No pressure, just a beginning. Stop when the timer ends, or keep going.`,
    done: 'Done. Stamp it.',
    stuck: 'I’m stuck',
    pause: 'Pause',
    resume: 'Resume',
    close: 'Leave Start Mode',
    firstStart: 'Your first start. That’s a stamp in your passport.',
    contractTitle: (minutes: number) => `${capitalize(minutesWord(minutes))} minutes. You started.`,
    contractBody: 'That was the hard part. Keep going, or stop here with a clear conscience.',
    keepGoing: 'Keep going',
    stopHere: 'Stop here',
    /** Shown on Today after leaving without Done. */
    leftNotice: 'You started. That counts.',
    stuckTitle: 'What’s in the way?',
    stuckLead: 'Pick one and we’ll make this step smaller.',
    breatherInstead: 'Take a breather instead',
    shrinking: 'Making it smaller…',
    justThis: 'First, just this',
    startTiny: (minutes: number) => `Start ${minutesWord(minutes)} minutes`,
    another: 'Try another',
    back: 'Back',
    stuckFailed: 'Couldn’t make it smaller just now. Try again, or take a breather.',
    stuckLimit: 'That’s a lot of help for one day. Take a breather, then try the smallest piece you can see.',
    breatherTitle: 'Take a breather',
    breathe: { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' },
    backToIt: 'Back to it',
    stampedTitle: 'Stamped.',
    stampedBody: 'One more small step, officially done.',
    nextStep: 'Next step',
    startNext: 'Start the next step',
    backToToday: 'Back to Today',
    notFound: 'That task isn’t here anymore.',
  },
  task: {
    eyebrow: 'Task',
    stepEyebrow: 'Step',
    close: 'Close',
    delete: 'Delete',
    titlePlaceholder: 'What needs doing?',
    partOf: (title: string) => `Part of ${title}`,
    markDone: (title: string) => `Mark done: ${title}`,
    markNotDone: (title: string) => `Mark not done: ${title}`,
    when: 'When',
    due: 'Due',
    repeat: 'Repeat',
    none: 'None',
    never: 'Never',
    notes: 'Notes',
    notesPlaceholder: 'Add notes',
    noDate: 'No date',
    time: 'Time',
    noTime: 'No time',
    otherTime: 'Other time',
    clear: 'Clear',
    done: 'Done',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    deleted: (title: string) => `Deleted “${title}”.`,
    undo: 'Undo',
    notFound: 'That task isn’t here anymore.',
    steps: 'Steps',
    stepsDone: (done: number, total: number) => `${done} of ${total} done`,
    addStep: 'Add a step',
    moveUp: 'Move up',
    moveDown: 'Move down',
    reorder: (title: string) => `Reorder: ${title}`,
    typeIt: 'Or type it: “fri 6pm”, “every weekday 7am”',
    repeats: (rule: string) => `Repeats ${rule.charAt(0).toLowerCase()}${rule.slice(1)}`,
    /** Row menu: reschedule ("When") without opening the task. */
    moveTo: 'Move to…',
    /** Row menu: file the task in a territory. */
    fileIn: 'File in…',
    territory: 'Territory',
    estimate: 'Estimate',
    minutes: (n: number) => (n < 60 || n % 60 ? `${n} min` : `${n / 60} ${n === 60 ? 'hour' : 'hours'}`),
  },
  /** Words on the ink stamps (mono caps). */
  stampText: {
    rim: 'PROCRASTINATION',
    started: ['OFFICIALLY', 'STARTED'],
    done: ['OFFICIALLY', 'DONE'],
    smallSteps: ['SMALL STEPS', 'AND COUNTING'],
  },
  plan: {
    reading: 'Reading the task…',
    building: 'Making it smaller…',
    buildingHint: 'Usually 10 to 20 seconds.',
    questionsLead: 'A couple of quick questions make the plan fit better. Skip any you like.',
    answerPlaceholder: 'Optional',
    build: 'Build my plan',
    skip: 'Skip questions',
    use: 'Use this plan',
    saving: 'Saving…',
    tryAgain: 'Try again',
    close: 'Close',
    summary: (steps: number, total: string) => `${steps} small steps · about ${total}`,
    dueBy: (day: string) => `Due ${day}`,
    notFound: 'That task isn’t here anymore.',
    limit: 'You’ve used this month’s free plans. They refresh on the 1st.',
    failed: 'Couldn’t build a plan just now. Check your connection and try again.',
    saveFailed: 'Couldn’t save the plan. Try again.',
    /** Re-plan: a fresh plan for what's left, keeping finished steps. */
    replan: 'Re-plan the rest',
    replanLead: (finished: number) =>
      finished
        ? `Keeping the ${finished === 1 ? 'step' : `${finished} steps`} you’ve finished. The new plan replaces the rest.`
        : 'The new plan replaces the current steps.',
    /** Passed to the planner as context (not shown). */
    alreadyDone: 'Already finished:',
  },
  passport: {
    eyebrow: 'Passport · Passeport',
    cover: 'Citizen passport',
    nameLabel: 'Name / Nom',
    statusLabel: 'Status / Statut',
    citizenLabel: 'Citizen no. / No de citoyen',
    noName: 'Not given yet',
    stampsLabel: 'Visas & stamps',
    noStamps: 'Your first stamp lands the first time you start something.',
    /** The stamp page, read aloud. */
    stampsSpoken: (started: boolean, stepsDone: number) =>
      [started ? 'Officially started' : null, stepsDone > 0 ? `${stepsDone} small ${stepsDone === 1 ? 'step' : 'steps'} done` : null]
        .filter(Boolean)
        .join('. '),
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
