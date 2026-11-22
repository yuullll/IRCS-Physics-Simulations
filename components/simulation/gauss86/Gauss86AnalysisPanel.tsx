'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Sigma,
  TrendingUp,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  GAUSS_86_CLAIM_QUESTIONS,
  Gauss86Evaluation,
  Gauss86Params,
  GaussCalculationRecord,
  buildGauss86GraphLayout,
  getGaussDerivationSteps86,
  predictGaussScaling86,
} from '@/lib/physics/gauss-law-8-6';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Gauss86AnalysisPanelProps {
  params: Gauss86Params;
  evaluation: Gauss86Evaluation;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  records: GaussCalculationRecord[];
  onRecordCalculation: () => void;
  onClearRecords: () => void;
}

type AnalysisTab = 'charts' | 'derive' | 'solve' | 'scale';

const SYMMETRY_SHORT: Record<Gauss86Params['symmetry'], string> = {
  point_invariance: 'Point',
  spherical: 'Sphere',
  cylindrical: 'Cylinder',
  planar: 'Planar',
};

export const Gauss86AnalysisPanel: React.FC<Gauss86AnalysisPanelProps> = ({
  params,
  evaluation,
  isCollapsed,
  onToggleCollapse,
  records,
  onRecordCalculation,
  onClearRecords,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('charts');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(2);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const graphLayout = useMemo(() => buildGauss86GraphLayout(params, 304, 148), [params]);
  const derivationSteps = useMemo(
    () => getGaussDerivationSteps86(params, evaluation),
    [params, evaluation]
  );
  const scalingPred = useMemo(
    () => predictGaussScaling86(params, scaleMultiplier),
    [params, scaleMultiplier]
  );

  const solvedCount = useMemo(
    () =>
      GAUSS_86_CLAIM_QUESTIONS.filter(q => answers[q.id] === q.correctId).length,
    [answers]
  );

  return (
    <aside
      aria-label="Gauss's Law Analysis and AP Skills"
      className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight leading-none truncate">
              Gauss&apos;s Law Analysis
            </h2>
            <span className="text-[10px] font-mono text-sky-300/80 block mt-0.5 whitespace-nowrap">
              AP Physics C · Skills 1.A, 2.A, 2.B, 2.D
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand analysis panel' : 'Collapse analysis panel'}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer shrink-0"
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* 4 AP Skill Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-[#050811] p-1 rounded-xl border border-white/10">
            {[
              { id: 'charts' as const, label: '1.A Charts', icon: <Activity className="w-3 h-3" /> },
              { id: 'derive' as const, label: '2.A Derive', icon: <Sigma className="w-3 h-3" /> },
              { id: 'solve' as const, label: '2.B Solve', icon: <Calculator className="w-3 h-3" /> },
              { id: 'scale' as const, label: '2.D Scale', icon: <TrendingUp className="w-3 h-3" /> },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold flex flex-col items-center gap-0.5 whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-sky-400 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* TAB 1: 1.A CHARTS — Live E(r) & q_enc(r) Curves                 */}
          {/* =============================================================== */}
          {activeTab === 'charts' && (
            <div className="space-y-2.5">
              {/* Key Live Metrics Strip */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-[#050811] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">q_enc</div>
                  <div className="text-xs font-mono font-bold text-amber-300 tabular-nums mt-0.5">
                    {evaluation.qEncMicro >= 0 ? '+' : ''}
                    {evaluation.qEncMicro.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    μC ({(evaluation.enclosedFraction * 100).toFixed(0)}%)
                  </div>
                </div>
                <div className="bg-[#050811] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">Φ_E = q/ε₀</div>
                  <div
                    className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${
                      evaluation.fluxSign === 'positive'
                        ? 'text-emerald-300'
                        : evaluation.fluxSign === 'negative'
                        ? 'text-rose-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {evaluation.fluxFromGaussKNm2C >= 0 ? '+' : ''}
                    {evaluation.fluxFromGaussKNm2C.toFixed(0)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">kN·m²/C</div>
                </div>
                <div className="bg-[#050811] border border-white/10 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-slate-400">|E(r)|</div>
                  <div className="text-xs font-mono font-bold text-sky-300 tabular-nums mt-0.5">
                    {evaluation.fieldMagKNPerC.toFixed(1)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">kN/C</div>
                </div>
              </div>

              {/* Dual-Curve SVG Profile Chart */}
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-200 font-bold">
                    1.A Radial Profile: |E| &amp; q_enc / Q
                  </span>
                  <span className="text-sky-400">1.A</span>
                </div>

                <svg
                  viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
                  className="w-full h-36 bg-[#070d1c] rounded-lg border border-white/5"
                  role="img"
                  aria-label="Electric field magnitude and enclosed charge fraction graph"
                >
                  {/* Plot Frame */}
                  <line
                    x1="36"
                    y1="16"
                    x2="36"
                    y2={graphLayout.height - 26}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <line
                    x1="36"
                    y1={graphLayout.height - 26}
                    x2={graphLayout.width - 14}
                    y2={graphLayout.height - 26}
                    stroke="#334155"
                    strokeWidth="1"
                  />

                  {/* Boundary Line r = R or x = d */}
                  {graphLayout.boundaryX !== null && (
                    <>
                      <line
                        x1={graphLayout.boundaryX}
                        y1="16"
                        x2={graphLayout.boundaryX}
                        y2={graphLayout.height - 26}
                        stroke="#fb7185"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={Math.min(graphLayout.width - 42, graphLayout.boundaryX + 4)}
                        y="26"
                        fill="#fb7185"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {graphLayout.boundaryLabel}
                      </text>
                    </>
                  )}

                  {/* Enclosed Charge Fraction Curve (Amber Dashed) */}
                  <path
                    d={graphLayout.qEncPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                  />

                  {/* Electric Field Curve |E(r)| (Sky Solid) */}
                  <path
                    d={graphLayout.fieldPath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                  />

                  {/* Current Gaussian Radius Probe Line & Dots */}
                  <line
                    x1={graphLayout.markerX}
                    y1="16"
                    x2={graphLayout.markerX}
                    y2={graphLayout.height - 26}
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={graphLayout.markerX}
                    cy={graphLayout.markerQEncY}
                    r="3.8"
                    fill="#f59e0b"
                    stroke="#050811"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx={graphLayout.markerX}
                    cy={graphLayout.markerFieldY}
                    r="4.8"
                    fill="#38bdf8"
                    stroke="#050811"
                    strokeWidth="1.5"
                  />

                  {/* Axis Labels */}
                  <text x="4" y="24" fill="#38bdf8" fontSize="8" fontFamily="monospace">
                    {graphLayout.yMax.toFixed(0)}
                  </text>
                  <text
                    x="4"
                    y={graphLayout.height - 26}
                    fill="#94a3b8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    0
                  </text>
                  <text
                    x={graphLayout.width / 2 + 10}
                    y={graphLayout.height - 8}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {graphLayout.xLabel}
                  </text>
                </svg>

                <div className="flex items-center justify-between text-[9.5px] font-mono px-0.5">
                  <span className="text-sky-300">── |E(r)| (kN/C)</span>
                  <span className="text-amber-300">- - q_enc / Q</span>
                  <span className="text-emerald-300">│ Active r</span>
                </div>
              </div>

              {/* EK Spotlight */}
              <div className="bg-sky-950/35 border border-sky-400/25 rounded-xl p-2.5 text-[11px] text-slate-200 leading-relaxed">
                <div className="text-[10px] font-mono text-sky-300 font-bold mb-1">
                  AP Physics C · Essential Knowledge
                </div>
                {evaluation.ekSpotlight}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: 2.A DERIVE — Symbolic Gauss's Law Pathway                */}
          {/* =============================================================== */}
          {activeTab === 'derive' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] px-0.5">
                <span className="text-slate-300">Maxwell&apos;s 1st Equation:</span>
                <MathFormula formulaKey="unit-8" className="text-sky-300 text-xs" />
              </div>

              {derivationSteps.map(step => (
                <div
                  key={step.stepNumber}
                  className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </span>
                      <span className="text-[11px] font-bold text-white leading-tight">
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-sky-400 shrink-0">
                      {step.ekRef}
                    </span>
                  </div>

                  <div className="bg-[#0b1327] border border-white/5 rounded-lg px-2 py-1.5 text-[10.5px] font-mono text-amber-200 leading-snug">
                    {step.symbolic}
                  </div>

                  <div className="text-[10px] font-mono text-slate-300">
                    {step.liveSubstitution}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: 2.B SOLVE — Quantitative Verifier & Region Table         */}
          {/* =============================================================== */}
          {activeTab === 'solve' && (
            <div className="space-y-2.5">
              {/* Side-by-Side Gauss's Law Equality Proof */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-[#050811] border border-emerald-500/30 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-emerald-300">
                    LHS: ∮ E · dA
                  </div>
                  <div className="text-xs font-mono font-bold text-white tabular-nums mt-0.5">
                    {evaluation.fluxFromIntegralKNm2C >= 0 ? '+' : ''}
                    {evaluation.fluxFromIntegralKNm2C.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">kN·m²/C</div>
                </div>
                <div className="bg-[#050811] border border-sky-500/30 rounded-xl p-2">
                  <div className="text-[9.5px] font-mono text-sky-300">
                    RHS: q_enc / ε₀
                  </div>
                  <div className="text-xs font-mono font-bold text-white tabular-nums mt-0.5">
                    {evaluation.fluxFromGaussKNm2C >= 0 ? '+' : ''}
                    {evaluation.fluxFromGaussKNm2C.toFixed(2)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    kN·m²/C · Match 100%
                  </div>
                </div>
              </div>

              {/* Gaussian Surface Region Breakdown (EK 8.6.A.4) */}
              <div className="bg-[#050811] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Gaussian Regions (8.6.A.4)</span>
                  <span>Φ_region</span>
                </div>
                <div className="divide-y divide-white/5">
                  {evaluation.regions.map(reg => (
                    <div key={reg.id} className="px-2.5 py-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-slate-200 font-semibold truncate">{reg.label}</span>
                        <span
                          className={`font-bold shrink-0 tabular-nums ${
                            reg.sign === 'positive'
                              ? 'text-emerald-300'
                              : reg.sign === 'negative'
                              ? 'text-rose-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {reg.fluxKNm2PerC >= 0 ? '+' : ''}
                          {reg.fluxKNm2PerC.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 leading-snug">{reg.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculation Logger */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRecordCalculation}
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Calculation</span>
                </button>
                {records.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRecords}
                    aria-label="Clear calculation log"
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="bg-[#050811] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>2.B Calculation Log ({records.length})</span>
                  <span>|E| &amp; Φ_E</span>
                </div>
                {records.length === 0 ? (
                  <div className="p-2.5 text-[11px] text-slate-400 text-center">
                    Adjust Gaussian radius or density and click{' '}
                    <span className="text-sky-300 font-semibold">Record Calculation</span> to compare
                    exact SI results.
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
                            {SYMMETRY_SHORT[rec.symmetry]} · {rec.label}
                          </div>
                          <div className="text-[9.5px] text-slate-400 truncate">
                            {rec.gaussianSizeText} · q_enc={rec.qEncMicro.toFixed(2)}μC
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <div className="text-sky-300 font-bold">{rec.fieldKNPerC.toFixed(1)} kN/C</div>
                          <div
                            className={`text-[9px] ${
                              rec.sign === 'positive'
                                ? 'text-emerald-300'
                                : rec.sign === 'negative'
                                ? 'text-rose-300'
                                : 'text-slate-400'
                            }`}
                          >
                            Φ={rec.fluxKNm2C >= 0 ? '+' : ''}
                            {rec.fluxKNm2C.toFixed(0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: 2.D SCALE — Functional Dependence & Concept Checks       */}
          {/* =============================================================== */}
          {activeTab === 'scale' && (
            <div className="space-y-2.5">
              {/* Interactive 2.D Scaling Predictor */}
              <div className="bg-[#050811] border border-sky-500/25 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-sky-300 font-bold">2.D Scaling Factor Predictor</span>
                  <span className="text-slate-400">
                    {params.symmetry === 'planar' ? 'Scale x' : 'Scale r'}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-300">{scalingPred.regionLabel}</div>
                <div className="grid grid-cols-3 gap-1">
                  {[0.5, 2, 3].map(mult => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setScaleMultiplier(mult)}
                      className={`py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                        scaleMultiplier === mult
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      ×{mult}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="bg-[#0b1327] rounded-lg p-1.5">
                    <div className="text-[9px] text-slate-400">q_enc ({scalingPred.qEncExponentText.split(' ')[0]})</div>
                    <div className="text-xs font-bold text-amber-300 tabular-nums">
                      ×{scalingPred.qEncFactor.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#0b1327] rounded-lg p-1.5">
                    <div className="text-[9px] text-slate-400">Φ_E</div>
                    <div className="text-xs font-bold text-emerald-300 tabular-nums">
                      ×{scalingPred.fluxFactor.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-[#0b1327] rounded-lg p-1.5">
                    <div className="text-[9px] text-slate-400">|E| ({scalingPred.fieldExponentText.split(' ')[0]})</div>
                    <div className="text-xs font-bold text-sky-300 tabular-nums">
                      ×{scalingPred.fieldFactor.toFixed(3)}
                    </div>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-300 leading-snug">{scalingPred.summary}</p>
              </div>

              {/* 4 AP Physics C Topic 8.6 Checks */}
              <div className="flex items-center justify-between text-[10.5px] font-mono px-0.5">
                <span className="text-sky-300 font-bold">Topic 8.6 Reasoning Checks</span>
                <span className="text-slate-400 tabular-nums">
                  {solvedCount}/{GAUSS_86_CLAIM_QUESTIONS.length} Verified
                </span>
              </div>

              {GAUSS_86_CLAIM_QUESTIONS.map((q, idx) => {
                const chosen = answers[q.id];
                const isCorrect = chosen === q.correctId;
                return (
                  <div
                    key={q.id}
                    className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-sky-300 font-bold">
                        Q{idx + 1} · {q.skill}
                      </span>
                      <span className="text-slate-400">{q.ekRef}</span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-snug">{q.prompt}</p>
                    <div className="space-y-1">
                      {q.options.map(opt => {
                        const isPicked = chosen === opt.id;
                        const optCorrect = opt.id === q.correctId;
                        let style =
                          'bg-[#0a1224] border-white/10 text-slate-300 hover:border-sky-400/40';
                        if (chosen) {
                          if (isPicked && optCorrect) {
                            style = 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold';
                          } else if (isPicked && !optCorrect) {
                            style = 'bg-rose-500/20 border-rose-400 text-rose-200';
                          } else if (optCorrect) {
                            style = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
                          }
                        }
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] leading-snug transition cursor-pointer ${style}`}
                          >
                            <span className="font-mono font-bold mr-1.5 uppercase">{opt.id}.</span>
                            {opt.text}
                          </button>
                        );
                      })}
                    </div>
                    {chosen && (
                      <div
                        className={`text-[10.5px] rounded-lg px-2.5 py-1.5 border flex items-start gap-1.5 ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-500/35 text-emerald-200'
                            : 'bg-rose-950/40 border-rose-500/35 text-rose-200'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default Gauss86AnalysisPanel;
