'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Scale,
  Sigma,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RotateCcw,
  FlaskConical,
} from 'lucide-react';
import {
  CLAIM_BUILDER_31,
  JUSTIFICATION_CARDS_31,
  Kinetic31ChartKind,
  Kinetic31Evaluation,
  Kinetic31Params,
  KineticTrialPoint,
  RATIO_CHALLENGES_31,
  SKETCH_CHALLENGES_31,
  buildComparisonRows31,
  buildDerivationSteps31,
  buildKineticChartData31,
  getChartTabLabels31,
} from '@/lib/physics/kinetic-energy-3-1';

export type Kinetic31Tab = '1C' | '2C' | '3B' | '3C';

interface Kinetic31AnalysisPanelProps {
  params: Kinetic31Params;
  evaluation: Kinetic31Evaluation;
  activeTab: Kinetic31Tab;
  onChangeTab: (tab: Kinetic31Tab) => void;
  trials: KineticTrialPoint[];
  onPlotCurrentTrial: () => void;
  onClearTrials: () => void;
  onApplyPreset: (preset: Partial<Kinetic31Params>) => void;
}

const MiniShapeIcon: React.FC<{
  shape: 'parabola_origin' | 'line_origin' | 'flat_const' | 'shifted_parabola' | 'inv_curve';
}> = ({ shape }) => {
  const path =
    shape === 'parabola_origin'
      ? 'M 4 24 Q 18 24 28 4'
      : shape === 'line_origin'
      ? 'M 4 24 L 28 4'
      : shape === 'flat_const'
      ? 'M 4 13 L 28 13'
      : shape === 'shifted_parabola'
      ? 'M 4 5 Q 16 34 28 5'
      : 'M 5 5 Q 11 22 28 24';

  return (
    <svg viewBox="0 0 32 28" className="w-8 h-6 shrink-0" aria-hidden="true">
      <line x1="4" y1="24" x2="29" y2="24" stroke="#475569" strokeWidth="1" />
      <line x1="4" y1="3" x2="4" y2="24" stroke="#475569" strokeWidth="1" />
      <path d={path} fill="none" stroke="#34d399" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
};

export const Kinetic31AnalysisPanel: React.FC<Kinetic31AnalysisPanelProps> = ({
  params,
  evaluation,
  activeTab,
  onChangeTab,
  trials,
  onPlotCurrentTrial,
  onClearTrials,
  onApplyPreset,
}) => {
  const [chartKind, setChartKind] = useState<Kinetic31ChartKind>('primary');
  const [sketchAnswers, setSketchAnswers] = useState<Record<string, number>>({});
  const [ratioAnswers, setRatioAnswers] = useState<Record<string, number>>({});
  const [claimBuildAnswers, setClaimBuildAnswers] = useState<Record<string, number>>({});
  const [justAnswers, setJustAnswers] = useState<Record<string, boolean>>({});

  const chartTabs = useMemo(() => getChartTabLabels31(params.mode), [params.mode]);
  const chart = useMemo(
    () => buildKineticChartData31(params, evaluation, chartKind),
    [params, evaluation, chartKind],
  );
  const comparisonRows = useMemo(
    () => buildComparisonRows31(params, evaluation),
    [params, evaluation],
  );
  const derivationSteps = useMemo(
    () => buildDerivationSteps31(params, evaluation),
    [params, evaluation],
  );

  const visibleTrials = useMemo(
    () => trials.filter(tr => tr.mode === params.mode),
    [trials, params.mode],
  );

  // SVG plot geometry
  const W = 308;
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
  const clampPx = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const polylineA = chart.curveA
    .map(pt => `${toX(pt.x).toFixed(1)},${clampPx(toY(pt.y), padT, H - padB).toFixed(1)}`)
    .join(' ');
  const polylineB = chart.curveB
    ? chart.curveB
        .map(pt => `${toX(pt.x).toFixed(1)},${clampPx(toY(pt.y), padT, H - padB).toFixed(1)}`)
        .join(' ')
    : null;

  const getTrialXY = (tr: KineticTrialPoint) => {
    if (chartKind === 'primary') return { x: tr.xPrimary, y: tr.yPrimary };
    if (chartKind === 'secondary') return { x: tr.xSecondary, y: tr.ySecondary };
    return { x: tr.xTertiary, y: tr.yTertiary };
  };

  const verifiedSketches = SKETCH_CHALLENGES_31.filter(
    q => sketchAnswers[q.id] === q.correctIndex,
  ).length;
  const verifiedRatios = RATIO_CHALLENGES_31.filter(
    q => ratioAnswers[q.id] === q.correctIndex,
  ).length;
  const verifiedClaims3B = CLAIM_BUILDER_31.filter(
    q => claimBuildAnswers[q.id] === q.correctIndex,
  ).length;
  const verifiedJust3C = JUSTIFICATION_CARDS_31.filter(
    q => justAnswers[q.id] === q.isTrue,
  ).length;

  const tabs: Array<{ id: Kinetic31Tab; label: string; icon: React.ReactNode }> = [
    { id: '1C', label: '1.C', icon: <LineChart className="w-3 h-3" /> },
    { id: '2C', label: '2.C', icon: <Scale className="w-3 h-3" /> },
    { id: '3B', label: '3.B', icon: <Sigma className="w-3 h-3" /> },
    { id: '3C', label: '3.C', icon: <CheckCircle2 className="w-3 h-3" /> },
  ];

  return (
    <aside className="fixed right-3 top-[68px] z-20 w-[348px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
      {/* Header + 4 AP Science Practice Tabs (CED p. 67: 1.C, 2.C, 3.B, 3.C) */}
      <div className="px-3 pt-2.5 pb-2 border-b border-emerald-500/20 bg-emerald-950/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
            Suggested Skills · Topic 3.1
          </span>
          <span className="text-[10px] font-mono text-slate-400">LO 3.1.A</span>
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
        {/* TAB 1.C — QUALITATIVE & QUANTITATIVE GRAPHS                      */}
        {/* ================================================================ */}
        {activeTab === '1C' && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Model Graphs &amp; Sketches (1.C)
              </div>
              <button
                type="button"
                onClick={onPlotCurrentTrial}
                className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Plot Point</span>
              </button>
            </div>

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
                          x={clampPx(px + 3, padL + 4, W - padR - 64)}
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

                {polylineB && (
                  <polyline
                    points={polylineB}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.6"
                    strokeDasharray="5 3"
                  />
                )}
                <polyline points={polylineA} fill="none" stroke="#34d399" strokeWidth="2.2" />

                {visibleTrials.map(tr => {
                  const pt = getTrialXY(tr);
                  return (
                    <circle
                      key={tr.id}
                      cx={clampPx(toX(pt.x), padL, W - padR)}
                      cy={clampPx(toY(pt.y), padT, H - padB)}
                      r={3.2}
                      fill="#38bdf8"
                      stroke="#030a08"
                      strokeWidth="1"
                    />
                  );
                })}

                {chart.secondaryPoint && (
                  <circle
                    cx={clampPx(toX(chart.secondaryPoint.x), padL, W - padR)}
                    cy={clampPx(toY(chart.secondaryPoint.y), padT, H - padB)}
                    r={4.5}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                )}

                <circle
                  cx={clampPx(toX(chart.currentPoint.x), padL, W - padR)}
                  cy={clampPx(toY(chart.currentPoint.y), padT, H - padB)}
                  r={5}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                />

                <text
                  x={padL + plotW / 2}
                  y={H - 4}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.8"
                >
                  {chart.xLabel}
                </text>
                <text
                  x={11}
                  y={padT + plotH / 2}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8.8"
                  transform={`rotate(-90 11 ${padT + plotH / 2})`}
                >
                  {chart.yLabel}
                </text>
              </svg>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/25 text-[11px] text-emerald-100 leading-relaxed">
              <div className="text-[9.5px] font-mono uppercase text-emerald-400 font-bold mb-0.5">
                Skill 1.C Qualitative Feature
              </div>
              {chart.qualitativeTakeaway}
            </div>

            {/* Plotted Points */}
            <div className="rounded-xl bg-slate-950/80 border border-white/10 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Plotted Points ({visibleTrials.length})
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
                  capture measurements on this graph.
                </div>
              ) : (
                <div className="max-h-20 overflow-y-auto space-y-1 font-mono text-[10px]">
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
                          ({pt.x.toFixed(1)}, {pt.y.toFixed(1)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Interactive 1.C Qualitative Sketch Check */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Qualitative Sketch Checks (1.C)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                  {verifiedSketches}/{SKETCH_CHALLENGES_31.length}
                </span>
              </div>
              {SKETCH_CHALLENGES_31.map(ch => {
                const chosen = sketchAnswers[ch.id];
                const answered = chosen !== undefined;
                return (
                  <div
                    key={ch.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2"
                  >
                    <div className="text-[9.5px] font-mono text-emerald-400 font-bold">
                      {ch.ek}
                    </div>
                    <p className="text-[11px] text-slate-100 leading-snug">{ch.prompt}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ch.options.map((opt, idx) => {
                        let cls =
                          'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10';
                        if (answered) {
                          if (idx === ch.correctIndex) {
                            cls =
                              'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 font-bold';
                          } else if (chosen === idx) {
                            cls = 'bg-rose-500/25 border-rose-400/60 text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setSketchAnswers(prev => ({ ...prev, [ch.id]: idx }))
                            }
                            className={`p-1.5 rounded-lg border text-[10px] text-left flex items-center gap-1.5 transition cursor-pointer ${cls}`}
                          >
                            <MiniShapeIcon shape={opt.shape} />
                            <span className="leading-tight">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className="text-[10.5px] text-slate-300 bg-white/[0.03] rounded-lg p-2 border border-white/10 leading-snug">
                        {ch.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2.C — COMPARE PHYSICAL QUANTITIES                            */}
        {/* ================================================================ */}
        {activeTab === '2C' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Scenario Comparison Matrix (Skill 2.C)
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                {verifiedRatios}/{RATIO_CHALLENGES_31.length} Solved
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/85 border border-white/10 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-emerald-950/35 border-b border-emerald-500/20 text-[10px] font-mono uppercase text-emerald-300 font-bold">
                Live Quantitative Comparison
              </div>
              <div className="divide-y divide-white/5">
                {comparisonRows.map((row, idx) => (
                  <div key={idx} className="p-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-200 font-semibold">{row.quantity}</span>
                      <span className="font-mono text-emerald-300 font-bold">{row.relation}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                      <div className="px-2 py-1 rounded bg-white/[0.03] border border-white/5 flex justify-between">
                        <span className="text-slate-400">{row.colALabel}</span>
                        <span className="text-white font-semibold">{row.colAValue}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-white/[0.03] border border-white/5 flex justify-between">
                        <span className="text-slate-400">{row.colBLabel}</span>
                        <span className="text-amber-200 font-semibold">{row.colBValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  AP 2.C Ratio &amp; Comparison Checks
                </span>
                {Object.keys(ratioAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRatioAnswers({})}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {RATIO_CHALLENGES_31.map(ch => {
                const chosen = ratioAnswers[ch.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === ch.correctIndex;
                return (
                  <div
                    key={ch.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[9.5px] font-mono">
                      <span className="text-emerald-400 font-bold">{ch.ek}</span>
                      {answered && (
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
                        let cls =
                          'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10';
                        if (answered) {
                          if (idx === ch.correctIndex) {
                            cls =
                              'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 font-bold';
                          } else if (chosen === idx) {
                            cls = 'bg-rose-500/25 border-rose-400/60 text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setRatioAnswers(prev => ({ ...prev, [ch.id]: idx }))
                            }
                            className={`px-2 py-1.5 rounded-lg border text-[10px] font-mono text-left transition cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
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
        {/* TAB 3.B — APPLY LAW, DEFINITION OR MODEL                         */}
        {/* ================================================================ */}
        {activeTab === '3B' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Apply Model &amp; Make Claims (Skill 3.B)
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                {verifiedClaims3B}/{CLAIM_BUILDER_31.length} Solved
              </span>
            </div>

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

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Law-Application Claims (3.B)
                </span>
                {Object.keys(claimBuildAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setClaimBuildAnswers({})}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {CLAIM_BUILDER_31.map(ch => {
                const chosen = claimBuildAnswers[ch.id];
                const answered = chosen !== undefined;
                const isCorrect = chosen === ch.correctIndex;
                return (
                  <div
                    key={ch.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[9.5px] font-mono">
                      <span className="text-emerald-400 font-bold">{ch.ek}</span>
                      {answered && (
                        <span
                          className={`font-bold ${
                            isCorrect ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Review Law'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-100 leading-snug">{ch.prompt}</p>
                    <div className="space-y-1">
                      {ch.options.map((opt, idx) => {
                        let cls =
                          'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10';
                        if (answered) {
                          if (idx === ch.correctIndex) {
                            cls =
                              'bg-emerald-500/25 border-emerald-400/60 text-emerald-200 font-bold';
                          } else if (chosen === idx) {
                            cls = 'bg-rose-500/25 border-rose-400/60 text-rose-200';
                          }
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setClaimBuildAnswers(prev => ({ ...prev, [ch.id]: idx }))
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-[10.5px] text-left transition cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
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
        {/* TAB 3.C — JUSTIFY / SUPPORT CLAIMS WITH EXPERIMENTAL EVIDENCE    */}
        {/* ================================================================ */}
        {activeTab === '3C' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-white">
                Claim-Evidence Audit (Skill 3.C)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                  {verifiedJust3C}/{JUSTIFICATION_CARDS_31.length} Verified
                </span>
                {Object.keys(justAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setJustAnswers({})}
                    className="text-slate-400 hover:text-white cursor-pointer"
                    title="Reset claim audit"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Evaluate each claim using <span className="text-emerald-300 font-mono">K = ½mv²</span>,
              scalar properties, and observer reference frames—or load it directly into the 3D lab!
            </p>

            {JUSTIFICATION_CARDS_31.map(card => {
              const userVal = justAnswers[card.id];
              const answered = userVal !== undefined;
              const isCorrect = userVal === card.isTrue;
              return (
                <div
                  key={card.id}
                  className="p-2.5 rounded-xl bg-slate-950/85 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-[9.5px] font-mono">
                    <span className="text-emerald-400 font-bold">EK {card.ek}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onApplyPreset(card.testPreset)}
                        className="px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 flex items-center gap-1 cursor-pointer transition"
                        title="Configure 3D simulation to test this claim"
                      >
                        <FlaskConical className="w-3 h-3" />
                        <span>Test in 3D Lab</span>
                      </button>
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
                          <span>{isCorrect ? 'Verified' : 'Re-check'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-100 leading-snug">
                    &ldquo;{card.claim}&rdquo;
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setJustAnswers(prev => ({ ...prev, [card.id]: true }))
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
                        setJustAnswers(prev => ({ ...prev, [card.id]: false }))
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
