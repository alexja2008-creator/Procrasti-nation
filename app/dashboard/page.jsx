'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { BarChart3, Flame, Zap, CheckCircle2, Clock, TrendingUp, Calendar, Archive, ChevronRight, X, PlayCircle, Trash2, ArrowUpDown } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const pathname = usePathname();
  const [tasks, setTasks] = useState([]);
  const [streakData, setStreakData] = useState({ current_streak: 0, highest_streak: 0 });
  const [quickestCompletion, setQuickestCompletion] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [inProgressSort, setInProgressSort] = useState('priority'); // 'priority' | 'due_date'

  // Re-fetch whenever the user arrives at /dashboard (covers in-app nav on mobile)
  useEffect(() => {
    if (user) loadDashboardData();
    else setLoadingData(false);
  }, [user, pathname]);

  // Re-fetch when the page becomes visible again (covers app-switching on mobile)
  useEffect(() => {
    const onVisible = () => { if (user && document.visibilityState === 'visible') loadDashboardData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    setLoadError('');

    const [tasksRes, streakRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('streaks').select('*').eq('user_id', user.id).single(),
    ]);

    if (tasksRes.error) {
      setLoadError('Failed to load your tasks. Please refresh to try again.');
      setLoadingData(false);
      return;
    }

    const loadedTasks = tasksRes.data || [];
    setTasks(loadedTasks);

    // streaks row may simply not exist yet (PGRST116 = no rows), only flag real errors
    if (streakRes.error && streakRes.error.code !== 'PGRST116') {
      setLoadError('Failed to load your streak data. Please refresh to try again.');
    } else if (streakRes.data) {
      setStreakData(streakRes.data);
    }

    const completedWithTime = loadedTasks.filter(t => t.status === 'completed' && t.completed_at && t.start_time);
    if (completedWithTime.length > 0) {
      const withDuration = completedWithTime.map(t => ({
        ...t,
        durationHours: (new Date(t.completed_at) - new Date(t.start_time)) / (1000 * 60 * 60),
      }));
      setQuickestCompletion(withDuration.reduce((min, t) => t.durationHours < min.durationHours ? t : min));
    }

    setLoadingData(false);
  };

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const rawInProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const totalTasks = tasks.length;

  const priorityLabel = (p) => {
    if (p === 3) return { label: 'High', color: darkMode ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-600' };
    if (p === 2) return { label: 'Med', color: darkMode ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600' };
    if (p === 1) return { label: 'Low', color: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600' };
    return null;
  };

  const inProgressTasks = [...rawInProgressTasks].sort((a, b) => {
    if (inProgressSort === 'priority') {
      // Higher priority number = more urgent, nulls last
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      return pb - pa;
    } else {
      // Earliest due date first, nulls last
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
  });
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const formatTime = (hours) => {
    if (hours == null) return '--';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${Math.round(hours / 24)} days`;
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear all your data? This cannot be undone.')) return;
    await Promise.all([
      supabase.from('tasks').delete().eq('user_id', user.id),
      supabase.from('streaks').delete().eq('user_id', user.id),
    ]);
    setTasks([]);
    setStreakData({ current_streak: 0, highest_streak: 0 });
    setQuickestCompletion(null);
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-700'
          }`}>
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Your Dashboard</h1>
          <p className={`text-lg sm:text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Track your progress and celebrate your wins</p>
        </div>

        {!user ? (
          <div className={`rounded-2xl p-12 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <BarChart3 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign in to see your dashboard</h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Your streaks, tasks, and stats will appear here once you're signed in.</p>
          </div>
        ) : loadingData ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <>
            {loadError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-between">
                <p>{loadError}</p>
                <button onClick={() => setLoadError('')}><X className="w-4 h-4" /></button>
              </div>
            )}
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                    <Flame className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                  </div>
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{streakData.current_streak}</span>
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Current Streak</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>days in a row</p>
              </div>

              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                    <TrendingUp className={`w-6 h-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{streakData.highest_streak}</span>
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Best Streak</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>personal record</p>
              </div>

              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                    <CheckCircle2 className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{completionRate}%</span>
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Completion Rate</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{completedTasks.length} of {totalTasks} tasks</p>
              </div>

              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <Zap className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {quickestCompletion ? formatTime(quickestCompletion.durationHours) : '--'}
                  </span>
                </div>
                <h3 className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Quickest Task</h3>
                <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>fastest completion</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Calendar className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Task Status</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Completed</span>
                      <span className={`font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{completedTasks.length}</span>
                    </div>
                    <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>In Progress</span>
                      <span className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{inProgressTasks.length}</span>
                    </div>
                    <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${totalTasks > 0 ? (inProgressTasks.length / totalTasks) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="text-center">
                    <p className={`text-3xl font-bold mb-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{totalTasks}</p>
                    <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Total Tasks Created</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Clock className={`w-5 h-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>Recent Completions</span>
                </h3>
                {completedTasks.length > 0 ? (
                  <div className="space-y-3">
                    {completedTasks.slice(0, 5).map(task => {
                      const duration = task.completed_at && task.start_time
                        ? (new Date(task.completed_at) - new Date(task.start_time)) / (1000 * 60 * 60)
                        : null;
                      return (
                        <div key={task.id} className={`rounded-lg p-3 flex items-center justify-between ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                          <div className="flex items-center space-x-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{task.title}</span>
                          </div>
                          <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{formatTime(duration)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    <p>No completed tasks yet!</p>
                    <p className="text-sm mt-2">Complete your first task to see it here.</p>
                  </div>
                )}
              </div>
            </div>

            {inProgressTasks.length > 0 && (
              <div className={`rounded-2xl p-6 border mb-8 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-bold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <Clock className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <span>Tasks In Progress</span>
                  </h3>
                  <div className={`flex items-center space-x-1 rounded-lg p-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <ArrowUpDown className={`w-3.5 h-3.5 ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <button
                      onClick={() => setInProgressSort('priority')}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        inProgressSort === 'priority'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Priority
                    </button>
                    <button
                      onClick={() => setInProgressSort('due_date')}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                        inProgressSort === 'due_date'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Due Date
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {inProgressTasks.map(task => {
                    const done = task.completed_steps || 0;
                    const total = task.total_steps || 1;
                    const pri = priorityLabel(task.priority);
                    const dueDateStr = task.due_date
                      ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : null;
                    return (
                      <div key={task.id} className={`rounded-xl p-4 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold mb-1 truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{task.title}</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{done} of {total} steps complete</p>
                              {pri && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pri.color}`}>
                                  {pri.label}
                                </span>
                              )}
                              {dueDateStr && (
                                <span className={`flex items-center gap-1 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <Calendar className="w-3 h-3" />
                                  {dueDateStr}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex items-center space-x-2 flex-shrink-0">
                            <Link
                              href={`/planner?task=${task.id}`}
                              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span>Continue</span>
                            </Link>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-900/30' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-8">
              <button
                onClick={() => setShowArchive(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <Archive className="w-5 h-5" />
                <span>View Completed Tasks Archive</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={clearAllData}
                className={`px-6 py-3 rounded-xl font-semibold transition ${darkMode ? 'bg-rose-900/30 hover:bg-rose-900/50 text-rose-400' : 'bg-rose-100 hover:bg-rose-200 text-rose-600'}`}
              >
                Clear All Data
              </button>
            </div>
          </>
        )}
      </div>

      {showArchive && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <Archive className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>Completed Tasks Archive</span>
              </h2>
              <button onClick={() => { setShowArchive(false); setSelectedTask(null); }} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {selectedTask ? (
              <div>
                <button onClick={() => setSelectedTask(null)} className={`mb-4 flex items-center space-x-2 ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  <span>Back to Archive</span>
                </button>
                <div className={`rounded-xl p-6 mb-6 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedTask.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>✓ Completed</span>
                </div>
                <h4 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Task Steps</h4>
                <div className="space-y-3">
                  {(selectedTask.steps || []).map((step, i) => (
                    <div key={step.id || i} className={`rounded-xl p-4 flex items-center space-x-4 opacity-60 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className={`line-through ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {completedTasks.length > 0 ? (
                  <div className="space-y-3">
                    {completedTasks.map(task => (
                      <button key={task.id} onClick={() => setSelectedTask(task)} className={`w-full rounded-xl p-4 flex items-center justify-between transition text-left ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>
                        <div className="flex items-center space-x-4">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{task.title}</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No completed tasks yet!</p>
                    <p className="text-sm mt-2">Finish your first task to see it archived here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
