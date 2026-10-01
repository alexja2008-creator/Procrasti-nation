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
