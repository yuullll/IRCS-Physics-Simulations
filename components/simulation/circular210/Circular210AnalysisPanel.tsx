'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Sigma,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  Circular210Evaluation,
  Circular210Params,
  CircularChartKind,
  CircularTrialPoint,
  buildCircularChartData210,
  buildDerivationSteps210,
  buildScalingRows210,
  getChartTabLabels210,
  SCALING_CHALLENGES_210,
  CLAIM_CARDS_210,
} from '@/lib/physics/circular-motion-2-10';

export type Circular210Tab = '1A' | '2A' | '2D' | '3C';

interface Circular210AnalysisPanelProps {
  params: Circular210Params;
  evaluation: Circular210Evaluation;
  activeTab: Circular210Tab;
  onChangeTab: (tab: Circular210Tab) => void;
  trials: CircularTrialPoint[];
  onPlotCurrentTrial: () => void;
  onClearTrials: () => void;
}

export const Circular210AnalysisPanel: React.FC<Circular210AnalysisPanelProps> = ({
  params,
  evaluation,
  activeTab,
  onChangeTab,
  trials,
  onPlotCurrentTrial,
  onClearTrials,
}) => {
  const [chartKind, setChartKind] = useState<CircularChartKind>('primary');
  const [scalingAnswers, setScalingAnswers] = useState<Record<string, number>>({});
  const [claimAnswers, setClaimAnswers] = useState<Record<string, boolean>>({});

  const chartTabs = useMemo(() => getChartTabLabels210(params.mode), [params.mode]);
  const chart = useMemo(
    () => buildCircularChartData210(params, evaluation, chartKind),
    [params, evaluation, chartKind],
  );
  const derivationSteps = useMemo(
    () => buildDerivationSteps210(params, evaluation),
    [params, evaluation],
  );
  const scalingRows = useMemo(() => buildScalingRows210(params.mode), [params.mode]);

  const visibleTrials = useMemo(
    () => trials.filter(tr => tr.mode === params.mode),
    [trials, params.mode],
  );

  // SVG plot geometry
  const W = 308;
  const H = 188;
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

  const clampPx = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const polylineA = chart.curveA
    .map(pt => `${toX(pt.x).toFixed(1)},${clampPx(toY(pt.y), padT, H - padB).toFixed(1)}`)
    .join(' ');
  const polylineB = chart.curveB
    ? chart.curveB
        .map(pt => `${toX(pt.x).toFixed(1)},${clampPx(toY(pt.y), padT, H - padB).toFixed(1)}`)
        .join(' ')
    : null;

  const verifiedScaling = SCALING_CHALLENGES_210.filter(
    c => scalingAnswers[c.id] === c.correctIndex,
  ).length;
  const verifiedClaims = CLAIM_CARDS_210.filter(
    c => claimAnswers[c.id] === c.isTrue,
  ).length;

  const tabs: Array<{ id: Circular210Tab; label: string; icon: React.ReactNode }> = [
    { id: '1A', label: '1.A', icon: <LineChart className="w-3 h-3" /> },
    { id: '2A', label: '2.A', icon: <Sigma className="w-3 h-3" /> },
    { id: '2D', label: '2.D', icon: <TrendingUp className="w-3 h-3" /> },
    { id: '3C', label: '3.C', icon: <CheckCircle2 className="w-3 h-3" /> },
  ];

  const getTrialXY = (tr: CircularTrialPoint) => {
    if (chartKind === 'primary') return { x: tr.xPrimary, y: tr.yPrimary };
    if (chartKind === 'secondary') return { x: tr.xSecondary, y: tr.ySecondary };
    return { x: tr.xTertiary, y: tr.yTertiary };
  };

  return (
    <aside className="fixed right-3 top-[68px] z-20 w-[348px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
      {/* Header + 4 AP Science Practice Tabs (CED p. 58: 1.A, 2.A, 2.D, 3.C) */}
      <div className="px-3 pt-2.5 pb-2 border-b border-emerald-500/20 bg-emerald-950/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            AP Science Practices · Topic 2.10
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            LO 2.10.A &amp; 2.10.B
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-xl border border-emerald-500/20">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={`py-1.5 rounded-lg text-[10.5px] font-mono font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
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
        {/* TAB 1.A — QUALITATIVE & MODEL GRAPHS                             */}
        {/* ================================================================ */}
        {activeTab === '1A' && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Model &amp; Qualitative Graphs (1.A)
              </div>
              <button
                type="button"
                onClick={onPlotCurrentTrial}
                className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Plot current state onto graph"
              >
                <Plus className="w-3 h-3" />
                <span>Plot Point</span>
              </button>
            </div>

            {/* 3 Chart Selectors tailored to current mode */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10">
              {chartTabs.map(opt => (
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
              <div className="flex items-center justify-between text-[10px] mb-1 gap-1">
                <span className="font-semibold text-emerald-300 truncate">{chart.title}</span>
                {chart.curveBLabel && (
                  <span className="font-mono text-[8.5px] text-amber-300 shrink-0">
                    - - {chart.curveBLabel}
                  </span>
                )}
              </div>

              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto block select-none"
                role="img"
                aria-label={chart.title}
              >
                {/* Y Gridlines & Ticks */}
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
                        {Math.abs(yVal) >= 100 ? yVal.toFixed(0) : yVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* X Gridlines & Ticks */}
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
                        {Math.abs(xVal) >= 100 ? xVal.toFixed(0) : xVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Axes border */}
                <line
                  x1={padL}
                  y1={padT}
                  x2={padL}
                  y2={H - padB}
                  stroke="rgba(16,185,129,0.45)"
                  strokeWidth="1.2"
                />
                <line
                  x1={padL}
                  y1={H - padB}
                  x2={W - padR}
                  y2={H - padB}
                  stroke="rgba(16,185,129,0.45)"
                  strokeWidth="1.2"
                />

                {/* Reference / Critical Threshold Lines */}
                {chart.refLines.map((ref, idx) => {
                  if (ref.axis === 'x') {
                    if (ref.value < chart.xMin || ref.value > chart.xMax) return null;
                    const px = toX(ref.value);
                    return (
                      <g key={idx}>
                        <line
                          x1={px}
                          y1={padT}
                          x2={px}
                          y2={H - padB}
                          stroke={ref.color}
                          strokeDasharray="4 3"
                          strokeWidth="1.2"
                          opacity="0.8"
                        />
                        <text
                          x={clampPx(px + 3, padL + 4, W - padR - 58)}
                          y={padT + 10 + idx * 10}
                          fill={ref.color}
                          fontSize="8"
                          fontFamily="ui-monospace, monospace"
                        >
                          {ref.label}
                        </text>
                      </g>
                    );
                  }
                  if (ref.value < chart.yMin || ref.value > chart.yMax) return null;
                  const py = toY(ref.value);
                  return (
                    <g key={idx}>
                      <line
                        x1={padL}
                        y1={py}
                        x2={W - padR}
                        y2={py}
                        stroke={ref.color}
                        strokeDasharray="4 3"
                        strokeWidth="1.2"
                        opacity="0.8"
                      />
                      <text
                        x={W - padR - 2}
                        y={py - 3}
                        textAnchor="end"
                        fill={ref.color}
                        fontSize="8"
                        fontFamily="ui-monospace, monospace"
                      >
                        {ref.label}
                      </text>
                    </g>
                  );
                })}

                {/* Secondary Reference Curve (e.g. f_s,max or v_max) */}
                {polylineB && (
                  <polyline
                    points={polylineB}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.6"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Primary Curve */}
                <polyline
                  points={polylineA}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                />

                {/* Student-plotted trial markers */}
                {visibleTrials.map(tr => {
                  const pt = getTrialXY(tr);
                  const cx = clampPx(toX(pt.x), padL, W - padR);
                  const cy = clampPx(toY(pt.y), padT, H - padB);
                  return (
                    <circle
                      key={tr.id}
                      cx={cx}
                      cy={cy}
                      r={3.2}
                      fill="#38bdf8"
                      stroke="#030a08"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Secondary Operating Point (Sat B in Kepler mode) */}
                {chart.secondaryPoint && (
                  <g>
                    <circle
                      cx={clampPx(toX(chart.secondaryPoint.x), padL, W - padR)}
                      cy={clampPx(toY(chart.secondaryPoint.y), padT, H - padB)}
                      r={4.6}
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                  </g>
                )}

                {/* Live Primary Operating Point */}
                <circle
                  cx={clampPx(toX(chart.currentPoint.x), padL, W - padR)}
                  cy={clampPx(toY(chart.currentPoint.y), padT, H - padB)}
                  r={5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                />

                {/* Axis labels */}
                <text
                  x={padL + plotW / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.8"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {chart.xLabel}
                </text>
                <text
                  x={11}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.8"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  transform={`rotate(-90 11 ${padT + plotH / 2})`}
                >
                  {chart.yLabel}
                </text>
              </svg>
            </div>

            {/* Qualitative Sketch Takeaway (Skill 1.A) */}
            <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/25 text-[11px] text-emerald-100 leading-relaxed">
              <div className="text-[9.5px] font-mono uppercase text-emerald-400 font-bold mb-0.5">
                Skill 1.A Qualitative Graph Feature
              </div>
              {chart.qualitativeTakeaway}
            </div>

            {/* Recorded Data Trials */}
            <div className="rounded-xl bg-slate-950/80 border border-white/10 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Plotted Measurements ({visibleTrials.length})
                </span>
                {visibleTrials.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearTrials}
                    className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              {visibleTrials.length === 0 ? (
                <div className="text-[10.5px] text-slate-400">
                  Adjust sliders and click <strong className="text-sky-300">Plot Point</strong> to
                  record points directly onto the curves.
                </div>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[10px]">
                  {visibleTrials.map((tr, i) => {
                    const pt = getTrialXY(tr);
                    return (
                      <div
                        key={tr.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] border border-white/5"
                      >
                        <span className="text-sky-300">
                          #{i + 1} {tr.label}
                        </span>
                        <span className="text-slate-300">
                          ({pt.x.toFixed(1)}, {pt.y.toFixed(2)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2.A — SYMBOLIC DERIVATION PATHWAY                            */}
        {/* ================================================================ */}
        {activeTab === '2A' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-white">
              Symbolic Derivation Pathway (Skill 2.A)
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Follow Newton&apos;s second law along the radial axis pointing strictly toward the
              center of the circular path.
            </p>

            {derivationSteps.map(s => (
              <div
                key={s.step}
                className="p-2.5 rounded-xl bg-slate-950/85 border border-emerald-500/20 space-y-1"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9.5px] font-mono font-bold flex items-center justify-center shrink-0">
                    {s.step}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-200">{s.title}</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-[#030a08] border border-white/10 font-mono text-[10.5px] text-white break-words">
                  {s.equation}
                </div>
                <div className="text-[10.5px] text-slate-300 leading-snug">{s.note}</div>
              </div>
            ))}

            {params.mode === 'kepler_orbit' && (
              <div className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/30 text-[10.5px] text-amber-100 leading-relaxed">
                <strong className="text-amber-300 font-mono">BOUNDARY STATEMENT (CED p. 60):</strong>{' '}
                AP Physics C: Mechanics does not expect students to know Kepler&apos;s first or
                second laws of planetary motion—only circular orbits and Kepler&apos;s third law.
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2.D — FUNCTIONAL DEPENDENCE & SCALING PREDICTOR              */}
        {/* ================================================================ */}
        {activeTab === '2D' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Functional Dependence &amp; Scaling (2.D)
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                {verifiedScaling}/{SCALING_CHALLENGES_210.length} Solved
              </span>
            </div>

            {/* Mode-Specific Factor-of-Change Reference Table */}
            <div className="rounded-xl bg-slate-950/85 border border-white/10 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-emerald-950/35 border-b border-emerald-500/20 text-[10px] font-mono uppercase text-emerald-300 font-bold">
                Proportionality Rules (Current Mode)
              </div>
              <div className="divide-y divide-white/5">
                {scalingRows.map((row, idx) => (
                  <div key={idx} className="p-2 space-y-0.5">
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                      <span className="text-slate-200 font-semibold">{row.change}</span>
                      <span className="text-emerald-300 font-bold shrink-0">{row.factor}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] text-slate-400">
                      <span>{row.quantity}</span>
                      <span className="text-right">{row.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive AP 2.D Scaling Challenges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  AP 2.D Factor-of-Change Checks
                </span>
                {Object.keys(scalingAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScalingAnswers({})}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {SCALING_CHALLENGES_210.map(ch => {
                const chosen = scalingAnswers[ch.id];
                const isAnswered = chosen !== undefined;
                const isCorrect = chosen === ch.correctIndex;
                return (
                  <div
                    key={ch.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[9.5px] font-mono">
                      <span className="text-emerald-400 font-bold">EK {ch.ek}</span>
                      {isAnswered && (
                        <span
                          className={`font-bold ${
                            isCorrect ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Check Ratio'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-100 leading-snug">{ch.prompt}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {ch.options.map((opt, idx) => {
                        const selected = chosen === idx;
                        let cls =
                          'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10';
                        if (isAnswered) {
                          if (idx === ch.correctIndex) {
                            cls =
                              'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 font-bold';
                          } else if (selected) {
                            cls = 'bg-rose-500/25 border-rose-400/60 text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setScalingAnswers(prev => ({ ...prev, [ch.id]: idx }))
                            }
                            className={`px-2 py-1.5 rounded-lg border text-[10px] font-mono text-left transition cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {isAnswered && (
                      <div className="text-[10.5px] text-slate-300 bg-white/[0.03] rounded-lg p-2 border border-white/10 leading-snug">
                        {ch.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3.C — CLAIM-EVIDENCE JUSTIFICATION AUDIT                     */}
        {/* ================================================================ */}
        {activeTab === '3C' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Claim-Evidence Audit (Skill 3.C)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                  {verifiedClaims}/{CLAIM_CARDS_210.length} Verified
                </span>
                {Object.keys(claimAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClaimAnswers({})}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Reset claim audit"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Evaluate each AP Physics C circular motion claim using Newton&apos;s second law,
              free-body diagrams, and Kepler&apos;s third law.
            </p>

            {CLAIM_CARDS_210.map(card => {
              const userVal = claimAnswers[card.id];
              const answered = userVal !== undefined;
              const isCorrect = userVal === card.isTrue;
              return (
                <div
                  key={card.id}
                  className="p-2.5 rounded-xl bg-slate-950/85 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-[9.5px] font-mono">
                    <span className="text-emerald-400 font-bold">EK {card.ek}</span>
                    {answered && (
                      <span
                        className={`flex items-center gap-1 font-bold ${
                          isCorrect ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{isCorrect ? 'Verified' : 'Re-evaluate'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-100 leading-snug">
                    &ldquo;{card.claim}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setClaimAnswers(prev => ({ ...prev, [card.id]: true }))
                      }
                      className={`py-1.5 rounded-lg border text-[10.5px] font-bold transition cursor-pointer ${
                        userVal === true
                          ? card.isTrue
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-rose-500/25 border-rose-400 text-rose-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      True (Supported)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setClaimAnswers(prev => ({ ...prev, [card.id]: false }))
                      }
                      className={`py-1.5 rounded-lg border text-[10.5px] font-bold transition cursor-pointer ${
                        userVal === false
                          ? !card.isTrue
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-rose-500/25 border-rose-400 text-rose-200'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      False (Refuted)
                    </button>
                  </div>
                  {answered && (
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-[10.5px] text-slate-300 leading-snug">
                      {card.justification}
                    </div>
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
