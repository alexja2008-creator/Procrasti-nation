import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/authMiddleware';

export async function POST(request) {
  try {
    const { user, token, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { action, targetUserId } = await request.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing action or targetUserId' }, { status: 400 });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const VALID_ACTIONS = ['send', 'accept', 'reject', 'cancel', 'remove'];
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    const userDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    switch (action) {
      case 'send': {
        // Check if any friendship already exists in either direction
        const { data: existing } = await userDb
          .from('friendships')
          .select('id, status, requester')
          .or(`and(requester.eq.${user.id},addressee.eq.${targetUserId}),and(requester.eq.${targetUserId},addressee.eq.${user.id})`)
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (existing.status === 'accepted') {
            return NextResponse.json({ error: 'Already friends' }, { status: 409 });
          }
          if (existing.status === 'pending') {
            return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
          }
          // If rejected, only the original requester can re-request
          if (existing.status === 'rejected') {
            if (existing.requester !== user.id) {
              return NextResponse.json({ error: 'Cannot send request' }, { status: 409 });
            }
            await userDb.from('friendships').delete().eq('id', existing.id);
          }
        }

        const { error: insertError } = await userDb.from('friendships').insert({
          requester: user.id,
          addressee: targetUserId,
          status: 'pending',
        });

        if (insertError) {
          if (insertError.code === '23505') {
            return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
          }
          console.error('[friends/request] insert error:', insertError);
          return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
        }

        return NextResponse.json({ success: true, status: 'pending' });
      }

      case 'accept': {
        const { data: updated, error: updateError } = await userDb
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('requester', targetUserId)
          .eq('addressee', user.id)
          .eq('status', 'pending')
          .select()
          .maybeSingle();

        if (updateError || !updated) {
          return NextResponse.json({ error: 'No pending request found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, status: 'accepted' });
      }

      case 'reject': {
        const { data: updated, error: updateError } = await userDb
          .from('friendships')
          .update({ status: 'rejected' })
          .eq('requester', targetUserId)
          .eq('addressee', user.id)
          .eq('status', 'pending')
          .select()
          .maybeSingle();

        if (updateError || !updated) {
          return NextResponse.json({ error: 'No pending request found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, status: 'rejected' });
      }

      case 'cancel': {
        const { error: deleteError } = await userDb
          .from('friendships')
          .delete()
          .eq('requester', user.id)
          .eq('addressee', targetUserId)
          .eq('status', 'pending');

        if (deleteError) {
          return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'remove': {
        const { error: deleteError } = await userDb
          .from('friendships')
          .delete()
          .eq('status', 'accepted')
          .or(`and(requester.eq.${user.id},addressee.eq.${targetUserId}),and(requester.eq.${targetUserId},addressee.eq.${user.id})`);

        if (deleteError) {
          return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[friends/request]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
