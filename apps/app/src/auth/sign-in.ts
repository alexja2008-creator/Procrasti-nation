import { authErrorKind, MIN_PASSWORD_LENGTH, voice } from '@pn/core';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type SignInMethod = 'email' | 'apple' | 'google';

/** Methods turned on in EXPO_PUBLIC_AUTH_PROVIDERS (only enable a provider once Supabase Auth is set up for it). */
export const enabledMethods = new Set(
  (process.env.EXPO_PUBLIC_AUTH_PROVIDERS ?? 'email').split(',').map((m) => m.trim()) as SignInMethod[],
);

/**
 * Where Supabase sends people back after a magic link or OAuth: the
 * auth/callback route as a deep link on iOS (exp://…/--/auth/callback in Expo
 * Go) or a URL on web. Each form must be in Supabase Auth's redirect allow list.
 */
export const authRedirectUrl = () => Linking.createURL('auth/callback');

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Sets or changes the signed-in person's password; an account made by magic link gets its first one this way. */
export async function setPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

type CallbackParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Finishes a PKCE sign-in from the callback's query (`?code=…`, or `?error_description=…`). */
export async function finishSignIn(params: CallbackParams) {
  const failure = first(params.error_description) ?? first(params.error);
  if (failure) throw new Error(failure);
  const code = first(params.code);
  if (!code) throw new Error('invalid flow state: no code in callback');
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

/** Google OAuth. Web navigates away; iOS uses an in-app browser sheet. Resolves false if cancelled. */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = authRedirectUrl();
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
    return true;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  await finishSignIn(Linking.parse(result.url).queryParams ?? {});
  return true;
}

/** Turns Supabase/network errors into the gentle copy in @pn/core; `fallback` replaces the generic line. */
export function friendlyAuthError(error: unknown, fallback: string = voice.authErrors.generic): string {
  const kind = authErrorKind(error instanceof Error ? error : { message: String(error ?? '') });
  if (kind === 'generic') return fallback;
  if (kind === 'tooShort') return voice.authErrors.tooShort(MIN_PASSWORD_LENGTH);
  return voice.authErrors[kind];
}
