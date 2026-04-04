'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Brain, Zap, Users, BarChart3, Sparkles, Clock, Calendar, Flame, Target, TrendingUp } from 'lucide-react';
import { useTheme, useAuth } from './providers';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import AuthModal from '../components/AuthModal';
import Logo from '../components/Logo';
import FriendNudgeInbox from '../components/FriendNudgeInbox';

export default function LandingPage() {
  const { darkMode } = useTheme();
  const { user, trialStatus } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Command center state (logged-in hero)
  const [streak, setStreak] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [nextCommitment, setNextCommitment] = useState(null);
  const [staleTasks, setStaleTasks] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const TYPE_ENCOURAGEMENTS = {
    avoider: "You don't have to do it all — just the next step.",
    perfectionist: "Done beats perfect. Always.",
    overwhelmed: "One small step is all it takes to start.",
    boredom: "Mix it up today. Variety keeps momentum alive.",
  };

  useEffect(() => {
    if (user) loadCommandCenterData();
  }, [user]);

  const loadCommandCenterData = async () => {
    setLoadingStats(true);
    try {
      // Fetch all in parallel
      const [streakRes, activeRes, completedRes, commitmentRes] = await Promise.all([
        supabase.from('streaks').select('current_streak').eq('user_id', user.id).maybeSingle(),
        supabase.from('tasks').select('id, title, completed_steps, total_steps, created_at, start_commitment', { count: 'exact' }).eq('user_id', user.id).eq('status', 'in_progress'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('tasks').select('title, start_commitment').eq('user_id', user.id).eq('status', 'in_progress').not('start_commitment', 'is', null).gt('start_commitment', new Date().toISOString()).order('start_commitment', { ascending: true }).limit(1),
      ]);

      setStreak(streakRes.data?.current_streak || 0);
      setActiveTasks(activeRes.count || 0);
      setCompletedTasks(completedRes.count || 0);
      if (commitmentRes.data?.[0]) {
        setNextCommitment(commitmentRes.data[0]);
      }

      // Find stale tasks (in_progress, 24h+ old, 0 completed steps)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stale = (activeRes.data || []).filter(t =>
        (t.completed_steps || 0) === 0 && t.created_at < oneDayAgo
      );
      setStaleTasks(stale.slice(0, 3));
    } catch (err) {
      console.error('Failed to load command center:', err);
    }
    setLoadingStats(false);
  };

  const handleCTA = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  const [proLoading, setProLoading] = useState(false);
  const handleProCTA = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (trialStatus === 'pro') {
      window.location.href = '/planner';
      return;
    }
    setProLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: 'monthly' }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setProLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Hero Section */}
      {user ? (
        /* Logged-in: personalized command center */
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-20">
          {/* Greeting */}
          <div className="text-center mb-10">
            <h1 className={`text-4xl md:text-5xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Welcome back{user.user_metadata?.username ? `, ${user.user_metadata.username}` : ''}.
            </h1>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {TYPE_ENCOURAGEMENTS[user.user_metadata?.procrastination_type] || "Let's make today count."}
            </p>
          </div>

          {/* Stats Row */}
          {!loadingStats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className={`rounded-2xl p-5 border text-center transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <Flame className={`w-7 h-7 mx-auto mb-2 ${streak > 0 ? 'text-orange-500' : darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{streak}</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Day streak</p>
              </div>
              <div className={`rounded-2xl p-5 border text-center transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <Target className={`w-7 h-7 mx-auto mb-2 ${activeTasks > 0 ? darkMode ? 'text-emerald-400' : 'text-emerald-600' : darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeTasks}</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active tasks</p>
              </div>
              <div className={`rounded-2xl p-5 border text-center transition-colors ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <TrendingUp className={`w-7 h-7 mx-auto mb-2 ${completedTasks > 0 ? darkMode ? 'text-teal-400' : 'text-teal-600' : darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{completedTasks}</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed</p>
              </div>
            </div>
          )}

          {/* Upcoming commitment */}
          {nextCommitment && (
            <div className={`rounded-2xl p-4 border mb-8 flex items-center space-x-3 ${
              darkMode ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
            }`}>
              <Clock className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                  Up next: {nextCommitment.title}
                </p>
                <p className={`text-xs ${darkMode ? 'text-amber-400/70' : 'text-amber-600'}`}>
                  Starting {new Date(nextCommitment.start_commitment).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(nextCommitment.start_commitment).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <Link href="/planner" className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex-shrink-0 ${
                darkMode ? 'bg-amber-800/50 text-amber-300 hover:bg-amber-800' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
              }`}>
                View
              </Link>
            </div>
          )}

          {/* Stale tasks nudge */}
          {staleTasks.length > 0 && (
            <div className={`rounded-2xl p-4 border mb-8 ${
              darkMode ? 'bg-rose-900/15 border-rose-800/50' : 'bg-rose-50 border-rose-200'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-rose-300' : 'text-rose-700'}`}>
                {staleTasks.length} task{staleTasks.length > 1 ? 's' : ''} collecting dust:
              </p>
              <ul className="space-y-1">
                {staleTasks.map(t => (
                  <li key={t.id}>
                    <Link href={`/planner?task=${t.id}`} className={`text-sm underline-offset-2 hover:underline ${
                      darkMode ? 'text-rose-400' : 'text-rose-600'
                    }`}>
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Friend nudge inbox */}
          <FriendNudgeInbox darkMode={darkMode} />

          {/* Quick-access nav cards */}
          <div className="grid grid-cols-2 gap-4">
            <Link href="/planner" className={`rounded-2xl p-6 border transition-all group hover:shadow-lg ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:border-emerald-600' : 'bg-white border-slate-200 hover:border-emerald-400'
            }`}>
              <Brain className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Plan a Task</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI breaks it down into steps</p>
            </Link>
            <Link href="/dashboard" className={`rounded-2xl p-6 border transition-all group hover:shadow-lg ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:border-violet-600' : 'bg-white border-slate-200 hover:border-violet-400'
            }`}>
              <BarChart3 className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
              <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dashboard</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Track progress and boards</p>
            </Link>
            <Link href="/calendar" className={`rounded-2xl p-6 border transition-all group hover:shadow-lg ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:border-blue-600' : 'bg-white border-slate-200 hover:border-blue-400'
            }`}>
              <Calendar className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Calendar</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>See your schedule at a glance</p>
            </Link>
            <Link href="/reset-station" className={`rounded-2xl p-6 border transition-all group hover:shadow-lg ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:border-teal-600' : 'bg-white border-slate-200 hover:border-teal-400'
            }`}>
              <Zap className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recovery Mode</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reset and refocus</p>
            </Link>
            <Link href="/friends" className={`rounded-2xl p-6 border transition-all group hover:shadow-lg ${
              darkMode ? 'bg-slate-800 border-slate-700 hover:border-pink-600' : 'bg-white border-slate-200 hover:border-pink-400'
            }`}>
              <Users className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`} />
              <h3 className={`font-bold text-lg mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Friends</h3>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nudge or praise your people</p>
            </Link>
          </div>
        </div>
      ) : (
        /* Logged-out: original hero */
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
              darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Sparkles className="w-4 h-4" />
              <span>For citizens of the procrastination nation</span>
            </div>

            <h1 className={`text-6xl md:text-7xl font-bold mb-6 tracking-tight ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              A nation of doers
              <br />
              <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>starts here.</span>
            </h1>

            <p className={`text-xl mb-10 leading-relaxed max-w-3xl mx-auto ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              We've all been citizens of procrastination. Time to change your status. AI breaks down your biggest tasks so the only thing left to do is start.
            </p>

            <div className="flex justify-center mb-6">
              <Link
                href="/planner"
                onClick={handleCTA}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
              >
                <span>Join the Nation</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Free to join • 14-day Pro trial included • No credit card required
            </p>
          </div>
        </div>
      )}

      {/* Value props bar */}
      <div className={`py-12 border-y transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-center items-center space-y-6 md:space-y-0 md:space-x-16`}>
            <div className="flex flex-col items-center text-center">
              <Brain className={`w-7 h-7 mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Declare independence from overwhelm</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Any task, broken into steps instantly</span>
            </div>
            <div className={`hidden md:block w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center text-center">
              <Zap className={`w-7 h-7 mb-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Rally your focus</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low activation energy, every step</span>
            </div>
            <div className={`hidden md:block w-px h-12 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center text-center">
              <Users className={`w-7 h-7 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Hold the line</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Streaks, pods, and progress tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>Your arsenal against inaction</h2>
          <p className={`text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Four tools built for people who've tried everything else.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* AI Adherence Planner */}
          <Link href="/planner" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'
            }`}>
              <Brain className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Adherence Planner
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Break down any task into micro-steps with intelligent scheduling. Just add your deadline—AI handles the planning.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Smart task breakdown
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Automatic scheduling
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                Progress tracking
              </li>
            </ul>
          </Link>

          {/* Recovery Mode */}
          <Link href="/reset-station" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-teal-900/30' : 'bg-teal-100'
            }`}>
              <Zap className={`w-6 h-6 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Recovery Mode
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Feeling stuck? Take a quick 3-5 minute guided reset to recenter and get back on track.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Guided interventions
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Breathing exercises
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                Focus techniques
              </li>
            </ul>
          </Link>

          {/* Focus Pods */}
          <Link href="/focus-pods" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
            }`}>
              <Users className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Focus Pods
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Work alongside others in virtual co-working sessions. Stay accountable and motivated together.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Audio co-working
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Scheduled sessions
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                Community support
              </li>
            </ul>
          </Link>

          {/* Metrics Dashboard */}
          <Link href="/dashboard" className={`p-8 rounded-2xl border hover:shadow-xl transition-all group ${
            darkMode 
              ? 'bg-slate-800 border-slate-700 hover:border-emerald-700' 
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${
              darkMode ? 'bg-violet-900/30' : 'bg-violet-100'
            }`}>
              <BarChart3 className={`w-6 h-6 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Metrics Dashboard
            </h3>
            <p className={`text-lg leading-relaxed mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Track your progress with detailed analytics. Watch your productivity soar with streaks and insights.
            </p>
            <ul className="space-y-2">
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Daily streaks
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Completion rates
              </li>
              <li className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <Check className={`w-4 h-4 mr-2 ${darkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                Task history
              </li>
            </ul>
          </Link>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Every nation needs a rallying cry.</h2>
            <p className="text-xl text-slate-400">Start free. Get 14 days of Pro — no credit card required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$0</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <p className="text-slate-400">After your 14-day trial</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  5 AI-planned tasks per month
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Basic metrics tracking
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Access to Recovery Mode
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Community Focus Pods
                </li>
              </ul>

              <Link
                href="/planner"
                onClick={handleCTA}
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-xl font-semibold transition-all text-center"
              >
                Claim Your Citizenship
              </Link>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 relative transform md:scale-105 shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                  14-DAY FREE TRIAL
                </span>
              </div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$7.99</span>
                  <span className="text-emerald-100 ml-2">/month</span>
                </div>
                <p className="text-emerald-100">14-day trial free, then $7.99/mo — or <span className="font-bold">$72/yr</span></p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Unlimited AI task planning</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Advanced analytics & insights</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Private Focus Pods</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Priority support</span>
                </li>
                <li className="flex items-center text-white">
                  <Check className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                  <span className="font-medium">Export & integrations</span>
                </li>
              </ul>

              <button
                onClick={handleProCTA}
                disabled={proLoading}
                className="block w-full bg-white hover:bg-slate-100 disabled:opacity-60 text-emerald-600 px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg text-center"
              >
                {proLoading ? 'Redirecting…' : trialStatus === 'pro' ? 'Go to Planner' : 'Join the Nation'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={`py-24 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Your nation is waiting.
          </h2>
          <p className={`text-xl mb-10 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Thousands of former procrastinators have already changed their status. One step at a time. Together.
          </p>
          <Link
            href="/planner"
            onClick={handleCTA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/30 inline-flex items-center space-x-2"
          >
            <span>Join the Nation</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t py-12 transition-colors ${
        darkMode ? 'bg-black border-slate-900' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Logo size="md" />
            </div>
            <p className="text-slate-400 text-sm">© 2026 ProcrastiNation. Building the nation one step at a time.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
