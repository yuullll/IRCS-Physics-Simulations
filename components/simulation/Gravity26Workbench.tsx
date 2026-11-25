'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ExternalLink,
  Globe,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  ASTRO_BODIES,
  AstroBodyPreset,
  ElevatorPreset,
  Gravity26Mode,
  Gravity26Params,
  applyElevatorPreset,
  createDefaultGravity26Params,
  evaluateGravity26,
} from '@/lib/physics/gravitational-force-2-6';
import { Gravity26Viewport } from './gravity26/Gravity26Viewport';
import { Gravity26AnalysisPanel } from './gravity26/Gravity26AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Gravity26WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Gravity26Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'universal_field',
    label: 'Universal Law',
    sub: 'F_g = GMm/r² & g',
    icon: <Orbit className="w-3.5 h-3.5" />,
  },
  {
    id: 'near_surface',
    label: 'Constant g',
    sub: 'h ≪ R & m_g = m_i',
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  {
    id: 'apparent_weight',
    label: 'Apparent Wt',
    sub: 'F_N & Equivalence',
    icon: <ArrowDownUp className="w-3.5 h-3.5" />,
  },
  {
    id: 'shell_theorem',
    label: 'Shell Theorem',
    sub: 'Hollow & Solid Core',
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
];

const ELEVATOR_PRESETS: { id: ElevatorPreset; label: string }[] = [
  { id: 'rest', label: 'Rest' },
  { id: 'accel_up', label: 'Up +a' },
  { id: 'accel_down', label: 'Down -a' },
  { id: 'free_fall', label: 'Free Fall' },
  { id: 'equivalence', label: 'Equiv.' },
];

export const Gravity26Workbench: React.FC<Gravity26WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Gravity26Params>(() =>
    createDefaultGravity26Params('universal_field')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);

  const evaluation = useMemo(() => evaluateGravity26(params), [params]);

  // Smooth kinematic playback loop (throttled ~20Hz React updates for software-WebGL responsiveness)
  useEffect(() => {
    if (!isPlaying) return;
    let active = true;
    let timerId = 0;
    let lastTs = performance.now();
    const tick = () => {
      if (!active) return;
      const now = performance.now();
      const dt = Math.min(0.08, (now - lastTs) * 0.001);
      lastTs = now;
      setParams(prev => {
        const maxT =
          prev.mode === 'shell_theorem'
            ? 7.6
            : prev.mode === 'near_surface'
            ? 2.6
            : 3.2;
        const nextT = prev.simTimeS + dt;
        return { ...prev, simTimeS: nextT > maxT ? 0 : nextT };
      });
      timerId = window.setTimeout(tick, 50);
    };
    timerId = window.setTimeout(tick, 50);
    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [isPlaying]);

  const handleModeChange = useCallback(
    (mode: Gravity26Mode) => {
      setIsPlaying(false);
      setParams(createDefaultGravity26Params(mode));
      onToast?.(
        mode === 'universal_field'
          ? 'Switched to 2.6.A Universal Gravitation & Field Lab'
          : mode === 'near_surface'
          ? 'Switched to 2.6.B & 2.6.D Near-Surface Constant g & Mass Equivalence'
          : mode === 'apparent_weight'
          ? 'Switched to 2.6.C Apparent Weight & Equivalence Principle'
          : 'Switched to 2.6.E Newton’s Shell Theorem & Uniform Sphere'
      );
    },
    [onToast]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setParams(prev => createDefaultGravity26Params(prev.mode));
  }, []);

  const activeTitle =
    params.mode === 'universal_field'
      ? 'Universal Gravitation & Radial Field'
      : params.mode === 'near_surface'
      ? 'Constant-g Limit & Inertial/Gravitational Mass'
      : params.mode === 'apparent_weight'
      ? 'Apparent Weight, Free Fall & Equivalence'
      : 'Newton’s Shell Theorem & Uniform Sphere';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-SCREEN 3D/2D WEBGL VIEWPORT */}
      <Gravity26Viewport params={params} evaluation={evaluation} viewMode={externalViewMode} />

      {/* ===================================================================== */}
      {/* TOP CENTER HUD BANNER (Positioned cleanly below global top pods)      */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed top-[76px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center max-w-[660px]">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#061410]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-1.5 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[9.5px] font-mono text-emerald-400 tracking-wide whitespace-nowrap">
              UNIT 2 · TOPIC 2.6 · GRAVITATIONAL FORCE
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-bold text-white tracking-tight whitespace-nowrap">
                {activeTitle}
              </h1>
              <span className="text-slate-600">·</span>
              <MathFormula
                formulaKey="sim-gravity26"
                className="text-emerald-300 text-[11.5px] shrink-0"
              />
            </div>
          </div>

          <button
            onClick={() => setIsCedOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CED 2.6</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEFT PARAMETER & MODE CONTROL DOCK                                    */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 2.6 Controls"
        className="absolute top-20 left-4 z-20 w-[322px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Gravitational Force Controls
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
                    <div className="flex items-center gap-1.5 font-bold text-[11px] whitespace-nowrap">
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

            {/* =============================================================== */}
            {/* MODE 1 CONTROLS: UNIVERSAL LAW & FIELD (2.6.A)                  */}
            {/* =============================================================== */}
            {params.mode === 'universal_field' && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Primary Mass M</span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {params.primaryMassFactor.toFixed(2)} M_E
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={4.0}
                    step={0.05}
                    value={params.primaryMassFactor}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        primaryMassFactor: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Test Probe Mass m</span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      {params.testMassKg.toFixed(0)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={params.testMassKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, testMassKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Center Distance r</span>
                    <span className="text-sky-300 font-bold tabular-nums">
                      {params.separationInR.toFixed(2)} R_E
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.1}
                    max={3.5}
                    step={0.05}
                    value={params.separationInR}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        separationInR: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-sky-400"
                  />
                </label>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { key: 'showFieldVectors' as const, label: 'Field g(r)' },
                    { key: 'showForcePair' as const, label: 'F_12 / F_21' },
                    { key: 'showComLine' as const, label: 'COM Line' },
                  ].map(tog => (
                    <button
                      key={tog.key}
                      onClick={() => setParams(prev => ({ ...prev, [tog.key]: !prev[tog.key] }))}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-semibold border transition cursor-pointer whitespace-nowrap ${
                        params[tog.key]
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400'
                      }`}
                    >
                      {tog.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 2 CONTROLS: CONSTANT g & MASS EQUIVALENCE (2.6.B & 2.6.D)  */}
            {/* =============================================================== */}
            {params.mode === 'near_surface' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-1">
                  {(['earth', 'moon', 'mars', 'jupiter'] as AstroBodyPreset[]).map(b => (
                    <button
                      key={b}
                      onClick={() =>
                        setParams(prev => ({
                          ...prev,
                          bodyPreset: b,
                          altitudeKm: Math.min(prev.altitudeKm, ASTRO_BODIES[b].radiusKm),
                          simTimeS: 0,
                        }))
                      }
                      className={`py-1.5 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer ${
                        params.bodyPreset === b
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                          : 'bg-[#040d0a] text-slate-300 border-white/10 hover:border-emerald-400/40'
                      }`}
                    >
                      {ASTRO_BODIES[b].name}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Altitude h above surface</span>
                    <span className="text-sky-300 font-bold tabular-nums">
                      {params.altitudeKm.toFixed(0)} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={ASTRO_BODIES[params.bodyPreset].radiusKm}
                    step={Math.max(1, Math.round(ASTRO_BODIES[params.bodyPreset].radiusKm / 200))}
                    value={params.altitudeKm}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        altitudeKm: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-sky-400"
                  />
                </label>

                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '10 km (Jet)', km: 10 },
                    { label: '400 km (ISS)', km: 400 },
                    { label: 'h = R (g₀/4)', km: ASTRO_BODIES[params.bodyPreset].radiusKm },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        setParams(prev => ({ ...prev, altitudeKm: preset.km, simTimeS: 0 }))
                      }
                      className="py-1 px-1.5 rounded-lg bg-[#040d0a] hover:bg-emerald-500/15 border border-white/10 text-[9.5px] font-mono text-slate-300 transition cursor-pointer whitespace-nowrap"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Heavy Drop Mass m₁</span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      {params.dropMassHeavyKg.toFixed(0)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={params.dropMassHeavyKg}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        dropMassHeavyKg: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Mass Ratio m_g / m_i (2.6.D)</span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {params.hypotheticalMgOverMi.toFixed(2)}
                      {Math.abs(params.hypotheticalMgOverMi - 1) < 0.01 ? ' (Real)' : ' (Test)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.05}
                    value={params.hypotheticalMgOverMi}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        hypotheticalMgOverMi: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-emerald-400"
                  />
                </label>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 3 CONTROLS: APPARENT WEIGHT & EQUIVALENCE (2.6.C)          */}
            {/* =============================================================== */}
            {params.mode === 'apparent_weight' && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-1">
                  {ELEVATOR_PRESETS.map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(prev => applyElevatorPreset(prev, pr.id));
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[9.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                        params.elevatorPreset === pr.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                          : 'bg-[#040d0a] text-slate-300 border-white/10 hover:border-emerald-400/40'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Rider Mass m</span>
                    <span className="text-amber-300 font-bold tabular-nums">
                      {params.riderMassKg.toFixed(0)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={2}
                    value={params.riderMassKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, riderMassKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Local Field Strength g</span>
                    <span className="text-sky-300 font-bold tabular-nums">
                      {params.planetG.toFixed(1)} N/kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.6}
                    max={15.0}
                    step={0.2}
                    value={params.planetG}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        planetG: parseFloat(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-sky-400"
                  />
                </label>

                {!params.equivalenceSplit && (
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-300">Cabin Acceleration a_y</span>
                      <span className="text-rose-300 font-bold tabular-nums">
                        {params.cabinAccelMs2 >= 0 ? '+' : ''}
                        {params.cabinAccelMs2.toFixed(1)} m/s²
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.2}
                      value={params.cabinAccelMs2}
                      onChange={e =>
                        setParams(prev => ({
                          ...prev,
                          cabinAccelMs2: parseFloat(e.target.value),
                          simTimeS: 0,
                        }))
                      }
                      className="w-full accent-rose-400"
                    />
                  </label>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 4 CONTROLS: NEWTON'S SHELL THEOREM (2.6.E)                 */}
            {/* =============================================================== */}
            {params.mode === 'shell_theorem' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'solid_sphere' as const, label: 'Uniform Solid Sphere' },
                    { id: 'hollow_shell' as const, label: 'Thin Hollow Shell' },
                  ].map(kind => (
                    <button
                      key={kind.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(prev => ({ ...prev, shellKind: kind.id, simTimeS: 0 }));
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border transition cursor-pointer ${
                        params.shellKind === kind.id
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                          : 'bg-[#040d0a] text-slate-300 border-white/10 hover:border-emerald-400/40'
                      }`}
                    >
                      {kind.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Probe Position r / R</span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {params.probeRadiusRatio.toFixed(2)} R{' '}
                      {params.probeRadiusRatio < 1 ? '(Inside)' : '(Outside)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={2.4}
                    step={0.05}
                    value={params.probeRadiusRatio}
                    onChange={e => {
                      setIsPlaying(false);
                      setParams(prev => ({
                        ...prev,
                        probeRadiusRatio: parseFloat(e.target.value),
                        simTimeS: 0,
                      }));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '0.0 R', r: 0.0 },
                    { label: '0.5 R', r: 0.5 },
                    { label: '1.0 R', r: 1.0 },
                    { label: '2.0 R', r: 2.0 },
                  ].map(pos => (
                    <button
                      key={pos.label}
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(prev => ({ ...prev, probeRadiusRatio: pos.r, simTimeS: 0 }));
                      }}
                      className="py-1 rounded-lg bg-[#040d0a] hover:bg-emerald-500/15 border border-white/10 text-[10px] font-mono text-slate-300 transition cursor-pointer"
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Total Mass M</span>
                    <span className="text-sky-300 font-bold tabular-nums">
                      {params.shellMassFactor.toFixed(2)} M_E
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={params.shellMassFactor}
                    onChange={e =>
                      setParams(prev => ({ ...prev, shellMassFactor: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400"
                  />
                </label>

                {params.shellKind === 'hollow_shell' && (
                  <button
                    onClick={() =>
                      setParams(prev => ({
                        ...prev,
                        showDifferentialPatches: !prev.showDifferentialPatches,
                      }))
                    }
                    className={`w-full py-1.5 rounded-lg text-[10.5px] font-mono font-semibold border transition cursor-pointer ${
                      params.showDifferentialPatches
                        ? 'bg-violet-500/20 border-violet-400/50 text-violet-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-400'
                    }`}
                  >
                    {params.showDifferentialPatches ? 'Hide' : 'Show'} Differential Patch Cancellation
                  </button>
                )}
              </div>
            )}

            {/* Playback & Reset Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/15">
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>
                  {isPlaying
                    ? 'Pause Motion'
                    : params.mode === 'shell_theorem' &&
                      params.shellKind === 'solid_sphere' &&
                      params.probeRadiusRatio <= 1
                    ? 'Run Gravity Tunnel'
                    : params.mode === 'near_surface'
                    ? 'Drop Both Masses'
                    : 'Run Motion'}
                </span>
              </button>
              <button
                onClick={handleReset}
                aria-label="Reset simulation parameters"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT ANALYSIS PANEL (SKILLS 1.C, 2.A, 2.D, 3.B)                      */}
      {/* ===================================================================== */}
      <Gravity26AnalysisPanel params={params} evaluation={evaluation} />

      {/* ===================================================================== */}
      {/* BOTTOM COLOR LEGEND & VERDICT STRIP                                   */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed bottom-3.5 left-1/2 -translate-x-1/2 z-20 max-w-[700px] w-[92vw] sm:w-auto">
        <div className="bg-[#061410]/95 border border-emerald-500/25 rounded-2xl px-4 py-2 text-center shadow-2xl">
          <div className="text-[11px] font-semibold text-white leading-snug">
            {evaluation.legendBanner}
          </div>
          <div className="mt-1 flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">
            <span className="text-amber-300">Gravitational Force F_g</span>
            <span className="text-sky-300">Gravitational Field g(r)</span>
            <span className="text-emerald-300">Normal F_N / Enclosed Core m_partial</span>
            <span className="text-rose-300">Acceleration a</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CED 2.6 COURSE REQUIREMENTS MODAL (Course Framework V.1 | Pages 49–52)*/}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 2.6 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#061410] border border-emerald-500/35 rounded-2xl max-w-2xl w-full max-h-[86vh] overflow-y-auto shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10.5px] font-mono text-emerald-400">
                  AP PHYSICS C: MECHANICS · UNIT 2 · COURSE FRAMEWORK V.1 | PAGES 49–52
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Topic 2.6: Gravitational Force
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

            <div className="space-y-2 text-xs">
              <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-emerald-400 font-bold">
                    2.6.A · UNIVERSAL GRAVITATION & FIELD
                  </span>
                  <MathFormula formulaKey="sim-gravity26" className="text-emerald-200 text-xs" />
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Attractive inverse-square force along the center-of-mass line (2.6.A.1). Field
                  strength |g| = |F_g|/m = GM/r² equals free-fall acceleration in m/s² (2.6.A.2);
                  weight near an astronomical body is F_g = mg (2.6.A.3).
                </p>
              </div>

              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-mono text-emerald-300 font-bold">
                  2.6.B · CONSTANT GRAVITATIONAL FORCE
                </div>
                <p className="text-slate-200 leading-relaxed">
                  When the change in separation is negligible compared to planetary radius, F_g can
                  be considered constant (2.6.B.1). Near Earth’s surface, g ≈ 10 N/kg (2.6.B.2).
                </p>
              </div>

              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-mono text-emerald-300 font-bold">
                  2.6.C · APPARENT WEIGHT & EQUIVALENCE PRINCIPLE
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Apparent weight equals normal force F_N (2.6.C.1), differs from F_g when
                  accelerating (2.6.C.2), and vanishes in free fall or zero-force space (2.6.C.3).
                  By the equivalence principle, an observer in a noninertial frame cannot
                  distinguish apparent weight from a gravitational field (2.6.C.4).
                </p>
              </div>

              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-mono text-emerald-300 font-bold">
                  2.6.D · INERTIAL & GRAVITATIONAL MASS
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Inertial mass resists velocity changes (2.6.D.1), gravitational mass sets
                  gravitational attraction (2.6.D.2), and experiments verify m_i = m_g (2.6.D.3).
                </p>
              </div>

              <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-emerald-300 font-bold">
                    2.6.E · NEWTON’S SHELL THEOREM & UNIFORM SPHERES
                  </span>
                  <MathFormula
                    formulaKey="sim-gravity26-shell"
                    className="text-emerald-200 text-xs"
                  />
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Net force inside a thin spherical shell is zero (2.6.E.2.i); outside, it acts as a
                  point mass at the center (2.6.E.2.ii). Inside a uniform sphere, only partial mass
                  m_partial = ρ(4/3)πr³ contributes (2.6.E.2.iii–iv), yielding linear restoring
                  force F_&#123;g,partial&#125; = -k r_partial (2.6.E.3).
                </p>
                <p className="text-[11px] text-amber-200/90 font-mono">
                  Boundary Statement: AP Physics C: Mechanics does not expect students to
                  mathematically prove or derive Newton’s shell theorem.
                </p>
              </div>
            </div>

            <div className="bg-[#040d0a] border border-white/10 rounded-xl p-3 text-xs space-y-1">
              <div className="font-mono text-emerald-400 font-bold text-[11px]">
                SUGGESTED SCIENCE PRACTICES (ALL 4 INTERACTIVE)
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>1.C</strong> Qualitative sketches of graphs · <strong>2.A</strong> Symbolic
                derivation pathways · <strong>2.D</strong> Functional dependence & factors of change
                · <strong>3.B</strong> Applying physical laws/models to make a claim.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <a
                href="/assets/aistudio/Topic_2.6_course_requirements_770a1b54.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Official Topic 2.6 CED PDF</span>
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
