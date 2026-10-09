import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EMAIL_KINDS, verifyUnsubscribe } from '../../../lib/unsubscribe';

const KIND_LABELS = {
  reminders: 'reminder emails',
  reports: 'weekly report emails',
  friends: 'friend nudge emails',
};

async function unsubscribe(searchParams) {
  const userId = searchParams.get('u');
  const kind = searchParams.get('k');
  const token = searchParams.get('t');

  if (!verifyUnsubscribe(userId, kind, token)) return { ok: false, status: 400 };

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ [EMAIL_KINDS[kind]]: false })
    .eq('user_id', userId)
    .select('user_id');

  if (error || !data?.length) {
    console.error('[unsubscribe] update failed for', userId, error || 'no profile row');
    return { ok: false, status: 500 };
  }
  return { ok: true, kind };
}

function page(title, body) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px;">
<main style="max-width:420px;text-align:center;"><h1 style="font-size:22px;margin:0 0 8px;">${title}</h1><p style="color:#475569;line-height:1.5;margin:0 0 20px;">${body}</p>
<a href="/" style="color:#059669;font-weight:600;text-decoration:none;">Back to ProcrastiNation</a></main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// Link clicked from the email footer
export async function GET(request) {
  const result = await unsubscribe(new URL(request.url).searchParams);
  if (!result.ok) {
    return page('That link didn\'t work', 'This unsubscribe link is invalid or expired. Reply to any of our emails and we\'ll remove you by hand.');
  }
  return page('You\'re unsubscribed', `You won't get any more ${KIND_LABELS[result.kind]} from ProcrastiNation.`);
}

// One-click unsubscribe from the mail client (RFC 8058 List-Unsubscribe-Post)
export async function POST(request) {
  const result = await unsubscribe(new URL(request.url).searchParams);
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : result.status });
}
