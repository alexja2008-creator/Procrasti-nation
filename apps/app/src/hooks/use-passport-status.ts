import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/auth/auth-provider';
import { isUnsaved, owesPassword } from '@/auth/passport';
import { supabase } from '@/lib/supabase';

/**
 * Whether their passport still needs saving (anonymous), or a password to finish saving it (the
 * email link was opened, maybe on another device). Checked each time the screen comes into view;
 * an anonymous passport with a save link out refreshes its session to see if it's been opened.
 */
export function usePassportStatus() {
  const { session } = useAuth();
  const user = session?.user;
  const [owes, setOwes] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // A link opened elsewhere only shows here once the session is refreshed.
        if (user?.is_anonymous && user.new_email) await supabase.auth.refreshSession().catch(() => undefined);
        const due = await owesPassword(user);
        if (!cancelled) setOwes(due);
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  return { unsaved: isUnsaved(user), owesPassword: owes };
}
