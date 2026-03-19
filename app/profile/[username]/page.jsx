'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme, useAuth } from '../../providers';
import Navigation from '../../../components/Navigation';
import { supabase } from '../../../lib/supabase';
import { User, Calendar, Trophy, Flame, Shield, UserPlus, Clock, BellRing, PartyPopper, Check, X, UserMinus } from 'lucide-react';

export default function PublicProfilePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const params = useParams();
  const username = params.username;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friendshipStatus, setFriendshipStatus] = useState('none'); // none, pending_sent, pending_received, accepted
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [nudgeType, setNudgeType] = useState(null); // 'nudge' or 'praise'
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [nudgeSending, setNudgeSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!username) return;
    async function load() {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
        if (!res.ok) {
          setError('User not found');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProfileData(data);

        // Check friendship status if logged in
        if (user && data.userId && data.userId !== user.id) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const searchRes = await fetch(`/api/friends/search?q=${encodeURIComponent(username)}`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (searchRes.ok) {
              const { results } = await searchRes.json();
              const match = results.find(r => r.userId === data.userId);
              if (match) setFriendshipStatus(match.friendshipStatus);
            }
          }
        }
      } catch {
        setError('Failed to load profile');
      }
      setLoading(false);
    }
    load();
  }, [username, user]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleFriendAction = async (action) => {
    if (!profileData?.userId) return;
    setFriendActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, targetUserId: profileData.userId }),
      });
      if (res.ok) {
        if (action === 'send') { setFriendshipStatus('pending_sent'); showFeedback('Friend request sent!'); }
        else if (action === 'accept') { setFriendshipStatus('accepted'); showFeedback('Friend request accepted!'); }
        else if (action === 'reject') { setFriendshipStatus('none'); showFeedback('Request declined.'); }
        else if (action === 'cancel') { setFriendshipStatus('none'); showFeedback('Request cancelled.'); }
        else if (action === 'remove') { setFriendshipStatus('none'); showFeedback('Friend removed.'); }
      }
    } catch {}
    setFriendActionLoading(false);
  };

  const handleNudge = async () => {
    if (!profileData?.userId || !nudgeType) return;
    setNudgeSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/friends/nudge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendUserId: profileData.userId, type: nudgeType, message: nudgeMessage.trim() || undefined }),
      });
      if (res.ok) {
        showFeedback(nudgeType === 'nudge' ? 'Nudge sent!' : 'Praise sent!');
        setNudgeType(null);
        setNudgeMessage('');
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Failed to send');
      }
    } catch {
      showFeedback('Failed to send');
    }
    setNudgeSending(false);
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className={`animate-pulse text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading profile...</div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <User className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{error}</h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>The username &quot;{username}&quot; doesn&apos;t exist.</p>
          </div>
        ) : profileData && (
          <>
            {/* Identity card */}
            <div className={`rounded-2xl p-6 border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
                  darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {profileData.username[0].toUpperCase()}
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {profileData.displayName || profileData.username}
                  </h1>
                  <p className={`text-sm font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>@{profileData.username}</p>
                  <div className={`flex items-center gap-1.5 text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Calendar className="w-4 h-4" />
                    <span>Joined the Nation in {profileData.joinedAt}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback toast */}
            {feedback && (
              <div className={`rounded-xl p-3 mb-4 text-sm font-medium text-center ${
                darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {feedback}
              </div>
            )}

            {/* Friend actions */}
            {user && profileData.userId && profileData.userId !== user.id && (
              <div className={`rounded-2xl p-4 border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {friendshipStatus === 'none' && (
                    <button
                      onClick={() => handleFriendAction('send')}
                      disabled={friendActionLoading}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        darkMode ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      } disabled:opacity-50`}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  )}
                  {friendshipStatus === 'pending_sent' && (
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium ${
                        darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        Request Sent
                      </span>
                      <button
                        onClick={() => handleFriendAction('cancel')}
                        disabled={friendActionLoading}
                        className={`text-xs font-medium px-3 py-2 rounded-lg transition ${
                          darkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'
                        } disabled:opacity-50`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {friendshipStatus === 'pending_received' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFriendAction('accept')}
                        disabled={friendActionLoading}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          darkMode ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        } disabled:opacity-50`}
                      >
                        <Check className="w-4 h-4" />
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleFriendAction('reject')}
                        disabled={friendActionLoading}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                          darkMode ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'
                        } disabled:opacity-50`}
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  )}
                  {friendshipStatus === 'accepted' && (
                    <>
                      <button
                        onClick={() => { setNudgeType(nudgeType === 'nudge' ? null : 'nudge'); setNudgeMessage(''); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          nudgeType === 'nudge'
                            ? 'bg-emerald-600 text-white'
                            : darkMode ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <BellRing className="w-4 h-4" />
                        Get Moving
                      </button>
                      <button
                        onClick={() => { setNudgeType(nudgeType === 'praise' ? null : 'praise'); setNudgeMessage(''); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                          nudgeType === 'praise'
                            ? 'bg-amber-600 text-white'
                            : darkMode ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <PartyPopper className="w-4 h-4" />
                        Nice Work
                      </button>
                      <button
                        onClick={() => handleFriendAction('remove')}
                        disabled={friendActionLoading}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ml-auto ${
                          darkMode ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                        } disabled:opacity-50`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </>
                  )}
                </div>

                {/* Nudge message input */}
                {nudgeType && friendshipStatus === 'accepted' && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={nudgeMessage}
                      onChange={(e) => setNudgeMessage(e.target.value.slice(0, 140))}
                      placeholder={nudgeType === 'nudge' ? 'Add a message (optional)...' : 'Say something nice (optional)...'}
                      className={`flex-1 text-sm px-3 py-2 rounded-lg border outline-none transition ${
                        darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                      }`}
                    />
                    <button
                      onClick={handleNudge}
                      disabled={nudgeSending}
                      className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 ${
                        nudgeType === 'nudge' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {nudgeSending ? '...' : 'Send'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Public stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Trophy className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} />
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profileData.completedTasks}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tasks Completed</p>
              </div>
              <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Flame className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profileData.currentStreak}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Streak</p>
              </div>
              <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <Shield className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profileData.highestStreak}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Best Streak</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
