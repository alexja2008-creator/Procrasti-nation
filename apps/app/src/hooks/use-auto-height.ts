import { useRef, useState } from 'react';
import {
  Platform,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextInputChangeEventData,
  type TextInputContentSizeChangeEventData,
} from 'react-native';

/**
 * Multiline inputs grow by themselves on iOS; on web they need a height, and
 * a textarea's measured height never shrinks. So after text gets shorter the
 * height is dropped for a moment (back to one row) and measured again.
 * `reset` does that on demand: call it when a typed line break is taken out
 * of the text (the field was measured with it in).
 *
 * Wiring `onChange` and `onLayout` too measures the textarea itself, which is
 * steadier: React Native Web only reports a size when the textarea's scroll
 * size changes, so a field dropped to one row can stay there, and it never
 * measures again when the field gets wider or narrower (a turned phone, a
 * resized window). `border`: the field's top and bottom borders together,
 * which the measured height leaves out.
 */
export function useAutoHeight(text: string, min = 0, border = 0) {
  const [size, setSize] = useState<{ height: number; length: number } | null>(null);
  const width = useRef(0);
  const reset = () => setSize(null);
  if (Platform.OS !== 'web') {
    return { style: min ? { minHeight: min } : null, onContentSizeChange: undefined, onChange: undefined, onLayout: undefined, reset };
  }
  const height = size && text.length >= size.length ? Math.max(size.height + border, min) : min || undefined;
  // The text's own height: the field falls back to one row for a moment to read it. That moment
  // shortens the page, and a browser can pull a page scrolled to its end up to fit, so the scroll
  // positions above the field go back as they were.
  const measure = (field: HTMLTextAreaElement) => {
    const scrolled: [Element, number][] = [];
    for (let node = field.parentElement; node; node = node.parentElement) if (node.scrollTop) scrolled.push([node, node.scrollTop]);
    const kept = field.style.height;
    field.style.height = 'auto';
    setSize({ height: field.scrollHeight, length: field.value.length });
    field.style.height = kept;
    for (const [node, top] of scrolled) node.scrollTop = top;
  };
  return {
    style: height ? { height } : null,
    onContentSizeChange: (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) =>
      setSize({ height: e.nativeEvent.contentSize.height, length: text.length }),
    // On web both events carry the textarea as their target.
    onChange: (e: NativeSyntheticEvent<TextInputChangeEventData>) => measure(e.target as unknown as HTMLTextAreaElement),
    onLayout: (e: LayoutChangeEvent) => {
      const was = width.current;
      width.current = e.nativeEvent.layout.width;
      if (was && width.current !== was) measure((e.nativeEvent as unknown as { target: HTMLTextAreaElement }).target);
    },
    reset,
  };
}
