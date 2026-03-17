'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../app/providers';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { X, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    // 0 — Welcome (shown immediately on signup, any page)
    page: null,
    icon: '🎉',
    title: 'Welcome to ProcrastiNation!',
    body: "You've just joined a community that turns procrastination into productivity. Let's take a 2-minute tour so you know exactly how to use every tool.",
    pill: null,
    pillCta: null,
    ctaLabel: "Let's go — show me the Planner →",
  },
  {
    // 1 — Planner
    page: '/planner',
    icon: '🧠',
    title: 'The AI Planner',
    body: "This is the heart of ProcrastiNation. We've already created a sample task so you can explore. You can edit any step with the pencil icon, add new steps, drag to reorder, and set tasks to repeat on a daily, weekly, or monthly schedule.",
    pill: "👆 Explore the Planner and check out the sample task. Click Continue when ready.",
    pillCta: 'Continue →',
    ctaLabel: 'Got it — take me to the Dashboard →',
  },
  {
    // 2 — Dashboard
    page: '/dashboard',
    icon: '📊',
    title: 'Your Dashboard',
    body: 'Here you can see your streak, completed tasks, and everything in progress. Your sample task is already here. Try creating a board called "example" and dragging the task into it.',
    pill: '👆 Create a board called "example" and drag the sample task into it. Click Continue when done.',
    pillCta: 'Continue →',
    ctaLabel: 'Nice — now show me the Calendar →',
  },
  {
    // 3 — Calendar
    page: '/calendar',
    icon: '📅',
    title: 'The Calendar',
    body: 'Your task steps are automatically scheduled here. Click any event chip to see the step details and edit its date — great for shuffling things around when life happens.',
    pill: '👆 Explore the Calendar — click an event to see details and try editing a date. Click Continue when done.',
    pillCta: 'Continue →',
    ctaLabel: 'Got it — back to Dashboard to clean up →',
  },
  {
    // 4 — Cleanup (back on /dashboard — different step, needs fresh modal)
    page: '/dashboard',
    icon: '🗑️',
    title: 'Keeping Things Clean',
    body: "Now delete the sample task to keep your workspace tidy. Open it from the list below and hit Delete. We'll celebrate when you do!",
    pill: "🗑️ Delete the [Tutorial] task from the dashboard. Click Continue when done!",
    pillCta: 'Done — celebrate! →',
    ctaLabel: 'Done — show me Focus Pods →',
  },
  {
    // 5 — Focus Pods
    page: '/focus-pods',
    icon: '👥',
    title: 'Focus Pods',
    body: "Struggling to stay focused? Join a Focus Pod — virtual co-working rooms where you work alongside other citizens. Just knowing someone else is working too is surprisingly powerful.",
    pill: '👆 Have a look around Focus Pods. Click Continue when ready.',
    pillCta: 'Continue →',
    ctaLabel: 'Cool — show me the Reset Station →',
  },
  {
    // 6 — Reset Station
    page: '/reset-station',
    icon: '🧘',
    title: 'Reset Station',
    body: "Feeling overwhelmed or stuck? The Reset Station has short breathwork and meditation videos to help you recenter and come back stronger.",
    pill: '👆 Explore the Reset Station. Click Continue when ready.',
    pillCta: 'Continue →',
    ctaLabel: "All done — let's start planning →",
  },
  {
    // 7 — Final
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

  // Initialise step synchronously from localStorage so the very first render
  // already has the correct value — avoids the null→step flash that caused the
  // visibility effect to misfire after Navigation remounts on page transitions.
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

  // Sync setter — writes to localStorage immediately
  const setStep = useCallback((s) => {
    saveStep(s);
    setStepState(s);
  }, []);

  // Decide what to show whenever step or pathname changes
  useEffect(() => {
    if (step === null) return;
    const current = STEPS[step];
    // Step 0: always show the welcome modal regardless of page
    if (step === 0) {
      setShowModal(true);
      setShowPill(false);
      return;
    }

    if (pathname === current.page) {
      const alreadyShown = localStorage.getItem(lsModalKey(step));
      if (!alreadyShown) {
        // First arrival on this step's page — show full modal and mark it shown
        localStorage.setItem(lsModalKey(step), '1');
        setShowModal(true);
        setShowPill(false);
      } else if (current.pill) {
        // Modal already seen — show the exploration pill
        setShowModal(false);
        setShowPill(true);
      }
      // Steps without a pill (e.g. the final step) keep whatever visibility
      // state they already have — avoids StrictMode double-fire undoing the modal.
    } else {
      // User is on a different page — hide everything silently
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

    // Pre-compute step_dates so calendar populates immediately without AI resolution
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

  // Navigate to next step's page — pre-clear the modal-shown flag for the
  // incoming step so its intro modal always fires fresh on arrival
  const goToNextStep = useCallback((nextStep) => {
    // Pre-clear the shown flag for the step we're about to land on
    // (handles the dashboard step 2 → step 4 same-page revisit)
    localStorage.removeItem(lsModalKey(nextStep));
    setStep(nextStep);           // writes to localStorage synchronously
    setShowModal(false);
    setShowPill(false);
    router.push(STEPS[nextStep].page);
  }, [setStep, router]);

  // Modal primary CTA
  const handleModalCta = useCallback(async () => {
    if (step === null) return;
    const current = STEPS[step];

    if (step === 0) {
      await createExampleTask();
      goToNextStep(1);
      return;
    }

    if (current.isFinal) {
      await finish();
      router.push('/planner');
      return;
    }

    goToNextStep(step + 1);
  }, [step, createExampleTask, goToNextStep, finish, router]);

  // "Explore first" — dismiss modal, show pill instead
  const handleExploreFirst = useCallback(() => {
    if (step === null) return;
    setShowModal(false);
    if (STEPS[step].pill) setShowPill(true);
  }, [step]);

  // Pill Continue
  const handlePillContinue = useCallback(() => {
    if (step === null) return;

    if (step === 4) {
      // Cleanup step — show celebration before advancing
      setShowNiceJob(true);
      setShowPill(false);
      setTimeout(() => {
        setShowNiceJob(false);
        goToNextStep(5);
      }, 2000);
      return;
    }

    goToNextStep(step + 1);
  }, [step, goToNextStep]);

  if (step === null) return null;
  const current = STEPS[step];

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
              <div className="text-4xl mb-3 text-center">{current.icon}</div>
              <h2 className="text-2xl font-bold text-white text-center">{current.title}</h2>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              <p className={`text-base leading-relaxed mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {current.body}
              </p>

              {current.pill ? (
                <>
                  {/* Primary: dismiss modal and let the user explore */}
                  <button
                    onClick={handleExploreFirst}
                    disabled={creating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/20"
                  >
                    {creating ? 'Setting up your sample task...' : 'Explore this page ↓'}
                  </button>
                  {/* Secondary: skip straight to the next step */}
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
