'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  GitCompare,
  HelpCircle,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Charging82Params,
  Charging82State,
  ComparisonTrialRecord,
  TOPIC_8_2_CLAIMS,
  computeChargeBarChartLayout,
} from '@/lib/physics/charge-conservation-8-2';

export interface Charging82AnalysisPanelProps {
  params: Charging82Params;
  simState: Charging82State;
  trials: ComparisonTrialRecord[];
  onRecordTrial: () => void;
  onClearTrials: () => void;
}

type AnalysisTab = 'diagrams_1a' | 'compare_2c' | 'claims_3bc';

function formatSignedQ(q: number): string {
  const clean = Math.abs(q) < 0.01 ? 0 : q;
  return `${clean > 0 ? '+' : ''}${clean.toFixed(1)}`;
}

export const Charging82AnalysisPanel: React.FC<Charging82AnalysisPanelProps> = ({
  params,
  simState,
  trials,
  onRecordTrial,
  onClearTrials,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('diagrams_1a');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Build Skill 1.A Charge Bar Chart items (Before vs After for each object + Total)
  const chartLayout = useMemo(() => {
    const shortLabelFor = (id: string, fallback: string) => {
      switch (id) {
        case 'rod':
          return fallback.split(' ')[0];
        case 'cloth':
          return fallback.split(' ')[0];
        case 'sphereA':
          return 'Sphere A';
        case 'sphereB':
          return 'Sphere B';
        case 'insulator':
          return 'Insulator';
        case 'sphere':
          return 'Sphere';
        case 'earth':
          return 'Earth ΔQ';
        default:
          return fallback.slice(0, 9);
      }
    };

    const items = simState.objects
      .filter(obj => obj.id !== 'rod' || simState.scenario === 'friction_tribo')
      .map(obj => ({
        id: obj.id,
        label: shortLabelFor(obj.id, obj.label),
        initialCharge: obj.initialCharge,
        currentCharge: obj.netCharge,
        role: obj.role,
      }));

    items.push({
      id: 'total',
      label: simState.scenario === 'grounding_earth' ? 'Sys+Earth' : 'Total Q',
      initialCharge:
        simState.scenario === 'grounding_earth'
          ? simState.systemInitialCharge
          : simState.systemInitialCharge,
      currentCharge:
        simState.scenario === 'grounding_earth'
          ? Number((simState.systemCurrentCharge + simState.surroundingsDeltaCharge).toFixed(2))
          : simState.systemCurrentCharge,
      role: 'system',
    });

    return computeChargeBarChartLayout(items, 316, 158);
  }, [simState]);

  const correctCount = useMemo(
    () =>
      TOPIC_8_2_CLAIMS.filter(c => selectedAnswers[c.id] === c.correctOptionId).length,
    [selectedAnswers]
  );

  return (
    <div className="flex flex-col space-y-3 text-xs">
      {/* AP Physics C Science Practice Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-[#050811] p-1 rounded-xl border border-sky-500/20">
        <button
          onClick={() => setActiveTab('diagrams_1a')}
          className={`py-1.5 px-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition text-[11px] ${
            activeTab === 'diagrams_1a'
              ? 'bg-sky-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span>1.A Charts</span>
        </button>
        <button
          onClick={() => setActiveTab('compare_2c')}
          className={`py-1.5 px-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition text-[11px] ${
            activeTab === 'compare_2c'
              ? 'bg-sky-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5 shrink-0" />
          <span>2.C Compare</span>
        </button>
        <button
          onClick={() => setActiveTab('claims_3bc')}
          className={`py-1.5 px-1.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition text-[11px] ${
            activeTab === 'claims_3bc'
              ? 'bg-sky-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>3.B/3.C</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SKILL 1.A — CHARGE CONSERVATION BAR CHART & CARRIER TABLE   */}
      {/* ================================================================= */}
      {activeTab === 'diagrams_1a' && (
        <div className="space-y-3">
          {/* Conservation Law Verification Banner */}
          <div className="p-2.5 rounded-xl bg-[#050811] border border-sky-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Conservation Ledger (8.2.A.2)
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                ΣQ_i = ΣQ_f ✓
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-[#0b1328] rounded-lg px-2 py-1.5 border border-white/5">
                <div className="text-[10px] text-slate-400">System Q_sys</div>
                <div className="text-sm font-bold text-white">
                  {formatSignedQ(simState.systemCurrentCharge)} q₀
                </div>
              </div>
              <div className="bg-[#0b1328] rounded-lg px-2 py-1.5 border border-white/5">
                <div className="text-[10px] text-slate-400">
                  {simState.scenario === 'grounding_earth' ? 'Sys + Earth' : 'Initial ΣQ'}
                </div>
                <div className="text-sm font-bold text-sky-300">
                  {formatSignedQ(
                    simState.scenario === 'grounding_earth'
                      ? simState.systemCurrentCharge + simState.surroundingsDeltaCharge
                      : simState.systemInitialCharge
                  )}{' '}
                  q₀
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug pt-0.5">
              {simState.flow.summary}
            </p>
          </div>

          {/* Skill 1.A Quantitative Charge Bar Chart SVG */}
          <div className="p-2.5 rounded-xl bg-[#050811] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">
                Skill 1.A · Before vs. After Charge Chart
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-slate-500 inline-block" />
                  Init
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />
                  +Q
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />
                  −Q
                </span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`}
              className="w-full h-40 rounded-lg bg-[#070d1c] border border-white/5"
            >
              {/* Horizontal reference lines */}
              <line
                x1="24"
                y1={chartLayout.zeroY}
                x2={chartLayout.width - 10}
                y2={chartLayout.zeroY}
                stroke="#475569"
                strokeWidth="1.2"
              />
              <text x="6" y={chartLayout.zeroY + 3} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                0
              </text>
              <text x="2" y="22" fill="#f87171" fontSize="8.5" fontFamily="monospace">
                +{chartLayout.maxAbsQ.toFixed(0)}
              </text>
              <text x="2" y={chartLayout.height - 28} fill="#60a5fa" fontSize="8.5" fontFamily="monospace">
                -{chartLayout.maxAbsQ.toFixed(0)}
              </text>

              {chartLayout.bars.map(bar => {
                const currColor =
                  bar.currentCharge > 0.05
                    ? '#ef4444'
                    : bar.currentCharge < -0.05
                    ? '#3b82f6'
                    : '#64748b';
                return (
                  <g key={bar.id}>
                    {/* Initial charge ghost bar */}
                    <rect
                      x={bar.x - bar.barWidth - 1.5}
                      y={bar.initialY}
                      width={bar.barWidth}
                      height={Math.max(1.5, bar.initialH)}
                      rx="2"
                      fill="#475569"
                      fillOpacity="0.65"
                    />
                    {/* Current charge live bar */}
                    <rect
                      x={bar.x + 1.5}
                      y={bar.currentY}
                      width={bar.barWidth}
                      height={Math.max(1.5, bar.currentH)}
                      rx="2"
                      fill={currColor}
                    />
                    {/* Numeric label */}
                    <text
                      x={bar.x + bar.barWidth * 0.5 + 1.5}
                      y={
                        bar.currentCharge >= 0
                          ? Math.max(12, bar.currentY - 4)
                          : Math.min(chartLayout.height - 17, bar.currentY + bar.currentH + 10)
                      }
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {formatSignedQ(bar.currentCharge)}
                    </text>
                    {/* X-axis object label */}
                    <text
                      x={bar.x}
                      y={chartLayout.height - 7}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {bar.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Microscopic Proton vs Electron Carrier Accounting Table (8.2.A.2.i) */}
          <div className="p-2.5 rounded-xl bg-[#050811] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold">
                Carrier Table (8.2.A.2.i · e⁻ Only)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Q = N_p − N_e</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="text-left py-1 font-medium">Object</th>
                    <th className="text-right py-1 text-red-400">p⁺ (Fixed)</th>
                    <th className="text-right py-1 text-blue-400">e⁻ (Mobile)</th>
                    <th className="text-right py-1 text-white">Net Q</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {simState.objects.map(obj => {
                    const isEarth = obj.material === 'earth';
                    const qCol =
                      obj.netCharge > 0.05
                        ? 'text-red-400'
                        : obj.netCharge < -0.05
                        ? 'text-blue-400'
                        : 'text-slate-300';
                    return (
                      <tr key={obj.id}>
                        <td className="py-1.5 text-slate-200 truncate max-w-[115px]">{obj.label}</td>
                        <td className="py-1.5 text-right text-red-300/90">
                          {isEarth ? '≈10²³' : obj.protons.toFixed(0)}
                        </td>
                        <td className="py-1.5 text-right text-blue-300">
                          {isEarth
                            ? obj.deltaCharge === 0
                              ? '≈10²³'
                              : `10²³${obj.deltaCharge > 0 ? `−${obj.deltaCharge.toFixed(1)}` : `+${Math.abs(obj.deltaCharge).toFixed(1)}`}`
                            : obj.electrons.toFixed(1)}
                        </td>
                        <td className={`py-1.5 text-right font-bold ${qCol}`}>
                          {formatSignedQ(obj.netCharge)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: SKILL 2.C — SCENARIO & TIME-STATE COMPARISON LAB            */}
      {/* ================================================================= */}
      {activeTab === 'compare_2c' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-[#050811] border border-sky-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Skill 2.C · Quantitative Comparison
              </span>
              <span className="text-[10px] font-mono text-slate-400">{trials.length} saved</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Capture snapshots across different sphere radii, rubbing pairs, or grounding sequences to compare charge distribution ratios while verifying conservation of total charge.
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onRecordTrial}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Current State</span>
              </button>
              {trials.length > 0 && (
                <button
                  onClick={onClearTrials}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                  title="Clear comparison trials"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Live Conduction Radius Ratio Comparison when in Conduction mode */}
          {params.scenario === 'conduction_contact' && simState.equilibriumQA !== undefined && (
            <div className="p-2.5 rounded-xl bg-[#0b1328] border border-sky-400/25 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-sky-300 font-bold">
                Equipotential Radius Scaling (V_A = V_B)
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-[#050811] p-2 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">R_A / R_B</div>
                  <div className="text-white font-bold">
                    {(params.radiusA / params.radiusB).toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#050811] p-2 rounded-lg border border-white/5">
                  <div className="text-[10px] text-slate-400">Q_A,eq / Q_B,eq</div>
                  <div className="text-sky-300 font-bold">
                    {simState.ratioQAtoQB?.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-300">
                Equilibrium split: <span className="text-white font-mono">Q_A = {formatSignedQ(simState.equilibriumQA)}</span>,{' '}
                <span className="text-white font-mono">Q_B = {formatSignedQ(simState.equilibriumQB ?? 0)}</span> (ΣQ = {formatSignedQ(simState.systemInitialCharge)}).
              </div>
            </div>
          )}

          {/* Recorded Trials Comparison Table */}
          {trials.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#050811]/70 border border-dashed border-white/10 text-center text-slate-400 text-[11px]">
              Click <strong className="text-sky-300">Record Current State</strong> to log scenarios and compare initial vs. final charges side-by-side.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {trials.map((tr, i) => (
                <div
                  key={tr.id}
                  className="p-2 rounded-xl bg-[#050811] border border-white/10 space-y-1 font-mono text-[10px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sky-300 font-bold">
                      #{i + 1} · {tr.label}
                    </span>
                    <span className="text-emerald-400">
                      ΣQ: {formatSignedQ(tr.qTotalBefore)} → {formatSignedQ(tr.qTotalAfter)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-slate-300">
                    <div>
                      Obj 1: <span className="text-white">{formatSignedQ(tr.qAFinal)}</span>
                    </div>
                    <div>
                      Obj 2: <span className="text-white">{formatSignedQ(tr.qBFinal)}</span>
                    </div>
                    <div>
                      Earth: <span className="text-emerald-300">{formatSignedQ(tr.qEarthDelta)}</span>
                    </div>
                  </div>
                  <div className="text-slate-400 font-sans text-[10px] leading-snug">{tr.notes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: SKILLS 3.B & 3.C — CLAIM & EVIDENCE JUSTIFICATION CHECKS    */}
      {/* ================================================================= */}
      {activeTab === 'claims_3bc' && (
        <div className="space-y-2.5">
          <div className="p-2.5 rounded-xl bg-[#050811] border border-sky-500/25 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Skills 3.B &amp; 3.C · Claim Verification
              </div>
              <div className="text-[11px] text-slate-300">
                Score: <strong className="text-white">{correctCount}/{TOPIC_8_2_CLAIMS.length}</strong> AP Reasoning Checks
              </div>
            </div>
            <button
              onClick={() => setSelectedAnswers({})}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
              title="Reset Claim Checks"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-0.5">
            {TOPIC_8_2_CLAIMS.map(claim => {
              const picked = selectedAnswers[claim.id];
              const isCorrect = picked === claim.correctOptionId;
              return (
                <div
                  key={claim.id}
                  className="p-2.5 rounded-xl bg-[#050811] border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-sky-400 font-bold">Skill {claim.skill}</span>
                    <span className="text-slate-400">EK {claim.ekRef}</span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-snug font-medium">
                    {claim.prompt}
                  </p>
                  <div className="space-y-1">
                    {claim.options.map(opt => {
                      const active = picked === opt.id;
                      const showRight = picked && opt.id === claim.correctOptionId;
                      const showWrong = active && !isCorrect;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            setSelectedAnswers(prev => ({ ...prev, [claim.id]: opt.id }))
                          }
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition flex items-start gap-2 cursor-pointer ${
                            showRight
                              ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                              : showWrong
                              ? 'bg-rose-500/15 border-rose-400/50 text-rose-200'
                              : 'bg-[#0b1328] hover:bg-[#111d3a] border-white/10 text-slate-300'
                          }`}
                        >
                          <span className="font-mono font-bold uppercase shrink-0 mt-0.5">
                            {opt.id}.
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  {picked && (
                    <div
                      className={`p-2 rounded-lg border text-[11px] leading-snug flex items-start gap-1.5 ${
                        isCorrect
                          ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
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
        </div>
      )}
    </div>
  );
};
