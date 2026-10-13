// The look chosen in Settings: Night passport (the default), Day passport, or Match my device.
// Kept per device (it applies before sign-in too); public/index.html reads the same key on the web
// to paint the right background before the app loads.
import { DEFAULT_APPEARANCE, isAppearanceChoice, type AppearanceChoice } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

const KEY = 'pn.appearance';

type AppearanceState = { choice: AppearanceChoice; ready: boolean; choose: (choice: AppearanceChoice) => void };

const AppearanceContext = createContext<AppearanceState>({ choice: DEFAULT_APPEARANCE, ready: true, choose: () => undefined });

/**
 * iPhone: the keyboard, alerts and other native parts follow the choice too, and `useColorScheme`
 * reports it. React Native Web has no override; `useColorScheme` (hooks) decides there.
 */
function applyNative(choice: AppearanceChoice) {
  if (typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(choice === 'night' ? 'dark' : choice === 'day' ? 'light' : 'unspecified');
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<AppearanceChoice>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        const saved = isAppearanceChoice(stored) ? stored : DEFAULT_APPEARANCE;
        applyNative(saved);
        setChoice(saved);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (next: AppearanceChoice) => {
    applyNative(next);
    setChoice(next);
    AsyncStorage.setItem(KEY, next).catch(() => undefined);
  };

  return <AppearanceContext.Provider value={{ choice, ready, choose }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
