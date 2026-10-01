'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, UserPlus, UserCheck, Clock, X, BellRing, PartyPopper, CheckCircle2, Flame, Send, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';

export default function FriendsPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();

  // Data state
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  // Nudge/praise inline form state
  const [nudgeTarget, setNudgeTarget] = useState(null); // { userId, type: 'nudge'|'praise' }
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [sendingNudge, setSendingNudge] = useState(false);

  // Overflow menu
  const [menuOpen, setMenuOpen] = useState(null);

  // Action feedback
  const [actionFeedback, setActionFeedback] = useState('');

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }, []);

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 3000);
  };

  // Load friends, requests, and activity
  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const headers = await getAuthHeaders();
    if (!headers) { setLoading(false); return; }

    try {
      const [listRes, activityRes] = await Promise.all([
        fetch('/api/friends/list', { headers }),
        fetch('/api/friends/activity', { headers }),
      ]);

      if (listRes.ok) {
        const data = await listRes.json();
        setFriends(data.friends || []);
        setIncoming(data.incoming || []);
        setOutgoing(data.outgoing || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.feed || []);
      }
    } catch (err) {
      console.error('[friends] load error:', err);
    }
    setLoading(false);
  };

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const headers = await getAuthHeaders();
      if (!headers) { setSearching(false); return; }

      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('[friends] search error:', err);
      }
      setSearching(false);
    }, 300);
  }, [searchQuery]);

  // Friend request actions
  const handleRequest = async (action, targetUserId) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, targetUserId }),
      });
      if (res.ok) {
        showFeedback(action === 'send' ? 'Request sent!' : action === 'accept' ? 'Friend added!' : 'Done');
        loadAll();
        // Refresh search results if search is active
        if (searchQuery.trim().length >= 2) {
          const searchRes = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`, { headers });
          if (searchRes.ok) {
            const data = await searchRes.json();
            setSearchResults(data.results || []);
          }
        }
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Something went wrong');
      }
    } catch (err) {
      showFeedback('Network error');
    }
  };

  // Send nudge/praise
  const handleSendNudge = async () => {
    if (!nudgeTarget) return;
    setSendingNudge(true);
    const headers = await getAuthHeaders();
    if (!headers) { setSendingNudge(false); return; }

    try {
      const res = await fetch('/api/friends/nudge', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          friendUserId: nudgeTarget.userId,
          type: nudgeTarget.type,
          message: nudgeMessage.trim() || null,
        }),
      });

      if (res.ok) {
        showFeedback(nudgeTarget.type === 'nudge' ? 'Nudge sent!' : 'Praise sent!');
        setNudgeTarget(null);
        setNudgeMessage('');
        loadAll(); // Refresh activity
      } else {
        const data = await res.json();
        showFeedback(data.error || 'Failed to send');
      }
    } catch (err) {
      showFeedback('Network error');
    }
    setSendingNudge(false);
  };

  const relativeTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  if (!user) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign in to see Friends</h1>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Connect with friends to stay accountable together.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      {/* Feedback toast */}
      {actionFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg animate-bounce">
          {actionFeedback}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl sm:text-5xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Friends</h1>
          <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Stay accountable. Nudge your friends. Celebrate wins together.
          </p>
        </div>

        {/* Pending Requests */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className={`rounded-2xl p-6 border mb-6 ${darkMode ? 'bg-amber-900/15 border-amber-800/50' : 'bg-amber-50 border-amber-200'}`}>
            {incoming.length > 0 && (
              <>
                <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                  {incoming.length} incoming request{incoming.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2 mb-4">
                  {incoming.map(r => (
                    <div key={r.userId} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                          {(r.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{r.displayName || r.username}</p>
                          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>@{r.username}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleRequest('accept', r.userId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Accept</button>
                        <button onClick={() => handleRequest('reject', r.userId)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {outgoing.length > 0 && (
              <>
                <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {outgoing.length} pending sent
                </p>
                <div className="space-y-2">
                  {outgoing.map(r => (
                    <div key={r.userId} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-800/80' : 'bg-white'}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                          {(r.username || '?')[0].toUpperCase()}
                        </div>
                        <p className={`font-semibold text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>@{r.username}</p>
                      </div>
                      <button onClick={() => handleRequest('cancel', r.userId)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>Cancel</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Search */}
        <div className={`rounded-2xl p-6 border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Find friends by username</p>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Search by username..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Search results */}
          {searchQuery.trim().length >= 2 && (
            <div className="mt-3 space-y-2">
              {searching && <p className={`text-sm py-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Searching...</p>}
              {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                <p className={`text-sm py-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No users found matching "{searchQuery}"</p>
              )}
              {searchResults.map(r => (
                <div key={r.userId} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(r.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{r.displayName || r.username}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>@{r.username}</p>
                    </div>
                  </div>
                  {r.friendshipStatus === 'none' && (
                    <button onClick={() => handleRequest('send', r.userId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition flex items-center space-x-1">
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </button>
                  )}
                  {r.friendshipStatus === 'pending_sent' && (
                    <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                      <Clock className="w-4 h-4 inline mr-1" />Pending
                    </span>
                  )}
                  {r.friendshipStatus === 'pending_received' && (
                    <button onClick={() => handleRequest('accept', r.userId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition">Accept</button>
                  )}
                  {r.friendshipStatus === 'accepted' && (
                    <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      <UserCheck className="w-4 h-4 inline mr-1" />Friends
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend List */}
        <div className="mb-6">
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Your Friends {friends.length > 0 && <span className={`text-sm font-normal ml-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({friends.length})</span>}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : friends.length === 0 ? (
            <div className={`rounded-2xl p-8 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <Users className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Find your people</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search by username above to add friends and hold each other accountable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.map(f => (
                <div key={f.userId} className={`rounded-2xl p-5 border transition-colors relative ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {/* Overflow menu */}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => setMenuOpen(menuOpen === f.userId ? null : f.userId)}
                      className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === f.userId && (
                      <div className={`absolute right-0 mt-1 w-40 rounded-xl border shadow-lg z-10 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                        <Link
                          href={`/profile/${f.username}`}
                          className={`block px-4 py-2.5 text-sm rounded-t-xl transition ${darkMode ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          View Profile
                        </Link>
                        <button
                          onClick={() => { setMenuOpen(null); handleRequest('remove', f.userId); }}
                          className={`block w-full text-left px-4 py-2.5 text-sm rounded-b-xl transition ${darkMode ? 'text-rose-400 hover:bg-slate-600' : 'text-rose-600 hover:bg-slate-50'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-2" />Remove Friend
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Friend info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      {(f.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{f.displayName || f.username}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>@{f.username}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`flex items-center space-x-1.5 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${f.completedTasks > 0 ? 'text-emerald-500' : ''}`} />
                      <span>{f.completedTasks} done</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Flame className={`w-4 h-4 ${f.currentStreak > 0 ? 'text-orange-500' : ''}`} />
                      <span>{f.currentStreak}d streak</span>
                    </div>
                  </div>

                  {/* Nudge/Praise buttons or inline form */}
                  {nudgeTarget?.userId === f.userId ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={nudgeMessage}
                          onChange={(e) => setNudgeMessage(e.target.value.slice(0, 140))}
                          placeholder={nudgeTarget.type === 'nudge' ? 'Optional message (e.g. "Let\'s go!")' : 'Optional message (e.g. "So proud!")'}
                          className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${
                            darkMode
                              ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                              : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                          }`}
                          maxLength={140}
                          autoFocus
                        />
                        <button
                          onClick={handleSendNudge}
                          disabled={sendingNudge}
                          className={`p-2 rounded-lg transition ${nudgeTarget.type === 'nudge'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setNudgeTarget(null); setNudgeMessage(''); }}
                          className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{nudgeMessage.length}/140</p>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => { setNudgeTarget({ userId: f.userId, type: 'nudge' }); setNudgeMessage(''); }}
                        className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                          darkMode ? 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <BellRing className="w-4 h-4" />
                        <span>Get Moving</span>
                      </button>
                      <button
                        onClick={() => { setNudgeTarget({ userId: f.userId, type: 'praise' }); setNudgeMessage(''); }}
                        className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                          darkMode ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <PartyPopper className="w-4 h-4" />
                        <span>Nice Work</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Activity</h2>

          {activity.length === 0 && !loading ? (
            <div className={`rounded-2xl p-6 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {friends.length > 0 ? "Your friends have been quiet. Give them a nudge!" : "Add friends to see their activity here."}
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl border divide-y ${darkMode ? 'bg-slate-800 border-slate-700 divide-slate-700' : 'bg-white border-slate-200 divide-slate-100'}`}>
              {activity.map((item, i) => (
                <div key={i} className="flex items-start space-x-3 p-4">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.type === 'completion' ? darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : item.type === 'streak' ? darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-600'
                    : (item.type === 'nudge_received' || item.type === 'nudge_sent') ? darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {item.type === 'completion' && <CheckCircle2 className="w-4 h-4" />}
                    {item.type === 'streak' && <Flame className="w-4 h-4" />}
                    {(item.type === 'nudge_received' || item.type === 'nudge_sent') && <BellRing className="w-4 h-4" />}
                    {(item.type === 'praise_received' || item.type === 'praise_sent') && <PartyPopper className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.type === 'completion' && <><strong>@{item.username}</strong> completed {item.count} task{item.count > 1 ? 's' : ''}</>}
                      {item.type === 'streak' && <><strong>@{item.username}</strong> is on a {item.streak}-day streak</>}
                      {item.type === 'nudge_received' && <><strong>@{item.username}</strong> nudged you: get moving!</>}
                      {item.type === 'nudge_sent' && <>You nudged <strong>@{item.username}</strong></>}
                      {item.type === 'praise_received' && <><strong>@{item.username}</strong> said: nice work!</>}
                      {item.type === 'praise_sent' && <>You praised <strong>@{item.username}</strong></>}
                    </p>
                    {item.message && (
                      <p className={`text-xs mt-0.5 italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>"{item.message}"</p>
                    )}
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{relativeTime(item.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
