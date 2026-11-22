'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Grid,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  Flux85Params,
  Flux85Scenario,
  FluxComparisonRecord,
  NonuniformProfile,
  createDefaultFlux85Params,
  evaluateFlux85,
} from '@/lib/physics/electric-flux-8-5';
import { Flux85Viewport } from './flux85/Flux85Viewport';
import { Flux85AnalysisPanel } from './flux85/Flux85AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface ElectricFlux85WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const SCENARIO_OPTIONS: {
  id: Flux85Scenario;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'uniform_open',
    label: 'Tilted Surface',
    sub: 'Φ = E·A = EA cos θ',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'nonuniform_integral',
    label: 'Surface Integral',
    sub: 'Φ = ∫ E(y)·dA',
    icon: <Grid className="w-3.5 h-3.5" />,
  },
  {
    id: 'closed_cube',
    label: 'Closed Cube',
    sub: '6 Outward Faces',
    icon: <Box className="w-3.5 h-3.5" />,
  },
  {
    id: 'closed_curved',
    label: 'Sphere / Cylinder',
    sub: 'Curved ∮ E·dA',
    icon: <Orbit className="w-3.5 h-3.5" />,
  },
];

export const ElectricFlux85Workbench: React.FC<ElectricFlux85WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Flux85Params>(() =>
    createDefaultFlux85Params('uniform_open')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showNormals, setShowNormals] = useState(true);
  const [showProjection, setShowProjection] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<FluxComparisonRecord[]>([]);

  const animTimerRef = useRef<number | null>(null);

  const evaluation = useMemo(() => evaluateFlux85(params), [params]);

  const stopAnimation = useCallback(() => {
    if (animTimerRef.current !== null) {
      window.clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimerRef.current !== null) {
        window.clearInterval(animTimerRef.current);
      }
    };
  }, []);

  const handleSelectScenario = (scenario: Flux85Scenario) => {
    stopAnimation();
    setParams(createDefaultFlux85Params(scenario));
    const opt = SCENARIO_OPTIONS.find(s => s.id === scenario);
    onToast?.(`Loaded ${opt?.label ?? scenario}`);
  };

  const handleToggleAnimation = () => {
    if (isAnimating) {
      stopAnimation();
      return;
    }
    setIsAnimating(true);
    animTimerRef.current = window.setInterval(() => {
      setParams(prev => {
        if (prev.scenario === 'uniform_open') {
          const nextAng = (prev.angleDeg + 3) % 183;
          return { ...prev, angleDeg: nextAng > 180 ? 0 : nextAng };
        }
        if (prev.scenario === 'nonuniform_integral') {
          return { ...prev, patchSweep: Number(((prev.patchSweep + 0.03) % 1).toFixed(3)) };
        }
        if (prev.scenario === 'closed_cube') {
          return { ...prev, angleDeg: (prev.angleDeg + 4) % 90 };
        }
        // closed_curved: smoothly breathe sphere/cylinder radius R to prove flux invariance!
        const nextR = prev.curvedRadius + 0.05;
        return { ...prev, curvedRadius: nextR > 2.2 ? 0.85 : Number(nextR.toFixed(2)) };
      });
    }, 75);
  };

  const handleReset = () => {
    stopAnimation();
    setParams(createDefaultFlux85Params(params.scenario));
    onToast?.('Reset electric flux parameters to defaults');
  };

  const handleRecordComparison = () => {
    const label =
      params.scenario === 'uniform_open'
        ? `θ=${params.angleDeg.toFixed(0)}°, A=${params.areaM2.toFixed(1)}m²`
        : params.scenario === 'nonuniform_integral'
        ? `${params.nonuniformProfile.replace('_y', '')}, ${params.gridN}×${params.gridN}`
        : params.scenario === 'closed_cube'
        ? `${params.cubeFieldMode === 'uniform' ? 'Uniform' : `β=${params.gradientBeta.toFixed(1)}`}, s=${params.cubeSide.toFixed(1)}m`
        : `${params.curvedType}, R=${params.curvedRadius.toFixed(2)}m`;

    const newRec: FluxComparisonRecord = {
      id: `flux_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      scenario: params.scenario,
      label,
      exactFlux: evaluation.exactFlux,
      areaM2: evaluation.totalAreaM2,
      sign: evaluation.fluxSign,
      notes: `E₀=${params.fieldStrength.toFixed(1)} kN/C · Area ${evaluation.totalAreaM2.toFixed(1)} m²`,
    };
    setRecords(prev => [newRec, ...prev].slice(0, 14));
    onToast?.(`Recorded ${label}: Φ = ${evaluation.exactFlux.toFixed(2)} kN·m²/C`);
  };

  const handleClearRecords = () => {
    setRecords([]);
    onToast?.('Cleared flux comparison log');
  };

  const animButtonLabel =
    params.scenario === 'uniform_open'
      ? isAnimating
        ? 'Pause Sweep'
        : 'Sweep Angle θ'
      : params.scenario === 'nonuniform_integral'
      ? isAnimating
        ? 'Pause Sweep'
        : 'Sweep Patch dA'
      : params.scenario === 'closed_cube'
      ? isAnimating
        ? 'Pause Rotation'
        : 'Rotate Cube'
      : isAnimating
      ? 'Pause Radius'
      : 'Vary Radius R';

  return (
    <div
      className="relative w-full h-full bg-[#050811] overflow-hidden select-none"
      data-testid="flux-85-workbench"
      data-scenario={params.scenario}
      data-exact-flux={evaluation.exactFlux.toFixed(2)}
    >
      {/* Full-Bleed 3D / 2D WebGL Viewport */}
      <div className="absolute inset-0">
        <Flux85Viewport
          params={params}
          evaluation={evaluation}
          viewMode={externalViewMode}
          showNormals={showNormals}
          showProjection={showProjection}
          showFieldLines={showFieldLines}
        />
      </div>

      {/* ===================================================================== */}
      {/* FLOATING LEFT CONTROL DOCK (No backdrop-blur over WebGL)              */}
      {/* ===================================================================== */}
      <aside
        aria-label="Electric Flux Controls"
        className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-tight leading-none truncate">
                8.5 Electric Flux Lab
              </h2>
              <span className="text-[10px] font-mono text-sky-300/80 whitespace-nowrap block mt-0.5">
                Φ = E·A &amp; ∫ E·dA
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
              title="View AP Physics C Topic 8.5 Course Requirements"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>CED 8.5</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              aria-label={isLeftCollapsed ? 'Expand flux controls' : 'Collapse flux controls'}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            >
              {isLeftCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {!isLeftCollapsed && (
          <>
            {/* 4 Interactive Flux Exploration Modes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Flux Exploration Mode</span>
                <span className="text-sky-400">LO 8.5.A</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SCENARIO_OPTIONS.map(opt => {
                  const active = params.scenario === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectScenario(opt.id)}
                      className={`text-left px-2.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold shadow'
                          : 'bg-[#050811] text-slate-300 border-white/10 hover:border-sky-400/40 hover:text-white'
                      }`}
                    >
                      <span className={active ? 'text-slate-950' : 'text-sky-400'}>{opt.icon}</span>
                      <div className="min-w-0 leading-tight">
                        <div className="text-[11px] font-bold truncate">{opt.label}</div>
                        <div
                          className={`text-[9px] font-mono truncate ${
                            active ? 'text-slate-900/80' : 'text-slate-400'
                          }`}
                        >
                          {opt.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Field Strength E₀ */}
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="flux85-e-slider" className="text-slate-300 font-semibold">
                  Base Field E₀
                </label>
                <span className="font-mono font-bold tabular-nums text-sky-300">
                  {params.fieldStrength.toFixed(1)} kN/C
                </span>
              </div>
              <input
                id="flux85-e-slider"
                type="range"
                min={1.0}
                max={12.0}
                step={0.5}
                value={params.fieldStrength}
                onChange={e =>
                  setParams(prev => ({ ...prev, fieldStrength: parseFloat(e.target.value) }))
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Scenario-Specific Geometry & Orientation Controls */}
            {params.scenario === 'uniform_open' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                {/* Shape selector */}
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'rectangle', label: 'Square Frame' },
                      { id: 'circle', label: 'Circular Disk' },
                    ] as const
                  ).map(sh => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, openShape: sh.id }))}
                      className={`py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                        params.openShape === sh.id
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>

                {/* Tilt Angle θ */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-theta-slider" className="text-slate-300 font-semibold">
                      Angle θ (E vs A)
                    </label>
                    <span className="font-mono font-bold tabular-nums text-amber-300">
                      {params.angleDeg.toFixed(0)}° (cos θ ={' '}
                      {Math.cos((params.angleDeg * Math.PI) / 180).toFixed(2)})
                    </span>
                  </div>
                  <input
                    id="flux85-theta-slider"
                    type="range"
                    min={0}
                    max={180}
                    step={1}
                    value={params.angleDeg}
                    onChange={e => {
                      if (isAnimating) stopAnimation();
                      setParams(prev => ({ ...prev, angleDeg: parseFloat(e.target.value) }));
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 60, 90, 120, 180].map(deg => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          if (isAnimating) stopAnimation();
                          setParams(prev => ({ ...prev, angleDeg: deg }));
                        }}
                        className={`py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                          Math.round(params.angleDeg) === deg
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surface Area A */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-area-slider" className="text-slate-300">
                      Surface Area A
                    </label>
                    <span className="font-mono font-bold tabular-nums text-sky-300">
                      {params.areaM2.toFixed(2)} m²
                    </span>
                  </div>
                  <input
                    id="flux85-area-slider"
                    type="range"
                    min={0.5}
                    max={4.0}
                    step={0.25}
                    value={params.areaM2}
                    onChange={e =>
                      setParams(prev => ({ ...prev, areaM2: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.scenario === 'nonuniform_integral' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400">Field Profile E_x(y)</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'linear_y', label: 'Linear' },
                        { id: 'quadratic_y', label: 'Quadratic' },
                        { id: 'sine_y', label: 'Sine' },
                      ] as { id: NonuniformProfile; label: string }[]
                    ).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setParams(prev => ({ ...prev, nonuniformProfile: p.id }))}
                        className={`py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                          params.nonuniformProfile === p.id
                            ? 'bg-sky-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {params.nonuniformProfile !== 'sine_y' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="flux85-beta-slider" className="text-slate-300">
                        Gradient β
                      </label>
                      <span className="font-mono font-bold tabular-nums text-sky-300">
                        {params.gradientBeta.toFixed(1)} kN/(C·m)
                      </span>
                    </div>
                    <input
                      id="flux85-beta-slider"
                      type="range"
                      min={0.5}
                      max={8.0}
                      step={0.5}
                      value={params.gradientBeta}
                      onChange={e =>
                        setParams(prev => ({ ...prev, gradientBeta: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-grid-slider" className="text-slate-300 font-semibold">
                      Patch Grid N × N
                    </label>
                    <span className="font-mono font-bold tabular-nums text-sky-300">
                      {params.gridN}×{params.gridN} ({params.gridN * params.gridN} dA)
                    </span>
                  </div>
                  <input
                    id="flux85-grid-slider"
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={params.gridN}
                    onChange={e =>
                      setParams(prev => ({ ...prev, gridN: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-patch-slider" className="text-slate-300">
                      Inspect Patch dA
                    </label>
                    <span className="font-mono tabular-nums text-amber-300">
                      #{(evaluation.highlightedPatch?.index ?? 0) + 1} / {evaluation.patches.length}
                    </span>
                  </div>
                  <input
                    id="flux85-patch-slider"
                    type="range"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={params.patchSweep}
                    onChange={e => {
                      if (isAnimating) stopAnimation();
                      setParams(prev => ({ ...prev, patchSweep: parseFloat(e.target.value) }));
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.scenario === 'closed_cube' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, cubeFieldMode: 'uniform' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.cubeFieldMode === 'uniform'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Uniform E₀ î
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, cubeFieldMode: 'linear_x' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.cubeFieldMode === 'linear_x'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Gradient E₀ + βx
                  </button>
                </div>

                {params.cubeFieldMode === 'linear_x' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <label htmlFor="flux85-cube-beta" className="text-slate-300">
                        Field Gradient β
                      </label>
                      <span className="font-mono font-bold tabular-nums text-emerald-300">
                        {params.gradientBeta >= 0 ? '+' : ''}
                        {params.gradientBeta.toFixed(1)} kN/(C·m)
                      </span>
                    </div>
                    <input
                      id="flux85-cube-beta"
                      type="range"
                      min={-5}
                      max={5}
                      step={0.5}
                      value={params.gradientBeta}
                      onChange={e =>
                        setParams(prev => ({ ...prev, gradientBeta: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-side-slider" className="text-slate-300">
                      Cube Side Length s
                    </label>
                    <span className="font-mono font-bold tabular-nums text-sky-300">
                      {params.cubeSide.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    id="flux85-side-slider"
                    type="range"
                    min={1.0}
                    max={2.4}
                    step={0.1}
                    value={params.cubeSide}
                    onChange={e =>
                      setParams(prev => ({ ...prev, cubeSide: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-yaw-slider" className="text-slate-300">
                      Cube Yaw Angle
                    </label>
                    <span className="font-mono font-bold tabular-nums text-amber-300">
                      {params.angleDeg.toFixed(0)}°
                    </span>
                  </div>
                  <input
                    id="flux85-yaw-slider"
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={params.angleDeg}
                    onChange={e => {
                      if (isAnimating) stopAnimation();
                      setParams(prev => ({ ...prev, angleDeg: parseFloat(e.target.value) }));
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.scenario === 'closed_curved' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, curvedType: 'sphere' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.curvedType === 'sphere'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Closed Sphere
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, curvedType: 'cylinder' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.curvedType === 'cylinder'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Closed Cylinder
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, curvedFieldMode: 'radial_source' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.curvedFieldMode === 'radial_source'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Radial Field
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams(prev => ({ ...prev, curvedFieldMode: 'uniform' }))}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                      params.curvedFieldMode === 'uniform'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Uniform Field
                  </button>
                </div>

                {params.curvedFieldMode === 'radial_source' && (
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, radialPolarity: 1 }))}
                      className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                        params.radialPolarity > 0
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      + Outward Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, radialPolarity: -1 }))}
                      className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                        params.radialPolarity < 0
                          ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      − Inward Source
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="flux85-r-slider" className="text-slate-300 font-semibold">
                      Surface Radius R
                    </label>
                    <span className="font-mono font-bold tabular-nums text-amber-300">
                      {params.curvedRadius.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    id="flux85-r-slider"
                    type="range"
                    min={0.85}
                    max={2.2}
                    step={0.05}
                    value={params.curvedRadius}
                    onChange={e => {
                      if (isAnimating) stopAnimation();
                      setParams(prev => ({ ...prev, curvedRadius: parseFloat(e.target.value) }));
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Primary Motion Action + Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleAnimation}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isAnimating
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                }`}
              >
                {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{animButtonLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset electric flux parameters"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Overlays Toggles */}
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setShowNormals(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showNormals
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                Area Normal
              </button>
              <button
                type="button"
                onClick={() => setShowProjection(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showProjection
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                Proj. A⊥
              </button>
              <button
                type="button"
                onClick={() => setShowFieldLines(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showFieldLines
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                E-Field Lines
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* FLOATING RIGHT ANALYSIS & AP SKILLS DOCK                              */}
      {/* ===================================================================== */}
      <aside
        aria-label="Electric Flux Analysis and AP Physics C Skills"
        className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight leading-none">
                Flux Analysis &amp; AP Skills
              </h2>
              <span className="text-[10px] font-mono text-sky-300/80">
                AP Physics C · Skills 1.A, 2.A, 2.C, 3.B
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRightCollapsed(prev => !prev)}
            aria-label={isRightCollapsed ? 'Expand analysis panel' : 'Collapse analysis panel'}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
          >
            {isRightCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {!isRightCollapsed && (
          <Flux85AnalysisPanel
            params={params}
            evaluation={evaluation}
            records={records}
            onRecordComparison={handleRecordComparison}
            onClearRecords={handleClearRecords}
          />
        )}
      </aside>

      {/* ===================================================================== */}
      {/* BOTTOM COMPACT COLOR LEGEND & LIVE MECHANISM HEADLINE                 */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 max-w-[680px] pointer-events-none">
        <div className="bg-[#080e1e]/95 border border-white/10 rounded-2xl px-4 py-2 shadow-xl flex flex-col items-center gap-1">
          <div className="text-[11px] font-semibold text-slate-100 text-center truncate max-w-[620px]">
            {evaluation.headline}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[10px] font-mono text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              E-Field
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Normal A / dA
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              +Φ Outgoing
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              −Φ Incoming
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              A⊥ Projection
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AP PHYSICS C TOPIC 8.5 CED REFERENCE MODAL                            */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 8.5 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#080e1e] border border-sky-500/40 rounded-2xl max-w-2xl w-full max-h-[84vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono font-bold text-sky-400 tracking-wider">
                  AP Physics C: Electricity &amp; Magnetism · Unit 8
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 8.5: Electric Flux
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCedOpen(false)}
                aria-label="Close CED reference modal"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-1">
                <div className="font-bold text-sky-300 font-mono text-[11px]">
                  Learning Objective 8.5.A
                </div>
                <p>Describe the electric flux through an arbitrary area or geometric shape.</p>
              </div>

              <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-2.5">
                <div className="font-bold text-sky-300 font-mono text-[11px]">
                  Essential Knowledge
                </div>
                <p>
                  <strong className="text-white">8.5.A.1:</strong> Flux describes the amount of a
                  given quantity that passes through a given area.
                </p>
                <div className="space-y-1">
                  <p className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
                    <span>
                      <strong className="text-white">8.5.A.2:</strong> For an electric field that is
                      constant across an area, the electric flux is defined as:
                    </span>
                    <span className="text-amber-200 px-1.5 py-0.5 rounded bg-white/5">
                      <MathFormula formulaKey="sim-flux85-dot" />
                    </span>
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11.5px] text-slate-300">
                    <li>
                      <strong className="text-white">8.5.A.2.i:</strong> The direction of the area
                      vector is defined as perpendicular to the plane of the surface and outward
                      from a closed surface.
                    </li>
                    <li>
                      <strong className="text-white">8.5.A.2.ii:</strong> The sign of flux is
                      given by the dot product of the electric field vector and the area vector.
                    </li>
                  </ul>
                </div>
                <p className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
                  <span>
                    <strong className="text-white">8.5.A.3:</strong> The total electric flux passing
                    through a surface is defined by the surface integral of the electric field over
                    the surface:
                  </span>
                  <span className="text-sky-300 px-1.5 py-0.5 rounded bg-white/5">
                    <MathFormula formulaKey="sim-flux85" />
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-400">
                  Suggested Skills: 1.A · 2.A · 2.C · 3.B
                </span>
                <a
                  href="/assets/aistudio/Topic_8.5_course_requirements_f8d1acc3.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition"
                >
                  <span>Open Official Topic 8.5 PDF</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
