// Stripe, called with fetch like the checkout and portal routes (no SDK).

const STRIPE = 'https://api.stripe.com/v1';
// A subscription in any of these still bills, or may.
const BILLING = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete']);

async function stripe(path, init = {}) {
  const res = await fetch(`${STRIPE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${init.method ?? 'GET'} ${path.split('?')[0]} failed: ${res.status} ${body?.error?.code ?? ''}`);
  return body;
}

/**
 * Cancels every subscription of this customer that still bills, at once (deleting an account
 * must stop billing; there's no account left to bill). Throws if Stripe can't be reached, so the
 * caller doesn't delete the account while a subscription might still charge.
 */
export async function cancelCustomerSubscriptions(customerId) {
  const list = await stripe(`/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`);
  for (const sub of list.data ?? []) {
    if (BILLING.has(sub.status)) await stripe(`/subscriptions/${encodeURIComponent(sub.id)}`, { method: 'DELETE' });
  }
}
