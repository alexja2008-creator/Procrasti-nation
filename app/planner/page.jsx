'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Brain, Calendar, Clock, CheckCircle2, Sparkles, Zap, Target, Trophy, ArrowLeft, Trash2, Pencil, Plus } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import UpgradeModal from '../../components/UpgradeModal';

function PlannerContent() {
  const { darkMode } = useTheme();
  const { user, trialStatus } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  const taskIdParam = searchParams.get('task');
  const prefillParam = searchParams.get('prefill');
  const prefillDueDate = searchParams.get('dueDate');
  const prefillTaskId = searchParams.get('taskId'); // skeleton task to replace
  const [task, setTask] = useState(prefillParam || '');
  const [deadline, setDeadline] = useState('');
  // Pre-fill the date picker if a due date was passed, but leave the deadline
  // text field blank so the user still goes through the full planner flow
  const [dueDate, setDueDate] = useState(prefillDueDate || '');
  const [priority, setPriority] = useState('');
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
  const [editingStepId, setEditingStepId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepDraft, setNewStepDraft] = useState({ title: '', description: '', estimatedTime: '', when: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [recurrence, setRecurrence] = useState(null); // null | { type: 'daily'|'weekly'|'monthly', startDate: ISO }
  const [showCommitmentPrompt, setShowCommitmentPrompt] = useState(false);
  const [startCommitment, setStartCommitment] = useState('');
  const [taskFirstInteraction, setTaskFirstInteraction] = useState(null);

  const encouragements = [
    "Great job!", "Keep up the good work!", "You're on a roll!",
    "Crushing it!", "Momentum building!", "You're unstoppable!",
    "Amazing progress!", "Way to go!"
  ];

  useEffect(() => {
    if (user) {
      loadStreakData();
      // Skip loadTask when we're in prefill mode — we want a blank form
      // pre-populated with the syllabus task title so the user can add context
      if (!prefillParam) {
        loadTask();
      }
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
      // Compute total estimated time from individual step estimates
      const steps = data.steps || [];
      let totalMinutes = 0;
      steps.forEach(s => {
        const match = (s.estimatedTime || '').match(/(\d+)/g);
        if (match) {
          // Handle ranges like "60-90 min" by averaging
          const nums = match.map(Number);
          totalMinutes += nums.reduce((a, b) => a + b, 0) / nums.length;
        }
      });
      let computedEstimate = '';
      if (totalMinutes > 0) {
        if (totalMinutes >= 60) {
          const hours = Math.round(totalMinutes / 60);
          computedEstimate = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
          computedEstimate = `${Math.round(totalMinutes)} min`;
        }
      }
      // Format stored due_date as a readable deadline string
      const storedDueDate = data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '';
      let readableDeadline = '';
      if (data.due_date) {
        readableDeadline = new Date(data.due_date).toLocaleDateString('en-US', {
          weekday: 'long', month: 'short', day: 'numeric',
        });
      }
      setPlan({
        taskTitle: data.title,
        analysis: data.description,
        totalEstimatedTime: computedEstimate,
        steps,
      });
      setDeadline(readableDeadline);
      setDueDate(storedDueDate);
      setCompletedSteps(completedSet);
      setCurrentTaskId(data.id);
      setTaskStartTime(new Date(data.start_time).getTime());
      setRecurrence(data.recurrence || null);
      setTaskFirstInteraction(data.first_interaction_at || null);
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
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` };

      if (!clarificationNeeded) {
        const clarificationRes = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ task, deadline, checkClarification: true, procrastinationType: user?.user_metadata?.procrastination_type || null }),
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
        headers: authHeader,
        body: JSON.stringify({ task, deadline, clarificationAnswers, clarificationQuestions, checkClarification: false, procrastinationType: user?.user_metadata?.procrastination_type || null }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || 'Failed to generate plan');

      setPlan(planData.plan);
      setCompletedSteps(new Set());
      setClarificationNeeded(false);
      setClarificationQuestions([]);
      setClarificationAnswers({});
      setTaskStartTime(Date.now());

      // Auto-fill due date from AI-resolved date when user only typed natural language
      let effectiveDueDate = dueDate;
      if (!effectiveDueDate && planData.plan.resolvedDueDate) {
        effectiveDueDate = planData.plan.resolvedDueDate;
        setDueDate(effectiveDueDate);
      }

      if (user) {
        // If we're replacing a skeleton task imported from a syllabus, delete it first
        // so we don't leave a 0-step ghost in the dashboard
        if (prefillTaskId) {
          await supabase.from('tasks').delete().eq('id', prefillTaskId).eq('user_id', user.id);
          // Also update localStorage boards: swap skeleton id → new task id (done after insert)
        }

        const { data, error: insertError } = await supabase.from('tasks').insert({
          user_id: user.id,
          title: planData.plan.taskTitle,
          description: planData.plan.analysis,
          status: 'in_progress',
          steps: planData.plan.steps,
          completed_steps: 0,
          total_steps: planData.plan.steps.length,
          start_time: new Date().toISOString(),
          due_date: effectiveDueDate ? new Date(effectiveDueDate).toISOString() : null,
          priority: priority ? parseInt(priority) : null,
          recurrence: recurrence || null,
        }).select().single();

        if (insertError) {
          console.error('Task insert failed:', insertError);
          setError('Your plan was generated but could not be saved. Please sign out and back in, then try again.');
          setLoading(false);
          return;
        }

        if (data) {
          setCurrentTaskId(data.id);
          setTaskFirstInteraction(null);
          setShowCommitmentPrompt(true);
          // Swap skeleton taskId → real taskId in localStorage boards
          if (prefillTaskId) {
            try {
              const boards = JSON.parse(localStorage.getItem('task-boards') || '[]');
              const updated = boards.map(b => ({
                ...b,
                taskIds: b.taskIds.map(id => id === prefillTaskId ? data.id : id),
              }));
              localStorage.setItem('task-boards', JSON.stringify(updated));
            } catch {}
          }
        }
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
      const now = new Date().toISOString();
      const updatedSteps = plan.steps.map(s => ({
        ...s,
        completed: newCompleted.has(s.id),
        // Preserve existing completedAt; stamp only when newly completing
        completedAt: newCompleted.has(s.id) ? (s.completedAt || now) : s.completedAt,
      }));

      await supabase.from('tasks').update({
        steps: updatedSteps,
        completed_steps: newCompleted.size,
        status: isFullyComplete ? 'completed' : 'in_progress',
        completed_at: isFullyComplete ? now : null,
        ...(!taskFirstInteraction ? { first_interaction_at: now } : {}),
      }).eq('id', currentTaskId);
      if (!taskFirstInteraction) setTaskFirstInteraction(now);

      // Auto-spawn next occurrence when task fully completes and has recurrence set
      if (isFullyComplete && recurrence) {
        try {
          const resetSteps = updatedSteps.map(s => ({ ...s, completed: false }));
          const now = new Date();
          const nextStartDate = new Date(now);
          if (recurrence.type === 'daily') nextStartDate.setDate(nextStartDate.getDate() + 1);
          else if (recurrence.type === 'weekly') nextStartDate.setDate(nextStartDate.getDate() + 7);
          else if (recurrence.type === 'monthly') nextStartDate.setMonth(nextStartDate.getMonth() + 1);

          const { data: currentTask } = await supabase
            .from('tasks')
            .select('title, description, due_date, priority')
            .eq('id', currentTaskId)
            .single();

          if (currentTask) {
            let nextDueDate = null;
            if (currentTask.due_date) {
              const nextDue = new Date(currentTask.due_date);
              if (recurrence.type === 'daily') nextDue.setDate(nextDue.getDate() + 1);
              else if (recurrence.type === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
              else if (recurrence.type === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
              nextDueDate = nextDue.toISOString();
            }
            const { data: spawnedTask } = await supabase.from('tasks').insert({
              user_id: user.id,
              title: currentTask.title,
              description: currentTask.description,
              status: 'in_progress',
              steps: resetSteps,
              completed_steps: 0,
              total_steps: resetSteps.length,
              start_time: nextStartDate.toISOString(),
              due_date: nextDueDate,
              priority: currentTask.priority,
              recurrence: recurrence,
            }).select('id').single();

            // Re-assign spawned task to the same board as the completed task
            if (spawnedTask) {
              try {
                const boards = JSON.parse(localStorage.getItem('task-boards') || '[]');
                const parentBoard = boards.find(b => b.taskIds.includes(currentTaskId));
                if (parentBoard) {
                  const updatedBoards = boards.map(b =>
                    b.id === parentBoard.id
                      ? { ...b, taskIds: [...b.taskIds, spawnedTask.id] }
                      : b
                  );
                  localStorage.setItem('task-boards', JSON.stringify(updatedBoards));
                }
              } catch (boardErr) {
                console.error('[recurrence board sync]', boardErr);
              }
            }
          }
        } catch (err) {
          console.error('[recurrence spawn]', err);
        }
      }
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

  const startEditStep = (step) => {
    setEditingStepId(step.id);
    setEditDraft({ title: step.title, description: step.description, estimatedTime: step.estimatedTime, when: step.when });
  };

  const cancelEditStep = () => {
    setEditingStepId(null);
    setEditDraft({});
  };

  const saveEditStep = async (stepId) => {
    if (!editDraft.title.trim()) return;
    setIsSavingEdit(true);
    const updatedSteps = plan.steps.map(s => s.id === stepId ? { ...s, ...editDraft } : s);
    setPlan({ ...plan, steps: updatedSteps });
    if (user && currentTaskId) {
      const interactionTs = !taskFirstInteraction ? new Date().toISOString() : undefined;
      await supabase.from('tasks').update({
        steps: updatedSteps,
        ...(interactionTs ? { first_interaction_at: interactionTs } : {}),
      }).eq('id', currentTaskId);
      if (interactionTs) setTaskFirstInteraction(interactionTs);
    }
    setEditingStepId(null);
    setEditDraft({});
    setIsSavingEdit(false);
  };

  const deleteStep = async (stepId) => {
    if (completedSteps.has(stepId)) return;
    if (plan.steps.length <= 1) return;
    const updatedSteps = plan.steps.filter(s => s.id !== stepId);
    setPlan({ ...plan, steps: updatedSteps });
    if (user && currentTaskId) {
      await supabase.from('tasks').update({ steps: updatedSteps, total_steps: updatedSteps.length }).eq('id', currentTaskId);
    }
  };

  const saveNewStep = async () => {
    if (!newStepDraft.title.trim()) return;
    setIsSavingEdit(true);
    const maxId = plan.steps.reduce((m, s) => Math.max(m, s.id), 0);
    const newStep = {
      id: maxId + 1,
      title: newStepDraft.title.trim(),
      description: newStepDraft.description.trim(),
      estimatedTime: newStepDraft.estimatedTime.trim() || '15 min',
      when: newStepDraft.when.trim() || 'Anytime',
      completed: false,
    };
    const updatedSteps = [...plan.steps, newStep];
    setPlan({ ...plan, steps: updatedSteps });
    if (user && currentTaskId) {
      await supabase.from('tasks').update({ steps: updatedSteps, total_steps: updatedSteps.length }).eq('id', currentTaskId);
    }
    setNewStepDraft({ title: '', description: '', estimatedTime: '', when: '' });
    setIsAddingStep(false);
    setIsSavingEdit(false);
  };

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

      {checkoutStatus === 'success' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex items-center justify-between gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg">
            <p className="font-semibold text-sm">You're now a Pro citizen. Welcome to the Nation.</p>
            <a href="/planner" className="text-white/70 hover:text-white text-xs underline whitespace-nowrap">Dismiss</a>
          </div>
        </div>
      )}
      {checkoutStatus === 'canceled' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex items-center justify-between gap-3 bg-slate-600 text-white px-5 py-3 rounded-xl shadow-lg">
            <p className="font-semibold text-sm">Checkout canceled — you're still on the free tier.</p>
            <a href="/planner" className="text-white/70 hover:text-white text-xs underline whitespace-nowrap">Dismiss</a>
          </div>
        </div>
      )}

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
                    setTaskStartTime(null); setCurrentTaskId(null); setRecurrence(null);
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Due date <span className={`font-normal text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                      }`}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Priority <span className={`font-normal text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={`w-full px-4 py-4 rounded-lg border-2 focus:outline-none text-lg transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                      }`}
                      disabled={loading}
                    >
                      <option value="">— No priority —</option>
                      <option value="3">🔴 High</option>
                      <option value="2">🟡 Medium</option>
                      <option value="1">🟢 Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Repeat <span className={`font-normal text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: null, label: 'No repeat' },
                      { value: 'daily', label: '🔁 Daily' },
                      { value: 'weekly', label: '📅 Weekly' },
                      { value: 'monthly', label: '🗓️ Monthly' },
                    ].map(opt => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setRecurrence(opt.value ? { type: opt.value, startDate: new Date().toISOString() } : null)}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                          (opt.value === null && recurrence === null) || (recurrence?.type === opt.value)
                            ? darkMode ? 'border-emerald-500 bg-emerald-900/30 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : darkMode ? 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
              {(plan.totalEstimatedTime || deadline || dueDate) && (
                <div className={`flex items-center space-x-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {plan.totalEstimatedTime && (
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Est. {plan.totalEstimatedTime}</span>
                    </div>
                  )}
                  {(deadline || dueDate) && (
                    <div className="flex items-center space-x-2">
                      <Calendar className={`w-4 h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span>Due: {deadline || new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              )}
              <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Repeat this plan</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: null, label: 'No repeat' },
                    { value: 'daily', label: '🔁 Daily' },
                    { value: 'weekly', label: '📅 Weekly' },
                    { value: 'monthly', label: '🗓️ Monthly' },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={async () => {
                        const newRecurrence = opt.value ? { type: opt.value, startDate: new Date().toISOString() } : null;
                        setRecurrence(newRecurrence);
                        if (user && currentTaskId) {
                          await supabase.from('tasks').update({ recurrence: newRecurrence }).eq('id', currentTaskId);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                        (opt.value === null && recurrence === null) || (recurrence?.type === opt.value)
                          ? darkMode ? 'border-emerald-500 bg-emerald-900/30 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : darkMode ? 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Commitment device — "When will you START this?" */}
            {showCommitmentPrompt && plan && currentTaskId && (
              <div className={`rounded-2xl p-6 border-2 transition-colors animate-pulse-once ${
                darkMode ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <h3 className={`text-lg font-bold mb-2 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Clock className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>When will you start this?</span>
                </h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Making a commitment helps you follow through. Pick a date and time.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="datetime-local"
                    value={startCommitment}
                    onChange={(e) => setStartCommitment(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className={`px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                      darkMode
                        ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white'
                        : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={async () => {
                      if (startCommitment && currentTaskId) {
                        await supabase.from('tasks').update({
                          start_commitment: new Date(startCommitment).toISOString()
                        }).eq('id', currentTaskId);
                      }
                      setShowCommitmentPrompt(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    {startCommitment ? 'I commit' : 'Skip for now'}
                  </button>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-4">
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>💡 Tip: Drag and drop to reorder your steps</p>
              {plan.steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isDragging = draggedStep === index;
                const isEditing = editingStepId === step.id;
                return (
                  <div
                    key={step.id}
                    draggable={!isCompleted && !isEditing}
                    onDragStart={(e) => !isEditing && handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-2xl p-6 border-2 transition-all duration-300 ${
                      isCompleted
                        ? darkMode ? 'bg-slate-800/50 border-emerald-700 opacity-60' : 'bg-slate-50 border-emerald-300 opacity-60'
                        : isEditing
                          ? darkMode ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-white border-emerald-400 ring-2 ring-emerald-400/20'
                          : darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-600 cursor-move' : 'bg-white border-slate-200 hover:border-emerald-400 cursor-move'
                    } ${isDragging ? 'opacity-50 scale-95' : ''}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          autoFocus
                          type="text"
                          value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                          placeholder="Step title"
                          className={`w-full px-3 py-2 rounded-lg border-2 font-bold text-lg focus:outline-none transition-colors ${
                            darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                          }`}
                        />
                        <textarea
                          value={editDraft.description}
                          onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                          placeholder="What to do in this step..."
                          rows={2}
                          className={`w-full px-3 py-2 rounded-lg border-2 focus:outline-none resize-none transition-colors ${
                            darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editDraft.estimatedTime}
                            onChange={(e) => setEditDraft({ ...editDraft, estimatedTime: e.target.value })}
                            placeholder="Est. time (e.g. 20 min)"
                            className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none transition-colors ${
                              darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                          <input
                            type="text"
                            value={editDraft.when}
                            onChange={(e) => setEditDraft({ ...editDraft, when: e.target.value })}
                            placeholder="When (e.g. Today, Tomorrow)"
                            className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none transition-colors ${
                              darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            onClick={cancelEditStep}
                            disabled={isSavingEdit}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                              darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEditStep(step.id)}
                            disabled={isSavingEdit || !editDraft.title.trim()}
                            className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white transition"
                          >
                            {isSavingEdit ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
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
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => startEditStep(step)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    darkMode ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="Edit step"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteStep(step.id)}
                                  disabled={plan.steps.length <= 1}
                                  className={`p-2 rounded-lg transition-colors ${
                                    plan.steps.length <= 1
                                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                                      : darkMode ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/30' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title="Delete step"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => markComplete(step.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105 flex items-center space-x-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Complete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {isAddingStep ? (
                <div className={`rounded-2xl p-6 border-2 transition-colors ${
                  darkMode ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/30' : 'bg-white border-emerald-400 ring-2 ring-emerald-400/20'
                }`}>
                  <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>New Step</p>
                  <div className="space-y-3">
                    <input
                      autoFocus
                      type="text"
                      value={newStepDraft.title}
                      onChange={(e) => setNewStepDraft({ ...newStepDraft, title: e.target.value })}
                      placeholder="Step title (required)"
                      className={`w-full px-3 py-2 rounded-lg border-2 font-bold text-lg focus:outline-none transition-colors ${
                        darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <textarea
                      value={newStepDraft.description}
                      onChange={(e) => setNewStepDraft({ ...newStepDraft, description: e.target.value })}
                      placeholder="What to do..."
                      rows={2}
                      className={`w-full px-3 py-2 rounded-lg border-2 focus:outline-none resize-none transition-colors ${
                        darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newStepDraft.estimatedTime}
                        onChange={(e) => setNewStepDraft({ ...newStepDraft, estimatedTime: e.target.value })}
                        placeholder="Est. time (e.g. 20 min)"
                        className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none transition-colors ${
                          darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <input
                        type="text"
                        value={newStepDraft.when}
                        onChange={(e) => setNewStepDraft({ ...newStepDraft, when: e.target.value })}
                        placeholder="When (e.g. Today)"
                        className={`w-full px-3 py-2 rounded-lg border-2 text-sm focus:outline-none transition-colors ${
                          darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => { setIsAddingStep(false); setNewStepDraft({ title: '', description: '', estimatedTime: '', when: '' }); }}
                        disabled={isSavingEdit}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                          darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveNewStep}
                        disabled={isSavingEdit || !newStepDraft.title.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white transition"
                      >
                        {isSavingEdit ? 'Adding...' : 'Add Step'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingStep(true)}
                  className={`w-full py-3 rounded-2xl border-2 border-dashed font-semibold text-sm transition flex items-center justify-center space-x-2 ${
                    darkMode ? 'border-slate-600 text-slate-500 hover:border-emerald-600 hover:text-emerald-400' : 'border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add a step</span>
                </button>
              )}
            </div>

            {plan && (
              <div className={`rounded-2xl p-5 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>📅 Add to your calendar</p>
                {!dueDate && (
                  <p className={`text-xs mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    No due date set — the event will open without a date so you can place it manually.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={(() => {
                      const title = encodeURIComponent(`ProcrastiNation: ${plan.taskTitle}`);
                      const details = encodeURIComponent(deadline ? `Due: ${deadline}` : 'Task created in ProcrastiNation');
                      if (dueDate) {
                        const date = dueDate.replace(/-/g, '');
                        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
                      }
                      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Add to Google Calendar</span>
                  </a>
                  <button
                    onClick={() => {
                      const title = `ProcrastiNation: ${plan.taskTitle}`;
                      const date = dueDate
                        ? dueDate.replace(/-/g, '')
                        : new Date().toISOString().split('T')[0].replace(/-/g, '');
                      const ics = [
                        'BEGIN:VCALENDAR',
                        'VERSION:2.0',
                        'BEGIN:VEVENT',
                        `SUMMARY:${title}`,
                        deadline ? `DESCRIPTION:Due: ${deadline}` : 'DESCRIPTION:Task created in ProcrastiNation',
                        `DTSTART;VALUE=DATE:${date}`,
                        `DTEND;VALUE=DATE:${date}`,
                        'END:VEVENT',
                        'END:VCALENDAR',
                      ].join('\r\n');
                      const blob = new Blob([ics], { type: 'text/calendar' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'procrasti-nation-task.ics';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition ${
                      darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Add to Apple / Outlook</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => { setPlan(null); setTask(''); setDeadline(''); setCurrentTaskId(null); setRecurrence(null); setIsAddingStep(false); setEditingStepId(null); }}
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
