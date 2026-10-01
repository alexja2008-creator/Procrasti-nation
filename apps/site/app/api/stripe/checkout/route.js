import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function stripePost(path, params) {
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  })
}

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json()
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_ID_YEARLY
    : process.env.STRIPE_PRICE_ID_MONTHLY

  // Get existing stripe customer ID if any
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customerRes = await stripePost('/customers', {
      email: user.email,
      'metadata[supabase_user_id]': user.id,
    })
    const customer = await customerRes.json()
    if (!customerRes.ok) {
      console.error('Stripe customer creation failed:', customer)
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }
    customerId = customer.id

    if (profile) {
      // Profile row exists — update it directly
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    } else {
      // No profile row yet (legacy user) — insert one
      await supabaseAdmin
        .from('profiles')
        .insert({ user_id: user.id, stripe_customer_id: customerId })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://procrasti-nation.work'
  const sessionRes = await stripePost('/checkout/sessions', {
    customer: customerId,
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${baseUrl}/planner?checkout=success`,
    cancel_url: `${baseUrl}/planner?checkout=canceled`,
  })
  const session = await sessionRes.json()
  if (!sessionRes.ok) {
    console.error('Stripe session creation failed:', session)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
