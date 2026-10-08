import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { clearReminders } from '@/notifications/scheduler';

/**
 * Signs out this device only (supabase-js's default signs out every device, so
 * leaving a lab computer would sign them out of their phone too). Reminders
 * stop first, while still signed in (a browser is forgotten on the server too).
 */
export async function signOut(): Promise<void> {
  await clearReminders();
  await supabase.auth.signOut({ scope: 'local' });
}

// Device-wide keys about the reminders of whoever was signed in (their task ids).
const REMINDER_KEYS = ['pn.reminders.done-outbox', 'pn.reminders.handled'];

/**
 * After their account is deleted: reminders stop, everything this device kept about them goes
 * (keys ending in their id, and the reminder queues), and the session is dropped here (the server
 * has already forgotten it, so signing out there can't fail anything).
 */
export async function forgetDeletedAccount(userId: string): Promise<void> {
  await clearReminders();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('pn.') && (k.endsWith(`.${userId}`) || REMINDER_KEYS.includes(k))));
  } catch {
    // storage unavailable: nothing kept to clear
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}
