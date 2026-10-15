import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  User, Mail, Lock, Phone, Calendar, MapPin,
  Eye, EyeOff, UserPlus, ShieldCheck, AlertTriangle, Home
} from 'lucide-react';

const INITIAL = {
  firstName: '', lastName: '', dateOfBirth: '', address: '',
  phoneNumber: '', email: '', password: '', confirmPassword: ''
};

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

function validateField(name, value, all) {
  switch (name) {
    case 'firstName':
      if (!value.trim()) return 'First name is required.';
      if (value.trim().length < 2) return 'At least 2 characters.';
      break;
    case 'lastName':
      if (!value.trim()) return 'Last name is required.';
      if (value.trim().length < 2) return 'At least 2 characters.';
      break;
    case 'dateOfBirth': {
      if (!value) return 'Date of birth is required.';
      const d = new Date(value), today = new Date();
      if (d > today) return 'Cannot be in the future.';
      let age = today.getFullYear() - d.getFullYear();
      if (today.getMonth() - d.getMonth() < 0 || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
      if (age < 13) return 'Must be at least 13 years old.';
      break;
    }
    case 'address':
      if (!value.trim()) return 'Address is required.';
      if (value.trim().length < 5) return 'At least 5 characters.';
      break;
    case 'phoneNumber': {
      const trimmed = (value || '').trim();
      if (!trimmed) return 'Phone number is required.';
      if (!/^[0-9]{10}$/.test(trimmed)) {
        return 'Phone number must contain exactly 10 digits.';
      }
      break;
    }
    case 'email':
      if (!value.trim()) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.';
      break;
    case 'password':
      if (!value) return 'Password is required.';
      if (value.length < 8) return 'At least 8 characters.';
      if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter.';
      if (!/[a-z]/.test(value)) return 'Include at least one lowercase letter.';
      if (!/[0-9]/.test(value)) return 'Include at least one number.';
      if (!/[^A-Za-z0-9]/.test(value)) return 'Include at least one special character.';
      break;
    case 'confirmPassword':
      if (!value) return 'Please confirm your password.';
      if (value !== (all?.password || '')) return 'Passwords do not match.';
      break;
    default: break;
  }
  return null;
}

function Field({ label, id, name, type = 'text', value, onChange, onBlur, touched, errors, icon: Icon, placeholder, endAdornment, as, rows, maxLength, inputMode }) {
  const err = touched?.[name] ? errors?.[name] : null;
  const ok = touched?.[name] && !errors?.[name] && value;
  const cls = `glass-input w-full ${Icon ? 'pl-10' : 'pl-4'} ${endAdornment ? 'pr-11' : 'pr-4'} py-3 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none ${err ? 'border-rose-500/60 bg-rose-500/5' : ok ? 'border-emerald-500/40' : ''}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
        {label} <span className="text-rose-400">*</span>
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />}
        {as === 'textarea' ? (
          <textarea id={id} name={name} rows={rows || 2} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={cls} />
        ) : (
          <input id={id} name={name} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={cls} maxLength={maxLength} inputMode={inputMode} />
        )}
        {endAdornment && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{endAdornment}</span>}
      </div>
      {err && <p className="mt-1 text-xs text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    setForm(updated);
    if (touched[name]) setErrors(p => ({ ...p, [name]: validateField(name, value, updated) }));
    if (name === 'password' && touched.confirmPassword) {
      setErrors(p => ({ ...p, confirmPassword: validateField('confirmPassword', form.confirmPassword, updated) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(p => ({ ...p, [name]: true }));
    setErrors(p => ({ ...p, [name]: validateField(name, value, form) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerErr(null);
    const allTouched = {}, newErrors = {};
    Object.keys(INITIAL).forEach(k => {
      allTouched[k] = true;
      const err = validateField(k, form[k], form);
      if (err) newErrors[k] = err;
    });
    setTouched(allTouched);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth, address: form.address.trim(),
      phoneNumber: form.phoneNumber.trim(), email: form.email.trim().toLowerCase(),
      password: form.password, confirmPassword: form.confirmPassword
    };
    const result = await api.register(payload);
    setSubmitting(false);

    if (result.success) {
      navigate('/register/success');
    } else {
      if (result.fieldErrors) setErrors(p => ({ ...p, ...result.fieldErrors }));
      setServerErr(result.error || 'Registration failed. Please check your details.');
    }
  };

  const strength = calcStrength(form.password);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-20 overflow-hidden bg-slate-950">
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-glow-1" />
      <div className="absolute bottom-10 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none animate-glow-2" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-2xl z-10 fade-in-up">
        <div className="mb-6 flex justify-center">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-400 text-sm transition-colors">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="glass-panel p-6 sm:p-10 rounded-3xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center mb-4">
              <UserPlus className="w-7 h-7 text-sky-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create Your Account</h1>
            <p className="text-sm text-slate-400 mt-1.5">Please fill in the details below</p>
          </div>

          {serverErr && (
            <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverErr}</span>
              <button onClick={() => setServerErr(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Row 1: First + Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="firstName" name="firstName" label="First Name" value={form.firstName} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={User} placeholder="Enter first name" />
              <Field id="lastName" name="lastName" label="Last Name" value={form.lastName} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={User} placeholder="Enter last name" />
            </div>

            {/* Row 2: DOB + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="dateOfBirth" name="dateOfBirth" label="Date of Birth" type="date" value={form.dateOfBirth} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={Calendar} />
              <Field id="phoneNumber" name="phoneNumber" label="Phone Number" type="tel" value={form.phoneNumber} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={Phone} placeholder="Enter 10-digit phone number" maxLength={10} inputMode="numeric" />
            </div>

            {/* Address */}
            <Field id="address" name="address" label="Address" as="textarea" rows={2} value={form.address} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={MapPin} placeholder="Enter address" />

            {/* Email */}
            <Field id="email" name="email" label="Email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors} icon={Mail} placeholder="Enter email" />

            {/* Row 3: Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field
                  id="password" name="password" label="Password"
                  type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors}
                  icon={Lock} placeholder="Enter password"
                  endAdornment={
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="text-slate-400 hover:text-white transition-colors" aria-label="Toggle password">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                {form.password && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Strength:</span>
                      <span className="text-slate-300 font-medium">{strength.label}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <Field
                id="confirmPassword" name="confirmPassword" label="Confirm Password"
                type={showCpw ? 'text' : 'password'} value={form.confirmPassword}
                onChange={handleChange} onBlur={handleBlur} touched={touched} errors={errors}
                icon={Lock} placeholder="Confirm password"
                endAdornment={
                  <button type="button" onClick={() => setShowCpw(p => !p)}
                    className="text-slate-400 hover:text-white transition-colors" aria-label="Toggle confirm password">
                    {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Password rules */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              {[
                [form.password.length >= 8, '8+ characters'],
                [/[A-Z]/.test(form.password), '1 uppercase letter'],
                [/[a-z]/.test(form.password), '1 lowercase letter'],
                [/[0-9]/.test(form.password), '1 number'],
                [/[^A-Za-z0-9]/.test(form.password), '1 special character'],
              ].map(([ok, txt]) => (
                <span key={txt} className={`flex items-center gap-1 ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <span>{ok ? '✓' : '○'}</span> {txt}
                </span>
              ))}
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Creating Account...</span></>
              ) : (
                <><UserPlus className="w-4 h-4" /><span>Create Account</span></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors hover:underline underline-offset-4">
                Login here
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>BCrypt Password Hashing &amp; MySQL Relational Persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
