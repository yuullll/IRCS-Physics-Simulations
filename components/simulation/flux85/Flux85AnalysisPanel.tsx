'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  HelpCircle,
  Plus,
  Sigma,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Flux85Evaluation,
  Flux85Params,
  FluxComparisonRecord,
  TOPIC_8_5_CLAIMS,
  computeFluxGraphLayout,
  getFluxDerivationSteps85,
} from '@/lib/physics/electric-flux-8-5';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Flux85AnalysisPanelProps {
  params: Flux85Params;
  evaluation: Flux85Evaluation;
  records: FluxComparisonRecord[];
  onRecordComparison: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'diagrams' | 'derive' | 'compare' | 'claims';

const SCENARIO_SHORT: Record<Flux85Params['scenario'], string> = {
  uniform_open: 'Open',
  nonuniform_integral: '∫E·dA',
  closed_cube: 'Cube',
  closed_curved: 'Curved',
};

export const Flux85AnalysisPanel: React.FC<Flux85AnalysisPanelProps> = ({
  params,
  evaluation,
  records,
  onRecordComparison,
  onClearRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('diagrams');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const graphLayout = useMemo(
    () => computeFluxGraphLayout(params, evaluation, 316, 166),
    [params, evaluation]
  );

  const derivationSteps = useMemo(
    () => getFluxDerivationSteps85(params, evaluation),
    [params, evaluation]
  );

  const signStyle =
    evaluation.fluxSign === 'positive'
      ? 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10'
      : evaluation.fluxSign === 'negative'
      ? 'text-rose-300 border-rose-500/35 bg-rose-500/10'
      : 'text-slate-300 border-white/15 bg-white/5';

  const signText =
    evaluation.fluxSign === 'positive'
      ? '+ Outward'
      : evaluation.fluxSign === 'negative'
      ? '− Inward'
      : '0 Zero';

  return (
    <div className="flex flex-col space-y-3">
      {/* 4 AP Physics C Topic 8.5 Suggested Skill Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-[#050811] p-1 rounded-xl border border-white/10">
        {(
          [
            { id: 'diagrams', label: '1.A Charts', icon: Activity },
            { id: 'derive', label: '2.A Derive', icon: Sigma },
            { id: 'compare', label: '2.C Compare', icon: FileSpreadsheet },
            { id: 'claims', label: '3.B Claims', icon: HelpCircle },
          ] as const
        ).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                active
                  ? 'bg-sky-400 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Skill 1.A Diagrams & Charts */}
      {activeTab === 'diagrams' && (
        <div className="space-y-2.5">
          {/* 3 Tabular Live Telemetry Readouts */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-[#050811] border border-sky-500/25 rounded-xl p-2">
              <div className="text-[9px] font-mono text-slate-400">Exact Φ_E</div>
              <div className="text-sm font-mono font-bold tabular-nums text-sky-300 mt-0.5">
                {evaluation.exactFlux >= 0 ? '+' : ''}
                {evaluation.exactFlux.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">kN·m²/C</div>
            </div>
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2">
              <div className="text-[9px] font-mono text-slate-400">
                {params.scenario === 'uniform_open' ? 'Proj. A⊥' : 'Total Area'}
              </div>
              <div className="text-sm font-mono font-bold tabular-nums text-amber-300 mt-0.5">
                {(params.scenario === 'uniform_open'
                  ? evaluation.projectedAreaM2
                  : evaluation.totalAreaM2
                ).toFixed(2)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">m²</div>
            </div>
            <div className={`border rounded-xl p-2 ${signStyle}`}>
              <div className="text-[9px] font-mono opacity-80">Flux Sign</div>
              <div className="text-xs font-mono font-bold mt-1">{signText}</div>
              <div className="text-[9px] font-mono opacity-75">
                {params.scenario === 'nonuniform_integral'
                  ? `Err ${evaluation.errorPercent.toFixed(1)}%`
                  : '8.5.A.2.ii'}
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart (Cosine / Profile / Face Bar Chart) */}
          <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-200 truncate">{graphLayout.title}</span>
              <span className="font-mono text-sky-400 shrink-0 ml-1">1.A</span>
            </div>

            <svg
              viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
              className="w-full h-[166px] rounded-lg bg-[#03060d] border border-white/5"
              role="img"
              aria-label={graphLayout.title}
            >
              {/* Zero horizontal baseline */}
              <line
                x1={34}
                y1={graphLayout.zeroY}
                x2={graphLayout.width - 14}
                y2={graphLayout.zeroY}
                stroke="#334155"
                strokeWidth="1"
              />
              {/* Left Y axis */}
              <line
                x1={34}
                y1={18}
                x2={34}
                y2={graphLayout.height - 26}
                stroke="#334155"
                strokeWidth="1"
              />

              {graphLayout.mode === 'cosine_angle' && (
                <>
                  {/* 90 deg zero-crossing vertical guide */}
                  <line
                    x1={34 + (graphLayout.width - 48) * 0.5}
                    y1={18}
                    x2={34 + (graphLayout.width - 48) * 0.5}
                    y2={graphLayout.height - 26}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <path
                    d={graphLayout.exactPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                  />
                  <circle
                    cx={graphLayout.markerX}
                    cy={graphLayout.markerY}
                    r="5.5"
                    fill="#fbbf24"
                    stroke="#050811"
                    strokeWidth="1.8"
                  />
                  <text x="36" y={graphLayout.height - 8} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    0° (+Max)
                  </text>
                  <text
                    x={34 + (graphLayout.width - 48) * 0.5}
                    y={graphLayout.height - 8}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    90° (0)
                  </text>
                  <text
                    x={graphLayout.width - 14}
                    y={graphLayout.height - 8}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    180° (−Max)
                  </text>
                </>
              )}

              {graphLayout.mode === 'profile_y' && (
                <>
                  {graphLayout.discretePath && (
                    <path
                      d={graphLayout.discretePath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                  )}
                  <path
                    d={graphLayout.exactPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                  />
                  <circle
                    cx={graphLayout.markerX}
                    cy={graphLayout.markerY}
                    r="5.2"
                    fill="#fbbf24"
                    stroke="#050811"
                    strokeWidth="1.6"
                  />
                  <text
                    x={graphLayout.width / 2}
                    y={graphLayout.height - 8}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {graphLayout.xLabel}
                  </text>
                </>
              )}

              {graphLayout.mode === 'face_bars' && (
                <>
                  {graphLayout.bars.map((bar, idx) => {
                    const fill =
                      bar.sign === 'positive'
                        ? '#10b981'
                        : bar.sign === 'negative'
                        ? '#f43f5e'
                        : '#64748b';
                    const isNet = idx === graphLayout.bars.length - 1;
                    return (
                      <g key={`${bar.label}-${idx}`}>
                        <rect
                          x={bar.x}
                          y={bar.y}
                          width={bar.w}
                          height={bar.h}
                          rx="3"
                          fill={fill}
                          fillOpacity={isNet ? 0.95 : 0.78}
                          stroke={isNet ? '#f8fafc' : 'none'}
                          strokeWidth={isNet ? 1.2 : 0}
                        />
                        <text
                          x={bar.x + bar.w / 2}
                          y={graphLayout.height - 8}
                          textAnchor="middle"
                          fill={isNet ? '#f8fafc' : '#94a3b8'}
                          fontSize="7.8"
                          fontFamily="monospace"
                          fontWeight={isNet ? 'bold' : 'normal'}
                        >
                          {bar.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* Y-axis min/max labels */}
              <text x="4" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {graphLayout.yMax.toFixed(0)}
              </text>
              <text x="4" y={graphLayout.height - 28} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {graphLayout.yMin.toFixed(0)}
              </text>
            </svg>

            <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
              <span className="text-emerald-300">+ Outgoing / Aligned</span>
              <span className="text-slate-400">0 Grazing (90°)</span>
              <span className="text-rose-300">− Incoming / Opposed</span>
            </div>
          </div>

          {/* Essential Knowledge Summary Card */}
          <div className="bg-[#050811] border border-sky-500/20 rounded-xl p-2.5 space-y-1">
            <div className="text-[10px] font-bold text-sky-300 font-mono">
              AP Physics C · Essential Knowledge
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{evaluation.ekSummary}</p>
          </div>
        </div>
      )}

      {/* TAB 2: Skill 2.A Symbolic Derivation */}
      {activeTab === 'derive' && (
        <div className="space-y-2">
          <div className="text-[10.5px] text-slate-400 px-0.5 flex items-center flex-wrap gap-1.5">
            <span>Symbolic derivation pathway:</span>
            <span className="text-sky-300">
              <MathFormula formulaKey="sim-flux85" />
            </span>
          </div>
          {derivationSteps.map(step => (
            <div
              key={step.stepNumber}
              className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                    {step.stepNumber}
                  </span>
                  <span className="text-[11px] font-bold text-slate-100">{step.title}</span>
                </div>
                <span className="text-[9.5px] font-mono text-sky-300 shrink-0">{step.ekRef}</span>
              </div>
              <div className="font-mono text-[10.5px] text-amber-200 bg-[#080f20] px-2 py-1 rounded-lg border border-white/5 break-words">
                {step.symbolic}
              </div>
              <div className="text-[10px] font-mono text-slate-400">{step.liveSubstitution}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Skill 2.C Compare Scenarios & Face-by-Face Table */}
      {activeTab === 'compare' && (
        <div className="space-y-2.5">
          {/* Entering vs Exiting Balance */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#050811] border border-rose-500/25 rounded-xl p-2">
              <div className="text-[9.5px] font-mono text-rose-300">Entering (−) Flux</div>
              <div className="text-sm font-mono font-bold tabular-nums text-rose-300 mt-0.5">
                −{evaluation.inFluxMag.toFixed(2)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">kN·m²/C</div>
            </div>
            <div className="bg-[#050811] border border-emerald-500/25 rounded-xl p-2">
              <div className="text-[9.5px] font-mono text-emerald-300">Exiting (+) Flux</div>
              <div className="text-sm font-mono font-bold tabular-nums text-emerald-300 mt-0.5">
                +{evaluation.outFluxMag.toFixed(2)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">kN·m²/C</div>
            </div>
          </div>

          {/* Face-by-Face Breakdown Table */}
          <div className="bg-[#050811] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Face-by-Face Flux Table</span>
              <span>Φ = E · A</span>
            </div>
            <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
              {evaluation.faces.map(face => (
                <div
                  key={face.id}
                  className="px-2.5 py-1.5 text-[10px] font-mono flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 truncate text-slate-200">{face.label}</div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-slate-400">{face.angleDeg}°</span>
                    <span
                      className={`font-bold ${
                        face.sign === 'positive'
                          ? 'text-emerald-300'
                          : face.sign === 'negative'
                          ? 'text-rose-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {face.fluxKNm2C >= 0 ? '+' : ''}
                      {face.fluxKNm2C.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Logger Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRecordComparison}
              className="flex-1 py-2 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Comparison</span>
            </button>
            {records.length > 0 && (
              <button
                type="button"
                onClick={onClearRecords}
                aria-label="Clear comparison log"
                className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#050811] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>2.C Comparison Log ({records.length})</span>
              <span>Cross-Scenario</span>
            </div>
            {records.length === 0 ? (
              <div className="p-2.5 text-[11px] text-slate-400 text-center">
                Test different angles, radii, or closed shapes and click{' '}
                <span className="text-sky-300 font-semibold">Record Comparison</span> to compare
                flux magnitudes side-by-side.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                {records.map(rec => (
                  <div
                    key={rec.id}
                    className="px-2.5 py-1.5 text-[10px] font-mono flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">
                        {SCENARIO_SHORT[rec.scenario]} · {rec.label}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate">{rec.notes}</div>
                    </div>
                    <div
                      className={`font-bold shrink-0 tabular-nums ${
                        rec.sign === 'positive'
                          ? 'text-emerald-300'
                          : rec.sign === 'negative'
                          ? 'text-rose-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {rec.exactFlux >= 0 ? '+' : ''}
                      {rec.exactFlux.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Skill 3.B Law & Definition Claims */}
      {activeTab === 'claims' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
            <span className="flex items-center gap-1 text-sky-300 font-bold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              3.B Electric Flux Claims Check
            </span>
            <span className="tabular-nums">
              {TOPIC_8_5_CLAIMS.filter(c => selectedAnswers[c.id] === c.correctOptionId).length}/
              {TOPIC_8_5_CLAIMS.length} Verified
            </span>
          </div>

          {TOPIC_8_5_CLAIMS.map((claim, idx) => {
            const chosen = selectedAnswers[claim.id];
            const isCorrect = chosen === claim.correctOptionId;
            return (
              <div
                key={claim.id}
                className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-sky-300">
                    Q{idx + 1} · Skill {claim.skill}
                  </span>
                  <span className="text-slate-400">{claim.ekRef}</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-200 font-medium">
                  {claim.prompt}
                </p>
                <div className="space-y-1">
                  {claim.options.map(opt => {
                    const isSelected = chosen === opt.id;
                    const optIsRight = opt.id === claim.correctOptionId;
                    let cls =
                      'bg-[#0a1124] border-white/10 text-slate-300 hover:border-sky-400/50 hover:text-white';
                    if (isSelected && optIsRight) {
                      cls = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold';
                    } else if (isSelected && !optIsRight) {
                      cls = 'bg-rose-500/20 border-rose-400 text-rose-200';
                    }
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSelectedAnswers(prev => ({ ...prev, [claim.id]: opt.id }))
                        }
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] transition cursor-pointer ${cls}`}
                      >
                        <span className="font-mono uppercase mr-1.5 opacity-75">{opt.id}.</span>
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                {chosen && (
                  <div
                    className={`p-2 rounded-lg text-[10.5px] leading-relaxed border flex items-start gap-1.5 ${
                      isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span>{claim.justification}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
