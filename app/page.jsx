'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Brain, Zap, Users, BarChart3, Sparkles } from 'lucide-react';
import { useTheme, useAuth } from './providers';
import Navigation from '../components/Navigation';
import AuthModal from '../components/AuthModal';

export default function LandingPage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCTA = (e) => {
    if (!user) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navigation />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-8 ${
            darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <Sparkles className="w-4 h-4" />
            <span>Your AI-powered productivity companion</span>
          </div>
          
          <h1 className={`text-6xl md:text-7xl font-bold mb-6 tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Stop waiting.
            <br />
            <span className={darkMode ? 'text-emerald-400' : 'text-emerald-600'}>Start doing.</span>
          </h1>
          
          <p className={`text-xl mb-10 leading-relaxed max-w-2xl mx-auto ${
            darkMode ? 'text-slate-300' : 'text-slate-600'
          }`}>
            The intelligent productivity tool that breaks down your biggest tasks into achievable steps—so you can finally get started.
          </p>

          <div className="flex justify-center mb-6">
            <Link
              href="/planner"
              onClick={handleCTA}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Free to use • No credit card required
          </p>
        </div>
      </div>

      {/* Social Proof */}
      <div className={`py-12 border-y transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <p className={`text-center text-sm font-medium mb-8 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>TRUSTED BY STUDENTS AND PROFESSIONALS</p>
          <div className={`flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-12 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <div className="text-2xl font-bold">10K+ Users</div>
            <div className={`hidden md:block w-px h-8 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-2xl font-bold">50K+ Tasks Completed</div>
            <div className={`hidden md:block w-px h-8 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
            <div className="text-2xl font-bold">4.9★ Rating</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>Everything you need to stay productive</h2>
          <p className={`text-xl ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Four powerful tools working together to help you accomplish more.
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

          {/* Reset Station */}
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
              Reset Station
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
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-slate-400">Start free, upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$0</span>
                  <span className="text-slate-400 ml-2">/month</span>
                </div>
                <p className="text-slate-400">Perfect for getting started</p>
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
                  Access to Reset Station
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  Community Focus Pods
                </li>
              </ul>

              <Link
                href="/planner"
                onClick={handleCTA}
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-4 rounded-lg font-semibold transition-all text-center"
              >
                Get Started Free
              </Link>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 relative transform md:scale-105 shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                  MOST POPULAR
                </span>
              </div>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-white">$12</span>
                  <span className="text-emerald-100 ml-2">/month</span>
                </div>
                <p className="text-emerald-100">For serious productivity</p>
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

              <Link
                href="/planner"
                onClick={handleCTA}
                className="block w-full bg-white hover:bg-slate-100 text-emerald-600 px-6 py-4 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg text-center"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={`py-24 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Ready to stop procrastinating?
          </h2>
          <p className={`text-xl mb-10 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Join thousands of students and professionals who are finally getting things done.
          </p>
          <Link
            href="/planner"
            onClick={handleCTA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-lg font-bold text-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/30 inline-flex items-center space-x-2"
          >
            <span>Get Started Free</span>
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
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ProcrastiNation</span>
            </div>
            <p className="text-slate-400 text-sm">© 2024 ProcrastiNation. Stop waiting. Start doing.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
