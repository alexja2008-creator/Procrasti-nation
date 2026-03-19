import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').toLowerCase().trim();

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Get the current user from the auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Search profiles by username prefix, exclude self
    const { data: profiles, error: searchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username, display_name')
      .ilike('username', `${query}%`)
      .neq('user_id', user.id)
      .limit(10);

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Check friendship status for each result
    const userIds = profiles.map(p => p.user_id);
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester, addressee, status')
      .or(
        userIds.map(uid =>
          `and(requester.eq.${user.id},addressee.eq.${uid}),and(requester.eq.${uid},addressee.eq.${user.id})`
        ).join(',')
      );

    const results = profiles.map(p => {
      let friendshipStatus = 'none';
      const friendship = (friendships || []).find(f =>
        (f.requester === user.id && f.addressee === p.user_id) ||
        (f.requester === p.user_id && f.addressee === user.id)
      );

      if (friendship) {
        if (friendship.status === 'accepted') {
          friendshipStatus = 'accepted';
        } else if (friendship.status === 'pending') {
          friendshipStatus = friendship.requester === user.id ? 'pending_sent' : 'pending_received';
        } else if (friendship.status === 'rejected') {
          friendshipStatus = 'rejected';
        }
      }

      return {
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        friendshipStatus,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[friends/search]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
