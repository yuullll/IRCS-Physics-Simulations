'use client';

import React, { useMemo, useState } from 'react';
import { LineChart, Calculator, FlaskConical, CheckCircle2, Trash2, Plus } from 'lucide-react';
import {
  ExperimentalTrialRow,
  GraphQuantityMode,
  Motion15Params,
  Motion15ScenarioDescriptor,
  Motion15State,
  computeComponentGraphLayout,
  sampleMotion15Series,
} from '@/lib/physics/motion-2d-3d-1-5';
import { Vec, Sub, Op, Frac, Var, Sup } from '@/components/ui/MathFormula';

export type RightTab15 = 'graphs' | 'math' | 'lab';

interface Motion15AnalysisPanelProps {
  descriptor: Motion15ScenarioDescriptor;
  params: Motion15Params;
  state: Motion15State;
  trials: ExperimentalTrialRow[];
  onRecordTrial: () => void;
  onClearTrials: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Motion15AnalysisPanel: React.FC<Motion15AnalysisPanelProps> = ({
  descriptor,
  params,
  state,
  trials,
  onRecordTrial,
  onClearTrials,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<RightTab15>('graphs');
  const [graphQty, setGraphQty] = useState<GraphQuantityMode>('velocity');
  const [claimDropChoice, setClaimDropChoice] = useState<'same' | 'faster' | null>(null);
  const [claimBoundaryChoice, setClaimBoundaryChoice] = useState<'2d' | '3d_quant' | null>(null);

  const series = useMemo(
    () => sampleMotion15Series(descriptor.id, params, descriptor.maxTime, 72),
    [descriptor.id, params, descriptor.maxTime]
  );

  const graphLayout = useMemo(
    () => computeComponentGraphLayout(series, graphQty, state.t, 290, 136),
    [series, graphQty, state.t]
  );

  const unitLabel =
    graphQty === 'position' ? 'm' : graphQty === 'velocity' ? 'm/s' : 'm/s²';

  if (isCollapsed) {
    return (
      <aside
        aria-label="Topic 1.5 component analysis minimized"
        className="absolute top-20 right-4 z-20 bg-[#071612]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white whitespace-nowrap">
            1.5 Component &amp; Graph Lab
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-[11px] font-semibold text-emerald-200 transition cursor-pointer whitespace-nowrap"
        >
          Expand
        </button>
      </aside>
    );
  }

  const p = state.primary;
  const ref = state.referenceDrop;
  const ySyncDelta = ref ? Math.abs(p.r.y - ref.r.y) : 0;

  return (
    <aside
      aria-label="Component graphs, derivations, and experimental inquiry panel"
      className="absolute top-20 right-4 z-20 w-[352px] max-h-[calc(100vh-5.75rem)] overflow-y-auto bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-2.5 flex flex-col space-y-2 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <LineChart className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-tight truncate">
              2D / 3D Component Analysis
            </div>
            <div className="text-[10px] font-mono text-emerald-400 truncate">
              {descriptor.dimensionLabel}
            </div>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          Minimize
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Topic 1.5 analysis tabs"
        className="grid grid-cols-3 gap-1 bg-[#040b09] p-1 rounded-xl border border-white/10"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'graphs'}
          onClick={() => setActiveTab('graphs')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'graphs'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <LineChart className="w-3 h-3 shrink-0" />
          <span>1.B Graphs</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'math'}
          onClick={() => setActiveTab('math')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'math'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Calculator className="w-3 h-3 shrink-0" />
          <span>2.A / 2.D Math</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'lab'}
          onClick={() => setActiveTab('lab')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'lab'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <FlaskConical className="w-3 h-3 shrink-0" />
          <span>3.A / 3.C Lab</span>
        </button>
      </div>

      {/* Live Component Readout Strip */}
      <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 grid grid-cols-[1.45fr_1fr_1fr] gap-1.5">
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">
            POS (x, y{descriptor.id === 'qualitative_3d' ? ', z' : ''})
          </div>
          <div className="text-[10.5px] font-mono font-bold text-slate-100 tabular-nums whitespace-nowrap">
            {descriptor.id === 'qualitative_3d'
              ? `(${p.r.x.toFixed(1)}, ${p.r.y.toFixed(1)}, ${p.r.z.toFixed(1)}) m`
              : `(${p.r.x.toFixed(2)}, ${p.r.y.toFixed(2)}) m`}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">SPEED |v|</div>
          <div className="text-[10.5px] font-mono font-bold text-emerald-300 tabular-nums whitespace-nowrap">
            {p.speed.toFixed(2)} m/s
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">ACCEL |a|</div>
          <div className="text-[10.5px] font-mono font-bold text-rose-300 tabular-nums whitespace-nowrap">
            {p.accelMag.toFixed(2)} m/s²
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: QUANTITATIVE COMPONENT GRAPHS (SKILL 1.B + EK 1.5.A.1)        */}
      {/* =================================================================== */}
      {activeTab === 'graphs' && (
        <div className="space-y-2">
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-slate-200">
                1D Component Plots (Skill 1.B)
              </span>
              <div className="flex items-center gap-0.5 bg-[#071612] p-0.5 rounded-lg border border-white/10 text-[9.5px] font-mono">
                {(['position', 'velocity', 'acceleration'] as const).map(qty => (
                  <button
                    key={qty}
                    onClick={() => setGraphQty(qty)}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      graphQty === qty
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {qty === 'position' ? 'r(t)' : qty === 'velocity' ? 'v(t)' : 'a(t)'}
                  </button>
                ))}
              </div>
            </div>

            <svg
              viewBox={`0 0 ${graphLayout.width} ${graphLayout.height}`}
              className="w-full h-[136px] bg-[#020706] rounded-lg border border-white/10"
              data-testid="motion15-component-graph"
              role="img"
              aria-label={`Quantitative component graph of ${graphQty} versus time in ${unitLabel}`}
            >
              {/* Zero horizontal baseline */}
              <line
                x1={graphLayout.padLeft}
                y1={graphLayout.zeroY}
                x2={graphLayout.width - graphLayout.padRight}
                y2={graphLayout.zeroY}
                stroke="rgba(148,163,184,0.28)"
                strokeDasharray="3 3"
              />

              {/* Y ticks */}
              {graphLayout.yTicks.map((tk, i) => (
                <g key={i}>
                  <line
                    x1={graphLayout.padLeft - 3}
                    y1={tk.py}
                    x2={graphLayout.width - graphLayout.padRight}
                    y2={tk.py}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <text
                    x={graphLayout.padLeft - 5}
                    y={tk.py + 3}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {tk.label}
                  </text>
                </g>
              ))}

              {/* Z-axis dashed amber curve (for 3D Qualitative Helix) */}
              {graphLayout.zPath && (
                <path
                  d={graphLayout.zPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.6"
                  strokeDasharray="4 2"
                />
              )}

              {/* X-axis component curve (Sky Blue) */}
              <path d={graphLayout.xPath} fill="none" stroke="#38bdf8" strokeWidth="2.1" />
              {/* Y-axis component curve (Emerald) */}
              <path d={graphLayout.yPath} fill="none" stroke="#34d399" strokeWidth="2.1" />

              {/* Current simulation time indicator */}
              <line
                x1={graphLayout.markerPxX}
                y1={graphLayout.padTop}
                x2={graphLayout.markerPxX}
                y2={graphLayout.height - graphLayout.padBottom}
                stroke="rgba(226,232,240,0.45)"
                strokeWidth="1"
              />
              <circle cx={graphLayout.markerPxX} cy={graphLayout.markerPxY} r="3.2" fill="#38bdf8" />
              <circle cx={graphLayout.markerPxX} cy={graphLayout.markerPyY} r="3.2" fill="#34d399" />
              {graphLayout.zPath && graphLayout.markerPzY !== null && (
                <circle cx={graphLayout.markerPxX} cy={graphLayout.markerPzY} r="3.2" fill="#fbbf24" />
              )}

              {/* Axis Labels & Scale Units */}
              <text
                x={graphLayout.padLeft + 3}
                y={10}
                fill="#cbd5e1"
                fontSize="8.5"
                fontFamily="monospace"
              >
                {graphQty} ({unitLabel})
              </text>
              <text
                x={graphLayout.width - graphLayout.padRight}
                y={graphLayout.height - 6}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="8.5"
                fontFamily="monospace"
              >
                t (0 → {graphLayout.tMax.toFixed(1)}s)
              </text>
            </svg>

            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums pt-0.5">
              <span className="text-sky-300">
                X:{' '}
                {(graphQty === 'position'
                  ? p.r.x
                  : graphQty === 'velocity'
                  ? p.v.x
                  : p.a.x
                ).toFixed(2)}{' '}
                {unitLabel}
              </span>
              <span className="text-emerald-300">
                Y:{' '}
                {(graphQty === 'position'
                  ? p.r.y
                  : graphQty === 'velocity'
                  ? p.v.y
                  : p.a.y
                ).toFixed(2)}{' '}
                {unitLabel}
              </span>
              {descriptor.id === 'qualitative_3d' && (
                <span className="text-amber-300">
                  Z:{' '}
                  {(graphQty === 'position'
                    ? p.r.z
                    : graphQty === 'velocity'
                    ? p.v.z
                    : p.a.z
                  ).toFixed(2)}{' '}
                  {unitLabel}
                </span>
              )}
            </div>
          </div>

          {/* Decoupled 1D Component Equations (1.5.A.1) */}
          <div className="bg-[#040b09] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-mono tabular-nums">
            <div className="text-emerald-400 font-bold uppercase">
              Independent Component Decomposition (1.5.A.1)
            </div>
            <div className="flex justify-between text-sky-300">
              <span>X-Axis (vx, ax):</span>
              <span>
                {p.v.x.toFixed(2)} m/s · {p.a.x.toFixed(2)} m/s²
              </span>
            </div>
            <div className="flex justify-between text-emerald-300">
              <span>Y-Axis (vy, ay):</span>
              <span>
                {p.v.y.toFixed(2)} m/s · {p.a.y.toFixed(2)} m/s²
              </span>
            </div>

            {descriptor.id === 'drop_vs_launch' && ref && (
              <div className="border-t border-white/10 pt-1.5 space-y-1">
                <div className="flex justify-between text-amber-300">
                  <span>Body A (Drop) y_A(t):</span>
                  <span>{ref.r.y.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Body B (Launch) y_B(t):</span>
                  <span>{p.r.y.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between text-white font-bold">
                  <span>|y_B − y_A| Vertical Sync:</span>
                  <span className={ySyncDelta < 1e-3 ? 'text-emerald-300' : 'text-amber-300'}>
                    {ySyncDelta.toFixed(4)} m
                  </span>
                </div>
              </div>
            )}

            {descriptor.id === 'qualitative_3d' && (
              <div className="border-t border-white/10 pt-1.5 text-[10px] font-sans text-slate-300 leading-relaxed">
                <strong className="text-amber-300">1.5 Boundary Note:</strong> Circular{' '}
                <span className="font-mono">X–Z</span> radius{' '}
                <span className="font-mono text-white">
                  R = {state.metrics.xzRadius?.toFixed(2)} m
                </span>{' '}
                stays fixed even as vertical thrust <span className="font-mono">a_y</span> stretches
                the helix pitch vertically.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SYMBOLIC DERIVATION (2.A) & SCALING PREDICTOR (2.D)           */}
      {/* =================================================================== */}
      {activeTab === 'math' && (
        <div className="space-y-2">
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1.5">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
              Symbolic Derivation Pathway (Skill 2.A)
            </div>
            {descriptor.id === 'projectile_2d' ? (
              <div className="space-y-1.5 text-[11px] text-slate-200 leading-relaxed">
                <p className="text-[10px] text-slate-300">
                  Separate <span className="font-mono text-sky-300">x(t)</span> and{' '}
                  <span className="font-mono text-emerald-300">y(t)</span> using{' '}
                  <span className="font-mono">a_x = 0</span> and{' '}
                  <span className="font-mono">a_y = −g</span> (EK 1.5.A.4):
                </p>
                <div className="bg-[#071612] border border-white/10 rounded-lg p-2 text-center font-serif text-[11px] space-y-1.5">
                  <div>
                    <Var>t</Var> <Op>=</Op>{' '}
                    <Frac
                      num={<Var>x</Var>}
                      den={
                        <>
                          <Var>v</Var>
                          <Sub>0</Sub> cos <Var>θ</Var>
                        </>
                      }
                    />
                  </div>
                  <div className="whitespace-nowrap">
                    <Var>y</Var>(<Var>x</Var>) <Op>=</Op> <Var>h</Var>
                    <Sub>0</Sub> <Op>+</Op> (<Var>tan θ</Var>)<Var>x</Var> <Op>−</Op>{' '}
                    <Frac
                      num={<Var>g</Var>}
                      den={
                        <>
                          2<Var>v</Var>
                          <Sub>0</Sub>
                          <Sup>2</Sup> cos<Sup>2</Sup>
                          <Var>θ</Var>
                        </>
                      }
                    />
                    <Var>x</Var>
                    <Sup>2</Sup>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-300 flex justify-between pt-1">
                  <span>Predicted Range R:</span>
                  <span className="text-emerald-300 font-bold">
                    {state.metrics.horizontalRange.toFixed(2)} m
                  </span>
                </div>
              </div>
            ) : descriptor.id === 'drop_vs_launch' ? (
              <div className="space-y-1.5 text-[11px] text-slate-200 leading-relaxed">
                <p className="text-[10px] text-slate-300">
                  Solve vertical dimension independently from horizontal{' '}
                  <span className="font-mono text-sky-300">v₀x, a_x</span> (EK 1.5.A.3):
                </p>
                <div className="bg-[#071612] border border-white/10 rounded-lg p-2 text-center font-serif text-xs">
                  <Var>h</Var>
                  <Sub>0</Sub> <Op>−</Op> <Frac num="1" den="2" />
                  <Var>g</Var>
                  <Var>t</Var>
                  <Sup>2</Sup> <Op>=</Op> 0 <Op>⇒</Op> <Var>t</Var>
                  <Sub>drop</Sub> <Op>=</Op> √(2<Var>h</Var>
                  <Sub>0</Sub>/<Var>g</Var>)
                </div>
                <div className="text-[10px] font-mono text-slate-300 flex justify-between">
                  <span>Analytic t_drop:</span>
                  <span className="text-amber-300 font-bold">
                    {state.metrics.impactTimeReference?.toFixed(3) ?? '—'} s
                  </span>
                </div>
              </div>
            ) : descriptor.id === 'nonuniform_2d' ? (
              <div className="space-y-1.5 text-[11px] text-slate-200 leading-relaxed">
                <p className="text-[10px] text-slate-300">
                  Integrate each non-uniform acceleration component separately (EK 1.5.A.2):
                </p>
                <div className="bg-[#071612] border border-white/10 rounded-lg p-2 text-[10.5px] font-mono space-y-1 text-slate-200">
                  <div>v_x(t) = v₀x + ∫(a₀x + j_x t) dt</div>
                  <div>v_y(t) = v₀y + ∫A_y cos(ω_y t) dt</div>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-[10px] text-slate-300 leading-relaxed">
                <p>
                  By the <strong>Topic 1.5 Boundary Statement</strong>, quantitative derivation
                  equations are scoped to 2D in AP Physics C: Mechanics. In 3D (E&amp;M extension),
                  the <span className="font-mono">X–Z</span> rotation decouples qualitatively from
                  vertical acceleration along <span className="font-mono">Y</span>.
                </p>
              </div>
            )}
          </div>

          {/* Functional Dependence Scaling Predictor (Skill 2.D) */}
          <div className="bg-[#040b09] border border-emerald-500/25 rounded-xl p-2.5 space-y-1.5 text-[10px] font-mono tabular-nums">
            <div className="text-emerald-400 font-bold uppercase">
              Functional Dependence Predictor (Skill 2.D)
            </div>
            {descriptor.id === 'projectile_2d' ? (
              <>
                <div className="flex justify-between text-slate-300">
                  <span>Speed Scale Multiplier k:</span>
                  <span className="text-purple-300 font-bold">{params.scaleFactor}× v₀</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Flight Time Ratio t′ / t:</span>
                  <span className="text-sky-300">
                    {state.metrics.timeRatio?.toFixed(2) ?? '1.00'}× (∝ v₀¹)
                  </span>
                </div>
                <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1">
                  <span>Range Ratio R′ / R:</span>
                  <span>
                    {state.metrics.rangeRatio?.toFixed(2) ?? '1.00'}× (∝ v₀²)
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[10px] font-sans text-slate-300 leading-relaxed">
                Functional scaling rule: In free-fall from rest (<span className="font-mono">h₀</span>
                ), quadrupling height (<span className="font-mono">4h₀</span>) doubles drop time (
                <span className="font-mono">2t</span>) and doubles horizontal range{' '}
                <span className="font-mono">R = v₀x√(2h₀/g)</span>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: EXPERIMENTAL PROCEDURE (3.A) & CLAIM JUSTIFICATION (3.C)      */}
      {/* =================================================================== */}
      {activeTab === 'lab' && (
        <div className="space-y-2">
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  Experimental Data Log (Skill 3.A)
                </div>
                <div className="text-[9.5px] text-slate-400">
                  Vary v₀x or a_x while holding h₀ &amp; g fixed
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onRecordTrial}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[10px] font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>Log Trial</span>
                </button>
                {trials.length > 0 && (
                  <button
                    onClick={onClearTrials}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition cursor-pointer"
                    aria-label="Clear logged trials"
                    title="Clear trials"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {trials.length === 0 ? (
              <div className="text-[10px] text-slate-400 italic py-2 text-center border border-dashed border-white/10 rounded-lg">
                Adjust horizontal speed v₀x or thruster a_x and click &quot;Log Trial&quot; to test
                1.5.A.3 invariance across runs.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full text-[9.5px] font-mono tabular-nums border-collapse"
                  data-testid="motion15-trials-table"
                >
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10 text-left">
                      <th className="py-1 pr-1">#</th>
                      <th className="py-1 px-1">v₀x</th>
                      <th className="py-1 px-1">a_x</th>
                      <th className="py-1 px-1 text-right">t_A</th>
                      <th className="py-1 px-1 text-right">t_B</th>
                      <th className="py-1 pl-1 text-right">R_x</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trials.map(tr => (
                      <tr key={tr.trial} className="text-slate-200">
                        <td className="py-1 pr-1 text-slate-400">{tr.trial}</td>
                        <td className="py-1 px-1 text-sky-300">{tr.vx0.toFixed(1)}</td>
                        <td className="py-1 px-1">{tr.axExtra.toFixed(1)}</td>
                        <td className="py-1 px-1 text-right text-amber-300">
                          {tr.tDropRef.toFixed(2)}s
                        </td>
                        <td className="py-1 px-1 text-right text-emerald-300">
                          {tr.tImpactLaunch.toFixed(2)}s
                        </td>
                        <td className="py-1 pl-1 text-right">{tr.rangeX.toFixed(1)}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Skill 3.C Claim Justification */}
          <div className="bg-[#040b09] border border-emerald-500/25 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Skill 3.C: Justify a Claim</span>
            </div>

            <div className="space-y-1">
              <div className="text-[10.5px] text-slate-200 leading-snug">
                1. Increasing horizontal boost <span className="font-mono text-sky-300">v₀x</span> or{' '}
                <span className="font-mono text-sky-300">a_x</span> makes time-to-ground:
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setClaimDropChoice('same')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimDropChoice === 'same'
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Unchanged (1.5.A.3)
                </button>
                <button
                  onClick={() => setClaimDropChoice('faster')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimDropChoice === 'faster'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Longer in Flight
                </button>
              </div>
              {claimDropChoice && (
                <div
                  className={`text-[9.5px] p-1.5 rounded-lg leading-snug ${
                    claimDropChoice === 'same'
                      ? 'bg-emerald-500/10 text-emerald-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {claimDropChoice === 'same'
                    ? 'Verified: Horizontal components are perpendicular to y and cannot alter vertical fall time.'
                    : 'Not supported by data: t_impact depends solely on h₀, v₀y, and a_y = −g.'}
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1.5 border-t border-white/10">
              <div className="text-[10.5px] text-slate-200 leading-snug">
                2. Per Topic 1.5 Boundary, AP Physics C: Mechanics quantifies motion in:
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setClaimBoundaryChoice('2d')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimBoundaryChoice === '2d'
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Up to 2D (3D Qual.)
                </button>
                <button
                  onClick={() => setClaimBoundaryChoice('3d_quant')}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimBoundaryChoice === '3d_quant'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Full 3D Quant. Only
                </button>
              </div>
              {claimBoundaryChoice && (
                <div
                  className={`text-[9.5px] p-1.5 rounded-lg leading-snug ${
                    claimBoundaryChoice === '2d'
                      ? 'bg-emerald-500/10 text-emerald-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {claimBoundaryChoice === '2d'
                    ? 'Exact: Mechanics quantitatively analyzes 2D; E&M extends qualitative 3D particle descriptions.'
                    : 'Check CED Boundary: Quantitative 3D problems are outside AP Physics C: Mechanics Topic 1.5.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
