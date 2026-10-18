'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { UserProfile } from '@/lib/types/lab';
import {
  ChevronDown,
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  EyeOff,
  Settings,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface UserRoleBarProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
  onForgetAccountOnDevice?: (userId: string, userName: string) => void;
  onOpenStudentAccountModal?: () => void;
  hiddenAccountsCount?: number;
  onRestoreAllAccounts?: () => void;
}

const emptySubscribe = () => () => {};

export const UserRoleBar: React.FC<UserRoleBarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenAuthModal,
  onLogout,
  onForgetAccountOnDevice,
  onOpenStudentAccountModal,
  hiddenAccountsCount = 0,
  onRestoreAllAccounts,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Idiomatic client hydration detection using useSyncExternalStore
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Ensure deterministic SSR render to eliminate hydration mismatch
  const displayUser = mounted ? currentUser : (allUsers[1] || currentUser);

  return (
    <div ref={menuRef} className="relative inline-flex items-center space-x-2 text-xs">
      {/* Active User Pill Button */}
      <button
        onClick={() => setDropdownOpen(prev => !prev)}
        className="flex items-center space-x-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 px-3 py-1.5 rounded-xl text-slate-200 transition shadow-sm"
        title="Account: Click to switch user, manage account, or forget device access"
      >
        <span className="text-base leading-none">{displayUser.avatar}</span>
        <div className="flex items-center space-x-1.5 text-left">
          <span className="font-semibold text-white tracking-tight">{displayUser.name}</span>
          <span className="text-slate-500">·</span>
          <span
            className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
              displayUser.role === 'instructor'
                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
            }`}
          >
            {displayUser.role === 'instructor' ? (
              <>
                <GraduationCap className="w-2.5 h-2.5" />
                <span>Teacher</span>
              </>
            ) : (
              <span>Student</span>
            )}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Quick Sign In / Sign Up Button */}
      <button
        onClick={onOpenAuthModal}
        className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition flex items-center space-x-1.5 font-semibold text-xs shadow-sm"
        title="Log in with existing credentials or register a new account"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Sign In / Sign Up</span>
      </button>

      {/* Account Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#080e1e] border border-white/15 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn text-slate-200 backdrop-blur-2xl">
          <div className="px-3.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            <span>Current Session</span>
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuthModal();
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 normal-case text-xs"
            >
              <UserPlus className="w-3 h-3" />
              <span>Register</span>
            </button>
          </div>

          <div className="px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-base">{displayUser.avatar}</span>
                <span>{displayUser.name}</span>
              </div>
              {displayUser.role === 'student' && onOpenStudentAccountModal && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenStudentAccountModal();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1"
                  title="Manage student account, reset progress, or delete account"
                >
                  <Settings className="w-3 h-3" />
                  <span>Account Choices</span>
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{displayUser.email}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>{displayUser.className}</span>
            </div>
          </div>

          {/* Switch Saved Profile Header */}
          <div className="px-3.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Saved Logins On This Device</span>
            <span className="text-[9px] text-slate-500 font-mono">SHARED SCREEN</span>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-white/5">
            {allUsers.map(u => (
              <div
                key={u.id}
                className={`w-full px-3.5 py-2 flex items-center justify-between hover:bg-white/5 transition group ${
                  u.id === displayUser.id ? 'bg-white/[0.07] text-white' : 'text-slate-300'
                }`}
              >
                <button
                  onClick={() => {
                    onSwitchUser(u.id);
                    setDropdownOpen(false);
                  }}
                  className="flex-1 text-left flex items-center space-x-2 mr-2 cursor-pointer"
                >
                  <span className="text-base">{u.avatar}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-xs flex items-center space-x-1.5 truncate">
                      <span className="truncate">{u.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                          u.role === 'instructor'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                        }`}
                      >
                        {u.role === 'instructor' ? 'TEACHER' : 'STUDENT'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                  </div>
                </button>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {u.id === displayUser.id ? (
                    <span className="text-xs text-cyan-400 font-bold px-1.5">Active</span>
                  ) : (
                    onForgetAccountOnDevice && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onForgetAccountOnDevice(u.id, u.name);
                        }}
                        className="opacity-60 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                        title={`Remove ${u.name}'s login access from this laptop (keeps account safe, just hides from this screen)`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Hidden Device Logins Footer (if any accounts hidden on this laptop) */}
          {hiddenAccountsCount > 0 && onRestoreAllAccounts && (
            <div className="px-3.5 py-1.5 bg-sky-950/20 border-t border-white/5 flex items-center justify-between text-[10px] text-sky-300">
              <span>{hiddenAccountsCount} account(s) hidden from this laptop</span>
              <button
                onClick={() => {
                  onRestoreAllAccounts();
                  setDropdownOpen(false);
                }}
                className="underline hover:text-white font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Restore View</span>
              </button>
            </div>
          )}

          <div className="pt-2 mt-1 border-t border-white/10 px-3 flex justify-between gap-1.5">
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuthModal();
              }}
              className="flex-1 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-center font-semibold text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In / Sign Up</span>
            </button>
            {onLogout && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-white/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
