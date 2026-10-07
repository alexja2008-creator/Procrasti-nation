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
