'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import CalendarWeekGrid, { getWeekStart, hashTaskId, TASK_COLORS } from '../../components/CalendarWeekGrid';
import CalendarMonthGrid from '../../components/CalendarMonthGrid';
import CalendarDayGrid from '../../components/CalendarDayGrid';
import CalendarEventPopover from '../../components/CalendarEventPopover';
import StaleTaskPrompt from '../../components/StaleTaskPrompt';

// ── Date helpers ──────────────────────────────────────────────────────────────

function shiftWeek(date, dir) {
  const d = new Date(date);
  d.setDate(d.getDate() + dir * 7);
  return d;
}

function shiftMonth(date, dir) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + dir);
  return d;
}

function formatWeekRange(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  const startStr = weekStart.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', opts);
  const year = end.getFullYear();
  return `${startStr} – ${endStr}, ${year}`;
}

function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { darkMode } = useTheme();
  const { user, loading: authLoading } = useAuth();

  // Data
  const [tasks, setTasks] = useState([]);
  const [stepDates, setStepDates] = useState({}); // { taskId: { "stepId": "YYYY-MM-DD" } }
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [resolvingTaskIds, setResolvingTaskIds] = useState(new Set());

  // View
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Popover
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [editingDate, setEditingDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  // ── Fetch tasks ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { setLoadingTasks(false); return; }
    (async () => {
      setLoadingTasks(true);
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress');

      const loaded = data || [];
      setTasks(loaded);

      // Seed from cached step_dates in DB
      const initial = {};
      for (const task of loaded) {
        if (task.step_dates) initial[task.id] = task.step_dates;
      }
      setStepDates(initial);
      setLoadingTasks(false);
    })();
  }, [user]);

  // ── Resolve missing step dates ──────────────────────────────────────────────

  useEffect(() => {
    if (tasks.length === 0) return;
    resolveAllStepDates();
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  async function resolveAllStepDates() {
    const today = new Date().toISOString().split('T')[0];

    for (const task of tasks) {
      const existingDates = task.step_dates || {};
      const stepsNeedingDates = (task.steps || []).filter(
        s => !existingDates[String(s.id)]
      );
      if (stepsNeedingDates.length === 0) continue;

      setResolvingTaskIds(prev => new Set([...prev, task.id]));

      try {
        const res = await fetch('/api/resolve-step-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: stepsNeedingDates.map(s => ({ id: s.id, title: s.title, when: s.when })),
            dueDate: task.due_date
              ? new Date(task.due_date).toISOString().split('T')[0]
              : null,
            deadline: null,
            today,
          }),
        });

        const data = await res.json();
        if (!data.dates || data.dates.length !== stepsNeedingDates.length) continue;

        const newDates = {};
        stepsNeedingDates.forEach((step, i) => {
          newDates[String(step.id)] = data.dates[i];
        });

        const merged = { ...existingDates, ...newDates };

        // Persist to Supabase
        await supabase.from('tasks').update({ step_dates: merged }).eq('id', task.id);

        // Update local state
        setStepDates(prev => ({ ...prev, [task.id]: merged }));
      } catch (err) {
        console.error('[calendar resolve]', task.id, err);
      } finally {
        setResolvingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    }
  }

  // ── Derive events ───────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const result = [];
    for (const task of tasks) {
      const taskDates = stepDates[task.id] || {};
      const colorIndex = hashTaskId(task.id);
      for (const step of (task.steps || [])) {
        const resolvedDate = taskDates[String(step.id)];
        if (!resolvedDate) continue;
        result.push({
          taskId: task.id,
          taskTitle: task.title,
          stepId: step.id,
          stepTitle: step.title,
          stepDescription: step.description || '',
          estimatedTime: step.estimatedTime || '',
          resolvedDate,
          completed: step.completed || false,
          colorIndex,
        });
      }
    }
    return result;
  }, [tasks, stepDates]);

  // ── Event interaction ───────────────────────────────────────────────────────

  const handleDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleEventClick = (event, domEvent) => {
    domEvent.stopPropagation();
    setSelectedEvent(event);
    setEditingDate(event.resolvedDate);
    setPopoverPos({ x: domEvent.clientX + 8, y: domEvent.clientY + 8 });
  };

  const handleSaveDate = async () => {
    if (!selectedEvent || !editingDate) return;
    setSavingDate(true);
    const { taskId, stepId } = selectedEvent;
    const updated = { ...(stepDates[taskId] || {}), [String(stepId)]: editingDate };
    setStepDates(prev => ({ ...prev, [taskId]: updated }));
    await supabase.from('tasks').update({ step_dates: updated }).eq('id', taskId);
    setSavingDate(false);
    setSelectedEvent(null);
  };

  // ── Derived view values ─────────────────────────────────────────────────────

  const weekStart = getWeekStart(currentDate);

  const handlePrev = () => setCurrentDate(d => {
    if (view === 'day') { const n = new Date(d); n.setDate(n.getDate() - 1); return n; }
    if (view === 'week') return shiftWeek(d, -1);
    return shiftMonth(d, -1);
  });
  const handleNext = () => setCurrentDate(d => {
    if (view === 'day') { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }
    if (view === 'week') return shiftWeek(d, +1);
    return shiftMonth(d, +1);
  });
  const handleToday = () => setCurrentDate(new Date());

  const periodLabel = view === 'day'
    ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : view === 'week'
      ? formatWeekRange(weekStart)
      : formatMonthYear(currentDate);

  // ── Signed-out state ────────────────────────────────────────────────────────

  if (!authLoading && !user) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Navigation />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <CalendarDays className={`w-16 h-16 mx-auto mb-6 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <h2 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Sign in to view your calendar
          </h2>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Your step schedule will appear here once you have active tasks.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Calendar
            </h1>
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Your task steps, scheduled day by day
            </p>
          </div>

          {/* View toggle */}
          <div className={`flex rounded-xl overflow-hidden border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            {['day', 'week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                  view === v
                    ? 'bg-emerald-600 text-white'
                    : darkMode
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar card */}
        <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

          {/* Nav bar */}
          <div className={`flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrev}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <span className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {periodLabel}
            </span>

            <div className="flex items-center space-x-2 min-w-[140px] justify-end">
              {resolvingTaskIds.size > 0 && (
                <div className={`flex items-center space-x-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling {resolvingTaskIds.size} task{resolvingTaskIds.size > 1 ? 's' : ''}…</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          {loadingTasks ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
          ) : view === 'day' ? (
            <CalendarDayGrid
              events={events}
              date={currentDate}
              darkMode={darkMode}
              onEventClick={handleEventClick}
            />
          ) : view === 'week' ? (
            <CalendarWeekGrid
              events={events}
              weekStart={weekStart}
              darkMode={darkMode}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          ) : (
            <CalendarMonthGrid
              events={events}
              month={currentDate.getMonth()}
              year={currentDate.getFullYear()}
              darkMode={darkMode}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
        </div>

        {/* Empty state — no tasks at all */}
        {!loadingTasks && tasks.length === 0 && (
          <div className="mt-12">
            <StaleTaskPrompt tasks={[]} darkMode={darkMode} />
          </div>
        )}

        {/* Empty state — tasks exist but no events resolved yet (and not currently resolving) */}
        {!loadingTasks && tasks.length > 0 && events.length === 0 && resolvingTaskIds.size === 0 && (
          <div className={`text-center mt-8 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            No steps scheduled this period. Try navigating to a different week, or check the <a href="/planner" className={darkMode ? 'text-emerald-400 hover:underline' : 'text-emerald-600 hover:underline'}>Planner</a> for tasks that need step dates.
          </div>
        )}

        {/* Task color legend */}
        {!loadingTasks && tasks.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tasks.map(task => {
              const color = TASK_COLORS[hashTaskId(task.id)];
              return (
                <span
                  key={task.id}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}
                >
                  {task.title}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Popover */}
      {selectedEvent && (
        <CalendarEventPopover
          event={selectedEvent}
          position={popoverPos}
          darkMode={darkMode}
          editingDate={editingDate}
          onDateChange={setEditingDate}
          onSave={handleSaveDate}
          onClose={() => setSelectedEvent(null)}
          saving={savingDate}
        />
      )}
    </div>
  );
}
