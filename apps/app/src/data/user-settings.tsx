import { localTimeZone, type Preferences, type UserSettings } from '@pn/core';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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

type State = { settings: UserSettings | null; status: 'loading' | 'ready' | 'error' };

const Ctx = createContext<State>({ settings: null, status: 'loading' });

export function UserSettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<State>({ settings: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    ensureUserSettings(userId).then(
      (settings) => !cancelled && setState({ settings, status: 'ready' }),
      () => !cancelled && setState({ settings: null, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useUserSettings() {
  return useContext(Ctx);
}
