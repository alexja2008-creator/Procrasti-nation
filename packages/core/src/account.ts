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

/** How long a new account's Pro trial runs (v1: `trial_ends_at` set at sign-up). */
export const TRIAL_DAYS = 10;

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
