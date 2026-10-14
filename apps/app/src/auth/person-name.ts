import { nameMetadata } from '@pn/core';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type NameMetadata = { given_name?: string; family_name?: string; full_name?: string; name?: string };

/**
 * The person's name from their auth profile: the Citizenship Application asks for it (and Apple
 * shares it on first sign-in). All null for an account from before the Application asked.
 */
export function personName(user: User | null | undefined): { first: string | null; last: string | null; full: string | null } {
  const m = (user?.user_metadata ?? {}) as NameMetadata;
  const full = (m.full_name || m.name || [m.given_name, m.family_name].filter(Boolean).join(' ')).trim() || null;
  const words = full?.split(/\s+/) ?? [];
  return {
    first: m.given_name?.trim() || words[0] || null,
    last: m.family_name?.trim() || (words.length > 1 ? words.slice(1).join(' ') : null),
    full,
  };
}

/** Keeps what to call them in their auth profile, private to them (the session updates with it); throws if it didn't save. */
export async function saveName(first: string, last: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: nameMetadata(first, last) });
  if (error) throw error;
}
