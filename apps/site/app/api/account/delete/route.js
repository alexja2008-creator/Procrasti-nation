import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/authMiddleware';
import { cancelCustomerSubscriptions } from '../../../../lib/stripe';

/**
 * Delete your passport (App Store 5.1.1(v)): the signed-in person's account and everything in it.
 * Every table that points at a person deletes their rows with them (ON DELETE CASCADE; the v2
 * migration tests check it on production's structure), so deleting the auth user is the whole job.
 * The service role is used for that one call, on the person the session proves they are.
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // The app asks them to type DELETE; checked here too, so nothing deletes by accident.
    const body = await request.json().catch(() => null);
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400 });
    }

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Billing stops before the account goes (v1's Pro on the web). If Stripe can't be reached,
    // nothing is deleted: better to ask them to try again than to leave a subscription charging.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.stripe_customer_id) {
      if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
      try {
        await cancelCustomerSubscriptions(profile.stripe_customer_id);
      } catch (e) {
        console.error('account/delete: could not cancel the subscription', e?.message);
        return NextResponse.json({ error: 'Could not cancel your subscription. Nothing was deleted.' }, { status: 502 });
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('account/delete failed:', error?.code ?? error?.message);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
