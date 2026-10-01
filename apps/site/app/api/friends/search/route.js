import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/authMiddleware';

export async function GET(request) {
  try {
    const { user, token, error: authError } = await requireAuth(request);
    if (authError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&');

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const userDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Search profiles by username prefix, exclude self
    const { data: profiles, error: searchError } = await userDb
      .from('profiles')
      .select('user_id, username, display_name')
      .ilike('username', `${sanitizedQuery}%`)
      .neq('user_id', user.id)
      .limit(10);

    if (searchError) {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Check friendship status for each result
    const userIds = profiles.map(p => p.user_id);
    const { data: friendships } = await userDb
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
