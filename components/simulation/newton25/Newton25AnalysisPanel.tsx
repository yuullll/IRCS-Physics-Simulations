'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LineChart,
  Plus,
  Scale,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AP_CLAIMS_25,
  EXPERIMENTAL_PROCEDURE_3A,
  GraphPlotKind,
  Newton25Evaluation,
  Newton25Params,
  PlottedDataPoint,
  buildQuantitativeGraphLayout25,
  computeScalingPrediction,
} from '@/lib/physics/newton-second-law-2-5';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Newton25AnalysisPanelProps {
  params: Newton25Params;
  evaluation: Newton25Evaluation;
  plottedPoints: PlottedDataPoint[];
  onPlotDataPoint: () => void;
  onClearPoints: () => void;
}

type AnalysisTab = 'graph' | 'calc' | 'scale' | 'lab' | 'claims';

const PLOT_KIND_OPTIONS: { id: GraphPlotKind; label: string }[] = [
  { id: 'a_vs_f', label: 'a vs F' },
  { id: 'a_vs_m', label: 'a vs m' },
  { id: 'a_vs_inv_m', label: 'a vs 1/m' },
  { id: 'v_vs_t', label: 'v(t)' },
];

const SCALE_FACTORS = [0.5, 1, 2, 3];

export const Newton25AnalysisPanel: React.FC<Newton25AnalysisPanelProps> = ({
  params,
  evaluation,
  plottedPoints,
  onPlotDataPoint,
  onClearPoints,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('graph');
  const [plotKind, setPlotKind] = useState<GraphPlotKind>('a_vs_f');
  const [forceFactor, setForceFactor] = useState<number>(2);
  const [massFactor, setMassFactor] = useState<number>(2);
  const [procedureAnswers, setProcedureAnswers] = useState<Record<string, string>>({});
  const [claimAnswers, setClaimAnswers] = useState<Record<string, 'true' | 'false'>>({});

  const graphLayout = useMemo(
    () => buildQuantitativeGraphLayout25(params, evaluation, plotKind, plottedPoints, 278, 148),
    [params, evaluation, plotKind, plottedPoints]
  );

  const scaling = useMemo(
    () =>
      computeScalingPrediction(
        evaluation.fNetMag > 0.1 ? evaluation.fNetMag : 16.0,
        evaluation.systemMassKg,
        forceFactor,
        massFactor
      ),
    [evaluation.fNetMag, evaluation.systemMassKg, forceFactor, massFactor]
  );

  const verifiedClaimCount = useMemo(
    () => AP_CLAIMS_25.filter(c => claimAnswers[c.id] === c.verdict).length,
    [claimAnswers]
  );

  const procedureCorrectCount = useMemo(
    () =>
      EXPERIMENTAL_PROCEDURE_3A.filter(step => {
        const chosen = procedureAnswers[step.id];
        return step.options.some(o => o.id === chosen && o.correct);
      }).length,
    [procedureAnswers]
  );

  return (
    <aside
      aria-label="Topic 2.5 Quantitative Analysis"
      className="absolute top-20 right-4 z-20 w-[338px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-tight truncate">
              Second-Law Analysis Dock
            </div>
            <div className="text-[10px] font-mono text-emerald-400/90">
              Skills 1.B · 2.B · 2.D · 3.A · 3.C
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
          {/* 5 AP Suggested Skill Tabs */}
          <div className="grid grid-cols-5 gap-1 p-2 border-b border-emerald-500/15 bg-[#040d0a]/70">
            {[
              { id: 'graph' as const, label: '1.B', icon: <LineChart className="w-3.5 h-3.5" /> },
              { id: 'calc' as const, label: '2.B', icon: <Calculator className="w-3.5 h-3.5" /> },
              { id: 'scale' as const, label: '2.D', icon: <Scale className="w-3.5 h-3.5" /> },
              { id: 'lab' as const, label: '3.A', icon: <FlaskConical className="w-3.5 h-3.5" /> },
              { id: 'claims' as const, label: '3.C', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-xl text-[10.5px] font-semibold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                    active
                      ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* =============================================================== */}
            {/* TAB 1: SKILL 1.B — QUANTITATIVE GRAPHS & PLOTTING DATA          */}
            {/* =============================================================== */}
            {activeTab === 'graph' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-300 truncate">
                      {graphLayout.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">Skill 1.B</span>
                  </div>

                  {/* Graph Relationship Selector (including AP 1/m linearization!) */}
                  <div className="grid grid-cols-4 gap-1">
                    {PLOT_KIND_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPlotKind(opt.id)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-semibold border transition cursor-pointer ${
                          plotKind === opt.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-[#071611] border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Scaled Quantitative SVG Graph */}
                  <svg
                    viewBox="0 0 278 148"
                    className="w-full h-[148px] bg-[#020806] rounded-lg border border-emerald-500/15"
                    role="img"
                    aria-label={graphLayout.title}
                  >
                    {/* Gridlines & Y Ticks */}
                    {graphLayout.yTicks.map((t, idx) => (
                      <g key={`y-${idx}`}>
                        <line x1={38} y1={t.py} x2={264} y2={t.py} stroke="rgba(148,163,184,0.14)" strokeDasharray="2 3" />
                        <text x={34} y={t.py + 3} textAnchor="end" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                          {t.label}
                        </text>
                      </g>
                    ))}
                    {/* X Ticks */}
                    {graphLayout.xTicks.map((t, idx) => (
                      <g key={`x-${idx}`}>
                        <line x1={t.px} y1={22} x2={t.px} y2={118} stroke="rgba(148,163,184,0.1)" strokeDasharray="2 3" />
                        <text x={t.px} y={130} textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                          {t.label}
                        </text>
                      </g>
                    ))}

                    {/* Axes */}
                    <line x1={38} y1={22} x2={38} y2={118} stroke="#64748b" strokeWidth="1.2" />
                    <line x1={38} y1={118} x2={264} y2={118} stroke="#64748b" strokeWidth="1.2" />

                    {/* Axis Titles */}
                    <text x={151} y={144} textAnchor="middle" fill="#cbd5e1" fontSize="8.5" fontFamily="monospace">
                      {graphLayout.xLabel}
                    </text>
                    <text x={42} y={14} textAnchor="start" fill={graphLayout.curveColor} fontSize="8.5" fontFamily="monospace">
                      {graphLayout.yLabel} · {graphLayout.legendPrimary}
                    </text>
                    {graphLayout.legendSecondary && (
                      <text x={262} y={14} textAnchor="end" fill={graphLayout.secondaryColor} fontSize="8.5" fontFamily="monospace">
                        {graphLayout.legendSecondary}
                      </text>
                    )}

                    {/* Theoretical Curves */}
                    {graphLayout.secondaryCurvePath && (
                      <path
                        d={graphLayout.secondaryCurvePath}
                        fill="none"
                        stroke={graphLayout.secondaryColor || '#38bdf8'}
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                      />
                    )}
                    <path
                      d={graphLayout.curvePath}
                      fill="none"
                      stroke={graphLayout.curveColor}
                      strokeWidth="2.2"
                    />

                    {/* Student-Plotted Quantitative Data Points */}
                    {graphLayout.plottedPoints.map(pt => (
                      <g key={pt.id}>
                        <circle cx={pt.px} cy={pt.py} r={3.6} fill="#f59e0b" stroke="#020806" strokeWidth="1" />
                      </g>
                    ))}

                    {/* Current Live Operating Point */}
                    <circle
                      cx={graphLayout.currentPoint.px}
                      cy={graphLayout.currentPoint.py}
                      r={4.6}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                    />
                  </svg>

                  <div className="flex items-center justify-between text-[10.5px] font-mono">
                    <span className="text-emerald-300">{graphLayout.slopeReadout}</span>
                    <span className="text-amber-300">Plotted: {plottedPoints.length}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 leading-snug">
                    {graphLayout.annotationText}
                  </p>

                  {/* Plot Current Trial Data Point */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={onPlotDataPoint}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Plot Data Point ({plottedPoints.length})</span>
                    </button>
                    {plottedPoints.length > 0 && (
                      <button
                        onClick={onClearPoints}
                        aria-label="Clear plotted points"
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Second-Law Audit Box */}
                <div
                  className={`rounded-xl p-2.5 border ${
                    evaluation.isUnbalanced
                      ? 'bg-rose-950/35 border-rose-500/35'
                      : 'bg-emerald-950/35 border-emerald-500/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[11px] font-bold ${
                        evaluation.isUnbalanced ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {evaluation.verdictHeadline}
                    </span>
                    <MathFormula formulaKey="sim-newton25" className="text-slate-200 text-[10.5px] shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    {evaluation.verdictDetail}
                  </p>
                </div>

                {/* Active Forces Breakdown */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-200">
                    System Forces (External vs. Internal)
                  </div>
                  {evaluation.forces.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-[11px] font-mono bg-white/[0.02] rounded-lg px-2 py-1"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold shrink-0" style={{ color: f.color }}>
                          {f.label}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">{f.agent}</span>
                      </div>
                      <span className="text-slate-100 font-semibold tabular-nums shrink-0">
                        {f.mag.toFixed(1)} N
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: SKILL 2.B — LOGICAL UNKNOWN-QUANTITY SOLVER              */}
            {/* =============================================================== */}
            {activeTab === 'calc' && (
              <div className="space-y-2.5">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300">
                      Skill 2.B · Computational Pathway
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Step-by-step derivation with SI units
                    </div>
                  </div>
                  <MathFormula formulaKey="sim-newton25-full" className="text-emerald-200 text-[11px]" />
                </div>

                {evaluation.calcSteps.map((st, i) => (
                  <div
                    key={i}
                    className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-200">{st.label}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-300 tabular-nums shrink-0">
                        {st.result}
                      </span>
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-400 leading-snug">
                      {st.expression}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: SKILL 2.D — FUNCTIONAL DEPENDENCE & SCALING PREDICTOR    */}
            {/* =============================================================== */}
            {activeTab === 'scale' && (
              <div className="space-y-3">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-300">
                      Skill 2.D · Factor-of-Change Predictor
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">a ∝ F_net / m</span>
                  </div>

                  {/* Force Multiplier */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Scale Net Force (k_F)</span>
                      <span className="font-mono text-rose-300 font-bold">{forceFactor}×</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {SCALE_FACTORS.map(k => (
                        <button
                          key={`f-${k}`}
                          onClick={() => setForceFactor(k)}
                          className={`py-1 rounded-lg font-mono text-[11px] font-semibold border transition cursor-pointer ${
                            forceFactor === k
                              ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                              : 'bg-[#071611] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {k}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mass Multiplier */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Scale System Mass (k_m)</span>
                      <span className="font-mono text-amber-300 font-bold">{massFactor}×</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {SCALE_FACTORS.map(k => (
                        <button
                          key={`m-${k}`}
                          onClick={() => setMassFactor(k)}
                          className={`py-1 rounded-lg font-mono text-[11px] font-semibold border transition cursor-pointer ${
                            massFactor === k
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                              : 'bg-[#071611] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {k}×
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prediction Output */}
                  <div className="bg-emerald-950/35 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Acceleration Multiplier (k_F / k_m)</span>
                      <span className="font-mono font-bold text-emerald-300 text-sm tabular-nums">
                        {scaling.accelFactor.toFixed(2)}×
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono pt-1 border-t border-emerald-500/20">
                      <div>
                        <div className="text-slate-400">Baseline</div>
                        <div className="text-slate-200">F = {scaling.baseFNetN.toFixed(1)} N</div>
                        <div className="text-slate-200">m = {scaling.baseMassKg.toFixed(1)} kg</div>
                        <div className="text-sky-300 font-bold">a = {scaling.baseAccelMs2.toFixed(2)} m/s²</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Predicted</div>
                        <div className="text-rose-300">F’ = {scaling.predictedFNetN.toFixed(1)} N</div>
                        <div className="text-amber-300">m’ = {scaling.predictedMassKg.toFixed(1)} kg</div>
                        <div className="text-emerald-300 font-bold">a’ = {scaling.predictedAccelMs2.toFixed(2)} m/s²</div>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-snug pt-1">
                      {scaling.summaryText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: SKILL 3.A — EXPERIMENTAL PROCEDURE DESIGNER              */}
            {/* =============================================================== */}
            {activeTab === 'lab' && (
              <div className="space-y-2.5">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300">
                      Skill 3.A · AP Lab Procedure Design
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Design a valid Newton’s 2nd Law experiment
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-300">
                    {procedureCorrectCount} / {EXPERIMENTAL_PROCEDURE_3A.length}
                  </span>
                </div>

                {EXPERIMENTAL_PROCEDURE_3A.map(step => {
                  const chosen = procedureAnswers[step.id];
                  const selectedOpt = step.options.find(o => o.id === chosen);
                  return (
                    <div
                      key={step.id}
                      className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="text-[11px] font-semibold text-slate-100 leading-snug">
                        {step.prompt}
                      </div>
                      <div className="space-y-1.5">
                        {step.options.map(opt => {
                          const isSelected = chosen === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                setProcedureAnswers(prev => ({ ...prev, [step.id]: opt.id }))
                              }
                              className={`w-full text-left p-2 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${
                                isSelected
                                  ? opt.correct
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                                    : 'bg-rose-500/20 border-rose-400 text-rose-100'
                                  : 'bg-[#071611] border-white/10 text-slate-300 hover:border-emerald-400/40'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {selectedOpt && (
                        <div
                          className={`text-[10.5px] p-2 rounded-lg border leading-snug flex items-start gap-1.5 ${
                            selectedOpt.correct
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                              : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                          }`}
                        >
                          {selectedOpt.correct ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                          )}
                          <span>{selectedOpt.feedback}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 5: SKILL 3.C — CLAIM JUSTIFICATION CHECK                    */}
            {/* =============================================================== */}
            {activeTab === 'claims' && (
              <div className="space-y-2.5">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300">
                      Skill 3.C · AP Claim Justification
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Evaluate claims using EK 2.5.A.1–2.5.A.3
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-300">
                    {verifiedClaimCount} / {AP_CLAIMS_25.length} Verified
                  </span>
                </div>

                {AP_CLAIMS_25.map(claim => {
                  const ans = claimAnswers[claim.id];
                  const isCorrect = ans === claim.verdict;
                  return (
                    <div
                      key={claim.id}
                      className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                        <span>EK {claim.ekCode}</span>
                        {ans && (
                          <span className={isCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                            {isCorrect ? 'Verified' : 'Check Reasoning'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-100 leading-snug">{claim.statement}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['true', 'false'] as const).map(choice => (
                          <button
                            key={choice}
                            onClick={() =>
                              setClaimAnswers(prev => ({ ...prev, [claim.id]: choice }))
                            }
                            className={`py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                              ans === choice
                                ? choice === claim.verdict
                                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                                  : 'bg-rose-500/25 border-rose-400 text-rose-100'
                                : 'bg-[#071611] border-white/10 text-slate-300 hover:border-emerald-400/40'
                            }`}
                          >
                            {choice === 'true' ? 'Supported (True)' : 'Refuted (False)'}
                          </button>
                        ))}
                      </div>
                      {ans && (
                        <div className="text-[10.5px] text-slate-300 bg-white/[0.03] border border-white/10 rounded-lg p-2 leading-snug">
                          {claim.evidence}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
