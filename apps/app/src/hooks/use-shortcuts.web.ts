import { useEffect, useRef } from 'react';

/**
 * Page-wide keyboard shortcuts, keyed by `KeyboardEvent.key` ("Escape") or
 * "Space". Ignored while typing; Space is also left alone when a button or
 * link has focus, since it presses that. Combos with ⌘ (or Ctrl), written
 * "Mod+Shift+L", work while typing too: they're editing commands.
 */
export function useShortcuts(keys: Record<string, () => void>, enabled = true) {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.altKey) return;
        const combo = `Mod+${e.shiftKey ? 'Shift+' : ''}${e.key.length === 1 ? e.key.toUpperCase() : e.key}`;
        const run = latest.current[combo];
        if (!run) return;
        e.preventDefault();
        run();
        return;
      }
      if (e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      if (key === 'Space' && target?.closest('button, a, [role="button"]')) return;
      const run = latest.current[key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    // Capture phase: React Native Web's TextInput stops keydown from bubbling,
    // so combos typed in a field would never reach a bubbling listener.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled]);
}
