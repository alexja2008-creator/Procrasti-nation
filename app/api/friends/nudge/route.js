import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildFriendNudgeEmail, buildFriendPraiseEmail } from '../../../../lib/emails';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { friendUserId, type, message } = await request.json();

    if (!friendUserId || !type || !['nudge', 'praise'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Trim message to 140 chars
    const safeMessage = message ? String(message).trim().slice(0, 140) : null;

    // Verify accepted friendship exists
    const { data: friendship } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(requester.eq.${user.id},addressee.eq.${friendUserId}),and(requester.eq.${friendUserId},addressee.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 });
    }

    // Rate limit: max 3 nudges per sender→receiver per 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from('friend_nudges')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .eq('receiver_id', friendUserId)
      .gte('created_at', oneDayAgo);

    if (recentCount >= 3) {
      return NextResponse.json(
        { error: 'You can only send 3 nudges per friend per day. Try again tomorrow.' },
        { status: 429 }
      );
    }

    // Insert the nudge
    const { error: insertError } = await supabaseAdmin.from('friend_nudges').insert({
      sender_id: user.id,
      receiver_id: friendUserId,
      type,
      message: safeMessage,
    });

    if (insertError) {
      console.error('[friends/nudge] insert error:', insertError);
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }

    // Send email if enabled
    if (resend) {
      try {
        // Get receiver profile + email
        const [receiverProfile, senderProfile, receiverAuth] = await Promise.all([
          supabaseAdmin.from('profiles').select('display_name, nudge_email_enabled').eq('user_id', friendUserId).maybeSingle(),
          supabaseAdmin.from('profiles').select('username').eq('user_id', user.id).maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(friendUserId),
        ]);

        const emailEnabled = receiverProfile?.data?.nudge_email_enabled !== false;
        const receiverEmail = receiverAuth?.data?.user?.email;
        const senderUsername = senderProfile?.data?.username || 'A friend';
        const receiverName = receiverProfile?.data?.display_name || 'there';

        if (emailEnabled && receiverEmail) {
          const emailBuilder = type === 'nudge' ? buildFriendNudgeEmail : buildFriendPraiseEmail;
          const { subject, html } = emailBuilder({
            senderUsername,
            receiverName,
            message: safeMessage,
          });

          await resend.emails.send({
            from: 'ProcrastiNation <friends@procrasti-nation.work>',
            to: receiverEmail,
            subject,
            html,
          });
        }
      } catch (emailErr) {
        // Don't fail the nudge if email fails
        console.error('[friends/nudge] email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[friends/nudge]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
