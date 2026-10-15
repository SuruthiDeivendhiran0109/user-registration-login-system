import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Lock, Eye, EyeOff, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

function calcStrength(pass) {
  if (!pass) return { pct: 0, label: '', color: 'bg-slate-700' };
  let s = 0;
  if (pass.length >= 8) s++;
  if (/[A-Z]/.test(pass)) s++;
  if (/[a-z]/.test(pass)) s++;
  if (/[0-9]/.test(pass)) s++;
  if (/[^A-Za-z0-9]/.test(pass)) s++;
  if (s <= 2) return { pct: 25, label: 'Weak', color: 'bg-rose-500' };
  if (s === 3) return { pct: 50, label: 'Fair', color: 'bg-amber-500' };
  if (s === 4) return { pct: 75, label: 'Good', color: 'bg-sky-500' };
  return { pct: 100, label: 'Strong', color: 'bg-emerald-500' };
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = (name, value, all = formData) => {
    if (name === 'newPassword') {
      if (!value) return 'New password is required.';
      if (value.length < 8) return 'At least 8 characters required.';
      if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter.';
      if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter.';
      if (!/[0-9]/.test(value)) return 'Must contain a number.';
      if (!/[^A-Za-z0-9]/.test(value)) return 'Must contain a special character.';
    }
    if (name === 'confirmPassword') {
      if (!value) return 'Please confirm your password.';
      if (value !== all.newPassword) return 'Passwords do not match.';
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, value, updated) }));
    if (name === 'newPassword' && touched.confirmPassword) {
      setErrors(p => ({ ...p, confirmPassword: validate('confirmPassword', formData.confirmPassword, updated) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validate(name, value, formData) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!token.trim()) {
      setServerError('Password reset token is missing from the URL. Please use the link provided in your email.');
      return;
    }

    const pwErr = validate('newPassword', formData.newPassword);
    const cpwErr = validate('confirmPassword', formData.confirmPassword);
    const newErrors = {};
    if (pwErr) newErrors.newPassword = pwErr;
    if (cpwErr) newErrors.confirmPassword = cpwErr;

    setTouched({ newPassword: true, confirmPassword: true });
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const result = await api.resetPassword({
      token: token.trim(),
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword
    });
    setSubmitting(false);

    if (result.success) {
      navigate('/login', {
        state: {
          message: 'Password has been reset successfully! Please log in with your new password.',
          type: 'success'
        }
      });
    } else {
      setServerError(result.error || 'Password reset failed. Link may be invalid or expired.');
    }
  };

  const strength = calcStrength(formData.newPassword);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-glow-1" />
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none animate-glow-2" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-md z-10 fade-in-up">
        {/* Navigation link */}
        <div className="mb-6 flex justify-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-400 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="glass-panel p-8 sm:p-10 rounded-3xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
              <KeyRound className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Set New Password</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              Create a strong new password for your account. Once changed, your old password will no longer work.
            </p>
          </div>

          {/* Missing token alert */}
          {!token && (
            <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Missing Reset Token</span>
              </div>
              <p>
                No token was detected in the URL. If you followed a link from your email, please ensure the entire link was copied.
              </p>
              <div className="pt-1">
                <Link to="/forgot-password" className="text-sky-400 hover:underline font-semibold">
                  Request a new reset link &rarr;
                </Link>
              </div>
            </div>
          )}

          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Unable to Reset Password</p>
                <p>{serverError}</p>
                <div className="pt-1">
                  <Link to="/forgot-password" className="text-sky-400 hover:underline font-medium">
                    Request a fresh link &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPw ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`glass-input w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                    touched.newPassword && errors.newPassword ? 'border-rose-500/60 bg-rose-500/5' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.newPassword && errors.newPassword && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.newPassword}
                </p>
              )}

              {/* Password strength bar */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Strength:</span>
                    <span className="text-slate-300 font-medium">{strength.label}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showCpw ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className={`glass-input w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                    touched.confirmPassword && errors.confirmPassword ? 'border-rose-500/60 bg-rose-500/5' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCpw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showCpw ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-1 text-[11px]">
              {[
                [formData.newPassword.length >= 8, '8+ characters'],
                [/[A-Z]/.test(formData.newPassword), '1 uppercase letter'],
                [/[a-z]/.test(formData.newPassword), '1 lowercase letter'],
                [/[0-9]/.test(formData.newPassword), '1 number'],
                [/[^A-Za-z0-9]/.test(formData.newPassword), '1 special symbol'],
              ].map(([ok, txt]) => (
                <span key={txt} className={`flex items-center gap-1 ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{ok ? '✓' : '○'}</span> {txt}
                </span>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting || !token}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <Link to="/login" className="text-sm text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Updated password is encrypted with BCrypt in MySQL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
