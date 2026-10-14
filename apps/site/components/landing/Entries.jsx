import Land from './Land';
import RoundStamp from './RoundStamp';

// The smaller features as entries on an open passport's visa pages, each with its own stamp.
const PAGES = [
  [
    {
      label: 'REMINDERS',
      title: 'Reminders in your tone',
      body: 'At the time you set, in your browser now and on iPhone with the app. Start five minutes right from the notification.',
      stamp: { ink: 'var(--stamp-terracotta)', lines: ['RINGS', 'ON TIME'], date: 'START · 5 MIN', tilt: -9 },
    },
    {
      label: 'NOTES',
      title: 'Notes that become tasks',
      body: 'Lecture notes, packing lists, ideas. Any line can turn into a checkbox that’s a real task on your day.',
      stamp: { ink: 'var(--stamp-violet)', lines: ['NOTED', 'TASKED'], date: 'ANY LINE', tilt: 7 },
    },
  ],
  [
    {
      label: 'TERRITORIES',
      title: 'Territories',
      body: 'School, work, home. Everything filed where it belongs, and Customs holds whatever you haven’t sorted yet.',
      stamp: { ink: 'var(--stamp-forest)', lines: ['CLEARED', 'CUSTOMS'], date: 'ALL FILED', tilt: 5 },
    },
    {
      label: 'NEVER OVERDUE',
      title: 'Never “overdue”',
      body: 'Missed days roll forward kindly. Nothing here calls you lazy, because shame is what keeps people stuck.',
      stamp: { ink: 'var(--accent)', lines: ['NO LATE', 'FEES'], date: 'ROLLS FORWARD', tilt: -6 },
    },
  ],
];

export default function Entries() {
  return (
    <div className="passport-spread mt-16">
      {PAGES.map((entries, page) => (
        <div key={page} className="passport-page">
          <p className="page-head">ENTRIES · ENTRÉES</p>
          {entries.map((entry, i) => {
            const n = page * entries.length + i + 1;
            return (
              <div key={entry.label} className="entry">
                <div>
                  <p className="font-mono-pn text-sm" style={{ color: 'var(--accent)' }}>
                    ENTRY {String(n).padStart(2, '0')} · {entry.label}
                  </p>
                  <h3 className="font-display mt-2 text-2xl leading-snug">{entry.title}</h3>
                  <p className="mt-2 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{entry.body}</p>
                </div>
                {/* Pages side by side on a laptop: the right page's stamps come down a beat after the left's. */}
                <Land tilt={entry.stamp.tilt} delay={page * 160} className="entry-stamp">
                  <RoundStamp ink={entry.stamp.ink} lines={entry.stamp.lines} date={entry.stamp.date} size={104} />
                </Land>
              </div>
            );
          })}
          <p className="page-num">{String(page + 6).padStart(2, '0')}</p>
        </div>
      ))}
    </div>
  );
}
