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
 * Email providers a typo is corrected to, most used first (a tie goes to the earlier one).
 * `googlemail.com` and the rest are real; they're here so a near miss of them isn't "fixed".
 */
const EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'icloud.com', 'hotmail.com', 'outlook.com', 'aol.com', 'live.com', 'msn.com',
  'me.com', 'mac.com', 'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net', 'ymail.com',
  'protonmail.com', 'proton.me', 'googlemail.com',
];
/** Real domains, some with real mailboxes, close to a provider: never corrected, never suggested. */
const EMAIL_LOOKALIKES = new Set([
  'mail.com', 'email.com', 'cloud.com', 'gmx.com', 'gmx.net', 'aim.com', 'aon.com', 'hey.com', 'pm.me', 'duck.com',
  'zoho.com', 'protonmail.ch', 'proton.ch', 'ms.com', 'mi.com', 'love.com', 'line.com', 'life.com', 'mic.com', 'max.com',
]);
/** Providers this long can be two edits off; shorter ones sit near too many real domains (aon.com, ms.com). */
const LONG_PROVIDER = 9;
const LONG_PROVIDER_EDITS = 2;
/** Providers with country domains (hotmail.ca, yahoo.fr): their name with a 2-letter ending is left alone. */
const REGIONAL_PROVIDERS = new Set(['yahoo', 'hotmail', 'outlook', 'live', 'msn']);
/** Endings that aren't real and sit one key from a common one. None of these is a real top-level domain. */
const TLD_TYPOS: Record<string, string> = {
  con: 'com', cpm: 'com', cmo: 'com', ocm: 'com', vom: 'com', xom: 'com', cim: 'com', clm: 'com', ckm: 'com', cok: 'com', comm: 'com', coom: 'com',
  nte: 'net', ner: 'net', nrt: 'net', nwt: 'net',
  ogr: 'org', orh: 'org', prg: 'org', irg: 'org', rog: 'org',
  edi: 'edu', eud: 'edu', wdu: 'edu', rdu: 'edu',
};

/** Whether `a` is `b` with two neighbors swapped ("mns" for "msn"). */
function isSwap(a: string, b: string): boolean {
  if (a.length !== b.length || a === b) return false;
  const i = [...a].findIndex((ch, k) => ch !== b[k]);
  return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
}

/** Edits from `a` to `b`, a swap of two neighbors counting as one ("hotmial" → "hotmail" is 1). */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * The address they probably meant when the domain looks mistyped ("maya@gmail.con" →
 * "maya@gmail.com"), or null. A typo there sends the save link nowhere, and nobody finds out
 * (a sign-up from a campus flyer, 2026-11). Only suggests: they can keep what they typed.
 */
export function suggestEmail(typed: string): string | null {
  const address = typed.trim();
  const at = address.lastIndexOf('@');
  if (at < 1) return null;
  const local = address.slice(0, at);
  const typedDomain = address.slice(at + 1).toLowerCase();
  // A dot left at the end ("gmail.com.") is a typo too.
  const domain = typedDomain.replace(/\.+$/, '');
  if (!domain.includes('.')) return null;
  // Capitals in a domain don't matter, so "Gmail.com" gets no suggestion.
  const fixed = (to: string) => (to === typedDomain ? null : `${local}@${to}`);
  if (EMAIL_PROVIDERS.includes(domain) || EMAIL_LOOKALIKES.has(domain)) return fixed(domain);

  const dot = domain.indexOf('.');
  const [name, ending] = [domain.slice(0, dot), domain.slice(dot + 1)];
  let best: { to: string; distance: number } | null = null;
  for (const provider of EMAIL_PROVIDERS) {
    const distance = editDistance(domain, provider);
    if (best && distance >= best.distance) continue;
    if (provider.length >= LONG_PROVIDER) {
      if (distance > LONG_PROVIDER_EDITS) continue;
    } else {
      // A short one: only its name with two letters swapped (mns.com), or its ending one edit off (aol.co).
      const p = provider.indexOf('.');
      const [pName, pEnding] = [provider.slice(0, p), provider.slice(p + 1)];
      if (!(ending === pEnding && isSwap(name, pName)) && !(name === pName && editDistance(ending, pEnding) === 1)) continue;
    }
    // hotmail.ca and yahoo.co.uk are real; gmail.co isn't.
    if (provider.startsWith(`${name}.`) && REGIONAL_PROVIDERS.has(name) && /^(?:[a-z]{2}|(?:co|com)\.[a-z]{2})$/.test(ending)) continue;
    best = { to: provider, distance };
  }
  if (best) return fixed(best.to);

  const last = domain.lastIndexOf('.');
  const tld = TLD_TYPOS[domain.slice(last + 1)];
  return fixed(tld ? `${domain.slice(0, last)}.${tld}` : domain);
}

/** Save your passport's username box: its text, and whether that's a username of their own (typed, or waiting from before). */
export interface UsernameBox {
  text: string;
  own: boolean;
}

/**
 * An email typed or pasted into the username box, moved to the email box. `typed` is the box's new
 * text, `box` what it held just before, `start` what it held when this run of typing began (null
 * for a paste), `email` the email box. What was in the box before the email isn't part of it; a
 * username of their own stays (else one is suggested); an email box already holding the address,
 * completed, keeps it. `moved` is the address that moved.
 */
export function moveEmailFromUsername(typed: string, box: UsernameBox, start: UsernameBox | null, email: string) {
  const from = start ?? box;
  let before = '';
  if (from.text && typed.startsWith(from.text)) before = from.text;
  else if (box.text && typed.startsWith(box.text) && looksLikeEmail(typed.slice(box.text.length))) before = box.text;
  // Only when what's left is an email of its own ("maya_reyes" then "@" is one email, not two parts).
  if (!looksLikeEmail(typed.slice(before.length))) before = '';
  const moved = typed.slice(before.length);
  const kept = before && before === box.text && before !== from.text ? cleanUsername(before) : from.own ? from.text : null;
  const nextEmail = email && email.startsWith(moved) ? email : moved;
  const suggested = kept === null ? suggestUsername(nextEmail) : '';
  return { email: nextEmail, username: kept ?? suggested, own: kept !== null, moved, suggested: suggested !== '' };
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

/**
 * Beta Pro (Alex, 2026-10-15): during the beta every account, unsaved passports included, plans
 * without the free tier's monthly limit, so testers can try everything. It ends at the close of
 * December 31, 2026 in New York (EST, UTC−5): moved from November 15 (Alex, 2026-11-11) so finals
 * aren't on the free tier's 2 plans while nothing can be bought. The daily cap still holds for everyone.
 */
export const BETA_PRO_UNTIL = '2027-01-01T05:00:00Z';

export const inBetaPro = (now: Date = new Date()) => now.getTime() < Date.parse(BETA_PRO_UNTIL);

/** The free-plan window `now` falls in, for an account created at `createdAt` (ISO). */
export function planWindow(createdAt: string, now: Date = new Date()): { start: Date; end: Date } {
  const born = Date.parse(createdAt);
  const k = Number.isFinite(born) ? Math.max(0, Math.floor((now.getTime() - born) / PLAN_WINDOW_MS)) : 0;
  const start = Number.isFinite(born) ? born + k * PLAN_WINDOW_MS : now.getTime();
  return { start: new Date(start), end: new Date(start + PLAN_WINDOW_MS) };
}

/**
 * Where the free tier's count starts at `now`: its window's start, but never before beta Pro
 * ended, so plans made during the beta don't use up the free plans after it.
 */
export function freePlansCountFrom(createdAt: string, now: Date = new Date()): Date {
  return new Date(Math.max(planWindow(createdAt, now).start.getTime(), Date.parse(BETA_PRO_UNTIL)));
}

/** A Pro grant (`pro_grants`): Pro given without paying, for life unless it has an end. */
export type ProGrant = { reason: string; granted_at: string; ends_at: string | null };

/** Whether a grant counts at `now`: with no end, for life; with one, until that moment. */
export function proGrantActive(grant: Pick<ProGrant, 'ends_at'> | null | undefined, now: Date = new Date()): boolean {
  if (!grant) return false;
  if (grant.ends_at == null) return true;
  return Date.parse(grant.ends_at) > now.getTime();
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
