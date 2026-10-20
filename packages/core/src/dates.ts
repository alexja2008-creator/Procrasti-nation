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
 * The user's "today", honoring their day-rollover hour: someone with
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
  if (parts.FREQ === 'MONTHLY') {
    const which = monthlyWhich(rrule);
    return which ? `${every} on ${which}` : every;
  }
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

/**
 * An RRULE's frequency, interval and weekdays (0 = Sunday). A monthly repeat
 * keeps its day in the rule (Alex's plan, 2026-10-20), so checking it off can't
 * slide it: `monthDays` (BYMONTHDAY=1,15; -1 is the last day) or `nth`
 * (BYDAY=3TU is the third Tuesday, -1FR the last Friday).
 */
export function parseRRule(rrule: string) {
  const parts = Object.fromEntries(
    rrule.replace(/^RRULE:/, '').split(';').map((p) => p.split('=') as [string, string]),
  );
  const nth = /^(-1|[1-4])(SU|MO|TU|WE|TH|FR|SA)$/.exec(parts.BYDAY ?? '');
  const monthDays = parts.BYMONTHDAY
    ? parts.BYMONTHDAY.split(',').map(Number).filter((d) => d === -1 || (Number.isInteger(d) && d >= 1 && d <= 31))
    : [];
  return {
    freq: parts.FREQ as string | undefined,
    interval: Math.max(1, Number(parts.INTERVAL || 1)),
    byDay: parts.BYDAY && !nth ? parts.BYDAY.split(',').map((d) => RRULE_DAYS.indexOf(d)).filter((d) => d >= 0) : null,
    monthDays: monthDays.length ? monthDays : null,
    nth: nth ? { n: Number(nth[1]), day: RRULE_DAYS.indexOf(nth[2]) } : null,
  };
}

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** A month day in a given month: -1 is its last day, and a day past its end lands on the last day (the 31st in November is the 30th). */
function monthDayIn(year: number, month: number, day: number): string {
  const last = daysInMonth(year, month);
  return localDateString(new Date(year, month, day === -1 || day > last ? last : day));
}

/** The nth weekday of a month (n 1–4), or its last (n -1). */
function nthWeekdayIn(year: number, month: number, n: number, weekday: number): string {
  if (n === -1) {
    const last = new Date(year, month, daysInMonth(year, month));
    last.setDate(last.getDate() - ((last.getDay() - weekday + 7) % 7));
    return localDateString(last);
  }
  const first = new Date(year, month, 1);
  first.setDate(1 + ((weekday - first.getDay() + 7) % 7) + 7 * (n - 1));
  return localDateString(first);
}

const ORDINAL_WORDS: Record<number, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' };
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "1st", "2nd", "23rd", "11th". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** A monthly repeat's day in words: "the 1st and 15th", "the last day", "the third Tuesday"; null when it has none. */
export function monthlyWhich(rrule: string): string | null {
  const { monthDays, nth } = parseRRule(rrule);
  if (nth) return `the ${ORDINAL_WORDS[nth.n]} ${WEEKDAY_NAMES[nth.day]}`;
  if (!monthDays) return null;
  const days = monthDays.map((d) => (d === -1 ? 'last day' : ordinal(d)));
  return `the ${days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : days[0]}`;
}

/** A plain monthly repeat with its start day written in ("FREQ=MONTHLY" → "FREQ=MONTHLY;BYMONTHDAY=20"), so it never slides. */
export function pinMonthDay(rrule: string, day: string): string {
  const { freq, monthDays, nth } = parseRRule(rrule);
  if (freq !== 'MONTHLY' || monthDays || nth) return rrule;
  return `${rrule};BYMONTHDAY=${parseLocalDate(day).getDate()}`;
}

/** Monday of the week containing `ymd` (RRULE weeks start on Monday). */
function weekStart(ymd: string): string {
  return addDays(ymd, -((parseLocalDate(ymd).getDay() + 6) % 7));
}

/**
 * The first date on or after `date` in the series that starts at `anchor`.
 * Supports FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with INTERVAL, BYDAY for WEEKLY, and
 * BYMONTHDAY or a numbered BYDAY (3TU, -1FR) for MONTHLY.
 */
export function occurrenceOnOrAfter(rrule: string, anchor: string, date: string): string {
  const { freq, interval, byDay, monthDays, nth } = parseRRule(rrule);
  const start = date < anchor ? anchor : date;

  if (freq === 'MONTHLY' && (monthDays || nth)) {
    // Months count from the anchor's, every `interval` of them.
    const a = parseLocalDate(anchor);
    for (let k = 0; k < 1200; k++) {
      const month = new Date(a.getFullYear(), a.getMonth() + k * interval, 1);
      const days = nth
        ? [nthWeekdayIn(month.getFullYear(), month.getMonth(), nth.n, nth.day)]
        : monthDays!.map((d) => monthDayIn(month.getFullYear(), month.getMonth(), d)).sort();
      const found = days.find((d) => d >= start);
      if (found) return found;
    }
  }

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

/** A repeat's days from `from` through `until`, for the series that starts at `anchor`. Reminders and Upcoming share it. */
export function occurrencesBetween(rrule: string, anchor: string, from: string, until: string): string[] {
  const days: string[] = [];
  let day = occurrenceOnOrAfter(rrule, anchor, from > anchor ? from : anchor);
  while (day <= until) {
    days.push(day);
    const next = nextOccurrence(rrule, anchor, day);
    if (next <= day) break;
    day = next;
  }
  return days;
}

/** `relativeDayLabel` for mid-sentence use: "today", "tomorrow", "yesterday", "Fri", "Fri 9 Oct". */
export function relativeDayPhrase(ymd: string, today: string): string {
  const label = relativeDayLabel(ymd, today);
  return ['Today', 'Tomorrow', 'Yesterday'].includes(label) ? label.toLowerCase() : label;
}
