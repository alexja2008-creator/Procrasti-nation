// The Citizenship Application's answers before there's a passport to keep them in: a new person
// answers signed out, and the anonymous passport opens on the way to the Oath, when these move
// into user_settings. Per device; cleared once moved (or once someone signs in to an existing
// account that has done the Application).
import type { Preferences } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pn.application.draft';

export type Draft = { preferences: Partial<Preferences>; dayRolloverHour?: number };

const EMPTY: Draft = { preferences: {} };

export async function loadDraft(): Promise<Draft> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Draft>) : null;
    return parsed && typeof parsed.preferences === 'object' && parsed.preferences ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function saveDraft(draft: Draft): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable: the answers live for this visit only
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

export const hasAnswers = (draft: Draft) => Object.keys(draft.preferences).length > 0;
