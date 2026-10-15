import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight, Home
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flashMsg, setFlashMsg] = useState(null);
  const [serverOffline, setServerOffline] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.message) {
      setFlashMsg({ type: location.state.type || 'info', text: location.state.message });
    }
  }, [location.state]);

  const validate = (name, value) => {
    if (name === 'email') {
      if (!value.trim()) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
    }
    if (name === 'password') {
      if (!value) return 'Password is required.';
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(p => ({ ...p, [name]: val }));
    if (touched[name]) setErrors(p => ({ ...p, [name]: validate(name, val) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFlashMsg(null);
    setServerOffline(false);

    const emailErr = validate('email', formData.email);
    const passErr = validate('password', formData.password);
    const newErrors = {};
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    setTouched({ email: true, password: true });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const result = await api.login({ email: formData.email.trim().toLowerCase(), password: formData.password });
    setSubmitting(false);

    if (result.success && result.data?.user) {
      loginUser(result.data.user);
      const redirect = location.state?.from?.pathname || '/dashboard';
      navigate(redirect, { replace: true });
    } else {
      const msg = result.error || 'Invalid email or password. Please try again.';
      setFlashMsg({ type: 'error', text: msg });
      if (result.status === 503 || msg.includes('offline') || msg.includes('unreachable')) {
        setServerOffline(true);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Ambient glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none animate-glow-1" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-glow-2" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-md z-10 fade-in-up">
        {/* Home link */}
        <div className="mb-6 flex justify-center">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-400 text-sm transition-colors">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="glass-panel p-8 sm:p-10 rounded-3xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
              <LogIn className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
            <p className="text-sm text-slate-400 mt-1.5">Login to your account</p>
          </div>

          {/* Flash message */}
          {flashMsg && (
            <div className={`mb-5 p-4 rounded-xl text-sm flex items-start gap-3 ${
              flashMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : flashMsg.type === 'error'
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                : 'bg-sky-500/10 border border-sky-500/30 text-sky-300'
            }`}>
              {flashMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{flashMsg.text}</span>
              <button onClick={() => setFlashMsg(null)} className="ml-auto text-current opacity-50 hover:opacity-100">✕</button>
            </div>
          )}

          {/* Offline banner */}
          {serverOffline && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Spring Boot Server Offline
              </p>
              {typeof window !== 'undefined' && window.location.hostname.endsWith('github.io') ? (
                <p>This frontend is hosted as a static preview on GitHub Pages. To process live logins and connect to MySQL, the Spring Boot backend must be running on a publicly accessible server.</p>
              ) : (
                <p>Start the backend: <code className="font-mono">mvn spring-boot:run</code> in the backend directory.</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="email" name="email" type="email"
                  value={formData.email} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Email address"
                  autoComplete="email"
                  className={`glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                    touched.email && errors.email ? 'border-rose-500/60 bg-rose-500/5' :
                    touched.email && !errors.email && formData.email ? 'border-emerald-500/40' : ''
                  }`}
                />
              </div>
              {touched.email && errors.email && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Password"
                  autoComplete="current-password"
                  className={`glass-input w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                    touched.password && errors.password ? 'border-rose-500/60 bg-rose-500/5' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id="rememberMe" name="rememberMe" type="checkbox"
                checked={formData.rememberMe} onChange={handleChange}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/30 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-400 cursor-pointer select-none">Remember me</label>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors hover:underline underline-offset-4">
                Register here
              </Link>
            </p>
          </div>

          {/* Security badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Authenticated via Spring Security &amp; BCrypt</span>
          </div>
        </div>
      </div>
    </div>
  );
}
