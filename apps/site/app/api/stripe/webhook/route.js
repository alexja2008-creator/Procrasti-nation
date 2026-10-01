import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function verifySignature(rawBody, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {})

  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  // Reject events older than 5 minutes (replay attack prevention)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

async function setSubscriptionStatus(customerId, status) {
  await supabaseAdmin
    .from('profiles')
    .update({ stripe_subscription_status: status })
    .eq('stripe_customer_id', customerId)
}

export async function POST(request) {
  const rawBody = await request.text()
  const sigHeader = request.headers.get('stripe-signature')

  if (!sigHeader || !verifySignature(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode === 'subscription') {
        await setSubscriptionStatus(session.customer, 'active')
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      await setSubscriptionStatus(sub.customer, sub.status)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await setSubscriptionStatus(sub.customer, 'canceled')
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}
