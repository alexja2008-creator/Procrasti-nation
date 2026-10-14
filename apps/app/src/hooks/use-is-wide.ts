import { useWindowDimensions } from 'react-native';

/** Laptop-width layout: sidebar navigation instead of the bottom tab bar. */
export function useIsWide() {
  return useWindowDimensions().width >= 900;
}
