import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { isUnsaved, owesPasswordFor, pendingEmail } from '@/auth/passport';
import { supabase } from '@/lib/supabase';

// A link opened elsewhere only shows here once the session is refreshed: at most this often,
// however many screens ask (each refresh rotates a token, and Supabase limits them per IP).
const REFRESH_EVERY_MS = 30_000;
let lastRefresh = 0;

async function refreshIfDue() {
  const t = Date.now();
  if (t - lastRefresh < REFRESH_EVERY_MS) return;
  lastRefresh = t;
  await supabase.auth.refreshSession().catch(() => undefined);
}

/**
 * Whether their passport still needs saving (anonymous), where its save link went while it waits
 * to be opened, or a password to finish saving it (the email link was opened, maybe on another device). Checked each time the screen comes into view
 * and when the app comes back to the front (back from their email); an anonymous passport with a
 * save link out refreshes its session then to see if it's been opened. The effects key on what the
 * session says, never the session object: a refresh replaces the object, and keying on it ran the
 * refresh again on every refresh, over and over.
 */
export function usePassportStatus() {
  const { session } = useAuth();
  const user = session?.user;
  const id = user?.id;
  const waiting = !!(user?.is_anonymous && user.new_email);
  const confirmed = !!(user && !user.is_anonymous && user.email);
  const [owes, setOwes] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (waiting) await refreshIfDue();
        const due = id && confirmed ? await owesPasswordFor(id) : false;
        if (!cancelled) setOwes(due);
      })();
      return () => {
        cancelled = true;
      };
    }, [id, waiting, confirmed]),
  );

  // Back from their email app or another tab: was the link opened?
  useEffect(() => {
    if (!waiting) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfDue();
    });
    return () => sub.remove();
  }, [waiting]);

  return { unsaved: isUnsaved(user), pendingEmail: pendingEmail(user), owesPassword: owes };
}
