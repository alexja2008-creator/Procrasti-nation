'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Brain, Zap, Users, BarChart3, Sparkles, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { useTheme, useAuth } from './providers';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import AuthModal from '../components/AuthModal';
import Logo from '../components/Logo';

export default function LandingPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Inline planner state (logged-in hero)
  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [clarificationNeeded, setClarificationNeeded] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});

  const handleCTA = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const generatePlan = async () => {
    if (!task || !deadline) return;
    setPlanLoading(true);
    setPlanError('');
    try {
      // Step 1: check if clarification is needed (only on first call)
      if (!clarificationNeeded) {
        const clarRes = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, deadline, checkClarification: true }),
        });
        const clarData = await clarRes.json();
        if (!clarRes.ok) throw new Error(clarData.error || 'Failed to check clarification');
        if (clarData.needsClarification) {
          setClarificationQuestions(clarData.questions);
          setClarificationNeeded(true);
          setPlanLoading(false);
          return;
        }
      }

      // Step 2: generate the full plan (with any clarification answers)
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, deadline, clarificationAnswers, clarificationQuestions, checkClarification: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
      setPlan(data.plan);
      setCompletedSteps(new Set());
      setCurrentTaskId(null);
      setClarificationNeeded(false);
      setClarificationQuestions([]);
      setClarificationAnswers({});

      // Save to Supabase so it appears in the dashboard
      if (user) {
        const { data: saved } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: data.plan.taskTitle,
          description: data.plan.analysis,
          status: 'in_progress',
          steps: data.plan.steps,
          completed_steps: 0,
          total_steps: data.plan.steps.length,
          start_time: new Date().toISOString(),
        }).select().single();
        if (saved) setCurrentTaskId(saved.id);
      }
    } catch (err) {
      setPlanError(err.message);
    }
    setPlanLoading(false);
  };

  const toggleStep = async (stepId) => {
    const next = new Set(completedSteps);
    next.has(stepId) ? next.delete(stepId) : next.add(stepId);
    setCompletedSteps(next);

    // Persist step completion to Supabase
    if (user && currentTaskId && plan) {
      const updatedSteps = plan.steps.map(s => ({ ...s, completed: next.has(s.id) }));
      const isFullyComplete = next.size === plan.steps.length;
      await supabase.from('tasks').update({
        steps: updatedSteps,
        completed_steps: next.size,
        status: isFullyComplete ? 'completed' : 'in_progress',
        completed_at: isFullyComplete ? new Date().toISOString() : null,
      }).eq('id', currentTaskId);
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Hero Section */}
      {user ? (
        /* Logged-in: inline AI planner */
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-20">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Brain className="w-4 h-4" />
              <span>AI-Powered Planning</span>
            </div>
            <h1 className={`text-4xl md:text-5xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Welcome back. What are we tackling today?
            </h1>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Drop in a task and a deadline — AI will break it down for you instantly.
            </p>
          </div>

          <div className={`rounded-2xl p-8 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {!plan ? (
              clarificationNeeded ? (
                /* Clarification questions */
                <>
                  {planError && (
                    <div className="mb-4 p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-700 text-sm">{planError}</div>
                  )}
                  <div className="mb-6">
                    <h2 className={`text-xl font-bold mb-1 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      <Brain className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Just a few quick questions...</span>
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Help me create a better plan for you!</p>
                  </div>
                  <div className="space-y-4">
                    {clarificationQuestions.map((question, index) => (
                      <div key={index}>
                        <label className={`block font-semibold mb-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{question}</label>
                        <input
                          type="text"
                          value={clarificationAnswers[index] || ''}
                          onChange={(e) => setClarificationAnswers({ ...clarificationAnswers, [index]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && !planLoading && generatePlan()}
                          placeholder="Your answer..."
                          className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                            darkMode
                              ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                          }`}
                          disabled={planLoading}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => { setClarificationNeeded(false); setClarificationQuestions([]); setClarificationAnswers({}); }}
                      disabled={planLoading}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={generatePlan}
                      disabled={planLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2"
                    >
                      {planLoading ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /><span>Generating...</span></>
                      ) : (
                        <><Zap className="w-5 h-5" /><span>Generate My Plan</span></>
                      )}
                    </button>
                  </div>
                </>
              ) : (
              /* Task input form */
              <>
                {planError && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-100 border border-rose-300 text-rose-700 text-sm">{planError}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>What do you need to do?</label>
                    <input
                      type="text"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !planLoading && task && deadline && generatePlan()}
                      placeholder="e.g., Write essay for history class, Finish presentation for Business 101"
                      className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                      disabled={planLoading}
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>When's it due?</label>
                    <input
                      type="text"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !planLoading && task && deadline && generatePlan()}
                      placeholder="e.g., Next Tuesday, Friday at 5pm, December 20th"
                      className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                      disabled={planLoading}
                    />
                  </div>
                  <button
                    onClick={generatePlan}
                    disabled={planLoading || !task || !deadline}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                  >
                    {planLoading ? (
                      <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /><span>AI is thinking...</span></>
                    ) : (
                      <><Zap className="w-5 h-5" /><span>Generate My Plan</span></>
                    )}
                  </button>
                </div>
              </>
              )
            ) : (
              <>
                <div className="mb-6">
                  <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{plan.taskTitle}</h2>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{plan.analysis}</p>
                  <div className={`flex items-center space-x-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="flex items-center space-x-1"><Clock className="w-4 h-4" /><span>{plan.totalEstimatedTime}</span></span>
                    <span className="flex items-center space-x-1"><Calendar className="w-4 h-4" /><span>Due: {deadline}</span></span>
                  </div>
                  {/* Progress bar */}
                  <div className={`w-full rounded-full h-2 mt-4 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(completedSteps.size / plan.steps.length) * 100}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{completedSteps.size} of {plan.steps.length} steps done</p>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.steps.map((step, index) => {
                    const done = completedSteps.has(step.id);
                    return (
                      <div
                        key={step.id}
                        className={`rounded-xl p-4 border-2 transition-all ${
                          done
                            ? darkMode ? 'bg-slate-800/50 border-emerald-700 opacity-60' : 'bg-slate-50 border-emerald-300 opacity-60'
                            : darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {done
                              ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              : <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">{index + 1}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${done ? 'line-through' : ''} ${darkMode ? 'text-white' : 'text-slate-900'}`}>{step.title}</p>
                            <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{step.description}</p>
                            <span className={`text-xs mt-1 inline-block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>⏱ {step.estimatedTime}</span>
                          </div>
                          {!done && (
                            <button
                              onClick={() => toggleStep(step.id)}
                              className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => { setPlan(null); setTask(''); setDeadline(''); setCompletedSteps(new Set()); setCurrentTaskId(null); }}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}
                  >
                    New Task
                  </button>
                  <Link
                    href="/planner"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-semibold transition text-center"
                  >
                    Open Full Planner
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Logged-out: original hero */
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
              darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Sparkles className="w-4 h-4" />
              <span>For citizens of the procrastination nation</span>
            </div>

            <h1 className={`text-6xl md:text-7xl font-bold mb-6 tracking-tight ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              A nation of doers
              <br />
              <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>starts here.</span>
            </h1>

            <p className={`text-xl mb-10 leading-relaxed max-w-3xl mx-auto ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              We've all been citizens of procrastination. Time to change your status. AI breaks down your biggest tasks so the only thing left to do is start.
            </p>

            <div className="flex justify-center mb-6">
              <Link
                href="/planner"
                onClick={handleCTA}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
              >
                <span>Join the Nation</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Free to join • No credit card required
            </p>
          </div>
        </div>
      )}

      {/* Value props bar */}
      <div className={`py-12 border-y transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-16`}>
            <div className="flex flex-col items-center text-center">
              <Brain className={`w-7 h-7 mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Declare independence from overwhelm</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Any task, broken into steps instantly</span>
            </div>
            <div className={`hidden md:block w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center text-center">
              <Zap className={`w-7 h-7 mb-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Rally your focus</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low activation energy, every step</span>
            </div>
            <div className={`hidden md:block w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center text-center">
              <Users className={`w-7 h-7 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Hold the line</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Streaks, pods, and progress tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>Your arsenal against inaction</h2>
          <p className={`text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Four tools built for people who've tried everything else.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Adherence Planner */}
          <Link href="/planner" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'
            }`}>
              <Brain className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Adherence Planner
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Break down any task into micro-steps with intelligent scheduling. Just add your deadline—AI handles the planning.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Smart task breakdown
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Automatic scheduling
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Progress tracking
              </li>
            </ul>
          </Link>

          {/* Reset Station */}
          <Link href="/reset-station" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-teal-900/30' : 'bg-teal-100'
            }`}>
              <Zap className={`w-6 h-6 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Reset Station
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Feeling stuck? Take a quick 3-5 minute guided reset to recenter and get back on track.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Guided interventions
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Breathing exercises
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Focus techniques
              </li>
            </ul>
          </Link>

          {/* Focus Pods */}
          <Link href="/focus-pods" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <Users className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Focus Pods
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Work alongside others in virtual co-working sessions. Stay accountable and motivated together.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Audio co-working
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Scheduled sessions
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Community support
              </li>
            </ul>
          </Link>

          {/* Metrics Dashboard */}
          <Link href="/dashboard" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-violet-900/30' : 'bg-violet-100'
            }`}>
              <BarChart3 className={`w-6 h-6 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Metrics Dashboard
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Track your progress with detailed analytics. Watch your productivity soar with streaks and insights.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Daily streaks
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Completion rates
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Task history
              </li>
            </ul>
          </Link>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Every nation needs a rallying cry.</h2>
            <p className="text-xl text-slate-400">Ours is: start. Pick the plan that gets you moving.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$0</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <p className="text-slate-400">Perfect for getting started</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  5 AI-planned tasks per month
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Basic metrics tracking
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Access to Reset Station
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Community Focus Pods
                </li>
              </ul>

              <Link
                href="/planner"
                onClick={handleCTA}
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-xl font-semibold transition-all text-center"
              >
                Claim Your Citizenship
              </Link>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 relative transform md:scale-105 shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </span>
              </div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$7.99</span>
                  <span className="text-emerald-100 ml-2">/month</span>
                </div>
                <p className="text-emerald-100">For serious productivity</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Unlimited AI task planning</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Advanced analytics & insights</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Private Focus Pods</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Priority support</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Export & integrations</span>
                </li>
              </ul>

              <Link
                href="/planner"
                onClick={handleCTA}
                className="block w-full bg-white hover:bg-slate-100 text-emerald-600 px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg text-center"
              >
                Join the Nation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={`py-24 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Your nation is waiting.
          </h2>
          <p className={`text-xl mb-10 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Thousands of former procrastinators have already changed their status. One step at a time. Together.
          </p>
          <Link
            href="/planner"
            onClick={handleCTA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/30 inline-flex items-center space-x-2"
          >
            <span>Join the Nation</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t py-12 transition-colors ${
        darkMode ? 'bg-black border-slate-900' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Logo size="md" />
            </div>
            <p className="text-slate-400 text-sm">© 2026 ProcrastiNation. The nation where things get done.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
