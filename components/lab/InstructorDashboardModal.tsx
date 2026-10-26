'use client';

import React, { useState } from 'react';
import {
  LabSubmission,
  SceneSnapshot,
  UserProfile,
  SavedExperiment,
  LabAssignment,
} from '@/lib/types/lab';
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
  BookOpen,
  PlusCircle,
  MessageSquare,
  Send,
  Calendar,
  Layers,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface InstructorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: LabSubmission[];
  students?: UserProfile[];
  savedExperiments?: SavedExperiment[];
  assignments?: LabAssignment[];
  currentUser: UserProfile;
  course?: 'mechanics' | 'em';
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  onRestoreSceneSnapshot: (snapshot: SceneSnapshot, studentName: string) => void;
  onExportCSV: () => void;
  onEnrollStudent?: (data: { name: string; email: string; className?: string }) => void;
  onRemoveStudent?: (studentId: string, studentName: string) => void;
  onUpdateStudent?: (studentId: string, updates: { name?: string; email?: string; className?: string }) => void;
  onResetStudentSubmission?: (studentId: string, studentName: string) => void;
  onCreateAssignment?: (data: Partial<LabAssignment>) => void;
  onAddComment?: (submissionId: string, text: string) => void;
  initialTab?: 'submissions' | 'roster' | 'assignments';
}

export const InstructorDashboardModal: React.FC<InstructorDashboardModalProps> = ({
  isOpen,
  onClose,
  submissions,
  students = [],
  savedExperiments = [],
  assignments = [],
  currentUser,
  course = 'mechanics',
  onGradeSubmission,
  onRestoreSceneSnapshot,
  onExportCSV,
  onEnrollStudent,
  onRemoveStudent,
  onUpdateStudent,
  onResetStudentSubmission,
  onCreateAssignment,
  onAddComment,
  initialTab = 'roster',
}) => {
  const isMech = course === 'mechanics';
  const [activeTab, setActiveTab] = useState<'submissions' | 'roster' | 'assignments'>(initialTab);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Roster Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentClass, setNewStudentClass] = useState(
    currentUser.className || (isMech ? 'AP Physics C: Mechanics (Period 2)' : 'AP Physics C: E&M (Period 3)')
  );
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');
  const [editEmailVal, setEditEmailVal] = useState('');

  // Assignment Creation Form State
  const [newAssignTitle, setNewAssignTitle] = useState(
    isMech
      ? 'Rotational Dynamics & Moment of Inertia'
      : "Verification of Coulomb's Law & Gauss's Surface"
  );
  const [newAssignCourse, setNewAssignCourse] = useState<'mechanics' | 'em'>(course);
  const [newAssignTopic, setNewAssignTopic] = useState(
    isMech ? 'Unit 5: Torque & Rotational Dynamics' : 'Unit 1: Electrostatics & Coulomb Force'
  );
  const [newAssignDueDate, setNewAssignDueDate] = useState('2026-11-15');
  const [newAssignDesc, setNewAssignDesc] = useState(
    isMech
      ? 'Design and execute a quantitative experiment measuring the rotational acceleration alpha under variable torque tau. Derive the empirical moment of inertia I and verify tau = I * alpha using calculus-based integration.'
      : 'Verify the inverse-square dependence of electrostatic force between point charges. Plot measured force versus 1/r^2 and derive permittivity epsilon_0.'
  );
  const [newAssignObjectives, setNewAssignObjectives] = useState(
    '1. Formulate testable hypothesis\n2. Collect at least 5 empirical distance data trials\n3. Calculate theoretical calculus model and % error'
  );

  // Submission Dialogue Comment State
  const [instructorReplyText, setInstructorReplyText] = useState('');

  const selectedSub = submissions.find(s => s.id === selectedSubmissionId) || submissions[0];

  // Grading form state
  const [gradeInput, setGradeInput] = useState<number>(() =>
    selectedSub?.grade !== undefined ? selectedSub.grade : 95
  );
  const [feedbackInput, setFeedbackInput] = useState<string>(() =>
    selectedSub?.feedback ||
    (isMech
      ? 'Strong theoretical integration and accurate percent error calculation on torque balance.'
      : "Great experimental verification of Coulomb's inverse-square law.")
  );
  const [prevTrackedSubId, setPrevTrackedSubId] = useState<string | undefined>(selectedSub?.id);

  if (selectedSub?.id !== prevTrackedSubId) {
    setPrevTrackedSubId(selectedSub?.id);
    if (selectedSub) {
      setGradeInput(selectedSub.grade !== undefined ? selectedSub.grade : 95);
      setFeedbackInput(
        selectedSub.feedback ||
          (isMech
            ? 'Strong theoretical integration and accurate percent error calculation on torque balance.'
            : "Great experimental verification of Coulomb's inverse-square law.")
      );
    }
  }

  if (!isOpen) return null;

  if (currentUser.role !== 'instructor') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
        <div
          className={`relative w-full max-w-md ${
            isMech ? 'bg-[#050f0c] border border-emerald-500/30' : 'bg-[#080e1e] border border-rose-500/30'
          } rounded-3xl p-6 shadow-2xl text-center space-y-4`}
        >
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

  const handleAddInstructorComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !instructorReplyText.trim() || !onAddComment) return;
    onAddComment(selectedSub.id, instructorReplyText.trim());
    setInstructorReplyText('');
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

  const handleCreateAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim() || !onCreateAssignment) return;
    const objectivesArray = newAssignObjectives
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean);

    onCreateAssignment({
      title: newAssignTitle.trim(),
      topic: newAssignTopic.trim(),
      course: newAssignCourse,
      dueDate: newAssignDueDate,
      description: newAssignDesc.trim(),
      assignedBy: currentUser.name,
      objectives: objectivesArray.length > 0 ? objectivesArray : ['Complete experimental trials'],
    });

    setActiveTab('assignments');
  };

  // Compile comments for the selected submission
  const threadComments = selectedSub?.comments || [];
  const displayComments: {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: 'student' | 'instructor';
    text: string;
    timestamp: string;
  }[] = [...threadComments];
  if (displayComments.length === 0 && selectedSub) {
    if (selectedSub.studentComments) {
      displayComments.push({
        id: 'init_student',
        authorId: selectedSub.studentId,
        authorName: selectedSub.studentName,
        authorRole: 'student',
        text: selectedSub.studentComments,
        timestamp: selectedSub.submittedAt || new Date().toISOString(),
      });
    }
    if (selectedSub.feedback) {
      displayComments.push({
        id: 'init_teacher',
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: 'instructor',
        text: selectedSub.feedback,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div
        className={`${
          isMech ? 'bg-[#050f0c] border-emerald-500/30' : 'bg-[#080d1a] border-sky-500/30'
        } border max-w-6xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] transition-colors`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b ${
            isMech ? 'bg-[#020806] border-emerald-500/20' : 'bg-[#050811] border-white/10'
          } flex flex-wrap items-center justify-between gap-4 shrink-0`}
        >
          <div className="flex items-center space-x-3.5">
            <div
              className={`p-2.5 rounded-xl border ${
                isMech
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Instructor Class Administration &amp; Lab Management
                </h2>
                <span
                  className={`text-xs font-mono ${
                    isMech ? 'text-emerald-400/90' : 'text-amber-300/90'
                  }`}
                >
                  · {currentUser.className || (isMech ? 'AP Physics C: Mechanics' : 'AP Physics C: E&M')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Assign laboratories with custom descriptions, grade student submissions with dialogue comments, and manage class roster
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs + Export */}
          <div className="flex items-center space-x-2.5">
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1428] border-white/10'
              }`}
            >
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  activeTab === 'roster'
                    ? isMech
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Class Roster ({students.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  activeTab === 'submissions'
                    ? isMech
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Submissions ({submissions.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                  activeTab === 'assignments'
                    ? isMech
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Assigned Labs ({assignments.length})</span>
              </button>
            </div>

            <button
              onClick={onExportCSV}
              className={`px-3 py-1.5 rounded-xl border transition flex items-center space-x-1.5 text-xs font-semibold ${
                isMech
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
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
        {activeTab === 'roster' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Summary Metrics + Enroll Student Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Metrics */}
              <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1326] border-white/10'
                  }`}
                >
                  <span className="text-[11px] text-slate-400">Enrolled Students</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1">
                    {students.length}
                  </span>
                  <span className={`text-[10px] mt-1 ${isMech ? 'text-emerald-400' : 'text-sky-400'}`}>
                    Active Section
                  </span>
                </div>
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1326] border-white/10'
                  }`}
                >
                  <span className="text-[11px] text-slate-400">Lab Reports In</span>
                  <span
                    className={`text-2xl font-bold font-mono mt-1 ${
                      isMech ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {submissions.length}/{Math.max(students.length, 1)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Submitted</span>
                </div>
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1326] border-white/10'
                  }`}
                >
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
                className={`lg:col-span-7 p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                  isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1326] border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserPlus className={`w-4 h-4 ${isMech ? 'text-emerald-400' : 'text-sky-400'}`} />
                    <span>Enroll Student into Class Roster</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Instant Provisioning</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    placeholder="Student Full Name (e.g. Elena Rostova)"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    className={`sm:col-span-4 rounded-lg px-3 py-2 text-xs text-white focus:outline-none border ${
                      isMech
                        ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                        : 'bg-[#060a14] border-white/10 focus:border-sky-400'
                    }`}
                    required
                  />
                  <input
                    type="email"
                    placeholder="student@physics.edu"
                    value={newStudentEmail}
                    onChange={e => setNewStudentEmail(e.target.value)}
                    className={`sm:col-span-5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none border ${
                      isMech
                        ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                        : 'bg-[#060a14] border-white/10 focus:border-sky-400'
                    }`}
                    required
                  />
                  <button
                    type="submit"
                    className={`sm:col-span-3 px-3 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
                      isMech
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                    }`}
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
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none border ${
                    isMech
                      ? 'bg-[#081711] border-emerald-500/20 focus:border-emerald-400'
                      : 'bg-[#0c1326] border-white/10 focus:border-sky-400'
                  }`}
                />
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredStudents.length} of {students.length} enrolled students
              </span>
            </div>

            {/* Student Roster Table */}
            <div
              className={`rounded-2xl border overflow-hidden ${
                isMech ? 'bg-[#081711]/90 border-emerald-500/20' : 'bg-[#0c1326]/90 border-white/10'
              }`}
            >
              <table className="w-full text-left text-xs">
                <thead
                  className={`uppercase text-[10px] tracking-wider border-b ${
                    isMech ? 'bg-[#030a07] text-slate-400 border-emerald-500/20' : 'bg-[#060a14] text-slate-400 border-white/10'
                  }`}
                >
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Class Section</th>
                    <th className="py-3.5 px-4">Submission Status</th>
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
                        <tr
                          key={stu.id}
                          className="hover:bg-white/[0.02] transition group"
                        >
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={editNameVal}
                                  onChange={e => setEditNameVal(e.target.value)}
                                  className="bg-black/50 border border-sky-400 rounded px-2 py-1 text-xs text-white w-full"
                                />
                                <input
                                  type="email"
                                  value={editEmailVal}
                                  onChange={e => setEditEmailVal(e.target.value)}
                                  className="bg-black/50 border border-sky-400 rounded px-2 py-1 text-[11px] text-slate-300 w-full"
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-white flex items-center space-x-1.5">
                                  <span>{stu.name}</span>
                                  {stu.role === 'instructor' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                                      Instructor
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {stu.email}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {stu.className || 'General Enrollment'}
                          </td>

                          <td className="py-3 px-4">
                            {sub ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  sub.status === 'graded'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {sub.status === 'graded' ? 'Graded' : 'Pending Evaluation'}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">No Submission</span>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono font-bold">
                            {sub?.grade !== undefined ? (
                              <span className="text-emerald-400">{sub.grade}/100</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {stuScenes.length} Saved
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  onClick={() => {
                                    onUpdateStudent?.(stu.id, {
                                      name: editNameVal.trim(),
                                      email: editEmailVal.trim(),
                                    });
                                    setEditingStudentId(null);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                                  title="Save changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingStudentId(null)}
                                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isConfirmingRemove ? (
                              <div className="flex items-center justify-end space-x-1.5">
                                <span className="text-[10px] text-rose-400 font-medium mr-1">
                                  Confirm remove?
                                </span>
                                <button
                                  onClick={() => {
                                    onRemoveStudent?.(stu.id, stu.name);
                                    setConfirmRemoveId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="px-2 py-1 rounded bg-white/10 text-slate-300 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-1.5">
                                {sub && (
                                  <button
                                    onClick={() => {
                                      setSelectedSubmissionId(sub.id);
                                      setActiveTab('submissions');
                                    }}
                                    className={`p-1.5 rounded-lg border transition ${
                                      isMech
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30'
                                    }`}
                                    title="Inspect submission"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingStudentId(stu.id);
                                    setEditNameVal(stu.name);
                                    setEditEmailVal(stu.email);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                  title="Edit student information"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveId(stu.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Remove student from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: ASSIGNED LABS & EXPERIMENT AUTHORING                       */}
        {/* ================================================================= */}
        {activeTab === 'assignments' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form to Assign New Lab */}
              <div className="lg:col-span-5 space-y-4">
                <div
                  className={`p-5 rounded-2xl border ${
                    isMech ? 'bg-[#081711] border-emerald-500/30' : 'bg-[#0c1326] border-sky-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 mb-3">
                    <PlusCircle className={`w-5 h-5 ${isMech ? 'text-emerald-400' : 'text-sky-400'}`} />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Assign New Laboratory Investigation
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Create a customized simulation lab assignment with targeted descriptions, calculus criteria, and submission deadlines.
                  </p>

                  <form onSubmit={handleCreateAssignmentSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Lab Title *
                      </label>
                      <input
                        type="text"
                        value={newAssignTitle}
                        onChange={e => setNewAssignTitle(e.target.value)}
                        placeholder="e.g. Rotational Inertia & Moment of Inertia"
                        className={`w-full rounded-xl px-3 py-2 text-white border focus:outline-none ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 focus:border-sky-400'
                        }`}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Curriculum Course *
                        </label>
                        <select
                          value={newAssignCourse}
                          onChange={e => setNewAssignCourse(e.target.value as 'mechanics' | 'em')}
                          className={`w-full rounded-xl px-3 py-2 text-white border focus:outline-none ${
                            isMech
                              ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                              : 'bg-[#050811] border-white/10 focus:border-sky-400'
                          }`}
                        >
                          <option value="mechanics">Mechanics (AP C)</option>
                          <option value="em">Electricity &amp; Magnetism (AP C)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          Due Date *
                        </label>
                        <input
                          type="date"
                          value={newAssignDueDate}
                          onChange={e => setNewAssignDueDate(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-white border focus:outline-none ${
                            isMech
                              ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                              : 'bg-[#050811] border-white/10 focus:border-sky-400'
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Topic / Unit Reference *
                      </label>
                      <input
                        type="text"
                        value={newAssignTopic}
                        onChange={e => setNewAssignTopic(e.target.value)}
                        placeholder="e.g. Unit 5: Torque & Rotational Dynamics"
                        className={`w-full rounded-xl px-3 py-2 text-white border focus:outline-none ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 focus:border-sky-400'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Instructor Description &amp; Lab Guidelines *
                      </label>
                      <textarea
                        rows={3}
                        value={newAssignDesc}
                        onChange={e => setNewAssignDesc(e.target.value)}
                        placeholder="State experimental instructions, calculus requirements, and deliverables..."
                        className={`w-full rounded-xl p-2.5 text-white border focus:outline-none ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 focus:border-sky-400'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Core Objectives (one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={newAssignObjectives}
                        onChange={e => setNewAssignObjectives(e.target.value)}
                        placeholder="Enter key objectives for students..."
                        className={`w-full rounded-xl p-2.5 text-white font-mono text-[11px] border focus:outline-none ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 focus:border-sky-400'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 shadow-lg ${
                        isMech
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Publish &amp; Assign Lab to Class</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Existing Assigned Labs List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className={`w-4 h-4 ${isMech ? 'text-emerald-400' : 'text-sky-400'}`} />
                    <span>Active Assigned Investigations ({assignments.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Students will see the assigned lab description on their Lab Report card
                  </span>
                </div>

                <div className="space-y-3.5">
                  {assignments.map(a => {
                    const isForCurrent = a.course === course;
                    return (
                      <div
                        key={a.id}
                        className={`p-4 rounded-2xl border transition ${
                          isForCurrent
                            ? isMech
                              ? 'bg-[#081711] border-emerald-500/30'
                              : 'bg-[#0c1326] border-sky-500/30'
                            : 'bg-white/[0.02] border-white/10 opacity-75'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-white">{a.title}</h4>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  a.course === 'mechanics'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {a.course === 'mechanics' ? 'Mechanics' : 'E&M'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                              <span>{a.topic}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                Due {a.dueDate || '2026-11-15'}
                              </span>
                              {a.assignedBy && (
                                <>
                                  <span>·</span>
                                  <span>Assigned by {a.assignedBy}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            Active Assignment
                          </span>
                        </div>

                        {a.description && (
                          <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 leading-relaxed">
                            <span className="font-semibold text-white block mb-1 text-[11px]">
                              Instructor Description:
                            </span>
                            {a.description}
                          </div>
                        )}

                        {a.objectives && a.objectives.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {a.objectives.map((obj, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/5"
                              >
                                ✓ {obj}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: SUBMISSION GRADING & PEDAGOGICAL DIALOGUE                  */}
        {/* ================================================================= */}
        {activeTab === 'submissions' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Submissions List */}
            <div
              className={`w-80 border-r flex flex-col shrink-0 ${
                isMech ? 'border-emerald-500/20 bg-[#030a07]' : 'border-white/10 bg-[#060a14]'
              }`}
            >
              {/* Filter Submissions */}
              <div
                className={`p-3.5 border-b space-y-2 ${
                  isMech ? 'border-emerald-500/20' : 'border-white/10'
                }`}
              >
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition ${
                      filterStatus === 'all'
                        ? isMech
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({submissions.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('submitted')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition ${
                      filterStatus === 'submitted'
                        ? isMech
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilterStatus('graded')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition ${
                      filterStatus === 'graded'
                        ? isMech
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Graded
                  </button>
                </div>
              </div>

              {/* Submissions List Items */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {filteredSubmissions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No student submissions found matching the criteria.
                  </div>
                ) : (
                  filteredSubmissions.map(sub => {
                    const isSelected = sub.id === (selectedSub?.id || selectedSubmissionId);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className={`w-full p-4 text-left transition flex items-center justify-between ${
                          isSelected
                            ? isMech
                              ? 'bg-emerald-500/15 border-l-4 border-emerald-400'
                              : 'bg-sky-500/15 border-l-4 border-sky-400'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-white text-xs truncate flex items-center space-x-1.5">
                            <span>{sub.studentName}</span>
                            {sub.status === 'graded' && sub.grade !== undefined && (
                              <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                ({sub.grade}/100)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {sub.assignmentTitle}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(sub.submittedAt || '').toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Review & Grade Form */}
            {selectedSub ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
                <div
                  className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                    isMech ? 'bg-[#081711] border-emerald-500/20' : 'bg-[#0c1326] border-white/10'
                  }`}
                >
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
                        className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-md ${
                          isMech
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                        }`}
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
                  <p
                    className={`p-3.5 rounded-xl border text-slate-300 leading-relaxed font-mono ${
                      isMech
                        ? 'bg-[#030a07] border-emerald-500/20'
                        : 'bg-[#050811] border-white/10'
                    }`}
                  >
                    {selectedSub.hypothesis}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                      Recorded Trials &amp; Percent Error Table:
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isMech ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    >
                      {selectedSub.dataTable?.length || 0} Recorded Points
                    </span>
                  </div>

                  <div
                    className={`overflow-x-auto rounded-xl border ${
                      isMech ? 'border-emerald-500/20' : 'border-white/10'
                    }`}
                  >
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead
                        className={`uppercase text-[10px] border-b ${
                          isMech
                            ? 'bg-[#030a07] text-slate-400 border-emerald-500/20'
                            : 'bg-[#050811] text-slate-400 border-white/10'
                        }`}
                      >
                        <tr>
                          <th className="py-2.5 px-3">Trial</th>
                          <th className="py-2.5 px-3">Distance r (m)</th>
                          <th className="py-2.5 px-3">r² (m²)</th>
                          <th className="py-2.5 px-3">Measured |F| (N)</th>
                          <th className="py-2.5 px-3">Theory F (N)</th>
                          <th className="py-2.5 px-3">% Error</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y divide-white/5 ${
                          isMech ? 'bg-[#081711]/50' : 'bg-[#0c1326]/50'
                        }`}
                      >
                        {selectedSub.dataTable?.map((r, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-bold text-slate-400">#{r.trial}</td>
                            <td
                              className={`py-2 px-3 ${
                                isMech ? 'text-emerald-300' : 'text-sky-300'
                              }`}
                            >
                              {r.distanceR.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-slate-400">{r.rSquared.toFixed(2)}</td>
                            <td
                              className={`py-2 px-3 font-bold ${
                                isMech ? 'text-teal-300' : 'text-amber-300'
                              }`}
                            >
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
                  <p
                    className={`p-3.5 rounded-xl border text-slate-300 leading-relaxed ${
                      isMech
                        ? 'bg-[#030a07] border-emerald-500/20'
                        : 'bg-[#050811] border-white/10'
                    }`}
                  >
                    {selectedSub.analysisExplanation}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                    Student Conclusion:
                  </span>
                  <p
                    className={`p-3.5 rounded-xl border text-slate-300 leading-relaxed ${
                      isMech
                        ? 'bg-[#030a07] border-emerald-500/20'
                        : 'bg-[#050811] border-white/10'
                    }`}
                  >
                    {selectedSub.conclusion}
                  </p>
                </div>

                {/* Pedagogical Discussion Dialogue Section */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isMech ? 'bg-[#081711] border-emerald-500/25' : 'bg-[#0c1326] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                      <MessageSquare className={`w-4 h-4 ${isMech ? 'text-emerald-400' : 'text-sky-400'}`} />
                      <span>Dialogue &amp; Submission Comments</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Collaborative feedback thread between Student &amp; Instructor
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {displayComments.length === 0 ? (
                      <div className="p-3 bg-black/30 rounded-xl text-center text-slate-500 text-[11px]">
                        No comments recorded yet on this submission. Add comments below to engage with the student.
                      </div>
                    ) : (
                      displayComments.map(c => {
                        const isStudent = c.authorRole === 'student';
                        return (
                          <div
                            key={c.id}
                            className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                              isStudent
                                ? isMech
                                  ? 'bg-emerald-950/20 border-emerald-500/20 ml-2'
                                  : 'bg-sky-950/20 border-sky-500/20 ml-2'
                                : 'bg-black/40 border-white/10 mr-2'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] mb-1">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span>{c.authorName}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-normal uppercase text-[9px] ${
                                    isStudent
                                      ? isMech
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-sky-500/20 text-sky-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}
                                >
                                  {isStudent ? 'Student' : 'Instructor'}
                                </span>
                              </span>
                              <span className="text-slate-500 font-mono">
                                {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-300">{c.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Instructor Comment Form */}
                  <form onSubmit={handleAddInstructorComment} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={instructorReplyText}
                      onChange={e => setInstructorReplyText(e.target.value)}
                      placeholder="Add an instructor feedback comment..."
                      className={`flex-1 rounded-xl px-3 py-2 text-xs text-white border focus:outline-none ${
                        isMech
                          ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                          : 'bg-[#050811] border-white/10 focus:border-sky-400'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!instructorReplyText.trim()}
                      className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 text-xs disabled:opacity-40 ${
                        isMech
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>

                {/* Grading Form */}
                <form
                  onSubmit={handleSaveGrade}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isMech ? 'bg-[#081711] border-emerald-500/30' : 'bg-[#0c1326] border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div
                      className={`flex items-center space-x-2 font-bold text-sm ${
                        isMech ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
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
                        className={`w-full rounded-lg px-3 py-1.5 text-base font-bold font-mono focus:outline-none border ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 text-emerald-400 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 text-amber-400 focus:border-amber-500'
                        }`}
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
                        className={`w-full rounded-lg p-2 text-slate-200 focus:outline-none border ${
                          isMech
                            ? 'bg-[#030a07] border-emerald-500/30 focus:border-emerald-400'
                            : 'bg-[#050811] border-white/10 focus:border-emerald-400'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-md ${
                        isMech
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Record Grade &amp; Comments</span>
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
