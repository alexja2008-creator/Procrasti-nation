// This browser's Web Push subscription (web only: imported by the `.web.ts`
// files here). apps/site's every-minute sender finds it in push_tokens and
// sends what's due; public/sw.js shows it. "Turn off here" is remembered in
// this browser.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

const VAPID_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
const OFF_KEY = 'pn.reminders.web-off';

/** Push needs a service worker, the Push API and a secure page (https, or localhost). Safari on iPhone only offers it to home-screen web apps. */
export function supportsWebPush(): boolean {
  return (
    !!VAPID_KEY &&
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export const isOffHere = async (): Promise<boolean> => (await AsyncStorage.getItem(OFF_KEY).catch(() => null)) === '1';

export const setOffHere = (off: boolean): Promise<void> =>
  (off ? AsyncStorage.setItem(OFF_KEY, '1') : AsyncStorage.removeItem(OFF_KEY)).catch(() => undefined);

/** The VAPID public key (base64url) as the bytes PushManager wants. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

const sameKey = (a: ArrayBuffer, b: Uint8Array) => {
  if (a.byteLength !== b.length) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, i) => byte === b[i]);
};

/** What was last saved on this page load (`<user> <endpoint>`), so syncing doesn't save it again and again. */
let saved: string | null = null;

/**
 * Subscribes this browser (or keeps its subscription) and saves it for
 * whoever is signed in. Throws if the browser can't reach a push service.
 * Notifications must already be allowed.
 */
export async function subscribeHere(): Promise<void> {
  if (!VAPID_KEY) throw new Error('EXPO_PUBLIC_VAPID_PUBLIC_KEY is not set');
  const key = keyBytes(VAPID_KEY);
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  // Made with another key (development vs production): start again. (Some browsers don't report the key; keep those.)
  const madeWith = subscription?.options.applicationServerKey;
  if (subscription && madeWith && !sameKey(madeWith, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  const marker = `${userId} ${subscription.endpoint}`;
  if (saved === marker) return;
  const { keys } = subscription.toJSON();
  const { error } = await supabase.rpc('save_web_push', {
    endpoint: subscription.endpoint,
    key_p256dh: keys?.p256dh,
    key_auth: keys?.auth,
  });
  if (error) throw new Error(error.message);
  saved = marker;
}

/**
 * Stops reminders in this browser: forgets it on the server (while still
 * signed in), then unsubscribes it, which also makes the sender drop it if
 * the first part couldn't reach the server.
 */
export async function unsubscribeHere(): Promise<void> {
  saved = null;
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from('push_tokens').delete().eq('platform', 'web').eq('token', subscription.endpoint);
  await subscription.unsubscribe().catch(() => false);
}
