'use client';

import React, { useState } from 'react';
import { LabSubmission, SceneSnapshot, UserProfile } from '@/lib/types/lab';
import {
  GraduationCap,
  X,
  CheckCircle2,
  Clock,
  Download,
  Play,
  RotateCcw,
  Search,
  MessageSquare,
  Award,
  ChevronRight,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface InstructorDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: LabSubmission[];
  currentUser: UserProfile;
  onGradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  onRestoreSceneSnapshot: (snapshot: SceneSnapshot, studentName: string) => void;
  onExportCSV: () => void;
}

export const InstructorDashboardModal: React.FC<InstructorDashboardModalProps> = ({
  isOpen,
  onClose,
  submissions,
  currentUser,
  onGradeSubmission,
  onRestoreSceneSnapshot,
  onExportCSV,
}) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedSub = submissions.find(s => s.id === selectedSubmissionId) || submissions[0];

  // Grading form state
  const [gradeInput, setGradeInput] = useState<number>(() =>
    selectedSub?.grade !== undefined ? selectedSub.grade : 95
  );
  const [feedbackInput, setFeedbackInput] = useState<string>(() =>
    selectedSub?.feedback || 'Great experimental verification of Coulomb\'s inverse-square law.'
  );
  const [prevTrackedSubId, setPrevTrackedSubId] = useState<string | undefined>(selectedSub?.id);

  if (selectedSub?.id !== prevTrackedSubId) {
    setPrevTrackedSubId(selectedSub?.id);
    if (selectedSub) {
      setGradeInput(selectedSub.grade !== undefined ? selectedSub.grade : 95);
      setFeedbackInput(selectedSub.feedback || 'Great experimental verification of Coulomb\'s inverse-square law.');
    }
  }

  if (!isOpen) return null;

  const filtered = submissions.filter(s => {
    if (filterStatus === 'submitted' && s.status !== 'submitted') return false;
    if (filterStatus === 'graded' && s.status !== 'graded') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.studentEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    onGradeSubmission(selectedSub.id, gradeInput, feedbackInput);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 max-w-5xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Instructor Evaluation &amp; Gradebook
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 uppercase">
                  {currentUser.className}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Review student 3D scene snapshots, inspect data tables, and submit graded feedback
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition flex items-center space-x-1.5 text-xs font-semibold"
              title="Export complete grading spreadsheet in CSV format"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV (Grades)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master-Detail Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Submissions Roster */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0">
            {/* Search and Filters */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`py-1 rounded font-medium transition ${
                    filterStatus === 'all'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({submissions.length})
                </button>
                <button
                  onClick={() => setFilterStatus('submitted')}
                  className={`py-1 rounded font-medium transition ${
                    filterStatus === 'submitted'
                      ? 'bg-amber-900/40 text-amber-300 font-bold border border-amber-800/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterStatus('graded')}
                  className={`py-1 rounded font-medium transition ${
                    filterStatus === 'graded'
                      ? 'bg-emerald-900/40 text-emerald-300 font-bold border border-emerald-800/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Graded
                </button>
              </div>
            </div>

            {/* Submissions List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No submissions found.</div>
              ) : (
                filtered.map(sub => {
                  const isGraded = sub.status === 'graded';
                  const isSelected = sub.id === selectedSub?.id;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubmissionId(sub.id)}
                      className={`w-full p-3 text-left transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 text-white'
                          : 'hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1 max-w-[85%]">
                        <div className="flex items-center space-x-1.5 font-bold text-xs truncate">
                          <span>{sub.studentName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{sub.studentEmail}</div>
                        <div className="flex items-center space-x-2 text-[10px] font-mono">
                          <span
                            className={`px-1.5 py-0.2 rounded ${
                              isGraded
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                            }`}
                          >
                            {isGraded ? `Score: ${sub.grade}` : 'Needs Review'}
                          </span>
                          <span className="text-slate-500">
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
              {/* Student Header & 3D Restore Action */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{selectedSub.studentName}</span>
                    <span className="text-xs font-normal text-slate-400">({selectedSub.studentEmail})</span>
                  </h3>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                    <span>{selectedSub.assignmentTitle}</span>
                    <span>·</span>
                    <span>Submitted: {new Date(selectedSub.submittedAt || '').toLocaleString()}</span>
                  </div>
                </div>

                {/* Restore Exact 3D Scene */}
                {selectedSub.sceneSnapshot && (
                  <button
                    onClick={() => {
                      onRestoreSceneSnapshot(selectedSub.sceneSnapshot, selectedSub.studentName);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/30"
                    title="Loads the student's exact charges, probes, and circuits into the 3D viewport"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Student 3D Scene</span>
                  </button>
                )}
              </div>

              {/* Hypothesis */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                  Student Hypothesis:
                </span>
                <p className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed font-mono">
                  {selectedSub.hypothesis}
                </p>
              </div>

              {/* Student Data Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                    Recorded Trials &amp; Percent Error Table:
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {selectedSub.dataTable?.length || 0} Recorded Points
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Trial</th>
                        <th className="py-2 px-3">Distance r (m)</th>
                        <th className="py-2 px-3">r² (m²)</th>
                        <th className="py-2 px-3">Measured |F| (N)</th>
                        <th className="py-2 px-3">Theory F (N)</th>
                        <th className="py-2 px-3">% Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {selectedSub.dataTable?.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-slate-400">#{r.trial}</td>
                          <td className="py-2 px-3 text-cyan-300">{r.distanceR.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-400">{r.rSquared.toFixed(2)}</td>
                          <td className="py-2 px-3 text-amber-300 font-bold">{r.measuredForce.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-400">{r.calculatedForce.toFixed(2)}</td>
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

              {/* Physical Explanation & Analysis */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                  Physical Analysis &amp; Calculus Explanation:
                </span>
                <p className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed">
                  {selectedSub.analysisExplanation}
                </p>
              </div>

              {/* Conclusion */}
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                  Student Conclusion:
                </span>
                <p className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed">
                  {selectedSub.conclusion}
                </p>
              </div>

              {/* Instructor Grading Form */}
              <form
                onSubmit={handleSaveGrade}
                className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
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
                    <label className="block text-slate-400 text-[11px] mb-1">Score (0-100) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={gradeInput}
                      onChange={e => setGradeInput(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-base font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-500"
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
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
      </div>
    </div>
  );
};
