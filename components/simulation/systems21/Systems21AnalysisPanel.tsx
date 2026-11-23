'use client';

import React, { useState } from 'react';
import {
  Activity,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Plus,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Systems21Evaluation,
  Systems21Params,
  Systems21Record,
  TOPIC_21_CLAIM_QUESTIONS,
} from '@/lib/physics/systems-com-2-1';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Systems21AnalysisPanelProps {
  params: Systems21Params;
  evaluation: Systems21Evaluation;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  records: Systems21Record[];
  onRecordTrial: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'diagram' | 'solve' | 'compare' | 'claims';

export const Systems21AnalysisPanel: React.FC<Systems21AnalysisPanelProps> = ({
  params,
  evaluation,
  isCollapsed,
  onToggleCollapse,
  records,
  onRecordTrial,
  onClearRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('diagram');
  const [answers, setAnswers] = useState<Record<string, 'a' | 'b' | 'c'>>({});

  const verifiedCount = TOPIC_21_CLAIM_QUESTIONS.filter(
    q => answers[q.id] === q.correctId
  ).length;

  const chart = evaluation.chartLayout;

  return (
    <aside
      aria-label="Systems and Center of Mass Analysis"
      className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#061410]/95 border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight leading-none truncate">
              Systems &amp; COM Analysis
            </h2>
            <span className="text-[10px] font-mono text-emerald-300/80 whitespace-nowrap block mt-0.5">
              AP Physics C · Skills 1.A, 2.B, 2.C, 3.B
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand analysis panel' : 'Collapse analysis panel'}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer shrink-0"
        >
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 4 AP Suggested Skill Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-[#040b09] p-1 rounded-xl border border-white/10">
            {(
              [
                { id: 'diagram', label: '1.A Chart', icon: <Activity className="w-3 h-3" /> },
                { id: 'solve', label: '2.B Solve', icon: <Calculator className="w-3 h-3" /> },
                { id: 'compare', label: '2.C Comp', icon: <GitCompare className="w-3 h-3" /> },
                { id: 'claims', label: '3.B Claim', icon: <ShieldCheck className="w-3 h-3" /> },
              ] as { id: AnalysisTab; label: string; icon: React.ReactNode }[]
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-emerald-400 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* TAB 1: 1.A DIAGRAMS, CHARTS & LIVE READOUTS                     */}
          {/* =============================================================== */}
          {activeTab === 'diagram' && (
            <div className="space-y-2.5">
              {/* 3 Tabular KPI Metrics */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">Total Mass M</div>
                  <div className="text-sm font-mono font-bold text-emerald-300 tabular-nums mt-0.5">
                    {evaluation.totalMassKg.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">kg</div>
                </div>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">x_cm</div>
                  <div className="text-sm font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                    {evaluation.xComM >= 0 ? '+' : ''}
                    {evaluation.xComM.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">meters</div>
                </div>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">y_cm</div>
                  <div className="text-sm font-mono font-bold text-sky-300 tabular-nums mt-0.5">
                    {evaluation.yComM >= 0 ? '+' : ''}
                    {evaluation.yComM.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">meters</div>
                </div>
              </div>

              {/* Live Bounded 1.A SVG Chart */}
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-300 font-semibold truncate">{chart.yLabel}</span>
                  <span className="text-emerald-400 shrink-0">1.A</span>
                </div>
                <svg
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  className="w-full h-[126px] block"
                  role="img"
                  aria-label="Center of mass distribution and trajectory profile"
                >
                  {/* Plot Frame Axes */}
                  <line
                    x1={34}
                    y1={14}
                    x2={34}
                    y2={chart.height - 22}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <line
                    x1={34}
                    y1={chart.height - 22}
                    x2={chart.width - 12}
                    y2={chart.height - 22}
                    stroke="#334155"
                    strokeWidth="1"
                  />

                  {/* Secondary Reference Curve (dashed) */}
                  <path
                    d={chart.secondaryPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.78"
                  />

                  {/* Primary Active Curve */}
                  <path
                    d={chart.primaryPath}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.2"
                  />

                  {/* Active COM / Instant Vertical Marker */}
                  <line
                    x1={chart.markerX}
                    y1={14}
                    x2={chart.markerX}
                    y2={chart.height - 22}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={chart.markerX}
                    cy={chart.markerY}
                    r="4"
                    fill="#f59e0b"
                    stroke="#040b09"
                    strokeWidth="1.5"
                  />

                  {/* Axis labels */}
                  <text x="6" y="20" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                    {chart.yMaxLabel}
                  </text>
                  <text
                    x="6"
                    y={chart.height - 24}
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {chart.yMinLabel}
                  </text>
                  <text
                    x={chart.width / 2 + 12}
                    y={chart.height - 6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {chart.xLabel}
                  </text>
                </svg>

                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                  <span className="text-emerald-300 truncate">── {chart.legendPrimary}</span>
                  <span className="text-sky-300 truncate">- - {chart.legendSecondary}</span>
                </div>
              </div>

              {/* Essential Knowledge Callout */}
              <div className="bg-[#040b09] border border-emerald-500/25 rounded-xl p-2.5 text-[11px] text-slate-300 leading-relaxed">
                <div className="text-[10px] font-mono text-emerald-400 font-bold mb-1">
                  AP Physics C · Essential Knowledge
                </div>
                {evaluation.ekTakeaway}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: 2.B CALCULATE WITH UNITS & TRIAL LOG                     */}
          {/* =============================================================== */}
          {activeTab === 'solve' && (
            <div className="space-y-2.5">
              <div className="bg-[#040b09] border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {params.mode === 'continuous_rod' ? 'Continuous COM:' : 'Discrete COM:'}
                </span>
                <MathFormula
                  formulaKey={params.mode === 'continuous_rod' ? 'sim-systems21-int' : 'sim-systems21'}
                  className="text-emerald-300 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                {evaluation.solveSteps.map(step => (
                  <div
                    key={step.step}
                    className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-white leading-tight">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 text-[9.5px] font-mono mr-1.5">
                          {step.step}
                        </span>
                        {step.title}
                      </span>
                      <span className="text-[9.5px] font-mono text-emerald-400 shrink-0">
                        {step.ekRef}
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-[#081a14] border border-white/5 text-[10.5px] font-mono text-emerald-200">
                      {step.formula}
                    </div>
                    <div className="text-[10px] font-mono text-slate-300 tabular-nums">
                      {step.substitution}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trial Logger */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRecordTrial}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record COM Trial</span>
                </button>
                {records.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRecords}
                    aria-label="Clear recorded trials"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {records.length > 0 && (
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-white/10 pb-1">
                    <span>2.B Calculation Log ({records.length})</span>
                    <span>r_cm &amp; M</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {records.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-[10px] font-mono bg-white/[0.03] px-2 py-1 rounded-lg"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-white font-semibold truncate">{r.label}</div>
                          <div className="text-[9px] text-slate-400 truncate">{r.note}</div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-amber-300 font-bold">
                            ({r.xComM.toFixed(2)}, {r.yComM.toFixed(2)})m
                          </div>
                          <div className="text-[9px] text-emerald-300">
                            M={r.totalMassKg.toFixed(1)}kg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: 2.C SCENARIO & CONSTITUENT COMPARISON                    */}
          {/* =============================================================== */}
          {activeTab === 'compare' && (
            <div className="space-y-2.5">
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                <div className="text-[10.5px] font-mono font-bold text-emerald-300">
                  {evaluation.compareHeadline}
                </div>
                <div className="space-y-1.5">
                  {evaluation.compareRows.map(row => (
                    <div
                      key={row.label}
                      className="bg-[#081a14] border border-white/5 rounded-lg p-2 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-300 font-semibold">{row.label}</span>
                        <span className="text-amber-300 font-bold">{row.deltaNote}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono tabular-nums">
                        <div className="bg-[#040b09] px-2 py-1 rounded border border-emerald-500/25 text-emerald-200 truncate">
                          {row.scenarioA}
                        </div>
                        <div className="bg-[#040b09] px-2 py-1 rounded border border-white/10 text-slate-300 truncate">
                          {row.scenarioB}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symmetry & Material Location Audit */}
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Symmetry Check (2.1.B.1)</span>
                  <span
                    className={
                      evaluation.isOnSymmetryAxis
                        ? 'text-emerald-300 font-bold'
                        : 'text-amber-300 font-bold'
                    }
                  >
                    {evaluation.isOnSymmetryAxis ? 'On Symmetry Line' : 'Asymmetric'}
                  </span>
                </div>
                <p className="text-slate-300 text-[10.5px] leading-snug">
                  {evaluation.symmetryAxisLabel}
                </p>
                {params.mode === 'continuous_rod' && (
                  <div className="pt-1 border-t border-white/10 text-[10px] font-mono text-sky-300">
                    Density derivative check (2.1.B.3.i): dm/dx ={' '}
                    {evaluation.lambdaDerivativeCheckKgPerM.toFixed(2)} kg/m = λ(0.6L)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: 3.B CONCEPTUAL CLAIMS & LAW JUSTIFICATION                */}
          {/* =============================================================== */}
          {activeTab === 'claims' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-emerald-300 font-bold">Topic 2.1 Claim Checks (3.B)</span>
                <span className="text-slate-400 tabular-nums">
                  {verifiedCount}/{TOPIC_21_CLAIM_QUESTIONS.length} Verified
                </span>
              </div>

              <div className="space-y-2">
                {TOPIC_21_CLAIM_QUESTIONS.map((q, qIdx) => {
                  const chosen = answers[q.id];
                  const isCorrect = chosen === q.correctId;
                  return (
                    <div
                      key={q.id}
                      className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[9.5px] font-mono">
                        <span className="text-emerald-400 font-bold">
                          Q{qIdx + 1} · Skill {q.skill}
                        </span>
                        <span className="text-slate-400">{q.ekRef}</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug">{q.prompt}</p>
                      <div className="space-y-1">
                        {q.options.map(opt => {
                          const selected = chosen === opt.id;
                          const showRight = chosen && opt.id === q.correctId;
                          const showWrong = selected && opt.id !== q.correctId;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] border transition cursor-pointer flex items-start gap-1.5 ${
                                showRight
                                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 font-semibold'
                                  : showWrong
                                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-100'
                                  : 'bg-[#081a14] border-white/10 text-slate-300 hover:border-emerald-400/40'
                              }`}
                            >
                              <span className="font-mono font-bold uppercase shrink-0 mt-0.5">
                                {opt.id}.
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                      {chosen && (
                        <div
                          className={`p-2 rounded-lg text-[10px] leading-relaxed flex items-start gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-200 border border-rose-500/30'
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
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default Systems21AnalysisPanel;
