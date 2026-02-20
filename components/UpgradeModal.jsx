'use client';

import { X, Zap, Check, Lock } from 'lucide-react';
import { useTheme } from '../app/providers';
import Link from 'next/link';

const PRO_FEATURES = [
  'Unlimited AI-planned tasks',
  'Email nudges when tasks go stale',
  'Weekly Citizen Report (progress digest)',
  'Streak freeze — keep your streak alive',
  'Private Focus Pods with friends',
  'Task templates for common challenges',
  'Advanced metrics & insights',
];

export default function UpgradeModal({ onClose, reason = 'limit' }) {
  const { darkMode } = useTheme();

  const headlines = {
    limit: {
      title: "You've hit your free limit.",
      subtitle: "Free citizens get 5 AI plans per month. Upgrade to plan without limits.",
    },
    trial: {
      title: 'Your 14-day trial has ended.',
      subtitle: "You've experienced the full ProcrastiNation. Ready to make it permanent?",
    },
  };

  const { title, subtitle } = headlines[reason] || headlines.limit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
        darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'
      }`}>
        {/* Header gradient strip */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 pt-8 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 font-semibold text-sm uppercase tracking-wide">Upgrade to Pro</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
          <p className="text-emerald-100 text-sm">{subtitle}</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <p className={`text-sm font-semibold uppercase tracking-wide mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Everything in Pro
          </p>
          <ul className="space-y-3 mb-6">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{feature}</span>
              </li>
            ))}
          </ul>

          {/* Pricing callout */}
          <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <div className="flex items-baseline space-x-2">
              <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>$7.99</span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>
              <span className={`text-sm font-medium text-emerald-500`}>or $72/yr (save 25%)</span>
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Less than two coffees a month. Cancel any time.
            </p>
          </div>

          {/* CTA — for now links to pricing section; swap for Stripe link later */}
          <a
            href="/#pricing"
            onClick={onClose}
            className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/20 text-center"
          >
            Join the Nation — $7.99/mo
          </a>

          <button
            onClick={onClose}
            className={`w-full mt-3 text-sm text-center transition-colors ${
              darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Continue on Free tier (5 tasks/month)
          </button>
        </div>
      </div>
    </div>
  );
}
