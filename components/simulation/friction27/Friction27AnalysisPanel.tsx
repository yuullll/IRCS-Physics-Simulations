'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  LineChart,
  Plus,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AP_CLAIMS_27,
  DERIVATION_PATHWAYS_27,
  EXPERIMENTAL_PROCEDURES_27,
  Friction27Evaluation,
  Friction27Params,
  LabTrialPoint,
  QuantitativeGraphKind27,
  buildQuantitativeGraph27,
  solveFrictionCalculation27,
} from '@/lib/physics/friction-2-7';

export interface Friction27AnalysisPanelProps {
  params: Friction27Params;
  evaluation: Friction27Evaluation;
  labTrials: LabTrialPoint[];
  onRecordTrial: () => void;
  onResetTrials: () => void;
}

type AnalysisTab = 'graphs' | 'derive' | 'solve' | 'lab' | 'claims';

const GRAPH_OPTIONS: { id: QuantitativeGraphKind27; label: string }[] = [
  { id: 'ff_vs_fapp', label: 'F_f(F_app)' },
  { id: 'ff_vs_fn_lab', label: 'Lab F_f(F_N)' },
  { id: 'incline_vs_theta', label: 'Ramp F_f(θ)' },
  { id: 'stack_accel_vs_fpull', label: 'Stack a(F)' },
];

export const Friction27AnalysisPanel: React.FC<Friction27AnalysisPanelProps> = ({
  params,
  evaluation,
  labTrials,
  onRecordTrial,
  onResetTrials,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('graphs');
  const [graphOverride, setGraphOverride] = useState<{
    modeKey: string;
    kind: QuantitativeGraphKind27;
  } | null>(null);
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(DERIVATION_PATHWAYS_27[0].id);
  const [revealedSteps, setRevealedSteps] = useState<number>(1);
  const [selectedProcId, setSelectedProcId] = useState<string>(EXPERIMENTAL_PROCEDURES_27[0].id);
  const [checkedProcSteps, setCheckedProcSteps] = useState<Record<string, boolean>>({});
  const [claimAnswers, setClaimAnswers] = useState<Record<string, 'true' | 'false'>>({});

  // Derive default quantitative graph from active simulation mode (no setState inside useEffect)
  const modeKey = params.mode;
  const defaultGraphKind: QuantitativeGraphKind27 =
    params.mode === 'horizontal_pull'
      ? 'ff_vs_fapp'
      : params.mode === 'incline_ramp'
        ? 'incline_vs_theta'
        : params.mode === 'stacked_blocks'
          ? 'stack_accel_vs_fpull'
          : 'ff_vs_fn_lab';

  const graphKind =
    graphOverride && graphOverride.modeKey === modeKey ? graphOverride.kind : defaultGraphKind;

  const graphSpec = useMemo(
    () => buildQuantitativeGraph27(params, evaluation, graphKind, labTrials),
    [params, evaluation, graphKind, labTrials]
  );

  const activePathway = useMemo(
    () => DERIVATION_PATHWAYS_27.find(d => d.id === selectedPathwayId) || DERIVATION_PATHWAYS_27[0],
    [selectedPathwayId]
  );

  const solution2B = useMemo(
    () => solveFrictionCalculation27(params, evaluation),
    [params, evaluation]
  );

  const activeProcedure = useMemo(
    () =>
      EXPERIMENTAL_PROCEDURES_27.find(pr => pr.id === selectedProcId) ||
      EXPERIMENTAL_PROCEDURES_27[0],
    [selectedProcId]
  );

  const verifiedClaimCount = useMemo(
    () => AP_CLAIMS_27.filter(c => claimAnswers[c.id] === c.verdict).length,
    [claimAnswers]
  );

  // Quantitative SVG coordinate mapping (Skill 1.B real scales & units)
  const svgW = 296;
  const svgH = 166;
  const padL = 38;
  const padR = 14;
  const padT = 22;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const toSvgX = (xVal: number) => {
    const frac = (xVal - graphSpec.xMin) / Math.max(1e-6, graphSpec.xMax - graphSpec.xMin);
    return padL + Math.max(0, Math.min(1, frac)) * plotW;
  };
  const toSvgY = (yVal: number) => {
    const frac = (yVal - graphSpec.yMin) / Math.max(1e-6, graphSpec.yMax - graphSpec.yMin);
    return padT + (1 - Math.max(0, Math.min(1, frac))) * plotH;
  };

  return (
    <aside
      aria-label="Friction Analysis Dock"
      className="fixed top-[68px] right-3 z-20 w-[348px] max-w-[calc(100vw-24px)] bg-[#071510]/95 border border-emerald-500/25 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[calc(100vh-84px)] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-expanded={!collapsed}
        className="w-full px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-500/20 hover:bg-emerald-500/5 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold tracking-tight text-white">
              Friction Analysis Dock
            </div>
            <div className="text-[10px] text-emerald-300/80 font-mono">
              Skills 1.B · 2.A · 2.B · 3.A · 3.B
            </div>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* 5 AP Science Practice Tabs */}
          <div className="grid grid-cols-5 gap-1 p-1.5 border-b border-white/10 bg-[#040d0a]">
            {(
              [
                { id: 'graphs', label: '1.B', icon: <LineChart className="w-3.5 h-3.5" /> },
                { id: 'derive', label: '2.A', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { id: 'solve', label: '2.B', icon: <Calculator className="w-3.5 h-3.5" /> },
                { id: 'lab', label: '3.A', icon: <FlaskConical className="w-3.5 h-3.5" /> },
                { id: 'claims', label: '3.B', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              ] as const
            ).map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold flex flex-col items-center gap-0.5 transition cursor-pointer ${
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

          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* =============================================================== */}
            {/* TAB 1: SKILL 1.B — QUANTITATIVE GRAPHS & DATA PLOTTING          */}
            {/* =============================================================== */}
            {activeTab === 'graphs' && (
              <>
                <div className="grid grid-cols-4 gap-1">
                  {GRAPH_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setGraphOverride({ modeKey, kind: opt.id })}
                      className={`py-1 px-1 rounded-lg text-[10px] font-mono font-semibold border transition cursor-pointer whitespace-nowrap ${
                        graphKind === opt.id
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-emerald-300 leading-tight">
                      {graphSpec.title}
                    </div>
                  </div>

                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto rounded-lg bg-[#030907] border border-white/5"
                    role="img"
                    aria-label={graphSpec.title}
                  >
                    {/* Quantitative Y-axis ticks & gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map(f => {
                      const val = graphSpec.yMin + f * (graphSpec.yMax - graphSpec.yMin);
                      const y = toSvgY(val);
                      return (
                        <g key={`y-${f}`}>
                          <line
                            x1={padL}
                            x2={svgW - padR}
                            y1={y}
                            y2={y}
                            stroke="rgba(148,163,184,0.12)"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 4}
                            y={y + 3}
                            textAnchor="end"
                            fill="#64748b"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {val.toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Quantitative X-axis ticks */}
                    {[0, 0.5, 1].map(f => {
                      const val = graphSpec.xMin + f * (graphSpec.xMax - graphSpec.xMin);
                      const x = toSvgX(val);
                      return (
                        <text
                          key={`x-${f}`}
                          x={x}
                          y={svgH - padB + 11}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          {val.toFixed(0)}
                        </text>
                      );
                    })}

                    {/* Axes */}
                    <line
                      x1={padL}
                      x2={padL}
                      y1={padT}
                      y2={svgH - padB}
                      stroke="#64748b"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={padL}
                      x2={svgW - padR}
                      y1={svgH - padB}
                      y2={svgH - padB}
                      stroke="#64748b"
                      strokeWidth="1.2"
                    />

                    {/* Reference Threshold Vertical Line */}
                    {graphSpec.referenceX !== undefined && (
                      <>
                        <line
                          x1={toSvgX(graphSpec.referenceX)}
                          x2={toSvgX(graphSpec.referenceX)}
                          y1={padT}
                          y2={svgH - padB}
                          stroke="#38bdf8"
                          strokeWidth="1.15"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={Math.max(padL + 36, Math.min(svgW - padR - 36, toSvgX(graphSpec.referenceX)))}
                          y={padT - 6}
                          textAnchor="middle"
                          fill="#7dd3fc"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {graphSpec.referenceXLabel}
                        </text>
                      </>
                    )}

                    {/* Quantitative Series Curves */}
                    {graphSpec.series.map((s, idx) => {
                      if (s.points.length < 2) return null;
                      const d = s.points
                        .map(
                          (pt, i) =>
                            `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x).toFixed(1)} ${toSvgY(pt.y).toFixed(1)}`
                        )
                        .join(' ');
                      return (
                        <path
                          key={idx}
                          d={d}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={s.dashed ? '1.6' : '2.3'}
                          strokeDasharray={s.dashed ? '4 3' : undefined}
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {/* Plotted Lab Data Scatter Points */}
                    {graphSpec.scatterPoints?.map((pt, i) => (
                      <circle
                        key={`sc-${i}`}
                        cx={toSvgX(pt.x)}
                        cy={toSvgY(pt.y)}
                        r="3.2"
                        fill={pt.color}
                        stroke="#030907"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Live State Marker */}
                    <circle
                      cx={toSvgX(graphSpec.markerX)}
                      cy={toSvgY(graphSpec.markerY)}
                      r="4.5"
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {(() => {
                      const mx = toSvgX(graphSpec.markerX);
                      const my = toSvgY(graphSpec.markerY);
                      const badgeW = Math.max(46, graphSpec.markerLabel.length * 5.2 + 10);
                      const badgeH = 14;
                      const labelOnLeft = mx > svgW - padR - badgeW - 10;
                      const rx = labelOnLeft
                        ? Math.max(padL + 4, mx - badgeW - 7)
                        : Math.min(svgW - padR - badgeW - 2, mx + 8);
                      const ry =
                        my < padT + 26
                          ? Math.min(svgH - padB - badgeH - 3, my + 8)
                          : Math.max(padT + 2, my - badgeH - 7);
                      return (
                        <g>
                          <rect
                            x={rx}
                            y={ry}
                            width={badgeW}
                            height={badgeH}
                            rx="3"
                            fill="#040d0a"
                            fillOpacity="0.93"
                            stroke="rgba(244,63,94,0.55)"
                            strokeWidth="0.8"
                          />
                          <text
                            x={rx + badgeW / 2}
                            y={ry + 10}
                            textAnchor="middle"
                            fill="#fda4af"
                            fontSize="8.2"
                            fontFamily="monospace"
                            fontWeight="700"
                          >
                            {graphSpec.markerLabel}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Axis Titles */}
                    <text
                      x={padL + plotW / 2}
                      y={svgH - 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {graphSpec.xAxisLabel}
                    </text>
                    <text
                      x={10}
                      y={padT + plotH / 2}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="monospace"
                      transform={`rotate(-90 10 ${padT + plotH / 2})`}
                    >
                      {graphSpec.yAxisLabel}
                    </text>
                  </svg>

                  {/* Series Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono">
                    {graphSpec.series.map(s => (
                      <span key={s.label} style={{ color: s.color }}>
                        — {s.label}
                      </span>
                    ))}
                  </div>

                  {/* Skill 1.B Lab Trial Plotter Controls */}
                  {graphKind === 'ff_vs_fn_lab' && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={onRecordTrial}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/40 text-emerald-200 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Record Trial ({labTrials.length})
                      </button>
                      <button
                        onClick={onResetTrials}
                        aria-label="Reset lab trials"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <ul className="space-y-1 text-[11px] text-slate-300 leading-snug pt-0.5">
                    {graphSpec.notes.map((n, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-emerald-400 font-bold">·</span>
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Live Quantitative Telemetry Readout */}
                <div className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
                  {params.mode === 'horizontal_pull' && (
                    <>
                      <div>
                        <div className="text-[10px] text-slate-400">Normal Force F_N</div>
                        <div className="text-emerald-300 font-bold">
                          {evaluation.horizontal.normalForceN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">F_f,s,max / F_f,k</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.horizontal.maxStaticFrictionN.toFixed(1)} /{' '}
                          {evaluation.horizontal.kineticFrictionN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Actual Friction</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.horizontal.actualFrictionN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Acceleration a_x</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.horizontal.accelMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'incline_ramp' && (
                    <>
                      <div>
                        <div className="text-[10px] text-slate-400">Critical Angle θ_c</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.incline.criticalAngleDeg.toFixed(1)}°
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Normal F_N</div>
                        <div className="text-emerald-300 font-bold">
                          {evaluation.incline.normalForceN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Friction (up +)</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.incline.signedFrictionN >= 0 ? '+' : ''}
                          {evaluation.incline.signedFrictionN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Ramp Accel a</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.incline.signedAccelMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'stacked_blocks' && (
                    <>
                      <div>
                        <div className="text-[10px] text-slate-400">Slip Pull F_slip</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.stacked.slipThresholdPullN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">F_f on Top m₂</div>
                        <div className="text-emerald-300 font-bold">
                          +{evaluation.stacked.frictionOnTopN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Sled Accel a₁</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.stacked.accelBottomMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Top Accel a₂</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.stacked.accelTopMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'area_surface_compare' && (
                    <>
                      <div>
                        <div className="text-[10px] text-slate-400">Lane A (Wide A)</div>
                        <div className="text-emerald-300 font-bold">
                          F_f = {evaluation.compare.laneA.actualFrictionN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Lane B (Edge A/3)</div>
                        <div className="text-amber-300 font-bold">
                          F_f = {evaluation.compare.laneB.actualFrictionN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Pressure Ratio</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.compare.pressureRatioBOverA.toFixed(1)}× on Lane B
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Accel A vs B</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.compare.laneA.accelMs2.toFixed(2)} /{' '}
                          {evaluation.compare.laneB.accelMs2.toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: SKILL 2.A — SYMBOLIC DERIVATION PATHWAYS                 */}
            {/* =============================================================== */}
            {activeTab === 'derive' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {DERIVATION_PATHWAYS_27.map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedPathwayId(d.id);
                        setRevealedSteps(1);
                      }}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                        selectedPathwayId === d.id
                          ? 'bg-emerald-400/15 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-emerald-400">{d.ekCode}</div>
                      <div className="text-[11px] font-semibold leading-tight mt-0.5 line-clamp-2">
                        {d.title}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="text-[11px] text-slate-300">
                    <span className="font-bold text-emerald-300">Goal:</span> {activePathway.goal}
                  </div>
                  <div className="space-y-2">
                    {activePathway.steps.slice(0, revealedSteps).map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#081a14] border border-emerald-500/20 space-y-1"
                      >
                        <div className="text-[10px] font-mono text-emerald-400">{step.title}</div>
                        <div className="font-mono text-[11px] text-white font-bold break-words">
                          {step.equation}
                        </div>
                        <div className="text-[11px] text-slate-300 leading-snug">
                          {step.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {revealedSteps < activePathway.steps.length ? (
                      <button
                        onClick={() => setRevealedSteps(s => Math.min(activePathway.steps.length, s + 1))}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-400 text-slate-950 font-bold text-[11px] hover:bg-emerald-300 transition cursor-pointer"
                      >
                        Next Step ({revealedSteps}/{activePathway.steps.length})
                      </button>
                    ) : (
                      <button
                        onClick={() => setRevealedSteps(1)}
                        className="flex-1 py-1.5 rounded-lg bg-white/10 text-slate-200 font-semibold text-[11px] hover:bg-white/15 transition cursor-pointer"
                      >
                        Restart Derivation
                      </button>
                    )}
                    <button
                      onClick={() => setRevealedSteps(activePathway.steps.length)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] hover:text-white cursor-pointer whitespace-nowrap"
                    >
                      Show All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: SKILL 2.B — QUANTITATIVE CALCULATION PATHWAY             */}
            {/* =============================================================== */}
            {activeTab === 'solve' && (
              <div className="space-y-2.5">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="text-[11px] font-bold text-emerald-300">{solution2B.title}</div>
                  <div className="text-[10px] font-mono text-slate-300 space-y-0.5 bg-[#081a14] p-2 rounded-lg border border-white/10">
                    <div className="text-emerald-400 font-bold">Live Lab Givens:</div>
                    {solution2B.givens.map((g, i) => (
                      <div key={i}>{g}</div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {solution2B.steps.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-[#081a14] border border-white/10 space-y-1"
                      >
                        <div className="text-[10px] font-semibold text-sky-300">{st.label}</div>
                        <div className="font-mono text-[11px] text-slate-100 leading-snug break-words">
                          {st.calculation}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-400/15 border border-emerald-400/40 font-mono text-xs font-bold text-emerald-200 text-center">
                    {solution2B.finalAnswer}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: SKILL 3.A — EXPERIMENTAL PROCEDURE DESIGNER              */}
            {/* =============================================================== */}
            {activeTab === 'lab' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {EXPERIMENTAL_PROCEDURES_27.map((pr, idx) => (
                    <button
                      key={pr.id}
                      onClick={() => setSelectedProcId(pr.id)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                        selectedProcId === pr.id
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {idx === 0 ? 'Lab 1: Find μ_s & μ_k' : 'Lab 2: Test Area'}
                    </button>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="text-[11px] font-bold text-white leading-snug">
                    {activeProcedure.question}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Equipment: {activeProcedure.equipment.join(' · ')}
                  </div>
                  <div className="text-[10px] text-emerald-300/90 font-semibold">
                    Select valid lab steps (avoid experimental flaws):
                  </div>
                  <div className="space-y-1.5">
                    {activeProcedure.steps.map((st, idx) => {
                      const key = `${activeProcedure.id}-${idx}`;
                      const checked = !!checkedProcSteps[key];
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setCheckedProcSteps(prev => ({ ...prev, [key]: !prev[key] }))
                          }
                          className={`w-full text-left p-2 rounded-lg border transition cursor-pointer space-y-1 ${
                            !checked
                              ? 'bg-[#081a14] border-white/10 hover:border-white/25'
                              : st.isEssential
                                ? 'bg-emerald-500/15 border-emerald-400/50'
                                : 'bg-rose-500/15 border-rose-400/50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {checked ? (
                              st.isEssential ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              )
                            ) : (
                              <span className="w-3.5 h-3.5 rounded border border-slate-500 shrink-0 mt-0.5 inline-block" />
                            )}
                            <span className="text-[11px] text-slate-200 leading-snug">
                              {st.text}
                            </span>
                          </div>
                          {checked && (
                            <div
                              className={`text-[10px] pl-5 leading-snug ${
                                st.isEssential ? 'text-emerald-200' : 'text-rose-200'
                              }`}
                            >
                              {st.rationale}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-400/25 rounded-lg p-2">
                    <span className="font-bold">Data Analysis:</span> {activeProcedure.analysisMethod}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 5: SKILL 3.B — AP CONCEPTUAL CLAIMS                         */}
            {/* =============================================================== */}
            {activeTab === 'claims' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#040d0a] border border-emerald-500/20 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Verified Claims (Skill 3.B)
                  </span>
                  <span className="font-mono font-bold text-emerald-300 tabular-nums">
                    {verifiedClaimCount} / {AP_CLAIMS_27.length}
                  </span>
                </div>

                {AP_CLAIMS_27.map(claim => {
                  const chosen = claimAnswers[claim.id];
                  const isCorrect = chosen === claim.verdict;
                  return (
                    <div
                      key={claim.id}
                      className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="text-[10px] font-mono text-emerald-400">
                        EK {claim.ekCode}
                      </div>
                      <div className="text-[11px] text-slate-200 leading-snug">
                        {claim.statement}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['true', 'false'] as const).map(ans => {
                          const picked = chosen === ans;
                          const rightChoice = picked && isCorrect;
                          const wrongChoice = picked && !isCorrect;
                          return (
                            <button
                              key={ans}
                              onClick={() =>
                                setClaimAnswers(prev => ({ ...prev, [claim.id]: ans }))
                              }
                              className={`py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                rightChoice
                                  ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                                  : wrongChoice
                                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              {ans === 'true' ? 'True' : 'False'}
                            </button>
                          );
                        })}
                      </div>
                      {chosen && (
                        <div
                          className={`p-2 rounded-lg text-[11px] flex gap-1.5 items-start ${
                            isCorrect
                              ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                          )}
                          <span>{claim.explanation}</span>
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

export default Friction27AnalysisPanel;
