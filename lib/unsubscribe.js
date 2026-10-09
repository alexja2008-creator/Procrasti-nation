import crypto from 'crypto';

// Signed one-click unsubscribe links for reminder, report and friend-nudge emails.
// The token is an HMAC of the user id, so links can't be forged for other users.

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://procrasti-nation.work';

export const EMAIL_KINDS = {
  reminders: 'email_reminders_enabled',
  reports: 'email_reports_enabled',
  friends: 'nudge_email_enabled',
};

function sign(userId, kind) {
  if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET is required to sign unsubscribe links');
  return crypto
    .createHmac('sha256', process.env.CRON_SECRET)
    .update(`unsubscribe:${kind}:${userId}`)
    .digest('hex');
}

export function unsubscribeUrl(userId, kind) {
  const params = new URLSearchParams({ u: userId, k: kind, t: sign(userId, kind) });
  return `${BASE_URL}/api/unsubscribe?${params}`;
}

export function verifyUnsubscribe(userId, kind, token) {
  if (!process.env.CRON_SECRET || !userId || !EMAIL_KINDS[kind] || typeof token !== 'string') return false;
  const expected = Buffer.from(sign(userId, kind));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Headers that let Gmail/Apple Mail show a native one-click unsubscribe button (RFC 8058).
export function unsubscribeHeaders(url) {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
