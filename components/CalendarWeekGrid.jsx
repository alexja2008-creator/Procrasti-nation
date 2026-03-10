'use client';

export const TASK_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-blue-500',    text: 'text-white' },
  { bg: 'bg-violet-500',  text: 'text-white' },
  { bg: 'bg-amber-500',   text: 'text-white' },
  { bg: 'bg-rose-500',    text: 'text-white' },
  { bg: 'bg-teal-500',    text: 'text-white' },
  { bg: 'bg-orange-500',  text: 'text-white' },
  { bg: 'bg-cyan-500',    text: 'text-white' },
];

export function hashTaskId(taskId) {
  let hash = 5381;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) + hash) + taskId.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % TASK_COLORS.length;
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function EventChip({ event, compact = false, darkMode, onClick }) {
  const color = TASK_COLORS[event.colorIndex];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event, e); }}
      className={`w-full text-left rounded px-1.5 py-0.5 mb-0.5 text-xs font-medium truncate transition-opacity
        ${event.completed ? 'opacity-40 line-through' : 'hover:opacity-90'}
        ${color.bg} ${color.text}`}
      title={`${event.stepTitle} · ${event.estimatedTime}`}
    >
      {compact ? event.stepTitle : `${event.stepTitle} · ${event.estimatedTime}`}
    </button>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayISO = () => new Date().toISOString().split('T')[0];

export default function CalendarWeekGrid({ events, weekStart, darkMode, onEventClick }) {
  const today = todayISO();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      {/* Day headers */}
      <div className={`grid grid-cols-7 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {days.map((day, i) => {
          const iso = day.toISOString().split('T')[0];
          const isToday = iso === today;
          return (
            <div
              key={iso}
              className={`py-3 text-center border-r last:border-r-0 ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              } ${isToday ? (darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') : ''}`}
            >
              <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {WEEKDAYS[i]}
              </div>
              <div className={`text-lg font-bold w-9 h-9 mx-auto flex items-center justify-center rounded-full ${
                isToday
                  ? 'bg-emerald-500 text-white'
                  : darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event columns */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = day.toISOString().split('T')[0];
          const isToday = iso === today;
          const dayEvents = events.filter(e => e.resolvedDate === iso);
          return (
            <div
              key={iso}
              className={`min-h-32 p-1.5 border-r last:border-r-0 ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              } ${isToday ? (darkMode ? 'bg-emerald-900/10' : 'bg-emerald-50/60') : ''}`}
            >
              {dayEvents.map(event => (
                <EventChip
                  key={`${event.taskId}-${event.stepId}`}
                  event={event}
                  darkMode={darkMode}
                  onClick={onEventClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
