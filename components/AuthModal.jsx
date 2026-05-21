'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../app/providers';
import { X } from 'lucide-react';
import Logo from './Logo';

export default function AuthModal({ onClose }) {
  const { darkMode } = useTheme();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (mode === 'signup') {
      // Validate username
      const trimmedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
        setError('Username must be 3-20 characters: letters, numbers, and underscores only.');
        setLoading(false);
        return;
      }

      // Check username availability
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .maybeSingle();
      if (existing) {
        setError('That username is taken. Try another one.');
        setLoading(false);
        return;
      }

      const trialEndsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { trial_ends_at: trialEndsAt, onboarding_seen: false } },
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Create profile row with chosen username
        await supabase.from('profiles').insert({
          user_id: data.user.id,
          username: trimmedUsername,
          display_name: trimmedUsername,
        });
        onClose('signup');
      } else {
        setMessage('Check your email for a confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl p-8 ${
        darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h2 className="text-2xl font-bold mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {mode === 'login'
            ? 'Sign in to access your tasks and streaks'
            : 'Sign up free — includes a 10-day Pro trial, no credit card required'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_username"
                minLength={3}
                maxLength={20}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                  darkMode
                    ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                    : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
                }`}
              />
              <p className={`text-xs mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                3-20 characters: letters, numbers, underscores
              </p>
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                darkMode
                  ? 'bg-slate-900 border-slate-600 focus:border-emerald-400 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400'
              }`}
            />
            {mode === 'signup' && (
              <p className={`text-xs mt-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Minimum 6 characters
              </p>
            )}
          </div>

          {error && (
            <p className={`text-sm px-3 py-2 rounded-lg ${darkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50'}`}>
              {error}
            </p>
          )}

          {message && (
            <p className={`text-sm px-3 py-2 rounded-lg ${darkMode ? 'text-emerald-400 bg-emerald-900/20' : 'text-emerald-600 bg-emerald-50'}`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={`text-sm text-center mt-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
            className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
