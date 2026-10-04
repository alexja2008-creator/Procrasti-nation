import { useEffect, useRef } from 'react';

/**
 * Page-wide keyboard shortcuts, keyed by `KeyboardEvent.key` ("Escape") or
 * "Space". Ignored while typing; Space is also left alone when a button or
 * link has focus, since it presses that.
 */
export function useShortcuts(keys: Record<string, () => void>, enabled = true) {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      if (key === 'Space' && target?.closest('button, a, [role="button"]')) return;
      const run = latest.current[key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
