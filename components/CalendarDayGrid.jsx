'use client';

import { TASK_COLORS } from './CalendarWeekGrid';

export default function CalendarDayGrid({ events, date, darkMode, onEventClick }) {
  const iso = date.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const isToday = iso === today;

  const dayEvents = events.filter(e => e.resolvedDate === iso);

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div>
      {/* Day header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${
        isToday ? (darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') : ''
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
            isToday ? 'bg-emerald-500 text-white' : (darkMode ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900')
          }`}>
            {date.getDate()}
          </div>
          <div>
            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {date.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          {dayEvents.length > 0 && (
            <span className={`ml-auto text-sm font-semibold px-3 py-1 rounded-full ${
              darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {dayEvents.length} step{dayEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Events list */}
      <div className="p-4 space-y-3 min-h-64">
        {dayEvents.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 text-center ${
            darkMode ? 'text-slate-600' : 'text-slate-300'
          }`}>
            <div className="text-4xl mb-3">🗓️</div>
            <p className={`font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Nothing scheduled
            </p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
              No steps are due on this day.
            </p>
          </div>
        ) : (
          dayEvents.map(event => {
            const color = TASK_COLORS[event.colorIndex];
            return (
              <button
                key={`${event.taskId}-${event.stepId}`}
                onClick={(e) => { e.stopPropagation(); onEventClick(event, e); }}
                className={`w-full text-left rounded-xl p-4 border-l-4 transition-all hover:scale-[1.01] ${
                  event.completed ? 'opacity-50' : ''
                } ${darkMode ? 'bg-slate-700/60 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}
                style={{ borderLeftColor: getBorderColor(event.colorIndex) }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm leading-snug ${
                      event.completed ? 'line-through' : ''
                    } ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {event.stepTitle}
                    </p>
                    {event.stepDescription && (
                      <p className={`text-xs mt-1 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {event.stepDescription}
                      </p>
                    )}
                    <p className={`text-xs mt-2 font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      ↗ {event.taskTitle}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${color.bg} ${color.text}`}>
                    ⏱️ {event.estimatedTime}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Map colorIndex to a CSS hex color for the border-left (can't use Tailwind dynamic classes)
const BORDER_COLORS = [
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
];

function getBorderColor(colorIndex) {
  return BORDER_COLORS[colorIndex % BORDER_COLORS.length];
}
