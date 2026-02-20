'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Brain, Calendar, Clock, CheckCircle2, Sparkles, Zap, Target, Trophy, ArrowLeft, Trash2 } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import UpgradeModal from '../../components/UpgradeModal';

function PlannerContent() {
  const { darkMode } = useTheme();
  const { user, trialStatus } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('task');
  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [lastEncouragement, setLastEncouragement] = useState('');
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [draggedStep, setDraggedStep] = useState(null);
  const [showFinalCelebration, setShowFinalCelebration] = useState(false);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const [streak, setStreak] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [clarificationNeeded, setClarificationNeeded] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});

  const encouragements = [
    "Great job!", "Keep up the good work!", "You're on a roll!",
    "Crushing it!", "Momentum building!", "You're unstoppable!",
    "Amazing progress!", "Way to go!"
  ];

  useEffect(() => {
    if (user) {
      loadStreakData();
      loadTask();
    }
  }, [user, taskIdParam]);

  const loadTask = async () => {
    let query = supabase.from('tasks').select('*').eq('user_id', user.id);

    if (taskIdParam) {
      // Load a specific task by ID (from dashboard link)
      query = query.eq('id', taskIdParam);
    } else {
      // Load most recent in-progress task by default
      query = query.eq('status', 'in_progress').order('created_at', { ascending: false }).limit(1);
    }

    const { data } = await query.single();

    if (data) {
      const completedSet = new Set(
        (data.steps || []).filter(s => s.completed).map(s => s.id)
      );
      setPlan({
        taskTitle: data.title,
        analysis: data.description,
        totalEstimatedTime: '',
        steps: data.steps || [],
      });
      setDeadline('');
      setCompletedSteps(completedSet);
      setCurrentTaskId(data.id);
      setTaskStartTime(new Date(data.start_time).getTime());
    }
  };

  const loadStreakData = async () => {
    const { data } = await supabase
      .from('streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .single();
    if (data) setStreak(data.current_streak);
  };

  const updateStreak = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.last_completed_date === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const newStreak = existing.last_completed_date === yesterdayStr
        ? existing.current_streak + 1
        : 1;

      const newHighest = Math.max(newStreak, existing.highest_streak);

      await supabase.from('streaks').update({
        current_streak: newStreak,
        highest_streak: newHighest,
        last_completed_date: today,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      setStreak(newStreak);
    } else {
      await supabase.from('streaks').insert({
        user_id: user.id,
        current_streak: 1,
        highest_streak: 1,
        last_completed_date: today,
      });
      setStreak(1);
    }
  };

  const generatePlan = async () => {
    if (!task || !deadline) return;

    // Free tier: max 5 AI plans per calendar month
    if (user && trialStatus === 'free') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth.toISOString());
      if (count >= 5) {
        setShowUpgradeModal(true);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (!clarificationNeeded) {
        const clarificationRes = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, deadline, checkClarification: true }),
        });
        const clarificationData = await clarificationRes.json();
        if (!clarificationRes.ok) throw new Error(clarificationData.error || 'Failed to check clarification');
        if (clarificationData.needsClarification) {
          setClarificationQuestions(clarificationData.questions);
          setClarificationNeeded(true);
          setLoading(false);
          return;
        }
      }

      const planRes = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, deadline, clarificationAnswers, clarificationQuestions, checkClarification: false }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || 'Failed to generate plan');

      setPlan(planData.plan);
      setCompletedSteps(new Set());
      setClarificationNeeded(false);
      setClarificationQuestions([]);
      setClarificationAnswers({});
      setTaskStartTime(Date.now());

      if (user) {
        const { data } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: planData.plan.taskTitle,
          description: planData.plan.analysis,
          status: 'in_progress',
          steps: planData.plan.steps,
          completed_steps: 0,
          total_steps: planData.plan.steps.length,
          start_time: new Date().toISOString(),
        }).select().single();
        if (data) setCurrentTaskId(data.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate plan. Please try again.');
    }

    setLoading(false);
  };

  const markComplete = async (stepId) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    setTotalCompletions(totalCompletions + 1);

    const isFullyComplete = newCompleted.size === plan.steps.length;

    if (user && currentTaskId) {
      const updatedSteps = plan.steps.map(s => ({
        ...s,
        completed: newCompleted.has(s.id),
      }));

      await supabase.from('tasks').update({
        steps: updatedSteps,
        completed_steps: newCompleted.size,
        status: isFullyComplete ? 'completed' : 'in_progress',
        completed_at: isFullyComplete ? new Date().toISOString() : null,
      }).eq('id', currentTaskId);
    }

    if (isFullyComplete) {
      triggerFinalCelebration();
    } else {
      triggerCelebration(totalCompletions + 1);
    }

    updateStreak();
  };

  const triggerCelebration = (completionCount) => {
    let available = [...encouragements];
    if (completionCount === 1) available = available.filter(m => m !== "You're on a roll!");
    if (lastEncouragement) available = available.filter(m => m !== lastEncouragement);
    const msg = available[Math.floor(Math.random() * available.length)];
    setEncouragement(msg);
    setLastEncouragement(msg);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  };

  const triggerFinalCelebration = () => setShowFinalCelebration(true);

  const handleDragStart = (e, index) => {
    setDraggedStep(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedStep === null || draggedStep === dropIndex) return;
    const newSteps = [...plan.steps];
    const draggedItem = newSteps[draggedStep];
    newSteps.splice(draggedStep, 1);
    newSteps.splice(dropIndex, 0, draggedItem);
    setPlan({ ...plan, steps: newSteps });
    setDraggedStep(null);
  };

  const handleDragEnd = () => setDraggedStep(null);

  const deleteTask = async () => {
    if (!currentTaskId) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    await supabase.from('tasks').delete().eq('id', currentTaskId);
    setPlan(null);
    setTask('');
    setDeadline('');
    setCurrentTaskId(null);
    setCompletedSteps(new Set());
    setTaskStartTime(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && task && deadline) generatePlan();
  };

  const completionPercentage = plan ? (completedSteps.size / plan.steps.length) * 100 : 0;

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />
      {showUpgradeModal && <UpgradeModal reason="limit" onClose={() => setShowUpgradeModal(false)} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <Brain className="w-4 h-4" />
            <span>AI-Powered Planning</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI Adherence Planner</h1>
          <p className={`text-lg sm:text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Break any task into bite-sized, achievable steps
          </p>
          {!user && (
            <p className={`mt-3 text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Sign in to save your progress and streaks across devices.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-700">
            <p className="font-medium">Error: {error}</p>
            <p className="text-sm mt-1">Make sure your ANTHROPIC_API_KEY is set in your environment variables.</p>
          </div>
        )}

        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="flex flex-col items-center">
              <div className="animate-bounce mb-4">
                <Trophy className="w-24 h-24 text-amber-500 drop-shadow-2xl" />
              </div>
              <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{encouragement}</p>
            </div>
          </div>
        )}

        {showFinalCelebration && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`rounded-3xl p-12 max-w-2xl w-full text-center border-2 ${
              darkMode ? 'bg-slate-800 border-emerald-500' : 'bg-white border-emerald-500'
            }`}>
              <div className="mb-6">
                <div className="text-8xl mb-4 animate-bounce">🎉</div>
                <div className="flex justify-center space-x-4 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-4xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>⭐</span>
                  ))}
                </div>
              </div>
              <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Congratulations!</h2>
              <p className={`text-xl mb-8 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>You have completed this task.</p>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setPlan(null); setTask(''); setDeadline('');
                    setShowFinalCelebration(false); setCompletedSteps(new Set());
                    setTaskStartTime(null); setCurrentTaskId(null);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-105"
                >
                  Plan Another Task
                </button>
                <Link
                  href="/dashboard"
                  className={`block w-full px-8 py-4 rounded-xl font-bold text-xl transition ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  Check Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {!plan ? (
          clarificationNeeded ? (
            <div className={`rounded-2xl p-8 border transition-colors ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="mb-6">
                <h2 className={`text-2xl font-bold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Brain className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Just a few quick questions...</span>
                </h2>
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Help me create a better plan for you!</p>
              </div>
              <div className="space-y-6">
                {clarificationQuestions.map((question, index) => (
                  <div key={index}>
                    <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{question}</label>
                    <input
                      type="text"
                      value={clarificationAnswers[index] || ''}
                      onChange={(e) => setClarificationAnswers({ ...clarificationAnswers, [index]: e.target.value })}
                      onKeyPress={handleKeyPress}
                      placeholder="Your answer..."
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => { setClarificationNeeded(false); setClarificationQuestions([]); setClarificationAnswers({}); }}
                  disabled={loading}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition flex items-center justify-center space-x-2 ${
                    darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-8 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Generating...</span></>
                  ) : (
                    <><Zap className="w-5 h-5" /><span>Generate Plan</span></>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl p-8 border transition-colors ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-6">
                <div>
                  <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>What do you need to do?</label>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Write essay for history class, Finish presentation for Business 101"
                    className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                      darkMode
                        ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                    }`}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>When's it due?</label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Next Tuesday, Friday at 5pm, December 20th"
                    className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                      darkMode
                        ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                        : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                    }`}
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={generatePlan}
                  disabled={loading || !task || !deadline}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
                >
                  {loading ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>AI is thinking...</span></>
                  ) : (
                    <><Zap className="w-5 h-5" /><span>Generate My Plan</span></>
                  )}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Your Progress</span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{Math.round(completionPercentage)}%</span>
              </div>
              <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className={`mt-3 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {completedSteps.size} of {plan.steps.length} steps complete
              </p>
            </div>

            {/* Task Summary */}
            <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h2 className={`text-2xl font-bold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Target className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>{plan.taskTitle}</span>
              </h2>
              <p className={`mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{plan.analysis}</p>
              <div className={`flex items-center space-x-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <div className="flex items-center space-x-2">
                  <Clock className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Est. {plan.totalEstimatedTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Due: {deadline}</span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>💡 Tip: Drag and drop to reorder your steps</p>
              {plan.steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isDragging = draggedStep === index;
                return (
                  <div
                    key={step.id}
                    draggable={!isCompleted}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-2xl p-6 border-2 transition-all duration-300 ${
                      isCompleted
                        ? darkMode ? 'bg-slate-800/50 border-emerald-700 opacity-60' : 'bg-slate-50 border-emerald-300 opacity-60'
                        : darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-600 cursor-move' : 'bg-white border-slate-200 hover:border-emerald-400 cursor-move'
                    } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">{index + 1}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${isCompleted ? 'line-through' : ''} ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {step.title}
                        </h3>
                        <p className={`mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{step.description}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-sm px-3 py-1 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              ⏱️ {step.estimatedTime}
                            </span>
                            <span className={`text-sm px-3 py-1 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              📅 {step.when}
                            </span>
                          </div>
                          {!isCompleted && (
                            <button
                              onClick={() => markComplete(step.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105 flex items-center space-x-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Complete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => { setPlan(null); setTask(''); setDeadline(''); setCurrentTaskId(null); }}
                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                Plan Another Task
              </button>
              {currentTaskId && (
                <button
                  onClick={deleteTask}
                  className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-semibold transition ${
                    darkMode ? 'bg-rose-900/30 hover:bg-rose-900/50 text-rose-400' : 'bg-rose-100 hover:bg-rose-200 text-rose-600'
                  }`}
                  title="Delete this task"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" /></div>}>
      <PlannerContent />
    </Suspense>
  );
}
