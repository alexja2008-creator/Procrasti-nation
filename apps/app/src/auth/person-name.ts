import type { User } from '@supabase/supabase-js';

type NameMetadata = { given_name?: string; family_name?: string; full_name?: string; name?: string };

/**
 * The person's name from their auth profile (Apple shares it on first sign-in;
 * the Citizenship Application will ask for it). All null for email-only users.
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
