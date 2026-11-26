'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  AP_CLAIMS_28,
  SCALING_SCENARIOS_28,
  SpringChartKind28,
  SpringLabTrial,
  Springs28Evaluation,
  Springs28Params,
  buildSpringChart28,
  solveSpringCalculation28,
} from '@/lib/physics/springs-2-8';

export interface Springs28AnalysisPanelProps {
  params: Springs28Params;
  evaluation: Springs28Evaluation;
  labTrials: SpringLabTrial[];
  onRecordTrial: () => void;
  onResetTrials: () => void;
}

type SkillTab = '1A' | '2B' | '2D' | '3C';

export const Springs28AnalysisPanel: React.FC<Springs28AnalysisPanelProps> = ({
  params,
  evaluation,
  labTrials,
  onRecordTrial,
  onResetTrials,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<SkillTab>('1A');
  const [chartOverride, setChartOverride] = useState<SpringChartKind28 | null>(null);
  const [selectedScalingAnswers, setSelectedScalingAnswers] = useState<Record<string, number>>({});
  const [claimAnswers, setClaimAnswers] = useState<Record<string, 'true' | 'false'>>({});

  // Derive default chart from mode without calling setState inside useEffect
  const defaultChartKind: SpringChartKind28 =
    params.mode === 'series_springs' || params.mode === 'parallel_springs'
      ? 'series_vs_parallel'
      : 'fs_vs_dx';
  const chartKind: SpringChartKind28 = chartOverride ?? defaultChartKind;

  const chartSpec = useMemo(
    () => buildSpringChart28(params, evaluation, chartKind, labTrials),
    [params, evaluation, chartKind, labTrials]
  );

  const calculation = useMemo(
    () => solveSpringCalculation28(params, evaluation),
    [params, evaluation]
  );

  // SVG chart geometry helpers
  const svgW = 312;
  const svgH = 178;
  const padL = 42;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const mapX = (x: number) =>
    padL + ((x - chartSpec.xMin) / Math.max(1e-6, chartSpec.xMax - chartSpec.xMin)) * plotW;
  const mapY = (y: number) =>
    padT + (1 - (y - chartSpec.yMin) / Math.max(1e-6, chartSpec.yMax - chartSpec.yMin)) * plotH;

  const zeroX =
    chartSpec.xMin < 0 && chartSpec.xMax > 0 ? mapX(0) : null;
  const zeroY =
    chartSpec.yMin < 0 && chartSpec.yMax > 0 ? mapY(0) : null;

  const verifiedClaimsCount = AP_CLAIMS_28.filter(
    c => claimAnswers[c.id] === c.verdict
  ).length;

  const verifiedScalingCount = SCALING_SCENARIOS_28.filter(
    s => selectedScalingAnswers[s.id] === s.correctIndex
  ).length;

  const activeCombo =
    params.mode === 'series_springs'
      ? evaluation.series
      : params.mode === 'parallel_springs'
        ? evaluation.parallel
        : null;

  return (
    <aside
      aria-label="AP Physics C Analysis Dock"
      className="fixed top-[68px] right-3 z-20 w-[348px] max-w-[calc(100vw-24px)] bg-[#071510]/95 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-84px)] overflow-hidden"
    >
      {/* Dock Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
        className="w-full px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-500/20 hover:bg-emerald-500/5 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-white">AP 2.8 Practices (1.A · 2.B · 2.D · 3.C)</span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* 4 Suggested Science Practice Tabs */}
          <div className="grid grid-cols-4 gap-1 p-2 border-b border-emerald-500/15 bg-[#040d0a]/80">
            {(
              [
                { id: '1A', label: '1.A', sub: 'Graph', icon: <BarChart3 className="w-3 h-3" /> },
                { id: '2B', label: '2.B', sub: 'Calc', icon: <Calculator className="w-3 h-3" /> },
                { id: '2D', label: '2.D', sub: 'Scale', icon: <TrendingUp className="w-3 h-3" /> },
                { id: '3C', label: '3.C', sub: 'Claims', icon: <ShieldCheck className="w-3 h-3" /> },
              ] as const
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition cursor-pointer ${
                    active
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                      : 'bg-[#071510] text-slate-300 border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] leading-none whitespace-nowrap">
                    {tab.icon}
                    <span>{tab.label}</span>
                  </div>
                  <div
                    className={`text-[9px] font-mono mt-0.5 leading-none ${
                      active ? 'text-slate-900/80' : 'text-slate-400'
                    }`}
                  >
                    {tab.sub}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 overflow-y-auto space-y-3 text-xs">
            {/* ============================================================= */}
            {/* TAB 1.A — DIAGRAMS, CHARTS & SCHEMATIC SPRING TABLES          */}
            {/* ============================================================= */}
            {activeTab === '1A' && (
              <div className="space-y-2.5">
                {/* Chart Selector Toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setChartOverride('fs_vs_dx')}
                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                      chartKind === 'fs_vs_dx'
                        ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    F_s vs. Δx (Hooke)
                  </button>
                  <button
                    onClick={() => setChartOverride('series_vs_parallel')}
                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                      chartKind === 'series_vs_parallel'
                        ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Series vs. Parallel
                  </button>
                </div>

                {/* SVG Quantitative Graph */}
                <div className="p-2.5 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-300 truncate">
                      {chartSpec.title}
                    </span>
                    {chartKind === 'fs_vs_dx' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={onRecordTrial}
                          className="px-1.5 py-0.5 rounded-md bg-sky-400/20 hover:bg-sky-400/30 border border-sky-400/40 text-sky-200 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="w-3 h-3" /> Plot
                        </button>
                        <button
                          onClick={onResetTrials}
                          aria-label="Reset plotted trials"
                          className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto block select-none"
                    role="img"
                    aria-label={chartSpec.title}
                  >
                    {/* Plot background */}
                    <rect
                      x={padL}
                      y={padT}
                      width={plotW}
                      height={plotH}
                      fill="#06120e"
                      stroke="rgba(16,185,129,0.25)"
                      strokeWidth={1}
                    />

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(frac => (
                      <React.Fragment key={frac}>
                        <line
                          x1={padL + frac * plotW}
                          y1={padT}
                          x2={padL + frac * plotW}
                          y2={padT + plotH}
                          stroke="rgba(148,163,184,0.12)"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1={padL}
                          y1={padT + frac * plotH}
                          x2={padL + plotW}
                          y2={padT + frac * plotH}
                          stroke="rgba(148,163,184,0.12)"
                          strokeDasharray="3 3"
                        />
                      </React.Fragment>
                    ))}

                    {/* Zero Axes */}
                    {zeroX !== null && (
                      <line
                        x1={zeroX}
                        y1={padT}
                        x2={zeroX}
                        y2={padT + plotH}
                        stroke="rgba(148,163,184,0.45)"
                        strokeWidth={1.2}
                      />
                    )}
                    {zeroY !== null && (
                      <line
                        x1={padL}
                        y1={zeroY}
                        x2={padL + plotW}
                        y2={zeroY}
                        stroke="rgba(148,163,184,0.45)"
                        strokeWidth={1.2}
                      />
                    )}

                    {/* Series Polylines */}
                    {chartSpec.series.map(s => {
                      const d = s.points
                        .map(
                          (pt, i) =>
                            `${i === 0 ? 'M' : 'L'} ${mapX(pt.x).toFixed(1)} ${mapY(pt.y).toFixed(1)}`
                        )
                        .join(' ');
                      return (
                        <path
                          key={s.label}
                          d={d}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={s.dashed ? 1.6 : 2.3}
                          strokeDasharray={s.dashed ? '4 3' : undefined}
                        />
                      );
                    })}

                    {/* Recorded Lab Trial Scatter Points */}
                    {chartSpec.scatterPoints?.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={mapX(pt.x)}
                        cy={mapY(pt.y)}
                        r={3.2}
                        fill={pt.color}
                        stroke="#040d0a"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Current Live Operating Marker */}
                    <circle
                      cx={mapX(chartSpec.markerX)}
                      cy={mapY(chartSpec.markerY)}
                      r={4.8}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />

                    {/* Axis Tick Bounds */}
                    <text
                      x={padL - 5}
                      y={padT + 8}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {chartSpec.yMax.toFixed(0)}
                    </text>
                    <text
                      x={padL - 5}
                      y={padT + plotH}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {chartSpec.yMin.toFixed(0)}
                    </text>
                    <text
                      x={padL}
                      y={padT + plotH + 12}
                      textAnchor="start"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {chartSpec.xMin.toFixed(1)}
                    </text>
                    <text
                      x={padL + plotW}
                      y={padT + plotH + 12}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {chartSpec.xMax.toFixed(1)}
                    </text>

                    {/* Axis Labels */}
                    <text
                      x={padL + plotW / 2}
                      y={svgH - 4}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {chartSpec.xAxisLabel}
                    </text>
                    <text
                      x={11}
                      y={padT + plotH / 2}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="9.5"
                      fontFamily="monospace"
                      transform={`rotate(-90 11 ${padT + plotH / 2})`}
                    >
                      {chartSpec.yAxisLabel}
                    </text>
                  </svg>

                  {/* Series Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono">
                    {chartSpec.series.map(s => (
                      <span key={s.label} className="flex items-center gap-1 text-slate-300">
                        <span
                          className="inline-block w-2.5 h-0.5 rounded"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.label}
                      </span>
                    ))}
                  </div>

                  {/* Chart Physical Insight Notes */}
                  <div className="space-y-1 pt-1 border-t border-white/10 text-[10.5px] text-slate-300 leading-snug">
                    {chartSpec.notes.map((n, i) => (
                      <p key={i}>• {n}</p>
                    ))}
                  </div>
                </div>

                {/* Live Schematic Breakdown Table (Series & Parallel modes) */}
                {activeCombo && (
                  <div className="p-2.5 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                    <div className="text-[10.5px] font-bold text-emerald-300 uppercase tracking-wider font-mono">
                      {activeCombo.arrangement === 'series'
                        ? 'Series Table · Equal F, Stretches Add'
                        : 'Parallel Table · Equal Δx, Forces Add'}
                    </div>
                    <table className="w-full text-[10.5px] font-mono tabular-nums">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/10">
                          <th className="py-1 text-left font-medium">Spring</th>
                          <th className="py-1 text-right font-medium">k (N/m)</th>
                          <th className="py-1 text-right font-medium">F (N)</th>
                          <th className="py-1 text-right font-medium">Δx (m)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCombo.springs.map(sp => (
                          <tr key={sp.label} className="border-b border-white/5 text-slate-200">
                            <td className="py-1 font-bold text-sky-300">{sp.label}</td>
                            <td className="py-1 text-right">{sp.kNm.toFixed(0)}</td>
                            <td className="py-1 text-right">{sp.forceN.toFixed(1)}</td>
                            <td className="py-1 text-right">{sp.stretchM.toFixed(3)}</td>
                          </tr>
                        ))}
                        <tr className="text-emerald-300 font-bold bg-emerald-500/10">
                          <td className="py-1.5 pl-1">k_eq</td>
                          <td className="py-1.5 text-right">{activeCombo.kEqNm.toFixed(1)}</td>
                          <td className="py-1.5 text-right">
                            {activeCombo.currentTotalForceN.toFixed(1)}
                          </td>
                          <td className="py-1.5 pr-1 text-right">
                            {activeCombo.currentStretchM.toFixed(3)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Compact Live Telemetry Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {params.mode === 'hookes_restoring' && (
                    <>
                      <MetricBox
                        label="Restoring F_s"
                        value={`${evaluation.hookes.springForceN >= 0 ? '+' : ''}${evaluation.hookes.springForceN.toFixed(1)} N`}
                        tone="emerald"
                      />
                      <MetricBox
                        label="Displacement Δx"
                        value={`${evaluation.hookes.displacementM >= 0 ? '+' : ''}${evaluation.hookes.displacementM.toFixed(3)} m`}
                        tone="sky"
                      />
                      <MetricBox
                        label="Accel a_x"
                        value={`${evaluation.hookes.accelMs2 >= 0 ? '+' : ''}${evaluation.hookes.accelMs2.toFixed(2)} m/s²`}
                        tone="amber"
                      />
                      <MetricBox
                        label="Stored U_s"
                        value={`${evaluation.hookes.potentialEnergyJ.toFixed(2)} J`}
                        tone="slate"
                      />
                    </>
                  )}
                  {params.mode === 'vertical_equilibrium' && (
                    <>
                      <MetricBox
                        label="Eq. Stretch Δy_eq"
                        value={`${evaluation.vertical.equilibriumStretchM.toFixed(3)} m`}
                        tone="emerald"
                      />
                      <MetricBox
                        label="Net Force F_net"
                        value={`${evaluation.vertical.netForceUpN >= 0 ? '+' : ''}${evaluation.vertical.netForceUpN.toFixed(1)} N`}
                        tone="rose"
                      />
                      <MetricBox
                        label="Spring Up F_s"
                        value={`${evaluation.vertical.springForceUpN.toFixed(1)} N`}
                        tone="sky"
                      />
                      <MetricBox
                        label="Period T"
                        value={`${evaluation.vertical.periodS.toFixed(2)} s`}
                        tone="amber"
                      />
                    </>
                  )}
                  {activeCombo && (
                    <>
                      <MetricBox
                        label="Equivalent k_eq"
                        value={`${activeCombo.kEqNm.toFixed(1)} N/m`}
                        tone="emerald"
                      />
                      <MetricBox
                        label="Total Δx"
                        value={`${activeCombo.currentStretchM.toFixed(3)} m`}
                        tone="sky"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2.B — LIVE QUANTITATIVE CALCULATION PATHWAY WITH UNITS    */}
            {/* ============================================================= */}
            {activeTab === '2B' && (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-300">{calculation.title}</div>
                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                    {calculation.givens.map((g, i) => (
                      <div key={i}>• {g}</div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {calculation.steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#040d0a] border border-white/10 space-y-1"
                    >
                      <div className="text-[10.5px] font-bold text-sky-300">{st.label}</div>
                      <div className="text-[10.5px] font-mono text-slate-200 leading-relaxed break-words">
                        {st.calculation}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                    Final Verified Result
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {calculation.finalAnswer}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2.D — FUNCTIONAL DEPENDENCE & SCALING PREDICTIONS         */}
            {/* ============================================================= */}
            {activeTab === '2D' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-bold text-emerald-300">
                    Skill 2.D · Factor-of-Change Predictor
                  </span>
                  <span className="font-mono text-amber-300">
                    Solved {verifiedScalingCount}/{SCALING_SCENARIOS_28.length}
                  </span>
                </div>

                {SCALING_SCENARIOS_28.map(sc => {
                  const chosen = selectedScalingAnswers[sc.id];
                  const answered = chosen !== undefined;
                  const isCorrect = chosen === sc.correctIndex;
                  return (
                    <div
                      key={sc.id}
                      className="p-2.5 rounded-xl bg-[#040d0a] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          EK {sc.ekCode}
                        </span>
                        {answered && (
                          <span
                            className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                              isCorrect ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> Try Again
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-200 leading-snug">{sc.prompt}</p>

                      <div className="space-y-1">
                        {sc.options.map((opt, idx) => {
                          const isPicked = chosen === idx;
                          const isRightOpt = idx === sc.correctIndex;
                          let cls =
                            'bg-[#071510] border-white/10 text-slate-300 hover:border-emerald-400/50';
                          if (isPicked && isRightOpt) {
                            cls = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold';
                          } else if (isPicked && !isRightOpt) {
                            cls = 'bg-rose-500/20 border-rose-400 text-rose-200 font-semibold';
                          }
                          return (
                            <button
                              key={idx}
                              onClick={() =>
                                setSelectedScalingAnswers(prev => ({ ...prev, [sc.id]: idx }))
                              }
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] transition cursor-pointer ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                          <div className="text-[10px] font-mono font-bold text-emerald-300">
                            {sc.factorSummary}
                          </div>
                          <p className="text-[10.5px] text-slate-300 leading-snug">
                            {sc.derivation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3.C — EVIDENCE-BASED AP CLAIMS (TRUE / FALSE)             */}
            {/* ============================================================= */}
            {activeTab === '3C' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-bold text-emerald-300">
                    Skill 3.C · Justify Claims with Laws
                  </span>
                  <span className="font-mono text-emerald-300">
                    Verified {verifiedClaimsCount}/{AP_CLAIMS_28.length}
                  </span>
                </div>

                {AP_CLAIMS_28.map(claim => {
                  const picked = claimAnswers[claim.id];
                  const answered = picked !== undefined;
                  const correct = picked === claim.verdict;
                  return (
                    <div
                      key={claim.id}
                      className="p-2.5 rounded-xl bg-[#040d0a] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-sky-300">
                          EK {claim.ekCode}
                        </span>
                        {answered && (
                          <span
                            className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                              correct ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {correct ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> Check Evidence
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-200 leading-snug">{claim.statement}</p>

                      <div className="grid grid-cols-2 gap-1.5">
                        {(['true', 'false'] as const).map(val => {
                          const isSelected = picked === val;
                          const isRightVal = val === claim.verdict;
                          let cls =
                            'bg-[#071510] border-white/10 text-slate-300 hover:border-emerald-400/50';
                          if (isSelected && isRightVal) {
                            cls = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold';
                          } else if (isSelected && !isRightVal) {
                            cls = 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold';
                          }
                          return (
                            <button
                              key={val}
                              onClick={() =>
                                setClaimAnswers(prev => ({ ...prev, [claim.id]: val }))
                              }
                              className={`py-1.5 rounded-lg border text-[10.5px] uppercase tracking-wider font-mono transition cursor-pointer ${cls}`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <p className="text-[10.5px] text-slate-300 leading-snug pt-1 border-t border-white/10">
                          {claim.justification}
                        </p>
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

function MetricBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate';
}) {
  const valueCls =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'sky'
        ? 'text-sky-300'
        : tone === 'amber'
          ? 'text-amber-300'
          : tone === 'rose'
            ? 'text-rose-300'
            : 'text-slate-200';
  return (
    <div className="p-2 rounded-xl bg-[#040d0a] border border-white/10">
      <div className="text-[9.5px] text-slate-400 font-mono truncate">{label}</div>
      <div className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${valueCls}`}>{value}</div>
    </div>
  );
}

export default Springs28AnalysisPanel;
