import { isValidUsername } from '@pn/core';
import { useEffect, useState } from 'react';

import { isUsernameTaken } from '@/data/profile';

export type UsernameStatus = 'empty' | 'invalid' | 'checking' | 'free' | 'taken' | 'unknown';

/** Whether a username is free, checked a moment after typing stops. `mine` (their current one) counts as free. */
export function useUsernameCheck(username: string, mine?: string | null, userId?: string): UsernameStatus {
  const [result, setResult] = useState<{ username: string; taken: boolean | null } | null>(null);

  useEffect(() => {
    if (!isValidUsername(username) || username === mine) return;
    let cancelled = false;
    const id = setTimeout(() => {
      isUsernameTaken(username, userId).then(
        (taken) => !cancelled && setResult({ username, taken }),
        () => !cancelled && setResult({ username, taken: null }),
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [username, mine, userId]);

  if (!username) return 'empty';
  if (!isValidUsername(username)) return 'invalid';
  if (username === mine) return 'free';
  // An answer for an older spelling doesn't count.
  if (result?.username !== username) return 'checking';
  return result.taken === null ? 'unknown' : result.taken ? 'taken' : 'free';
}
