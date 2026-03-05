'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X, LogOut, Zap } from 'lucide-react';
import { useTheme, useAuth, useProfile } from '../app/providers';
import { useState } from 'react';
import AuthModal from './AuthModal';
import Logo from './Logo';

export default function Navigation() {
  const { darkMode, setDarkMode } = useTheme();
  const { user, signOut, trialStatus, trialDaysLeft } = useAuth();
  const { userProfile, setShowOnboarding } = useProfile();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const profileLabel = userProfile
    ? `${{ student: 'Student', professional: 'Professional', freelancer: 'Freelancer', other: 'Explorer' }[userProfile.userType] ?? 'Explorer'} · ${{ often: 'Focus mode', sometimes: 'Balanced', rarely: 'Flow mode' }[userProfile.adhdLevel] ?? 'Focus mode'}`
    : null;

  const navLinks = [
    { href: '/planner', label: 'Planner' },
    { href: '/syllabus', label: 'Syllabus' },
    { href: '/focus-pods', label: 'Focus Pods' },
    { href: '/reset-station', label: 'Reset Station' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  const isActive = (href) => pathname === href;

  return (
    <>
      <nav className={`border-b sticky top-0 z-50 transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/">
              <Logo size="md" darkText={!darkMode} />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-medium transition-colors ${
                    isActive(link.href)
                      ? darkMode ? 'text-emerald-400' : 'text-emerald-600'
                      : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {profileLabel && (
                <button
                  onClick={() => setShowOnboarding(true)}
                  title="Edit your profile"
                  className={`hidden lg:flex items-center text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    darkMode
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {profileLabel}
                </button>
              )}

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              {user ? (
                <div className="flex items-center space-x-2">
                  {/* Trial badge */}
                  {trialStatus === 'trial' && (
                    <Link href="/#pricing" className="hidden lg:flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                      <Zap className="w-3 h-3" />
                      <span>Pro Trial · {trialDaysLeft}d left</span>
                    </Link>
                  )}
                  {trialStatus === 'free' && (
                    <Link href="/#pricing" className="hidden lg:flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors">
                      <Zap className="w-3 h-3" />
                      <span>Upgrade to Pro</span>
                    </Link>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    darkMode ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`} title={user.email}>
                    {user.email[0].toUpperCase()}
                  </div>
                  <button
                    onClick={signOut}
                    className={`flex items-center space-x-1 p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                    }`}
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
                }`}
              >
                {mobileMenuOpen
                  ? <X className={`w-6 h-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                  : <Menu className={`w-6 h-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                }
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-4 pb-2 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive(link.href)
                      ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                      : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {profileLabel && (
                <button
                  onClick={() => { setShowOnboarding(true); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {profileLabel} — Edit profile
                </button>
              )}

              {user ? (
                <>
                  <div className={`px-4 py-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Signed in as {user.email}
                  </div>
                  {trialStatus === 'trial' && (
                    <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 mx-4 my-1 bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
                      <Zap className="w-4 h-4" />
                      <span>Pro Trial — {trialDaysLeft} days left</span>
                    </Link>
                  )}
                  {trialStatus === 'free' && (
                    <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2 mx-4 my-1 bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg">
                      <Zap className="w-4 h-4" />
                      <span>Upgrade to Pro</span>
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className={`w-full text-left flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                  className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-center mt-2"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
