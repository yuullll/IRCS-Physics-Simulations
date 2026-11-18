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
  Eye,
  Anchor,
} from 'lucide-react';
import {
  RelativeScenarioId,
  ObserverFrameId,
  RelativeMotionParams,
  DEFAULT_RELATIVE_PARAMS,
  RELATIVE_SCENARIOS,
  evaluateRelativeState,
} from '@/lib/physics/relative-motion-1-4';
import { RelativeMotion14Viewport } from './relativemotion14/RelativeMotion14Viewport';
import { RelativeMotionDiagramPanel } from './relativemotion14/RelativeMotionDiagramPanel';
import { Vec, Sub, Op } from '@/components/ui/MathFormula';

interface RelativeMotion14WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

export const RelativeMotion14Workbench: React.FC<RelativeMotion14WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
  onViewModeChange,
}) => {
  const [scenario, setScenario] = useState<RelativeScenarioId>('train_toss');
  const [observerFrame, setObserverFrame] = useState<ObserverFrameId>('earth');
  const [paramsByScenario, setParamsByScenario] = useState<
    Record<RelativeScenarioId, RelativeMotionParams>
  >(() => ({
    train_toss: { ...DEFAULT_RELATIVE_PARAMS.train_toss },
    river_crossing: { ...DEFAULT_RELATIVE_PARAMS.river_crossing },
    highway_overtake: { ...DEFAULT_RELATIVE_PARAMS.highway_overtake },
    crosswind_accel: { ...DEFAULT_RELATIVE_PARAMS.crosswind_accel },
  }));

  const [simTime, setSimTime] = useState<number>(0.8);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Vector & Trail Visibility Flags
  const [showVPE, setShowVPE] = useState<boolean>(true);
  const [showVPM, setShowVPM] = useState<boolean>(true);
  const [showVME, setShowVME] = useState<boolean>(true);
  const [showAccel, setShowAccel] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);

  // Panels & Curriculum Modal
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isCedModalOpen, setIsCedModalOpen] = useState<boolean>(false);

  const descriptor = useMemo(
    () => RELATIVE_SCENARIOS.find(s => s.id === scenario) || RELATIVE_SCENARIOS[0],
    [scenario]
  );
  const activeParams = paramsByScenario[scenario];

  const simState = useMemo(
    () => evaluateRelativeState(scenario, simTime, activeParams),
    [scenario, simTime, activeParams]
  );

  const updateActiveParam = (key: keyof RelativeMotionParams, value: number) => {
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [key]: value,
      },
    }));
  };

  const handleSelectScenario = (nextId: RelativeScenarioId) => {
    setScenario(nextId);
    setIsPlaying(false);
    setSimTime(nextId === 'train_toss' ? 0.8 : 2.0);
    const found = RELATIVE_SCENARIOS.find(s => s.id === nextId);
    onToast?.(`Loaded ${found?.title || nextId}`);
  };

  const handleSelectObserverFrame = (nextFrame: ObserverFrameId) => {
    setObserverFrame(nextFrame);
    const label =
      nextFrame === 'earth'
        ? descriptor.earthLabel
        : nextFrame === 'platform'
        ? descriptor.platformLabel
        : descriptor.objectLabel;
    onToast?.(`Switched observer reference frame to ${label}`);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setParamsByScenario(prev => ({
      ...prev,
      [scenario]: { ...DEFAULT_RELATIVE_PARAMS[scenario] },
    }));
    setSimTime(scenario === 'train_toss' ? 0.8 : 2.0);
    setObserverFrame('earth');
    onToast?.('Reset relative motion scenario & observer frame');
  };

  const handleSnapZeroDrift = () => {
    if (simState.riverMetrics?.zeroDriftAngleDeg !== null && simState.riverMetrics) {
      updateActiveParam(
        'boatHeadingDeg',
        Number(simState.riverMetrics.zeroDriftAngleDeg.toFixed(1))
      );
      onToast?.(
        `Aligned boat heading to ${simState.riverMetrics.zeroDriftAngleDeg.toFixed(1)}° upstream for zero drift`
      );
    }
  };

  return (
    <div className="relative w-full h-full bg-[#040b09] text-slate-100 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 3D / 2D WEBGL VIEWPORT (FULL SCREEN UNDERLAY)                         */}
      {/* ===================================================================== */}
      <RelativeMotion14Viewport
        scenario={scenario}
        preferred2DPlane={descriptor.preferred2DPlane}
        maxTime={descriptor.maxTime}
        params={activeParams}
        simTime={simTime}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        observerFrame={observerFrame}
        viewMode={externalViewMode}
        showVPE={showVPE}
        showVPM={showVPM}
        showVME={showVME}
        showAccel={showAccel}
        showTrails={showTrails}
        onAdvanceTime={setSimTime}
      />

      {/* ===================================================================== */}
      {/* LEFT PANEL: REFERENCE FRAME & SCENARIO CONTROLS                       */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 1.4 simulation controls"
        className={`absolute top-20 left-4 z-20 ${
          isLeftCollapsed ? 'w-64' : 'w-80 max-h-[calc(100vh-5.75rem)] overflow-y-auto'
        } bg-[#071612]/95 border border-emerald-500/30 rounded-2xl p-2.5 flex flex-col space-y-1.5 shadow-2xl transition-all duration-200`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-tight truncate">
                1.4 Reference Frames
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
              title="View AP Physics C Topic 1.4 Curriculum Requirements"
            >
              <BookOpen className="w-3 h-3" />
              <span>CED 1.4</span>
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
                htmlFor="r14-scenario-select"
                className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-between"
              >
                <span>Relative Motion Scenario</span>
                <span className="text-emerald-300">{descriptor.dimensionLabel}</span>
              </label>
              <select
                id="r14-scenario-select"
                value={scenario}
                onChange={e => handleSelectScenario(e.target.value as RelativeScenarioId)}
                className="w-full bg-[#040b09] border border-emerald-500/35 text-slate-100 text-xs rounded-xl p-2 focus:border-emerald-400 focus:outline-none cursor-pointer"
              >
                {RELATIVE_SCENARIOS.map(sc => (
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

            {/* Active Observer Reference Frame Switcher (LO 1.4.A & 1.4.B) */}
            <div className="bg-[#040b09] border border-emerald-500/25 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-slate-400 uppercase">
                  Observer Frame (1.4.A.1)
                </span>
                <span className="font-mono text-emerald-300">
                  {observerFrame === 'earth'
                    ? 'Frame E'
                    : observerFrame === 'platform'
                    ? 'Frame M'
                    : 'Frame P'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => handleSelectObserverFrame('earth')}
                  className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer whitespace-nowrap ${
                    observerFrame === 'earth'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold shadow'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  Earth (E)
                </button>
                <button
                  onClick={() => handleSelectObserverFrame('platform')}
                  className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer whitespace-nowrap ${
                    observerFrame === 'platform'
                      ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold shadow'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  Frame M
                </button>
                <button
                  onClick={() => handleSelectObserverFrame('object')}
                  className={`py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition border cursor-pointer whitespace-nowrap ${
                    observerFrame === 'object'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  Object P
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                {observerFrame === 'earth'
                  ? `Ground track E stays stationary; ${descriptor.platformLabel} moves at v_M/E.`
                  : observerFrame === 'platform'
                  ? `${descriptor.platformLabel} stays stationary; Earth ground streams past at −v_M/E.`
                  : `Co-moving with ${descriptor.objectLabel}; P appears momentarily at rest at origin.`}
              </p>
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
                Frame &amp; Object Parameters
              </div>

              {scenario === 'train_toss' && (
                <>
                  <ParamSlider
                    label="Cart Speed v_M/E (m/s):"
                    value={activeParams.vMEx}
                    min={-10}
                    max={10}
                    step={0.5}
                    onChange={v => updateActiveParam('vMEx', v)}
                  />
                  <ParamSlider
                    label="Launch Speed v_y0 (m/s):"
                    value={activeParams.vPMy}
                    min={4}
                    max={16}
                    step={0.5}
                    onChange={v => updateActiveParam('vPMy', v)}
                  />
                  <ParamSlider
                    label="Gravity g (m/s²):"
                    value={activeParams.accelMag}
                    min={2}
                    max={15}
                    step={0.2}
                    onChange={v => updateActiveParam('accelMag', v)}
                  />
                </>
              )}

              {scenario === 'river_crossing' && (
                <>
                  <ParamSlider
                    label="River Current v_W/E (m/s):"
                    value={activeParams.vMEx}
                    min={0}
                    max={6}
                    step={0.2}
                    onChange={v => updateActiveParam('vMEx', v)}
                  />
                  <ParamSlider
                    label="Boat Speed v_B/W (m/s):"
                    value={activeParams.boatSpeed}
                    min={2}
                    max={10}
                    step={0.2}
                    onChange={v => updateActiveParam('boatSpeed', v)}
                  />
                  <ParamSlider
                    label="Boat Heading θ (°):"
                    value={activeParams.boatHeadingDeg}
                    min={-75}
                    max={75}
                    step={1}
                    onChange={v => updateActiveParam('boatHeadingDeg', v)}
                  />
                  {simState.riverMetrics?.zeroDriftAngleDeg !== null && (
                    <button
                      onClick={handleSnapZeroDrift}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-[10px] font-semibold text-cyan-200 transition cursor-pointer"
                    >
                      <Anchor className="w-3 h-3" />
                      <span>
                        Snap Zero-Drift θ* (
                        {simState.riverMetrics?.zeroDriftAngleDeg?.toFixed(1)}°)
                      </span>
                    </button>
                  )}
                </>
              )}

              {scenario === 'highway_overtake' && (
                <>
                  <ParamSlider
                    label="Observer Car M Speed (m/s):"
                    value={activeParams.vMEx}
                    min={0}
                    max={15}
                    step={0.5}
                    onChange={v => updateActiveParam('vMEx', v)}
                  />
                  <ParamSlider
                    label="Test Car P Speed v_P0 (m/s):"
                    value={activeParams.vPMx}
                    min={0}
                    max={15}
                    step={0.5}
                    onChange={v => updateActiveParam('vPMx', v)}
                  />
                  <ParamSlider
                    label="Test Car P Accel a_x (m/s²):"
                    value={activeParams.accelMag}
                    min={-3}
                    max={3}
                    step={0.2}
                    onChange={v => updateActiveParam('accelMag', v)}
                  />
                  <ParamSlider
                    label="Initial Lead Δx₀ (m):"
                    value={activeParams.p0x}
                    min={-15}
                    max={25}
                    step={1}
                    onChange={v => updateActiveParam('p0x', v)}
                  />
                </>
              )}

              {scenario === 'crosswind_accel' && (
                <>
                  <ParamSlider
                    label="Wind X v_M/E,x (m/s):"
                    value={activeParams.vMEx}
                    min={-6}
                    max={6}
                    step={0.5}
                    onChange={v => updateActiveParam('vMEx', v)}
                  />
                  <ParamSlider
                    label="Wind Z v_M/E,z (m/s):"
                    value={activeParams.vMEz}
                    min={-6}
                    max={6}
                    step={0.5}
                    onChange={v => updateActiveParam('vMEz', v)}
                  />
                  <ParamSlider
                    label="Drone Thrust |a| (m/s²):"
                    value={activeParams.accelMag}
                    min={0}
                    max={3.5}
                    step={0.1}
                    onChange={v => updateActiveParam('accelMag', v)}
                  />
                  <ParamSlider
                    label="Thrust Heading (°):"
                    value={activeParams.accelAngleDeg}
                    min={0}
                    max={360}
                    step={5}
                    onChange={v => updateActiveParam('accelAngleDeg', v)}
                  />
                </>
              )}
            </div>

            {/* 3D Vector Overlays */}
            <div className="bg-[#040b09] border border-white/10 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  Vector Overlays
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
                      ? `Switch 2D (${descriptor.preferred2DPlane.toUpperCase()})`
                      : 'Switch 3D Orbit'}
                  </button>
                )}
              </div>

              <OverlayCheck
                label="Earth Velocity v_P/E"
                colorClass="text-emerald-300"
                checked={showVPE}
                onChange={setShowVPE}
              />
              <OverlayCheck
                label="Relative Velocity v_P/M"
                colorClass="text-sky-300"
                checked={showVPM}
                onChange={setShowVPM}
              />
              <OverlayCheck
                label="Frame Velocity v_M/E"
                colorClass="text-amber-300"
                checked={showVME}
                onChange={setShowVME}
              />
              <OverlayCheck
                label="Invariant Accel a_P"
                colorClass="text-rose-300"
                checked={showAccel}
                onChange={setShowAccel}
              />
              <OverlayCheck
                label="Frame Trajectory Trails"
                colorClass="text-slate-200"
                checked={showTrails}
                onChange={setShowTrails}
              />
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT PANEL: VECTOR DIAGRAM, FRAME TABLE & GALILEAN LAB               */}
      {/* ===================================================================== */}
      <RelativeMotionDiagramPanel
        descriptor={descriptor}
        params={activeParams}
        state={simState}
        observerFrame={observerFrame}
        onSelectObserverFrame={handleSelectObserverFrame}
        isCollapsed={isRightCollapsed}
        onToggleCollapse={() => setIsRightCollapsed(prev => !prev)}
      />

      {/* ===================================================================== */}
      {/* BOTTOM-CENTER COMPACT VECTOR LEGEND                                   */}
      {/* ===================================================================== */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#071612]/95 border border-emerald-500/25 text-[10px] font-mono shadow-xl">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
          <span>v_P/E (Earth)</span>
        </span>
        <span className="flex items-center gap-1.5 text-sky-300">
          <span className="w-3 h-0.5 bg-sky-400 inline-block" />
          <span>v_P/M (Frame M)</span>
        </span>
        <span className="flex items-center gap-1.5 text-amber-300">
          <span className="w-3 h-0.5 bg-amber-400 inline-block" />
          <span>v_M/E (Frame wrt E)</span>
        </span>
        <span className="flex items-center gap-1.5 text-rose-300">
          <span className="w-3 h-0.5 bg-rose-400 inline-block" />
          <span>a_P (Invariant)</span>
        </span>
      </div>

      {/* ===================================================================== */}
      {/* CED TOPIC 1.4 CURRICULUM REQUIREMENTS MODAL                           */}
      {/* ===================================================================== */}
      {isCedModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ced-14-title"
        >
          <div className="w-full max-w-2xl bg-[#071612] border border-emerald-500/35 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono text-emerald-400 uppercase">
                  AP Physics C: Mechanics · Unit 1 Kinematics
                </div>
                <h2 id="ced-14-title" className="text-lg font-bold text-white mt-0.5">
                  Topic 1.4: Reference Frames and Relative Motion
                </h2>
              </div>
              <button
                onClick={() => setIsCedModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Close Topic 1.4 curriculum guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1.4.A: Describing the Reference Frame of an Observer</span>
                </div>
                <p>
                  <strong>1.4.A.1:</strong> The choice of reference frame determines both the{' '}
                  <em>direction</em> and <em>magnitude</em> of position and velocity measured by an
                  observer. Switch between <em>Earth (E)</em>, <em>Frame M</em>, and{' '}
                  <em>Object P</em> in the passing-lane scenario to observe velocity sign reversal
                  (<span className="font-mono">v_P/M &lt; 0</span> even when{' '}
                  <span className="font-mono">v_P/E &gt; 0</span>).
                </p>
              </div>

              <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1.4.B: Inertial Frame Conversions &amp; Vector Addition</span>
                </div>
                <p>
                  <strong>1.4.B.1 &amp; 1.4.B.2.i:</strong> Measurements convert cleanly across
                  inertial frames via vector addition or subtraction:{' '}
                  <span className="inline-flex items-center font-serif">
                    <Vec>v</Vec>
                    <Sub>P/E</Sub>
                    <Op>=</Op>
                    <Vec>v</Vec>
                    <Sub>P/M</Sub>
                    <Op>+</Op>
                    <Vec>v</Vec>
                    <Sub>M/E</Sub>
                  </span>{' '}
                  and{' '}
                  <span className="inline-flex items-center font-serif">
                    <Vec>v</Vec>
                    <Sub>P/M</Sub>
                    <Op>=</Op>
                    <Vec>v</Vec>
                    <Sub>P/E</Sub>
                    <Op>−</Op>
                    <Vec>v</Vec>
                    <Sub>M/E</Sub>
                  </span>
                  . Use <em>2D River Current Crossing</em> to cancel drift using tip-to-tail vectors.
                </p>
                <p>
                  <strong>1.4.B.2.ii (Acceleration Invariance):</strong> The acceleration of any
                  object is identical as measured from all inertial reference frames (
                  <span className="inline-flex items-center font-serif text-rose-300">
                    <Vec>a</Vec>
                    <Sub>P/E</Sub>
                    <Op>=</Op>
                    <Vec>a</Vec>
                    <Sub>P/M</Sub>
                  </span>
                  ). Observe how the <em>Train Car Launch</em> yields straight vertical motion in
                  Frame M and a 2D parabola in Frame E while both share{' '}
                  <span className="inline-flex items-center font-serif text-slate-100">
                    <Vec>a</Vec>
                    <Op>=</Op>
                    −g ĵ
                  </span>
                  .
                </p>
              </div>

              <div className="bg-[#040b09] border border-emerald-500/20 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] text-slate-300">
                  <div className="font-bold text-white">AP Boundary &amp; Suggested Skills</div>
                  Inertial Frame Assumption · 1.A (Diagrams/Tables) · 2.B &amp; 2.C (Calculations
                  &amp; Comparisons) · 3.B (Claim Justification)
                </div>
                <a
                  href="/assets/aistudio/Topic_1.4_course_requirements_785b752e.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-[11px] font-semibold text-emerald-200 transition whitespace-nowrap"
                >
                  View Topic 1.4 CED PDF
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
