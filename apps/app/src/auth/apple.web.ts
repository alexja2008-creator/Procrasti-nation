import { authRedirectUrl } from '@/auth/sign-in';
import { supabase } from '@/lib/supabase';

/** On web, Sign in with Apple is an OAuth redirect (needs the Services ID set up in Supabase). */
export const isAppleSignInAvailable = async () => true;

export async function signInWithApple(): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: authRedirectUrl() },
  });
  if (error) throw error;
  return true;
}
