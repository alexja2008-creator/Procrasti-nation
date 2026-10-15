import { isServerFailure, voice } from '@pn/core';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { nextSaveLinkAt, pendingEmail, resendSaveLink, SAVE_LINK_EVERY_MS } from '@/auth/passport';
import { friendlyAuthError } from '@/auth/sign-in';

/**
 * "Send it again" for a save link that's waiting: busy, the countdown, and how the last try went.
 * The countdown comes from when Supabase last sent one (`email_change_sent_at`), so the card on
 * Today, the one on Passport and the Settings sheet share it, the Application's first send included.
 */
export function useResendSaveLink(user: User | undefined | null) {
  const email = pendingEmail(user);
  const resendAt = nextSaveLinkAt(user);
  const [busy, setBusy] = useState(false);
  // Each for the address it was about, so a different email starts clean.
  const [result, setResult] = useState<{ email: string; error: string | null } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // More than a minute to wait means this device's clock is behind the server's: don't hold the
  // button for that (Supabase still refuses an early send, with "Too many tries").
  const msLeft = resendAt - now;
  const secondsLeft = msLeft > SAVE_LINK_EVERY_MS ? 0 : Math.max(0, Math.ceil(msLeft / 1000));

  // Tick the countdown once a second until it runs out, catching `now` up straight away.
  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      return t;
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(() => {
      if (tick() >= resendAt) clearInterval(id);
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [resendAt]);

  const resend = async () => {
    if (!user || !email || busy || secondsLeft > 0) return;
    setBusy(true);
    setResult(null);
    try {
      const sent = await resendSaveLink(user);
      if (sent) setResult({ email, error: null });
    } catch (e) {
      const error = isServerFailure(e as { status?: unknown })
        ? voice.application.resendFailed
        : friendlyAuthError(e, voice.application.saveFailed);
      setResult({ email, error });
    } finally {
      setBusy(false);
    }
  };

  const current = result && result.email === email ? result : null;
  return { resend, busy, secondsLeft, error: current?.error ?? null, sentAgain: !!current && !current.error };
}
