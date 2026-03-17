'use client';

import { useState, useEffect } from 'react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import { User, Calendar, Trophy, Flame, Shield, Lock, Check, Pencil } from 'lucide-react';

const TYPE_LABELS = {
  avoider: { label: 'Avoider', color: 'amber', description: 'You tend to avoid starting tasks due to anxiety about the task itself.' },
  perfectionist: { label: 'Perfectionist', color: 'violet', description: 'You delay because you fear imperfect output.' },
  overwhelmed: { label: 'Overwhelmed', color: 'blue', description: 'You struggle to start because tasks feel too large.' },
  boredom: { label: 'Boredom-Prone', color: 'rose', description: 'You put off tasks you find uninteresting.' },
};

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
}

export default function ProfilePage() {
  const { darkMode } = useTheme();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ completed: 0, currentStreak: 0, highestStreak: 0 });
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      const [{ count }, { data: streak }] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('streaks').select('current_streak, highest_streak').eq('user_id', user.id).maybeSingle(),
      ]);
      setStats({
        completed: count || 0,
        currentStreak: streak?.current_streak || 0,
        highestStreak: streak?.highest_streak || 0,
      });
    }
    loadStats();
  }, [user]);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('user_id', user.id);
    setSavingName(false);
    setEditingName(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    if (newPassword.length < 6) {
      setPasswordErr('Password must be at least 6 characters.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordErr(error.message);
    } else {
      setPasswordMsg('Password updated successfully.');
      setNewPassword('');
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Navigation />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <User className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign in to view your profile</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Your stats, settings, and account info live here.</p>
        </div>
      </div>
    );
  }

  const procType = user.user_metadata?.procrastination_type;
  const typeInfo = procType ? TYPE_LABELS[procType] : null;
  const joinedDate = new Date(user.created_at);
  const joinedStr = joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className={`text-3xl sm:text-4xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Your Profile</h1>

        {/* Identity card */}
        <div className={`rounded-2xl p-6 border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
              darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {(profile?.username || user.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                      className={`px-3 py-1 rounded-lg border text-sm font-bold ${
                        darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button onClick={handleSaveName} disabled={savingName} className="text-emerald-500 hover:text-emerald-400">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {profile?.display_name || profile?.username || 'Citizen'}
                    </h2>
                    <button onClick={() => setEditingName(true)} className={darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}>
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              {profile?.username && (
                <p className={`text-sm font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>@{profile.username}</p>
              )}
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{maskEmail(user.email)}</p>
              <div className={`flex items-center gap-1.5 text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Calendar className="w-4 h-4" />
                <span>Joined the Nation in {joinedStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Trophy className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-500'}`} />
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.completed}</p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed</p>
          </div>
          <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Flame className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.currentStreak}</p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Streak</p>
          </div>
          <div className={`rounded-2xl p-5 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Shield className={`w-6 h-6 mx-auto mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stats.highestStreak}</p>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Best Streak</p>
          </div>
        </div>

        {/* Procrastination type badge */}
        {typeInfo && (
          <div className={`rounded-2xl p-5 border mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Your Procrastination Type</p>
            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{typeInfo.label}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{typeInfo.description}</p>
          </div>
        )}

        {/* Change password */}
        <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Lock className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              minLength={6}
              className={`flex-1 px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap"
            >
              Update
            </button>
          </form>
          {passwordErr && <p className={`text-sm mt-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{passwordErr}</p>}
          {passwordMsg && <p className={`text-sm mt-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{passwordMsg}</p>}
        </div>
      </div>
    </div>
  );
}
