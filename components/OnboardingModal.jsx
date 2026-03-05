'use client';

import { useState } from 'react';
import { useTheme } from '../app/providers';

const QUESTIONS = [
  {
    key: 'userType',
    q: 'What best describes you?',
    opts: [
      ['student', 'Student'],
      ['professional', 'Young Professional'],
      ['freelancer', 'Freelancer'],
      ['other', 'Other'],
    ],
  },
  {
    key: 'adhdLevel',
    q: 'Do you experience ADHD or focus challenges?',
    opts: [
      ['often', 'Yes, often'],
      ['sometimes', 'Sometimes'],
      ['rarely', 'Rarely'],
    ],
  },
  {
    key: 'workStyle',
    q: 'How do you work best?',
    opts: [
      ['bursts', 'Short bursts (25 min)'],
      ['long', 'Longer focused sessions'],
      ['varies', 'It varies'],
    ],
  },
  {
    key: 'primaryGoal',
    q: "What's your #1 goal here?",
    opts: [
      ['academic', 'Finish academic assignments'],
      ['work', 'Hit work deadlines'],
      ['habits', 'Build personal habits'],
    ],
  },
];

export default function OnboardingModal({ onSave, onSkip, initialProfile = null }) {
  const { darkMode } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState(
    initialProfile
      ? {
          userType: initialProfile.userType,
          adhdLevel: initialProfile.adhdLevel,
          workStyle: initialProfile.workStyle,
          primaryGoal: initialProfile.primaryGoal,
        }
      : {}
  );
  const [advancing, setAdvancing] = useState(false);

  const question = QUESTIONS[currentStep];
  const isLast = currentStep === QUESTIONS.length - 1;

  const handleSelect = (value) => {
    const newAnswers = { ...answers, [question.key]: value };
    setAnswers(newAnswers);

    if (!isLast) {
      setAdvancing(true);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        setAdvancing(false);
      }, 300);
    }
  };

  const handleSave = () => {
    onSave({
      ...answers,
      completedAt: new Date().toISOString().split('T')[0],
    });
  };

  const allAnswered = QUESTIONS.every((q) => answers[q.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
          darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 pt-8 pb-6">
          <p className="text-white/80 font-semibold text-sm uppercase tracking-wide mb-1">
            Quick setup · {currentStep + 1} of {QUESTIONS.length}
          </p>
          <h2 className="text-white text-2xl font-bold leading-snug">
            {question.q}
          </h2>

          {/* Progress dots */}
          <div className="flex space-x-2 mt-4">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < currentStep
                    ? 'bg-white w-6'
                    : i === currentStep
                    ? 'bg-white w-10'
                    : 'bg-white/40 w-4'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Options */}
        <div className={`px-8 py-6 ${advancing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="space-y-3">
            {question.opts.map(([value, label]) => {
              const selected = answers[question.key] === value;
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(value)}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border-2 font-medium transition-all ${
                    selected
                      ? darkMode
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : darkMode
                      ? 'border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-6">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className={`text-sm font-medium transition-colors ${
                  darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ← Back
              </button>
            ) : (
              <button
                onClick={onSkip}
                className={`text-sm transition-colors ${
                  darkMode ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                I'll do this later
              </button>
            )}

            {isLast && (
              <button
                onClick={handleSave}
                disabled={!allAnswered}
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  allAnswered
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : darkMode
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Let's go!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
