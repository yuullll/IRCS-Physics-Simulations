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
} from 'lucide-react';

interface UserRoleBarProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
}

const emptySubscribe = () => () => {};

export const UserRoleBar: React.FC<UserRoleBarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenAuthModal,
  onLogout,
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
        title="Account: Click to switch user or view details"
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
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn text-slate-200">
          <div className="px-3.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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

          <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/50">
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <span className="text-base">{displayUser.avatar}</span>
              <span>{displayUser.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{displayUser.email}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>{displayUser.className}</span>
            </div>
          </div>

          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Switch Saved Profile
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/40">
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  onSwitchUser(u.id);
                  setDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition ${
                  u.id === displayUser.id ? 'bg-slate-800/70 text-white' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{u.avatar}</span>
                  <div>
                    <div className="font-medium text-xs flex items-center space-x-1.5">
                      <span>{u.name}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          u.role === 'instructor'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                        }`}
                      >
                        {u.role === 'instructor' ? 'TEACHER' : 'STUDENT'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{u.email}</div>
                  </div>
                </div>
                {u.id === displayUser.id && (
                  <span className="text-xs text-cyan-400 font-bold">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-2 mt-1 border-t border-slate-800 px-2 flex justify-between gap-1.5">
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenAuthModal();
              }}
              className="flex-1 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-center font-semibold text-xs flex items-center justify-center space-x-1.5"
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
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
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
