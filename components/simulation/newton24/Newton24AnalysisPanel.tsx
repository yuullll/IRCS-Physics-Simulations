'use client';

import React, { useState } from 'react';
import {
  Activity,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Scale,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Newton24Evaluation,
  Newton24Params,
  Newton24Record,
  TOPIC_24_CLAIM_QUESTIONS,
} from '@/lib/physics/newton-first-law-2-4';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Newton24AnalysisPanelProps {
  params: Newton24Params;
  evaluation: Newton24Evaluation;
  records: Newton24Record[];
  onRecordTrial: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'graph' | 'calc' | 'comp' | 'justify';

export const Newton24AnalysisPanel: React.FC<Newton24AnalysisPanelProps> = ({
  evaluation,
  records,
  onRecordTrial,
  onClearRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('graph');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const verifiedCount = TOPIC_24_CLAIM_QUESTIONS.filter(q => {
    const pick = selectedAnswers[q.id];
    return q.options.some(o => o.id === pick && o.isCorrect);
  }).length;

  const gl = evaluation.graphLayout;

  return (
    <aside
      aria-label="Topic 2.4 AP Skills Analysis"
      className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-tight truncate">
              Equilibrium & Inertia Analysis
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80">
              AP Physics C · Skills 1.C, 2.B, 2.C, 3.C
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(v => !v)}
          aria-label={isCollapsed ? 'Expand analysis panel' : 'Collapse analysis panel'}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          {/* 4 AP Skill Tabs */}
          <div className="grid grid-cols-4 gap-1 p-2 border-b border-emerald-500/15 bg-[#040d0a]">
            {(
              [
                { id: 'graph', label: '1.C Graph', icon: <Activity className="w-3.5 h-3.5" /> },
                { id: 'calc', label: '2.B Calc', icon: <Calculator className="w-3.5 h-3.5" /> },
                { id: 'comp', label: '2.C Comp', icon: <Scale className="w-3.5 h-3.5" /> },
                { id: 'justify', label: '3.C Justify', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              ] as { id: AnalysisTab; label: string; icon: React.ReactNode }[]
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/15'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* =============================================================== */}
            {/* TAB 1: SKILL 1.C QUALITATIVE/QUANTITATIVE GRAPHS & POLYGON      */}
            {/* =============================================================== */}
            {activeTab === 'graph' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-300 truncate">
                      {gl.title}
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400 shrink-0 ml-1">
                      Skill 1.C
                    </span>
                  </div>

                  <svg
                    viewBox={`0 0 ${gl.width} ${gl.height}`}
                    className="w-full h-auto rounded-lg bg-[#030907] border border-emerald-500/15"
                    role="img"
                    aria-label={gl.title}
                  >
                    {gl.kind === 'polygon' && gl.polygonVectors && gl.netVector ? (
                      <>
                        {/* Subtle coordinate axes */}
                        <line
                          x1={16}
                          y1={gl.height / 2}
                          x2={gl.width - 16}
                          y2={gl.height / 2}
                          stroke="rgba(148,163,184,0.16)"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={gl.width / 2}
                          y1={14}
                          x2={gl.width / 2}
                          y2={gl.height - 14}
                          stroke="rgba(148,163,184,0.16)"
                          strokeDasharray="3 3"
                        />

                        {/* Tip-to-tail vectors */}
                        {gl.polygonVectors.map((v, idx) => {
                          const dx = v.x2 - v.x1;
                          const dy = v.y2 - v.y1;
                          const len = Math.hypot(dx, dy);
                          const ux = len > 1 ? dx / len : 1;
                          const uy = len > 1 ? dy / len : 0;
                          const ah = 7;
                          const ax = v.x2 - ux * ah;
                          const ay = v.y2 - uy * ah;
                          const px = -uy * 3.8;
                          const py = ux * 3.8;
                          const mx = (v.x1 + v.x2) / 2 - uy * 11;
                          const my = (v.y1 + v.y2) / 2 + ux * 11;
                          return (
                            <g key={idx}>
                              <line
                                x1={v.x1}
                                y1={v.y1}
                                x2={v.x2}
                                y2={v.y2}
                                stroke={v.color}
                                strokeWidth={2.4}
                              />
                              {len > 6 && (
                                <polygon
                                  points={`${v.x2},${v.y2} ${ax + px},${ay + py} ${ax - px},${ay - py}`}
                                  fill={v.color}
                                />
                              )}
                              <text
                                x={Math.max(26, Math.min(gl.width - 26, mx))}
                                y={Math.max(16, Math.min(gl.height - 20, my))}
                                fill={v.color}
                                fontSize="10"
                                fontFamily="ui-monospace, monospace"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                {v.label}
                              </text>
                            </g>
                          );
                        })}

                        {/* Resultant ΣF gap arrow when unbalanced */}
                        {!gl.netVector.isZero && (
                          <g>
                            <line
                              x1={gl.netVector.x1}
                              y1={gl.netVector.y1}
                              x2={gl.netVector.x2}
                              y2={gl.netVector.y2}
                              stroke="#f43f5e"
                              strokeWidth={2.6}
                              strokeDasharray="4 3"
                            />
                            <circle
                              cx={gl.netVector.x2}
                              cy={gl.netVector.y2}
                              r={3.5}
                              fill="#f43f5e"
                            />
                          </g>
                        )}

                        {/* Origin dot */}
                        <circle
                          cx={gl.netVector.x1}
                          cy={gl.netVector.y1}
                          r={3.5}
                          fill={gl.netVector.isZero ? '#10b981' : '#e2e8f0'}
                        />

                        <text
                          x={gl.width / 2}
                          y={gl.height - 7}
                          fill={gl.netVector.isZero ? '#34d399' : '#fb7185'}
                          fontSize="9.5"
                          fontFamily="ui-monospace, monospace"
                          textAnchor="middle"
                        >
                          {gl.annotationText}
                        </text>
                      </>
                    ) : (
                      <>
                        {/* Axes & Zero Line */}
                        <line x1={34} y1={20} x2={34} y2={gl.height - 26} stroke="#334155" strokeWidth={1.2} />
                        <line x1={34} y1={gl.height - 26} x2={gl.width - 14} y2={gl.height - 26} stroke="#334155" strokeWidth={1.2} />
                        {gl.zeroLineY !== undefined && (
                          <line
                            x1={34}
                            y1={gl.zeroLineY}
                            x2={gl.width - 14}
                            y2={gl.zeroLineY}
                            stroke="rgba(148,163,184,0.3)"
                            strokeDasharray="3 3"
                          />
                        )}

                        {/* Y axis limits */}
                        <text x={30} y={24} fill="#94a3b8" fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="end">
                          {gl.yMax}
                        </text>
                        <text x={30} y={gl.height - 24} fill="#94a3b8" fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="end">
                          {gl.yMin}
                        </text>

                        {/* Series A & Series B paths */}
                        {gl.seriesB && (
                          <>
                            <path d={gl.seriesB.pathD} fill="none" stroke={gl.seriesB.color} strokeWidth={2.2} strokeDasharray={gl.kind === 'dual_kinematics' ? '5 3' : undefined} />
                            <circle cx={gl.seriesB.currentX} cy={gl.seriesB.currentY} r={3.6} fill={gl.seriesB.color} />
                          </>
                        )}
                        {gl.seriesA && (
                          <>
                            <path d={gl.seriesA.pathD} fill="none" stroke={gl.seriesA.color} strokeWidth={2.4} />
                            <circle cx={gl.seriesA.currentX} cy={gl.seriesA.currentY} r={3.8} fill={gl.seriesA.color} />
                          </>
                        )}

                        {/* Legend cleanly split left & right */}
                        {gl.seriesA && (
                          <text x={38} y={14} fill={gl.seriesA.color} fontSize="9.2" fontFamily="ui-monospace, monospace" fontWeight="700">
                            {gl.seriesA.valueText}
                          </text>
                        )}
                        {gl.seriesB && (
                          <text x={gl.width - 14} y={14} fill={gl.seriesB.color} fontSize="9.2" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="end">
                            {gl.seriesB.valueText}
                          </text>
                        )}

                        {/* Bottom axis annotation */}
                        <text
                          x={gl.width / 2 + 8}
                          y={gl.height - 8}
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="ui-monospace, monospace"
                          textAnchor="middle"
                        >
                          {gl.annotationText}
                        </text>
                      </>
                    )}
                  </svg>
                </div>

                {/* First-Law Audit Card */}
                <div
                  className={`rounded-xl border p-3 ${
                    evaluation.auditStatus === 'VERIFIED'
                      ? 'bg-emerald-500/10 border-emerald-400/35'
                      : 'bg-rose-500/10 border-rose-400/35'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-bold text-[11px] ${
                        evaluation.auditStatus === 'VERIFIED' ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      First-Law Audit · {evaluation.auditStatus}
                    </span>
                    <MathFormula formulaKey="sim-newton24" className="text-emerald-200 text-[11px]" />
                  </div>
                  <div className="font-mono text-[10.5px] text-slate-200 leading-relaxed">
                    {evaluation.auditBadgeText}
                  </div>
                </div>

                {/* Active Force Vectors List */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="text-[10.5px] font-bold text-slate-300">
                    Active Force Vectors (Agent → System)
                  </div>
                  <div className="space-y-1">
                    {evaluation.forces.map(f => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10.5px] font-mono tabular-nums"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold shrink-0" style={{ color: f.color }}>
                            {f.label}
                          </span>
                          <span className="text-slate-400 truncate">{f.agent}</span>
                        </div>
                        <span className="text-slate-100 font-bold shrink-0 ml-2">
                          {f.mag.toFixed(1)} N
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: SKILL 2.B CALCULATE UNKNOWN QUANTITIES                   */}
            {/* =============================================================== */}
            {activeTab === 'calc' && (
              <div className="space-y-2.5">
                <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-2.5">
                  <div className="text-[11px] font-bold text-emerald-300">
                    Skill 2.B — Computational Pathway (Unknown Quantities)
                  </div>
                  <div className="text-[10.5px] text-slate-300 mt-0.5">
                    Step-by-step vector resolution and equilibrium calculation from live lab values.
                  </div>
                </div>

                {evaluation.calcSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-1"
                  >
                    <div className="text-[11px] font-bold text-white">{step.title}</div>
                    <div className="font-mono text-[10.5px] text-emerald-300">{step.formula}</div>
                    <div className="font-mono text-[10px] text-slate-400">{step.substitution}</div>
                    <div className="font-mono text-[11px] font-bold text-amber-300 pt-0.5 tabular-nums">
                      ⇒ {step.result}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: SKILL 2.C COMPARE SCENARIOS & TRIAL COMPARISON LOG       */}
            {/* =============================================================== */}
            {activeTab === 'comp' && (
              <div className="space-y-3">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 gap-1 px-2.5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-[10px] font-bold text-emerald-300">
                    <span>Quantity</span>
                    <span>{evaluation.comparisonHeaders[0]}</span>
                    <span>{evaluation.comparisonHeaders[1]}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {evaluation.comparisonRows.map((row, idx) => (
                      <div key={idx} className="px-2.5 py-2 space-y-0.5">
                        <div className="grid grid-cols-3 gap-1 text-[10.5px] font-mono tabular-nums">
                          <span className="text-slate-300 font-sans font-semibold">{row.metric}</span>
                          <span className="text-emerald-200">{row.colA}</span>
                          <span className="text-sky-200">{row.colB}</span>
                        </div>
                        <div className="text-[9.5px] font-mono text-amber-300/90">
                          {row.verdict}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trial Comparison Logger */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">
                      Skill 2.C Trial Comparison Log ({records.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={onRecordTrial}
                        className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Record Trial</span>
                      </button>
                      {records.length > 0 && (
                        <button
                          onClick={onClearRecords}
                          aria-label="Clear recorded trials"
                          className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {records.length === 0 ? (
                    <div className="text-[10.5px] text-slate-400 italic py-2 text-center">
                      Click “Record Trial” to log and compare equilibrium states, axes, or observer frames.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {records.map((rec, i) => (
                        <div
                          key={rec.id}
                          className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-mono space-y-0.5"
                        >
                          <div className="flex justify-between text-emerald-300 font-bold">
                            <span>
                              #{records.length - i} · {rec.modeLabel}
                            </span>
                            <span className="text-amber-300">{rec.netForceLabel}</span>
                          </div>
                          <div className="text-slate-400">{rec.setupSummary}</div>
                          <div className="text-slate-200">{rec.motionResult}</div>
                          <div className="text-sky-300">{rec.verdict}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: SKILL 3.C JUSTIFY & INTERACTIVE CLAIM CHECKS             */}
            {/* =============================================================== */}
            {activeTab === 'justify' && (
              <div className="space-y-3">
                {/* Live Dynamic Physical Law Justification */}
                <div className="bg-emerald-500/10 border border-emerald-400/35 rounded-xl p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-300">
                    {evaluation.justificationTitle}
                  </div>
                  <div className="font-mono text-[10.5px] text-amber-300 bg-[#040d0a] px-2 py-1 rounded-lg border border-emerald-500/20">
                    {evaluation.justificationLaw}
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    {evaluation.justificationBody}
                  </p>
                </div>

                {/* Interactive AP Claim-Evidence-Reasoning Checks */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-white">
                    AP Concept Checks (Skill 3.C)
                  </span>
                  <span className="font-mono text-[10.5px] font-bold text-emerald-300 tabular-nums">
                    {verifiedCount} / {TOPIC_24_CLAIM_QUESTIONS.length} Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {TOPIC_24_CLAIM_QUESTIONS.map((q, idx) => {
                    const picked = selectedAnswers[q.id];
                    const chosenOpt = q.options.find(o => o.id === picked);
                    return (
                      <div
                        key={q.id}
                        className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                          <span>Question {idx + 1}</span>
                          <span>{q.ekCode}</span>
                        </div>
                        <p className="text-[11px] text-slate-100 leading-snug">{q.prompt}</p>
                        <div className="space-y-1.5">
                          {q.options.map(opt => {
                            const isSelected = picked === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() =>
                                  setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                                }
                                className={`w-full text-left p-2 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${
                                  isSelected
                                    ? opt.isCorrect
                                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                                      : 'bg-rose-500/20 border-rose-400 text-rose-100'
                                    : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-emerald-400/40'
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                        {chosenOpt && (
                          <div
                            className={`flex items-start gap-1.5 p-2 rounded-lg text-[10.5px] leading-snug ${
                              chosenOpt.isCorrect
                                ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/25'
                                : 'bg-rose-500/10 text-rose-200 border border-rose-400/25'
                            }`}
                          >
                            {chosenOpt.isCorrect ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                            )}
                            <span>{q.evidence}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
