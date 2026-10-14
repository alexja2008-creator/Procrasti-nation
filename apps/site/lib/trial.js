// The Pro trial: 10 days from sign-up, read the same way by the plan route
// (which enforces it) and the AuthProvider (which shows it).
//
// It counts from user.created_at, which only Supabase Auth sets. Never read it
// from user_metadata: anyone can rewrite their own metadata with
// supabase.auth.updateUser({ data }), which once granted endless trials.
export const TRIAL_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days of trial left (rounded up), or 0 once it's over.
export function trialDaysRemaining(user, now = Date.now()) {
  const signedUpAt = Date.parse(user?.created_at);
  if (!Number.isFinite(signedUpAt)) return 0;
  const msLeft = signedUpAt + TRIAL_DAYS * DAY_MS - now;
  return msLeft > 0 ? Math.ceil(msLeft / DAY_MS) : 0;
}
