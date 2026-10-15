// The anonymous passport: opened on the way to the Oath, so a new person never waits on an email;
// saved later with a texted code or an email + password, keeping the same account and data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

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

/** Unsaved with no save link out: kept on Save your passport, since an unsaved passport lives in one browser or phone. */
export const needsSave = (user: User | undefined | null) => !!user?.is_anonymous && !user.new_email;

// The gate's memory for this run of the app, by passport. Held: Save your passport is open on the
// Application, so a link sent from it doesn't open the gate before "Open the link we sent" shows.
// Let in: its Continue was tapped (the link is out, or couldn't be sent on our side, so a mail
// outage never locks anyone out; Save your passport comes back the next time the app opens).
const held = new Set<string>();
const lettingIn = new Set<string>();
const gateListeners = new Set<() => void>();
let gateVersion = 0;
const gateChanged = () => {
  gateVersion += 1;
  gateListeners.forEach((listener) => listener());
};
const subscribeGate = (listener: () => void) => {
  gateListeners.add(listener);
  return () => {
    gateListeners.delete(listener);
  };
};
const gateSnapshot = () => gateVersion;

export function holdForSave(userId: string) {
  if (held.has(userId)) return;
  held.add(userId);
  gateChanged();
}

export function letIn(userId: string) {
  lettingIn.add(userId);
  gateChanged();
}

/** The gate: an unsaved passport stays on Save your passport until a link is out and its Continue is tapped. */
export function useMustSave(user: User | undefined | null): boolean {
  useSyncExternalStore(subscribeGate, gateSnapshot);
  if (!user?.is_anonymous || lettingIn.has(user.id)) return false;
  return needsSave(user) || held.has(user.id);
}

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
