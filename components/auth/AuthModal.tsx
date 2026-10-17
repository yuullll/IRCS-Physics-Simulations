'use client';

import React, { useState } from 'react';
import { UserProfile, UserRole } from '@/lib/types/lab';
import {
  X,
  Lock,
  Mail,
  User,
  GraduationCap,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  BookOpen,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onLogin: (email: string, password?: string) => boolean;
  onRegister: (data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    className?: string;
    avatar?: string;
  }) => void;
  onSwitchUser: (userId: string) => void;
}

const AVATAR_OPTIONS = ['🧑‍🎓', '👩‍🎓', '👨‍🎓', '👨‍🏫', '👩‍🏫', '🔬', '⚡', '⚛️', '🔭'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onLogin,
  onRegister,
  onSwitchUser,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'switch'>('login');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('student');
  const [signupClass, setSignupClass] = useState('AP Physics C: E&M (Period 3)');
  const [signupAvatar, setSignupAvatar] = useState('🧑‍🎓');
  const [signupError, setSignupError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim()) {
      setLoginError('Please enter your email address.');
      return;
    }
    const success = onLogin(loginEmail, loginPassword);
    if (success) {
      onClose();
    } else {
      setLoginError('Account not found with this email, or password incorrect.');
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!signupName.trim()) {
      setSignupError('Please provide your name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setSignupError('Please provide a valid email address.');
      return;
    }

    onRegister({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      role: signupRole,
      className: signupClass,
      avatar: signupAvatar,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-500/20">
              Φ
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">AP Physics Studio Portal</h2>
              <p className="text-[11px] text-slate-400">Student & Instructor Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-slate-950/80 p-1 mx-6 mt-4 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setActiveTab('login');
              setLoginError(null);
            }}
            className={`py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'login'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setSignupError(null);
            }}
            className={`py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'signup'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
          <button
            onClick={() => setActiveTab('switch')}
            className={`py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'switch'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Switch Role</span>
          </button>
        </div>

        {/* Tab 1: Log In Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4 text-xs">
            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-[11px]">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="name@physics.edu or student.edu"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Enter password (optional for demo accounts)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/25 active:scale-98"
            >
              <span>Sign In to Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Demo Credentials */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                Quick Demo One-Click Sign-In:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchUser('user_student_1');
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>🧑‍🎓</span>
                    <span className="font-semibold text-white">Alex Chen</span>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Student Account</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSwitchUser('user_teacher_1');
                    onClose();
                  }}
                  className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>👨‍🏫</span>
                    <span className="font-semibold text-white">Dr. Vance</span>
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">Instructor Account</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="p-6 space-y-3.5 text-xs">
            {signupError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-[11px]">
                {signupError}
              </div>
            )}

            {/* Role Selector: Student vs Teacher */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Select Account Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignupRole('student');
                    setSignupAvatar('🧑‍🎓');
                  }}
                  className={`p-2 rounded-xl border flex items-center space-x-2 transition ${
                    signupRole === 'student'
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-lg">🧑‍🎓</span>
                  <div className="text-left">
                    <div className="font-bold text-white text-[11px]">Student</div>
                    <div className="text-[9px] text-slate-400">Labs &amp; Simulation Sandbox</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignupRole('instructor');
                    setSignupAvatar('👨‍🏫');
                  }}
                  className={`p-2 rounded-xl border flex items-center space-x-2 transition ${
                    signupRole === 'instructor'
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-lg">👨‍🏫</span>
                  <div className="text-left">
                    <div className="font-bold text-white text-[11px]">Teacher / Instructor</div>
                    <div className="text-[9px] text-slate-400">Gradebook &amp; Class Review</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                required
                value={signupName}
                onChange={e => setSignupName(e.target.value)}
                placeholder="e.g. Jordan Smith"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="jsmith@school.edu"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Avatar picker */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Choose Avatar:</label>
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_OPTIONS.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSignupAvatar(av)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition ${
                      signupAvatar === av
                        ? 'border-cyan-400 bg-cyan-950/60 scale-110 shadow-sm'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/25 active:scale-98"
            >
              <span>Create Account &amp; Enter Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Tab 3: Switch Existing Profile */}
        {activeTab === 'switch' && (
          <div className="p-6 space-y-3 text-xs max-h-96 overflow-y-auto">
            <div className="text-[11px] text-slate-400 mb-1">
              Currently signed in as: <strong className="text-white">{currentUser.name}</strong> (
              <span className={currentUser.role === 'instructor' ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                {currentUser.role.toUpperCase()}
              </span>
              )
            </div>

            <div className="space-y-2">
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                    u.id === currentUser.id
                      ? 'bg-slate-800/80 border-cyan-500/80 text-white'
                      : 'bg-slate-950 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{u.avatar}</span>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            u.role === 'instructor'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                          }`}
                        >
                          {u.role === 'instructor' ? 'INSTRUCTOR' : 'STUDENT'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </div>
                  </div>
                  {u.id === currentUser.id && (
                    <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
