'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Sigma,
  GitCompareArrows,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  Resistive29Params,
  Resistive29Evaluation,
  ResistiveChartKind,
  ResistiveTrialPoint,
  buildResistiveChartData,
  buildDerivationSteps29,
  buildComparisonRows29,
  COMPARISON_CHALLENGES_29,
  LAB_PROCEDURES_29,
  CLAIM_CARDS_29,
} from '@/lib/physics/resistive-2-9';

export type Resistive29Tab = '1B' | '2A' | '2C' | '3A' | '3C';

interface Resistive29AnalysisPanelProps {
  params: Resistive29Params;
  evaluation: Resistive29Evaluation;
  activeTab: Resistive29Tab;
  onChangeTab: (tab: Resistive29Tab) => void;
  trials: ResistiveTrialPoint[];
  onPlotCurrentTrial: () => void;
  onClearTrials: () => void;
  onSwitchToDualCompare: () => void;
}

export const Resistive29AnalysisPanel: React.FC<Resistive29AnalysisPanelProps> = ({
  params,
  evaluation,
  activeTab,
  onChangeTab,
  trials,
  onPlotCurrentTrial,
  onClearTrials,
  onSwitchToDualCompare,
}) => {
  const [chartKind, setChartKind] = useState<ResistiveChartKind>('v_vs_t');
  const [compAnswers, setCompAnswers] = useState<Record<string, number>>({});
  const [selectedLabIdx, setSelectedLabIdx] = useState<number>(0);
  const [labAnswers, setLabAnswers] = useState<Record<string, number>>({});
  const [claimAnswers, setClaimAnswers] = useState<Record<string, boolean>>({});

  const chart = useMemo(
    () => buildResistiveChartData(params, chartKind),
    [params, chartKind],
  );
  const derivationSteps = useMemo(
    () => buildDerivationSteps29(params, evaluation),
    [params, evaluation],
  );
  const comparison = useMemo(
    () => buildComparisonRows29(params, evaluation),
    [params, evaluation],
  );

  // Filter plotted trials relevant to current mode (or show all if vertical_drop)
  const visibleTrials = useMemo(
    () => trials.filter(tr => tr.mode === params.mode),
    [trials, params.mode],
  );

  // SVG plot geometry
  const W = 304;
  const H = 186;
  const padL = 42;
  const padR = 14;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (val: number) =>
    padL + ((val - chart.xMin) / Math.max(1e-6, chart.xMax - chart.xMin)) * plotW;
  const toY = (val: number) =>
    padT + (1 - (val - chart.yMin) / Math.max(1e-6, chart.yMax - chart.yMin)) * plotH;

  const polylineA = chart.curveA
    .map(pt => `${toX(pt.x).toFixed(1)},${toY(pt.y).toFixed(1)}`)
    .join(' ');
  const polylineB = chart.curveB
    ? chart.curveB.map(pt => `${toX(pt.x).toFixed(1)},${toY(pt.y).toFixed(1)}`).join(' ')
    : null;

  const verifiedClaims = CLAIM_CARDS_29.filter(
    c => claimAnswers[c.id] === c.isTrue,
  ).length;

  const activeLab = LAB_PROCEDURES_29[selectedLabIdx] ?? LAB_PROCEDURES_29[0];

  const tabs: Array<{ id: Resistive29Tab; label: string; icon: React.ReactNode }> = [
    { id: '1B', label: '1.B', icon: <LineChart className="w-3 h-3" /> },
    { id: '2A', label: '2.A', icon: <Sigma className="w-3 h-3" /> },
    { id: '2C', label: '2.C', icon: <GitCompareArrows className="w-3 h-3" /> },
    { id: '3A', label: '3.A', icon: <FlaskConical className="w-3 h-3" /> },
    { id: '3C', label: '3.C', icon: <CheckCircle2 className="w-3 h-3" /> },
  ];

  return (
    <aside className="fixed right-3 top-[68px] z-20 w-[348px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
      {/* Header + 5 AP Science Practice Tabs */}
      <div className="px-3 pt-2.5 pb-2 border-b border-emerald-500/20 bg-emerald-950/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            AP Science Practices · Topic 2.9
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            LO 2.9.A
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1 bg-slate-950/80 p-1 rounded-xl border border-emerald-500/20">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={`py-1.5 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-200 hover:bg-white/5'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* ================================================================ */}
        {/* TAB 1.B — QUANTITATIVE GRAPHS & TRIAL PLOTTING                   */}
        {/* ================================================================ */}
        {activeTab === '1B' && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Quantitative Graphs &amp; Asymptotes (1.B)
              </div>
              <button
                type="button"
                onClick={onPlotCurrentTrial}
                className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Plot current (t, v, a, s, |Fr|) measurement onto graph"
              >
                <Plus className="w-3 h-3" />
                <span>Plot Point</span>
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'v_vs_t', label: 'v(t)' },
                  { id: 'a_vs_t', label: 'a(t)' },
                  { id: 'x_vs_t', label: 's(t)' },
                  { id: 'fr_vs_v', label: '|Fr|(v)' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChartKind(opt.id)}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                    chartKind === opt.id
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Precision SVG Plot */}
            <div className="rounded-xl bg-[#030a08] border border-emerald-500/20 p-2">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-semibold text-emerald-300">{chart.title}</span>
                {chart.curveB && (
                  <span className="font-mono text-[9px] flex items-center gap-2">
                    <span className="text-emerald-400">● A</span>
                    <span className="text-amber-400">● B</span>
                  </span>
                )}
              </div>

              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto block select-none"
                role="img"
                aria-label={chart.title}
              >
                {/* Horizontal gridlines + Y ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                  const yVal = chart.yMin + (chart.yMax - chart.yMin) * frac;
                  const py = toY(yVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={padL}
                        y1={py}
                        x2={W - padR}
                        y2={py}
                        stroke="rgba(148,163,184,0.14)"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 5}
                        y={py + 3}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="ui-monospace, monospace"
                      >
                        {yVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* X ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                  const xVal = chart.xMin + (chart.xMax - chart.xMin) * frac;
                  const px = toX(xVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={px}
                        y1={padT}
                        x2={px}
                        y2={H - padB}
                        stroke="rgba(148,163,184,0.1)"
                        strokeWidth="1"
                      />
                      <text
                        x={px}
                        y={H - padB + 11}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="ui-monospace, monospace"
                      >
                        {xVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Tau vertical markers */}
                {params.showAsymptotes &&
                  chart.tauMarkers.map(tm => {
                    const px = toX(tm.x);
                    return (
                      <g key={tm.label}>
                        <line
                          x1={px}
                          y1={padT}
                          x2={px}
                          y2={H - padB}
                          stroke="rgba(56,189,248,0.38)"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={px + 2}
                          y={padT + 9}
                          fill="#7dd3fc"
                          fontSize="8"
                          fontFamily="ui-monospace, monospace"
                        >
                          {tm.label}
                        </text>
                      </g>
                    );
                  })}

                {/* Axes */}
                <line
                  x1={padL}
                  y1={H - padB}
                  x2={W - padR}
                  y2={H - padB}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line
                  x1={padL}
                  y1={padT}
                  x2={padL}
                  y2={H - padB}
                  stroke="#475569"
                  strokeWidth="1.2"
                />

                {/* Zero line if yMin < 0 */}
                {chart.yMin < -0.05 && chart.yMax > 0.05 && (
                  <line
                    x1={padL}
                    y1={toY(0)}
                    x2={W - padR}
                    y2={toY(0)}
                    stroke="rgba(226,232,240,0.3)"
                    strokeWidth="1"
                  />
                )}

                {/* Asymptote Line A */}
                {params.showAsymptotes && chart.asymptoteLineA && (
                  <g>
                    <line
                      x1={padL}
                      y1={toY(chart.asymptoteLineA.yStart)}
                      x2={W - padR}
                      y2={toY(chart.asymptoteLineA.yEnd)}
                      stroke="#34d399"
                      strokeWidth="1.3"
                      strokeDasharray="5 3"
                    />
                    <text
                      x={W - padR - 2}
                      y={Math.max(padT + 10, Math.min(H - padB - 4, toY(chart.asymptoteLineA.yEnd) - 4))}
                      textAnchor="end"
                      fill="#6ee7b7"
                      fontSize="8"
                      fontFamily="ui-monospace, monospace"
                    >
                      {chart.asymptoteLineA.label}
                    </text>
                  </g>
                )}

                {/* Asymptote Line B (dual_compare) */}
                {params.showAsymptotes && chart.asymptoteLineB && (
                  <g>
                    <line
                      x1={padL}
                      y1={toY(chart.asymptoteLineB.yStart)}
                      x2={W - padR}
                      y2={toY(chart.asymptoteLineB.yEnd)}
                      stroke="#fbbf24"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={W - padR - 2}
                      y={Math.max(padT + 10, Math.min(H - padB - 4, toY(chart.asymptoteLineB.yEnd) - 4))}
                      textAnchor="end"
                      fill="#fde68a"
                      fontSize="8"
                      fontFamily="ui-monospace, monospace"
                    >
                      {chart.asymptoteLineB.label}
                    </text>
                  </g>
                )}

                {/* Curve B */}
                {polylineB && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.1"
                    points={polylineB}
                  />
                )}

                {/* Curve A */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.3"
                  points={polylineA}
                />

                {/* Plotted Lab Trial Points (Skill 1.B data plotting) */}
                {visibleTrials.map(tr => {
                  const tx = chartKind === 'fr_vs_v' ? tr.velocityMs : tr.timeS;
                  const ty =
                    chartKind === 'v_vs_t'
                      ? tr.velocityMs
                      : chartKind === 'a_vs_t'
                        ? tr.accelMs2
                        : chartKind === 'x_vs_t'
                          ? tr.positionM
                          : tr.dragMagN;
                  if (tx < chart.xMin || tx > chart.xMax || ty < chart.yMin || ty > chart.yMax) {
                    return null;
                  }
                  const px = toX(tx);
                  const py = toY(ty);
                  return (
                    <rect
                      key={tr.id}
                      x={px - 3}
                      y={py - 3}
                      width={6}
                      height={6}
                      transform={`rotate(45 ${px} ${py})`}
                      fill="#38bdf8"
                      stroke="#020617"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Current State Marker B */}
                {chart.currentB && (
                  <circle
                    cx={toX(chart.currentB.x)}
                    cy={toY(chart.currentB.y)}
                    r="4.2"
                    fill="#f59e0b"
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                )}

                {/* Current State Marker A */}
                <circle
                  cx={toX(chart.currentA.x)}
                  cy={toY(chart.currentA.y)}
                  r="4.5"
                  fill="#34d399"
                  stroke="#020617"
                  strokeWidth="1.5"
                />

                {/* Axis Titles */}
                <text
                  x={padL + plotW / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9"
                  fontWeight="600"
                >
                  {chart.xLabel} ({chart.xUnit})
                </text>
                <text
                  x={11}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9"
                  fontWeight="600"
                  transform={`rotate(-90 11 ${padT + plotH / 2})`}
                >
                  {chart.yLabel} ({chart.yUnit})
                </text>
              </svg>

              <div className="mt-1.5 px-2 py-1 rounded-lg bg-emerald-950/35 border border-emerald-500/20 font-mono text-[10px] text-emerald-200 leading-snug">
                {chart.equationCaption}
              </div>
            </div>

            {/* Plotted Trial Data Log */}
            <div className="rounded-xl bg-slate-950/75 border border-white/10 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Plotted Trial Data ({visibleTrials.length})
                </span>
                {visibleTrials.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearTrials}
                    className="text-[10px] text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {visibleTrials.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic">
                  Scrub or play time, then click <strong className="text-sky-300">+ Plot Point</strong> to record data on the graph.
                </div>
              ) : (
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-[10px] font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/10">
                        <th className="text-left py-1">t (s)</th>
                        <th className="text-right py-1">v (m/s)</th>
                        <th className="text-right py-1">a (m/s²)</th>
                        <th className="text-right py-1">|Fr| (N)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visibleTrials.map(tr => (
                        <tr key={tr.id} className="text-slate-200">
                          <td className="py-1 text-sky-300">{tr.timeS.toFixed(2)}</td>
                          <td className="py-1 text-right">{tr.velocityMs.toFixed(2)}</td>
                          <td className="py-1 text-right">{tr.accelMs2.toFixed(2)}</td>
                          <td className="py-1 text-right text-rose-300">{tr.dragMagN.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2.A — SYMBOLIC CALCULUS DERIVATION                           */}
        {/* ================================================================ */}
        {activeTab === '2A' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-white">
              Separation of Variables &amp; Calculus Derivation (2.A)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Follow the AP Physics C calculus pathway from Newton&apos;s Second Law to exact exponential kinematics with live values synced to your sliders.
            </p>
            {derivationSteps.map(step => (
              <div
                key={step.stepNumber}
                className="rounded-xl bg-slate-950/75 border border-emerald-500/20 p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">
                    {step.stepNumber}. {step.title}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    EK {step.ekCode}
                  </span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-[#030a08] border border-white/10 font-mono text-[11px] text-white font-semibold overflow-x-auto">
                  {step.symbolicFormula}
                </div>
                <div className="px-2 py-1 rounded-lg bg-emerald-950/35 border border-emerald-500/20 font-mono text-[10px] text-emerald-200">
                  {step.liveSubstitution}
                </div>
                <p className="text-[10.5px] text-slate-300/90 leading-relaxed">
                  {step.explanation}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2.C — QUANTITATIVE COMPARISON                                */}
        {/* ================================================================ */}
        {activeTab === '2C' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Quantitative Comparison (2.C)
              </div>
              {params.mode !== 'dual_compare' && (
                <button
                  type="button"
                  onClick={onSwitchToDualCompare}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-semibold cursor-pointer"
                >
                  Open Dual Race
                </button>
              )}
            </div>

            {/* Live Comparison Matrix */}
            <div className="rounded-xl bg-slate-950/80 border border-emerald-500/20 overflow-hidden">
              <div className="grid grid-cols-3 bg-emerald-950/40 px-2.5 py-1.5 text-[9.5px] font-mono font-bold border-b border-white/10">
                <span className="text-slate-400">Quantity</span>
                <span className="text-emerald-300 text-right">{comparison.headerA}</span>
                <span className="text-amber-300 text-right">{comparison.headerB}</span>
              </div>
              <div className="divide-y divide-white/5">
                {comparison.rows.map(row => (
                  <div key={row.metric} className="px-2.5 py-1.5 space-y-0.5">
                    <div className="grid grid-cols-3 text-[10.5px] font-mono">
                      <span className="text-slate-300 font-sans text-[10px]">{row.metric}</span>
                      <span className="text-emerald-200 text-right font-semibold">{row.colA}</span>
                      <span className="text-amber-200 text-right font-semibold">{row.colB}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-mono">
                      ↳ {row.ratioOrNote}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Skill 2.C AP Ranking Checks */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                AP 2.C Quick Comparison Checks
              </div>
              {COMPARISON_CHALLENGES_29.map((ch, idx) => {
                const chosen = compAnswers[ch.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === ch.correctIndex;
                return (
                  <div
                    key={ch.id}
                    className="rounded-xl bg-slate-950/75 border border-white/10 p-2.5 space-y-2"
                  >
                    <div className="text-[11px] text-slate-100 leading-snug font-medium">
                      <span className="text-emerald-400 font-mono mr-1">Q{idx + 1}.</span>
                      {ch.prompt}
                    </div>
                    <div className="space-y-1">
                      {ch.options.map((opt, optIdx) => {
                        let cls =
                          'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-300';
                        if (answered) {
                          if (optIdx === ch.correctIndex) {
                            cls = 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200';
                          } else if (optIdx === chosen) {
                            cls = 'bg-rose-500/20 border-rose-400/50 text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() =>
                              setCompAnswers(prev => ({ ...prev, [ch.id]: optIdx }))
                            }
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] transition cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div
                        className={`p-2 rounded-lg text-[10.5px] leading-relaxed border ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                            : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <strong className="font-mono">[{ch.ekCode}]</strong> {ch.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3.A — EXPERIMENTAL PROCEDURE DESIGNER                        */}
        {/* ================================================================ */}
        {activeTab === '3A' && (
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-white">
              Experimental Procedure Designer (3.A)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {LAB_PROCEDURES_29.map((lab, idx) => (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setSelectedLabIdx(idx)}
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-semibold text-left transition cursor-pointer ${
                    selectedLabIdx === idx
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-slate-950/70 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {idx === 0 ? 'Lab 1: Coffee Filters (k)' : 'Lab 2: Damped Glider (τ)'}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-emerald-500/20 p-3 space-y-2.5">
              <div className="font-bold text-emerald-300 text-xs">{activeLab.title}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">{activeLab.objective}</p>

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Required Apparatus
                </div>
                <ul className="space-y-1 text-[10.5px] text-slate-200">
                  {activeLab.equipment.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-semibold text-white leading-snug">
                  {activeLab.question}
                </div>
                <div className="space-y-1.5">
                  {activeLab.options.map((opt, optIdx) => {
                    const chosen = labAnswers[activeLab.id];
                    const answered = chosen !== undefined;
                    let cls =
                      'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-300';
                    if (answered) {
                      if (optIdx === activeLab.correctIndex) {
                        cls = 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200';
                      } else if (optIdx === chosen) {
                        cls = 'bg-rose-500/20 border-rose-400/50 text-rose-200';
                      }
                    }
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setLabAnswers(prev => ({ ...prev, [activeLab.id]: optIdx }))
                        }
                        className={`w-full text-left px-2.5 py-2 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {labAnswers[activeLab.id] !== undefined && (
                  <div className="space-y-1.5 pt-1">
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#030a08] border border-emerald-500/30 font-mono text-[10.5px] text-emerald-300 font-semibold">
                      {activeLab.linearizationFormula}
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed">
                      {activeLab.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3.C — EVIDENCE-BASED AP CLAIMS                               */}
        {/* ================================================================ */}
        {activeTab === '3C' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Evidence-Based Claims (3.C)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-300 font-bold">
                  {verifiedClaims}/{CLAIM_CARDS_29.length} Verified
                </span>
                {Object.keys(claimAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClaimAnswers({})}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                    title="Reset claim checks"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {CLAIM_CARDS_29.map(card => {
              const chosen = claimAnswers[card.id];
              const answered = chosen !== undefined;
              const isCorrect = chosen === card.isTrue;
              return (
                <div
                  key={card.id}
                  className="rounded-xl bg-slate-950/75 border border-white/10 p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      EK {card.ekCode}
                    </span>
                    {answered && (
                      <span
                        className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                          isCorrect ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Review</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-100 leading-snug">{card.statement}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([true, false] as const).map(val => {
                      let btnCls =
                        'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 text-slate-300';
                      if (answered) {
                        if (val === card.isTrue) {
                          btnCls = 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200';
                        } else if (val === chosen) {
                          btnCls = 'bg-rose-500/25 border-rose-400/60 text-rose-200';
                        }
                      }
                      return (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() =>
                            setClaimAnswers(prev => ({ ...prev, [card.id]: val }))
                          }
                          className={`py-1 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${btnCls}`}
                        >
                          {val ? 'True' : 'False'}
                        </button>
                      );
                    })}
                  </div>
                  {answered && (
                    <p className="text-[10.5px] text-slate-300 leading-relaxed pt-1 border-t border-white/10">
                      {card.justification}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
