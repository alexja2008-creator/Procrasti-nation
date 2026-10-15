// Accounts: the password, username and name rules, the age check, and which plain words fit a Supabase Auth error.

import type { LocalDate } from './types.ts';

/** v1's rule and Supabase Auth's default. Older passwords of any length still sign in. */
export const MIN_PASSWORD_LENGTH = 6;

export const isLongEnoughPassword = (password: string) => password.length >= MIN_PASSWORD_LENGTH;

/** v1's usernames (public on `profiles`, unique ignoring case): 3–20 lowercase letters, digits or underscores. */
export const USERNAME_MAX = 20;
export const isValidUsername = (username: string) => /^[a-z0-9_]{3,20}$/.test(username);

/** What they type, as a username: lowercase, other characters dropped, cut at the limit. */
export const cleanUsername = (typed: string) =>
  typed
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, USERNAME_MAX);

/**
 * Typed into a username box, the start of an email ("dad@…"), not a handle like "@maya": Save
 * your passport moves it to the email box (a tired person types their email into the first box).
 */
export const looksLikeEmail = (typed: string) => /^[^\s@]+@/.test(typed.trim());

/**
 * A username suggested from an email: the part before the @ (and before any +tag), with dots and
 * dashes as underscores ("Dad.Smith+pn@gmail.com" → "dad_smith"); '' when that's too short for one.
 */
export function suggestUsername(email: string): string {
  const local = email.trim().split('@')[0].split('+')[0];
  const name = cleanUsername(local.replace(/[.\-\s]+/g, '_'))
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return isValidUsername(name) ? name : '';
}

/**
 * The name they go by, on their passport and Declarations (Alex, 2026-10-14: asked right after
 * Welcome, first name required). Kept in the auth profile's own fields, the ones Sign in with
 * Apple fills, so only they see it: never on `profiles`, which anyone can read.
 */
export const NAME_MAX = 40;

/** A name as it's kept: spaces trimmed and run together, cut at the limit. Cleaned on save, so typing "Mary Ann" keeps its space. */
export const cleanName = (typed: string) => typed.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

/** The auth profile's name fields for a first and an optional last name. An empty last name clears an old one (null removes it). */
export function nameMetadata(first: string, last = ''): { given_name: string; family_name: string | null; full_name: string } {
  const given = cleanName(first);
  const family = cleanName(last);
  return { given_name: given, family_name: family || null, full_name: [given, family].filter(Boolean).join(' ') };
}

/**
 * The age check before a passport (COPPA; the Terms say 13 and older): a date of birth, asked
 * without saying what age is needed, checked on the device and never kept or sent. A device that
 * fails stays turned away, so a different year can't just be typed in.
 */
export const MIN_AGE = 13;

const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** A date of birth as typed (month, day, year) as YYYY-MM-DD, or null unless it's a real day from 1900 to `today`. */
export function birthDateOf(month: string, day: string, year: string, today: LocalDate): LocalDate | null {
  if (!/^\d{1,2}$/.test(month.trim()) || !/^\d{1,2}$/.test(day.trim()) || !/^\d{4}$/.test(year.trim())) return null;
  const [m, d, y] = [Number(month), Number(day), Number(year)];
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  const born = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return born <= today ? born : null;
}

/** Whole years from `born` to `today` (both YYYY-MM-DD). A 29 February birthday counts on 1 March in other years. */
export function ageOn(born: LocalDate, today: LocalDate): number {
  const years = Number(today.slice(0, 4)) - Number(born.slice(0, 4));
  return today.slice(5) < born.slice(5) ? years - 1 : years;
}

export const isOldEnough = (born: LocalDate, today: LocalDate) => ageOn(born, today) >= MIN_AGE;

/**
 * A US or Canadian mobile number as typed ("(555) 234-5678", "+1 555 234 5678") in E.164
 * ("+15552345678"), or null. Texted codes go to those two countries only at first (SMS fraud).
 */
export function normalizePhone(typed: string): string | null {
  let digits = typed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  // North American numbers: neither the area code nor the exchange starts with 0 or 1.
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits) ? `+1${digits}` : null;
}

/** "+15552345678" → "(555) 234-5678". */
export function formatPhone(e164: string): string {
  const d = e164.replace(/^\+1/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}

/** The free tier: this many AI plans in each window, the windows counted from when the account was made. */
export const FREE_PLANS_PER_WINDOW = 2;
const PLAN_WINDOW_MS = 30.5 * 86_400_000;

/** The free-plan window `now` falls in, for an account created at `createdAt` (ISO). */
export function planWindow(createdAt: string, now: Date = new Date()): { start: Date; end: Date } {
  const born = Date.parse(createdAt);
  const k = Number.isFinite(born) ? Math.max(0, Math.floor((now.getTime() - born) / PLAN_WINDOW_MS)) : 0;
  const start = Number.isFinite(born) ? born + k * PLAN_WINDOW_MS : now.getTime();
  return { start: new Date(start), end: new Date(start + PLAN_WINDOW_MS) };
}

/** The keys of `voice.authErrors`. */
export type AuthErrorKind =
  | 'rateLimited'
  | 'offline'
  | 'staleLink'
  | 'wrongPassword'
  | 'unconfirmed'
  | 'tooShort'
  | 'samePassword'
  | 'otherDevice'
  | 'accountExists'
  | 'invalidEmail'
  | 'generic';

// Supabase Auth's error codes (stable), checked before its messages (wording can change).
const BY_CODE = new Map<string, AuthErrorKind>([
  ['invalid_credentials', 'wrongPassword'],
  ['email_not_confirmed', 'unconfirmed'],
  ['weak_password', 'tooShort'],
  ['same_password', 'samePassword'],
  ['over_request_rate_limit', 'rateLimited'],
  ['over_email_send_rate_limit', 'rateLimited'],
  ['otp_expired', 'staleLink'],
  ['flow_state_expired', 'staleLink'],
  ['flow_state_not_found', 'staleLink'],
  ['bad_code_verifier', 'staleLink'],
  ['pkce_code_verifier_not_found', 'otherDevice'],
  ['user_already_exists', 'accountExists'],
  ['email_exists', 'accountExists'],
  ['email_address_invalid', 'invalidEmail'],
]);

/** Which of `voice.authErrors` fits an error from Supabase Auth or the network. */
export function authErrorKind(error: { code?: unknown; message?: unknown } | null | undefined): AuthErrorKind {
  const byCode = typeof error?.code === 'string' ? BY_CODE.get(error.code) : undefined;
  if (byCode) return byCode;
  const message = typeof error?.message === 'string' ? error.message : '';
  if (/invalid login credentials/i.test(message)) return 'wrongPassword';
  if (/email not confirmed/i.test(message)) return 'unconfirmed';
  if (/password should be at least/i.test(message)) return 'tooShort';
  if (/different from the old password/i.test(message)) return 'samePassword';
  if (/code verifier not found/i.test(message)) return 'otherDevice';
  if (/already registered/i.test(message)) return 'accountExists';
  if (/rate limit|security purposes|too many/i.test(message)) return 'rateLimited';
  if (/network|failed to fetch|timed? ?out/i.test(message)) return 'offline';
  if (/expired|invalid.*(grant|flow|code)|code verifier|otp/i.test(message)) return 'staleLink';
  return 'generic';
}

/**
 * Supabase Auth failed on its side (a 5xx, such as its email provider refusing to send), not
 * because of anything the person typed or did. Saving a passport lets them in anyway.
 */
export function isServerFailure(error: { status?: unknown } | null | undefined): boolean {
  return typeof error?.status === 'number' && error.status >= 500 && error.status < 600;
}
