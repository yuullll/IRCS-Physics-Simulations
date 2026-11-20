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
  Distribution84Evaluation,
  Distribution84Params,
  DistributionComparisonRecord,
  TOPIC_8_4_CLAIMS,
  computeDistributionGraphLayout,
  getDerivationSteps84,
} from '@/lib/physics/charge-distributions-8-4';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Distributions84AnalysisPanelProps {
  params: Distribution84Params;
  evaluation: Distribution84Evaluation;
  records: DistributionComparisonRecord[];
  onRecordComparison: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'graphs' | 'derive' | 'compare' | 'claims';

const DIST_SHORT_NAMES: Record<Distribution84Params['distribution'], string> = {
  thin_ring: 'Ring',
  arc_center: 'Arc',
  finite_line_bisector: 'Bisect',
  finite_line_collinear: 'Collin',
  infinite_wire: 'Wire',
};

export const Distributions84AnalysisPanel: React.FC<Distributions84AnalysisPanelProps> = ({
  params,
  evaluation,
  records,
  onRecordComparison,
  onClearRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('graphs');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const graphLayout = useMemo(
    () => computeDistributionGraphLayout(params, 316, 166),
    [params]
  );

  const derivationSteps = useMemo(
    () => getDerivationSteps84(params, evaluation),
    [params, evaluation]
  );

  const errorBadgeClass =
    evaluation.riemannErrorPercent < 1.5
      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : evaluation.riemannErrorPercent < 6
      ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
      : 'text-rose-300 border-rose-500/30 bg-rose-500/10';

  return (
    <div className="flex flex-col space-y-3">
      {/* 4 AP Physics C Skill Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-[#050811] p-1 rounded-xl border border-white/10">
        {(
          [
            { id: 'graphs', label: '1.C Graphs', icon: Activity },
            { id: 'derive', label: '2.A Derive', icon: Sigma },
            { id: 'compare', label: '2.C Compare', icon: FileSpreadsheet },
            { id: 'claims', label: '3.C Claims', icon: HelpCircle },
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

      {/* TAB 1: Skill 1.C Quantitative & Qualitative Field Profile Graphs */}
      {activeTab === 'graphs' && (
        <div className="space-y-2.5">
          {/* Live Numerical Field Telemetry */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-[#050811] border border-sky-500/25 rounded-xl p-2">
              <div className="text-[9px] font-mono text-slate-400 uppercase">Exact ∫ E</div>
              <div className="text-sm font-mono font-bold text-sky-300 mt-0.5">
                {evaluation.exactE.x >= 0 ? '+' : ''}
                {evaluation.exactE.x.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">kN/C</div>
            </div>
            <div className="bg-[#050811] border border-amber-500/25 rounded-xl p-2">
              <div className="text-[9px] font-mono text-slate-400 uppercase">
                Sum (N={params.segmentsN})
              </div>
              <div className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                {evaluation.riemannE.x >= 0 ? '+' : ''}
                {evaluation.riemannE.x.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono text-slate-500">kN/C</div>
            </div>
            <div className={`border rounded-xl p-2 ${errorBadgeClass}`}>
              <div className="text-[9px] font-mono opacity-80 uppercase">Riemann Err</div>
              <div className="text-sm font-mono font-bold mt-0.5">
                {evaluation.riemannErrorPercent.toFixed(2)}%
              </div>
              <div className="text-[9px] font-mono opacity-75">
                {evaluation.riemannErrorPercent < 1.5 ? 'Converged' : 'Raise N →'}
              </div>
            </div>
          </div>

          {/* Interactive Profile SVG Plot */}
          <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-200">
                1.C Profile: {graphLayout.yLabel} vs {graphLayout.xLabel.split(' ')[0]}
              </span>
              <span className="font-mono text-sky-400">
                λ = {evaluation.lambdaMicroPerM.toFixed(2)} μC/m
              </span>
            </div>

            <svg
              viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
              className="w-full h-[166px] rounded-lg bg-[#03060d] border border-white/5"
              role="img"
              aria-label={`Electric field graph ${graphLayout.yLabel} versus ${graphLayout.xLabel}`}
            >
              {/* Zero baseline */}
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

              {/* Point-charge reference curve (dotted slate) */}
              <path
                d={graphLayout.pointRefPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />

              {/* Discrete Riemann sum curve (dashed amber) */}
              <path
                d={graphLayout.riemannPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.6"
                strokeDasharray="5 3"
              />

              {/* Exact Calculus Integral curve (solid sky) */}
              <path
                d={graphLayout.exactPath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
              />

              {/* Special AP feature marker (Peak R/√2 or 180° Semi) */}
              {graphLayout.specialMarker && (
                <g>
                  <line
                    x1={graphLayout.specialMarker.x}
                    y1={18}
                    x2={graphLayout.specialMarker.x}
                    y2={graphLayout.height - 26}
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.7"
                  />
                  <circle
                    cx={graphLayout.specialMarker.x}
                    cy={graphLayout.specialMarker.y}
                    r="3.2"
                    fill="#10b981"
                  />
                  <text
                    x={Math.min(graphLayout.width - 58, graphLayout.specialMarker.x + 6)}
                    y={14}
                    fill="#34d399"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {graphLayout.specialMarker.label}
                  </text>
                </g>
              )}

              {/* Live Probe Marker */}
              <circle
                cx={graphLayout.markerX}
                cy={graphLayout.markerY}
                r="5.5"
                fill="#fbbf24"
                stroke="#050811"
                strokeWidth="1.8"
              />

              {/* Axis range labels */}
              <text x="4" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {graphLayout.yMax.toFixed(0)}
              </text>
              <text x="4" y={graphLayout.height - 28} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {graphLayout.yMin.toFixed(0)}
              </text>
              <text x="34" y={graphLayout.height - 8} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                {graphLayout.paramMin.toFixed(1)}
              </text>
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
              <text
                x={graphLayout.width - 14}
                y={graphLayout.height - 8}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="8"
                fontFamily="monospace"
              >
                {graphLayout.paramMax.toFixed(1)}
              </text>
            </svg>

            {/* Compact Curve Legend */}
            <div className="flex items-center justify-between text-[9.5px] font-mono pt-0.5 text-slate-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-sky-400" />
                Exact ∫
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 border-b border-dashed border-amber-400" />
                Riemann (N)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 border-b border-dotted border-slate-400" />
                Point kQ/r²
              </span>
            </div>
          </div>

          {/* Symmetry Explanation Card (EK 8.4.A.2) */}
          <div className="bg-[#050811] border border-sky-500/20 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                EK 8.4.A.2 Symmetry Principle
              </span>
              <span className="text-[9.5px] font-mono text-emerald-300">
                |dE⊥+dE′⊥| = {evaluation.symmetry.cancellationResidual.toFixed(4)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {evaluation.symmetry.symmetryExplanation}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Skill 2.A Symbolic Calculus Derivation */}
      {activeTab === 'derive' && (
        <div className="space-y-2">
          <div className="text-[10.5px] text-slate-400 px-0.5 flex items-center flex-wrap gap-1">
            <span>Step-by-step AP Physics C calculus pathway:</span>
            <span className="text-sky-300">
              <MathFormula formulaKey="sim-distributions84" />
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
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-sky-300 shrink-0">
                  {step.ekRef}
                </span>
              </div>
              <div className="font-mono text-[10.5px] text-amber-200 bg-[#080f20] px-2 py-1 rounded-lg border border-white/5 break-words">
                {step.symbolic}
              </div>
              <div className="text-[10px] font-mono text-slate-400">{step.liveSubstitution}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Skill 2.C Quantitative Comparison & Trial Logger */}
      {activeTab === 'compare' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5">
              <div className="text-[9.5px] font-mono text-slate-400 uppercase">
                Ratio E / E_point
              </div>
              <div className="text-base font-mono font-bold text-emerald-300 mt-0.5">
                {evaluation.ratioToPointCharge.toFixed(3)}×
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">
                Point ref: {evaluation.pointChargeRefMag.toFixed(1)} kN/C
              </div>
            </div>
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5">
              <div className="text-[9.5px] font-mono text-slate-400 uppercase">
                Symmetry Check
              </div>
              <div className="text-base font-mono font-bold text-sky-300 mt-0.5">
                {evaluation.symmetry.hasSymmetryTwin ? 'Paired dq/dq′' : '1D Collinear'}
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">
                Residual: {evaluation.symmetry.cancellationResidual.toFixed(4)} kN/C
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onRecordComparison}
              className="flex-1 py-2 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Comparison Point</span>
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
              <span>Exact vs Point Ref</span>
            </div>
            {records.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-400 text-center">
                Adjust position, arc angle, or N segments and click{' '}
                <span className="text-sky-300 font-semibold">Record Comparison Point</span> to
                compare field magnitudes across geometries.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {records.map(rec => (
                  <div
                    key={rec.id}
                    className="px-2.5 py-2 text-[10px] font-mono flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">
                        {DIST_SHORT_NAMES[rec.distribution]} · {rec.label}
                      </div>
                      <div className="text-[9.5px] text-slate-400">{rec.notes}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sky-300 font-bold">{rec.exactMagKN.toFixed(1)} kN/C</div>
                      <div className="text-[9px] text-emerald-300">
                        {rec.ratioToPoint.toFixed(2)}× pt · {rec.errorPct.toFixed(1)}% err
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Skill 3.C Reasoning Claims Verification */}
      {activeTab === 'claims' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
            <span className="flex items-center gap-1 text-sky-300 font-bold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              3.C AP Physics C Claims Check
            </span>
            <span>
              {
                TOPIC_8_4_CLAIMS.filter(c => selectedAnswers[c.id] === c.correctOptionId).length
              }
              /{TOPIC_8_4_CLAIMS.length} Verified
            </span>
          </div>

          {TOPIC_8_4_CLAIMS.map((claim, idx) => {
            const chosen = selectedAnswers[claim.id];
            const isCorrect = chosen === claim.correctOptionId;
            return (
              <div
                key={claim.id}
                className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-sky-300">
                    Q{idx + 1} · Skill {claim.skill}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                    {claim.ekRef}
                  </span>
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
