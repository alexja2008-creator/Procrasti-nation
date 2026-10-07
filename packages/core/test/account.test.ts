import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authErrorKind, isLongEnoughPassword, MIN_PASSWORD_LENGTH } from '../src/account.ts';

test('passwords need six characters, like v1', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 6);
  assert.equal(isLongEnoughPassword('12345'), false);
  assert.equal(isLongEnoughPassword('123456'), true);
});

test("Supabase Auth's codes decide first", () => {
  assert.equal(authErrorKind({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'wrongPassword');
  assert.equal(authErrorKind({ code: 'email_not_confirmed', message: 'Email not confirmed' }), 'unconfirmed');
  assert.equal(authErrorKind({ code: 'weak_password', message: 'Password should be at least 6 characters.' }), 'tooShort');
  assert.equal(authErrorKind({ code: 'same_password', message: 'New password should be different from the old password.' }), 'samePassword');
  assert.equal(authErrorKind({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }), 'rateLimited');
  assert.equal(authErrorKind({ code: 'flow_state_not_found', message: 'invalid flow state, no valid flow state found' }), 'staleLink');
});

test('without a code, the message decides', () => {
  assert.equal(authErrorKind({ message: 'Invalid login credentials' }), 'wrongPassword');
  assert.equal(authErrorKind({ message: 'For security purposes, you can only request this after 39 seconds.' }), 'rateLimited');
  assert.equal(authErrorKind({ message: 'Network request failed' }), 'offline');
  assert.equal(authErrorKind({ message: 'Failed to fetch' }), 'offline');
  assert.equal(authErrorKind({ message: 'invalid request: both auth code and code verifier should be non-empty' }), 'staleLink');
  assert.equal(authErrorKind({ message: 'Email link is invalid or has expired' }), 'staleLink');
});

test('anything else is generic, never a crash', () => {
  assert.equal(authErrorKind({ code: 'unexpected_failure', message: 'Database error saving new user' }), 'generic');
  assert.equal(authErrorKind({ code: 'constructor' }), 'generic', 'only known codes');
  assert.equal(authErrorKind({ message: 42 }), 'generic');
  assert.equal(authErrorKind(null), 'generic');
  assert.equal(authErrorKind(undefined), 'generic');
});
