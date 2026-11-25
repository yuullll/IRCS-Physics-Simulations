'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LineChart,
  Scale,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AP_CLAIMS_26,
  DERIVATION_PATHWAYS_26,
  Gravity26Evaluation,
  Gravity26Params,
  QualitativeGraphKind,
  buildQualitativeGraph26,
  computeGravityScalingPrediction,
} from '@/lib/physics/gravitational-force-2-6';

export interface Gravity26AnalysisPanelProps {
  params: Gravity26Params;
  evaluation: Gravity26Evaluation;
}

type AnalysisTab = 'graphs' | 'derive' | 'scale' | 'claims';

const GRAPH_OPTIONS: { id: QualitativeGraphKind; label: string }[] = [
  { id: 'solid_g_vs_r', label: 'Solid g(r)' },
  { id: 'hollow_g_vs_r', label: 'Shell g(r)' },
  { id: 'altitude_g_vs_h', label: 'Alt g(h)' },
  { id: 'apparent_fn_vs_a', label: 'F_N(a)' },
];

const SCALE_FACTORS = [0.5, 1, 2, 3];

export const Gravity26AnalysisPanel: React.FC<Gravity26AnalysisPanelProps> = ({
  params,
  evaluation,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('graphs');
  const [graphOverride, setGraphOverride] = useState<{
    modeKey: string;
    kind: QualitativeGraphKind;
  } | null>(null);
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>(DERIVATION_PATHWAYS_26[0].id);
  const [revealedSteps, setRevealedSteps] = useState<number>(1);
  const [massMFactor, setMassMFactor] = useState<number>(2);
  const [testMassFactor, setTestMassFactor] = useState<number>(1);
  const [distanceFactor, setDistanceFactor] = useState<number>(2);
  const [claimAnswers, setClaimAnswers] = useState<Record<string, 'true' | 'false'>>({});

  // Auto-sync Skill 1.C qualitative graph to active simulation mode & shell geometry
  const modeKey = `${params.mode}:${params.shellKind}`;
  const defaultGraphKind: QualitativeGraphKind =
    params.mode === 'universal_field'
      ? 'solid_g_vs_r'
      : params.mode === 'near_surface'
        ? 'altitude_g_vs_h'
        : params.mode === 'apparent_weight'
          ? 'apparent_fn_vs_a'
          : params.shellKind === 'hollow_shell'
            ? 'hollow_g_vs_r'
            : 'solid_g_vs_r';

  const graphKind =
    graphOverride && graphOverride.modeKey === modeKey ? graphOverride.kind : defaultGraphKind;

  const graphSpec = useMemo(
    () => buildQualitativeGraph26(params, evaluation, graphKind),
    [params, evaluation, graphKind]
  );

  const activePathway = useMemo(
    () => DERIVATION_PATHWAYS_26.find(d => d.id === selectedPathwayId) || DERIVATION_PATHWAYS_26[0],
    [selectedPathwayId]
  );

  const scaling = useMemo(
    () => computeGravityScalingPrediction(massMFactor, testMassFactor, distanceFactor),
    [massMFactor, testMassFactor, distanceFactor]
  );

  const verifiedClaimCount = useMemo(
    () => AP_CLAIMS_26.filter(c => claimAnswers[c.id] === c.verdict).length,
    [claimAnswers]
  );

  // SVG layout coordinates for Skill 1.C qualitative graph
  const svgW = 282;
  const svgH = 154;
  const padL = 34;
  const padR = 14;
  const padT = 22;
  const padB = 26;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const toSvgX = (nx: number) => padL + nx * plotW;
  const toSvgY = (ny: number) => padT + (1 - ny) * plotH;

  return (
    <aside
      aria-label="Topic 2.6 Gravitational Force Analysis"
      className="absolute top-20 right-4 z-20 w-[338px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-tight truncate">
              Gravitation Analysis Dock
            </div>
            <div className="text-[10px] font-mono text-emerald-400/90">
              Skills 1.C · 2.A · 2.D · 3.B
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
          <div className="grid grid-cols-4 gap-1 p-2 border-b border-emerald-500/15 bg-[#040d0a]/70">
            {[
              { id: 'graphs' as const, label: '1.C Graphs', icon: <LineChart className="w-3.5 h-3.5" /> },
              { id: 'derive' as const, label: '2.A Derive', icon: <BookOpen className="w-3.5 h-3.5" /> },
              { id: 'scale' as const, label: '2.D Scale', icon: <Scale className="w-3.5 h-3.5" /> },
              { id: 'claims' as const, label: '3.B Claims', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            ].map(tab => {
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
            {/* TAB 1: SKILL 1.C — QUALITATIVE SKETCHES OF GRAPHS               */}
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
                  <div className="text-[11px] font-bold text-emerald-300">{graphSpec.title}</div>

                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-auto rounded-lg bg-[#030907] border border-white/5"
                    role="img"
                    aria-label={graphSpec.title}
                  >
                    {/* Subtle horizontal gridlines */}
                    {[0.25, 0.5, 0.75, 1].map(f => (
                      <line
                        key={f}
                        x1={padL}
                        x2={svgW - padR}
                        y1={toSvgY(f)}
                        y2={toSvgY(f)}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                      />
                    ))}

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

                    {/* Boundary reference vertical line (e.g. r = R or a = 0) */}
                    {graphSpec.referenceXPos !== undefined && (
                      <>
                        <line
                          x1={toSvgX(graphSpec.referenceXPos)}
                          x2={toSvgX(graphSpec.referenceXPos)}
                          y1={padT}
                          y2={svgH - padB}
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={toSvgX(graphSpec.referenceXPos)}
                          y={padT - 6}
                          textAnchor="middle"
                          fill="#7dd3fc"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {graphSpec.referenceXLabel}
                        </text>
                      </>
                    )}

                    {/* Qualitative curve segments */}
                    {graphSpec.segments.map((seg, idx) => {
                      const d = seg
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
                          stroke={idx === 0 ? '#10b981' : '#f59e0b'}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {/* Live state marker dot */}
                    <circle
                      cx={toSvgX(graphSpec.xMarkerPos)}
                      cy={toSvgY(graphSpec.yMarkerPos)}
                      r="4.5"
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {(() => {
                      const mx = toSvgX(graphSpec.xMarkerPos);
                      const my = toSvgY(graphSpec.yMarkerPos);
                      const badgeW = Math.max(42, graphSpec.markerLabel.length * 5.6 + 10);
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
                            fillOpacity="0.92"
                            stroke="rgba(244,63,94,0.5)"
                            strokeWidth="0.8"
                          />
                          <text
                            x={rx + badgeW / 2}
                            y={ry + 10}
                            textAnchor="middle"
                            fill="#fda4af"
                            fontSize="8.5"
                            fontFamily="monospace"
                            fontWeight="700"
                          >
                            {graphSpec.markerLabel}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Axis labels */}
                    <text
                      x={svgW / 2 + 10}
                      y={svgH - 6}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {graphSpec.xAxisLabel}
                    </text>
                    <text
                      x={11}
                      y={svgH / 2 - 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      transform={`rotate(-90 11 ${svgH / 2 - 4})`}
                    >
                      {graphSpec.yAxisLabel}
                    </text>
                  </svg>

                  <ul className="space-y-1 text-[11px] text-slate-300 leading-snug pt-1">
                    {graphSpec.featureCallouts.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-mono">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Live Telemetry Summary Card */}
                <div className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 grid grid-cols-2 gap-2 font-mono tabular-nums text-[11px]">
                  {params.mode === 'universal_field' && (
                    <>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Field |g|</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.universal.fieldStrengthNPerKg.toFixed(2)} N/kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Force |F_g|</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.universal.gravitationalForceN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Free-Fall |a|</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.universal.observedAccelMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">g / g_surface</div>
                        <div className="text-emerald-300 font-bold">
                          {(evaluation.universal.ratioToSurfaceG * 100).toFixed(1)}%
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'near_surface' && (
                    <>
                      <div>
                        <div className="text-[9.5px] text-slate-400">g(h) at Altitude</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.nearSurface.gAtAltitude.toFixed(3)} N/kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Δg vs Surface</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.nearSurface.percentChange.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Heavy Accel a₁</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.nearSurface.heavyAccelMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Light Accel a₂</div>
                        <div className="text-emerald-300 font-bold">
                          {evaluation.nearSurface.lightAccelMs2.toFixed(2)} m/s²
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'apparent_weight' && (
                    <>
                      <div>
                        <div className="text-[9.5px] text-slate-400">True Weight F_g</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.apparent.trueWeightFgN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Apparent F_N</div>
                        <div className="text-emerald-300 font-bold">
                          {evaluation.apparent.apparentWeightFnN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">F_N / F_g Ratio</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.apparent.apparentRatio.toFixed(2)}×
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Net Force ΣF_y</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.apparent.netForceN >= 0 ? '+' : ''}
                          {evaluation.apparent.netForceN.toFixed(1)} N
                        </div>
                      </div>
                    </>
                  )}
                  {params.mode === 'shell_theorem' && (
                    <>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Enclosed m_partial</div>
                        <div className="text-emerald-300 font-bold">
                          {(evaluation.shell.partialMassFraction * 100).toFixed(1)}% M
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Field |g(r)|</div>
                        <div className="text-sky-300 font-bold">
                          {evaluation.shell.fieldStrengthNPerKg.toFixed(2)} N/kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Radial Force F_g</div>
                        <div className="text-amber-300 font-bold">
                          {evaluation.shell.signedRadialForceN.toFixed(1)} N
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-slate-400">Tunnel SHM Period</div>
                        <div className="text-rose-300 font-bold">
                          {evaluation.shell.shmPeriodMin.toFixed(1)} min
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
                <div className="grid grid-cols-2 gap-1">
                  {DERIVATION_PATHWAYS_26.map(pw => (
                    <button
                      key={pw.id}
                      onClick={() => {
                        setSelectedPathwayId(pw.id);
                        setRevealedSteps(1);
                      }}
                      className={`p-1.5 rounded-lg border text-left transition cursor-pointer ${
                        selectedPathwayId === pw.id
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[9.5px] font-mono text-emerald-400">{pw.ekCode}</div>
                      <div className="text-[10.5px] font-semibold truncate">{pw.title}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="text-[11px] text-slate-300 leading-snug">
                    <span className="font-bold text-emerald-300">Goal: </span>
                    {activePathway.goal}
                  </div>

                  <div className="space-y-2">
                    {activePathway.steps.slice(0, revealedSteps).map((st, idx) => (
                      <div
                        key={idx}
                        className="bg-[#071a13] border border-emerald-500/20 rounded-lg p-2 space-y-1"
                      >
                        <div className="text-[10px] font-mono text-emerald-400 font-bold">
                          {st.label}
                        </div>
                        <div className="font-mono text-xs text-white font-semibold">
                          {st.equation}
                        </div>
                        <div className="text-[10.5px] text-slate-300 leading-snug">
                          {st.justification}
                        </div>
                      </div>
                    ))}
                  </div>

                  {revealedSteps >= activePathway.steps.length && (
                    <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-lg p-2 font-mono text-[11px] text-emerald-200 font-bold">
                      Result: {activePathway.finalExpression}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {revealedSteps < activePathway.steps.length ? (
                      <button
                        onClick={() => setRevealedSteps(s => Math.min(activePathway.steps.length, s + 1))}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] transition cursor-pointer"
                      >
                        Next Step ({revealedSteps}/{activePathway.steps.length})
                      </button>
                    ) : (
                      <button
                        onClick={() => setRevealedSteps(1)}
                        className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Restart Derivation
                      </button>
                    )}
                    {revealedSteps < activePathway.steps.length && (
                      <button
                        onClick={() => setRevealedSteps(activePathway.steps.length)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Show All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: SKILL 2.D — FUNCTIONAL DEPENDENCE SCALING PREDICTOR      */}
            {/* =============================================================== */}
            {activeTab === 'scale' && (
              <div className="space-y-3">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                  <div className="text-[11px] font-bold text-emerald-300">
                    Predict Factors of Change (Skill 2.D)
                  </div>

                  {[
                    {
                      label: 'Source Mass Factor (M → k_M · M)',
                      value: massMFactor,
                      setter: setMassMFactor,
                    },
                    {
                      label: 'Test Mass Factor (m → k_m · m)',
                      value: testMassFactor,
                      setter: setTestMassFactor,
                    },
                    {
                      label: 'Distance Factor (r → k_r · r)',
                      value: distanceFactor,
                      setter: setDistanceFactor,
                    },
                  ].map(row => (
                    <div key={row.label} className="space-y-1">
                      <div className="text-[10.5px] text-slate-300 font-mono">{row.label}</div>
                      <div className="grid grid-cols-4 gap-1">
                        {SCALE_FACTORS.map(f => (
                          <button
                            key={f}
                            onClick={() => row.setter(f)}
                            className={`py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer ${
                              row.value === f
                                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                                : 'bg-[#071611] text-slate-300 border-white/10 hover:border-emerald-400/40'
                            }`}
                          >
                            {f}×
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-2 font-mono tabular-nums">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Universal |F_g| = GMm/r²</span>
                    <span className="text-amber-300 font-bold text-sm">
                      {scaling.universalForceFactor.toFixed(3)}×
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Field |g| = GM/r²</span>
                    <span className="text-sky-300 font-bold text-sm">
                      {scaling.fieldStrengthFactor.toFixed(3)}×
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Inside Sphere F = -kr (fixed ρ)</span>
                    <span className="text-emerald-300 font-bold text-sm">
                      {scaling.interiorUniformForceFactor.toFixed(2)}×
                    </span>
                  </div>
                  <p className="text-[10.5px] font-sans text-slate-300 leading-relaxed pt-1 border-t border-white/10">
                    {scaling.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: SKILL 3.B — AP CONCEPTUAL CLAIM VERIFIER                 */}
            {/* =============================================================== */}
            {activeTab === 'claims' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono bg-[#040d0a] border border-emerald-500/20 rounded-xl px-3 py-2">
                  <span className="text-slate-300">Verified Claims (Skill 3.B)</span>
                  <span className="text-emerald-300 font-bold tabular-nums">
                    {verifiedClaimCount} / {AP_CLAIMS_26.length}
                  </span>
                </div>

                {AP_CLAIMS_26.map(claim => {
                  const chosen = claimAnswers[claim.id];
                  const isCorrect = chosen === claim.verdict;
                  return (
                    <div
                      key={claim.id}
                      className="bg-[#040d0a] border border-white/10 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                        <span>EK {claim.ekCode}</span>
                        {chosen && (
                          <span
                            className={`flex items-center gap-1 font-bold ${
                              isCorrect ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Re-check
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug">{claim.statement}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['true', 'false'] as const).map(choice => (
                          <button
                            key={choice}
                            onClick={() =>
                              setClaimAnswers(prev => ({ ...prev, [claim.id]: choice }))
                            }
                            className={`py-1 rounded-lg font-mono text-[10.5px] font-bold border transition cursor-pointer ${
                              chosen === choice
                                ? choice === claim.verdict
                                  ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                                  : 'bg-rose-500/30 text-rose-200 border-rose-400'
                                : 'bg-[#071611] text-slate-300 border-white/10 hover:border-emerald-400/40'
                            }`}
                          >
                            {choice === 'true' ? 'True' : 'False'}
                          </button>
                        ))}
                      </div>
                      {chosen && (
                        <p className="text-[10.5px] text-slate-300 leading-snug pt-1 border-t border-white/10">
                          {claim.explanation}
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
