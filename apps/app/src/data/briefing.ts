// "Not now" on the Morning Briefing card, on this device: the day it was put
// off, so the card comes back tomorrow if anything is still carried over.
import type { LocalDate } from '@pn/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId: string) => `pn.briefing.not-now.${userId}`;

export async function loadPutOff(userId: string): Promise<LocalDate | null> {
  try {
    return await AsyncStorage.getItem(keyFor(userId));
  } catch {
    return null;
  }
}

export function savePutOff(userId: string, day: LocalDate): void {
  AsyncStorage.setItem(keyFor(userId), day).catch(() => undefined);
}
