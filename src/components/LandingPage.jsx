import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Zap, Users, BarChart3, Crown, Check, Play, Brain, Target } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-2">
            <Target className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold">ProcrastiNation</span>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => navigate('/planner')}
              className="bg-white text-indigo-900 px-6 py-2 rounded-full font-semibold hover:bg-yellow-400 transition"
            >
              Get Started
            </button>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Stop Waiting.<br />
            <span className="text-yellow-400">Start Doing.</span>
          </h1>
          <p className="text-xl md:text-2xl text-indigo-200 mb-8">
            The productivity tool that turns "I'll do it later" into "I'm doing it now."
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-full text-gray-900 text-lg"
            />
            <button
              onClick={handleSubmit}
              className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
          {submitted && (
            <p className="mt-4 text-yellow-400 font-semibold">Thanks! We'll be in touch soon.</p>
          )}
          <p className="text-sm text-indigo-300 mt-4">Free forever. Pro features from $12/month.</p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition">
            <Brain className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Adherence Planner</h3>
            <p className="text-indigo-200">
              Break down any task into bite-sized micro-steps with smart scheduling. Just add your deadline and let AI do the planning.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition">
            <Zap className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Reset Station</h3>
            <p className="text-indigo-200">
              Stuck? Take a guided 3-5 minute reset with audio and text interventions designed to get you unstuck and back on track.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition">
            <Users className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Focus Pods</h3>
            <p className="text-indigo-200">
              Work alongside others in virtual co-working sessions. Schedule focus time and stay accountable with video co-presence.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition">
            <BarChart3 className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold mb-2">Metrics Dashboard</h3>
            <p className="text-indigo-200">
              Track your start latency, streaks, and adherence rates. See your progress and celebrate your wins.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="bg-yellow-400 text-indigo-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Add Your Task</h3>
                <p className="text-indigo-200 text-lg">Tell us what you need to do and when it's due. That's it.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-yellow-400 text-indigo-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Get Your Plan</h3>
                <p className="text-indigo-200 text-lg">AI breaks it into micro-steps and schedules them across your available time.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-yellow-400 text-indigo-900 rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Just Start</h3>
                <p className="text-indigo-200 text-lg">Follow your micro-steps. Use Reset Station when stuck. Join Focus Pods for accountability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-indigo-300">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-yellow-400" />
                  <span>Basic AI task planning</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-yellow-400" />
                  <span>5 tasks per month</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-yellow-400" />
                  <span>Basic metrics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-yellow-400" />
                  <span>Community Focus Pods</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/planner')}
                className="w-full bg-white/20 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/30 transition"
              >
                Start Free
              </button>
            </div>

            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-indigo-900 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-900 text-yellow-400 px-4 py-1 rounded-full text-sm font-bold">
                MOST POPULAR
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <Crown className="w-6 h-6" />
                <h3 className="text-2xl font-bold">Pro</h3>
              </div>
              <p className="text-4xl font-bold mb-6">$12<span className="text-lg opacity-80">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Unlimited AI task planning</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Advanced Reset Station</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Private Focus Pods</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Full metrics dashboard</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Priority support</span>
                </li>
              </ul>
              <button className="w-full bg-indigo-900 text-yellow-400 px-6 py-3 rounded-full font-bold hover:bg-indigo-800 transition transform hover:scale-105">
                Start Pro Trial
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-12 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Ready to Beat Procrastination?</h2>
          <p className="text-xl text-indigo-200 mb-8">
            Join thousands of students and professionals getting things done.
          </p>
          <button 
            onClick={() => navigate('/planner')}
            className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-105"
          >
            Get Started Free →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-indigo-300">
        <p>© 2024 ProcrastiNation. Stop waiting. Start doing.</p>
      </footer>
    </div>
  );
}
