-- Billing fields on profiles belong to the server (step 1 of 2).
--
-- Run in the SQL Editor BEFORE deploying the code that calls
-- my_subscription_status(). Safe to run any time, and more than once.
--
-- Why: profiles' "Users can update their own profile" policy has no column
-- restriction, so a signed-in user could set their own
-- stripe_subscription_status to 'active' (unlimited Pro plans), or copy
-- someone else's stripe_customer_id (profiles is publicly readable) into their
-- own row and open that customer's Stripe billing portal. Nothing here changes
-- the Stripe routes: they write these columns with the service role, which the
-- guard lets through.

-- 1. Only the server may set or change the Stripe columns. A trigger rather
--    than column privileges, so a later broad GRANT can't quietly undo it.
CREATE OR REPLACE FUNCTION public.profiles_guard_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- anon and authenticated are the roles API callers run as; the service
  -- role, the SQL Editor and SECURITY DEFINER functions are left alone.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.stripe_customer_id IS NOT NULL OR NEW.stripe_subscription_status IS NOT NULL THEN
      RAISE EXCEPTION 'billing fields are set by the server' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_status IS DISTINCT FROM OLD.stripe_subscription_status THEN
    RAISE EXCEPTION 'billing fields are set by the server' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_billing ON public.profiles;
CREATE TRIGGER profiles_guard_billing
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_billing();

-- 2. The signed-in user's own subscription status. The app reads it through
--    this function because step 2 hides the Stripe columns from API reads.
CREATE OR REPLACE FUNCTION public.my_subscription_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT stripe_subscription_status FROM public.profiles WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_subscription_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_subscription_status() TO authenticated;

-- 3. Read only: the rows to check against Stripe, since the trigger doesn't
--    undo anything set before it. The webhook sets a status only on the row
--    holding that Stripe customer, so a status with no customer id was
--    written by a user, and a customer id on more than one row was copied by
--    one of them (Stripe's customer email tells which). Compare the other
--    'active' rows with Stripe's active subscriptions.
SELECT p.user_id, p.username, p.stripe_customer_id, p.stripe_subscription_status,
       p.stripe_customer_id IS NULL
         OR count(*) OVER (PARTITION BY p.stripe_customer_id) > 1 AS set_by_a_user
FROM public.profiles p
WHERE p.stripe_customer_id IS NOT NULL OR p.stripe_subscription_status IS NOT NULL
ORDER BY p.stripe_customer_id NULLS FIRST;
