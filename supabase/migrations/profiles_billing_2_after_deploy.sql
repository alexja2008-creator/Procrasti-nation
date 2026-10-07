-- Only the public profile is readable through the API (step 2 of 2).
--
-- Run in the SQL Editor AFTER the code that reads my_subscription_status() is
-- live (the code before it read stripe_subscription_status straight from
-- profiles, and would lose Pro status and the profile with it). Requires step 1.
-- Safe to run more than once.
--
-- profiles is readable by anyone (public profile pages, friend search), which
-- also published every user's subscription status, Stripe customer id and
-- email preferences. Signed-out and signed-in API callers now see only the
-- public columns; server routes (service role) still see everything.
--
-- A column added to profiles later is hidden from the API until it's added
-- to this list.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, username, display_name, created_at) ON public.profiles TO anon, authenticated;
