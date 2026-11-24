'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  GitCommitHorizontal,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  Newton25Mode,
  Newton25Params,
  PlottedDataPoint,
  TrackPreset,
  applyTrackPresetParams,
  createDefaultNewton25Params,
  evaluateNewton25,
} from '@/lib/physics/newton-second-law-2-5';
import { Newton25Viewport } from './newton25/Newton25Viewport';
import { Newton25AnalysisPanel } from './newton25/Newton25AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface NewtonSecondLaw25WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Newton25Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'unbalanced_track',
    label: '1D Track',
    sub: 'a = ΣF/m & Braking',
    icon: <GitCommitHorizontal className="w-3.5 h-3.5" />,
  },
  {
    id: 'vector_2d',
    label: '2D Vector',
    sub: 'θ_a = θ_F Proof',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'modified_atwood',
    label: 'Atwood Lab',
    sub: 'm_1 + m_2 System',
    icon: <ArrowUpRight className="w-3.5 h-3.5" />,
  },
  {
    id: 'com_system',
    label: 'System COM',
    sub: 'Internal vs F_ext',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
];

const TRACK_PRESETS: { id: TrackPreset; label: string }[] = [
  { id: 'accel_fwd', label: 'Accel +x' },
  { id: 'braking', label: 'Braking' },
  { id: 'double_mass', label: '2× Mass' },
  { id: 'balanced', label: 'ΣF = 0' },
];

export const NewtonSecondLaw25Workbench: React.FC<NewtonSecondLaw25WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Newton25Params>(() =>
    createDefaultNewton25Params('unbalanced_track')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [plottedPoints, setPlottedPoints] = useState<PlottedDataPoint[]>([]);

  const evaluation = useMemo(() => evaluateNewton25(params), [params]);

  // Playback loop for kinematic evolution
  useEffect(() => {
    if (!isPlaying) return;
    let active = true;
    let rafId = 0;
    let lastTs = performance.now();
    const tick = (ts: number) => {
      if (!active) return;
      const dt = Math.min(0.05, (ts - lastTs) * 0.001);
      lastTs = ts;
      setParams(prev => {
        const maxT = prev.mode === 'modified_atwood' ? 1.8 : 2.4;
        const nextT = prev.simTimeS + dt * 0.8;
        return { ...prev, simTimeS: nextT > maxT ? 0 : nextT };
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const handleModeChange = useCallback((mode: Newton25Mode) => {
    setIsPlaying(false);
    setParams(createDefaultNewton25Params(mode));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setParams(prev => createDefaultNewton25Params(prev.mode));
  }, []);

  const handlePlotPoint = useCallback(() => {
    const pt: PlottedDataPoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fNetN: Number(evaluation.fNetMag.toFixed(2)),
      massKg: Number(evaluation.systemMassKg.toFixed(2)),
      invMassPerKg: Number((1 / Math.max(0.1, evaluation.systemMassKg)).toFixed(3)),
      accelMs2: Number(evaluation.aMagSys.toFixed(2)),
      label: `F=${evaluation.fNetMag.toFixed(1)}N, m=${evaluation.systemMassKg.toFixed(1)}kg`,
    };
    setPlottedPoints(prev => [...prev.slice(-14), pt]);
    onToast?.(`Plotted (${pt.fNetN} N, ${pt.accelMs2} m/s²) onto Skill 1.B graph`);
  }, [evaluation, onToast]);

  const handleClearPoints = useCallback(() => {
    setPlottedPoints([]);
    onToast?.('Cleared plotted data points');
  }, [onToast]);

  const activeTitle =
    params.mode === 'unbalanced_track'
      ? 'Unbalanced Forces, Acceleration & Braking'
      : params.mode === 'vector_2d'
      ? '2D Vector Net Force & Acceleration Direction'
      : params.mode === 'modified_atwood'
      ? 'Modified Atwood Constant-Total-Mass Lab'
      : 'System Center of Mass: Internal vs. External';

  const effectiveM1 = params.lockTotalMass
    ? Math.max(0.4, Number((params.totalSystemMassKg - params.hang2MassKg).toFixed(2)))
    : params.cart1MassKg;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-SCREEN 3D/2D WEBGL VIEWPORT */}
      <Newton25Viewport params={params} evaluation={evaluation} viewMode={externalViewMode} />

      {/* ===================================================================== */}
      {/* TOP CENTER HUD BANNER (Positioned cleanly below global top pods)      */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed top-[76px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center max-w-[650px]">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#061410]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-1.5 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[9.5px] font-mono text-emerald-400 tracking-wide whitespace-nowrap">
              UNIT 2 · TOPIC 2.5 · NEWTON’S SECOND LAW
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-bold text-white tracking-tight whitespace-nowrap">
                {activeTitle}
              </h1>
              <span className="text-slate-600">·</span>
              <MathFormula formulaKey="sim-newton25" className="text-emerald-300 text-[11.5px] shrink-0" />
            </div>
          </div>

          <button
            onClick={() => setIsCedOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CED 2.5</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEFT PARAMETER & MODE CONTROL DOCK                                    */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 2.5 Controls"
        className="absolute top-20 left-4 z-20 w-[322px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Second-Law Lab Controls
            </span>
          </div>
          <button
            onClick={() => setIsLeftCollapsed(v => !v)}
            aria-label={isLeftCollapsed ? 'Expand controls panel' : 'Collapse controls panel'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isLeftCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {!isLeftCollapsed && (
          <div className="p-3.5 overflow-y-auto space-y-3.5 text-xs">
            {/* 4 Mode Selector Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {MODE_OPTIONS.map(opt => {
                const active = params.mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleModeChange(opt.id)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      active
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/15'
                        : 'bg-[#040d0a] text-slate-200 border-emerald-500/20 hover:border-emerald-400/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    <div
                      className={`text-[9.5px] font-mono mt-0.5 truncate ${
                        active ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* MODE 1: UNBALANCED TRACK CONTROLS */}
            {params.mode === 'unbalanced_track' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1">
                  {TRACK_PRESETS.map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(prev => applyTrackPresetParams(prev, pr.id));
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                        params.trackPreset === pr.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-300 hover:border-emerald-400/40'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                {/* Forward Force */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Forward Drive Force (F_drive)</span>
                    <span className="font-mono text-emerald-300 font-bold tabular-nums">
                      {params.forwardForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Forward Drive Force"
                    min={0}
                    max={40}
                    step={1}
                    value={params.forwardForceN}
                    onChange={e =>
                      setParams(prev => ({ ...prev, forwardForceN: Number(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Opposing Force */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Opposing Force (F_oppose)</span>
                    <span className="font-mono text-rose-300 font-bold tabular-nums">
                      {params.resistForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Opposing Force"
                    min={0}
                    max={40}
                    step={1}
                    value={params.resistForceN}
                    onChange={e =>
                      setParams(prev => ({ ...prev, resistForceN: Number(e.target.value) }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>

                {/* Cart System Mass */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">System Mass (m_sys)</span>
                    <span className="font-mono text-amber-300 font-bold tabular-nums">
                      {params.cartMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="System Mass"
                    min={1}
                    max={10}
                    step={0.5}
                    value={params.cartMassKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, cartMassKg: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Initial Velocity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Velocity (v_0)</span>
                    <span className="font-mono text-sky-300 font-bold tabular-nums">
                      {params.initialVelMs >= 0 ? '+' : ''}
                      {params.initialVelMs.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Initial Velocity"
                    min={-6}
                    max={6}
                    step={0.5}
                    value={params.initialVelMs}
                    onChange={e =>
                      setParams(prev => ({ ...prev, initialVelMs: Number(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* MODE 2: 2D VECTOR DYNAMICS CONTROLS */}
            {params.mode === 'vector_2d' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-emerald-300 font-mono">F_1 Mag</span>
                      <span className="font-mono text-slate-200">{params.f1MagN.toFixed(0)} N</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Force 1 Magnitude"
                      min={0}
                      max={30}
                      step={1}
                      value={params.f1MagN}
                      onChange={e => setParams(prev => ({ ...prev, f1MagN: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-emerald-300 font-mono">θ_1</span>
                      <span className="font-mono text-slate-200">{params.f1AngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Force 1 Angle"
                      min={0}
                      max={355}
                      step={5}
                      value={params.f1AngleDeg}
                      onChange={e => setParams(prev => ({ ...prev, f1AngleDeg: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-sky-300 font-mono">F_2 Mag</span>
                      <span className="font-mono text-slate-200">{params.f2MagN.toFixed(0)} N</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Force 2 Magnitude"
                      min={0}
                      max={30}
                      step={1}
                      value={params.f2MagN}
                      onChange={e => setParams(prev => ({ ...prev, f2MagN: Number(e.target.value) }))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-sky-300 font-mono">θ_2</span>
                      <span className="font-mono text-slate-200">{params.f2AngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Force 2 Angle"
                      min={0}
                      max={355}
                      step={5}
                      value={params.f2AngleDeg}
                      onChange={e => setParams(prev => ({ ...prev, f2AngleDeg: Number(e.target.value) }))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Puck Mass (m_sys)</span>
                    <span className="font-mono text-amber-300 font-bold">{params.puckMassKg.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Puck Mass"
                    min={1}
                    max={8}
                    step={0.5}
                    value={params.puckMassKg}
                    onChange={e => setParams(prev => ({ ...prev, puckMassKg: Number(e.target.value) }))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Horizontal Speed (v_x0)</span>
                    <span className="font-mono text-sky-300 font-bold">+{params.puckVx0Ms.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Initial Horizontal Speed"
                    min={0}
                    max={5}
                    step={0.5}
                    value={params.puckVx0Ms}
                    onChange={e => setParams(prev => ({ ...prev, puckVx0Ms: Number(e.target.value) }))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* MODE 3: MODIFIED ATWOOD CONTROLS */}
            {params.mode === 'modified_atwood' && (
              <div className="space-y-3">
                {/* Constant Total Mass Transfer Toggle (Classic AP Skill 3.A Lab!) */}
                <button
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      lockTotalMass: !prev.lockTotalMass,
                      totalSystemMassKg: Number((prev.cart1MassKg + prev.hang2MassKg).toFixed(1)),
                    }))
                  }
                  className={`w-full py-2 px-3 rounded-xl border text-[11px] font-semibold transition cursor-pointer ${
                    params.lockTotalMass
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-[#040d0a] border-white/15 text-slate-300 hover:border-emerald-400/50'
                  }`}
                >
                  {params.lockTotalMass
                    ? `Transfer Mass Mode ON (m_1 + m_2 = ${params.totalSystemMassKg.toFixed(1)} kg)`
                    : 'Transfer Mass Mode OFF (Independent m_1, m_2)'}
                </button>

                {/* Hanging Mass m2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">
                      {params.lockTotalMass ? 'Hanging Mass m_2 (Transferred)' : 'Hanging Mass (m_2)'}
                    </span>
                    <span className="font-mono text-rose-300 font-bold tabular-nums">
                      {params.hang2MassKg.toFixed(2)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Hanging Mass m2"
                    min={0.2}
                    max={params.lockTotalMass ? Number((params.totalSystemMassKg - 0.5).toFixed(1)) : 4.0}
                    step={0.2}
                    value={params.hang2MassKg}
                    onChange={e => {
                      const nextM2 = Number(e.target.value);
                      setParams(prev => ({
                        ...prev,
                        hang2MassKg: nextM2,
                        cart1MassKg: prev.lockTotalMass
                          ? Math.max(0.4, Number((prev.totalSystemMassKg - nextM2).toFixed(2)))
                          : prev.cart1MassKg,
                      }));
                    }}
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>

                {/* Cart Mass m1 (or Total System Mass when locked) */}
                {params.lockTotalMass ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Locked Total Mass (m_1 + m_2)</span>
                      <span className="font-mono text-emerald-300 font-bold tabular-nums">
                        {params.totalSystemMassKg.toFixed(1)} kg (m_1={effectiveM1.toFixed(1)})
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Locked Total System Mass"
                      min={2.0}
                      max={8.0}
                      step={0.5}
                      value={params.totalSystemMassKg}
                      onChange={e => {
                        const nextTotal = Number(e.target.value);
                        setParams(prev => {
                          const clampedM2 = Math.min(prev.hang2MassKg, nextTotal - 0.5);
                          return {
                            ...prev,
                            totalSystemMassKg: nextTotal,
                            hang2MassKg: Number(clampedM2.toFixed(2)),
                            cart1MassKg: Number((nextTotal - clampedM2).toFixed(2)),
                          };
                        });
                      }}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Cart Mass (m_1)</span>
                      <span className="font-mono text-emerald-300 font-bold tabular-nums">
                        {params.cart1MassKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Cart Mass m1"
                      min={0.5}
                      max={6.0}
                      step={0.5}
                      value={params.cart1MassKg}
                      onChange={e =>
                        setParams(prev => ({ ...prev, cart1MassKg: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                )}

                <button
                  onClick={() =>
                    setParams(prev => ({ ...prev, showSystemBoundary: !prev.showSystemBoundary }))
                  }
                  className={`w-full py-1.5 px-3 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                    params.showSystemBoundary
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-[#040d0a] border-white/10 text-slate-400'
                  }`}
                >
                  {params.showSystemBoundary
                    ? 'System Boundary Overlay Visible ✓'
                    : 'Show System Boundary Overlay'}
                </button>
              </div>
            )}

            {/* MODE 4: MULTI-OBJECT SYSTEM COM CONTROLS (EK 2.5.A.3) */}
            {params.mode === 'com_system' && (
              <div className="space-y-3">
                <button
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      springTriggered: !prev.springTriggered,
                      simTimeS: prev.springTriggered ? 0.4 : 1.1,
                    }))
                  }
                  className={`w-full py-2 px-3 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                    params.springTriggered
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-[#040d0a] border-white/15 text-slate-300 hover:border-sky-400/50'
                  }`}
                >
                  {params.springTriggered
                    ? 'Internal Spring Push-Off Active (F_int ≠ 0)'
                    : 'Trigger Internal Spring Push-Off'}
                </button>

                {/* Net External Force ΣF_ext */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Net External Force (ΣF_ext)</span>
                    <span className="font-mono text-rose-300 font-bold tabular-nums">
                      {params.externalForceN > 0 ? '+' : ''}
                      {params.externalForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Net External Force"
                    min={-15}
                    max={15}
                    step={1}
                    value={params.externalForceN}
                    onChange={e =>
                      setParams(prev => ({ ...prev, externalForceN: Number(e.target.value) }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>

                {/* Internal Spring Impulse */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Internal Spring Impulse (J_int)</span>
                    <span className="font-mono text-sky-300 font-bold tabular-nums">
                      {params.internalSpringImpulseNs.toFixed(0)} N·s
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Internal Spring Impulse"
                    min={0}
                    max={16}
                    step={1}
                    value={params.internalSpringImpulseNs}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        internalSpringImpulseNs: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Masses A & B */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-emerald-300 font-mono">m_A</span>
                      <span className="font-mono text-slate-200">{params.massAKg.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Cart A Mass"
                      min={1}
                      max={6}
                      step={0.5}
                      value={params.massAKg}
                      onChange={e => setParams(prev => ({ ...prev, massAKg: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-sky-300 font-mono">m_B</span>
                      <span className="font-mono text-slate-200">{params.massBKg.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Cart B Mass"
                      min={1}
                      max={6}
                      step={0.5}
                      value={params.massBKg}
                      onChange={e => setParams(prev => ({ ...prev, massBKg: Number(e.target.value) }))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Playback & Time Scrubber */}
            <div className="pt-2 border-t border-emerald-500/15 space-y-2">
              <div className="flex justify-between text-[10.5px] font-mono">
                <span className="text-slate-400">Elapsed Time t</span>
                <span className="text-emerald-300 tabular-nums">{params.simTimeS.toFixed(2)} s</span>
              </div>
              <input
                type="range"
                aria-label="Elapsed Time"
                min={0}
                max={params.mode === 'modified_atwood' ? 1.8 : 2.4}
                step={0.05}
                value={params.simTimeS}
                onChange={e => {
                  setIsPlaying(false);
                  setParams(prev => ({ ...prev, simTimeS: Number(e.target.value) }));
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause Motion' : 'Play Motion'}</span>
                </button>
                <button
                  onClick={handleReset}
                  aria-label="Reset Defaults"
                  title="Reset Defaults"
                  className="p-2 rounded-xl bg-[#040d0a] hover:bg-white/10 border border-white/15 text-slate-200 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT ANALYSIS PANEL (SKILLS 1.B, 2.B, 2.D, 3.A, 3.C)                 */}
      {/* ===================================================================== */}
      <Newton25AnalysisPanel
        params={params}
        evaluation={evaluation}
        plottedPoints={plottedPoints}
        onPlotDataPoint={handlePlotPoint}
        onClearPoints={handleClearPoints}
      />

      {/* ===================================================================== */}
      {/* BOTTOM COLOR LEGEND & VERDICT STRIP                                   */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed bottom-3.5 left-1/2 -translate-x-1/2 z-20 max-w-[680px] w-[92vw] sm:w-auto">
        <div className="bg-[#061410]/95 border border-emerald-500/25 rounded-2xl px-4 py-2 text-center shadow-2xl">
          <div className="text-[11px] font-semibold text-white leading-snug">
            {evaluation.legendBanner}
          </div>
          <div className="mt-1 flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">
            <span className="text-emerald-300">Forward / Cart m_1</span>
            <span className="text-rose-300">Net External ΣF_ext / Braking</span>
            <span className="text-amber-300">Acceleration a_sys / COM</span>
            <span className="text-sky-300">Velocity v(t) / Internal T</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CED 2.5 COURSE REQUIREMENTS MODAL (Course Framework V.1 | Page 48)    */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 2.5 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#061410] border border-emerald-500/35 rounded-2xl max-w-2xl w-full max-h-[86vh] overflow-y-auto shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10.5px] font-mono text-emerald-400">
                  AP PHYSICS C: MECHANICS · UNIT 2 · COURSE FRAMEWORK V.1 | PAGE 48
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Topic 2.5: Newton’s Second Law
                </h2>
              </div>
              <button
                onClick={() => setIsCedOpen(false)}
                aria-label="Close CED modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-emerald-400">
                LEARNING OBJECTIVE 2.5.A
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Describe the conditions under which a system’s velocity changes.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-mono font-bold text-emerald-400">
                ESSENTIAL KNOWLEDGE
              </div>
              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-mono text-emerald-300 font-bold">2.5.A.1</div>
                <p className="text-slate-200 leading-relaxed">
                  Unbalanced forces are a configuration of forces such that the net force exerted on
                  a system is not equal to zero.
                </p>
              </div>
              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">2.5.A.2</span>
                  <MathFormula formulaKey="sim-newton25-full" className="text-emerald-200 text-xs" />
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Newton’s second law of motion states that the acceleration of a system’s center of
                  mass has a magnitude proportional to the magnitude of the net force exerted on the
                  system and is in the same direction as that net force.
                </p>
              </div>
              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-mono text-emerald-300 font-bold">2.5.A.3</div>
                <p className="text-slate-200 leading-relaxed">
                  The velocity of a system’s center of mass will only change if a nonzero net
                  external force is exerted on that system.
                </p>
              </div>
            </div>

            <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="font-mono text-emerald-400 font-bold text-[11px]">
                SUGGESTED SCIENCE PRACTICES (ALL 5 INTERACTIVE)
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>1.B</strong> Quantitative graphs & plotting data · <strong>2.B</strong>{' '}
                Unknown-quantity calculation · <strong>2.D</strong> Functional dependence & factors
                of change · <strong>3.A</strong> Experimental procedure design · <strong>3.C</strong>{' '}
                Evidence-based claim justification.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <a
                href="/assets/aistudio/Topic_2.5_course_requirements_52ee1d58.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Official Topic 2.5 CED PDF</span>
              </a>
              <button
                onClick={() => setIsCedOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Return to Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
