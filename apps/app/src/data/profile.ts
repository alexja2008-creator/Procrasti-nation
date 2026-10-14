// The public profile (v1's `profiles`): for now just the username. Readable by anyone,
// written by its owner; usernames are unique ignoring case.
import { isValidUsername } from '@pn/core';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

const UNIQUE_VIOLATION = '23505';

/** Whether someone else has it (usernames are stored lowercase, as v1 does). */
export async function isUsernameTaken(username: string, exceptUserId?: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('user_id').eq('username', username).maybeSingle();
  if (error) throw error;
  return !!data && data.user_id !== exceptUserId;
}

export async function fetchUsername(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data?.username as string | undefined) ?? null;
}

/** Changes their username, or gives an account without a profile its first. */
export async function saveUsername(userId: string, username: string): Promise<'saved' | 'taken'> {
  const { data, error } = await supabase.from('profiles').update({ username }).eq('user_id', userId).select('id');
  if (error?.code === UNIQUE_VIOLATION) return 'taken';
  if (error) throw error;
  if (data.length > 0) return 'saved';
  const { error: insertError } = await supabase.from('profiles').insert({ user_id: userId, username, display_name: username });
  if (insertError?.code === UNIQUE_VIOLATION) return 'taken';
  if (insertError) throw insertError;
  return 'saved';
}

/**
 * Makes the profile from the username picked at sign-up, which waits in `pending_username`
 * until the email is confirmed and they're signed in (v1's way). If someone took it meanwhile,
 * they go without one and can choose another in Settings.
 */
export async function ensureProfile(user: User): Promise<void> {
  const pending: unknown = user.user_metadata?.pending_username;
  if (typeof pending !== 'string' || !isValidUsername(pending)) return;
  const { data, error } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await supabase.from('profiles').insert({ user_id: user.id, username: pending, display_name: pending });
  if (insertError && insertError.code !== UNIQUE_VIOLATION) throw insertError;
}
