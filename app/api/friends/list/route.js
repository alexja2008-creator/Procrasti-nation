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

    // Get all friendships involving this user
    const { data: friendships, error: fError } = await supabaseAdmin
      .from('friendships')
      .select('id, requester, addressee, status, created_at')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`);

    if (fError) {
      return NextResponse.json({ error: fError.message }, { status: 500 });
    }

    // Partition into friends, incoming, outgoing
    const accepted = [];
    const incoming = [];
    const outgoing = [];
    const friendUserIds = [];

    for (const f of (friendships || [])) {
      const otherUserId = f.requester === user.id ? f.addressee : f.requester;

      if (f.status === 'accepted') {
        accepted.push({ friendshipId: f.id, userId: otherUserId });
        friendUserIds.push(otherUserId);
      } else if (f.status === 'pending') {
        if (f.addressee === user.id) {
          incoming.push({ friendshipId: f.id, userId: f.requester, requestedAt: f.created_at });
        } else {
          outgoing.push({ friendshipId: f.id, userId: f.addressee, requestedAt: f.created_at });
        }
      }
    }

    // Collect all user IDs we need profiles for
    const allUserIds = [
      ...friendUserIds,
      ...incoming.map(r => r.userId),
      ...outgoing.map(r => r.userId),
    ];

    // Batch fetch profiles
    let profileMap = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', allUserIds);

      for (const p of (profiles || [])) {
        profileMap[p.user_id] = { username: p.username, displayName: p.display_name };
      }
    }

    // Batch fetch stats for accepted friends only
    let statsMap = {};
    if (friendUserIds.length > 0) {
      // Get completed task counts
      const { data: taskCounts } = await supabaseAdmin
        .from('tasks')
        .select('user_id')
        .in('user_id', friendUserIds)
        .eq('status', 'completed');

      // Count per user
      const countByUser = {};
      for (const t of (taskCounts || [])) {
        countByUser[t.user_id] = (countByUser[t.user_id] || 0) + 1;
      }

      // Get streaks
      const { data: streaks } = await supabaseAdmin
        .from('streaks')
        .select('user_id, current_streak, highest_streak')
        .in('user_id', friendUserIds);

      const streakByUser = {};
      for (const s of (streaks || [])) {
        streakByUser[s.user_id] = { currentStreak: s.current_streak, highestStreak: s.highest_streak };
      }

      for (const uid of friendUserIds) {
        statsMap[uid] = {
          completedTasks: countByUser[uid] || 0,
          currentStreak: streakByUser[uid]?.currentStreak || 0,
          highestStreak: streakByUser[uid]?.highestStreak || 0,
        };
      }
    }

    // Build response
    const friends = accepted.map(f => ({
      userId: f.userId,
      username: profileMap[f.userId]?.username || 'unknown',
      displayName: profileMap[f.userId]?.displayName || '',
      completedTasks: statsMap[f.userId]?.completedTasks || 0,
      currentStreak: statsMap[f.userId]?.currentStreak || 0,
      highestStreak: statsMap[f.userId]?.highestStreak || 0,
    }));

    const incomingRequests = incoming.map(r => ({
      userId: r.userId,
      username: profileMap[r.userId]?.username || 'unknown',
      displayName: profileMap[r.userId]?.displayName || '',
      requestedAt: r.requestedAt,
    }));

    const outgoingRequests = outgoing.map(r => ({
      userId: r.userId,
      username: profileMap[r.userId]?.username || 'unknown',
      displayName: profileMap[r.userId]?.displayName || '',
      requestedAt: r.requestedAt,
    }));

    return NextResponse.json({ friends, incoming: incomingRequests, outgoing: outgoingRequests });
  } catch (err) {
    console.error('[friends/list]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
