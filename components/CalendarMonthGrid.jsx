'use client';

import { TASK_COLORS, EventChip } from './CalendarWeekGrid';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarMonthGrid({ events, month, year, darkMode, onEventClick }) {
  const today = new Date().toISOString().split('T')[0];

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0=Sun
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday-first

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);

  return (
    <div>
      {/* Day name headers */}
      <div className={`grid grid-cols-7 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        {WEEKDAYS.map(name => (
          <div
            key={name}
            className={`py-2 text-center text-xs font-semibold uppercase tracking-wide border-r last:border-r-0 ${
              darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) {
            return (
              <div
                key={`empty-${i}`}
                className={`min-h-20 border-r border-b last:border-r-0 ${
                  darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50/60'
                }`}
              />
            );
          }

          const iso = day.toISOString().split('T')[0];
          const isToday = iso === today;
          const dayEvents = events.filter(e => e.resolvedDate === iso);
          const overflow = dayEvents.length > 3;

          return (
            <div
              key={iso}
              className={`min-h-20 p-1 border-r border-b last:border-r-0 ${
                darkMode ? 'border-slate-700' : 'border-slate-200'
              } ${isToday ? (darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') : ''}`}
            >
              {/* Date number */}
              <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday
                  ? 'bg-emerald-500 text-white'
                  : darkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {day.getDate()}
              </div>

              {/* Events (max 3) */}
              {dayEvents.slice(0, 3).map(event => (
                <EventChip
                  key={`${event.taskId}-${event.stepId}`}
                  event={event}
                  compact
                  darkMode={darkMode}
                  onClick={onEventClick}
                />
              ))}

              {overflow && (
                <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
