'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '../../providers';
import Navigation from '../../../components/Navigation';
import { User, Calendar, Trophy, Flame, Shield } from 'lucide-react';

export default function PublicProfilePage() {
  const { darkMode } = useTheme();
  const params = useParams();
  const username = params.username;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch {
        setError('Failed to load profile');
      }
      setLoading(false);
    }
    load();
  }, [username]);

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
