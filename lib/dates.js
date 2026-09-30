// Local-calendar date helpers. `toISOString()` is UTC, which shifts evening
// activity onto tomorrow's date for anyone west of Greenwich — use these instead.

// YYYY-MM-DD for the given moment in the user's local timezone.
export function localDateString(date = new Date()) {
  return date.toLocaleDateString('en-CA');
}

export function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
