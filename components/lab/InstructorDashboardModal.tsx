'use client';

import React, { useState } from 'react';
import { LabSubmission, SceneSnapshot, UserProfile, SavedExperiment } from '@/lib/types/lab';
import {
  GraduationCap,
  X,
  RotateCcw,
  Search,
  Award,
  ChevronRight,
  UserCheck,
  FileSpreadsheet,
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Check,
  ClipboardList,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface InstructorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: LabSubmission[];
  students?: UserProfile[];
  savedExperiments?: SavedExperiment[];
  currentUser: UserProfile;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  onRestoreSceneSnapshot: (snapshot: SceneSnapshot, studentName: string) => void;
  onExportCSV: () => void;
  onEnrollStudent?: (data: { name: string; email: string; className?: string }) => void;
  onRemoveStudent?: (studentId: string, studentName: string) => void;
  onUpdateStudent?: (studentId: string, updates: { name?: string; email?: string; className?: string }) => void;
  onResetStudentSubmission?: (studentId: string, studentName: string) => void;
  initialTab?: 'submissions' | 'roster';
}

export const InstructorDashboardModal: React.FC<InstructorDashboardModalProps> = ({
  isOpen,
  onClose,
  submissions,
  students = [],
  savedExperiments = [],
  currentUser,
  onGradeSubmission,
  onRestoreSceneSnapshot,
  onExportCSV,
  onEnrollStudent,
  onRemoveStudent,
  onUpdateStudent,
  onResetStudentSubmission,
  initialTab = 'roster',
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'roster'>(initialTab);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Roster Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentClass, setNewStudentClass] = useState(currentUser.className || 'AP Physics C: E&M (Period 3)');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');
  const [editEmailVal, setEditEmailVal] = useState('');

  const selectedSub = submissions.find(s => s.id === selectedSubmissionId) || submissions[0];

  // Grading form state
  const [gradeInput, setGradeInput] = useState<number>(() =>
    selectedSub?.grade !== undefined ? selectedSub.grade : 95
  );
  const [feedbackInput, setFeedbackInput] = useState<string>(() =>
    selectedSub?.feedback || "Great experimental verification of Coulomb's inverse-square law."
  );
  const [prevTrackedSubId, setPrevTrackedSubId] = useState<string | undefined>(selectedSub?.id);

  if (selectedSub?.id !== prevTrackedSubId) {
    setPrevTrackedSubId(selectedSub?.id);
    if (selectedSub) {
      setGradeInput(selectedSub.grade !== undefined ? selectedSub.grade : 95);
      setFeedbackInput(
        selectedSub.feedback || "Great experimental verification of Coulomb's inverse-square law."
      );
    }
  }

  if (!isOpen) return null;

  if (currentUser.role !== 'instructor') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
        <div className="relative w-full max-w-md bg-[#080e1e] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Access Denied: Instructor Only</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Student accounts do not have administrative authorization to access the class portal, view student rosters, or manage submissions.
            </p>
          </div>
          <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl text-[11px] text-slate-400">
            Currently logged in as student: <span className="text-white font-semibold">{currentUser.name}</span> ({currentUser.email})
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition"
          >
            Close &amp; Return to Simulation
          </button>
        </div>
      </div>
    );
  }

  const filteredSubmissions = submissions.filter(s => {
    if (filterStatus === 'submitted' && s.status !== 'submitted') return false;
    if (filterStatus === 'graded' && s.status !== 'graded') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.studentName.toLowerCase().includes(q) || s.studentEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredStudents = students.filter(stu => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return stu.name.toLowerCase().includes(q) || stu.email.toLowerCase().includes(q);
  });

  const gradedSubs = submissions.filter(s => s.status === 'graded' && s.grade !== undefined);
  const classAvg =
    gradedSubs.length > 0
      ? (gradedSubs.reduce((acc, s) => acc + (s.grade || 0), 0) / gradedSubs.length).toFixed(1)
      : '—';

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    onGradeSubmission(selectedSub.id, gradeInput, feedbackInput);
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim() || !onEnrollStudent) return;
    onEnrollStudent({
      name: newStudentName.trim(),
      email: newStudentEmail.trim(),
      className: newStudentClass.trim(),
    });
    setNewStudentName('');
    setNewStudentEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[#080d1a] border border-white/10 max-w-6xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#050811] shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Instructor Class Administration &amp; Gradebook
                </h2>
                <span className="text-xs text-amber-300/90 font-mono">
                  · {currentUser.className}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage enrolled students, remove or edit accounts, inspect 3D lab snapshots, and record grades
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs + Export */}
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center bg-[#0c1428] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  activeTab === 'roster'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Class Roster ({students.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  activeTab === 'submissions'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Submissions ({submissions.length})</span>
              </button>
            </div>

            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition flex items-center space-x-1.5 text-xs font-semibold"
              title="Export complete grading spreadsheet in CSV format"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: CLASS ROSTER & STUDENT ADMINISTRATION                      */}
        {/* ================================================================= */}
        {activeTab === 'roster' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Summary Metrics + Enroll Student Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Metrics */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#0c1326] border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400">Enrolled Students</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1">
                    {students.length}
                  </span>
                  <span className="text-[10px] text-sky-400 mt-1">Active Section</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0c1326] border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400">Lab Reports In</span>
                  <span className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {submissions.length}/{Math.max(students.length, 1)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Lab 01 Status</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0c1326] border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400">Mean Score</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {classAvg}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Out of 100 pts</span>
                </div>
              </div>

              {/* Enroll New Student Form */}
              <form
                onSubmit={handleEnrollSubmit}
                className="lg:col-span-7 p-4 rounded-xl bg-[#0c1326] border border-white/10 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>Enroll Student into Class Roster</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Instant Roster Provisioning</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    placeholder="Student Full Name (e.g. Elena Rostova)"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    className="sm:col-span-4 bg-[#060a14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    required
                  />
                  <input
                    type="email"
                    placeholder="student@physics.edu"
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    className="sm:col-span-5 bg-[#060a14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    required
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Search Filter */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0c1326] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredStudents.length} of {students.length} enrolled students
              </span>
            </div>

            {/* Student Roster Table */}
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c1326]/90">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#060a14] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class Section</th>
                    <th className="py-3.5 px-4">Lab 01 Status</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Saved Scenes</th>
                    <th className="py-3.5 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No students enrolled matching your filter. Use the form above to enroll a student.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(stu => {
                      const sub = submissions.find(s => s.studentId === stu.id);
                      const stuScenes = savedExperiments.filter(e => e.userId === stu.id);
                      const isEditing = editingStudentId === stu.id;
                      const isConfirmingRemove = confirmRemoveId === stu.id;

                      return (
                        <tr key={stu.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editNameVal}
                                  onChange={e => setEditNameVal(e.target.value)}
                                  className="bg-[#060a14] border border-sky-500/50 rounded px-2 py-1 text-xs text-white w-36"
                                />
                                <input
                                  type="email"
                                  value={editEmailVal}
                                  onChange={e => setEditEmailVal(e.target.value)}
                                  className="bg-[#060a14] border border-sky-500/50 rounded px-2 py-1 text-xs text-slate-300 w-44"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sm">
                                  {stu.avatar || '🧑‍🎓'}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{stu.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{stu.email}</div>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {stu.className}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {sub ? (
                              <span
                                className={
                                  sub.status === 'graded'
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-amber-400 font-semibold'
                                }
                              >
                                {sub.status === 'graded' ? 'Graded' : 'Submitted · Needs Review'}
                              </span>
                            ) : (
                              <span className="text-slate-500">Not Submitted</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            {sub?.grade !== undefined ? (
                              <span className="text-emerald-300 font-bold">{sub.grade} / 100</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {stuScenes.length} saved
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      onUpdateStudent?.(stu.id, {
                                        name: editNameVal,
                                        email: editEmailVal,
                                      });
                                      setEditingStudentId(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingStudentId(null)}
                                    className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {sub && (
                                    <button
                                      onClick={() => {
                                        setSelectedSubmissionId(sub.id);
                                        setActiveTab('submissions');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                                      title="Inspect Student Submission & Grade"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Inspect Lab</span>
                                    </button>
                                  )}

                                  {sub?.sceneSnapshot && (
                                    <button
                                      onClick={() => {
                                        onRestoreSceneSnapshot(sub.sceneSnapshot, stu.name);
                                        onClose();
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                                      title="Load student's 3D scene directly into simulation viewport"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>3D Scene</span>
                                    </button>
                                  )}

                                  {sub && onResetStudentSubmission && (
                                    <button
                                      onClick={() => onResetStudentSubmission(stu.id, stu.name)}
                                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[11px] flex items-center gap-1 transition"
                                      title="Reset student's submission so they can resubmit"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>Reset Lab</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setEditingStudentId(stu.id);
                                      setEditNameVal(stu.name);
                                      setEditEmailVal(stu.email);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
                                    title="Edit student name or email"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {isConfirmingRemove ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          onRemoveStudent?.(stu.id, stu.name);
                                          setConfirmRemoveId(null);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition"
                                      >
                                        Confirm Remove
                                      </button>
                                      <button
                                        onClick={() => setConfirmRemoveId(null)}
                                        className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmRemoveId(stu.id)}
                                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1 transition"
                                      title="Remove student from class roster"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* TAB 2: SUBMISSIONS & GRADING                                      */
          /* ================================================================= */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Submissions Roster */}
            <div className="w-72 border-r border-white/10 bg-[#050811] flex flex-col shrink-0">
              <div className="p-3 border-b border-white/10 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter student..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0c1326] border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#0c1326] rounded-lg border border-white/10 text-[10px]">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`py-1 rounded font-medium transition ${
                      filterStatus === 'all'
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({submissions.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('submitted')}
                    className={`py-1 rounded font-medium transition ${
                      filterStatus === 'submitted'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('graded')}
                    className={`py-1 rounded font-medium transition ${
                      filterStatus === 'graded'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Graded
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredSubmissions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">No submissions found.</div>
                ) : (
                  filteredSubmissions.map(sub => {
                    const isGraded = sub.status === 'graded';
                    const isSelected = sub.id === selectedSub?.id;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className={`w-full p-3.5 text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : 'hover:bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        <div className="space-y-1 max-w-[85%]">
                          <div className="flex items-center space-x-1.5 font-bold text-xs truncate">
                            <span>{sub.studentName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{sub.studentEmail}</div>
                          <div className="flex items-center space-x-2 text-[10px] font-mono">
                            <span
                              className={
                                isGraded ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'
                              }
                            >
                              {isGraded ? `Score: ${sub.grade}` : 'Needs Review'}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">
                              {sub.dataTable?.length || 0} trials
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Review & Grade Form */}
            {selectedSub ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-[#0c1326] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>{selectedSub.studentName}</span>
                      <span className="text-xs font-normal text-slate-400">
                        ({selectedSub.studentEmail})
                      </span>
                    </h3>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span>{selectedSub.assignmentTitle}</span>
                      <span>·</span>
                      <span>
                        Submitted: {new Date(selectedSub.submittedAt || '').toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onResetStudentSubmission && (
                      <button
                        onClick={() =>
                          onResetStudentSubmission(selectedSub.studentId, selectedSub.studentName)
                        }
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium transition flex items-center space-x-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset Submission</span>
                      </button>
                    )}
                    {selectedSub.sceneSnapshot && (
                      <button
                        onClick={() => {
                          onRestoreSceneSnapshot(
                            selectedSub.sceneSnapshot,
                            selectedSub.studentName
                          );
                          onClose();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition flex items-center space-x-1.5 shadow-md"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restore Student 3D Scene</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                    Student Hypothesis:
                  </span>
                  <p className="bg-[#050811] p-3.5 rounded-xl border border-white/10 text-slate-300 leading-relaxed font-mono">
                    {selectedSub.hypothesis}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                      Recorded Trials &amp; Percent Error Table:
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono">
                      {selectedSub.dataTable?.length || 0} Recorded Points
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-[#050811] text-slate-400 uppercase text-[10px] border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Trial</th>
                          <th className="py-2.5 px-3">Distance r (m)</th>
                          <th className="py-2.5 px-3">r² (m²)</th>
                          <th className="py-2.5 px-3">Measured |F| (N)</th>
                          <th className="py-2.5 px-3">Theory F (N)</th>
                          <th className="py-2.5 px-3">% Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-[#0c1326]/50">
                        {selectedSub.dataTable?.map((r, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-bold text-slate-400">#{r.trial}</td>
                            <td className="py-2 px-3 text-sky-300">{r.distanceR.toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-400">{r.rSquared.toFixed(2)}</td>
                            <td className="py-2 px-3 text-amber-300 font-bold">
                              {r.measuredForce.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {r.calculatedForce.toFixed(2)}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`font-semibold ${
                                  r.percentError < 5 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {r.percentError.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                    Physical Analysis &amp; Calculus Explanation:
                  </span>
                  <p className="bg-[#050811] p-3.5 rounded-xl border border-white/10 text-slate-300 leading-relaxed">
                    {selectedSub.analysisExplanation}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                    Student Conclusion:
                  </span>
                  <p className="bg-[#050811] p-3.5 rounded-xl border border-white/10 text-slate-300 leading-relaxed">
                    {selectedSub.conclusion}
                  </p>
                </div>

                <form
                  onSubmit={handleSaveGrade}
                  className="p-4 rounded-xl bg-[#0c1326] border border-amber-500/30 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center space-x-2 font-bold text-amber-400 text-sm">
                      <Award className="w-4 h-4" />
                      <span>Grading &amp; Pedagogical Feedback</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Graded by: {currentUser.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 items-center">
                    <div className="col-span-1">
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Score (0-100) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={gradeInput}
                        onChange={e => setGradeInput(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#050811] border border-white/10 rounded-lg px-3 py-1.5 text-base font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-slate-400 text-[11px] mb-1">
                        Instructor Feedback / Comments *
                      </label>
                      <textarea
                        rows={2}
                        value={feedbackInput}
                        onChange={e => setFeedbackInput(e.target.value)}
                        placeholder="Provide targeted feedback on hypothesis, calculus grounding, or % error analysis..."
                        className="w-full bg-[#050811] border border-white/10 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center space-x-1.5 shadow-md"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Submit Grade &amp; Comments</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a student submission on the left to inspect their work.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
