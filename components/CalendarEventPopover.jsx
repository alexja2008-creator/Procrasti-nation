'use client';

import Link from 'next/link';

export default function CalendarEventPopover({
  event,
  position,
  darkMode,
  editingDate,
  onDateChange,
  onSave,
  onClose,
  saving,
}) {
  const left = typeof window !== 'undefined' ? Math.min(position.x, window.innerWidth - 348) : position.x;
  const top = typeof window !== 'undefined' ? Math.min(position.y, window.innerHeight - 310) : position.y;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" onClick={onClose} />

      {/* Panel */}
      <div
        style={{ position: 'fixed', left, top, width: 320, zIndex: 60 }}
        className={`rounded-2xl shadow-2xl border p-5 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Step title */}
        <h3 className={`text-base font-bold mb-1 leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {event.stepTitle}
        </h3>

        {/* Estimated time badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full inline-block mb-3 ${
          darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
        }`}>
          ⏱️ {event.estimatedTime}
        </span>

        {/* Description */}
        {event.stepDescription && (
          <p className={`text-sm mb-3 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {event.stepDescription}
          </p>
        )}

        {/* Parent task link */}
        <Link
          href={`/planner?task=${event.taskId}`}
          onClick={onClose}
          className={`text-xs font-semibold block mb-4 ${
            darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'
          }`}
        >
          ↗ {event.taskTitle}
        </Link>

        <div className={`border-t mb-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />

        {/* Date override */}
        <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Scheduled date
        </label>
        <input
          type="date"
          value={editingDate}
          onChange={(e) => onDateChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 focus:outline-none transition-colors ${
            darkMode
              ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white'
              : 'bg-white border-slate-300 focus:border-emerald-500 text-slate-900'
          }`}
        />

        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              darkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !editingDate}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save date'}
          </button>
        </div>
      </div>
    </>
  );
}
