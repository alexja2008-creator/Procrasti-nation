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
  morningBriefing: 'Morning Briefing',
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
      'Your history paper has been ‘tomorrow’ since Tuesday. Bold strategy.',
      // Jokes about the task, never the person: shame feeds procrastination.
      'Your history paper has started leaving you voicemails. Five minutes?',
    ],
  },
};

// ---------------------------------------------------------------------------
// Voice: warm and gentle. Small numbers are spelled out.

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const spell = (n: number) => NUMBER_WORDS[n] ?? String(n);
const things = (n: number) => (n === 1 ? '1 thing' : `${n} things`);
const TEENS = ['eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['twenty', 'thirty', 'forty', 'fifty'];
/** Start Mode timer lengths, spelled up to 59: "Just five minutes.", "Thirty-five minutes". */
const minutesWord = (n: number): string => {
  if (!Number.isInteger(n) || n < 0 || n > 59) return String(n);
  if (n <= 10) return spell(n).toLowerCase();
  if (n < 20) return TEENS[n - 11];
  const ones = n % 10;
  return TENS[Math.floor(n / 10) - 2] + (ones ? `-${spell(ones).toLowerCase()}` : '');
};
const hoursWord = (h: number) => (h === 1 ? 'an hour' : `${spell(h).toLowerCase()} hours`);
/** A timer's length in words: "five minutes", "an hour and a half", "two hours and fifteen minutes". */
const duration = (m: number): string => {
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${minutesWord(m)} ${m === 1 ? 'minute' : 'minutes'}`;
  if (rest === 0) return hoursWord(h);
  if (rest === 30) return h === 1 ? 'an hour and a half' : `${spell(h).toLowerCase()} and a half hours`;
  return `${hoursWord(h)} and ${duration(rest)}`;
};
/** The longest start timer (Settings' longest choice, `Preferences['startMinutes']`). */
const LONGEST_START = 25;
/** Longer than any start timer: a step's own estimate, with its own words. */
const longTimer = (m: number) => m > LONGEST_START;
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
  rowMenuLabel: 'Start, Plan it, Move to or Rename',
  passportStatus: 'Proudly in progress',
  passportLead: 'A little proof of progress.',
  encouragement: 'Starting counts. So does coming back, and asking for help.',
  stamped: 'Stamped',
  signIn: {
    eyebrow: 'Passport control',
    titleLead: 'Welcome to the',
    titleAccent: 'Nation.',
    lead: 'Sign in to pick up where you left off.',
    /** Shown bilingually like the passport ID labels; screen readers get `emailLabelSpoken`. */
    emailLabel: 'Email / Courriel',
    emailLabelSpoken: 'Email',
    emailPlaceholder: 'you@school.edu',
    passwordLabel: 'Password / Mot de passe',
    passwordLabelSpoken: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    needPassword: 'Enter your password.',
    useLink: 'Email me a sign-in link instead',
    usePassword: 'Sign in with a password instead',
    forgot: 'Forgot your password?',
    forgotNeedsEmail: 'Type your email above first, then tap Forgot.',
    newHere: 'New here? Start your application',
    /** Someone whose passport is still unsaved on their phone can't sign in elsewhere yet. */
    startedOnPhone: 'Started on your phone? Save your passport there first: Settings, then Save your passport.',
    useCode: 'Text me a code instead',
    phoneSentBody: (phone: string) => `If ${phone} has a passport, a code is on its way.`,
    usernameLabel: 'Username / Nom d’utilisateur',
    usernameLabelSpoken: 'Username',
    usernamePlaceholder: 'your_username',
    usernameHint: '3 to 20 letters, numbers or underscores.',
    usernameChecking: 'Checking…',
    usernameTaken: (username: string) => `${username} is taken. Try another.`,
    usernameFree: (username: string) => `${username} is free.`,
    newPasswordHint: (min: number) => `At least ${min} characters.`,
    confirmBody: (email: string) => `We sent a link to ${email} to confirm your passport. Open it on this device to sign in.`,
    resendConfirm: 'Send it again',
    resetBody: (email: string) => `If ${email} has a passport, a link to choose a new password is on its way. Open it on this device.`,
    newPasswordTitle: 'Choose a new password.',
    newPasswordLead: 'You’re signed in. From now on, sign in with your email and this password.',
    notNow: 'Not now',
    continueWithApple: 'Continue with Apple',
    continueWithGoogle: 'Continue with Google',
    sendLink: 'Email me a sign-in link',
    sending: 'Sending…',
    hint: 'No password needed. Open the link on this device and you’re in.',
    invalidEmail: 'That email doesn’t look quite right.',
    sentTitle: 'Check your email.',
    sentBody: (email: string) => `If ${email} has a passport, a sign-in link is on its way. Open it on this device and you’re in.`,
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
    /**
     * The rows under the input (Alex, 2026-10-20): Start · Today · Tomorrow · Pick a date ·
     * Later, the day you'll start it; then Add a due date, which opens Due · Today · Tomorrow ·
     * Pick a date.
     */
    startRow: 'Start',
    start: (day: string) => `Start ${day}`,
    dueRow: 'Due',
    addDue: 'Add a due date',
    /** Under the Start row when PN filled in the start day for a deadline. */
    startFilled: (dayBefore: boolean) => (dayBefore ? 'The day before it’s due.' : 'Today, so there’s time before it’s due.'),
    /** A repeat's first day: "Starts Sat". */
    starts: (day: string) => `Starts ${day}`,
    /** A repeat with no time can't ring yet. `repeat` is "Every week on Mon, Wed, Sat". */
    nudgeHint: (repeat: string) => `Add a time, like 6pm, for a nudge ${repeat.charAt(0).toLowerCase()}${repeat.slice(1)}.`,
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
    /** A plan on Today: its steps behind a toggle, progress where a checkbox would be (Alex, 2026-10-14). */
    stepsProgress: (done: number, total: number) => `${done} of ${total} steps`,
    stepsProgressSpoken: (done: number, total: number) => `${done} of ${total} steps done`,
    /** Counts the open steps it shows; the finished ones show too, struck through (Alex, 2026-10-20). */
    showSteps: (open: number) => (open === 0 ? 'Show steps' : `Show steps (${open} for today)`),
    hideSteps: 'Hide steps',
    /** A step finished on an earlier day: "done yesterday", "done Sat 17 Oct". Today's show the time. */
    doneOn: (day: string) => `done ${day}`,
    allStepsDone: (total: number) => (total === 1 ? 'Its step is done. Mark the plan done?' : `All ${total} steps done. Mark the plan done?`),
    markPlanDone: 'Mark plan done',
    emptyHint: 'Capture anything: “Walk Biscuit every day 6pm”, “Essay due fri”, or just “Buy stamps”.',
    captureCta: 'Capture something',
    loadFailed: 'Couldn’t load your day. Check your connection.',
    saveFailed: 'Couldn’t save that change. Check your connection and try again.',
    retry: 'Try again',
    /** A repeating task moved on: "Walk Biscuit · back tomorrow". */
    movedOn: (title: string, day: string) => `${title} · back ${day}`,
    due: (day: string) => `due ${day}`,
    /** "What stops you: it feels too big": Today shows just the next step. */
    focusedSubtitle: 'Just this one for now. The rest can wait.',
    showEverything: (n: number) => `Show everything (${n} more)`,
  },
  /** Declarations: a start time signed for one task (docs/plans/shipped/declarations.md). */
  declaration: {
    /** The row menu's item. */
    action: 'Declare a start',
    /** The task page's button, beside Start. */
    short: 'Declare',
    /** In a row's stamp slot until it has one (Alex, 2026-10-20). */
    invite: 'Declare a start time?',
    inviteLabel: (title: string) => `Declare a start time for “${title}”`,
    statement: (title: string, when: string) => `I’ll start “${title}” ${when}.`,
    /** Before a time is picked. */
    statementOpen: (title: string) => `I’ll start “${title}” at…`,
    why: 'Deciding exactly when you’ll start makes starting likelier. You’ll get a nudge then.',
    day: 'Day',
    time: 'Start at',
    soon: 'In 15 min',
    otherTime: 'Other time',
    signHere: 'Sign here',
    signLabel: 'Signature',
    signHint: 'Draw your signature, or choose Sign with my name.',
    signWithName: 'Sign with my name',
    /** When there's no name to sign with. */
    signedFallback: 'Citizen',
    clear: 'Clear',
    declare: 'Declare',
    /** The notice after signing, with Undo. */
    declared: (title: string, when: string) => `Declared: “${title}” ${when}.`,
    /** Beside a declared row's time. */
    mark: 'Declared',
    /** Start Mode, on starting in time. */
    kept: 'Declaration kept. That’s a stamp in your passport.',
  },
  /** The Morning Briefing: what carried over from before today (docs/plans/shipped/morning-briefing.md). Never "overdue". */
  briefing: {
    /** The card on Today. */
    carriedOver: (n: number) => (n === 1 ? 'One thing carried over' : `${spell(n)} things carried over`),
    sort: (n: number) => (n === 1 ? 'Sort it' : 'Sort them'),
    notNow: 'Not now',
    /** Where a leftover came from: "from yesterday", "was due Sat 3 Oct". */
    from: (day: string) => `from ${day}`,
    wasDue: (day: string) => `was due ${day}`,
    today: 'Today',
    pickDay: 'Pick a day',
    letGo: 'Let it go',
    moveAll: 'Move all to today',
    /** A plan with steps carried over. */
    planSteps: (n: number) => (n === 1 ? 'One step carried over' : `${spell(n)} steps carried over`),
    respread: 'Re-spread the rest',
    /** A plan's carried-over steps, folded away until asked for. */
    oneByOne: 'One by one',
    hideSteps: 'Hide steps',
    respreadHint: (deadline: string | null) =>
      deadline ? `Re-spread puts its open steps between today and ${deadline}.` : 'Re-spread puts its open steps one a day from today.',
    allSorted: 'All sorted. A fresh page.',
    /** A long briefing (core's `LONG_BRIEFING`): pick up to three for today, and the rest wait. */
    pickThree: 'Pick three',
    pickWhy: 'Suggested by the nearest deadline, then what’s waited longest. Swap any of them.',
    pickFull: 'Three picked. Untick one to swap.',
    /** A deadline still ahead, beside a pick: "due Fri". */
    dueBy: (day: string) => `due ${day}`,
    showRest: (n: number) => `Show the rest (${n})`,
    hideRest: 'Hide the rest',
    putOnToday: (n: number) => (n === 0 ? 'Put on today' : `Put ${spell(n).toLowerCase()} on today`),
    sortEach: 'Sort one by one instead',
    pickInstead: 'Pick three instead',
    pickedToday: (n: number) => `${n === 1 ? 'One thing is' : `${spell(n)} things are`} on today. The rest can wait.`,
    /** Undo notices. */
    onToday: (title: string) => `“${title}” is on today.`,
    movedTo: (title: string, day: string) => `“${title}” moved to ${day}.`,
    letGone: (title: string) => `Let “${title}” go. It’s waiting with no date.`,
    allToday: (n: number) => (n === 1 ? 'Moved one thing to today.' : `Moved ${spell(n).toLowerCase()} things to today.`),
    respreadDone: (title: string) => `Spaced out “${title}” again.`,
    /** Read aloud for each row's buttons: "Today: Buy stamps". */
    actionFor: (action: string, title: string) => `${action}: ${title}`,
    /** Added to the morning list notification; opening it opens the briefing. */
    morningCarried: (n: number) => (n === 1 ? 'One thing carried over, ready to sort.' : `${spell(n)} things carried over, ready to sort.`),
    /**
     * Yesterday, in true numbers: one-offs and plan steps finished, and starts. Repeats leave no
     * record when checked off, so they aren't counted (and the words never claim "everything").
     * Null when both are zero: no recap rather than a zero.
     */
    recap: (finished: number, starts: number) => {
      const parts = [
        finished ? (finished === 1 ? 'one thing finished' : `${spell(finished).toLowerCase()} things finished`) : null,
        starts ? (starts === 1 ? 'one start' : `${spell(starts).toLowerCase()} starts`) : null,
      ].filter(Boolean);
      return parts.length ? `Yesterday: ${parts.join(' and ')}.` : null;
    },
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
    /**
     * A repeat's later turn in the week ahead (Alex, 2026-10-16): its line, and what its repeat
     * mark says when tapped ("Wednesday's turn opens once Monday's is done"). Never "locked".
     */
    previewLine: (before: string) => `Repeats · opens after ${before}`,
    previewNotice: (turn: string, before: string) => `${turn.charAt(0).toUpperCase()}${turn.slice(1)}’s turn opens once ${before}’s is done.`,
    previewMark: (title: string, notice: string) => `${title} repeats. ${notice}`,
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
      longTimer(minutes)
        ? `${capitalize(duration(minutes))} for this step. Settle in. Stop when the timer ends, or keep going.`
        : `Just ${duration(minutes)}. No pressure, just a beginning. Stop when the timer ends, or keep going.`,
    done: 'Done. Stamp it.',
    stuck: 'I’m stuck',
    pause: 'Pause',
    resume: 'Resume',
    close: 'Leave Start Mode',
    firstStart: 'Your first start. That’s a stamp in your passport.',
    contractTitle: (minutes: number) =>
      longTimer(minutes) ? `${capitalize(duration(minutes))} in. You stayed with it.` : `${capitalize(duration(minutes))}. You started.`,
    contractBody: 'That was the hard part. Keep going, or stop here with a clear conscience.',
    keepGoing: 'Keep going',
    stopHere: 'Stop here',
    /** Shown on Today after leaving without Done (Diplomat; see toneLines). */
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
    /** The day you'll start it (Alex, 2026-10-20: "When" became Start; Do and Due look and sound alike). */
    start: 'Start',
    due: 'Due',
    repeat: 'Repeat',
    none: 'None',
    /** No start day yet: the + sheet's and the Start sheet's chip, and an empty Start. */
    later: 'Later',
    /** A due date set on a task with no start day fills one in (`fillStart`), said with Undo. */
    startFilled: (day: string, dayBefore: boolean) =>
      dayBefore ? `Start ${day}, the day before it’s due.` : `Start ${day}, so there’s time before it’s due.`,
    never: 'Never',
    notes: 'Notes',
    notesPlaceholder: 'Add notes',
    noDate: 'No date',
    /** The day chips everywhere, the + sheet too: Today · Tomorrow · Pick a date (Alex, 2026-10-15). */
    pickDate: 'Pick a date',
    /** The Pick a date chip once a day is picked, for screen readers: "Pick a date: Thursday 22 October". */
    pickedDate: (day: string) => `Pick a date: ${day}`,
    time: 'Time',
    noTime: 'No time',
    otherTime: 'Other time',
    clear: 'Clear',
    done: 'Done',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    deleted: (title: string) => `Deleted “${title}”.`,
    undo: 'Undo',
    /** A plan's step moved to a later day: asked each time, never automatic (Alex, 2026-10-15). */
    followAsk: 'Move the rest of the plan too?',
    followMove: 'Move them',
    followed: (n: number) => (n === 1 ? 'Moved 1 step.' : `Moved ${n} steps.`),
    notFound: 'That task isn’t here anymore.',
    steps: 'Steps',
    stepsDone: (done: number, total: number) => `${done} of ${total} done`,
    addStep: 'Add a step',
    moveUp: 'Move up',
    moveDown: 'Move down',
    reorder: (title: string) => `Reorder: ${title}`,
    typeIt: 'Or type it: “fri 6pm”, “every weekday 7am”',
    repeats: (rule: string) => `Repeats ${rule.charAt(0).toLowerCase()}${rule.slice(1)}`,
    /** Row menu: reschedule (the start day) without opening the task. */
    moveTo: 'Move to…',
    /** Renaming, made findable (family testing, 2026-10-15): the row menu's item, its sheet, the button by a task's title. */
    renameItem: 'Rename…',
    rename: 'Rename',
    save: 'Save',
    /** The Repeat sheet's monthly choices, worked out from the task's day ("On the 20th", "On the third Tuesday"). */
    everyMonth: 'Every month…',
    /** The Repeat sheet's own days: seven toggles, Monday first. */
    pickDays: 'Pick days…',
    repeatDays: 'Repeat on',
    /** Row menu: file the task in a territory. */
    fileIn: 'File in…',
    territory: 'Territory',
    estimate: 'Estimate',
    minutes: (n: number) => (n < 60 || n % 60 ? `${n} min` : `${n / 60} ${n === 60 ? 'hour' : 'hours'}`),
  },
  reminders: {
    /** The first time a task gets a time: "Want a nudge at 6:00 PM?" (`day`: "tomorrow", "on Fri"). */
    askTitle: (day: string | null, time: string) => `Want a nudge ${day ? `${day} ` : ''}at ${time}?`,
    askBody: 'Reminders ring here at the time you set.',
    allow: 'Allow',
    notNow: 'Not now',
    /** A deadline with a time, when it comes. */
    due: (title: string, time: string) => `${title} is due at ${time}`,
    step: (parent: string, index: number, count: number) => `${parent} · step ${index} of ${count}`,
    morningTitle: (count: number) => (count === 1 ? 'One thing today' : `${spell(count)} things today`),
    startWith: (title: string) => `Start with “${title}”.`,
    /** The buttons under a reminder (press and hold, or pull down). */
    snooze: 'Snooze 10 min',
    /** The Reminders card on Passport (until Settings exists). */
    cardLabel: 'Reminders',
    on: 'On for this iPhone. Tasks with a time ring then, with Done, Snooze and Start right on the reminder.',
    off: 'Off on this iPhone. Turn them on to hear about tasks at the time you set.',
    turnOn: 'Turn on',
    blocked: 'Notifications for ProcrastiNation are turned off in Settings.',
    openSettings: 'Open Settings',
    /** The card in a browser. */
    onWeb: 'On in this browser. Tasks with a time ring then, even with this tab closed, as long as the browser is open.',
    offWeb: 'Off in this browser. Turn them on to hear about tasks at the time you set.',
    blockedWeb: 'Notifications are blocked for this site. Allow them in the browser’s site settings (the icon beside the address), then come back.',
    unsupportedWeb: 'This browser can’t show reminders. Chrome, Edge, Firefox and Safari on a computer can, and so can the iPhone app.',
    turnOffHere: 'Turn off here',
    morningList: 'Morning list',
    morningLead: 'One notification a day with what’s on, and the first thing to start.',
    morningLeadWeb: 'One notification a day on your iPhone with what’s on, and the first thing to start.',
    morningAt: (time: string) => `Every morning at ${time}`,
    changeTime: 'Change time',
    saveFailed: 'Couldn’t save that. Check your connection and try again.',
  },
  /** Words on the ink stamps (mono caps). */
  stampText: {
    rim: 'PROCRASTINATION',
    started: ['OFFICIALLY', 'STARTED'],
    done: ['OFFICIALLY', 'DONE'],
    approved: ['APPLICATION', 'APPROVED'],
    declared: ['DECLARATION', 'SIGNED'],
    smallSteps: ['SMALL STEPS', 'AND COUNTING'],
    declarations: ['DECLARATIONS', 'KEPT'],
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
    limit: (day: string) => `You’ve used your free plans for now. Two more on ${day}.`,
    /** The daily limit (20 plans, 20 rounds of questions), for everyone, the trial and Pro included. */
    dailyLimit: 'That’s today’s limit for Plan it. It’s back tomorrow.',
    /** The Oath's plan: the wait is the application being processed. */
    processing: 'Processing your application…',
    processingHint: 'Making your task smaller. Usually 10 to 20 seconds.',
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
    stampsSpoken: ({ approved, declared, started, stepsDone }: { approved: boolean; declared: boolean; started: boolean; stepsDone: number }) =>
      [
        approved ? 'Application approved' : null,
        declared ? 'Declaration signed' : null,
        started ? 'Officially started' : null,
        stepsDone > 0 ? `${stepsDone} small ${stepsDone === 1 ? 'step' : 'steps'} done` : null,
      ]
        .filter(Boolean)
        .join('. '),
    toNextRank: (n: number, rank: string) => `${n} more ${n === 1 ? 'start' : 'starts'} to ${rank}`,
    loadFailed: 'Couldn’t load your passport. Check your connection.',
    /** The Declarations page: only ever what was kept (never a kept-or-missed tally). */
    declarationsLabel: 'Declarations',
    declarationsLead: (n: number) => (n === 1 ? 'One start time signed and kept.' : `${spell(n)} start times signed and kept.`),
    declarationsEmpty: (web: boolean) =>
      `${web ? 'Right-click or press and hold' : 'Press and hold'} a task, then Declare a start. Start on time and it’s recorded here.`,
    /** A kept Declaration, read aloud: "Essay, started Mon 12 Oct at 2:58 PM". */
    declarationSpoken: (title: string, day: string, time: string) => `${title}, started ${day} at ${time}`,
    deletedTask: 'A task since deleted',
    showAll: (n: number) => `Show all (${n})`,
    showFewer: 'Show fewer',
  },
  /** The Citizenship Application (first-run onboarding). */
  application: {
    eyebrow: 'Citizenship Application',
    page: (n: number, of: number) => `Page ${n} of ${of}`,
    welcomeTitle: 'Welcome to the nation.',
    welcomeBody: 'A few quick questions so ProcrastiNation fits how you work. About three minutes, and you can change any answer later in Settings.',
    alreadyCitizen: 'Already a citizen? Sign in',
    reserved: (citizenNo: string) => `Citizen No. ${citizenNo} is reserved for you.`,
    begin: 'Begin',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Continue',
    pickOne: 'Pick the closest. You can change it later.',
    nameTitle: 'What should we call you?',
    nameLead: 'It goes on your passport. Only you see it, and you can change it in Settings.',
    firstName: 'First name',
    lastName: 'Last name (optional)',
    /** The age check (core `MIN_AGE`): it never says what age is needed, and the date is never kept. */
    birthTitle: 'Date of birth',
    birthLead: 'Every passport asks. It’s checked on this device and never saved.',
    birthMonth: 'Month',
    birthDay: 'Day',
    birthYear: 'Year',
    birthInvalid: 'That date doesn’t look right. Enter it as MM / DD / YYYY.',
    ineligibleTitle: 'Sorry, you’re not eligible.',
    ineligibleBody: 'ProcrastiNation can’t issue you a passport.',
    purposeTitle: 'Purpose of visit',
    purposes: [
      { id: 'school', label: 'School', hint: 'Classes, assignments, exams' },
      { id: 'work', label: 'Work', hint: 'Projects and deadlines' },
      { id: 'both', label: 'Both', hint: 'School and a job' },
      { id: 'life', label: 'Life admin', hint: 'Errands, bills, everything else' },
    ],
    hoursTitle: 'When do you get things done?',
    hours: [
      { id: 'early', label: 'Early bird', hint: 'Mornings are best' },
      { id: 'day', label: 'Daytime', hint: 'Roughly nine to five' },
      { id: 'night', label: 'Night owl', hint: 'Late nights are best' },
    ],
    styleTitle: 'What usually stops you?',
    styles: [
      { id: 'avoid', label: 'I avoid it', hint: 'I know what to do. I just don’t start.' },
      { id: 'perfectionist', label: 'It has to be perfect', hint: 'If it can’t be great, I’d rather not begin.' },
      { id: 'overwhelmed', label: 'It feels too big', hint: 'I don’t know where to start.' },
      { id: 'bored', label: 'It’s boring', hint: 'I can’t make myself care.' },
    ],
    /** After "What stops you": procrastination is mood repair, and shame feeds it (Alex, 2026-10-07). */
    notBrokenTitle: 'First, you’re not broken.',
    notBroken: [
      'Putting things off isn’t a character flaw. It’s mostly mood repair: a task feels bad, so avoiding it feels better, for a while. Then the bad feeling comes back bigger.',
      'Beating yourself up feeds that loop. In one study, students who forgave themselves for putting off studying for an exam put off studying less for the next one.',
      'So go easy on yourself. Not as a reward for changing: it’s how the change happens. We’ll help with the rest, one small step at a time.',
    ],
    notBrokenSource: 'Based on research by Tim Pychyl and Fuschia Sirois, and Wohl, Pychyl & Bennett (2010).',
    toneTitle: 'How should we nudge you?',
    /** Your result: what stops them, read back as a mechanism that's fixable. True numbers only (Steel, 2007). */
    resultTitle: 'Your result',
    resultFact: {
      students: 'You’re in good company: most college students put things off, and for about half it happens often enough to be a real problem.',
      adults: 'You’re in good company: nearly everyone puts things off, and about one adult in five does it all the time.',
    },
    resultSource: 'From a review of decades of procrastination research (Steel, 2007).',
    resultYours: (answer: string) => `Yours is “${answer}”.`,
    resultWhy: {
      avoid: 'The task carries a bad feeling, so not starting feels like relief, for a while.',
      perfectionist: 'When the bar is “great”, starting means risking “not great”.',
      overwhelmed: 'When the first step isn’t visible, starting feels impossible.',
      bored: 'Your brain is looking for something more rewarding, and the task loses.',
    },
    resultFix: {
      avoid: 'The fix isn’t more willpower. It’s a start so small the feeling doesn’t get a vote.',
      perfectionist: 'The fix: a first pass that’s allowed to be rough, on a timer that ends.',
      overwhelmed: 'The fix: one step small enough to see, then the next.',
      bored: 'The fix: make starting quicker than the excuse, and make it count for something.',
    },
    /** How PN helps you: three real pieces of the app, the one for what stops them first. */
    helpTitle: 'How ProcrastiNation helps you',
    helpLead: 'Built around what stops you.',
    helpCards: {
      planIt: { title: 'Plan it', body: 'Name a big task and get small steps, each with a day and a time estimate.', example: 'History essay → Gather 4–5 sources · 30 min' },
      startMode: { title: 'Start Mode', body: 'Just five minutes. Stop after, if you like: starting is the hard part, and it counts.', example: '5:00 · Open the doc and write the title' },
      focusedToday: { title: 'Just the next step', body: 'Today shows one small step at a time. The rest can wait.', example: 'Your next small step · 1 of 8' },
      roughFirst: { title: 'Rough first, on a timer', body: 'A first pass with an end time, so “good enough for now” is allowed.', example: '10:00 · A messy first draft of the intro' },
      stamps: { title: 'Stamps and ranks', body: 'Every start counts toward your rank, and finishing earns an ink stamp.', example: 'Officially started · Small steps 3' },
      nudges: { title: 'Nudges in your tone', body: 'A morning list and reminders that sound the way you picked.', example: '' },
    },
    heardFromTitle: 'Where did you hear about us?',
    heardFromLead: 'One tap. It helps us find more people like you.',
    heardFrom: [
      { id: 'tiktok', label: 'TikTok' },
      { id: 'instagram', label: 'Instagram' },
      { id: 'youtube', label: 'YouTube' },
      { id: 'reddit', label: 'Reddit' },
      { id: 'friend', label: 'A friend or classmate' },
      { id: 'appStore', label: 'The App Store' },
      { id: 'other', label: 'Somewhere else' },
    ],
    openingPassport: 'Opening your passport…',
    passportFailed: 'Couldn’t open your passport. Check your connection and try again.',
    /** The Oath: one real thing, planned live. */
    oathTitle: 'One thing you’ve been putting off',
    oathLead: 'Everyone has one. Name it, and we’ll make it smaller together.',
    oathPlaceholder: 'Write my history essay',
    oathHint: 'A date in it counts too: “history essay due fri”.',
    /** Today · Tomorrow · Pick a date · No date, nothing picked (Alex, 2026-10-15). */
    dueLabel: 'When is it due?',
    notNow: 'Not now',
    /** Back from Plan it without a plan. */
    oathAgain: 'No plan yet. Try Plan it again, or come back to it from Today.',
    firstWeekTitle: 'Your first week',
    firstWeekLead: 'Small steps on their days. You don’t have to do them all: just the next one.',
    firstWeekNone: 'Your plan’s steps are on Today and Upcoming, each on its day.',
    /** The Oath's first step, declared: a start time signed (docs/plans/shipped/declarations.md). */
    declareTitle: 'Your first Declaration',
    declareLead: (step: string) => `When will you start “${step}”? Pick a time and sign. You’ll get a nudge then.`,
    nudgeTitle: 'A nudge for your next step?',
    nudgeBody: (time: string) =>
      `One notification each morning at ${time}, with what’s on and the first thing to start. Nothing else unless you ask.`,
    /** After the first Declaration: notifications are what make it ring. */
    nudgeBodyDeclared: (when: string, time: string) =>
      `Allow notifications and your Declaration rings ${when}. Each morning at ${time}, a short list of what’s on, too. Nothing else unless you ask.`,
    nudgeYes: 'Yes, nudge me',
    nudgeOff: 'Notifications are off for ProcrastiNation. You can turn them on later in Settings.',
    approvedTitle: (firstName?: string | null) => (firstName ? `Welcome, ${firstName}.` : 'Welcome, citizen.'),
    approvedBody: (citizenNo: string) => `Citizen No. ${citizenNo}. Your passport is ready, and Today is waiting.`,
    approvedBodyOath: (citizenNo: string) => `Citizen No. ${citizenNo}. Your first small step is waiting on Today.`,
    goToToday: 'Go to Today',
    saveFailed: 'Couldn’t save that. Check your connection and try again.',
    /** Save your passport: an anonymous one becomes one they can sign in to anywhere. */
    saveTitle: 'Save your passport.',
    saveLead: 'Keep it safe, and sign in on your laptop or a new phone. It takes a moment.',
    phoneLabel: 'Mobile / Cellulaire',
    phoneLabelSpoken: 'Mobile number',
    phonePlaceholder: '(555) 234-5678',
    phoneHint: 'US and Canadian numbers for now. We text a code, nothing else.',
    invalidPhone: 'That number doesn’t look right. US and Canadian numbers for now.',
    textMeACode: 'Text me a code',
    sendingCode: 'Sending…',
    codeLabel: 'Code',
    codeSent: (phone: string) => `We texted a code to ${phone}.`,
    confirmCode: 'Save my passport',
    savingPassport: 'Saving…',
    wrongCode: 'That code didn’t work. Check it, or send a new one.',
    codeFailed: 'Couldn’t text a code just now. Try again, or use email instead.',
    differentNumber: 'Use a different number',
    newCode: 'Send a new code',
    useEmail: 'Use email and a password instead',
    usePhone: 'Text me a code instead',
    sendEmailLink: 'Send the link',
    /** An email typed into the username box moves to the email box, and the username comes from it. */
    emailMoved: 'That’s an email, so it went in the email box.',
    usernameFromEmail: 'The username comes from it; change it if you like.',
    /** Supabase sends one save link a minute: the form's button waits out the rest. */
    sendIn: (seconds: number) => `Send in ${seconds}s`,
    emailSent: (email: string) =>
      `Open the link we sent to ${email} whenever you like, on any device. Your passport saves then, and you’ll choose a password. Keep going meanwhile.`,
    /** The link or code couldn't be sent on our side: they carry on, and saving is asked again later. */
    sendLater: 'We couldn’t send it just now. Carry on, and we’ll ask again later.',
    /** Their email already has a passport: leaving this unsaved one (it's lost) to sign in to that one. */
    signInInstead: 'Sign in to that passport instead',
    signInInsteadBody:
      'This passport isn’t saved, so signing out loses it, with its tasks, notes and stamps. Then choose “Already a citizen? Sign in”.',
    signOutToSignIn: 'Sign out of this one',
    keepThisOne: 'Keep this one',
    savedPhone: (phone: string) => `Saved. Sign in anywhere with a code texted to ${phone}.`,
    /** Until it's saved: a card on Today and Passport, and a row in Settings. */
    unsavedTitle: 'Your passport isn’t saved yet',
    unsavedBody: 'Save it to sign in on your laptop, and to keep it if you change phones.',
    saveAction: 'Save your passport',
    notSaved: 'Not saved',
    /** A save link that's out and not opened yet: the same card and row, until it is. */
    checkEmailTitle: 'Check your email',
    checkEmailBody: (email: string) =>
      `We sent a link to ${email}. Open it to save your passport. Not there? Check your spam folder, or send it again.`,
    sendAgain: 'Send it again',
    sentAgain: 'Sent again. Open the newest one; it can take a minute to arrive.',
    resendFailed: 'We couldn’t send it just now. Try again in a little while.',
    emailConfirmed: 'Your email is confirmed, and your passport is saved.',
    differentEmail: 'Use a different email',
    linkSent: 'Link sent',
    /** Signing out of a passport that isn't saved loses it. */
    signOutUnsavedTitle: 'This passport isn’t saved',
    signOutUnsavedBody: 'Signing out loses it, with its tasks, notes and stamps.',
    signOutAnyway: 'Sign out anyway',
    /** After the email link: choosing the password finishes saving. */
    choosePasswordTitle: 'Choose a password',
    choosePasswordBody: 'Your email is confirmed. Pick a password to finish saving your passport.',
  },
  settings: {
    title: 'Settings',
    open: 'Settings',
    close: 'Close settings',
    applicationLabel: 'Your application',
    name: 'Name',
    nameLead: 'What ProcrastiNation calls you, on your passport and your Declarations. Only you see it.',
    saveName: 'Save name',
    nameFailed: 'Couldn’t save your name. Check your connection and try again.',
    purpose: 'Purpose of visit',
    purposeNote: 'Changing it doesn’t add or remove territories.',
    hours: 'Your hours',
    style: 'What stops you',
    tone: 'Nudge tone',
    notSet: 'Not set',
    startLabel: 'Start Mode',
    timer: 'Timer',
    timerLead: 'How long Start Mode runs for a task. A plan’s steps run for their estimate. Automatic follows what stops you.',
    automatic: (minutes: number) => `Automatic · ${minutes} min`,
    automaticChoice: 'Automatic',
    minutes: (n: number) => `${n} min`,
    dayLabel: 'Your day',
    dayEnds: 'Day ends at',
    dayLead: 'Anything you do before then still counts as the day before.',
    appearanceLabel: 'Appearance',
    theme: 'Theme',
    themeChoices: [
      { id: 'night', label: 'Night passport', hint: 'Navy, like the real thing.' },
      { id: 'day', label: 'Day passport', hint: 'Cream paper and ink.' },
      { id: 'system', label: 'Match my device', hint: 'Night or day, with your phone or computer.' },
    ] as { id: 'night' | 'day' | 'system'; label: string; hint: string }[],
    midnight: 'Midnight',
    hourAM: (h: number) => `${h} AM`,
    accountLabel: 'Account',
    username: 'Username',
    usernameNone: 'Choose one',
    usernameLead: 'Your name in the Nation. Others can see it.',
    saveUsername: 'Save username',
    usernameFailed: 'Couldn’t save your username. Check your connection and try again.',
    password: 'Password',
    passwordValue: 'Set or change',
    passwordLead: (min: number) => `Use it with your email to sign in on any device. At least ${min} characters.`,
    newPassword: 'New password',
    savePassword: 'Save password',
    savingPassword: 'Saving…',
    passwordSaved: 'Password saved. Use it with your email to sign in anywhere.',
    passwordFailed: 'Couldn’t save your password. Check your connection and try again.',
    /** Download your data: one JSON file of everything they keep here. */
    downloadData: 'Download your data',
    downloadValue: 'One file',
    preparingData: 'Putting your file together…',
    downloadFailed: 'Couldn’t make your file. Check your connection and try again.',
    /** Delete your passport (App Store 5.1.1(v)): kind, plain, no guilt. */
    deletePassport: 'Delete your passport',
    /** The site's pages, from Settings → Account. */
    privacyPolicy: 'Privacy policy',
    terms: 'Terms of use',
    deleteTitle: 'Delete your passport?',
    deleteBody: 'This deletes your account and everything in it: tasks and plans, notes, territories, stamps and settings. It can’t be undone.',
    deleteDownloadFirst: 'Download your data first',
    deleteTypeLabel: 'Type DELETE to confirm',
    deleteConfirm: 'Delete my passport',
    deleting: 'Deleting…',
    deleteFailed: 'Couldn’t delete your passport just now. Nothing was deleted. Check your connection and try again.',
    /** On Welcome, right after. */
    deleted: 'Your passport is deleted. Thanks for being part of the Nation.',
    done: 'Done',
    saveFailed: 'Couldn’t save that. Check your connection and try again.',
  },
  authErrors: {
    rateLimited: 'Too many tries. Give it a minute, then try again.',
    offline: 'Can’t reach the Nation right now. Check your connection and try again.',
    staleLink: 'That link has expired, or it was opened on a different device or browser. Request a fresh one.',
    generic: 'Something went wrong signing you in. Please try again.',
    wrongPassword: 'That email and password don’t match. Try again, or reset your password below.',
    unconfirmed: 'Confirm your email first: the link is in your inbox.',
    tooShort: (min: number) => `Use at least ${min} characters.`,
    samePassword: 'That’s already your password.',
    otherDevice:
      'That link was opened on a different device or browser. If you were confirming your email or saving your passport, that’s done: carry on where you started. Sign-in links only work where you asked for them.',
    accountExists: 'There’s already a passport for that email. Sign in, or reset your password.',
    invalidEmail: 'That email doesn’t look quite right.',
  },
} as const;

// ---------------------------------------------------------------------------
// How to use ProcrastiNation: the "?" beside search, and Settings → Help
// (docs/plans/shipped/how-to-use.md). Family testers found the nation's own
// words confusing, so this says them in everyday ones. Only what works today:
// a feature gets its line when it ships. Phrases follow the landing page's.

/** Something to type and what it does: "Essay due fri" → "Due Friday". */
export type GuideExample = { typed: string; means: string };
/** A paragraph, or a list of examples to type. */
export type GuideBlock = string | readonly GuideExample[];
export type GuideSection = { title: string; blocks: readonly GuideBlock[] };
/** Where the guide is read: the web says right-click and keyboard shortcuts; a Mac writes ⌘. */
export type GuideFor = { web: boolean; mac: boolean };

export const guide = {
  /** The "?" button's label, the Settings row and the page's title. */
  open: 'How to use ProcrastiNation',
  eyebrow: 'How to use',
  title: 'How to use ProcrastiNation',
  lead: 'ProcrastiNation breaks big things into steps small enough to begin, then nudges you when it’s time. No guilt, no lectures. Just the next small step.',
  close: 'Close',
  /** The Settings card holding the guide's row. */
  settingsLabel: 'Help',
  wordsLabel: 'Our words, in plain words',
  words: [
    { term: names.customs, meaning: 'Your inbox. Anything you capture with no day and no territory waits here until you give it a day or file it.' },
    { term: names.territories, meaning: 'Your areas, like a class, a job or home. Each keeps its own tasks and notes.' },
    { term: 'Task', meaning: 'One thing to do. It can have a start day (the day you’ll start it), a time, a due date and a repeat.' },
    { term: 'Plan', meaning: `A task that ${actions.planIt} has broken into steps. The steps live under their task, and Today shows the plan as one row.` },
    { term: 'Step', meaning: 'One piece of a plan. The first takes a few minutes; the rest, about one sitting each.' },
    { term: 'Note', meaning: voice.notes.lead },
    { term: actions.planIt, meaning: 'The AI button. It turns a big task into a plan.' },
    { term: 'Start Mode', meaning: 'One step and a timer. Starting is the win.' },
    { term: names.declaration, meaning: 'A start time you pick and sign. A reminder rings then.' },
    { term: names.morningBriefing, meaning: 'A minute to sort whatever carried over from before today.' },
    { term: names.passport, meaning: 'Your page: your stamps, your rank and the Declarations you kept. Settings open from it too.' },
    { term: names.stamps, meaning: 'Ink stamps for starting. Proof, on the days it doesn’t feel like it, that you’re moving.' },
  ],
  sections: ({ web, mac }: GuideFor): GuideSection[] => {
    const hold = web ? 'Right-click or press and hold' : 'Press and hold';
    return [
      {
        title: 'Capture anything',
        blocks: [
          `${web ? 'Click + or Capture' : 'Tap +'} and type it the way you’d say it. Days, times and repeats are read from the words:`,
          [
            { typed: 'Essay due fri', means: 'Due Friday' },
            { typed: 'Dentist tomorrow 3pm', means: 'Tomorrow, with a nudge at 3 PM' },
            { typed: 'Gym every mon and wed 6pm', means: 'Every Monday and Wednesday at 6 PM' },
            { typed: 'Lab report #chem', means: 'Filed in your Chem territory' },
          ],
          `No day in the words? Beside ${voice.capture.startRow}, pick the day you’ll start it: ${voice.briefing.today}, Tomorrow or a date. Or pick ${voice.task.later}, or just ${actions.add} it: it waits in ${names.customs}. A due date is optional (${voice.capture.addDue}). With one, PN picks a start day before it, which you can change. Switch to ${voice.capture.note} at the top for anything longer.`,
        ],
      },
      {
        title: 'Today and Upcoming',
        blocks: [
          `Today is what’s on for today, with your next small step at the top, ready to ${actions.start}. Anything still open from before today rolls forward kindly to today.`,
          'Upcoming shows the days ahead, with a calendar to jump to any day.',
        ],
      },
      {
        title: actions.planIt,
        blocks: [
          `${actions.planIt} sits beside ${actions.add} when you capture, beside ${actions.start} on a task’s page, and in a task’s menu, and it shows on rows that sound bigger than one sitting. It asks a question or two, then breaks the task into steps, the first just a few minutes long, spread out up to its due date.`,
          `Change, add or reorder any step, or ${voice.plan.replan}. Move a step to a later day and you’ll be asked whether the rest of the plan should move too. Repeating tasks don’t get plans.`,
        ],
      },
      {
        title: `Start Mode and “${voice.start.stuck}”`,
        blocks: [
          `${actions.start} opens Start Mode: one step and a timer that runs for the step’s estimate (a task on its own gets a short one). Stop when it ends, or keep going. Every start counts, finished or not.`,
          `Stuck? Choose ${voice.start.stuck}, pick what’s in the way, and you’ll get a two-minute way in. Or take a breather first. Settings → Start Mode sets how long a task’s timer runs.`,
        ],
      },
      {
        title: 'Declarations',
        blocks: [
          `On Today, choose “${voice.declaration.invite}” beside a task. Or open a task and choose ${voice.declaration.short}, or ${hold.toLowerCase()} it and choose ${voice.declaration.action}. Pick a day and a time, then sign.`,
          `${voice.declaration.why} Starting on time is a ${names.declaration} kept, recorded in your ${names.passport}.`,
        ],
      },
      {
        title: 'Times and reminders',
        blocks: [
          'Give a task a time and it rings then. The first time, you’ll be asked whether you want a nudge.',
          web
            ? `In a browser, reminders ring while the browser is open, with ${actions.startFive} and ${voice.reminders.snooze}. The iPhone app rings too.`
            : `Press and hold a reminder for ${actions.startFive}, ${voice.reminders.snooze} and ${actions.done}.`,
          `Settings has the reminders switch and your nudge tone: ${nudgeTones.diplomat.name}, ${nudgeTones.drill.name} or ${nudgeTones.roast.name}.`,
        ],
      },
      {
        title: 'Repeats',
        blocks: [
          'Type it:',
          [
            { typed: 'Stretch every day 7am', means: 'Every day at 7 AM' },
            { typed: 'Read every weekday', means: 'Monday to Friday' },
            { typed: 'Walk the dog every M/W/Sat', means: 'Mondays, Wednesdays and Saturdays' },
          ],
          `Or open the task and choose ${voice.task.repeat}: ${voice.task.pickDays} ticks the exact days, and ${voice.task.never} stops it. Check off a repeat and it comes back on its next day.`,
          `Upcoming shows each of its turns in the week ahead. The next one is the one to check off; later ones read “${voice.upcoming.previewLine('Mon')}” and open once the turn before is done.`,
        ],
      },
      {
        title: 'Changing a task',
        blocks: [
          `Open a task to change ${voice.task.start}, ${voice.task.due}, ${voice.task.repeat}, its territory, its estimate or its notes. To rename it, use the button beside its title, or just type over the title.`,
          `${hold} any task for ${actions.start}, ${voice.declaration.action}, ${actions.planIt}, ${voice.task.moveTo}, ${voice.task.renameItem} and ${voice.task.fileIn}, without opening it.`,
        ],
      },
      {
        title: 'Notes',
        blocks: [
          `Switch ${voice.capture.eyebrow} to ${voice.capture.note}, or open ${voice.notes.title} in ${names.territories}. A note’s first line is its title.`,
          web ? voice.notes.checklistHintWeb(mac ? '⌘⇧L' : 'Ctrl+Shift+L') : voice.notes.checklistHint,
          'Each checklist line is a real task: write a day on it, like “bring goggles fri”, and it shows up that day. Ticking it in the note or on your day ticks both.',
        ],
      },
      {
        title: `The ${names.morningBriefing}`,
        blocks: [
          `When something from before today is still open, a card on Today offers to sort it: ${voice.briefing.today}, ${voice.briefing.pickDay}, or ${voice.briefing.letGo}, which takes the date off and never deletes anything.`,
          'With ten or more, it suggests three for today and lets the rest wait.',
        ],
      },
      {
        title: `Your ${names.passport}`,
        blocks: [
          `Stamps land for your approved application, your first Declaration and your first start, and everything you finish in Start Mode (${voice.start.done}) adds to your count. Your rank grows with starts, not finishes, and the Declarations you kept are listed there too.`,
          'Settings opens from the top of your Passport: your name, nudge tone, Start Mode’s timer, when your day ends, Night or Day, and your account.',
        ],
      },
      {
        title: 'Search',
        blocks: [
          `The magnifier finds any task or note, finished ones too. Add #name to look in one territory.${web ? ` On a computer, ${mac ? '⌘K' : 'Ctrl+K'} or / opens it from anywhere.` : ''}`,
        ],
      },
    ];
  },
} as const;

// ---------------------------------------------------------------------------
// The nudge tone (asked in the Citizenship Application): the few lines that
// nudge. Diplomat is the everyday voice; Drill Sergeant is firm; Roast jokes
// about the task or the situation, never the person (shame feeds
// procrastination). Reminder titles stay the task's own words.

export interface ToneLines {
  /** Start Mode, under the timer. */
  startLead: (minutes: number) => string;
  /** When the timer ends. */
  contractTitle: (minutes: number) => string;
  contractBody: string;
  /** On Today after leaving Start Mode without Done. */
  leftNotice: string;
  /** The morning list notification. */
  morningTitle: (count: number) => string;
  startWith: (title: string) => string;
  /** The Morning Briefing, under its title: how many things carried over. */
  briefingLead: (count: number) => string;
  /** A long Morning Briefing (core's `LONG_BRIEFING`): three for today is plenty. */
  briefingPickLead: (count: number) => string;
  /** A declared start's reminder, above where the task lives. */
  declaredReminder: string;
}

export const toneLines: Record<NudgeTone, ToneLines> = {
  diplomat: {
    startLead: voice.start.lead,
    contractTitle: voice.start.contractTitle,
    contractBody: voice.start.contractBody,
    leftNotice: voice.start.leftNotice,
    morningTitle: voice.reminders.morningTitle,
    startWith: voice.reminders.startWith,
    briefingLead: (n) => (n === 1 ? 'One thing carried over. Where should it go?' : `${spell(n)} things carried over. Let’s give each one a place.`),
    briefingPickLead: (n) => `${spell(n)} things carried over. That’s a lot to carry, so pick up to three for today. The rest can wait.`,
    declaredReminder: 'Your declared start. Five minutes is enough to begin.',
  },
  drill: {
    startLead: (m) => `${capitalize(duration(m))}. One task. The timer’s running: begin.`,
    contractTitle: (m) => `${capitalize(duration(m))}. ${longTimer(m) ? 'Position held.' : 'Mission started.'}`,
    contractBody: 'Hard part done. Keep going, or stand down with a clean record.',
    leftNotice: 'You started. Logged.',
    morningTitle: (n) => (n === 1 ? 'One order today' : `${spell(n)} orders today`),
    startWith: (title) => `First up: “${title}”. Move.`,
    briefingLead: (n) => (n === 1 ? 'One item carried over. Assign it a day.' : `${spell(n)} items carried over. Assign each one a day.`),
    briefingPickLead: (n) => `${spell(n)} items carried over. Nobody clears that in a day. Pick three for today; the rest hold.`,
    declaredReminder: 'Declared start. It’s time. Move.',
  },
  roast: {
    startLead: (m) => `${longTimer(m) ? capitalize(duration(m)) : `Just ${duration(m)}`}. The task is more scared of you than you are of it.`,
    contractTitle: (m) => `${capitalize(duration(m))}. Who even are you?`,
    contractBody: 'Look at you, doing things. Keep going, or quit while you’re legendary.',
    leftNotice: 'You started. Frame it.',
    morningTitle: (n) => (n === 1 ? 'One thing today. Just one. Easy.' : `${spell(n)} things today. Bold of them.`),
    startWith: (title) => `“${title}” has been waiting very politely.`,
    briefingLead: (n) => (n === 1 ? 'One thing followed you here. Clingy.' : `${spell(n)} things followed you here. Clingy bunch.`),
    briefingPickLead: (n) => `${spell(n)} things followed you here. Nobody does ${spell(n).toLowerCase()} things in a day. Pick three.`,
    declaredReminder: 'You signed for this. In ink, basically.',
  },
};

/** The lines for their tone (Diplomat until they've picked one). */
export const linesFor = (tone?: NudgeTone | null): ToneLines => toneLines[tone ?? 'diplomat'];

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
