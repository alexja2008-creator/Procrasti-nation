import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ageOn,
  authErrorKind,
  birthDateOf,
  cleanName,
  cleanUsername,
  looksLikeEmail,
  isLongEnoughPassword,
  isOldEnough,
  isServerFailure,
  isValidUsername,
  suggestUsername,
  MIN_AGE,
  MIN_PASSWORD_LENGTH,
  NAME_MAX,
  nameMetadata,
} from '../src/account.ts';

test('passwords need six characters, like v1', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 6);
  assert.equal(isLongEnoughPassword('12345'), false);
  assert.equal(isLongEnoughPassword('123456'), true);
});

test("usernames follow v1's rule", () => {
  assert.equal(isValidUsername('alex_j'), true);
  assert.equal(isValidUsername('ab'), false, 'three at least');
  assert.equal(isValidUsername('a'.repeat(21)), false, 'twenty at most');
  assert.equal(isValidUsername('Alex'), false, 'lowercase only');
  assert.equal(isValidUsername('alex j'), false);
  assert.equal(cleanUsername('Alex J.'), 'alexj');
  assert.equal(cleanUsername('@Maya_Reyes!'), 'maya_reyes');
  assert.equal(cleanUsername('é-élan'), 'lan', 'letters outside a–z go');
  assert.equal(cleanUsername('x'.repeat(30)).length, 20);
});

test("Supabase Auth's codes decide first", () => {
  assert.equal(authErrorKind({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'wrongPassword');
  assert.equal(authErrorKind({ code: 'email_not_confirmed', message: 'Email not confirmed' }), 'unconfirmed');
  assert.equal(authErrorKind({ code: 'weak_password', message: 'Password should be at least 6 characters.' }), 'tooShort');
  assert.equal(authErrorKind({ code: 'same_password', message: 'New password should be different from the old password.' }), 'samePassword');
  assert.equal(authErrorKind({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }), 'rateLimited');
  assert.equal(authErrorKind({ code: 'flow_state_not_found', message: 'invalid flow state, no valid flow state found' }), 'staleLink');
  assert.equal(authErrorKind({ code: 'pkce_code_verifier_not_found', message: 'PKCE code verifier not found in storage.' }), 'otherDevice');
  assert.equal(authErrorKind({ code: 'user_already_exists', message: 'User already registered' }), 'accountExists');
  assert.equal(authErrorKind({ code: 'email_address_invalid', message: 'Email address "a@b.c" is invalid' }), 'invalidEmail');
});

test('without a code, the message decides', () => {
  assert.equal(authErrorKind({ message: 'Invalid login credentials' }), 'wrongPassword');
  assert.equal(authErrorKind({ message: 'For security purposes, you can only request this after 39 seconds.' }), 'rateLimited');
  assert.equal(authErrorKind({ message: 'Network request failed' }), 'offline');
  assert.equal(authErrorKind({ message: 'Failed to fetch' }), 'offline');
  assert.equal(authErrorKind({ message: 'invalid request: both auth code and code verifier should be non-empty' }), 'staleLink');
  assert.equal(authErrorKind({ message: 'Email link is invalid or has expired' }), 'staleLink');
  assert.equal(authErrorKind({ message: 'PKCE code verifier not found in storage. This can happen if…' }), 'otherDevice');
  assert.equal(authErrorKind({ message: 'User already registered' }), 'accountExists');
});

test('anything else is generic, never a crash', () => {
  assert.equal(authErrorKind({ code: 'unexpected_failure', message: 'Database error saving new user' }), 'generic');
  assert.equal(authErrorKind({ code: 'constructor' }), 'generic', 'only known codes');
  assert.equal(authErrorKind({ message: 42 }), 'generic');
  assert.equal(authErrorKind(null), 'generic');
  assert.equal(authErrorKind(undefined), 'generic');
});

test('texted codes go to US and Canadian numbers', async () => {
  const { normalizePhone, formatPhone } = await import('../src/account.ts');
  assert.equal(normalizePhone('(555) 234-5678'), '+15552345678');
  assert.equal(normalizePhone('+1 555 234 5678'), '+15552345678');
  assert.equal(normalizePhone('1-555-234-5678'), '+15552345678');
  assert.equal(normalizePhone('555 234 567'), null, 'too short');
  assert.equal(normalizePhone('155 234 5678'), null, 'no area code starts with 1');
  assert.equal(normalizePhone('555 134 5678'), null, 'no exchange starts with 1');
  assert.equal(normalizePhone('+44 7700 900123'), null, 'other countries later');
  assert.equal(formatPhone('+15552345678'), '(555) 234-5678');
});

test('free plans come in 30.5-day windows from when the account was made', async () => {
  const { planWindow, FREE_PLANS_PER_WINDOW } = await import('../src/account.ts');
  assert.equal(FREE_PLANS_PER_WINDOW, 2);
  const born = '2026-01-01T00:00:00.000Z';
  const first = planWindow(born, new Date('2026-01-20T00:00:00Z'));
  assert.equal(first.start.toISOString(), born);
  assert.equal(first.end.toISOString(), '2026-01-31T12:00:00.000Z', 'half a day past the 30th');
  const second = planWindow(born, new Date('2026-01-31T12:00:00Z'));
  assert.equal(second.start.toISOString(), '2026-01-31T12:00:00.000Z', 'a window starts the moment the last ends');
  const later = planWindow(born, new Date('2026-07-01T00:00:00Z'));
  assert.equal(later.start.toISOString(), '2026-06-02T12:00:00.000Z', 'the sixth window (5 × 30.5 days in)');
  assert.equal(later.end.toISOString(), '2026-07-03T00:00:00.000Z');
  assert.equal(planWindow('not a date', new Date('2026-07-01T00:00:00Z')).start.toISOString(), '2026-07-01T00:00:00.000Z', 'no creation time: a window from now');
});

test('a name is kept trimmed, in the fields Sign in with Apple fills', () => {
  assert.equal(cleanName('  Mary   Ann  '), 'Mary Ann');
  assert.equal(cleanName('x'.repeat(60)).length, NAME_MAX);
  assert.deepEqual(nameMetadata(' Alex ', ' Anderson '), { given_name: 'Alex', family_name: 'Anderson', full_name: 'Alex Anderson' });
  assert.deepEqual(nameMetadata('Alex'), { given_name: 'Alex', family_name: null, full_name: 'Alex' }, 'no last name clears an old one');
  assert.deepEqual(nameMetadata('Alex', '   '), { given_name: 'Alex', family_name: null, full_name: 'Alex' });
});

test('a date of birth is a real day, from 1900 to today', () => {
  const today = '2026-10-14';
  assert.equal(birthDateOf('4', '9', '2001', today), '2001-04-09');
  assert.equal(birthDateOf(' 04 ', '09', '2001', today), '2001-04-09', 'spaces and leading zeros are fine');
  assert.equal(birthDateOf('2', '29', '2008', today), '2008-02-29', 'a leap day in a leap year');
  assert.equal(birthDateOf('2', '29', '2007', today), null, 'no leap day that year');
  assert.equal(birthDateOf('4', '31', '2001', today), null);
  assert.equal(birthDateOf('13', '1', '2001', today), null);
  assert.equal(birthDateOf('0', '1', '2001', today), null);
  assert.equal(birthDateOf('1', '1', '1899', today), null, 'before 1900');
  assert.equal(birthDateOf('10', '15', '2026', today), null, 'tomorrow');
  assert.equal(birthDateOf('10', '14', '2026', today), '2026-10-14', 'today is a real day (and far too young)');
  assert.equal(birthDateOf('1', '1', '01', today), null, 'a two-digit year is ambiguous');
  assert.equal(birthDateOf('', '1', '2001', today), null);
  assert.equal(birthDateOf('1.5', '1', '2001', today), null);
});

test('the age check counts whole years, birthdays included', () => {
  assert.equal(MIN_AGE, 13);
  assert.equal(ageOn('2013-10-14', '2026-10-14'), 13, 'the 13th birthday itself');
  assert.equal(ageOn('2013-10-15', '2026-10-14'), 12, 'the day before');
  assert.ok(isOldEnough('2013-10-14', '2026-10-14'));
  assert.ok(!isOldEnough('2013-10-15', '2026-10-14'));
  assert.ok(isOldEnough('1990-01-01', '2026-10-14'));
  assert.ok(!isOldEnough('2026-10-14', '2026-10-14'));
  // A leap-day birthday: a year older on 1 March in other years.
  assert.equal(ageOn('2012-02-29', '2025-02-28'), 12);
  assert.equal(ageOn('2012-02-29', '2025-03-01'), 13);
  assert.equal(ageOn('2012-02-29', '2028-02-29'), 16);
});

test('a failure on Supabase’s side is a 5xx, never the person’s mistake', () => {
  assert.equal(isServerFailure({ status: 500 }), true, 'its email provider refused to send');
  assert.equal(isServerFailure({ status: 503 }), true);
  assert.equal(isServerFailure({ status: 422 }), false, 'an email that already has a passport');
  assert.equal(isServerFailure({ status: 429 }), false, 'too many tries');
  assert.equal(isServerFailure({ status: 0 }), false, 'offline');
  assert.equal(isServerFailure({}), false);
  assert.equal(isServerFailure(null), false);
});

test('an email typed into the username box is spotted, a handle isn’t', () => {
  assert.equal(looksLikeEmail('dad@'), true, 'as soon as the @ is typed');
  assert.equal(looksLikeEmail('dad.smith@gmail.com'), true);
  assert.equal(looksLikeEmail(' dad@gmail.com '), true);
  assert.equal(looksLikeEmail('@maya_reyes'), false, 'a social handle starts with @');
  assert.equal(looksLikeEmail('maya_reyes'), false);
  assert.equal(looksLikeEmail('dad smith@'), false, 'not an address');
});

test('a username is suggested from the part of an email before the @', () => {
  assert.equal(suggestUsername('dad@gmail.com'), 'dad');
  assert.equal(suggestUsername('Dad.Smith+pn@gmail.com'), 'dad_smith', 'dots as underscores, the +tag dropped');
  assert.equal(suggestUsername('mary-ann..lee@school.edu'), 'mary_ann_lee', 'runs of separators become one');
  assert.equal(suggestUsername('.x.y.@a.com'), 'x_y', 'no underscores at the ends');
  assert.equal(suggestUsername('jo@x.com'), '', 'too short to be a username');
  assert.equal(suggestUsername('averyveryverylongname1234@x.com'), 'averyveryverylongnam', 'cut at 20');
  assert.equal(suggestUsername('dad@'), 'dad', 'while the email is still being typed');
  assert.equal(suggestUsername(''), '');
});
