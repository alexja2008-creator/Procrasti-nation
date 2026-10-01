'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BellRing, PartyPopper } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function FriendNudgeInbox({ darkMode }) {
  const [nudges, setNudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const markedRef = useRef(false);

  useEffect(() => {
    loadUnreadNudges();
  }, []);

  // Auto-mark as read after 3 seconds on screen
  useEffect(() => {
    if (nudges.length === 0 || markedRef.current) return;
    const timer = setTimeout(async () => {
      markedRef.current = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        await fetch('/api/friends/unread', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nudgeIds: nudges.map(n => n.id) }),
        });
      } catch (err) {
        console.error('[FriendNudgeInbox] mark read error:', err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [nudges]);

  const loadUnreadNudges = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      // Fetch up to 3 unread nudges with sender info
      const { data, error } = await supabase
        .from('friend_nudges')
        .select('id, sender_id, type, message, created_at')
        .eq('receiver_id', session.user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Get sender profiles
      const senderIds = [...new Set(data.map(n => n.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', senderIds);

      const profileMap = {};
      for (const p of (profiles || [])) {
        profileMap[p.user_id] = p;
      }

      const enriched = data.map(n => ({
        ...n,
        senderUsername: profileMap[n.sender_id]?.username || 'someone',
        senderDisplayName: profileMap[n.sender_id]?.display_name || '',
      }));

      setNudges(enriched);
    } catch (err) {
      console.error('[FriendNudgeInbox] load error:', err);
    }
    setLoading(false);
  };

  if (loading || nudges.length === 0) return null;

  return (
    <div className={`rounded-2xl p-4 border mb-8 ${
      darkMode ? 'bg-emerald-900/15 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
          From your friends
        </p>
        <Link href="/friends" className={`text-xs font-semibold transition ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {nudges.map(n => (
          <div key={n.id} className={`flex items-start space-x-3 p-3 rounded-xl ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              n.type === 'nudge'
                ? darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                : darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
            }`}>
              {n.type === 'nudge' ? <BellRing className="w-3.5 h-3.5" /> : <PartyPopper className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <strong>@{n.senderUsername}</strong>{' '}
                {n.type === 'nudge' ? 'says: get moving!' : 'says: nice work!'}
              </p>
              {n.message && (
                <p className={`text-xs mt-0.5 italic truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>"{n.message}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
