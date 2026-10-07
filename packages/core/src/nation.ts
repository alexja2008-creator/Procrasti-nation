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
    /** "What stops you: it feels too big": Today shows just the next step. */
    focusedSubtitle: 'Just this one for now. The rest can wait.',
    showEverything: (n: number) => `Show everything (${n} more)`,
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
  /** The Citizenship Application (first-run onboarding). */
  application: {
    eyebrow: 'Citizenship Application',
    page: (n: number, of: number) => `Page ${n} of ${of}`,
    welcomeTitle: 'Welcome to the nation.',
    welcomeBody: 'A few quick questions so ProcrastiNation fits how you work. About a minute and a half, and you can change any answer later in Settings.',
    reserved: (citizenNo: string) => `Citizen No. ${citizenNo} is reserved for you.`,
    begin: 'Begin',
    skip: 'Skip for now',
    back: 'Back',
    next: 'Continue',
    pickOne: 'Pick the closest. You can change it later.',
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
      { id: 'night', label: 'Night owl', hint: 'Late nights. Your day ends at 3 AM, so they still count as today.' },
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
    /** The Oath: one real thing, planned live. */
    oathTitle: 'One thing you’ve been putting off',
    oathLead: 'Everyone has one. Name it, and we’ll make it smaller together.',
    oathPlaceholder: 'Write my history essay',
    oathHint: 'A date in it counts too: “history essay due fri”.',
    dueLabel: 'When is it due?',
    dues: [
      { id: 'today', label: 'Today' },
      { id: 'tomorrow', label: 'Tomorrow' },
      { id: 'week', label: 'In a week' },
      { id: 'none', label: 'No date' },
    ],
    notNow: 'Not now',
    /** Back from Plan it without a plan. */
    oathAgain: 'No plan yet. Try Plan it again, or come back to it from Today.',
    approvedTitle: (firstName?: string | null) => (firstName ? `Welcome, ${firstName}.` : 'Welcome, citizen.'),
    approvedBody: (citizenNo: string) => `Citizen No. ${citizenNo}. Your passport is ready, and Today is waiting.`,
    approvedBodyOath: (citizenNo: string) => `Citizen No. ${citizenNo}. Your first small step is waiting on Today.`,
    approvedStamp: ['CITIZEN', 'APPROVED'] as const,
    goToToday: 'Go to Today',
    saveFailed: 'Couldn’t save that. Check your connection and try again.',
  },
  settings: {
    title: 'Settings',
    open: 'Settings',
    close: 'Close settings',
    applicationLabel: 'Your application',
    purpose: 'Purpose of visit',
    purposeNote: 'Changing it doesn’t add or remove territories.',
    hours: 'Your hours',
    style: 'What stops you',
    tone: 'Nudge tone',
    notSet: 'Not set',
    startLabel: 'Start Mode',
    timer: 'Timer',
    timerLead: 'How long Start Mode’s first stretch lasts. Automatic follows what stops you.',
    automatic: (minutes: number) => `Automatic · ${minutes} min`,
    automaticChoice: 'Automatic',
    minutes: (n: number) => `${n} min`,
    dayLabel: 'Your day',
    dayEnds: 'Day ends at',
    dayLead: 'Anything you do before then still counts as the day before.',
    midnight: 'Midnight',
    hourAM: (h: number) => `${h} AM`,
    accountLabel: 'Account',
    saveFailed: 'Couldn’t save that. Check your connection and try again.',
  },
  authErrors: {
    rateLimited: 'Too many tries. Give it a minute, then try again.',
    offline: 'Can’t reach the Nation right now. Check your connection and try again.',
    staleLink: 'That link has expired, or it was opened on a different device or browser. Request a fresh one.',
    generic: 'Something went wrong signing you in. Please try again.',
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
}

export const toneLines: Record<NudgeTone, ToneLines> = {
  diplomat: {
    startLead: voice.start.lead,
    contractTitle: voice.start.contractTitle,
    contractBody: voice.start.contractBody,
    leftNotice: voice.start.leftNotice,
    morningTitle: voice.reminders.morningTitle,
    startWith: voice.reminders.startWith,
  },
  drill: {
    startLead: (m) => `${capitalize(minutesWord(m))} minutes. One task. The timer’s running: begin.`,
    contractTitle: (m) => `${capitalize(minutesWord(m))} minutes. Mission started.`,
    contractBody: 'Hard part done. Keep going, or stand down with a clean record.',
    leftNotice: 'You started. Logged.',
    morningTitle: (n) => (n === 1 ? 'One order today' : `${spell(n)} orders today`),
    startWith: (title) => `First up: “${title}”. Move.`,
  },
  roast: {
    startLead: (m) => `Just ${minutesWord(m)} minutes. The task is more scared of you than you are of it.`,
    contractTitle: (m) => `${capitalize(minutesWord(m))} minutes. Who even are you?`,
    contractBody: 'Look at you, doing things. Keep going, or quit while you’re legendary.',
    leftNotice: 'You started. Frame it.',
    morningTitle: (n) => (n === 1 ? 'One thing today. Just one. Easy.' : `${spell(n)} things today. Bold of them.`),
    startWith: (title) => `“${title}” has been waiting very politely.`,
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
