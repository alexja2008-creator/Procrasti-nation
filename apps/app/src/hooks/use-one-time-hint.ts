import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** A tip shown until it's dismissed (or no longer needed), remembered on this device. */
export function useOneTimeHint(key: string): [visible: boolean, dismiss: () => void] {
  const storageKey = `pn.hint.${key}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then(
      (seen) => {
        if (!cancelled && !seen) setVisible(true);
      },
      () => undefined, // no storage: skip the tip rather than nag every visit
    );
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(storageKey, '1').catch(() => undefined);
  };
  return [visible, dismiss];
}
