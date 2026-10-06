// Local-calendar date helpers, shared by iOS and web. `toISOString()` is UTC,
// which shifts evening activity onto tomorrow for anyone west of Greenwich, so
// never use it for calendar dates. Formatting is done by hand (no Intl) so the
// output is identical on Hermes, every browser and the server.

const pad = (n: number) => String(n).padStart(2, '0');

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** YYYY-MM-DD for the given moment in the device's local timezone. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * The user's "today", honoring their day-rollover hour: a night owl with
 * rollover 3 is still on Tuesday at 2am Wednesday.
 */
export function logicalDateString(date: Date = new Date(), rolloverHour = 0): string {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - rolloverHour);
  return localDateString(shifted);
}

/** Local midnight of a YYYY-MM-DD string. */
export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ymd: string, days: number): string {
  const date = parseLocalDate(ymd);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

/** "WED · 30 SEP", the mono date label on Today. */
export function formatDayLabel(date: Date = new Date()): string {
  return `${WEEKDAYS[date.getDay()]} · ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "9 AM", "7:30 PM": `formatTime` without the ":00" on the hour. */
export function formatTimeShort(hour: number, minute: number): string {
  return `${hour % 12 || 12}${minute ? `:${pad(minute)}` : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** ISO timestamp for a local calendar day at a clock time. */
export function atLocalTime(ymd: string, hour: number, minute: number): string {
  const d = parseLocalDate(ymd);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** The local clock time of an ISO timestamp. */
export function clockOf(iso: string): { hour: number; minute: number } {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

/** "14 SEP · 2026", the date on a stamp's rim. */
export function formatStampDate(date: Date): string {
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} · ${date.getFullYear()}`;
}

/** "2:00 PM". */
export function formatTime(date: Date): string {
  const h = date.getHours();
  return `${h % 12 || 12}:${pad(date.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

const DAY_NAMES: Record<string, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};

/**
 * Plain-English label for the RRULEs quick add produces ("Every day",
 * "Every weekday", "Every 2 weeks on Mon, Thu"). Unknown shapes get "Repeats".
 */
export function describeRRule(rrule: string): string {
  const parts = Object.fromEntries(
    rrule.replace(/^RRULE:/, '').split(';').map((p) => p.split('=') as [string, string]),
  );
  const interval = Number(parts.INTERVAL || 1);
  const unit = ({ DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' } as Record<string, string>)[parts.FREQ];
  if (!unit) return 'Repeats';

  const every = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
  if (parts.FREQ !== 'WEEKLY' || !parts.BYDAY) return every;

  const days = parts.BYDAY.split(',');
  if (interval === 1 && days.length === 5 && !days.includes('SA') && !days.includes('SU')) return 'Every weekday';
  return `${every} on ${days.map((d) => DAY_NAMES[d] ?? d).join(', ')}`;
}

// ---------------------------------------------------------------------------
// Day arithmetic and labels

const titleCase = (s: string) => s[0] + s.slice(1).toLowerCase();

/** Whole days from `a` to `b` (negative if `b` is earlier). DST-safe. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000);
}

/** Same day-of-month `months` later, clamped to the month's length (Jan 31 + 1 → Feb 28). */
export function addMonthsClamped(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return localDateString(target);
}

/** "Fri 9 Oct". */
export function formatShortDate(ymd: string): string {
  const d = parseLocalDate(ymd);
  return `${titleCase(WEEKDAYS[d.getDay()])} ${d.getDate()} ${titleCase(MONTHS[d.getMonth()])}`;
}

/** "Today", "Tomorrow", "Yesterday", "Fri" (within the coming week) or "Fri 9 Oct". */
export function relativeDayLabel(ymd: string, today: string): string {
  const diff = daysBetween(today, ymd);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return titleCase(WEEKDAYS[parseLocalDate(ymd).getDay()]);
  return formatShortDate(ymd);
}

// ---------------------------------------------------------------------------
// Recurrence (the RRULE subset quick add produces)

const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseRRule(rrule: string) {
  const parts = Object.fromEntries(
    rrule.replace(/^RRULE:/, '').split(';').map((p) => p.split('=') as [string, string]),
  );
  return {
    freq: parts.FREQ as string | undefined,
    interval: Math.max(1, Number(parts.INTERVAL || 1)),
    byDay: parts.BYDAY ? parts.BYDAY.split(',').map((d) => RRULE_DAYS.indexOf(d)).filter((d) => d >= 0) : null,
  };
}

/** Monday of the week containing `ymd` (RRULE weeks start on Monday). */
function weekStart(ymd: string): string {
  return addDays(ymd, -((parseLocalDate(ymd).getDay() + 6) % 7));
}

/**
 * The first date on or after `date` in the series that starts at `anchor`.
 * Supports FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with INTERVAL, and BYDAY for WEEKLY.
 */
export function occurrenceOnOrAfter(rrule: string, anchor: string, date: string): string {
  const { freq, interval, byDay } = parseRRule(rrule);
  const start = date < anchor ? anchor : date;

  if (freq === 'DAILY' || (freq === 'WEEKLY' && !byDay)) {
    const step = freq === 'DAILY' ? interval : 7 * interval;
    return addDays(anchor, Math.ceil(daysBetween(anchor, start) / step) * step);
  }
  if (freq === 'WEEKLY' && byDay) {
    const anchorWeek = weekStart(anchor);
    for (let i = 0; i < 7 * interval + 7; i++) {
      const d = addDays(start, i);
      const weeks = daysBetween(anchorWeek, weekStart(d)) / 7;
      if (byDay.includes(parseLocalDate(d).getDay()) && weeks % interval === 0) return d;
    }
  }
  if (freq === 'MONTHLY' || freq === 'YEARLY') {
    const step = freq === 'MONTHLY' ? interval : 12 * interval;
    for (let k = 0; ; k++) {
      const d = addMonthsClamped(anchor, k * step);
      if (d >= start) return d;
    }
  }
  return start;
}

/** The next occurrence strictly after `after` (skips any missed ones, like Reminders does). */
export function nextOccurrence(rrule: string, anchor: string, after: string): string {
  return occurrenceOnOrAfter(rrule, anchor, addDays(after, 1));
}

/** `relativeDayLabel` for mid-sentence use: "today", "tomorrow", "yesterday", "Fri", "Fri 9 Oct". */
export function relativeDayPhrase(ymd: string, today: string): string {
  const label = relativeDayLabel(ymd, today);
  return ['Today', 'Tomorrow', 'Yesterday'].includes(label) ? label.toLowerCase() : label;
}
