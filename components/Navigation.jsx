'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Moon, Sun, Menu, X, LogOut, User } from 'lucide-react';
import { useTheme, useAuth } from '../app/providers';
import { useState } from 'react';
import AuthModal from './AuthModal';

export default function Navigation() {
  const { darkMode, setDarkMode } = useTheme();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navLinks = [
    { href: '/planner', label: 'Planner' },
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
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>ProcrastiNation</span>
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

              {user ? (
                <>
                  <div className={`px-4 py-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Signed in as {user.email}
                  </div>
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
