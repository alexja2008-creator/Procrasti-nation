import { useState } from 'react';
import { Platform, type TextInputContentSizeChangeEventData, type NativeSyntheticEvent } from 'react-native';

/**
 * Multiline inputs grow by themselves on iOS; on web they need a height, and
 * a textarea's measured height never shrinks. So after text gets shorter the
 * height is dropped for a moment (back to one row) and measured again.
 * `reset` does that on demand: call it when a typed line break is taken out
 * of the text (the field was measured with it in).
 */
export function useAutoHeight(text: string, min = 0) {
  const [size, setSize] = useState<{ height: number; length: number } | null>(null);
  const reset = () => setSize(null);
  if (Platform.OS !== 'web') return { style: min ? { minHeight: min } : null, onContentSizeChange: undefined, reset };
  const height = size && text.length >= size.length ? Math.max(size.height, min) : min || undefined;
  return {
    style: height ? { height } : null,
    onContentSizeChange: (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) =>
      setSize({ height: e.nativeEvent.contentSize.height, length: text.length }),
    reset,
  };
}
