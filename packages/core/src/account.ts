// Accounts: the password and username rules, and which plain words fit a Supabase Auth error.

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
