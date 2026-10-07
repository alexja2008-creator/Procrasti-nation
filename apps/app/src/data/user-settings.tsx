import { localTimeZone, type Preferences, type UserSettings } from '@pn/core';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

const COLUMNS = 'user_id,citizen_number,timezone,day_rollover_hour,preferences,onboarding_completed_at,created_at,updated_at';

type Row = {
  user_id: string;
  citizen_number: number;
  timezone: string | null;
  day_rollover_hour: number;
  preferences: Partial<Preferences> | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const fromRow = (r: Row): UserSettings => ({
  userId: r.user_id,
  citizenNumber: Number(r.citizen_number),
  timezone: r.timezone,
  dayRolloverHour: r.day_rollover_hour,
  preferences: r.preferences ?? {},
  onboardingCompletedAt: r.onboarding_completed_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

async function selectSettings(userId: string) {
  const { data, error } = await supabase.from('user_settings').select(COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as Row | null;
}

/**
 * Reads the person's settings, creating the row on first sign-in (which is
 * when the database assigns their citizen number). Reads before inserting
 * because every insert attempt draws a number, even one that conflicts.
 */
async function ensureUserSettings(userId: string): Promise<UserSettings> {
  const timezone = localTimeZone() ?? null;
  let row = await selectSettings(userId);
  if (!row) {
    const { data, error } = await supabase.from('user_settings').insert({ user_id: userId, timezone }).select(COLUMNS).single();
    if (error?.code === '23505') row = await selectSettings(userId); // another device got there first
    else if (error) throw error;
    else row = data as Row;
  } else if (timezone && row.timezone !== timezone) {
    const { data, error } = await supabase.from('user_settings').update({ timezone }).eq('user_id', userId).select(COLUMNS).single();
    if (!error) row = data as Row;
  }
  if (!row) throw new Error('user_settings row missing after insert');
  return fromRow(row);
}

/**
 * Updates their row and confirms it changed: with no valid session the request
 * goes out signed out, and row security quietly matches nothing, which would
 * otherwise look like a successful save.
 */
async function updateRow(userId: string, fields: Partial<Row>): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.from('user_settings').update(fields).eq('user_id', userId).select('user_id');
  if (error) return { error };
  return { error: data?.length ? null : new Error('user_settings: nothing was saved') };
}

// One request per person at a time. React can run effects twice (development),
// and two concurrent first-run inserts burn a citizen number on the loser's conflict.
const inFlight = new Map<string, Promise<UserSettings>>();

function loadUserSettings(userId: string): Promise<UserSettings> {
  let pending = inFlight.get(userId);
  if (!pending) {
    pending = ensureUserSettings(userId).finally(() => inFlight.delete(userId));
    inFlight.set(userId, pending);
  }
  return pending;
}

type State = { settings: UserSettings | null; status: 'loading' | 'ready' | 'error' };

/** The columns besides preferences that the person changes (the Application, Settings). */
export type SettingsPatch = Partial<Pick<UserSettings, 'dayRolloverHour' | 'onboardingCompletedAt'>>;

type Settings = State & {
  /** Merges into their preferences (the Reminders card's morning list, …); applies now, rolls back and throws if the save fails. */
  savePreferences: (patch: Partial<Preferences>) => Promise<void>;
  /**
   * When their day ends, or that the Application is done; applies now, rolls
   * back and throws if the save fails. `confirmFirst` applies only once saved
   * (finishing the Application changes which screens exist, so it can't bounce).
   */
  saveSettings: (patch: SettingsPatch, options?: { confirmFirst?: boolean }) => Promise<void>;
};

const Ctx = createContext<Settings>({
  settings: null,
  status: 'loading',
  savePreferences: async () => undefined,
  saveSettings: async () => undefined,
});

export function UserSettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<State>({ settings: null, status: 'loading' });
  // The newest preferences, so saves made in quick succession build on each other.
  const latest = useRef<Partial<Preferences> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadUserSettings(userId).then(
      (settings) => {
        if (cancelled) return;
        latest.current = settings.preferences;
        setState({ settings, status: 'ready' });
      },
      () => !cancelled && setState({ settings: null, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setPreferences = (preferences: Partial<Preferences>) => {
    latest.current = preferences;
    setState((s) => (s.settings ? { ...s, settings: { ...s.settings, preferences } } : s));
  };

  const savePreferences: Settings['savePreferences'] = async (patch) => {
    const before = latest.current;
    if (!before) return;
    const preferences = { ...before, ...patch };
    setPreferences(preferences);
    const { error } = await updateRow(userId, { preferences });
    if (error) {
      setPreferences(before);
      throw error;
    }
  };

  const saveSettings: Settings['saveSettings'] = async (patch, options) => {
    const before = state.settings;
    if (!before) return;
    const apply = (fields: SettingsPatch) => setState((s) => (s.settings ? { ...s, settings: { ...s.settings, ...fields } } : s));
    if (!options?.confirmFirst) apply(patch);
    const row: Partial<Pick<Row, 'day_rollover_hour' | 'onboarding_completed_at'>> = {};
    if (patch.dayRolloverHour !== undefined) row.day_rollover_hour = patch.dayRolloverHour;
    if (patch.onboardingCompletedAt !== undefined) row.onboarding_completed_at = patch.onboardingCompletedAt;
    const { error } = await updateRow(userId, row);
    if (error) {
      apply({ dayRolloverHour: before.dayRolloverHour, onboardingCompletedAt: before.onboardingCompletedAt });
      throw error;
    }
    if (options?.confirmFirst) apply(patch);
  };

  return <Ctx.Provider value={{ ...state, savePreferences, saveSettings }}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  return useContext(Ctx);
}
