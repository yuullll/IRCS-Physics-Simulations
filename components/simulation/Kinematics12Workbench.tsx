'use client';

import React, { useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Compass,
  BookOpen,
  X,
  CheckCircle2,
  Box,
  CircleDot,
  Clock,
  Eye,
} from 'lucide-react';
import {
  MotionScenarioId,
  MotionParams,
  DEFAULT_MOTION_PARAMS,
  MOTION_SCENARIOS,
  evaluateMotionState,
  computeIntervalAnalysis,
} from '@/lib/physics/kinematics-1-2';
import { Kinematics12Viewport, ObjectModelMode } from './kinematics12/Kinematics12Viewport';
import { KinematicsGraphsPanel } from './kinematics12/KinematicsGraphsPanel';
import { MathFormula, Var, Vec, Frac, Sub, BigInt } from '@/components/ui/MathFormula';

interface Kinematics12WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

export const Kinematics12Workbench: React.FC<Kinematics12WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
  onViewModeChange,
}) => {
  const [scenario, setScenario] = useState<MotionScenarioId>('cubic_turnaround');
  const [paramsByScenario, setParamsByScenario] = useState<Record<MotionScenarioId, MotionParams>>(() => ({
    cubic_turnaround: { ...DEFAULT_MOTION_PARAMS.cubic_turnaround },
    oscillating_wave: { ...DEFAULT_MOTION_PARAMS.oscillating_wave },
    curved_turning: { ...DEFAULT_MOTION_PARAMS.curved_turning },
    constant_speed_turn: { ...DEFAULT_MOTION_PARAMS.constant_speed_turn },
    custom_poly: { ...DEFAULT_MOTION_PARAMS.custom_poly },
  }));

  const [t1, setT1] = useState<number>(1.0);
  const [dt, setDt] = useState<number>(2.0);
  const [simTime, setSimTime] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // 1.2.A.1 Object Model Toggle
  const [objectModel, setObjectModel] = useState<ObjectModelMode>('extended');

  // Vector Visibility Flags
  const [showDeltaR, setShowDeltaR] = useState<boolean>(true);
  const [showVAvg, setShowVAvg] = useState<boolean>(true);
  const [showVInst, setShowVInst] = useState<boolean>(true);
  const [showAInst, setShowAInst] = useState<boolean>(true);
  const [showAComponents, setShowAComponents] = useState<boolean>(false);

  // Panel Collapsible States & CED Modal
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isCedModalOpen, setIsCedModalOpen] = useState<boolean>(false);

  const descriptor = useMemo(
    () => MOTION_SCENARIOS.find(s => s.id === scenario) || MOTION_SCENARIOS[0],
    [scenario]
  );
  const activeParams = paramsByScenario[scenario];

  const effectiveT1 = Math.min(t1, Math.max(0.2, descriptor.maxTime - 0.1));
  const effectiveDt = Math.min(dt, Math.max(0.05, descriptor.maxTime - effectiveT1));

  const analysis = useMemo(
    () => computeIntervalAnalysis(scenario, effectiveT1, effectiveDt, activeParams),
    [scenario, effectiveT1, effectiveDt, activeParams]
  );

  const playState = useMemo(
    () => evaluateMotionState(scenario, simTime, activeParams),
    [scenario, simTime, activeParams]
  );

  const updateActiveParam = (key: keyof MotionParams, value: number) => {
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [key]: value,
      },
    }));
  };

  const handleSelectScenario = (nextId: MotionScenarioId) => {
    setScenario(nextId);
    setIsPlaying(false);
    setT1(1.0);
    setDt(nextId === 'constant_speed_turn' ? 1.5 : 2.0);
    setSimTime(1.0);
    // Automatically spotlight tangential/normal components in constant-speed turn (EK 1.2.B.4)
    if (nextId === 'constant_speed_turn') {
      setShowAComponents(true);
    }
    const found = MOTION_SCENARIOS.find(s => s.id === nextId);
    onToast?.(`Loaded ${found?.title || nextId}`);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: { ...DEFAULT_MOTION_PARAMS[scenario] },
    }));
    setT1(1.0);
    setDt(2.0);
    setSimTime(1.0);
    onToast?.('Reset motion scenario & interval to defaults');
  };

  const handleScrubTime = (nextT: number) => {
    setIsPlaying(false);
    setSimTime(Math.max(0, Math.min(descriptor.maxTime, nextT)));
  };

  const handleSelectDt = (nextDt: number) => {
    const maxAllowed = Math.max(0.05, descriptor.maxTime - effectiveT1);
    setDt(Math.min(nextDt, maxAllowed));
  };

  return (
    <div className="relative w-full h-full bg-[#040b09] text-slate-100 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 3D / 2D WEBGL LABORATORY VIEWPORT (FULL SCREEN UNDERLAY)              */}
      {/* ===================================================================== */}
      <Kinematics12Viewport
        scenario={scenario}
        maxTime={descriptor.maxTime}
        params={activeParams}
        t1={effectiveT1}
        dt={effectiveDt}
        simTime={simTime}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        objectModel={objectModel}
        viewMode={externalViewMode}
        showVInst={showVInst}
        showVAvg={showVAvg}
        showAInst={showAInst}
        showAComponents={showAComponents}
        showDeltaR={showDeltaR}
        analysis={analysis}
        onAdvanceTime={setSimTime}
      />

      {/* ===================================================================== */}
      {/* LEFT PANEL: KINEMATICS 1.2 CONTROLS & INTERVAL EXPLORER               */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 1.2 simulation controls"
        className={`absolute top-20 left-4 z-20 ${
          isLeftCollapsed ? 'w-64' : 'w-80 max-h-[calc(100vh-5.75rem)] overflow-y-auto'
        } bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-3 flex flex-col space-y-2 shadow-2xl transition-all duration-200`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-tight truncate">
                1.2 Kinematics Controls
              </div>
              <div className="text-[10px] font-mono text-emerald-400 truncate">
                {descriptor.cedFocus}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsCedModalOpen(true)}
              className="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1 whitespace-nowrap"
              title="Open Topic 1.2 Course Requirements & Skills Alignment"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>CED 1.2</span>
            </button>
            <button
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              className="text-[11px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-white/10 transition whitespace-nowrap"
            >
              {isLeftCollapsed ? 'Expand' : 'Min'}
            </button>
          </div>
        </div>

        {!isLeftCollapsed && (
          <>
            {/* Scenario Preset Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="k12-scenario-select"
                className="flex items-center justify-between text-[11px] font-semibold text-slate-300"
              >
                <span>Motion Trajectory Scenario</span>
                <span className="font-mono text-[10px] text-emerald-400">{descriptor.dimension}</span>
              </label>
              <select
                id="k12-scenario-select"
                value={scenario}
                onChange={e => handleSelectScenario(e.target.value as MotionScenarioId)}
                className="w-full bg-[#040b09] border border-emerald-500/35 text-slate-100 text-xs rounded-xl p-2 focus:border-emerald-400 focus:outline-none cursor-pointer"
              >
                {MOTION_SCENARIOS.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.title}
                  </option>
                ))}
              </select>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10 text-[11px] text-slate-300 leading-snug">
                <div className="font-mono text-emerald-300 font-bold mb-0.5">
                  {descriptor.equationLabel}
                </div>
                {descriptor.description}
              </div>
            </div>

            {/* Object Model Toggle (EK 1.2.A.1) */}
            <div className="bg-[#040b09]/90 p-2.5 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white">Object Model (EK 1.2.A.1)</span>
                <span className="font-mono text-[10px] text-sky-300">
                  {objectModel === 'extended' ? '3D Body' : 'Single Point'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setObjectModel('extended');
                    onToast?.('Extended 3D Rover view active');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition ${
                    objectModel === 'extended'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Extended Rover</span>
                </button>
                <button
                  onClick={() => {
                    setObjectModel('point_mass');
                    onToast?.('Point-Mass Abstraction (EK 1.2.A.1): size & internal shape ignored');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border flex items-center justify-center gap-1.5 transition ${
                    objectModel === 'point_mass'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                  }`}
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  <span>Point-Mass Model</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {objectModel === 'point_mass'
                  ? 'Internal structure ignored: object modeled as a single point with mass at r(t).'
                  : 'Switch to Point-Mass Model to apply AP Physics EK 1.2.A.1 particle abstraction.'}
              </p>
            </div>

            {/* Playback & Timeline Scrubber */}
            <div className="bg-[#040b09]/90 p-2.5 rounded-xl border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Motion Playback</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-300 font-bold">
                  t = {simTime.toFixed(2)}s / {descriptor.maxTime.toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setIsPlaying(prev => !prev)}
                  className={`col-span-2 py-1.5 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                    isPlaying
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold flex items-center justify-center gap-1 transition"
                  title="Reset parameters and timeline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => setPlaybackSpeed(s => (s === 1 ? 0.5 : s === 0.5 ? 2 : 1))}
                  className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 font-mono font-bold transition"
                  title="Cycle playback speed"
                >
                  {playbackSpeed}x
                </button>
              </div>

              <div>
                <label htmlFor="k12-time-scrubber" className="sr-only">
                  Timeline scrubber t in seconds
                </label>
                <input
                  id="k12-time-scrubber"
                  type="range"
                  min={0}
                  max={descriptor.maxTime}
                  step={0.05}
                  value={simTime}
                  onChange={e => handleScrubTime(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Interval [t1, t1 + Δt] Secant -> Tangent Limit Explorer */}
            <div className="bg-[#040b09]/90 p-2.5 rounded-xl border border-amber-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">
                  Calculus Interval [t₁, t₂] (1.2.B–C)
                </span>
                <span className="font-mono text-[10px] text-amber-300">
                  [{effectiveT1.toFixed(2)}s, {analysis.t2.toFixed(2)}s]
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <label htmlFor="k12-t1-slider">Initial Instant t₁:</label>
                  <span className="font-mono text-sky-300 font-bold">{effectiveT1.toFixed(2)} s</span>
                </div>
                <input
                  id="k12-t1-slider"
                  type="range"
                  min={0}
                  max={Math.max(0.5, descriptor.maxTime - 0.5)}
                  step={0.05}
                  value={effectiveT1}
                  onChange={e => {
                    const nextT1 = parseFloat(e.target.value);
                    setT1(nextT1);
                    setSimTime(nextT1);
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <label htmlFor="k12-dt-slider">Interval Width Δt:</label>
                  <span className="font-mono text-amber-300 font-bold">{effectiveDt.toFixed(2)} s</span>
                </div>
                <input
                  id="k12-dt-slider"
                  type="range"
                  min={0.05}
                  max={Math.max(0.5, descriptor.maxTime - effectiveT1)}
                  step={0.05}
                  value={effectiveDt}
                  onChange={e => handleSelectDt(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="grid grid-cols-5 gap-1 pt-0.5 font-mono text-[10px]">
                  {[2.0, 1.0, 0.5, 0.2, 0.05].map(presetDt => (
                    <button
                      key={presetDt}
                      onClick={() => handleSelectDt(presetDt)}
                      className={`py-1 rounded font-bold transition ${
                        Math.abs(effectiveDt - presetDt) < 0.02
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {presetDt}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scenario-Specific Motion Parameters */}
            <div className="bg-[#040b09]/90 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-[11px]">
              <div className="font-bold text-white">Scenario Parameters</div>
              {(scenario === 'cubic_turnaround' || scenario === 'custom_poly') && (
                <>
                  <ParamRow
                    id="param-vx0"
                    label="vₓ₀ (m/s)"
                    value={activeParams.vx0}
                    min={-10}
                    max={12}
                    step={0.5}
                    onChange={v => updateActiveParam('vx0', v)}
                  />
                  <ParamRow
                    id="param-ax0"
                    label="aₓ₀ (m/s²)"
                    value={activeParams.ax0}
                    min={-8}
                    max={8}
                    step={0.2}
                    onChange={v => updateActiveParam('ax0', v)}
                  />
                  <ParamRow
                    id="param-jx"
                    label="Jerk jₓ (m/s³)"
                    value={activeParams.jx}
                    min={-1.5}
                    max={1.5}
                    step={0.05}
                    onChange={v => updateActiveParam('jx', v)}
                  />
                </>
              )}

              {scenario === 'oscillating_wave' && (
                <>
                  <ParamRow
                    id="param-amp"
                    label="Amplitude A (m)"
                    value={activeParams.amplitude}
                    min={2}
                    max={10}
                    step={0.5}
                    onChange={v => updateActiveParam('amplitude', v)}
                  />
                  <ParamRow
                    id="param-omega"
                    label="Freq ω (rad/s)"
                    value={activeParams.omega}
                    min={0.4}
                    max={2.4}
                    step={0.05}
                    onChange={v => updateActiveParam('omega', v)}
                  />
                </>
              )}

              {scenario === 'constant_speed_turn' && (
                <>
                  <ParamRow
                    id="param-radius"
                    label="Turn Radius R (m)"
                    value={activeParams.radius}
                    min={2.5}
                    max={8.5}
                    step={0.5}
                    onChange={v => updateActiveParam('radius', v)}
                  />
                  <ParamRow
                    id="param-omega-turn"
                    label="Angular ω (rad/s)"
                    value={activeParams.omega}
                    min={0.4}
                    max={2.2}
                    step={0.05}
                    onChange={v => updateActiveParam('omega', v)}
                  />
                </>
              )}

              {scenario === 'curved_turning' && (
                <>
                  <ParamRow
                    id="param-vx0-2d"
                    label="vₓ₀ (m/s)"
                    value={activeParams.vx0}
                    min={-6}
                    max={6}
                    step={0.2}
                    onChange={v => updateActiveParam('vx0', v)}
                  />
                  <ParamRow
                    id="param-vy0-2d"
                    label="v_z0 (m/s)"
                    value={activeParams.vy0}
                    min={-6}
                    max={8}
                    step={0.2}
                    onChange={v => updateActiveParam('vy0', v)}
                  />
                  <ParamRow
                    id="param-ay0-2d"
                    label="a_z (m/s²)"
                    value={activeParams.ay0}
                    min={-4}
                    max={4}
                    step={0.2}
                    onChange={v => updateActiveParam('ay0', v)}
                  />
                </>
              )}
            </div>

            {/* 3D Vector Overlays + Camera Toggle */}
            <div className="bg-[#040b09]/90 p-2.5 rounded-xl border border-white/10 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-bold text-white pb-0.5">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3D Vector Overlays</span>
                </span>
                {onViewModeChange && (
                  <button
                    onClick={() => onViewModeChange(externalViewMode === '3d' ? '2d' : '3d')}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono"
                  >
                    {externalViewMode === '3d' ? 'Switch 2D Top' : 'Switch 3D Orbit'}
                  </button>
                )}
              </div>

              <VectorCheckbox
                label="Displacement Chord Δr = r₂ − r₁"
                colorClass="text-amber-300"
                checked={showDeltaR}
                onChange={setShowDeltaR}
              />
              <VectorCheckbox
                label="Average Velocity v_avg (Secant)"
                colorClass="text-amber-400"
                checked={showVAvg}
                onChange={setShowVAvg}
              />
              <VectorCheckbox
                label="Instantaneous Velocity v(t)"
                colorClass="text-emerald-400"
                checked={showVInst}
                onChange={setShowVInst}
              />
              <VectorCheckbox
                label="Instantaneous Acceleration a(t)"
                colorClass="text-rose-400"
                checked={showAInst}
                onChange={setShowAInst}
              />
              <VectorCheckbox
                label="Speed (a∥) & Turn (a⊥) Components"
                colorClass="text-purple-300"
                checked={showAComponents}
                onChange={setShowAComponents}
              />
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT PANEL: QUANTITATIVE x-v-a GRAPHS & CALCULUS PROOF AUDITOR       */}
      {/* ===================================================================== */}
      <aside
        aria-label="Quantitative kinematics graphs and calculus analysis"
        className={`absolute top-20 right-4 z-20 ${
          isRightCollapsed ? 'w-72' : 'w-[25rem] max-h-[calc(100vh-6.25rem)] overflow-y-auto'
        } bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col space-y-3 shadow-2xl transition-all duration-200`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white tracking-tight">
                Calculus &amp; Kinematics Graphs
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                1.2 POSITION · VELOCITY · ACCELERATION
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsRightCollapsed(prev => !prev)}
            className="text-[11px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-white/10 transition"
          >
            {isRightCollapsed ? 'Expand' : 'Minimize'}
          </button>
        </div>

        {!isRightCollapsed && (
          <KinematicsGraphsPanel
            scenario={scenario}
            dimension={descriptor.dimension}
            maxTime={descriptor.maxTime}
            params={activeParams}
            t1={effectiveT1}
            dt={effectiveDt}
            simTime={simTime}
            analysis={analysis}
            playState={playState}
            onScrubTime={handleScrubTime}
            onSelectDt={handleSelectDt}
          />
        )}
      </aside>

      {/* ===================================================================== */}
      {/* BOTTOM-CENTER COMPACT VECTOR LEGEND (UNOBSTRUCTED VIEWPORT)           */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-10 hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#071612]/95 border border-emerald-500/30 text-[11px] font-mono shadow-xl">
        <span className="flex items-center gap-1.5 text-sky-300">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          t₁ ({effectiveT1.toFixed(1)}s)
        </span>
        <span className="flex items-center gap-1.5 text-purple-300">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          t₂ ({analysis.t2.toFixed(1)}s)
        </span>
        <span className="flex items-center gap-1.5 text-amber-300">
          <span className="w-3 h-1 rounded bg-amber-400" />
          Δr &amp; v_avg
        </span>
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-3 h-1 rounded bg-emerald-400" />
          v(t) = dr/dt
        </span>
        <span className="flex items-center gap-1.5 text-rose-300">
          <span className="w-3 h-1 rounded bg-rose-400" />
          a(t) = dv/dt
        </span>
        {showAComponents && (
          <>
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="w-3 h-1 rounded bg-sky-400" />
              a∥ (speed)
            </span>
            <span className="flex items-center gap-1.5 text-purple-300">
              <span className="w-3 h-1 rounded bg-purple-400" />
              a⊥ (turn)
            </span>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* TOPIC 1.2 COURSE REQUIREMENTS & CED ALIGNMENT MODAL                   */}
      {/* ===================================================================== */}
      {isCedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ced-1-2-modal-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-[#071612] border border-emerald-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                  AP Physics C: Mechanics · Unit 1 Kinematics
                </div>
                <h2 id="ced-1-2-modal-title" className="text-xl font-bold text-white mt-0.5">
                  Topic 1.2: Displacement, Velocity, and Acceleration
                </h2>
              </div>
              <button
                onClick={() => setIsCedModalOpen(false)}
                aria-label="Close Topic 1.2 curriculum guide"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1.2.A: Position, Object Model &amp; Displacement</span>
                </div>
                <p>
                  <strong>1.2.A.1 Object Model:</strong> Toggle <em>Extended Rover</em> vs{' '}
                  <em>Point-Mass Model</em> to verify how ignoring size, shape, and internal structure simplifies kinematics to tracking a single point <Var>r</Var>(<Var>t</Var>).
                </p>
                <p>
                  <strong>1.2.A.2 Displacement:</strong>{' '}
                  <MathFormula fallbackText="Δx = x - x₀" /> and vector{' '}
                  <Vec>Δr</Vec> = <Vec>r</Vec>(<Var>t</Var><Sub>2</Sub>) − <Vec>r</Vec>(<Var>t</Var><Sub>1</Sub>) connects start and end directly, differing from scalar path length whenever motion curves or reverses.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1.2.B: Average Velocity, Average Acceleration &amp; Turning</span>
                </div>
                <p>
                  <strong>1.2.B.1–3:</strong> <Vec>v</Vec><Sub>avg</Sub> ={' '}
                  <Frac num={<><Vec>Δr</Vec></>} den={<><Var>Δt</Var></>} /> and{' '}
                  <Vec>a</Vec><Sub>avg</Sub> ={' '}
                  <Frac num={<><Vec>Δv</Vec></>} den={<><Var>Δt</Var></>} /> depend strictly on endpoints over [t₁, t₂].
                </p>
                <p>
                  <strong>1.2.B.4:</strong> Select <em>2D Constant-Speed Turn (1.2.B.4)</em> to verify that an object accelerates even at constant speed |<Vec>v</Vec>| when the velocity vector changes direction (a∥ = 0, a⊥ ≠ 0).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1.2.C: Calculus Derivatives, Limits &amp; Definite Integrals</span>
                </div>
                <p>
                  <strong>1.2.C.1:</strong> Shrink Δt toward 0.05s in the <em>Δt→0 Limit</em> tab to watch the secant slope converge onto the instantaneous tangent{' '}
                  <Vec>v</Vec> = <Frac num={<><Var>d</Var><Vec>r</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />,{' '}
                  <Vec>a</Vec> = <Frac num={<><Var>d</Var><Vec>v</Vec></>} den={<><Var>d</Var><Var>t</Var></>} />.
                </p>
                <p>
                  <strong>1.2.C.2:</strong> Verify that{' '}
                  <Var>Δx</Var> = <BigInt /> <Var>v</Var><Sub>x</Sub>(<Var>t</Var>) <Var>d</Var><Var>t</Var> and{' '}
                  <Var>Δv</Var><Sub>x</Sub> = <BigInt /> <Var>a</Var><Sub>x</Sub>(<Var>t</Var>) <Var>d</Var><Var>t</Var> match the shaded graph areas identically.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/35 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] text-emerald-300 font-bold uppercase block">
                    AP Suggested Skills Covered
                  </span>
                  <span className="text-[11px] text-slate-300">
                    1.B (Quantitative Graphs) · 2.B &amp; 2.C (Calculus &amp; Comparisons) · 3.A &amp; 3.C (Experimental Verification)
                  </span>
                </div>
                <a
                  href="/assets/aistudio/Topic_1.2_course_requirements_bd4bb74b.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold text-[11px]"
                >
                  View Topic 1.2 CED PDF
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setIsCedModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition"
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

const ParamRow: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}> = ({ id, label, value, min, max, step, onChange }) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-slate-300">
      <label htmlFor={id}>{label}:</label>
      <span className="font-mono text-emerald-300 font-bold">{value.toFixed(2)}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full accent-emerald-400 cursor-pointer"
    />
  </div>
);

const VectorCheckbox: React.FC<{
  label: string;
  colorClass: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ label, colorClass, checked, onChange }) => (
  <label className="flex items-center justify-between gap-2 cursor-pointer py-0.5">
    <span className={colorClass}>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-emerald-400 cursor-pointer"
    />
  </label>
);
