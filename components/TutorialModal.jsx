'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../app/providers';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { X, ArrowRight } from 'lucide-react';

// ── Quiz questions ────────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    question: 'When you procrastinate, what\'s usually going on?',
    options: [
      { label: 'I dread the task itself', type: 'avoider' },
      { label: 'I want it to be perfect before I start', type: 'perfectionist' },
      { label: 'It just feels like too much', type: 'overwhelmed' },
      { label: 'It\'s boring and I\'d rather do anything else', type: 'boredom' },
    ],
  },
  {
    question: 'You have a big assignment due Friday. It\'s Wednesday. What do you do?',
    options: [
      { label: 'Find other "urgent" things to do instead', type: 'avoider' },
      { label: 'Research endlessly before writing a word', type: 'perfectionist' },
      { label: 'Stare at it and feel paralyzed', type: 'overwhelmed' },
      { label: 'Do the fun parts and skip the rest', type: 'boredom' },
    ],
  },
  {
    question: 'You finally sit down to work. What derails you first?',
    options: [
      { label: 'Anxiety about whether I can actually do it', type: 'avoider' },
      { label: 'Tweaking the first sentence for 20 minutes', type: 'perfectionist' },
      { label: 'Realizing how many parts there are and shutting down', type: 'overwhelmed' },
      { label: 'Checking my phone because the task is dry', type: 'boredom' },
    ],
  },
  {
    question: 'A friend asks how your big project is going. What do you say?',
    options: [
      { label: 'I haven\'t looked at it yet, honestly', type: 'avoider' },
      { label: 'I\'ve been planning it — I want to get the approach right', type: 'perfectionist' },
      { label: 'I don\'t even know where to start', type: 'overwhelmed' },
      { label: 'I\'ve been doing other stuff — I\'ll get to it', type: 'boredom' },
    ],
  },
  {
    question: 'What would help you most right now?',
    options: [
      { label: 'Just getting started, no matter how small', type: 'avoider' },
      { label: 'Permission to do it imperfectly', type: 'perfectionist' },
      { label: 'Someone to break it into tiny pieces', type: 'overwhelmed' },
      { label: 'Making boring tasks more engaging', type: 'boredom' },
    ],
  },
];

const TYPE_LABELS = {
  avoider: { label: 'The Avoider', emoji: '🙈', tagline: 'You dodge tasks that feel threatening. ProcrastiNation will help you take the smallest possible first step.' },
  perfectionist: { label: 'The Perfectionist', emoji: '✨', tagline: 'You wait for the perfect moment or plan. ProcrastiNation will give you permission to start messy.' },
  overwhelmed: { label: 'The Overwhelmed', emoji: '🌊', tagline: 'Everything feels too big. ProcrastiNation will break it down until each step feels manageable.' },
  boredom: { label: 'The Boredom-Prone', emoji: '😴', tagline: 'Boring tasks get pushed aside. ProcrastiNation will add variety and momentum to keep you moving.' },
};

function classifyQuizAnswers(answers) {
  const tally = { avoider: 0, perfectionist: 0, overwhelmed: 0, boredom: 0 };
  answers.forEach((type) => { tally[type] = (tally[type] || 0) + 1; });
  // Tie-break order: overwhelmed > perfectionist > avoider > boredom
  const priority = ['overwhelmed', 'perfectionist', 'avoider', 'boredom'];
  let winner = priority[0];
  for (const t of priority) {
    if (tally[t] > tally[winner]) winner = t;
  }
  return winner;
}

// ── Tutorial steps (quiz steps 0-6, then feature tour 7-13) ──────────────────
const STEPS = [
  {
    // 0 — Welcome + quiz intro
    page: null,
    icon: '🎉',
    title: 'Welcome to ProcrastiNation!',
    body: "You've just joined a community that turns procrastination into productivity. Before we tour the app, let's figure out your procrastination style — it takes 30 seconds and helps the AI tailor plans just for you.",
    pill: null,
    pillCta: null,
    ctaLabel: "Let's find my style →",
    isQuiz: false,
  },
  // 1-5: Quiz questions (rendered dynamically via isQuiz flag)
  ...QUIZ_QUESTIONS.map((q, i) => ({
    page: null,
    icon: `${i + 1}/5`,
    title: q.question,
    body: null,
    pill: null,
    pillCta: null,
    ctaLabel: null,
    isQuiz: true,
    quizIndex: i,
  })),
  {
    // 6 — Quiz result
    page: null,
    icon: null, // set dynamically
    title: null, // set dynamically
    body: null, // set dynamically
    pill: null,
    pillCta: null,
    ctaLabel: 'Got it — show me the Planner →',
    isQuizResult: true,
  },
  {
    // 7 — Planner
    page: '/planner',
    icon: '🧠',
    title: 'The AI Planner',
    body: "This is the heart of ProcrastiNation. We've already created a sample task so you can explore. You can edit any step with the pencil icon, add new steps, drag to reorder, and set tasks to repeat on a daily, weekly, or monthly schedule.",
    pill: "👆 Explore the Planner and check out the sample task. Click Continue when ready.",
    pillCta: 'Continue →',
    ctaLabel: 'Got it — take me to the Dashboard →',
  },
  {
    // 8 — Dashboard
    page: '/dashboard',
    icon: '📊',
    title: 'Your Dashboard',
    body: 'Here you can see your streak, completed tasks, and everything in progress. Your sample task is already here. Try creating a board called "example" and dragging the task into it.',
    pill: '👆 Create a board called "example" and drag the sample task into it. Click Continue when done.',
    pillCta: 'Continue →',
    ctaLabel: 'Nice — now show me the Calendar →',
  },
  {
    // 9 — Calendar
    page: '/calendar',
    icon: '📅',
    title: 'The Calendar',
    body: 'Your task steps are automatically scheduled here. Click any event chip to see the step details and edit its date — great for shuffling things around when life happens.',
    pill: '👆 Explore the Calendar — click an event to see details and try editing a date. Click Continue when done.',
    pillCta: 'Continue →',
    ctaLabel: 'Got it — back to Dashboard to clean up →',
  },
  {
    // 10 — Cleanup (back on /dashboard — different step, needs fresh modal)
    page: '/dashboard',
    icon: '🗑️',
    title: 'Keeping Things Clean',
    body: "Now delete the sample task to keep your workspace tidy. Open it from the list below and hit Delete. We'll celebrate when you do!",
    pill: "🗑️ Delete the [Tutorial] task from the dashboard. Click Continue when done!",
    pillCta: 'Done — celebrate! →',
    ctaLabel: 'Done — show me Focus Pods →',
  },
  {
    // 11 — Focus Pods
    page: '/focus-pods',
    icon: '👥',
    title: 'Focus Pods',
    body: "Struggling to stay focused? Join a Focus Pod — virtual co-working rooms where you work alongside other citizens. Just knowing someone else is working too is surprisingly powerful.",
    pill: '👆 Have a look around Focus Pods. Click Continue when ready.',
    pillCta: 'Continue →',
    ctaLabel: 'Cool — show me Recovery Mode →',
  },
  {
    // 12 — Recovery Mode
    page: '/reset-station',
    icon: '🧘',
    title: 'Recovery Mode',
    body: "Feeling overwhelmed or stuck? Recovery Mode has short breathwork and meditation videos to help you recover and come back stronger.",
    pill: '👆 Explore Recovery Mode. Click Continue when ready.',
    pillCta: 'Continue →',
    ctaLabel: "All done — let's start planning →",
  },
  {
    // 13 — Final
    page: '/planner',
    icon: '🏁',
    title: 'Citizenship granted.',
    body: "You've seen every tool in the arsenal. The only thing standing between you and productivity is that first task. Time to declare independence from procrastination.",
    pill: null,
    pillCta: null,
    ctaLabel: 'Declare independence →',
    isFinal: true,
  },
];

const LS_STEP = 'tutorial-step';
const LS_TASK = 'tutorial-task-id';
const lsModalKey = (s) => `tutorial-modal-shown-${s}`;

// ── Public helpers used by Navigation.jsx ──────────────────────────────────
export function initTutorial() {
  localStorage.setItem(LS_STEP, '0');
  localStorage.removeItem(LS_TASK);
  // Clear all modal-shown flags
  for (let i = 0; i < STEPS.length; i++) localStorage.removeItem(lsModalKey(i));
}

export function clearTutorial() {
  localStorage.removeItem(LS_STEP);
  localStorage.removeItem(LS_TASK);
  for (let i = 0; i < STEPS.length; i++) localStorage.removeItem(lsModalKey(i));
}

export function getTutorialStep() {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(LS_STEP);
  return v !== null ? parseInt(v, 10) : null;
}

// Write step synchronously so it's ready before the next page mounts
function saveStep(s) {
  localStorage.setItem(LS_STEP, String(s));
}

// ── Component ──────────────────────────────────────────────────────────────
export default function TutorialOverlay({ user, router, onComplete }) {
  const { darkMode } = useTheme();
  const pathname = usePathname();

  const [step, setStepState] = useState(() => {
    const saved = getTutorialStep();
    return saved !== null && saved < STEPS.length ? saved : null;
  });
  const [showModal, setShowModal] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const [showNiceJob, setShowNiceJob] = useState(false);
  const [creating, setCreating] = useState(false);
  const [taskCreated, setTaskCreated] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(LS_TASK)
  );

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);

  // Sync setter — writes to localStorage immediately
  const setStep = useCallback((s) => {
    saveStep(s);
    setStepState(s);
  }, []);

  // Decide what to show whenever step or pathname changes
  useEffect(() => {
    if (step === null) return;
    const current = STEPS[step];

    // Steps 0-6 (quiz flow): always show modal regardless of page
    if (current.page === null) {
      setShowModal(true);
      setShowPill(false);
      return;
    }

    if (pathname === current.page) {
      const alreadyShown = localStorage.getItem(lsModalKey(step));
      if (!alreadyShown) {
        localStorage.setItem(lsModalKey(step), '1');
        setShowModal(true);
        setShowPill(false);
      } else if (current.pill) {
        setShowModal(false);
        setShowPill(true);
      }
    } else {
      setShowModal(false);
      setShowPill(false);
    }
  }, [step, pathname]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createExampleTask = useCallback(async () => {
    if (taskCreated || creating || !user) return;
    setCreating(true);

    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
    const dueDate = new Date(today); dueDate.setDate(today.getDate() + 7);

    const toDateStr = (d) => d.toISOString().split('T')[0];

    const sampleSteps = [
      { id: 1, title: 'Review your week', description: 'Look at what you have coming up and note any deadlines.', estimatedTime: '10 min', when: 'Today', completed: false },
      { id: 2, title: 'Prioritise 3 tasks', description: 'Pick the 3 most important things to tackle. Write them down.', estimatedTime: '5 min', when: 'Tomorrow', completed: false },
      { id: 3, title: 'Block time in your calendar', description: 'Schedule focused work sessions for each of your top 3 tasks.', estimatedTime: '10 min', when: 'Day after tomorrow', completed: false },
    ];

    const stepDates = {
      '1': toDateStr(today),
      '2': toDateStr(tomorrow),
      '3': toDateStr(dayAfter),
    };

    const { data } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: 'Plan your week',
      description: 'This sample task was created during onboarding. Feel free to delete it.',
      status: 'in_progress',
      steps: sampleSteps,
      completed_steps: 0,
      total_steps: 3,
      start_time: new Date().toISOString(),
      due_date: dueDate.toISOString(),
      step_dates: stepDates,
    }).select('id').single();
    if (data?.id) localStorage.setItem(LS_TASK, data.id);
    setTaskCreated(true);
    setCreating(false);
  }, [taskCreated, creating, user]);

  const finish = useCallback(async () => {
    await supabase.auth.updateUser({ data: { onboarding_seen: true } });
    clearTutorial();
    setStepState(null);
    setShowModal(false);
    setShowPill(false);
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(async () => {
    await supabase.auth.updateUser({ data: { onboarding_seen: true } });
    clearTutorial();
    setStepState(null);
    setShowModal(false);
    setShowPill(false);
    onComplete?.();
  }, [onComplete]);

  const goToNextStep = useCallback((nextStep) => {
    localStorage.removeItem(lsModalKey(nextStep));
    setStep(nextStep);
    setShowModal(false);
    setShowPill(false);
    if (STEPS[nextStep].page) {
      router.push(STEPS[nextStep].page);
    }
  }, [setStep, router]);

  // Handle quiz answer selection
  const handleQuizAnswer = useCallback((type) => {
    const newAnswers = [...quizAnswers, type];
    setQuizAnswers(newAnswers);

    if (newAnswers.length >= QUIZ_QUESTIONS.length) {
      // All questions answered — classify and move to result step
      const result = classifyQuizAnswers(newAnswers);
      setQuizResult(result);
      // Store in user_metadata
      supabase.auth.updateUser({ data: { procrastination_type: result } });
      setStep(6); // result step
    } else {
      // Move to next question
      setStep(step + 1);
    }
  }, [quizAnswers, step, setStep]);

  // Modal primary CTA
  const handleModalCta = useCallback(async () => {
    if (step === null) return;
    const current = STEPS[step];

    // Welcome step (0): advance to first quiz question
    if (step === 0) {
      setStep(1);
      return;
    }

    // Quiz result step (6): create example task and start the feature tour
    if (current.isQuizResult) {
      await createExampleTask();
      goToNextStep(7);
      return;
    }

    if (current.isFinal) {
      await finish();
      router.push('/planner');
      return;
    }

    goToNextStep(step + 1);
  }, [step, createExampleTask, goToNextStep, finish, router, setStep]);

  // "Explore first" — dismiss modal, show pill instead
  const handleExploreFirst = useCallback(() => {
    if (step === null) return;
    setShowModal(false);
    if (STEPS[step].pill) setShowPill(true);
  }, [step]);

  // Pill Continue
  const handlePillContinue = useCallback(() => {
    if (step === null) return;

    if (step === 10) {
      // Cleanup step — show celebration before advancing
      setShowNiceJob(true);
      setShowPill(false);
      setTimeout(() => {
        setShowNiceJob(false);
        goToNextStep(11);
      }, 2000);
      return;
    }

    goToNextStep(step + 1);
  }, [step, goToNextStep]);

  if (step === null) return null;
  const current = STEPS[step];

  // Compute dynamic quiz result content
  const resultInfo = quizResult ? TYPE_LABELS[quizResult] : null;

  return (
    <>
      {/* ── Full blocking modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 pt-8 pb-6">
              <div className="flex items-center justify-center space-x-1.5 mb-5">
                {STEPS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all ${
                    i === step ? 'w-4 h-2 bg-white' : i < step ? 'w-2 h-2 bg-white/70' : 'w-2 h-2 bg-white/30'
                  }`} />
                ))}
              </div>
              <div className="text-4xl mb-3 text-center">
                {current.isQuizResult && resultInfo ? resultInfo.emoji : current.icon}
              </div>
              <h2 className="text-2xl font-bold text-white text-center">
                {current.isQuizResult && resultInfo
                  ? `You're ${resultInfo.label}!`
                  : current.title}
              </h2>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              {/* Quiz question — show answer buttons */}
              {current.isQuiz ? (
                <div className="space-y-3">
                  {QUIZ_QUESTIONS[current.quizIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(opt.type)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium transition-all hover:scale-[1.02] ${
                        darkMode
                          ? 'border-slate-600 hover:border-emerald-500 hover:bg-emerald-900/20 text-slate-200'
                          : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <p className={`text-base leading-relaxed mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {current.isQuizResult && resultInfo
                      ? resultInfo.tagline
                      : current.body}
                  </p>

                  {current.pill ? (
                    <>
                      <button
                        onClick={handleExploreFirst}
                        disabled={creating}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/20"
                      >
                        {creating ? 'Setting up your sample task...' : 'Explore this page ↓'}
                      </button>
                      <button
                        onClick={handleModalCta}
                        className={`mt-3 w-full text-sm text-center transition-colors ${
                          darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {current.ctaLabel}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleModalCta}
                      disabled={creating}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/20"
                    >
                      {creating ? 'Setting up your sample task...' : current.ctaLabel}
                    </button>
                  )}
                </>
              )}

              <button
                onClick={skip}
                className={`mt-2 w-full text-sm text-center transition-colors ${
                  darkMode ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'
                }`}
              >
                Skip tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating pill ── */}
      {showPill && current.pill && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-lg"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
        >
          <p className="text-white text-sm font-medium flex-1">{current.pill}</p>
          {current.pillCta && (
            <button
              onClick={handlePillContinue}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {current.pillCta} <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={skip} className="text-white/50 hover:text-white/80 transition-colors ml-1" title="Skip tour">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Nice job! celebration ── */}
      {showNiceJob && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div className="text-center">
            <div className="text-7xl mb-4">🎉</div>
            <p className="text-4xl font-bold text-emerald-400">Nice job!</p>
          </div>
        </div>
      )}
    </>
  );
}
