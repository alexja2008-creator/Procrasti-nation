'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A stamp that comes down onto the page the first time it scrolls into view, with the app's motion
 * (apps/app/src/components/landing-stamp.tsx). Without JavaScript, or with reduced motion, it's simply
 * there: it's hidden only once this has run and is watching for it.
 */
export default function Land({ children, tilt = 0, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [state, setState] = useState('still');

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setState('waiting');
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState('landed');
        watcher.disconnect();
      },
      { threshold: 0.6 },
    );
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={ref} className={`land ${className}`} data-land={state} style={{ '--tilt': `${tilt}deg`, animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
