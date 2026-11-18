'use client';

import React, { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  BookOpen,
  X,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import {
  Motion15ScenarioId,
  Motion15Params,
  ExperimentalTrialRow,
  DEFAULT_MOTION15_PARAMS,
  MOTION15_SCENARIOS,
  evaluateMotion15State,
  solveFreeFallImpactTime,
} from '@/lib/physics/motion-2d-3d-1-5';
import { Motion15Viewport } from './motion15/Motion15Viewport';
import { Motion15AnalysisPanel } from './motion15/Motion15AnalysisPanel';
import { Vec, Sub, Op } from '@/components/ui/MathFormula';

interface Motion15WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

function getDefaultTimeForScenario(id: Motion15ScenarioId): number {
  switch (id) {
    case 'drop_vs_launch':
      return 0.85;
    case 'projectile_2d':
      return 1.15;
    case 'nonuniform_2d':
      return 1.8;
    case 'qualitative_3d':
      return 2.2;
  }
}

export const Motion15Workbench: React.FC<Motion15WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
  onViewModeChange,
}) => {
  const [scenario, setScenario] = useState<Motion15ScenarioId>('drop_vs_launch');
  const [paramsByScenario, setParamsByScenario] = useState<
    Record<Motion15ScenarioId, Motion15Params>
  >(() => ({
    drop_vs_launch: { ...DEFAULT_MOTION15_PARAMS.drop_vs_launch },
    projectile_2d: { ...DEFAULT_MOTION15_PARAMS.projectile_2d },
    nonuniform_2d: { ...DEFAULT_MOTION15_PARAMS.nonuniform_2d },
    qualitative_3d: { ...DEFAULT_MOTION15_PARAMS.qualitative_3d },
  }));

  const [simTime, setSimTime] = useState<number>(0.85);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // 3D Vector & Projection Overlays
  const [showTotalVel, setShowTotalVel] = useState<boolean>(true);
  const [showComponentVel, setShowComponentVel] = useState<boolean>(true);
  const [showAccel, setShowAccel] = useState<boolean>(true);
  const [showProjections, setShowProjections] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);

  // Experimental Data Trials (Skill 3.A)
  const [trials, setTrials] = useState<ExperimentalTrialRow[]>([]);

  // Panels & CED Curriculum Modal
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isCedModalOpen, setIsCedModalOpen] = useState<boolean>(false);

  const descriptor = useMemo(
    () => MOTION15_SCENARIOS.find(s => s.id === scenario) || MOTION15_SCENARIOS[0],
    [scenario]
  );
  const activeParams = paramsByScenario[scenario];

  const simState = useMemo(
    () => evaluateMotion15State(scenario, simTime, activeParams),
    [scenario, simTime, activeParams]
  );

  const updateActiveParam = <K extends keyof Motion15Params>(
    key: K,
    value: Motion15Params[K]
  ) => {
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [key]: value,
      },
    }));
  };

  const handleSelectScenario = (nextId: Motion15ScenarioId) => {
    setScenario(nextId);
    setIsPlaying(false);
    setSimTime(getDefaultTimeForScenario(nextId));
    const found = MOTION15_SCENARIOS.find(s => s.id === nextId);
    onToast?.(`Loaded ${found?.title || nextId}`);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: { ...DEFAULT_MOTION15_PARAMS[scenario] },
    }));
    setSimTime(getDefaultTimeForScenario(scenario));
    onToast?.('Reset 2D/3D scenario parameters & timeline');
  };

  const handleRecordTrial = () => {
    const tDrop = solveFreeFallImpactTime(activeParams.h0, 0, activeParams.gravity) ?? 0;
    let vx0Log = activeParams.vx0;
    let axLog = activeParams.axExtra;
    let tLaunch =
      solveFreeFallImpactTime(activeParams.h0, activeParams.vy0, activeParams.gravity) ?? tDrop;
    let rangeX = vx0Log * tLaunch + 0.5 * axLog * tLaunch * tLaunch;

    if (scenario === 'projectile_2d') {
      const rad = (activeParams.launchAngleDeg * Math.PI) / 180;
      vx0Log = activeParams.launchSpeed * Math.cos(rad);
      axLog = 0;
      tLaunch = simState.metrics.impactTimePrimary ?? tDrop;
      rangeX = simState.metrics.horizontalRange;
    } else if (scenario !== 'drop_vs_launch') {
      rangeX = simState.primary.r.x;
      tLaunch = simTime;
      axLog = simState.primary.a.x;
    }

    const row: ExperimentalTrialRow = {
      trial: trials.length + 1,
      vx0: vx0Log,
      axExtra: axLog,
      h0: activeParams.h0,
      tDropRef: tDrop,
      tImpactLaunch: tLaunch,
      rangeX,
      yDeltaAtImpact: simState.referenceDrop
        ? Math.abs(simState.primary.r.y - simState.referenceDrop.r.y)
        : 0,
    };
    setTrials(prev => [...prev, row]);
    onToast?.(
      `Logged Trial #${row.trial}: t_A = ${row.tDropRef.toFixed(2)}s, t_B = ${row.tImpactLaunch.toFixed(2)}s`
    );
  };

  return (
    <div className="relative w-full h-full bg-[#040b09] text-slate-100 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 2D / 3D WEBGL VIEWPORT (FULL SCREEN UNDERLAY)                         */}
      {/* ===================================================================== */}
      <Motion15Viewport
        scenario={scenario}
        maxTime={descriptor.maxTime}
        params={activeParams}
        simTime={simTime}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        viewMode={externalViewMode}
        showTotalVel={showTotalVel}
        showComponentVel={showComponentVel}
        showAccel={showAccel}
        showProjections={showProjections}
        showTrails={showTrails}
        onAdvanceTime={setSimTime}
      />

      {/* ===================================================================== */}
      {/* LEFT PANEL: SCENARIO, PARAMETERS & VECTOR OVERLAYS                    */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 1.5 simulation controls"
        className={`absolute top-20 left-4 z-20 ${
          isLeftCollapsed ? 'w-64' : 'w-80 max-h-[calc(100vh-5.75rem)] overflow-y-auto'
        } bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-2.5 flex flex-col space-y-1.5 shadow-2xl transition-all duration-200`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-tight truncate">
                1.5 Motion in 2D / 3D
              </div>
              <div className="text-[10px] font-mono text-emerald-400 truncate">
                {descriptor.cedFocus}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsCedModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-semibold text-emerald-200 transition cursor-pointer whitespace-nowrap"
              title="View AP Physics C Topic 1.5 Curriculum Requirements"
            >
              <BookOpen className="w-3 h-3" />
              <span>CED 1.5</span>
            </button>
            <button
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer whitespace-nowrap"
            >
              {isLeftCollapsed ? 'Expand' : 'Min'}
            </button>
          </div>
        </div>

        {!isLeftCollapsed && (
          <>
            {/* Scenario Selector */}
            <div className="space-y-1">
              <label
                htmlFor="m15-scenario-select"
                className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between"
              >
                <span>2D / 3D Experiment</span>
                <span
                  className={
                    descriptor.isQuantitative2D ? 'text-emerald-300' : 'text-amber-300'
                  }
                >
                  {descriptor.isQuantitative2D ? '2D Quant.' : '3D Boundary'}
                </span>
              </label>
              <select
                id="m15-scenario-select"
                value={scenario}
                onChange={e => handleSelectScenario(e.target.value as Motion15ScenarioId)}
                className="w-full bg-[#040b09] border border-emerald-500/35 text-slate-100 text-xs rounded-xl p-2 focus:border-emerald-400 focus:outline-none cursor-pointer"
              >
                {MOTION15_SCENARIOS.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title}
                  </option>
                ))}
              </select>
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 text-[10px] text-slate-300 leading-relaxed">
                <div className="font-mono text-emerald-300 text-[10px] mb-0.5">
                  {descriptor.equationText}
                </div>
                {descriptor.summary}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400 uppercase">Simulation Time</span>
                <span className="text-emerald-300 tabular-nums">
                  t = {simTime.toFixed(2)}s / {descriptor.maxTime.toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition cursor-pointer"
                  title="Reset parameters and time"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() =>
                    setPlaybackSpeed(s => (s === 1 ? 0.5 : s === 0.5 ? 2 : 1))
                  }
                  className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-emerald-300 transition cursor-pointer"
                  title="Cycle playback speed"
                >
                  {playbackSpeed}x
                </button>
              </div>
              <label className="block">
                <span className="sr-only">Timeline scrubber t in seconds</span>
                <input
                  type="range"
                  aria-label="Timeline scrubber t in seconds"
                  min={0}
                  max={descriptor.maxTime}
                  step={0.05}
                  value={simTime}
                  onChange={e => {
                    setIsPlaying(false);
                    setSimTime(parseFloat(e.target.value));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </label>
            </div>

            {/* Scenario Parameters */}
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Component Initial &amp; Accel Controls
              </div>

              {scenario === 'drop_vs_launch' && (
                <>
                  <ParamSlider
                    label="Release Height h₀ (m):"
                    value={activeParams.h0}
                    min={4}
                    max={22}
                    step={0.5}
                    onChange={v => updateActiveParam('h0', v)}
                  />
                  <ParamSlider
                    label="Horizontal Launch v₀x (m/s):"
                    value={activeParams.vx0}
                    min={0}
                    max={14}
                    step={0.5}
                    onChange={v => updateActiveParam('vx0', v)}
                  />
                  <ParamSlider
                    label="Independent X-Thruster a_x (m/s²):"
                    value={activeParams.axExtra}
                    min={-4}
                    max={8}
                    step={0.5}
                    onChange={v => updateActiveParam('axExtra', v)}
                  />
                  <ParamSlider
                    label="Gravity g (m/s²):"
                    value={activeParams.gravity}
                    min={2}
                    max={15}
                    step={0.2}
                    onChange={v => updateActiveParam('gravity', v)}
                  />
                </>
              )}

              {scenario === 'projectile_2d' && (
                <>
                  <ParamSlider
                    label="Launch Speed v₀ (m/s):"
                    value={activeParams.launchSpeed}
                    min={6}
                    max={22}
                    step={0.5}
                    onChange={v => updateActiveParam('launchSpeed', v)}
                  />
                  <ParamSlider
                    label="Launch Angle θ (°):"
                    value={activeParams.launchAngleDeg}
                    min={15}
                    max={78}
                    step={1}
                    onChange={v => updateActiveParam('launchAngleDeg', v)}
                  />
                  <ParamSlider
                    label="Cliff Height h₀ (m):"
                    value={activeParams.h0}
                    min={0}
                    max={14}
                    step={0.5}
                    onChange={v => updateActiveParam('h0', v)}
                  />
                  <ParamSlider
                    label="Gravity g (m/s²):"
                    value={activeParams.gravity}
                    min={2}
                    max={15}
                    step={0.2}
                    onChange={v => updateActiveParam('gravity', v)}
                  />
                  <div className="pt-1 border-t border-white/10 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-purple-300 font-semibold">
                        Skill 2.D Scaled Ghost (k·v₀):
                      </span>
                      <span className="font-mono text-purple-300">{activeParams.scaleFactor}×</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {([1, 1.5, 2] as const).map(k => (
                        <button
                          key={k}
                          onClick={() => updateActiveParam('scaleFactor', k)}
                          className={`py-1 px-2 rounded-lg text-[10.5px] font-mono border transition cursor-pointer ${
                            activeParams.scaleFactor === k
                              ? 'bg-purple-500/30 border-purple-400 text-purple-100 font-bold'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          {k}× v₀
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {scenario === 'nonuniform_2d' && (
                <>
                  <ParamSlider
                    label="Initial v₀x (m/s):"
                    value={activeParams.vx0}
                    min={0}
                    max={8}
                    step={0.5}
                    onChange={v => updateActiveParam('vx0', v)}
                  />
                  <ParamSlider
                    label="Base Accel a₀x (m/s²):"
                    value={activeParams.ax0}
                    min={-2}
                    max={4}
                    step={0.2}
                    onChange={v => updateActiveParam('ax0', v)}
                  />
                  <ParamSlider
                    label="Linear Jerk j_x (m/s³):"
                    value={activeParams.jerkX}
                    min={-1.5}
                    max={3}
                    step={0.2}
                    onChange={v => updateActiveParam('jerkX', v)}
                  />
                  <ParamSlider
                    label="Y-Oscillation A_y (m/s²):"
                    value={activeParams.ayAmp}
                    min={1}
                    max={10}
                    step={0.5}
                    onChange={v => updateActiveParam('ayAmp', v)}
                  />
                  <ParamSlider
                    label="Frequency ω_y (rad/s):"
                    value={activeParams.omegaY}
                    min={0.5}
                    max={4}
                    step={0.1}
                    onChange={v => updateActiveParam('omegaY', v)}
                  />
                </>
              )}

              {scenario === 'qualitative_3d' && (
                <>
                  <ParamSlider
                    label="Helix Radius R (m):"
                    value={activeParams.helixRadius}
                    min={2}
                    max={8}
                    step={0.5}
                    onChange={v => updateActiveParam('helixRadius', v)}
                  />
                  <ParamSlider
                    label="Angular Rate ω (rad/s):"
                    value={activeParams.helixOmega}
                    min={0.5}
                    max={4.5}
                    step={0.1}
                    onChange={v => updateActiveParam('helixOmega', v)}
                  />
                  <ParamSlider
                    label="Vertical Accel a_y (m/s²):"
                    value={activeParams.azThrustY}
                    min={-1}
                    max={3}
                    step={0.2}
                    onChange={v => updateActiveParam('azThrustY', v)}
                  />
                  <ParamSlider
                    label="Initial Drift v₀y (m/s):"
                    value={activeParams.vy0}
                    min={0.5}
                    max={4}
                    step={0.1}
                    onChange={v => updateActiveParam('vy0', v)}
                  />
                </>
              )}
            </div>

            {/* 3D Vector & Projection Overlays */}
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  Vectors &amp; Shadows
                </span>
                {onViewModeChange && (
                  <button
                    onClick={() => onViewModeChange(externalViewMode === '3d' ? '2d' : '3d')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                      externalViewMode === '2d'
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    {externalViewMode === '3d'
                      ? scenario === 'qualitative_3d'
                        ? 'Switch 2D (XZ)'
                        : 'Switch 2D (XY)'
                      : 'Switch 3D Orbit'}
                  </button>
                )}
              </div>

              <OverlayCheck
                label="Total Velocity Vector v"
                colorClass="text-emerald-300"
                checked={showTotalVel}
                onChange={setShowTotalVel}
              />
              <OverlayCheck
                label={
                  scenario === 'qualitative_3d'
                    ? 'Components v_x, v_y, v_z'
                    : 'Components v_x, v_y'
                }
                colorClass="text-sky-300"
                checked={showComponentVel}
                onChange={setShowComponentVel}
              />
              <OverlayCheck
                label="Acceleration Vector a"
                colorClass="text-rose-300"
                checked={showAccel}
                onChange={setShowAccel}
              />
              <OverlayCheck
                label="Orthogonal Axis Shadows"
                colorClass="text-cyan-300"
                checked={showProjections}
                onChange={setShowProjections}
              />
              <OverlayCheck
                label="Trajectory Trails"
                colorClass="text-slate-200"
                checked={showTrails}
                onChange={setShowTrails}
              />
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT PANEL: 1.B GRAPHS, 2.A/2.D MATH & 3.A/3.C LAB                   */}
      {/* ===================================================================== */}
      <Motion15AnalysisPanel
        descriptor={descriptor}
        params={activeParams}
        state={simState}
        trials={trials}
        onRecordTrial={handleRecordTrial}
        onClearTrials={() => setTrials([])}
        isCollapsed={isRightCollapsed}
        onToggleCollapse={() => setIsRightCollapsed(prev => !prev)}
      />

      {/* ===================================================================== */}
      {/* BOTTOM-CENTER COMPACT VECTOR LEGEND                                   */}
      {/* ===================================================================== */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#071612]/95 border border-emerald-500/25 text-[10px] font-mono shadow-xl">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
          <span>v (Total)</span>
        </span>
        <span className="flex items-center gap-1.5 text-sky-300">
          <span className="w-3 h-0.5 bg-sky-400 inline-block" />
          <span>v_x (Horiz.)</span>
        </span>
        <span className="flex items-center gap-1.5 text-violet-300">
          <span className="w-3 h-0.5 bg-violet-400 inline-block" />
          <span>v_y (Vert.)</span>
        </span>
        {scenario === 'qualitative_3d' && (
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" />
            <span>v_z (Depth)</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-rose-300">
          <span className="w-3 h-0.5 bg-rose-400 inline-block" />
          <span>a (Accel)</span>
        </span>
        {scenario === 'drop_vs_launch' && (
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Body A (Drop)</span>
          </span>
        )}
      </div>

      {/* ===================================================================== */}
      {/* CED TOPIC 1.5 CURRICULUM REQUIREMENTS MODAL                           */}
      {/* ===================================================================== */}
      {isCedModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ced-15-title"
        >
          <div className="w-full max-w-2xl bg-[#071612] border border-emerald-500/35 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono text-emerald-400 uppercase">
                  AP Physics C: Mechanics · Unit 1 Kinematics
                </div>
                <h2 id="ced-15-title" className="text-lg font-bold text-white mt-0.5">
                  Topic 1.5: Motion in Two or Three Dimensions
                </h2>
              </div>
              <button
                onClick={() => setIsCedModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Close Topic 1.5 curriculum guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Learning Objective 1.5.A &amp; Component Independence (1.5.A.1–1.5.A.3)</span>
                </div>
                <p>
                  <strong>1.5.A.1:</strong> Motion in 2D or 3D can be analyzed using 1D kinematic
                  relationships once separated into orthogonal components:{' '}
                  <span className="inline-flex items-center font-serif text-emerald-200">
                    <Vec>r</Vec>(t) <Op>=</Op> x(t) î <Op>+</Op> y(t) ĵ <Op>+</Op> z(t) k̂
                  </span>
                  .
                </p>
                <p>
                  <strong>1.5.A.2:</strong> Velocity and acceleration may differ in each dimension
                  and may be nonuniform (<span className="font-mono">a_x(t), a_y(t)</span>). Use{' '}
                  <em>Nonuniform 2D Acceleration</em> to integrate time-varying components
                  separately.
                </p>
                <p>
                  <strong>1.5.A.3:</strong> Motion in one dimension may be changed without causing
                  a change in a perpendicular dimension. Firing the horizontal X-thruster or
                  changing <span className="font-mono">v₀x</span> never alters vertical fall time{' '}
                  <span className="font-mono">t_drop = √(2h₀/g)</span>.
                </p>
              </div>

              <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Projectile Special Case (1.5.A.4) &amp; Boundary Statement</span>
                </div>
                <p>
                  <strong>1.5.A.4:</strong> Projectile motion is a special case of 2D motion with
                  zero acceleration in one dimension (<span className="font-mono">a_x = 0</span>)
                  and constant, nonzero acceleration in the second dimension (
                  <span className="font-mono">a_y = −g</span>).
                </p>
                <p>
                  <strong>Boundary Statement:</strong> AP Physics C: Mechanics expects quantitative
                  analysis only in <strong>2D</strong>, whereas AP Physics C: Electricity &amp;
                  Magnetism expects qualitative description of particle motion in{' '}
                  <strong>3D</strong> (illustrated in the <em>3D Helical Motion</em> mode).
                </p>
              </div>

              <div className="bg-[#040b09] border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] text-slate-300">
                  <div className="font-bold text-white">Suggested AP Skills Covered</div>
                  1.B (Quantitative Graphs) · 2.A (Symbolic Derivation) · 2.D (Functional Scaling) ·
                  3.A (Experimental Procedure) · 3.C (Claim Justification)
                </div>
                <a
                  href="/assets/aistudio/Topic_1.5_course_requirements_2ac0fe21.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-[11px] font-semibold text-emerald-200 transition whitespace-nowrap"
                >
                  View Topic 1.5 CED PDF
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsCedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

const ParamSlider: React.FC<ParamSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}) => (
  <label className="block space-y-0.5">
    <div className="flex justify-between text-[10px]">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono text-emerald-300 tabular-nums">{value.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-400 cursor-pointer"
    />
  </label>
);

interface OverlayCheckProps {
  label: string;
  colorClass: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

const OverlayCheck: React.FC<OverlayCheckProps> = ({
  label,
  colorClass,
  checked,
  onChange,
}) => (
  <label className="flex items-center justify-between text-[11px] cursor-pointer">
    <span className={colorClass}>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="accent-emerald-400 cursor-pointer"
    />
  </label>
);
