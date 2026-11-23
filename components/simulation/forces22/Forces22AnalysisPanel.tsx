'use client';

import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  GitCompare,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Forces22Evaluation,
  Forces22Params,
  Forces22Record,
  TOPIC_22_CLAIM_QUESTIONS,
} from '@/lib/physics/forces-fbd-2-2';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Forces22AnalysisPanelProps {
  params: Forces22Params;
  evaluation: Forces22Evaluation;
  records: Forces22Record[];
  onRecordTrial: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'fbd' | 'comp' | 'claim' | 'justify';

export const Forces22AnalysisPanel: React.FC<Forces22AnalysisPanelProps> = ({
  params,
  evaluation,
  records,
  onRecordTrial,
  onClearRecords,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('fbd');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const { diagramLayout: diag } = evaluation;

  const verifiedCount = TOPIC_22_CLAIM_QUESTIONS.filter(
    q => selectedAnswers[q.id] === q.correctId
  ).length;

  return (
    <aside
      aria-label="Forces and Free-Body Diagrams Analysis"
      className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight truncate">
              FBD &amp; Interaction Analysis
            </h2>
            <div className="text-[10px] text-emerald-300/80 font-mono truncate">
              AP Physics C · Skills 1.A, 2.C, 3.B, 3.C
            </div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand analysis panel' : 'Collapse analysis panel'}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 4 AP Suggested Skill Tabs */}
          <div className="grid grid-cols-4 gap-1 p-2 bg-[#040d0a] border-b border-emerald-500/15">
            {(
              [
                { id: 'fbd', label: '1.A FBD', icon: <Activity className="w-3 h-3" /> },
                { id: 'comp', label: '2.C Comp', icon: <GitCompare className="w-3 h-3" /> },
                { id: 'claim', label: '3.B Claim', icon: <ShieldCheck className="w-3 h-3" /> },
                { id: 'justify', label: '3.C Justify', icon: <FileCheck2 className="w-3 h-3" /> },
              ] as { id: AnalysisTab; label: string; icon: React.ReactNode }[]
            ).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable Body */}
          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* =============================================================== */}
            {/* TAB 1: 1.A AP EXAM FREE-BODY DIAGRAM + AGENT-OBJECT TABLE        */}
            {/* =============================================================== */}
            {activeTab === 'fbd' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-emerald-300">
                      AP Exam 2D Free-Body Diagram
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Skill 1.A · Pure Forces
                    </span>
                  </div>
                  <svg
                    viewBox={`0 0 ${diag.width} ${diag.height}`}
                    className="w-full h-[182px] bg-[#020806] rounded-lg border border-emerald-500/15"
                    role="img"
                    aria-label="AP Physics C 2D Free-Body Diagram"
                  >
                    {/* Rotated Coordinate Axes */}
                    {diag.axes.map((ax, idx) => (
                      <g key={idx}>
                        <line
                          x1={ax.x1}
                          y1={ax.y1}
                          x2={ax.x2}
                          y2={ax.y2}
                          stroke={ax.colorHex}
                          strokeWidth="1"
                          strokeDasharray="4 3"
                          strokeOpacity="0.5"
                        />
                        <text
                          x={ax.labelX}
                          y={ax.labelY}
                          fill={ax.colorHex}
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {ax.label}
                        </text>
                      </g>
                    ))}

                    {/* Pure Force Vectors from COM Dot (Side-by-Side if Collinear) */}
                    {diag.arrows.map(a => {
                      const dx = a.x2 - a.x1;
                      const dy = a.y2 - a.y1;
                      const len = Math.hypot(dx, dy) || 1;
                      const ux = dx / len;
                      const uy = dy / len;
                      const px = -uy;
                      const py = ux;
                      const headL = 7;
                      const headW = 4;
                      const bx = a.x2 - ux * headL;
                      const by = a.y2 - uy * headL;
                      const pts = `${a.x2},${a.y2} ${bx + px * headW},${by + py * headW} ${
                        bx - px * headW
                      },${by - py * headW}`;
                      return (
                        <g key={a.id}>
                          <line
                            x1={a.x1}
                            y1={a.y1}
                            x2={bx}
                            y2={by}
                            stroke={a.colorHex}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          />
                          <polygon points={pts} fill={a.colorHex} />
                          <text
                            x={a.labelX}
                            y={a.labelY}
                            fill={a.colorHex}
                            fontSize="9.5"
                            fontWeight="700"
                            fontFamily="monospace"
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {a.symbol}
                          </text>
                        </g>
                      );
                    })}

                    {/* Center-of-Mass Dot (EK 2.2.B.3) */}
                    <circle
                      cx={diag.cx}
                      cy={diag.cy}
                      r="5.5"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="2"
                    />

                    {/* Separate Off-Dot Acceleration Indicator */}
                    {diag.accelArrow.visible && (
                      <g>
                        <line
                          x1={diag.accelArrow.x1}
                          y1={diag.accelArrow.y1}
                          x2={diag.accelArrow.x2}
                          y2={diag.accelArrow.y2}
                          stroke="#fbbf24"
                          strokeWidth="2"
                        />
                        <circle
                          cx={diag.accelArrow.x2}
                          cy={diag.accelArrow.y2}
                          r="2.4"
                          fill="#fbbf24"
                        />
                        <text
                          x="255"
                          y="14"
                          fill="#fde68a"
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {diag.accelArrow.label}
                        </text>
                      </g>
                    )}

                    <text
                      x="8"
                      y={diag.height - 6}
                      fill="#64748b"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {diag.scaleNote}
                    </text>
                  </svg>
                </div>

                {/* Agent -> Target Force Inventory Table (LO 2.2.A.1 & 2.2.A.2) */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-emerald-300">
                      Force Interactions (Agent → Object)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {evaluation.forces.length} active
                    </span>
                  </div>
                  {evaluation.forces.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-2 text-center">
                      Select candidate vectors on the left to build the FBD.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {evaluation.forces.map(f => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 bg-[#071812] border border-emerald-500/15 rounded-lg px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-mono font-bold text-[11px]"
                                style={{ color: f.colorHex }}
                              >
                                {f.symbol}
                              </span>
                              <span className="text-[10px] text-slate-300 truncate">
                                {f.agent} → {f.target}
                              </span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-mono">
                              {f.kind === 'contact'
                                ? 'Contact (electric)'
                                : 'Non-contact (field)'}
                              {f.collinearGroupSize > 1 ? ' · Side-by-side' : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-mono font-bold text-white tabular-nums">
                              {params.mode === 'fbd_builder'
                                ? `${f.angleDeg.toFixed(0)}°`
                                : `${f.magnitudeN.toFixed(1)} N`}
                            </div>
                            <div className="text-[9px] font-mono text-slate-400">
                              {params.mode === 'fbd_builder' ? 'vector' : `${f.angleDeg.toFixed(0)}°`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Essential Knowledge Summary */}
                <div className="bg-emerald-950/40 border border-emerald-500/25 rounded-xl p-2.5 text-[11px] text-emerald-100/90 leading-relaxed">
                  <div className="text-[10px] font-semibold text-emerald-300 mb-1">
                    AP Physics C · Essential Knowledge
                  </div>
                  {evaluation.ekTakeaway}
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: 2.C SCENARIO COMPARISON + TRIAL LOGGER                    */}
            {/* =============================================================== */}
            {activeTab === 'comp' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-emerald-300">
                    {evaluation.comparisonTitle}
                  </div>
                  <div className="space-y-2">
                    {evaluation.comparisonRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="bg-[#071812] border border-emerald-500/15 rounded-lg p-2"
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="font-semibold text-slate-200">{row.label}</span>
                          <span className="font-mono text-amber-300">{row.deltaNote}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-[#040d0a] rounded px-2 py-1 text-emerald-200">
                            {row.scenarioA}
                          </div>
                          <div className="bg-[#040d0a] rounded px-2 py-1 text-slate-300">
                            {row.scenarioB}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Record FBD Trial Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRecordTrial}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record FBD Trial</span>
                  </button>
                  {records.length > 0 && (
                    <button
                      onClick={onClearRecords}
                      aria-label="Clear recorded FBD trials"
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-white/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {records.length > 0 && (
                  <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>2.C Recorded Scenarios ({records.length})</span>
                      <span>|ΣF| &amp; a</span>
                    </div>
                    {records.map(rec => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between text-[10px] font-mono bg-[#071812] rounded-lg px-2 py-1.5 border border-emerald-500/10"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-slate-100 font-semibold truncate">{rec.label}</div>
                          <div className="text-slate-400 text-[9px] truncate">{rec.detail}</div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-amber-300 font-bold">
                            {rec.netForceN.toFixed(1)} N
                          </div>
                          <div className="text-emerald-300 text-[9px]">
                            a={rec.accelMps2.toFixed(2)} m/s²
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 3: 3.B CLAIM CHECKS                                          */}
            {/* =============================================================== */}
            {activeTab === 'claim' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-300">Topic 2.2 Claim Checks (3.B)</span>
                  <span className="font-mono text-slate-300 tabular-nums">
                    {verifiedCount}/{TOPIC_22_CLAIM_QUESTIONS.length} Verified
                  </span>
                </div>

                {TOPIC_22_CLAIM_QUESTIONS.map((q, qIdx) => {
                  const chosen = selectedAnswers[q.id];
                  const isCorrect = chosen === q.correctId;
                  return (
                    <div
                      key={q.id}
                      className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-300 font-bold">
                          Q{qIdx + 1} · Skill {q.skill}
                        </span>
                        <span className="text-slate-400">{q.ekRef}</span>
                      </div>
                      <p className="text-[11px] text-slate-100 leading-relaxed">{q.prompt}</p>
                      <div className="space-y-1.5">
                        {q.options.map(opt => {
                          const isSelected = chosen === opt.id;
                          const stateCls = !isSelected
                            ? 'bg-[#071812] border-emerald-500/15 text-slate-300 hover:border-emerald-400/40'
                            : isCorrect
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-semibold'
                            : 'bg-rose-500/20 border-rose-400 text-rose-100 font-semibold';
                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                              }
                              className={`w-full text-left px-2.5 py-2 rounded-lg border text-[11px] leading-snug transition flex items-start gap-2 cursor-pointer ${stateCls}`}
                            >
                              <span className="font-mono font-bold uppercase shrink-0">
                                {opt.id}.
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                      {chosen && (
                        <div
                          className={`rounded-lg p-2 text-[10.5px] leading-relaxed flex items-start gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-950/60 border border-emerald-500/35 text-emerald-200'
                              : 'bg-rose-950/50 border border-rose-500/35 text-rose-200'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: 3.C EVIDENCE-BASED JUSTIFICATION & ALGEBRAIC TRANSLATION  */}
            {/* =============================================================== */}
            {activeTab === 'justify' && (
              <div className="space-y-3">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-300">
                    FBD → Equation Law:
                  </span>
                  <MathFormula formulaKey="sim-forces22" className="text-emerald-300 text-xs" />
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-300 font-bold">1. Claim (Skill 3.B / 3.C)</span>
                    <span className="text-slate-400">{evaluation.justification.ekRef}</span>
                  </div>
                  <p className="text-[11px] text-slate-100 leading-relaxed">
                    {evaluation.justification.claim}
                  </p>
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-mono font-bold text-sky-300">
                    2. Algebraic Translation from FBD (2.2.B.1 &amp; 2.2.B.4)
                  </div>
                  <div className="font-mono text-[10.5px] text-emerald-200 bg-[#071812] rounded-lg px-2.5 py-1.5 border border-emerald-500/15">
                    {evaluation.justification.equationX}
                  </div>
                  <div className="font-mono text-[10.5px] text-sky-200 bg-[#071812] rounded-lg px-2.5 py-1.5 border border-sky-500/15">
                    {evaluation.justification.equationY}
                  </div>
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-1.5">
                  <div className="text-[10px] font-mono font-bold text-amber-300">
                    3. Representation Evidence &amp; Principle (3.C)
                  </div>
                  {evaluation.justification.evidenceRows.map((evRow, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-[10.5px] bg-[#071812] rounded-lg px-2 py-1"
                    >
                      <span className="text-slate-400">{evRow.label}</span>
                      <span className="font-mono text-slate-100 text-right">{evRow.value}</span>
                    </div>
                  ))}
                  <p className="text-[10.5px] text-emerald-100/90 leading-relaxed pt-1">
                    {evaluation.justification.principle}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default Forces22AnalysisPanel;
