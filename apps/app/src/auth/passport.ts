// The anonymous passport: opened on the way to the Oath, so a new person never waits on an email;
// saved later with a texted code or an email + password, keeping the same account and data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

import { authRedirectUrl } from '@/auth/sign-in';
import { supabase } from '@/lib/supabase';

// Opened in this run of the app: until its settings load, the gate keeps it on the Application.
let openedHere = false;

/** A real, anonymous account: settings, tasks and the free plans work as for anyone. */
export async function openPassport() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  openedHere = true;
}

/** True only in the run of the app that opened the passport (a cold start never is, so its links still work). */
export const passportOpenedHere = () => openedHere;

export const isUnsaved = (user: User | undefined | null) => !!user?.is_anonymous;

/** Save with a phone: texts a code to attach the number (`+1…`). */
export async function sendSaveCode(phone: string) {
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
}

export async function confirmSaveCode(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
  if (error) throw error;
}

/**
 * Save with an email: Supabase attaches it only once they open the link (on any device), so
 * nobody can claim someone else's address. The username waits in `pending_username` until then
 * (`ensureProfile` makes it on their next sign-in), so an unsaved passport never holds a public
 * name. A password comes after, on this device (below).
 */
export async function sendSaveLink(userId: string, email: string, username: string) {
  const { error } = await supabase.auth.updateUser(
    { email, data: { pending_username: username } },
    { emailRedirectTo: authRedirectUrl() },
  );
  if (error) throw error;
  await AsyncStorage.setItem(passwordKey(userId), '1').catch(() => undefined);
}

/** Sign in with a texted code: existing accounts only, and an unknown number hears the same "on its way". */
export async function sendSignInCode(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
  if (error && error.code !== 'otp_disabled') throw error;
}

export async function signInWithCode(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

// After saving with an email, choosing a password finishes it. Per device: the device that sent the link asks.
const passwordKey = (userId: string) => `pn.passport.choose-password.${userId}`;

/** True once their email is confirmed and this device still owes them the password step. */
export async function owesPassword(user: User | undefined | null): Promise<boolean> {
  if (!user || user.is_anonymous || !user.email) return false;
  try {
    return (await AsyncStorage.getItem(passwordKey(user.id))) === '1';
  } catch {
    return false;
  }
}

export async function settlePassword(userId: string) {
  await AsyncStorage.removeItem(passwordKey(userId)).catch(() => undefined);
}
