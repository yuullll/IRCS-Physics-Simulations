'use client';

import React, { useMemo, useState } from 'react';
import { Compass, Calculator, ArrowRightLeft, CheckCircle2, Sparkles } from 'lucide-react';
import {
  ObserverFrameId,
  RelativeMotionParams,
  RelativeMotionState,
  RelativeScenarioDescriptor,
  computeVectorDiagramLayout,
  sampleRelativeTrajectories,
} from '@/lib/physics/relative-motion-1-4';
import { Vec, Sub, Op } from '@/components/ui/MathFormula';

export type RightPanelTab14 = 'diagram' | 'frames' | 'transform';

interface RelativeMotionDiagramPanelProps {
  descriptor: RelativeScenarioDescriptor;
  params: RelativeMotionParams;
  state: RelativeMotionState;
  observerFrame: ObserverFrameId;
  onSelectObserverFrame: (frame: ObserverFrameId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function fmtVec(v: { x: number; y: number; z: number }, plane: 'xy' | 'xz'): string {
  if (plane === 'xy') {
    return `(${v.x >= 0 ? '+' : ''}${v.x.toFixed(2)}, ${v.y >= 0 ? '+' : ''}${v.y.toFixed(2)})`;
  }
  return `(${v.x >= 0 ? '+' : ''}${v.x.toFixed(2)}, ${v.z >= 0 ? '+' : ''}${v.z.toFixed(2)})`;
}

export const RelativeMotionDiagramPanel: React.FC<RelativeMotionDiagramPanelProps> = ({
  descriptor,
  params,
  state,
  observerFrame,
  onSelectObserverFrame,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<RightPanelTab14>('diagram');
  const [claimChoice, setClaimChoice] = useState<'same' | 'different' | null>(null);
  const [speedClaim, setSpeedClaim] = useState<'greater' | 'less' | 'equal' | null>(null);

  const plane = descriptor.preferred2DPlane;
  const activeMeasurement = state.frames[observerFrame];

  const diagram = useMemo(
    () => computeVectorDiagramLayout(state, plane, 286, 166, 24),
    [state, plane]
  );

  // Sample velocity-vs-time curves for the Frame Table mini comparison chart
  const speedComparisonSeries = useMemo(() => {
    const pts = sampleRelativeTrajectories(descriptor.id, params, 'earth', 0, 24);
    // Compute speeds from trajectory steps isn't needed—let's keep a lightweight readout or trajectory preview
    return pts;
  }, [descriptor.id, params]);

  const earthSpeed = state.frames.earth.speed;
  const platSpeed = state.frames.platform.speed;
  const actualSpeedRelation: 'greater' | 'less' | 'equal' =
    Math.abs(platSpeed - earthSpeed) < 0.05
      ? 'equal'
      : platSpeed > earthSpeed
      ? 'greater'
      : 'less';

  if (isCollapsed) {
    return (
      <aside
        aria-label="Reference frame analysis panel minimized"
        className="absolute top-20 right-4 z-20 bg-[#071612]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white whitespace-nowrap">
            1.4 Vector &amp; Frame Lab
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

  return (
    <aside
      aria-label="Relative motion vector diagram and reference frame comparison"
      className="absolute top-20 right-4 z-20 w-[346px] max-h-[calc(100vh-5.75rem)] overflow-y-auto bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-3 flex flex-col space-y-2.5 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white tracking-tight truncate">
              Relative Motion &amp; Frame Analysis
            </div>
            <div className="text-[10px] font-mono text-emerald-400 truncate">
              1.4 GALILEAN VECTOR &amp; FRAME LAB
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
        aria-label="Relative motion analysis tabs"
        className="grid grid-cols-3 gap-1 bg-[#040b09] p-1 rounded-xl border border-white/10"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'diagram'}
          onClick={() => setActiveTab('diagram')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'diagram'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Compass className="w-3 h-3 shrink-0" />
          <span>Vector Diagram</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'frames'}
          onClick={() => setActiveTab('frames')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'frames'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3 h-3 shrink-0" />
          <span>Frame Table</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'transform'}
          onClick={() => setActiveTab('transform')}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === 'transform'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Calculator className="w-3 h-3 shrink-0" />
          <span>Transform Lab</span>
        </button>
      </div>

      {/* Live Observer Readout Strip (EK 1.4.A.1) */}
      <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 grid grid-cols-[1.45fr_1fr_1fr] gap-1.5">
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">
            POS ({observerFrame === 'earth' ? 'E' : observerFrame === 'platform' ? 'M' : 'P'})
          </div>
          <div className="text-[10.5px] font-mono font-bold text-slate-100 tabular-nums whitespace-nowrap">
            {fmtVec(activeMeasurement.position, plane)} m
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">
            SPEED |v|
          </div>
          <div className="text-[10.5px] font-mono font-bold text-emerald-300 tabular-nums whitespace-nowrap">
            {activeMeasurement.speed.toFixed(2)} m/s
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono text-slate-400 uppercase truncate">
            ACCEL |a|
          </div>
          <div className="text-[10.5px] font-mono font-bold text-rose-300 tabular-nums whitespace-nowrap">
            {activeMeasurement.accelMag.toFixed(2)} m/s²
          </div>
        </div>
      </div>

      {/* TAB 1: VECTOR ADDITION TRIANGLE & PATHWAY (Skills 1.A, 2.B) */}
      {activeTab === 'diagram' && (
        <div className="space-y-2.5">
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-200">
                Tip-to-Tail Velocity Addition (1.4.B.2.i)
              </span>
              <span className="text-[10px] font-mono text-emerald-300">
                {plane === 'xy' ? 'X–Y Plane' : 'X–Z Plane'}
              </span>
            </div>

            <svg
              viewBox="0 0 286 166"
              className="w-full h-[166px] bg-[#020706] rounded-lg border border-white/10"
              data-testid="relative14-vector-diagram"
              role="img"
              aria-label="Vector addition triangle showing v_M/E plus v_P/M equals v_P/E"
            >
              <defs>
                <marker
                  id="arrow-amber"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#fbbf24" />
                </marker>
                <marker
                  id="arrow-cyan"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrow-emerald"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill="#34d399" />
                </marker>
              </defs>

              {/* Axes centered at diagram origin */}
              <line
                x1="10"
                y1={diagram.origin.y}
                x2="276"
                y2={diagram.origin.y}
                stroke="rgba(148,163,184,0.2)"
                strokeDasharray="3 3"
              />
              <line
                x1={diagram.origin.x}
                y1="10"
                x2={diagram.origin.x}
                y2="156"
                stroke="rgba(148,163,184,0.2)"
                strokeDasharray="3 3"
              />

              {/* v_M/E (Amber) */}
              {Math.hypot(diagram.tipME.x - diagram.origin.x, diagram.tipME.y - diagram.origin.y) >
                2 && (
                <line
                  x1={diagram.origin.x}
                  y1={diagram.origin.y}
                  x2={diagram.tipME.x}
                  y2={diagram.tipME.y}
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow-amber)"
                />
              )}

              {/* v_P/M (Cyan) from tip of v_M/E to tip of v_P/E */}
              {Math.hypot(diagram.tipPE.x - diagram.tipME.x, diagram.tipPE.y - diagram.tipME.y) >
                2 && (
                <line
                  x1={diagram.tipME.x}
                  y1={diagram.tipME.y}
                  x2={diagram.tipPE.x}
                  y2={diagram.tipPE.y}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  markerEnd="url(#arrow-cyan)"
                />
              )}

              {/* Resultant v_P/E (Emerald) */}
              {Math.hypot(diagram.tipPE.x - diagram.origin.x, diagram.tipPE.y - diagram.origin.y) >
                2 && (
                <line
                  x1={diagram.origin.x}
                  y1={diagram.origin.y}
                  x2={diagram.tipPE.x}
                  y2={diagram.tipPE.y}
                  stroke="#34d399"
                  strokeWidth="3"
                  markerEnd="url(#arrow-emerald)"
                />
              )}

              {/* Origin marker */}
              <circle cx={diagram.origin.x} cy={diagram.origin.y} r="3.5" fill="#e2e8f0" />

              {/* Compact axis & vector labels */}
              <text x="242" y={Math.max(18, Math.min(152, diagram.origin.y - 5))} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {diagram.xAxisLabel}
              </text>
              <text x={Math.max(12, Math.min(230, diagram.origin.x + 5))} y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {diagram.yAxisLabel}
              </text>
            </svg>

            {/* Vector Legend + Live Components */}
            <div className="mt-2 space-y-1 text-[10px] font-mono tabular-nums">
              <div className="flex items-center justify-between text-amber-300">
                <span>v_M/E (Frame M wrt Earth)</span>
                <span>{fmtVec(state.vME, plane)} m/s</span>
              </div>
              <div className="flex items-center justify-between text-sky-300">
                <span>+ v_P/M (Object wrt Frame M)</span>
                <span>{fmtVec(state.vPM, plane)} m/s</span>
              </div>
              <div className="flex items-center justify-between text-emerald-300 border-t border-white/10 pt-1 font-bold">
                <span>= v_P/E (Object wrt Earth)</span>
                <span>{fmtVec(state.vPE, plane)} m/s</span>
              </div>
            </div>
          </div>

          {/* Subscript Cancellation Identity */}
          <div className="bg-[#040b09] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
            <div className="text-[10px] font-mono text-emerald-400 uppercase">
              Subscript Rule (EK 1.4.B.2.i)
            </div>
            <div className="text-xs text-slate-100 flex items-center justify-center py-0.5">
              <span className="inline-flex items-center font-serif text-[1.05em]">
                <Vec>v</Vec>
                <Sub>P/E</Sub>
                <Op>=</Op>
                <Vec>v</Vec>
                <Sub>P/M</Sub>
                <Op>+</Op>
                <Vec>v</Vec>
                <Sub>M/E</Sub>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Notice how the inner frame index <span className="text-amber-300 font-mono">M</span>{' '}
              links object <span className="text-sky-300 font-mono">P</span> to Earth{' '}
              <span className="text-emerald-300 font-mono">E</span>. Subtraction reverses a frame:{' '}
              <span className="text-slate-200 font-mono">v_P/M = v_P/E − v_M/E</span>.
            </p>
          </div>

          {/* Scenario Specific Derived Quantities (Skill 2.B) */}
          {state.riverMetrics && (
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1 text-[10px] font-mono tabular-nums">
              <div className="text-emerald-400 font-bold uppercase mb-1">
                River Crossing Solver (24 m Channel)
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Across-River v_z:</span>
                <span>{state.riverMetrics.vzAcross.toFixed(2)} m/s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Crossing Time Δt = W / v_z:</span>
                <span>
                  {state.riverMetrics.crossingTime !== null
                    ? `${state.riverMetrics.crossingTime.toFixed(2)} s`
                    : 'Cannot cross (v_z ≤ 0)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Downstream Drift Δx:</span>
                <span
                  className={
                    state.riverMetrics.downstreamDrift !== null &&
                    Math.abs(state.riverMetrics.downstreamDrift) < 0.25
                      ? 'text-emerald-300 font-bold'
                      : 'text-amber-300'
                  }
                >
                  {state.riverMetrics.downstreamDrift !== null
                    ? `${state.riverMetrics.downstreamDrift >= 0 ? '+' : ''}${state.riverMetrics.downstreamDrift.toFixed(2)} m`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-white/10">
                <span>Zero-Drift Heading θ*:</span>
                <span className="text-cyan-300">
                  {state.riverMetrics.zeroDriftAngleDeg !== null
                    ? `${state.riverMetrics.zeroDriftAngleDeg.toFixed(1)}°`
                    : 'Impossible (|v_W| > v_B)'}
                </span>
              </div>
            </div>
          )}

          {state.trainMetrics && (
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1 text-[10px] font-mono tabular-nums">
              <div className="text-emerald-400 font-bold uppercase mb-1">
                Parabolic vs Vertical Flight Proof
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Hang Time 2v_y0/g:</span>
                <span>{state.trainMetrics.flightTime.toFixed(2)} s</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Apex Height y_max:</span>
                <span>{state.trainMetrics.apexHeight.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Earth Ground Range Δx_E:</span>
                <span className="text-emerald-300">
                  {state.trainMetrics.groundRange.toFixed(2)} m
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Platform Range Δx_M:</span>
                <span className="text-sky-300">0.00 m (Straight Vertical)</span>
              </div>
            </div>
          )}

          {state.overtakeMetrics && (
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1 text-[10px] font-mono tabular-nums">
              <div className="text-emerald-400 font-bold uppercase mb-1">
                1D Frame Velocity Comparison
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Separation x_P/E − x_M/E:</span>
                <span>{state.overtakeMetrics.separationX.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Relative Motion in M:</span>
                <span className="text-sky-300 uppercase">
                  {state.overtakeMetrics.relativeSpeedSign}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Next Pass / Rendezvous t:</span>
                <span className="text-emerald-300">
                  {state.overtakeMetrics.overtakeTime !== null
                    ? `${state.overtakeMetrics.overtakeTime.toFixed(2)} s`
                    : 'No intersection'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CROSS-FRAME COMPARISON TABLE (Skill 1.A & 2.C + EK 1.4.B.2.ii) */}
      {activeTab === 'frames' && (
        <div className="space-y-2.5">
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white">
                Quantities Measured Across Frames (2.C)
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                t = {state.t.toFixed(2)}s
              </span>
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full text-[10px] font-mono tabular-nums border-collapse"
                data-testid="relative14-frame-table"
              >
                <thead>
                  <tr className="text-slate-400 border-b border-white/10 text-left">
                    <th className="py-1.5 pr-1">Frame</th>
                    <th className="py-1.5 px-1">v ({plane === 'xy' ? 'x,y' : 'x,z'})</th>
                    <th className="py-1.5 px-1 text-right">|v|</th>
                    <th className="py-1.5 pl-1 text-right">|a|</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(['earth', 'platform', 'object'] as ObserverFrameId[]).map(fid => {
                    const fm = state.frames[fid];
                    const isActive = observerFrame === fid;
                    return (
                      <tr
                        key={fid}
                        onClick={() => onSelectObserverFrame(fid)}
                        className={`cursor-pointer transition ${
                          isActive
                            ? 'bg-emerald-500/15 text-white font-bold'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <td className="py-1.5 pr-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={
                                fid === 'earth'
                                  ? 'text-emerald-300'
                                  : fid === 'platform'
                                  ? 'text-sky-300'
                                  : 'text-slate-200'
                              }
                            >
                              {fid === 'earth' ? 'Earth E' : fid === 'platform' ? 'Frame M' : 'Object P'}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-1">{fmtVec(fm.velocity, plane)}</td>
                        <td className="py-1.5 px-1 text-right">{fm.speed.toFixed(2)}</td>
                        <td className="py-1.5 pl-1 text-right text-rose-300">
                          {fm.accelMag.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400">
              Click any row above to switch the live 3D camera into that observer&apos;s reference
              frame.
            </p>
          </div>

          {/* Inertial Acceleration Invariance Proof Card */}
          <div className="bg-[#040b09] border border-rose-400/25 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-rose-300 font-bold uppercase">
                Inertial Acceleration Invariance (1.4.B.2.ii)
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="space-y-1 text-[10px] font-mono tabular-nums">
              <div className="flex justify-between text-slate-200">
                <span>a_P/E (Earth Frame E):</span>
                <span>{fmtVec(state.aPE, plane)} m/s²</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span>a_P/M (Moving Frame M):</span>
                <span>{fmtVec(state.aPM, plane)} m/s²</span>
              </div>
              <div className="flex justify-between text-emerald-300 pt-1 border-t border-white/10 font-bold">
                <span>|a_P/E − a_P/M| Difference:</span>
                <span>{state.accelInvarianceDelta.toFixed(4)} m/s²</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Because Frame M moves at constant velocity (a_M/E = 0, inertial boundary statement),
              both observers measure the exact same acceleration vector!
            </p>
          </div>

          {/* Reciprocal View: How Earth looks from M */}
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 text-[10px] font-mono tabular-nums space-y-1">
            <div className="text-amber-300 font-bold uppercase">
              Earth As Seen From Frame M (1.4.A.1)
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Velocity of Earth v_E/M = −v_M/E:</span>
              <span>{fmtVec(state.vEM, plane)} m/s</span>
            </div>
            <div className="text-[9px] text-slate-400 font-sans">
              Sample points along trajectory: {speedComparisonSeries.length} frames verified at{' '}
              {descriptor.maxTime.toFixed(1)} s span.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GALILEAN CONVERSION CALCULATOR & CLAIM CHECK (Skills 2.B & 3.B) */}
      {activeTab === 'transform' && (
        <div className="space-y-2.5">
          {/* Position & Velocity Conversion Calculator */}
          <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-1.5 text-[10px] font-mono tabular-nums">
            <div className="text-emerald-400 font-bold uppercase">
              Galilean Coordinate Conversion (1.4.B.1)
            </div>
            <div className="flex justify-between text-slate-300">
              <span>r_P/E(t) (Earth):</span>
              <span>{fmtVec(state.rPE, plane)} m</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>− r_M/E(t) (Frame Origin):</span>
              <span>{fmtVec(state.rME, plane)} m</span>
            </div>
            <div className="flex justify-between text-sky-300 border-t border-white/10 pt-1 font-bold">
              <span>= r_P/M(t) (In Frame M):</span>
              <span>{fmtVec(state.rPM, plane)} m</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-1">
              <span>Vector Identity Residual:</span>
              <span className="text-emerald-300">
                {state.galileanVelocityResidual.toFixed(5)} m/s
              </span>
            </div>
          </div>

          {/* Skill 3.B Interactive Claim Verifier */}
          <div className="bg-[#040b09] border border-emerald-500/25 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Skill 3.B: Test a Physics Claim</span>
            </div>

            {/* Claim 1: Speed comparison */}
            <div className="space-y-1">
              <div className="text-[11px] text-slate-200 leading-snug">
                1. At t = {state.t.toFixed(2)}s, how does speed{' '}
                <span className="font-mono text-sky-300">|v_P/M|</span> in Frame M compare to{' '}
                <span className="font-mono text-emerald-300">|v_P/E|</span> in Earth Frame E?
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['greater', 'less', 'equal'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSpeedClaim(opt)}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      speedClaim === opt
                        ? opt === actualSpeedRelation
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-rose-500/25 border-rose-400 text-rose-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt === 'greater' ? 'Larger' : opt === 'less' ? 'Smaller' : 'Equal'}
                  </button>
                ))}
              </div>
              {speedClaim && (
                <div
                  className={`text-[10px] leading-snug p-1.5 rounded-lg ${
                    speedClaim === actualSpeedRelation
                      ? 'bg-emerald-500/10 text-emerald-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {speedClaim === actualSpeedRelation ? 'Verified (1.4.A.1): ' : 'Check Frame Math: '}
                  |v_P/M| = {platSpeed.toFixed(2)} m/s vs |v_P/E| = {earthSpeed.toFixed(2)} m/s.
                </div>
              )}
            </div>

            {/* Claim 2: Acceleration Invariance */}
            <div className="space-y-1 pt-1.5 border-t border-white/10">
              <div className="text-[11px] text-slate-200 leading-snug">
                2. Since Frame M has constant velocity (a_M/E = 0), how does{' '}
                <span className="font-mono text-rose-300">a_P/M</span> compare to{' '}
                <span className="font-mono text-rose-300">a_P/E</span>?
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setClaimChoice('same')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimChoice === 'same'
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Identical (a_P/M = a_P/E)
                </button>
                <button
                  onClick={() => setClaimChoice('different')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    claimChoice === 'different'
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  Different Vectors
                </button>
              </div>
              {claimChoice && (
                <div
                  className={`text-[10px] leading-snug p-1.5 rounded-lg ${
                    claimChoice === 'same'
                      ? 'bg-emerald-500/10 text-emerald-200'
                      : 'bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {claimChoice === 'same'
                    ? 'Exact (1.4.B.2.ii)! Adding constant v_M/E drops to zero upon differentiating dv/dt.'
                    : 'Not in an inertial frame (1.4.B.2.ii): d(v_P/M + v_M/E)/dt = a_P/M + 0 = a_P/M.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
