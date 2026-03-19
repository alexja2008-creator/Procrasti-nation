import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
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

    // Get accepted friend user IDs
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester, addressee')
      .eq('status', 'accepted')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`);

    const friendIds = (friendships || []).map(f =>
      f.requester === user.id ? f.addressee : f.requester
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ feed: [] });
    }

    // Fetch profiles for display names
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username, display_name')
      .in('user_id', friendIds);

    const profileMap = {};
    for (const p of (profiles || [])) {
      profileMap[p.user_id] = { username: p.username, displayName: p.display_name };
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const feed = [];

    // Friend completions in last 7 days (aggregate only — no task titles)
    const { data: completions } = await supabaseAdmin
      .from('tasks')
      .select('user_id, completed_at')
      .in('user_id', friendIds)
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgo)
      .order('completed_at', { ascending: false });

    // Group completions by user and day
    const completionsByUser = {};
    for (const t of (completions || [])) {
      const day = t.completed_at.split('T')[0];
      const key = `${t.user_id}-${day}`;
      if (!completionsByUser[key]) {
        completionsByUser[key] = { userId: t.user_id, count: 0, latestAt: t.completed_at };
      }
      completionsByUser[key].count++;
    }

    for (const [, data] of Object.entries(completionsByUser)) {
      const profile = profileMap[data.userId];
      if (profile) {
        feed.push({
          type: 'completion',
          username: profile.username,
          displayName: profile.displayName,
          count: data.count,
          timestamp: data.latestAt,
        });
      }
    }

    // Friend streaks (show friends with active streaks)
    const { data: streaks } = await supabaseAdmin
      .from('streaks')
      .select('user_id, current_streak, updated_at')
      .in('user_id', friendIds)
      .gt('current_streak', 0);

    for (const s of (streaks || [])) {
      const profile = profileMap[s.user_id];
      if (profile && s.current_streak >= 3) { // Only show 3+ day streaks
        feed.push({
          type: 'streak',
          username: profile.username,
          displayName: profile.displayName,
          streak: s.current_streak,
          timestamp: s.updated_at,
        });
      }
    }

    // Nudges/praise involving this user in last 7 days
    const { data: nudges } = await supabaseAdmin
      .from('friend_nudges')
      .select('id, sender_id, receiver_id, type, message, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get profiles for nudge senders/receivers not already in profileMap
    const nudgeUserIds = new Set();
    for (const n of (nudges || [])) {
      if (!profileMap[n.sender_id]) nudgeUserIds.add(n.sender_id);
      if (!profileMap[n.receiver_id]) nudgeUserIds.add(n.receiver_id);
    }
    if (nudgeUserIds.size > 0) {
      const { data: nudgeProfiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', Array.from(nudgeUserIds));

      for (const p of (nudgeProfiles || [])) {
        profileMap[p.user_id] = { username: p.username, displayName: p.display_name };
      }
    }

    for (const n of (nudges || [])) {
      if (n.receiver_id === user.id) {
        const senderProfile = profileMap[n.sender_id];
        feed.push({
          type: n.type === 'nudge' ? 'nudge_received' : 'praise_received',
          username: senderProfile?.username || 'someone',
          displayName: senderProfile?.displayName || '',
          message: n.message,
          timestamp: n.created_at,
        });
      } else if (n.sender_id === user.id) {
        const receiverProfile = profileMap[n.receiver_id];
        feed.push({
          type: n.type === 'nudge' ? 'nudge_sent' : 'praise_sent',
          username: receiverProfile?.username || 'someone',
          displayName: receiverProfile?.displayName || '',
          message: n.message,
          timestamp: n.created_at,
        });
      }
    }

    // Sort by timestamp descending
    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({ feed: feed.slice(0, 30) });
  } catch (err) {
    console.error('[friends/activity]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
