'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, Plus, LogOut, Target, Coffee, BookOpen, Briefcase, GraduationCap, X, ExternalLink } from 'lucide-react';
import { useTheme, useAuth } from '../providers';
import { supabase } from '../../lib/supabase';
import Navigation from '../../components/Navigation';
import StaleTaskPrompt from '../../components/StaleTaskPrompt';

export default function FocusPodsPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [pods, setPods] = useState([]);
  const [currentPod, setCurrentPod] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTasks, setUserTasks] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [podName, setPodName] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('study');
  const [maxParticipants, setMaxParticipants] = useState('4');

  const categories = [
    { id: 'study', name: 'Study Session', icon: BookOpen, color: 'emerald' },
    { id: 'work', name: 'Work Sprint', icon: Briefcase, color: 'blue' },
    { id: 'writing', name: 'Writing Time', icon: Target, color: 'violet' },
    { id: 'exam', name: 'Exam Prep', icon: GraduationCap, color: 'rose' },
    { id: 'break', name: 'Coffee Break', icon: Coffee, color: 'amber' },
  ];

  const colorStyles = {
    emerald: { bg: darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100', text: darkMode ? 'text-emerald-400' : 'text-emerald-600', solid: 'bg-emerald-500' },
    blue: { bg: darkMode ? 'bg-blue-900/30' : 'bg-blue-100', text: darkMode ? 'text-blue-400' : 'text-blue-600', solid: 'bg-blue-500' },
    violet: { bg: darkMode ? 'bg-violet-900/30' : 'bg-violet-100', text: darkMode ? 'text-violet-400' : 'text-violet-600', solid: 'bg-violet-500' },
    rose: { bg: darkMode ? 'bg-rose-900/30' : 'bg-rose-100', text: darkMode ? 'text-rose-400' : 'text-rose-600', solid: 'bg-rose-500' },
    amber: { bg: darkMode ? 'bg-amber-900/30' : 'bg-amber-100', text: darkMode ? 'text-amber-400' : 'text-amber-600', solid: 'bg-amber-500' },
  };

  const getCategoryData = (catId) => categories.find(c => c.id === catId) || categories[0];

  const formatTimeRemaining = (endTime) => {
    const remaining = Math.max(0, new Date(endTime) - Date.now());
    const minutes = Math.floor(remaining / 60000);
    return minutes > 0 ? `${minutes} min left` : 'Ending soon';
  };

  useEffect(() => {
    loadPods();
    const interval = setInterval(loadPods, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user tasks for stale task surfacing in empty pod state
  useEffect(() => {
    if (!user) return;
    supabase
      .from('tasks')
      .select('id, title, created_at, completed_steps, total_steps, status')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .then(({ data }) => setUserTasks(data || []));
  }, [user]);

  const loadPods = async () => {
    // Clean up expired pods
    await supabase
      .from('focus_pods')
      .delete()
      .lt('end_time', new Date().toISOString());

    const { data } = await supabase
      .from('focus_pods')
      .select('*')
      .order('created_at', { ascending: false });

    setPods(data || []);
    setLoading(false);
  };

  const createPod = async () => {
    if (!podName.trim() || !user) return;
    setCreating(true);
    setError('');

    const endTime = new Date(Date.now() + parseInt(duration) * 60 * 1000);

    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podName, endTime }),
      });

      const roomData = await res.json();
      if (!res.ok) throw new Error(roomData.error || 'Failed to create room');

      const { data, error: dbError } = await supabase.from('focus_pods').insert({
        name: podName,
        category,
        duration: parseInt(duration),
        max_participants: parseInt(maxParticipants),
        participants: 1,
        room_url: roomData.roomUrl,
        created_by: user.id,
        end_time: endTime.toISOString(),
      }).select().single();

      if (dbError) throw new Error(dbError.message);

      setPodName('');
      setShowCreateForm(false);
      setCurrentPod(data);
      await loadPods();
    } catch (err) {
      setError(err.message);
    }

    setCreating(false);
  };

  const joinPod = async (pod) => {
    if (!user) return;
    if (pod.participants >= pod.max_participants) {
      setError('This pod is full!');
      return;
    }

    await supabase
      .from('focus_pods')
      .update({ participants: pod.participants + 1 })
      .eq('id', pod.id);

    setCurrentPod(pod);
    await loadPods();
  };

  const leavePod = async () => {
    if (!currentPod) return;

    await supabase
      .from('focus_pods')
      .update({ participants: Math.max(0, currentPod.participants - 1) })
      .eq('id', currentPod.id);

    setCurrentPod(null);
    await loadPods();
  };

  // In-pod view with embedded Whereby room
  if (currentPod) {
    const categoryData = getCategoryData(currentPod.category);
    const CategoryIcon = categoryData.icon;
    const styles = colorStyles[categoryData.color];

    return (
      <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Navigation />

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Pod Header */}
          <div className={`rounded-2xl p-6 mb-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`${styles.solid} rounded-xl p-3`}>
                  <CategoryIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentPod.name}</h2>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {currentPod.participants} of {currentPod.max_participants} participants • {formatTimeRemaining(currentPod.end_time)}
                  </p>
                </div>
              </div>
              <button
                onClick={leavePod}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Pod</span>
              </button>
            </div>
          </div>

          {/* Whereby Embed */}
          <div className={`rounded-2xl overflow-hidden border mb-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <iframe
              src={currentPod.room_url}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              className="w-full"
              style={{ height: '580px', border: 'none' }}
            />
          </div>

          <div className="text-center mb-6">
            <a
              href={currentPod.room_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center space-x-2 text-sm ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in new tab for better experience</span>
            </a>
          </div>

          {/* Focus Tips */}
          <div className={`rounded-2xl p-6 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>📚 Focus Tips</h3>
            <ul className={`space-y-1.5 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <li>• Stay muted unless you need to chat</li>
              <li>• Use the pomodoro technique: 25 min work, 5 min break</li>
              <li>• Share your goals at the start of the session</li>
              <li>• Celebrate wins together at the end!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Lobby view
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'
          }`}>
            <Users className="w-4 h-4" />
            <span>Virtual Co-Working</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Focus Pods</h1>
          <p className={`text-lg sm:text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Work alongside others. Stay accountable. Get things done.
          </p>
        </div>

        {!user ? (
          <div className={`rounded-2xl p-12 border text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign in to join Focus Pods</h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Create an account to start or join a co-working session.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-between">
                <p>{error}</p>
                <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
              </div>
            )}

            <div className="mb-8">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-6 h-6" />
                <span>Create New Pod</span>
              </button>
            </div>

            {showCreateForm && (
              <div className={`rounded-2xl p-8 mb-8 border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Create Your Focus Pod</h3>
                  <button onClick={() => setShowCreateForm(false)} className={darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}>
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Pod Name</label>
                    <input
                      type="text"
                      value={podName}
                      onChange={(e) => setPodName(e.target.value)}
                      placeholder="e.g., Morning Study Crew, Essay Writing Party"
                      className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                        darkMode
                          ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                          : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Duration</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="90">90 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Max People</label>
                      <select
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          darkMode ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white' : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900'
                        }`}
                      >
                        <option value="2">2 people</option>
                        <option value="3">3 people</option>
                        <option value="4">4 people</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={createPod}
                    disabled={!podName.trim() || creating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2"
                  >
                    {creating ? (
                      <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /><span>Creating room...</span></>
                    ) : (
                      <span>Create Pod</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Active Pods</h2>

              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
                </div>
              ) : pods.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pods.map(pod => {
                    const categoryData = getCategoryData(pod.category);
                    const CategoryIcon = categoryData.icon;
                    const styles = colorStyles[categoryData.color];
                    const isFull = pod.participants >= pod.max_participants;

                    return (
                      <div
                        key={pod.id}
                        className={`rounded-2xl p-6 border transition-all hover:shadow-lg ${
                          darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' : 'bg-white border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`${styles.bg} rounded-xl p-3`}>
                            <CategoryIcon className={`w-6 h-6 ${styles.text}`} />
                          </div>
                          <span className={`text-sm px-3 py-1 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {formatTimeRemaining(pod.end_time)}
                          </span>
                        </div>

                        <h3 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{pod.name}</h3>
                        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{categoryData.name}</p>

                        <div className={`flex items-center justify-between mb-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>{pod.participants}/{pod.max_participants}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{pod.duration} min</span>
                          </div>
                        </div>

                        <button
                          onClick={() => joinPod(pod)}
                          disabled={isFull}
                          className={`w-full px-6 py-3 rounded-xl font-semibold transition ${
                            isFull
                              ? darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isFull ? 'Full' : 'Join Pod'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-16 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <Users className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`text-xl mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No active pods right now</p>
                  <p className={`mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Create one and start a co-working session, or check back later.</p>
                  {user && userTasks.length > 0 && (
                    <div className="max-w-md mx-auto mt-6">
                      <StaleTaskPrompt tasks={userTasks} darkMode={darkMode} compact />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
