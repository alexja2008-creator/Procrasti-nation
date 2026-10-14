// Whether someone said "Not now" to reminders on this device: then the app
// stops asking when a task gets a time (the Reminders card can still turn them on).
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId: string) => `pn.reminders.not-now.${userId}`;

export async function loadNotNow(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) === '1';
  } catch {
    return false;
  }
}

export function saveNotNow(userId: string): void {
  AsyncStorage.setItem(keyFor(userId), '1').catch(() => undefined);
}
