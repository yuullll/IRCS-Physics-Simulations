'use client';

import React, { useState } from 'react';
import { UserProfile, LabSubmission } from '@/lib/types/lab';
import {
  User,
  Shield,
  Trash2,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  X,
  Check,
  GraduationCap,
  Sparkles,
  Info,
} from 'lucide-react';

interface StudentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  submission?: LabSubmission | null;
  onDeleteAccount: () => void;
  onResetProgress: () => void;
  onForgetOnDevice: () => void;
  onUpdateProfile?: (name: string, avatar: string) => void;
}

export const StudentAccountModal: React.FC<StudentAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  submission,
  onDeleteAccount,
  onResetProgress,
  onForgetOnDevice,
  onUpdateProfile,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(currentUser.name);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '🧑‍🎓');

  if (!isOpen) return null;

  const AVATARS = ['🧑‍🎓', '👩‍🎓', '👨‍🎓', '⚡', '🔬', '💡', '🧪', '🔭'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#080e1e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-xl">
              {currentUser.avatar}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Student Account Settings</h2>
              <div className="text-xs text-slate-400">Manage your credentials, data, and device access</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Profile Overview Card */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Student Identity
              </span>
              <span className="text-[10px] font-mono text-slate-400">ID: {currentUser.id}</span>
            </div>

            {isEditingName ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-black/50 border border-cyan-500/40 rounded-xl text-white text-xs font-semibold focus:outline-none"
                    placeholder="Student Name"
                  />
                  <button
                    onClick={() => {
                      if (onUpdateProfile && nameVal.trim()) {
                        onUpdateProfile(nameVal.trim(), selectedAvatar);
                      }
                      setIsEditingName(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                  >
                    Save
                  </button>
                </div>
                {/* Avatar Picker */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Avatar:</span>
                  {AVATARS.map(av => (
                    <button
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`text-lg p-1 rounded-lg transition ${
                        selectedAvatar === av ? 'bg-cyan-500/30 scale-110' : 'hover:bg-white/10'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>{currentUser.avatar}</span>
                    <span>{currentUser.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
                </div>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium"
                >
                  Edit Name
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Enrolled Course:</span>
                <div className="text-slate-200 font-medium">{currentUser.className}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Course Instructor:</span>
                <div className="text-slate-200 font-medium">Dr. Robert Vance</div>
              </div>
            </div>
          </div>

          {/* Academic Submission Status */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-2.5 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              Lab 01 Submission Record
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Submission State:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-lg text-[11px] ${
                  submission?.status === 'graded'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : submission?.status === 'submitted'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'bg-white/5 text-slate-400'
                }`}
              >
                {submission?.status === 'graded'
                  ? `Graded (${submission.grade}/100)`
                  : submission?.status === 'submitted'
                  ? 'Submitted (Pending Grade)'
                  : 'In Progress (Draft)'}
              </span>
            </div>

            {submission && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-slate-400">Reset Lab Submission:</span>
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Reset Lab 01</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onResetProgress();
                        setShowResetConfirm(false);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-1 rounded-xl bg-white/5 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device Privacy Choice */}
          <div className="p-4 rounded-2xl bg-[#050811] border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Device Access on this Laptop
              </span>
              <EyeOff className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Using a shared laptop? You can remove this login from this laptop&apos;s screen switcher. Your account, submitted lab reports, and grades remain completely safe and intact in the database.
            </p>
            <button
              onClick={() => {
                onForgetOnDevice();
                onClose();
              }}
              className="mt-2 w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide / Forget this Account from this Laptop</span>
            </button>
          </div>

          {/* Danger Zone: Permanent Account Deletion */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Permanent Account Deletion</span>
              </span>
              <span className="text-[10px] font-mono text-rose-400">IRREVERSIBLE</span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              If you wish to terminate your student account, this option will permanently delete your user profile, all submitted lab reports, and your saved 3D scenes.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete My Student Account...</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2.5">
                <div className="text-xs text-rose-200 font-bold">
                  ⚠️ Warning: Are you sure you want to permanently delete your account?
                </div>
                <p className="text-[11px] text-slate-300">
                  This will immediately remove <span className="text-white font-bold">{currentUser.name}</span> ({currentUser.email}), all 3D scene snapshots, and lab grades. To confirm, click the button below.
                </p>
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onDeleteAccount();
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete My Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
