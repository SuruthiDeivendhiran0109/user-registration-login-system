import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Mail, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [devResetLink, setDevResetLink] = useState(null);

  const validate = (val) => {
    if (!val.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return 'Enter a valid email address.';
    return null;
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (touched) setError(validate(val));
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validate(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);

    const err = validate(email);
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    const result = await api.forgotPassword(email.trim().toLowerCase());
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      if (result.data?.devResetLink) {
        setDevResetLink(result.data.devResetLink);
      }
    } else {
      setServerError(result.error || 'Failed to submit reset request. Please check your connection.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-8 sm:py-16 overflow-hidden bg-slate-950">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none animate-glow-1" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-glow-2" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-md z-10 fade-in-up">
        {/* Navigation link */}
        <div className="mb-6 flex justify-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-400 text-sm transition-colors min-h-[44px] px-3">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="glass-panel p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
              <KeyRound className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Forgot Your Password?</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              Enter the email address associated with your account and we will send you secure instructions to reset your password.
            </p>
          </div>

          {/* Success state */}
          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm space-y-2">
                <div className="flex items-center justify-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Instructions Generated</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  If an account is associated with <strong className="text-white break-all">{email}</strong>, a secure reset token has been issued.
                </p>
              </div>

              {devResetLink ? (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-left space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-medium text-xs">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span>Local Development Reset Link</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    SMTP is currently unconfigured in <code className="text-sky-300">backend/.env</code>. Click below to proceed with testing your reset password flow immediately:
                  </p>
                  <a
                    href={devResetLink}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 min-h-[44px] rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 shadow-md transition-all duration-200 break-all"
                  >
                    <span>Open Password Reset Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-left space-y-2">
                  <p className="font-semibold text-slate-300">Next Steps:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your inbox and spam folder.</li>
                    <li>Click the link in the email to set a new password.</li>
                    <li>Reset links expire after 15 minutes for security.</li>
                  </ul>
                </div>
              )}

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Login
              </Link>
            </div>
          ) : (
            /* Form state */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {serverError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5 break-words">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="flex-1 break-words">{serverError}</span>
                </div>
              )}

              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="name@example.com"
                    autoComplete="email"
                    inputMode="email"
                    className={`glass-input w-full pl-10 pr-4 py-3 min-h-[46px] rounded-xl text-base sm:text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                      touched && error ? 'border-rose-500/60 bg-rose-500/5' :
                      touched && !error && email ? 'border-emerald-500/40' : ''
                    }`}
                  />
                </div>
                {touched && error && (
                  <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 min-h-[48px] rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending Instructions...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs text-slate-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          )}

          {/* Security badge */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Time-limited single-use cryptographic token security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
