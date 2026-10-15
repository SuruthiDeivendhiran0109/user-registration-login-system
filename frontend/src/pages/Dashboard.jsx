import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard, User, LogOut, RefreshCw, ShieldCheck,
  Database, Lock, Mail, Phone, Calendar, MapPin,
  CheckCircle2, AlertTriangle, Menu, X, Clock
} from 'lucide-react';

/* ─── Logout Confirmation Modal ─── */
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="glass-panel rounded-3xl p-8 max-w-sm w-full text-center fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-5">
          <LogOut className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Are you sure you want to logout?</h2>
        <p className="text-slate-400 text-sm mb-8">You will be redirected to the login page.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all duration-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 space-y-1.5 text-xs text-slate-500 text-left">
          {['Session is invalidated', 'Cookies are cleared', 'Protected routes will not be accessible'].map(t => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ─── */
function Sidebar({ user, onLogoutClick, mobileOpen, onClose }) {
  const initial = user?.firstName?.[0]?.toUpperCase() || 'U';
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity" onClick={onClose} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo & Close button on mobile */}
        <div className="p-4 sm:p-5 border-b border-white/07 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">AuthVault</p>
              <p className="text-slate-500 text-[11px]">Enterprise Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        <div className="p-4 border-b border-white/07">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </NavLink>
          <NavLink
            to="/dashboard"
            className={() => 'nav-item'}
            onClick={onClose}
          >
            <User className="w-4 h-4 shrink-0" />
            Profile
          </NavLink>
        </nav>

        {/* Logout at bottom */}
        <div className="p-4 border-t border-white/07">
          <button
            onClick={() => {
              onClose();
              onLogoutClick();
            }}
            className="nav-item w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Top Navbar (mobile) ─── */
function TopBar({ user, onMenuClick, onLogoutClick }) {
  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/07 px-4 py-2.5 flex items-center justify-between md:hidden">
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-sky-400" />
        <span className="text-white font-bold text-sm tracking-tight">AuthVault</span>
      </div>
      <button
        onClick={onLogoutClick}
        className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 px-3 py-2 min-h-[40px] rounded-lg hover:bg-rose-500/10 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        Logout
      </button>
    </header>
  );
}

/* ─── Desktop Top Header ─── */
function DesktopHeader({ user, onLogoutClick }) {
  return (
    <header className="hidden md:flex sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-white/07 px-6 py-3 items-center justify-between">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-sky-400" />
        <span className="text-white font-semibold text-sm">Dashboard</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            {user?.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-slate-200 text-sm font-medium">{user?.firstName} {user?.lastName}</span>
        </div>
        <button
          onClick={onLogoutClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 transition-all duration-200 font-medium cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}

/* ─── Profile Field Card ─── */
function ProfileField({ icon: Icon, label, value, color = 'text-sky-400' }) {
  return (
    <div className="profile-field">
      <p className={`text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        {label}
      </p>
      <p className="text-white font-semibold text-sm pl-5 break-words">{value || '—'}</p>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard() {
  const { user, logoutUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileData, setProfileData] = useState(user);

  // Fetch fresh profile from MySQL on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await api.getCurrentUser();
      if (!mounted) return;
      if (result.success && result.data?.user) {
        setProfileData(result.data.user);
      } else {
        navigate('/login', { state: { message: 'Your session has expired. Please sign in again.', type: 'info' } });
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    const result = await api.getCurrentUser();
    setRefreshing(false);
    if (result.success && result.data?.user) {
      setProfileData(result.data.user);
      setRefreshMsg({ type: 'success', text: 'Profile re-fetched from MySQL successfully.' });
      setTimeout(() => setRefreshMsg(null), 3000);
    } else {
      setRefreshMsg({ type: 'error', text: result.error || 'Failed to refresh profile.' });
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await logoutUser();
    navigate('/login', { state: { message: 'You have been securely logged out.', type: 'info' } });
  };

  const formatDate = (ds) => {
    if (!ds) return '—';
    try {
      return new Date(ds).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ds; }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const data = profileData || user;

  return (
    <div className="sidebar-layout bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        user={data}
        onLogoutClick={() => setShowLogoutModal(true)}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="sidebar-content flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <TopBar user={data} onMenuClick={() => setSidebarOpen(true)} onLogoutClick={() => setShowLogoutModal(true)} />

        {/* Desktop header */}
        <DesktopHeader user={data} onLogoutClick={() => setShowLogoutModal(true)} />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Welcome banner */}
          <div className="glass-panel rounded-2xl p-5 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Spring Security Session Verified
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {greeting()}, {data?.firstName || 'User'}!
              </h1>
              <p className="text-sm text-slate-400">
                Your profile is verified and loaded from MySQL{' '}
                <code className="text-sky-300 font-mono text-xs">(user_management_db)</code>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleRefresh} disabled={refreshing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all duration-200 disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
                {refreshing ? 'Querying MySQL...' : 'Refresh from Database'}
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          {/* Refresh notification */}
          {refreshMsg && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-3 break-words ${
              refreshMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              {refreshMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span className="flex-1 break-words">{refreshMsg.text}</span>
            </div>
          )}

          {/* Security cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              {
                icon: ShieldCheck, iconCls: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/25',
                label: 'SESSION SECURITY', title: 'HttpOnly Session Cookie',
                sub: <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-400" /><span className="text-emerald-400">Spring Security Context Active</span></>
              },
              {
                icon: Database, iconCls: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25',
                label: 'AUTHORITATIVE SOURCE', title: 'MySQL Relational DB',
                sub: <span className="text-slate-300">Database: <span className="font-mono text-sky-300">user_management_db</span></span>
              },
              {
                icon: Lock, iconCls: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/25',
                label: 'DATABASE RECORD ID', title: `#${data?.id || '—'}`,
                sub: <span className="text-slate-400">BCrypt Password Hashing</span>
              },
            ].map(({ icon: Icon, iconCls, bg, label, title, sub }) => (
              <div key={label} className={`glass-card rounded-2xl p-5 flex items-center gap-4 border ${bg.split(' ')[1]}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${bg}`}>
                  <Icon className={`w-6 h-6 ${iconCls}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">{title}</p>
                  <p className="text-xs mt-0.5 truncate">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Profile card */}
          <div className="glass-panel rounded-2xl p-5 sm:p-7 lg:p-8">
            {/* Profile header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg shadow-sky-500/30 shrink-0">
                  {data?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">{data?.firstName} {data?.lastName}</h2>
                  <p className="text-slate-400 text-xs sm:text-sm break-all">{data?.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs text-slate-400">Registered On</span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5 sm:justify-end">
                  <Clock className="w-4 h-4 text-sky-400" />
                  {formatDate(data?.createdAt)}
                </p>
              </div>
            </div>

            {/* Field grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <ProfileField icon={User} label="First Name" value={data?.firstName} />
              <ProfileField icon={User} label="Last Name" value={data?.lastName} />
              <ProfileField icon={Mail} label="Email Address" value={data?.email} color="text-indigo-400" />
              <ProfileField icon={Phone} label="Phone Number" value={data?.phoneNumber} color="text-emerald-400" />
              <ProfileField icon={Calendar} label="Date of Birth" value={data?.dateOfBirth} color="text-amber-400" />
              <ProfileField icon={MapPin} label="Address" value={data?.address} color="text-purple-400" />
            </div>

            {/* Security footer */}
            <div className="mt-6 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
              <p className="text-xs text-slate-300">
                End-to-end authenticated session backed by Spring Boot, Spring Security, and MySQL database persistence.
              </p>
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-white/07 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 AuthVault. All rights reserved.</span>
          <span className="font-mono text-sky-500/60">React 18 + Spring Boot 3.3 + MySQL 8.0</span>
        </footer>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}
