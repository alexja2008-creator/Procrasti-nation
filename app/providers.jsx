'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ThemeContext = createContext({
  darkMode: false,
  setDarkMode: () => {},
});

// trialStatus: 'trial' | 'free' | 'pro'
// 'trial'  = within 14-day trial window
// 'free'   = trial expired, on free tier (≤5 tasks/month)
// 'pro'    = paid subscriber (future)
const AuthContext = createContext({
  user: null,
  loading: true,
  trialStatus: 'free',
  trialDaysLeft: 0,
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

function computeTrialStatus(user) {
  if (!user) return { trialStatus: 'free', trialDaysLeft: 0 };
  // Future: check 'pro' flag in user metadata when billing is wired up
  const trialEndsAt = user.user_metadata?.trial_ends_at;
  if (!trialEndsAt) {
    // Existing users who signed up before this feature — give them a trial too
    return { trialStatus: 'trial', trialDaysLeft: 14 };
  }
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      const { trialStatus: ts, trialDaysLeft: td } = computeTrialStatus(u);
      setTrialStatus(ts);
      setTrialDaysLeft(td);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      const { trialStatus: ts, trialDaysLeft: td } = computeTrialStatus(u);
      setTrialStatus(ts);
      setTrialDaysLeft(td);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, trialStatus, trialDaysLeft, signOut }}>
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

const ProfileContext = createContext({
  userProfile: null,
  setUserProfile: () => {},
  showOnboarding: false,
  setShowOnboarding: () => {},
});

export function ProfileProvider({ children }) {
  const [userProfile, setUserProfileState] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user-profile');
    if (saved) {
      setUserProfileState(JSON.parse(saved));
    } else {
      setShowOnboarding(true);
    }
  }, []);

  const setUserProfile = (profile) => {
    localStorage.setItem('user-profile', JSON.stringify(profile));
    setUserProfileState(profile);
  };

  return (
    <ProfileContext.Provider value={{ userProfile, setUserProfile, showOnboarding, setShowOnboarding }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
