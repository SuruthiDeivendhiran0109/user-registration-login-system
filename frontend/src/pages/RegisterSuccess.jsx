import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogIn, Database, Lock, ArrowRight } from 'lucide-react';

export default function RegisterSuccess() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-8 sm:py-16 overflow-hidden bg-slate-950">
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none animate-glow-1" />
      <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl pointer-events-none animate-glow-2" />

      <div className="relative w-full max-w-md z-10 fade-in-up">
        <div className="glass-panel p-6 sm:p-10 rounded-2xl sm:rounded-3xl text-center">

          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center check-animate">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Registration Successful!
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your account has been created successfully.<br />
            Please login with your registered email and password.
          </p>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all duration-200"
          >
            <LogIn className="w-4 h-4" />
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Confirmation bullets */}
          <div className="mt-8 pt-6 border-t border-white/10 space-y-3 text-left">
            {[
              { icon: Database, text: 'User details are saved in MySQL database', color: 'text-sky-400' },
              { icon: Lock, text: 'Password is stored as a hash (not plain text)', color: 'text-purple-400' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-400">
                <div className={`w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
