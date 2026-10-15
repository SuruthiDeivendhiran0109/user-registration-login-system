import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Database, Lock, ArrowRight, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: ShieldCheck, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', title: 'Spring Security', desc: 'HttpOnly session cookies with CSRF protection' },
  { icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', title: 'MySQL Database', desc: 'All data persisted in user_management_db' },
  { icon: Lock, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', title: 'BCrypt Hashing', desc: 'Passwords are never stored in plain text' },
];

const steps = [
  { num: '1', label: 'Create Account', desc: 'Fill in your personal details and register', color: 'bg-sky-500 text-white' },
  { num: '2', label: 'Registration Success', desc: 'Account saved to MySQL database', color: 'bg-emerald-500 text-white' },
  { num: '3', label: 'Sign In', desc: 'Authenticate with your credentials', color: 'bg-indigo-500 text-white' },
  { num: '4', label: 'Dashboard', desc: 'View your profile fetched from MySQL', color: 'bg-purple-500 text-white' },
  { num: '5', label: 'Manage Profile', desc: 'Refresh data from the database anytime', color: 'bg-amber-500 text-white' },
  { num: '6', label: 'Logout', desc: 'Securely end your session', color: 'bg-rose-500 text-white' },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 overflow-x-hidden overflow-y-auto w-full">
      {/* Ambient glow */}
      <div className="absolute top-10 sm:top-20 left-1/2 -translate-x-1/2 sm:left-1/4 sm:translate-x-0 w-64 h-64 sm:w-[500px] sm:h-[500px] bg-sky-600/15 rounded-full blur-3xl pointer-events-none animate-glow-1 max-w-[80vw]" />
      <div className="absolute bottom-10 sm:bottom-20 right-1/2 translate-x-1/2 sm:right-1/4 sm:translate-x-0 w-64 h-64 sm:w-[500px] sm:h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-glow-2 max-w-[80vw]" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-20 lg:py-24">

        {/* Hero */}
        <div className="text-center mb-16 sm:mb-20 fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs sm:text-sm font-medium mb-5 sm:mb-6">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            React + Spring Boot + MySQL — Full Stack
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-5 sm:mb-6">
            User Registration
            <span className="block bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              & Login System
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2">
            A production-grade authentication system with secure session management,
            real MySQL persistence, and BCrypt password hashing.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:from-sky-400 hover:to-indigo-500 transition-all duration-200 active:scale-[0.98] min-h-[48px]"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all duration-200 active:scale-[0.98] min-h-[48px]"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
          {features.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`glass-card rounded-2xl p-6 border ${bg.split(' ')[1]}`}>
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-white font-bold text-base mb-1">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>

        {/* Application Flow */}
        <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Application Flow</h2>
            <p className="text-slate-400 text-sm">Complete 6-step journey from registration to dashboard</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
                <span className={`step-badge shrink-0 ${step.color}`}>{step.num}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{step.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tech badges */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
            {['React 18 + Vite', 'Spring Boot 3.3', 'MySQL 8.0', 'Spring Security', 'BCrypt', 'JPA / Hibernate'].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Security guarantees */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            'Passwords hashed with BCrypt — never stored in plain text',
            'Session-based auth using HttpOnly cookies',
            'Dashboard fetches live data from MySQL on every load',
            'CSRF protection enabled on all state-changing requests',
          ].map(g => (
            <div key={g} className="flex items-center gap-3 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {g}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
