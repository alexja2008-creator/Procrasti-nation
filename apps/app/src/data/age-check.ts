// The age check before a passport (core's MIN_AGE; DECISIONS.md). The date of birth itself is
// never kept or sent: only whether this account passed (signed out, the Application's draft holds
// that), and whether this device was turned away, which it stays, so a different year can't just
// be typed in.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearDraft } from '@/data/application-draft';

// Device-wide on purpose: deleting or signing out of an account never clears it.
const TURNED_AWAY = 'pn.age-check.turned-away';
// Ends in the user id, so deleting the account clears it (forgetDeletedAccount).
const passedKey = (userId: string) => `pn.age-check.passed.${userId}`;

export async function isTurnedAway(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TURNED_AWAY)) === '1';
  } catch {
    return false;
  }
}

/** Under the age: this device stays turned away, and the Application's answers and name on it go. */
export async function turnAway(): Promise<void> {
  try {
    await AsyncStorage.setItem(TURNED_AWAY, '1');
  } catch {
    // storage unavailable: still turned away for this visit (the caller shows the page)
  }
  await clearDraft();
}

export async function hasPassedAgeCheck(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(passedKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function markAgePassed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(passedKey(userId), '1');
  } catch {
    // storage unavailable: asked again next time, which is harmless
  }
}
