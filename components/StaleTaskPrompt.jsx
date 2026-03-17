'use client';

import Link from 'next/link';
import { AlertTriangle, Plus, Zap } from 'lucide-react';

/**
 * Actionable empty-state component. Surfaces stale tasks (in_progress, 24h+ old,
 * 0 completed steps) instead of showing a blank "nothing here" message.
 *
 * Props:
 * - tasks: full array of user tasks (all statuses)
 * - darkMode: boolean from useTheme()
 * - compact: optional boolean for inline usage (focus-pods sidebar)
 */
export default function StaleTaskPrompt({ tasks = [], darkMode, compact = false }) {
  const staleTasks = tasks.filter((t) => {
    if (t.status !== 'in_progress') return false;
    if ((t.completed_steps || 0) > 0) return false;
    const ageMs = Date.now() - new Date(t.created_at).getTime();
    return ageMs >= 24 * 60 * 60 * 1000;
  });

  const activeInProgress = tasks.filter((t) => t.status === 'in_progress');

  // Case 1: stale tasks exist
  if (staleTasks.length > 0) {
    const display = staleTasks.slice(0, 3);
    return (
      <div className={`rounded-2xl p-6 border transition-colors ${
        darkMode ? 'bg-amber-900/10 border-amber-800/50' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {staleTasks.length === 1
              ? 'You have a task collecting dust'
              : `You have ${staleTasks.length} tasks collecting dust`}
          </h3>
        </div>
        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Pick one to tackle — the hardest part is starting.
        </p>
        <div className="space-y-2">
          {display.map((task) => (
            <Link
              key={task.id}
              href={task.total_steps > 0 ? `/planner?task=${task.id}` : `/planner?prefill=${encodeURIComponent(task.title)}&taskId=${task.id}`}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'
              }`}
            >
              <span className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {task.title}
              </span>
              <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${
                darkMode ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {task.total_steps > 0 ? 'Continue' : 'Generate plan'} →
              </span>
            </Link>
          ))}
        </div>
        {staleTasks.length > 3 && (
          <p className={`text-xs mt-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            + {staleTasks.length - 3} more waiting in your dashboard
          </p>
        )}
      </div>
    );
  }

  // Case 2: tasks exist but none are stale — everything has momentum
  if (activeInProgress.length > 0) {
    return (
      <div className={`rounded-2xl p-6 border text-center transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <p className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          All your tasks have momentum.
        </p>
        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nice work — keep it going.</p>
        <Link
          href="/planner"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Plan something new
        </Link>
      </div>
    );
  }

  // Case 3: no tasks at all
  return (
    <div className={`rounded-2xl p-6 border text-center transition-colors ${
      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <Zap className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
      <p className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        No tasks yet.
      </p>
      <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Your first step to productivity starts here.
      </p>
      <Link
        href="/planner"
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm"
      >
        <Zap className="w-4 h-4" />
        Create your first task
      </Link>
    </div>
  );
}
