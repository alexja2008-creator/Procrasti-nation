import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { count } = await supabaseAdmin
      .from('friend_nudges')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);

    return NextResponse.json({ unread: count || 0 });
  } catch (err) {
    console.error('[friends/unread] GET', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { nudgeIds } = await request.json();

    if (!nudgeIds || !Array.isArray(nudgeIds) || nudgeIds.length === 0) {
      return NextResponse.json({ error: 'Missing nudgeIds' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('friend_nudges')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .in('id', nudgeIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[friends/unread] PATCH', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
