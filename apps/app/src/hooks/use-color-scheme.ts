import { schemeFor } from '@pn/core';
import { useColorScheme as useDeviceScheme } from 'react-native';

import { useAppearance } from '@/theme/appearance';

/** The scheme the app shows: the choice in Settings (night by default), or the device's for Match my device. */
export function useColorScheme(): 'light' | 'dark' {
  const device = useDeviceScheme();
  const { choice } = useAppearance();
  return schemeFor(choice, device) === 'night' ? 'dark' : 'light';
}
