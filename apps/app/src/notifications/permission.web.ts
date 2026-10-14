// Whether this browser rings reminders: notifications allowed, a push service
// reachable, and not turned off here (the card's "Turn off here"). Asked the
// first time a task gets a time (never on load); the browser's own prompt
// follows the app's Allow.
import { isOffHere, setOffHere, subscribeHere, supportsWebPush, unsubscribeHere } from '@/notifications/web-push';

/** 'unsupported': this browser can't do Web Push (e.g. Safari on iPhone outside a home-screen app). */
export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const subscribed = () => subscribeHere().then(
  () => 'granted' as const,
  () => 'unsupported' as const,
);

export async function getPermission(): Promise<Permission> {
  if (!supportsWebPush()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted' || (await isOffHere())) return 'undetermined';
  // Allowed: make sure this browser can actually receive (some can't reach a push service).
  return subscribed();
}

export async function requestPermission(): Promise<Permission> {
  if (!supportsWebPush()) return 'unsupported';
  // First thing, straight from the click: browsers only prompt from a person's gesture.
  const answer = await Notification.requestPermission();
  if (answer === 'denied') return 'denied';
  if (answer !== 'granted') return 'undetermined';
  await setOffHere(false);
  return subscribed();
}

/** "Turn off here": this browser stops ringing until Turn on, whoever signs in. */
export async function turnOffHere(): Promise<void> {
  await setOffHere(true);
  await unsubscribeHere().catch(() => undefined);
}
