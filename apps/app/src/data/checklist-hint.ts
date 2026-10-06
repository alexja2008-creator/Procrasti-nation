// Whether this device has shown someone how to make a line a task: the tip
// under a note's title goes once they've done it (or hidden the tip).
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId: string) => `pn.notes.checklist-learned.${userId}`;

export async function loadChecklistLearned(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) === '1';
  } catch {
    return false;
  }
}

export function saveChecklistLearned(userId: string): void {
  AsyncStorage.setItem(keyFor(userId), '1').catch(() => undefined);
}
