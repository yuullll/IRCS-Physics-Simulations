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
  Newton23Evaluation,
  Newton23Params,
  Newton23Record,
  TOPIC_23_CLAIM_QUESTIONS,
} from '@/lib/physics/newton-third-law-2-3';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Newton23AnalysisPanelProps {
  params: Newton23Params;
  evaluation: Newton23Evaluation;
  records: Newton23Record[];
  onRecordTrial: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'diagram' | 'comp' | 'claim' | 'justify';

export const Newton23AnalysisPanel: React.FC<Newton23AnalysisPanelProps> = ({
  params,
  evaluation,
  records,
  onRecordTrial,
  onClearRecords,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalysisTab>('diagram');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const { diagramLayout: diag } = evaluation;
  const verifiedCount = TOPIC_23_CLAIM_QUESTIONS.filter(
    q => selectedAnswers[q.id] === q.correctId
  ).length;

  return (
    <aside
      aria-label="Newton's Third Law Analysis Panel"
      className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight truncate">
              Third-Law &amp; Tension Analysis
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
                { id: 'diagram', label: '1.A Diag', icon: <Activity className="w-3 h-3" /> },
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

          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* =============================================================== */}
            {/* TAB 1: 1.A PAIRED FBD / TENSION PROFILE / PULLEY SCHEMATIC      */}
            {/* =============================================================== */}
            {activeTab === 'diagram' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-emerald-300">
                      {diag.kind === 'paired_fbd'
                        ? 'Paired Free-Body Diagrams (2.3.A.1)'
                        : diag.kind === 'tension_profile'
                        ? 'Tension Profile T(s) vs. Position s/L'
                        : 'Pulley Cord Tension Comparison (T_A vs T_B)'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Skill 1.A</span>
                  </div>

                  {/* Paired FBD Diagram (Modes 1 & 2) */}
                  {diag.kind === 'paired_fbd' && (
                    <svg
                      viewBox={`0 0 ${diag.width} ${diag.height}`}
                      className="w-full h-[186px] bg-[#020806] rounded-lg border border-emerald-500/15"
                      role="img"
                      aria-label="Paired Newton's Third Law Free-Body Diagrams"
                    >
                      {/* Center dividing separator */}
                      <line
                        x1={diag.width / 2}
                        y1={14}
                        x2={diag.width / 2}
                        y2={diag.height - 14}
                        stroke="#1e293b"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />

                      {diag.boxes.map((box, bIdx) => (
                        <g key={bIdx}>
                          <text
                            x={box.dotX}
                            y={15}
                            fill={box.accentHex}
                            fontSize="9.5"
                            fontWeight="700"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {box.objectTitle}
                          </text>

                          {box.arrows.map(a => {
                            const dx = a.x2 - a.x1;
                            const dy = a.y2 - a.y1;
                            const len = Math.hypot(dx, dy) || 1;
                            const ux = dx / len;
                            const uy = dy / len;
                            const ah = 6;
                            const aw = 3.2;
                            const tipX = a.x2;
                            const tipY = a.y2;
                            const p1x = tipX - ux * ah - uy * aw;
                            const p1y = tipY - uy * ah + ux * aw;
                            const p2x = tipX - ux * ah + uy * aw;
                            const p2y = tipY - uy * ah - ux * aw;
                            return (
                              <g key={a.id}>
                                <line
                                  x1={a.x1}
                                  y1={a.y1}
                                  x2={tipX - ux * 3}
                                  y2={tipY - uy * 3}
                                  stroke={a.colorHex}
                                  strokeWidth={a.isThirdLawMember ? 2.6 : 1.9}
                                  strokeLinecap="round"
                                />
                                <polygon
                                  points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`}
                                  fill={a.colorHex}
                                />
                                <text
                                  x={a.labelX}
                                  y={a.labelY}
                                  fill={a.colorHex}
                                  fontSize="8.5"
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

                          {/* COM Dot */}
                          <circle
                            cx={box.dotX}
                            cy={box.dotY}
                            r="4.2"
                            fill="#f8fafc"
                            stroke={box.accentHex}
                            strokeWidth="1.6"
                          />
                        </g>
                      ))}

                      {/* Dashed 3rd-Law Pair Linker between Object A and Object B */}
                      {diag.pairConnector && (
                        <g>
                          <path
                            d={`M ${diag.pairConnector.x1} ${diag.pairConnector.y1} Q ${
                              diag.width / 2
                            } ${diag.height - 18} ${diag.pairConnector.x2} ${diag.pairConnector.y2}`}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="1.3"
                            strokeDasharray="4 3"
                          />
                          <text
                            x={diag.width / 2}
                            y={diag.height - 6}
                            fill="#fda4af"
                            fontSize="8.5"
                            fontWeight="700"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {diag.pairConnector.label}
                          </text>
                        </g>
                      )}
                    </svg>
                  )}

                  {/* Tension Profile Graph T(s) (Mode 3) */}
                  {diag.kind === 'tension_profile' && diag.tensionCurve && (
                    <svg
                      viewBox={`0 0 ${diag.width} ${diag.height}`}
                      className="w-full h-[186px] bg-[#020806] rounded-lg border border-emerald-500/15"
                      role="img"
                      aria-label="Tension versus position along string graph"
                    >
                      {/* Axes */}
                      <line x1="46" y1="22" x2="46" y2="152" stroke="#475569" strokeWidth="1.2" />
                      <line x1="46" y1="152" x2="300" y2="152" stroke="#475569" strokeWidth="1.2" />
                      {/* Gridlines & Y labels */}
                      {[0, 0.5, 1].map((frac, idx) => {
                        const y = 152 - frac * 130;
                        const val = (diag.tMaxAxisN || 100) * frac;
                        return (
                          <g key={idx}>
                            <line
                              x1="46"
                              y1={y}
                              x2="300"
                              y2={y}
                              stroke="#1e293b"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                            />
                            <text
                              x="40"
                              y={y + 3}
                              fill="#94a3b8"
                              fontSize="8.5"
                              fontFamily="monospace"
                              textAnchor="end"
                            >
                              {val.toFixed(0)}
                            </text>
                          </g>
                        );
                      })}
                      {/* Axis titles */}
                      <text
                        x="12"
                        y="86"
                        fill="#34d399"
                        fontSize="8.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                        transform="rotate(-90 12 86)"
                      >
                        Tension T (N)
                      </text>
                      <text x="173" y="176" fill="#94a3b8" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
                        Position s/L (0 = Load End → 1 = Pull/Top End)
                      </text>

                      {/* T(s) line */}
                      <polyline
                        fill="none"
                        stroke={evaluation.isTensionUniform ? '#10b981' : '#f59e0b'}
                        strokeWidth="2.6"
                        points={diag.tensionCurve.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
                      />

                      {/* Probe Segment highlight dot */}
                      {diag.probePoint && (
                        <g>
                          <line
                            x1={diag.probePoint.x}
                            y1={diag.probePoint.y}
                            x2={diag.probePoint.x}
                            y2={152}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                          />
                          <circle
                            cx={diag.probePoint.x}
                            cy={diag.probePoint.y}
                            r="4.5"
                            fill="#f59e0b"
                            stroke="#040d0a"
                            strokeWidth="1.5"
                          />
                          <text
                            x={Math.min(255, Math.max(85, diag.probePoint.x))}
                            y={Math.max(30, diag.probePoint.y - 10)}
                            fill="#fde68a"
                            fontSize="8.8"
                            fontWeight="700"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            Seg #{params.probeSegmentIndex + 1}: {diag.probePoint.tensionN.toFixed(1)} N
                          </text>
                        </g>
                      )}
                    </svg>
                  )}

                  {/* Pulley Tension Comparison Bar Schematic (Mode 4) */}
                  {diag.kind === 'pulley_compare' && diag.pulleyBars && (
                    <svg
                      viewBox={`0 0 ${diag.width} ${diag.height}`}
                      className="w-full h-[186px] bg-[#020806] rounded-lg border border-emerald-500/15"
                      role="img"
                      aria-label="Pulley tension T_A versus T_B comparison"
                    >
                      {(() => {
                        const b = diag.pulleyBars!;
                        const maxVal = Math.max(20, b.valueA, b.valueB, b.axleLoadN) * 1.15;
                        const hA = Math.max(8, (b.valueA / maxVal) * 108);
                        const hB = Math.max(8, (b.valueB / maxVal) * 108);
                        const hAxle = Math.max(8, (b.axleLoadN / maxVal) * 108);
                        const baseY = 148;
                        return (
                          <>
                            <line x1="28" y1={baseY} x2="294" y2={baseY} stroke="#475569" strokeWidth="1.2" />
                            {/* Bar T_A */}
                            <rect x="48" y={baseY - hA} width="54" height={hA} rx="5" fill="#10b981" />
                            <text x="75" y={baseY - hA - 6} fill="#34d399" fontSize="9.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                              {b.valueA.toFixed(1)} N
                            </text>
                            <text x="75" y={baseY + 14} fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
                              T_A
                            </text>

                            {/* Bar T_B */}
                            <rect
                              x="133"
                              y={baseY - hB}
                              width="54"
                              height={hB}
                              rx="5"
                              fill={b.isEqual ? '#10b981' : '#f43f5e'}
                            />
                            <text
                              x="160"
                              y={baseY - hB - 6}
                              fill={b.isEqual ? '#34d399' : '#fda4af'}
                              fontSize="9.5"
                              fontWeight="700"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {b.valueB.toFixed(1)} N
                            </text>
                            <text x="160" y={baseY + 14} fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
                              T_B
                            </text>

                            {/* Bar F_axle */}
                            <rect x="218" y={baseY - hAxle} width="54" height={hAxle} rx="5" fill="#38bdf8" />
                            <text x="245" y={baseY - hAxle - 6} fill="#7dd3fc" fontSize="9.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                              {b.axleLoadN.toFixed(1)} N
                            </text>
                            <text x="245" y={baseY + 14} fill="#cbd5e1" fontSize="9" fontFamily="monospace" textAnchor="middle">
                              |F_axle|
                            </text>

                            <text
                              x="160"
                              y="18"
                              fill={b.isEqual ? '#34d399' : '#fbbf24'}
                              fontSize="9.5"
                              fontWeight="700"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {b.isEqual ? 'Ideal Pulley: T_A = T_B' : `Real Pulley: |T_B - T_A| = ${Math.abs(b.valueB - b.valueA).toFixed(1)} N`}
                            </text>
                          </>
                        );
                      })()}
                    </svg>
                  )}
                </div>

                {/* Live Third-Law Verification Readout */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-emerald-300">Third-Law Audit</span>
                    <MathFormula formulaKey="sim-newton23" className="text-rose-300 text-[11px]" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-100 leading-snug">
                    {evaluation.thirdLawStatus}
                  </div>
                </div>

                {/* Agent-on-Object Force Ledger */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-300">
                    Active Force Interactions (Agent → Object)
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                    {[...evaluation.forcesA, ...evaluation.forcesB].map(f => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10.5px]"
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-bold" style={{ color: f.colorHex }}>
                            {f.symbol}
                          </span>
                          <span className="text-slate-400 ml-1.5">{f.agent} → {f.onObject}</span>
                        </div>
                        <span className="font-mono tabular-nums text-slate-100 shrink-0">
                          {f.magnitude.toFixed(1)} N
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 2: 2.C QUANTITATIVE COMPARISON & TRIAL LOGGER               */}
            {/* =============================================================== */}
            {activeTab === 'comp' && (
              <>
                <div className="space-y-2">
                  {evaluation.comparisonRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold text-emerald-300">
                          {row.metric}
                        </span>
                        <span className="text-[9.5px] font-mono text-amber-300">{row.relation}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[10.5px]">
                        <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                          <div className="text-[9.5px] text-slate-400">{row.leftLabel}</div>
                          <div className="text-white font-bold tabular-nums">{row.leftValue}</div>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                          <div className="text-[9.5px] text-slate-400">{row.rightLabel}</div>
                          <div className="text-white font-bold tabular-nums">{row.rightValue}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trial Logger */}
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold text-white">
                      Skill 2.C Trial Comparison Log ({records.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={onRecordTrial}
                        className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Record Trial</span>
                      </button>
                      {records.length > 0 && (
                        <button
                          onClick={onClearRecords}
                          aria-label="Clear recorded trials"
                          className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 cursor-pointer transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {records.length === 0 ? (
                    <div className="text-[10.5px] text-slate-400 leading-relaxed py-2">
                      Change masses, rope mass (Ideal vs Massive), or pulley model and click{' '}
                      <strong className="text-emerald-300">Record Trial</strong> to compare quantities
                      side by side.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {records.map((rec, i) => (
                        <div
                          key={rec.id}
                          className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-[10px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300">
                              #{i + 1} · {rec.modeLabel}
                            </span>
                            <span className="font-mono text-slate-400">{rec.setupSummary}</span>
                          </div>
                          <div className="flex items-center justify-between font-mono text-slate-200 tabular-nums">
                            <span>
                              {rec.qtyALabel}: <strong>{rec.qtyAValue}</strong>
                            </span>
                            <span>
                              {rec.qtyBLabel}: <strong>{rec.qtyBValue}</strong>
                            </span>
                          </div>
                          <div className="text-amber-300 font-mono text-[9.5px]">{rec.keyResult}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* =============================================================== */}
            {/* TAB 3: 3.B AP CONCEPTUAL CLAIM CHECKS                           */}
            {/* =============================================================== */}
            {activeTab === 'claim' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-[#040d0a] border border-emerald-500/20 rounded-xl px-3 py-2">
                  <span className="text-[10.5px] font-semibold text-emerald-300">
                    Skill 3.B · Claim Mastery
                  </span>
                  <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                    {verifiedCount} / {TOPIC_23_CLAIM_QUESTIONS.length} Verified
                  </span>
                </div>

                {TOPIC_23_CLAIM_QUESTIONS.map((q, qIdx) => {
                  const chosen = selectedAnswers[q.id];
                  const isCorrect = chosen === q.correctId;
                  return (
                    <div
                      key={q.id}
                      className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9.5px] text-emerald-400">
                          Check {qIdx + 1} · EK {q.ekCode}
                        </span>
                        {chosen &&
                          (isCorrect ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Revise
                            </span>
                          ))}
                      </div>
                      <p className="text-[11px] text-slate-100 leading-snug">{q.prompt}</p>
                      <div className="space-y-1">
                        {q.options.map(opt => {
                          const isPicked = chosen === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() =>
                                setSelectedAnswers(prev => ({ ...prev, [q.id]: opt.id }))
                              }
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${
                                isPicked
                                  ? opt.id === q.correctId
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                                    : 'bg-rose-500/20 border-rose-400 text-rose-100'
                                  : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                              }`}
                            >
                              {opt.text}
                            </button>
                          );
                        })}
                      </div>
                      {chosen && (
                        <div className="text-[10.5px] text-slate-300 bg-white/[0.03] rounded-lg p-2 leading-relaxed">
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: 3.C LIVE DERIVATION & JUSTIFICATION                      */}
            {/* =============================================================== */}
            {activeTab === 'justify' && (
              <div className="space-y-2.5">
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    Live Governing Equations
                  </div>
                  {evaluation.equations.map((eq, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-[10.5px] text-slate-100 bg-white/[0.03] rounded-lg px-2.5 py-1.5 leading-snug"
                    >
                      {eq}
                    </div>
                  ))}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    Skill 3.C · Evidence-Based Justification
                  </div>
                  {evaluation.justificationSteps.map((s, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="text-[11px] font-bold text-white">{s.step}</div>
                      <p className="text-[10.5px] text-slate-300 leading-relaxed">{s.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default Newton23AnalysisPanel;
