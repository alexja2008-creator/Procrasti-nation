// Whether this iPhone may show reminders. Asked the first time a task gets a
// time (never on launch); iOS's own prompt follows the app's "Allow".
import * as Notifications from 'expo-notifications';

/** 'unsupported': web, until Web Push. */
export type Permission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const { PROVISIONAL, EPHEMERAL } = Notifications.IosAuthorizationStatus;

function read(p: Notifications.NotificationPermissionsStatus): Permission {
  if (p.granted || p.ios?.status === PROVISIONAL || p.ios?.status === EPHEMERAL) return 'granted';
  return p.status === 'denied' ? 'denied' : 'undetermined';
}

export async function getPermission(): Promise<Permission> {
  return read(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<Permission> {
  return read(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
}
