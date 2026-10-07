'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { trialDaysRemaining } from '../lib/trial';

const ThemeContext = createContext({
  darkMode: false,
  setDarkMode: () => {},
});

// trialStatus: 'trial' | 'free' | 'pro'
// 'trial'  = within 10-day trial window
// 'free'   = trial expired, on free tier (≤3 tasks/month)
// 'pro'    = paid subscriber (future)
const AuthContext = createContext({
  user: null,
  loading: true,
  trialStatus: 'free',
  trialDaysLeft: 0,
  profile: null,
  signOut: async () => {},
});

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, mounted]);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Same rule as /api/generate-plan: 10 days from sign-up (lib/trial.js).
function computeTrialStatus(user) {
  const daysLeft = trialDaysRemaining(user);
  if (daysLeft > 0) {
    return { trialStatus: 'trial', trialDaysLeft: daysLeft };
  }
  return { trialStatus: 'free', trialDaysLeft: 0 };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState('free');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [profile, setProfile] = useState(null);

  const fetchProfile = async (userId) => {
    if (!userId) { setProfile(null); return; }
    // Subscription status is private: profiles only exposes the public columns.
    const [{ data }, { data: subscriptionStatus }] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.rpc('my_subscription_status'),
    ]);
    setProfile(data || null);
    if (subscriptionStatus === 'active') {
      setTrialStatus('pro');
      setTrialDaysLeft(0);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      const { trialStatus: ts, trialDaysLeft: td } = computeTrialStatus(u);
      setTrialStatus(ts);
      setTrialDaysLeft(td);
      fetchProfile(u?.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      const { trialStatus: ts, trialDaysLeft: td } = computeTrialStatus(u);
      setTrialStatus(ts);
      setTrialDaysLeft(td);
      fetchProfile(u?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, trialStatus, trialDaysLeft, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useAuth() {
  return useContext(AuthContext);
}
