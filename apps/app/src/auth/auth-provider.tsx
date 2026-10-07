import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ensureProfile } from '@/data/profile';
import { supabase } from '@/lib/supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  /** Signed in by a password-reset link: auth/new-password comes before anything else. */
  recovering: boolean;
};

const AuthContext = createContext<AuthState & { finishRecovery: () => void }>({
  session: null,
  loading: true,
  recovering: false,
  finishRecovery: () => undefined,
});

/** Holds the Supabase session; `loading` is true until the stored session has been read. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true, recovering: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState((s) => ({ ...s, session: data.session, loading: false })));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Set with the session, so the screen that sees the session also sees why.
      setState((s) => ({ session, loading: false, recovering: event === 'PASSWORD_RECOVERY' || (s.recovering && !!session) }));
      // Supabase calls can't be awaited inside this callback; run after it.
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY')) {
        setTimeout(() => ensureProfile(session.user).catch(() => undefined), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const finishRecovery = () => setState((s) => ({ ...s, recovering: false }));

  return <AuthContext.Provider value={{ ...state, finishRecovery }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
