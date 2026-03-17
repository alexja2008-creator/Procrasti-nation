'use client';

import { useState } from 'react';
import { useTheme } from '../providers';
import { HelpCircle, ChevronDown } from 'lucide-react';
import Navigation from '../../components/Navigation';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    items: [
      {
        q: 'What is ProcrastiNation?',
        a: 'ProcrastiNation is an AI-powered productivity app built for people who struggle with getting started. You describe a task in plain language and the AI breaks it into bite-sized, actionable steps — each with a time estimate and a suggested day to complete it. It also includes tools for accountability (Focus Pods), recovery (Reset Station), and tracking your momentum (streaks and Dashboard).',
      },
      {
        q: 'How do I create my first task?',
        a: 'Head to the Planner, type what you need to get done in the task field, optionally set a deadline and how much time you have, then click "Generate Plan." The AI will ask a clarifying question if needed, then produce a full step-by-step plan for you.',
      },
      {
        q: 'Do I need an account to use it?',
        a: 'You can generate a plan without an account, but signing up (free) lets you save tasks, track your streak, access the Dashboard, and use Focus Pods. Your data is saved to the cloud so you can access it from any device.',
      },
      {
        q: 'What is the 14-day Pro trial?',
        a: 'Every new account gets full Pro access for 14 days at no cost — no credit card required. This gives you unlimited AI-generated plans, email nudges, weekly progress reports, and all other Pro features. After the trial, you move to the free tier (5 plans/month) unless you upgrade.',
      },
    ],
  },
  {
    id: 'planner',
    title: 'AI Planner',
    icon: '🧠',
    items: [
      {
        q: 'How does the AI planner work?',
        a: "You describe your task and deadline in plain language. The AI analyses the complexity and scope of the work, then produces a structured plan with individual steps, time estimates per step, and suggested days to complete each one. The model used is Anthropic's Claude.",
      },
      {
        q: 'Why does the AI ask clarifying questions?',
        a: 'For vague or complex tasks, the AI may ask one or two questions to generate a more accurate and personalised plan. For example, if you say "write a paper," it might ask what subject or how long it should be. You can answer in free text and then generate the plan.',
      },
      {
        q: 'Can I edit the generated steps?',
        a: 'Yes. Click the pencil icon on any step to edit its title, description, time estimate, or scheduled day. You can also add new steps using the "+ Add a step" button at the bottom of the list, delete steps you do not need, and reorder steps by dragging them.',
      },
      {
        q: 'What are recurring tasks?',
        a: 'When creating a plan, you can set it to repeat daily, weekly, or monthly. When you complete all the steps, ProcrastiNation automatically creates a fresh copy of the task for the next cycle — with all steps reset and a new start date. Great for habits, recurring reports, or regular reviews.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: '📅',
    items: [
      {
        q: 'What does the Calendar show?',
        a: 'The Calendar shows your in-progress task steps laid out by day. The AI resolves any relative schedule descriptions (like "2 days before deadline" or "next Thursday") into real calendar dates. You can switch between Day, Week, and Month views.',
      },
      {
        q: 'How do I change when a step is scheduled?',
        a: 'Click any step chip on the calendar to open a detail panel. You will see the full step description, the parent task name (which you can click to go back to the Planner), and a date picker to override the scheduled date. Changes save instantly.',
      },
      {
        q: 'Why are some steps not showing on the calendar?',
        a: "Steps only appear after the AI resolves their dates — this happens automatically when you open the Calendar. If a task was just created, give it a moment to load. If steps still don't appear, try navigating away and back to the Calendar.",
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard & Boards',
    icon: '📊',
    items: [
      {
        q: 'What is the Dashboard?',
        a: 'The Dashboard gives you an overview of your productivity: your current streak, total tasks completed, completion rate, and a list of all your in-progress and completed tasks. It is the home base for reviewing your progress.',
      },
      {
        q: 'What are Boards?',
        a: 'Boards let you organise your in-progress tasks into labelled columns — like Work, School, Personal, or anything you like. Create as many boards as you need and drag tasks between them to keep things sorted.',
      },
      {
        q: 'How do I move a task to a board?',
        a: 'In the Dashboard, drag any task card from the task list and drop it into the board column you want. You can also move tasks between boards the same way.',
      },
      {
        q: 'How do I delete a task?',
        a: 'Open a task in the Dashboard (click on it to expand its detail panel) and click the "Delete Task" button. This permanently removes the task and all its steps.',
      },
    ],
  },
  {
    id: 'focus-pods',
    title: 'Focus Pods',
    icon: '👥',
    items: [
      {
        q: 'What are Focus Pods?',
        a: 'Focus Pods are virtual co-working rooms powered by Whereby. You join a video room with other ProcrastiNation users, set a focus duration, and work silently (or with soft music) alongside each other. The social presence effect makes it much harder to procrastinate.',
      },
      {
        q: 'How long do pods last?',
        a: 'Pods can run from 30 to 90 minutes. The host selects the duration when creating the pod. Once the session ends, the room is automatically cleaned up.',
      },
      {
        q: 'Is camera or microphone required?',
        a: 'No. You can join a pod without turning on your camera or mic and simply work silently alongside others. Many users find the visual presence of others is enough to stay on track.',
      },
    ],
  },
  {
    id: 'reset-station',
    title: 'Reset Station',
    icon: '🧘',
    items: [
      {
        q: 'What is the Reset Station?',
        a: "The Reset Station is a curated library of short breathwork, meditation, and mental reset videos designed to help you recover from overwhelm or a productivity slump. When you're too anxious or distracted to work, a 5-minute reset can make a real difference.",
      },
      {
        q: 'How do I mark a video as completed?',
        a: 'After watching a video, click the "Mark as Completed" button. Completed resets are tracked in your Dashboard so you can see how often you use recovery tools alongside your productivity habits.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Trial',
    icon: '👤',
    items: [
      {
        q: 'How do I know if I am on the free tier or Pro trial?',
        a: 'Look at the badge in the top navigation bar. A green "Pro Trial · Xd left" badge means you are in your trial period. An amber "Upgrade to Pro" badge means your trial has ended and you are on the free tier.',
      },
      {
        q: 'What happens when my trial ends?',
        a: 'You move to the free tier, which allows up to 5 AI-generated plans per calendar month. All previously saved tasks remain accessible. Upgrading to Pro removes the monthly limit and unlocks all features.',
      },
      {
        q: 'How do I upgrade to Pro?',
        a: 'Click the amber "Upgrade to Pro" badge in the navigation, or scroll to the Pricing section on the home page. Pro is $7.99/month or $72/year (saves 25%).',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the sign-in screen, click "Forgot password?" (or use the password reset link in the auth modal). You will receive a reset link by email. Follow the link to set a new password and sign in.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Contact us and we will remove your account and all associated data within 48 hours.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    items: [
      {
        q: 'My plan was generated but did not save. What happened?',
        a: 'This can happen if your session expired mid-generation. Sign out, sign back in, and try generating the plan again. If the problem persists, try a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux).',
      },
      {
        q: 'The page is loading slowly or showing errors.',
        a: 'Try a hard refresh first. If issues persist, sign out and sign back in. If you are still seeing problems, try a different browser or incognito window, and let us know so we can investigate.',
      },
      {
        q: 'My streak reset unexpectedly.',
        a: 'Streaks require completing at least one task step per calendar day (midnight to midnight in your local time). If you completed steps but the streak did not update, it may be a timezone edge case — please let us know.',
      },
      {
        q: 'I am not receiving email nudges or weekly reports.',
        a: 'Check your spam or promotions folder. Nudge emails come from nudge@procrasti-nation.work and weekly reports from report@procrasti-nation.work. Mark these as "not spam" to ensure future delivery. Nudges only send for tasks that have been in-progress for more than 24 hours.',
      },
    ],
  },
];

function FaqItem({ item, id, isOpen, onToggle, darkMode }) {
  return (
    <div className={`border-b last:border-b-0 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
      <button
        onClick={() => onToggle(id)}
        className={`w-full text-left flex items-center justify-between py-4 gap-3 transition-colors ${
          darkMode ? 'text-slate-200 hover:text-white' : 'text-slate-800 hover:text-slate-900'
        }`}
      >
        <span className="font-semibold">{item.q}</span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          } ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
        />
      </button>
      {isOpen && (
        <div className={`pb-4 text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {item.a}
        </div>
      )}
    </div>
  );
}

function FaqCategory({ category, openItem, onToggle, darkMode }) {
  return (
    <div className={`rounded-2xl border mb-4 overflow-hidden ${
      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <div className={`flex items-center space-x-3 px-6 py-4 border-b ${
        darkMode ? 'border-slate-700 bg-slate-800/80' : 'border-slate-100 bg-slate-50'
      }`}>
        <span className="text-xl">{category.icon}</span>
        <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {category.title}
        </h2>
      </div>
      <div className="px-6">
        {category.items.map((item, i) => (
          <FaqItem
            key={i}
            item={item}
            id={`${category.id}-${i}`}
            isOpen={openItem === `${category.id}-${i}`}
            onToggle={onToggle}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}

export default function FaqPage() {
  const { darkMode } = useTheme();
  const [openItem, setOpenItem] = useState(null);

  const toggleItem = (key) => {
    setOpenItem(prev => prev === key ? null : key);
  };

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Navigation />

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Page header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
            darkMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-700'
          }`}>
            <HelpCircle className="w-4 h-4" />
            <span>Help Centre</span>
          </div>
          <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Frequently Asked Questions
          </h1>
          <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Everything you need to know about ProcrastiNation.
          </p>
        </div>

        {/* FAQ categories */}
        {FAQ_CATEGORIES.map((category) => (
          <FaqCategory
            key={category.id}
            category={category}
            openItem={openItem}
            onToggle={toggleItem}
            darkMode={darkMode}
          />
        ))}

        {/* Footer CTA */}
        <div className={`mt-10 text-center rounded-2xl border px-8 py-8 ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <p className={`text-base font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Still have questions?
          </p>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Reach out and we will get back to you as soon as possible.
          </p>
        </div>
      </main>
    </div>
  );
}
