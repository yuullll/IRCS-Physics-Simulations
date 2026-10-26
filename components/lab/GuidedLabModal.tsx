'use client';

import React, { useState, useEffect } from 'react';
import {
  LabAssignment,
  LabSubmission,
  LabDataRow,
  SceneSnapshot,
  UserProfile,
} from '@/lib/types/lab';
import { COULOMB_K } from '@/lib/physics/coulomb';
import {
  ClipboardList,
  X,
  Plus,
  Trash2,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  GraduationCap,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface GuidedLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: LabAssignment;
  currentUser: UserProfile;
  initialSubmission?: LabSubmission | null;
  onSaveDraft: (data: Partial<LabSubmission>) => void;
  onSubmitLab: (submission: LabSubmission) => void;
  getLiveSceneSnapshot: () => SceneSnapshot;
  liveSeparationDistance?: number;
  liveCoulombForce?: number;
  course?: 'mechanics' | 'em';
  onAddComment?: (text: string) => void;
}

export const GuidedLabModal: React.FC<GuidedLabModalProps> = ({
  isOpen,
  onClose,
  assignment,
  currentUser,
  initialSubmission,
  onSaveDraft,
  onSubmitLab,
  getLiveSceneSnapshot,
  liveSeparationDistance,
  liveCoulombForce,
  course = 'mechanics',
  onAddComment,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [hypothesis, setHypothesis] = useState(
    initialSubmission?.hypothesis ||
      'If the separation distance r between charges q₁ and q₂ increases, the electrostatic force F will decrease proportionally to 1/r², verifying Coulomb\'s inverse-square law.'
  );

  const [dataTable, setDataTable] = useState<LabDataRow[]>(
    initialSubmission?.dataTable?.length
      ? initialSubmission.dataTable
      : [
          { trial: 1, distanceR: 2.0, rSquared: 4.0, measuredForce: 56.17, calculatedForce: 56.17, percentError: 0.0 },
          { trial: 2, distanceR: 4.0, rSquared: 16.0, measuredForce: 14.04, calculatedForce: 14.04, percentError: 0.0 },
          { trial: 3, distanceR: 6.0, rSquared: 36.0, measuredForce: 6.24, calculatedForce: 6.24, percentError: 0.0 },
        ]
  );

  const [analysisExplanation, setAnalysisExplanation] = useState(
    initialSubmission?.analysisExplanation ||
      'Comparing simulated pairwise force with Coulomb\'s law F = k·|q₁·q₂|/r² showed 0% error. Halving the separation distance quadrupled the force from ~14.04 N to ~56.17 N.'
  );

  const [conclusion, setConclusion] = useState(
    initialSubmission?.conclusion ||
      'The experimental 3D data strongly validates the inverse-square dependence. Field lines radiating from the positive source terminate symmetrically on the negative sink.'
  );

  const [snapshotPreview, setSnapshotPreview] = useState<SceneSnapshot | null>(
    initialSubmission?.sceneSnapshot || null
  );

  const [prevSubmissionId, setPrevSubmissionId] = useState<string | undefined>(
    initialSubmission?.id
  );

  if (initialSubmission?.id !== prevSubmissionId) {
    setPrevSubmissionId(initialSubmission?.id);
    if (initialSubmission) {
      setHypothesis(initialSubmission.hypothesis || '');
      if (initialSubmission.dataTable?.length) setDataTable(initialSubmission.dataTable);
      setAnalysisExplanation(initialSubmission.analysisExplanation || '');
      setConclusion(initialSubmission.conclusion || '');
      setSnapshotPreview(initialSubmission.sceneSnapshot || null);
    }
  }

  if (!isOpen) return null;

  const isGraded = initialSubmission?.status === 'graded';
  const isSubmitted = initialSubmission?.status === 'submitted';

  // Add row from live 3D reading
  const handleCaptureLiveReading = () => {
    const r = liveSeparationDistance && liveSeparationDistance > 0.1 ? liveSeparationDistance : 5.0;
    const q1 = (assignment.fixedParameters?.q1Micro ?? 5.0) * 1e-6;
    const q2 = (assignment.fixedParameters?.q2Micro ?? -5.0) * 1e-6;
    const theoreticalF = (COULOMB_K * Math.abs(q1 * q2)) / (r * r);
    const measuredF = liveCoulombForce !== undefined && liveCoulombForce > 0 ? liveCoulombForce : theoreticalF;
    const err = Math.abs((measuredF - theoreticalF) / theoreticalF) * 100;

    const newRow: LabDataRow = {
      trial: dataTable.length + 1,
      distanceR: parseFloat(r.toFixed(2)),
      rSquared: parseFloat((r * r).toFixed(2)),
      measuredForce: parseFloat(measuredF.toFixed(2)),
      calculatedForce: parseFloat(theoreticalF.toFixed(2)),
      percentError: parseFloat(err.toFixed(2)),
    };

    setDataTable(prev => [...prev, newRow]);
  };

  const handleAddManualRow = () => {
    const trialNum = dataTable.length + 1;
    const r = trialNum * 2.0;
    const q1 = (assignment.fixedParameters?.q1Micro ?? 5.0) * 1e-6;
    const q2 = (assignment.fixedParameters?.q2Micro ?? -5.0) * 1e-6;
    const theoreticalF = (COULOMB_K * Math.abs(q1 * q2)) / (r * r);

    setDataTable(prev => [
      ...prev,
      {
        trial: trialNum,
        distanceR: parseFloat(r.toFixed(2)),
        rSquared: parseFloat((r * r).toFixed(2)),
        measuredForce: parseFloat(theoreticalF.toFixed(2)),
        calculatedForce: parseFloat(theoreticalF.toFixed(2)),
        percentError: 0.0,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    setDataTable(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof LabDataRow, val: number) => {
    setDataTable(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: val };

      if (field === 'distanceR') {
        const r = Math.max(val, 0.1);
        row.rSquared = parseFloat((r * r).toFixed(2));
        const q1 = (assignment.fixedParameters?.q1Micro ?? 5.0) * 1e-6;
        const q2 = (assignment.fixedParameters?.q2Micro ?? -5.0) * 1e-6;
        row.calculatedForce = parseFloat(((COULOMB_K * Math.abs(q1 * q2)) / (r * r)).toFixed(2));
        row.percentError = parseFloat(
          (Math.abs((row.measuredForce - row.calculatedForce) / row.calculatedForce) * 100).toFixed(2)
        );
      } else if (field === 'measuredForce') {
        row.percentError = parseFloat(
          (Math.abs((val - row.calculatedForce) / row.calculatedForce) * 100).toFixed(2)
        );
      }

      copy[index] = row;
      return copy;
    });
  };

  const handleSaveDraft = () => {
    const liveSnapshot = getLiveSceneSnapshot();
    onSaveDraft({
      assignmentId: assignment.id,
      hypothesis,
      dataTable,
      analysisExplanation,
      conclusion,
      sceneSnapshot: liveSnapshot,
    });
  };

  const handleSubmit = () => {
    const liveSnapshot = getLiveSceneSnapshot();
    const sub: LabSubmission = {
      id: initialSubmission?.id || 'sub_' + Math.random().toString(36).substr(2, 8),
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      studentId: currentUser.id,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      classId: currentUser.classId,
      className: currentUser.className,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hypothesis,
      dataTable,
      analysisExplanation,
      conclusion,
      studentComments: initialSubmission?.studentComments || '',
      comments: initialSubmission?.comments || [],
      sceneSnapshot: liveSnapshot,
    };
    onSubmitLab(sub);
  };

  const isMechanics = course === 'mechanics';

  const handlePostStudentComment = () => {
    if (!newCommentText.trim()) return;
    if (onAddComment) {
      onAddComment(newCommentText.trim());
    }
    setNewCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div
        className={`border max-w-3xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isMechanics
            ? 'bg-[#050f0c] border-emerald-500/30 shadow-emerald-950/40 text-slate-200'
            : 'bg-[#060c18] border-sky-500/30 shadow-sky-950/40 text-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isMechanics ? 'bg-[#030907] border-emerald-500/20' : 'bg-[#040810] border-sky-500/20'
          }`}
        >
          <div className="flex items-center space-x-3">
            <ClipboardList className={`w-5 h-5 ${isMechanics ? 'text-emerald-400' : 'text-sky-400'}`} />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">{assignment.title}</h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isMechanics ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {isMechanics ? 'Mechanics Lab' : 'E&M Lab'}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    isGraded
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : isSubmitted
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {isGraded
                    ? `Graded (${initialSubmission?.grade}/100)`
                    : isSubmitted
                    ? 'Submitted (Pending Review)'
                    : 'Draft In Progress'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{assignment.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Lab Assignment Description Assigned by Instructor */}
          {assignment.description && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                isMechanics
                  ? 'bg-[#071610] border-emerald-500/25 text-emerald-100/90'
                  : 'bg-[#081224] border-sky-500/25 text-sky-100/90'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold mb-1 opacity-80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instructor Assignment Description &amp; Directives</span>
              </div>
              <div>{assignment.description}</div>
            </div>
          )}

          {/* Graded Feedback Banner (if graded) */}
          {isGraded && initialSubmission?.feedback && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-emerald-400 text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>Instructor Evaluation &amp; Grade</span>
                </div>
                <span className="font-mono text-base font-bold text-emerald-300">
                  Score: {initialSubmission.grade} / 100
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                &ldquo;{initialSubmission.feedback}&rdquo;
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Graded by {initialSubmission.gradedBy} on{' '}
                {new Date(initialSubmission.gradedAt || '').toLocaleString()}
              </div>
            </div>
          )}

          {/* Fixed Setup Parameters Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Fixed Parameters
              </span>
              <div className="flex items-center space-x-3 text-slate-200 font-mono">
                {assignment.fixedParameters ? (
                  <>
                    <span>q₁ = +{assignment.fixedParameters.q1Micro} μC</span>
                    <span>·</span>
                    <span>q₂ = {assignment.fixedParameters.q2Micro} μC</span>
                    <span>·</span>
                    <span>k = 8.99×10⁹ N·m²/C²</span>
                  </>
                ) : (
                  <span>Standard Laboratory Calibration Constants</span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/50">
              Theoretical Target: F = k·|q₁·q₂| / r²
            </div>
          </div>

          {/* Section 1: Hypothesis */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
              1. Hypothesis &amp; Mathematical Prediction
            </label>
            <textarea
              rows={2}
              value={hypothesis}
              onChange={e => setHypothesis(e.target.value)}
              disabled={isSubmitted}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
              placeholder="State how electrostatic force will change as separation distance r varies..."
            />
          </div>

          {/* Section 2: Data Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
                2. Experimental Data Collection Table
              </label>
              {!isSubmitted && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCaptureLiveReading}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition flex items-center space-x-1"
                    title="Read current separation distance and force from active 3D charges"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Active 3D Reading</span>
                  </button>
                  <button
                    onClick={handleAddManualRow}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>
              )}
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
                    {!isSubmitted && <th className="py-2 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {dataTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition">
                      <td className="py-2 px-3 text-slate-400 font-bold">#{row.trial}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={row.distanceR}
                          disabled={isSubmitted}
                          onChange={e => handleRowChange(idx, 'distanceR', parseFloat(e.target.value) || 1)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-400">{row.rSquared.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.1"
                          value={row.measuredForce}
                          disabled={isSubmitted}
                          onChange={e => handleRowChange(idx, 'measuredForce', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300 font-bold"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-400">{row.calculatedForce.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            row.percentError < 5.0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.percentError.toFixed(2)}%
                        </span>
                      </td>
                      {!isSubmitted && (
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Physical Explanation */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
              3. Physical Explanation &amp; Calculus Regression Analysis
            </label>
            <textarea
              rows={2}
              value={analysisExplanation}
              onChange={e => setAnalysisExplanation(e.target.value)}
              disabled={isSubmitted}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
              placeholder="Explain how the slope of log(F) vs log(r) relates to the exponent -2..."
            />
          </div>

          {/* Section 4: Conclusion */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200 uppercase tracking-wide text-[11px]">
              4. Experimental Conclusion
            </label>
            <textarea
              rows={2}
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              disabled={isSubmitted}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
              placeholder="State your final conclusion regarding inverse-square field behavior..."
            />
          </div>

          {/* Section 5: Student Comments & Dialogue with Instructor */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>5. Submission Comments &amp; Dialogue with Instructor</span>
              </label>
              <span className="text-[10px] text-slate-400">Ask questions or provide notes to your instructor</span>
            </div>

            {/* Existing Comment Feed */}
            {initialSubmission?.comments && initialSubmission.comments.length > 0 && (
              <div className="space-y-2 p-3 rounded-2xl bg-black/40 border border-white/10 max-h-48 overflow-y-auto">
                {initialSubmission.comments.map(c => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 ${
                      c.authorRole === 'instructor'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                        : isMechanics
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                        : 'bg-sky-500/10 border border-sky-500/20 text-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1">
                        {c.authorRole === 'instructor' ? '👨‍🏫 Instructor:' : '🧑‍🎓 Student:'} {c.authorName}
                      </span>
                      <span>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePostStudentComment();
                  }
                }}
                className={`flex-1 px-3 py-2 bg-black/50 border rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none ${
                  isMechanics ? 'border-emerald-500/30 focus:border-emerald-400' : 'border-sky-500/30 focus:border-sky-400'
                }`}
                placeholder="Add a comment or inquiry about your lab report..."
              />
              <button
                type="button"
                onClick={handlePostStudentComment}
                disabled={!newCommentText.trim()}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 ${
                  isMechanics
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </div>
          </div>

          {/* Snapshot Notice */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] flex items-center justify-between text-slate-400">
            <div className="flex items-center space-x-2">
              <Camera className={`w-4 h-4 ${isMechanics ? 'text-emerald-400' : 'text-sky-400'}`} />
              <span>
                On submission, an exact frozen 3D scene snapshot will be attached for instructor verification.
              </span>
            </div>
            {snapshotPreview && (
              <span className="text-emerald-400 font-mono text-[10px]">
                ✓ Snapshot Ready ({snapshotPreview.fieldData?.charges?.length || 0} charges)
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Student: <span className="text-white font-medium">{currentUser.name}</span> ({currentUser.className})
          </div>

          <div className="flex items-center space-x-2">
            {!isSubmitted && (
              <button
                onClick={handleSaveDraft}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 font-semibold transition flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            )}

            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className={`px-4 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 shadow-md ${
                  isMechanics
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-600/30'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-sky-600/30'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Final Lab</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 transition"
              >
                Close Lab Card
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
