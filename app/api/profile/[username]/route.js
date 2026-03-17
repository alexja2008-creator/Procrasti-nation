import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { username } = await params;

  if (!username || username.length < 3) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Look up profile by username
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('user_id, username, display_name, created_at')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Fetch aggregate stats
  const [{ count }, { data: streak }] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
      .eq('status', 'completed'),
    supabaseAdmin
      .from('streaks')
      .select('current_streak, highest_streak')
      .eq('user_id', profile.user_id)
      .maybeSingle(),
  ]);

  const joinedDate = new Date(profile.created_at);
  const joinedAt = joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return NextResponse.json({
    username: profile.username,
    displayName: profile.display_name,
    joinedAt,
    completedTasks: count || 0,
    currentStreak: streak?.current_streak || 0,
    highestStreak: streak?.highest_streak || 0,
  });
}
