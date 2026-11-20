'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  ExternalLink,
  Minus,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  Distribution84Params,
  Distribution84Type,
  DistributionComparisonRecord,
  createDefaultDistribution84Params,
  evaluateDistribution84,
} from '@/lib/physics/charge-distributions-8-4';
import { Distributions84Viewport } from './distributions84/Distributions84Viewport';
import { Distributions84AnalysisPanel } from './distributions84/Distributions84AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface ChargeDistributions84WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const DISTRIBUTION_OPTIONS: {
  id: Distribution84Type;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'thin_ring',
    label: 'Thin Ring',
    sub: 'Central Axis',
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  {
    id: 'arc_center',
    label: 'Circular Arc',
    sub: 'At Center',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'finite_line_bisector',
    label: 'Line (Bisector)',
    sub: 'Perp. Axis',
    icon: <Minus className="w-3.5 h-3.5 rotate-90" />,
  },
  {
    id: 'finite_line_collinear',
    label: 'Line (Collinear)',
    sub: 'End Axis',
    icon: <Minus className="w-3.5 h-3.5" />,
  },
  {
    id: 'infinite_wire',
    label: 'Infinite Wire / Cylinder',
    sub: 'Radial E = 2kλ/r',
    icon: <Zap className="w-3.5 h-3.5" />,
  },
];

export const ChargeDistributions84Workbench: React.FC<ChargeDistributions84WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Distribution84Params>(() =>
    createDefaultDistribution84Params('thin_ring')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showSymmetryTwin, setShowSymmetryTwin] = useState(true);
  const [showDiffVectors, setShowDiffVectors] = useState(true);
  const [showFieldGrid, setShowFieldGrid] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<DistributionComparisonRecord[]>([]);

  const sweepTimerRef = useRef<number | null>(null);

  const evaluation = useMemo(() => evaluateDistribution84(params), [params]);

  const stopSweep = useCallback(() => {
    if (sweepTimerRef.current !== null) {
      window.clearInterval(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    setIsSweeping(false);
  }, []);

  useEffect(() => {
    return () => {
      if (sweepTimerRef.current !== null) {
        window.clearInterval(sweepTimerRef.current);
      }
    };
  }, []);

  const handleToggleSweep = () => {
    if (isSweeping) {
      stopSweep();
      return;
    }
    setIsSweeping(true);
    sweepTimerRef.current = window.setInterval(() => {
      setParams(prev => ({
        ...prev,
        dqSweep: Number(((prev.dqSweep + 0.025) % 1).toFixed(3)),
      }));
    }, 65);
  };

  const handleSelectDistribution = (dist: Distribution84Type) => {
    stopSweep();
    const defaults = createDefaultDistribution84Params(dist);
    setParams(defaults);
    const opt = DISTRIBUTION_OPTIONS.find(d => d.id === dist);
    onToast?.(`Loaded ${opt?.label ?? dist} (${opt?.sub ?? ''})`);
  };

  const handleReset = () => {
    stopSweep();
    setParams(createDefaultDistribution84Params(params.distribution));
    onToast?.('Reset distribution parameters to AP Topic 8.4 defaults');
  };

  const handleRecordComparison = () => {
    const label =
      params.distribution === 'arc_center'
        ? `α=${params.arcAngleDeg.toFixed(0)}°, R=${params.radius.toFixed(1)}m`
        : params.distribution === 'infinite_wire'
        ? `r=${params.probeDistance.toFixed(2)}m, λ=${params.chargeMicro.toFixed(1)}`
        : params.distribution === 'thin_ring'
        ? `x=${params.probeDistance.toFixed(2)}m, R=${params.radius.toFixed(1)}m`
        : params.distribution === 'finite_line_collinear'
        ? `a=${params.probeDistance.toFixed(2)}m, L=${params.length.toFixed(1)}m`
        : `x=${params.probeDistance.toFixed(2)}m, L=${params.length.toFixed(1)}m`;

    const newRec: DistributionComparisonRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      distribution: params.distribution,
      probeDistance: params.probeDistance,
      exactMagKN: evaluation.exactMag,
      riemannMagKN: evaluation.riemannMag,
      errorPct: evaluation.riemannErrorPercent,
      ratioToPoint: evaluation.ratioToPointCharge,
      notes: `N=${params.segmentsN} segs, ${params.distribution === 'infinite_wire' ? 'λ' : 'Q'}=${params.chargeMicro.toFixed(1)}`,
    };
    setRecords(prev => [newRec, ...prev].slice(0, 14));
    onToast?.(`Logged ${label}: Exact E = ${evaluation.exactMag.toFixed(1)} kN/C`);
  };

  const handleClearRecords = () => {
    setRecords([]);
    onToast?.('Cleared 2.C comparison log');
  };

  const isPositive = params.chargeMicro > 0.01;
  const isNegative = params.chargeMicro < -0.01;

  return (
    <div
      className="relative w-full h-full bg-[#050811] overflow-hidden select-none"
      data-testid="distributions-84-workbench"
      data-distribution={params.distribution}
      data-exact-ex={evaluation.exactE.x.toFixed(2)}
    >
      {/* Full-Bleed 3D / 2D WebGL Canvas */}
      <div className="absolute inset-0">
        <Distributions84Viewport
          params={params}
          evaluation={evaluation}
          viewMode={externalViewMode}
          showSymmetryTwin={showSymmetryTwin}
          showDiffVectors={showDiffVectors}
          showFieldGrid={showFieldGrid}
        />
      </div>

      {/* ===================================================================== */}
      {/* FLOATING LEFT CONTROL DOCK (No backdrop-blur over WebGL)              */}
      {/* ===================================================================== */}
      <aside
        aria-label="Charge Distribution Controls"
        className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight leading-none">
                8.4 Charge Distributions
              </h2>
              <span className="text-[10px] font-mono text-sky-300/80">
                ∫ (dq / r²) r̂ · Symmetry Lab
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
              title="View AP Physics C Topic 8.4 Course Requirements"
            >
              <BookOpen className="w-3 h-3" />
              <span>CED 8.4</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              aria-label={isLeftCollapsed ? 'Expand left controls' : 'Collapse left controls'}
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
            {/* 5 Boundary-Statement Distribution Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <span>AP Boundary Geometries (5)</span>
                <span className="text-sky-400">8.4.A.1</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DISTRIBUTION_OPTIONS.map((opt, idx) => {
                  const active = params.distribution === opt.id;
                  const isWide = idx === 4;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectDistribution(opt.id)}
                      className={`${
                        isWide ? 'col-span-2' : ''
                      } text-left px-2.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold shadow'
                          : 'bg-[#050811] text-slate-300 border-white/10 hover:border-sky-400/40 hover:text-white'
                      }`}
                    >
                      <span className={active ? 'text-slate-950' : 'text-sky-400'}>{opt.icon}</span>
                      <div className="min-w-0 leading-tight">
                        <div className="text-[11px] font-bold truncate">{opt.label}</div>
                        <div
                          className={`text-[9.5px] font-mono truncate ${
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

            {/* Charge / Linear Charge Density Control */}
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="dist84-charge-slider" className="text-slate-300 font-semibold">
                  {params.distribution === 'infinite_wire'
                    ? 'Linear Density λ'
                    : 'Total Charge Q'}
                </label>
                <span
                  className={`font-mono font-bold text-xs ${
                    isPositive
                      ? 'text-rose-400'
                      : isNegative
                      ? 'text-blue-400'
                      : 'text-slate-400'
                  }`}
                >
                  {params.chargeMicro >= 0 ? '+' : ''}
                  {params.chargeMicro.toFixed(1)}{' '}
                  {params.distribution === 'infinite_wire' ? 'μC/m' : 'μC'}
                </span>
              </div>
              <input
                id="dist84-charge-slider"
                type="range"
                min={-10}
                max={10}
                step={0.5}
                value={params.chargeMicro}
                onChange={e =>
                  setParams(prev => ({ ...prev, chargeMicro: parseFloat(e.target.value) }))
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      chargeMicro: prev.distribution === 'infinite_wire' ? 3.0 : 6.0,
                    }))
                  }
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    isPositive
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-rose-300'
                  }`}
                >
                  + Positive (Red)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      chargeMicro: prev.distribution === 'infinite_wire' ? -3.0 : -6.0,
                    }))
                  }
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    isNegative
                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-blue-300'
                  }`}
                >
                  − Negative (Blue)
                </button>
              </div>
            </div>

            {/* Geometry & Probe Position Controls */}
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
              {/* Radius R for Ring, Arc, or Wire Cylinder */}
              {(params.distribution === 'thin_ring' ||
                params.distribution === 'arc_center' ||
                params.distribution === 'infinite_wire') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="dist84-radius-slider" className="text-slate-300">
                      {params.distribution === 'infinite_wire'
                        ? 'Cylinder Radius R_c'
                        : 'Radius R'}
                    </label>
                    <span className="font-mono font-bold text-sky-300">
                      {params.radius.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    id="dist84-radius-slider"
                    type="range"
                    min={params.distribution === 'infinite_wire' ? 0.15 : 0.7}
                    max={params.distribution === 'infinite_wire' ? 0.65 : 2.3}
                    step={0.05}
                    value={params.radius}
                    onChange={e => {
                      const nextR = parseFloat(e.target.value);
                      setParams(prev => ({
                        ...prev,
                        radius: nextR,
                        probeDistance:
                          prev.distribution === 'infinite_wire'
                            ? Math.max(nextR + 0.35, prev.probeDistance)
                            : prev.probeDistance,
                      }));
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Arc Opening Angle α (Arc only) */}
              {params.distribution === 'arc_center' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="dist84-arc-slider" className="text-slate-300">
                      Arc Angle α
                    </label>
                    <span className="font-mono font-bold text-amber-300">
                      {params.arcAngleDeg.toFixed(0)}°
                    </span>
                  </div>
                  <input
                    id="dist84-arc-slider"
                    type="range"
                    min={30}
                    max={360}
                    step={5}
                    value={params.arcAngleDeg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, arcAngleDeg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1">
                    {[90, 180, 270, 360].map(deg => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => setParams(prev => ({ ...prev, arcAngleDeg: deg }))}
                        className={`py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                          Math.round(params.arcAngleDeg) === deg
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 pt-0.5">
                    Probe P fixed at center of curvature (0, 0, 0)
                  </div>
                </div>
              )}

              {/* Rod Length L (Finite Line Bisector / Collinear) */}
              {(params.distribution === 'finite_line_bisector' ||
                params.distribution === 'finite_line_collinear') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="dist84-length-slider" className="text-slate-300">
                      Rod Length L
                    </label>
                    <span className="font-mono font-bold text-sky-300">
                      {params.length.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    id="dist84-length-slider"
                    type="range"
                    min={1.0}
                    max={4.2}
                    step={0.1}
                    value={params.length}
                    onChange={e =>
                      setParams(prev => ({ ...prev, length: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Probe Position Slider (All except Arc Center) */}
              {params.distribution !== 'arc_center' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <label htmlFor="dist84-probe-slider" className="text-slate-300">
                      {params.distribution === 'thin_ring'
                        ? 'Axial Position x'
                        : params.distribution === 'finite_line_bisector'
                        ? 'Bisector Distance x'
                        : params.distribution === 'finite_line_collinear'
                        ? 'End Gap Distance a'
                        : 'Radial Distance r'}
                    </label>
                    <span className="font-mono font-bold text-amber-300">
                      {params.probeDistance.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    id="dist84-probe-slider"
                    type="range"
                    min={
                      params.distribution === 'thin_ring'
                        ? -3.2
                        : params.distribution === 'infinite_wire'
                        ? Math.max(0.6, Number((params.radius + 0.35).toFixed(2)))
                        : 0.5
                    }
                    max={3.5}
                    step={0.05}
                    value={params.probeDistance}
                    onChange={e =>
                      setParams(prev => ({ ...prev, probeDistance: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {params.distribution === 'thin_ring' && (
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setParams(prev => ({ ...prev, probeDistance: 0 }))}
                        className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono transition cursor-pointer"
                      >
                        x = 0
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setParams(prev => ({
                            ...prev,
                            probeDistance: Number((prev.radius / Math.SQRT2).toFixed(2)),
                          }))
                        }
                        className="col-span-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        Peak x = R/√2 ({(params.radius / Math.SQRT2).toFixed(2)}m)
                      </button>
                    </div>
                  )}

                  {params.distribution === 'infinite_wire' && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setParams(prev => ({ ...prev, probeDistance: 1.2 }))}
                        className="py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono transition cursor-pointer"
                      >
                        r = 1.20 m
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams(prev => ({ ...prev, probeDistance: 2.4 }))}
                        className="py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        2r = 2.40 m (E/2)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculus Superposition Controls: Segments N & Sweep dq */}
            <div className="bg-[#050811] border border-sky-500/25 rounded-xl p-2.5 space-y-2.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="dist84-n-slider" className="text-slate-300 font-semibold">
                    Riemann Segments N
                  </label>
                  <span className="font-mono font-bold text-sky-300">{params.segmentsN} dq</span>
                </div>
                <input
                  id="dist84-n-slider"
                  type="range"
                  min={4}
                  max={64}
                  step={2}
                  value={params.segmentsN}
                  onChange={e =>
                    setParams(prev => ({ ...prev, segmentsN: parseInt(e.target.value, 10) }))
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="grid grid-cols-3 gap-1">
                  {[6, 24, 64].map(nVal => (
                    <button
                      key={nVal}
                      type="button"
                      onClick={() => setParams(prev => ({ ...prev, segmentsN: nVal }))}
                      className={`py-0.5 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                        params.segmentsN === nVal
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      N = {nVal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <label htmlFor="dist84-sweep-slider" className="text-slate-300">
                    Inspect Element dq
                  </label>
                  <span className="font-mono text-amber-300">
                    #{evaluation.symmetry.dqElement.index + 1} / {params.segmentsN}
                  </span>
                </div>
                <input
                  id="dist84-sweep-slider"
                  type="range"
                  min={0}
                  max={0.99}
                  step={0.01}
                  value={params.dqSweep}
                  onChange={e => {
                    if (isSweeping) stopSweep();
                    setParams(prev => ({ ...prev, dqSweep: parseFloat(e.target.value) }));
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleSweep}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSweeping
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-sky-400 text-slate-950 hover:bg-sky-300'
                  }`}
                >
                  {isSweeping ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Sweep</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Sweep dq</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Reset distribution parameters"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Overlays Toggles */}
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setShowSymmetryTwin(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showSymmetryTwin
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                Twin dq′
              </button>
              <button
                type="button"
                onClick={() => setShowDiffVectors(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showDiffVectors
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                dE Vectors
              </button>
              <button
                type="button"
                onClick={() => setShowFieldGrid(prev => !prev)}
                className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold transition cursor-pointer ${
                  showFieldGrid
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-[#050811] border-white/10 text-slate-400'
                }`}
              >
                3D E-Grid
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* FLOATING RIGHT CALCULUS ANALYSIS & AP SKILLS DOCK                     */}
      {/* ===================================================================== */}
      <aside
        aria-label="Calculus Analysis and AP Physics C Skills"
        className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight leading-none">
                Calculus &amp; Symmetry Analysis
              </h2>
              <span className="text-[10px] font-mono text-sky-300/80">
                AP Physics C · Skills 1.C, 2.A, 2.C, 3.C
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
          <Distributions84AnalysisPanel
            params={params}
            evaluation={evaluation}
            records={records}
            onRecordComparison={handleRecordComparison}
            onClearRecords={handleClearRecords}
          />
        )}
      </aside>

      {/* ===================================================================== */}
      {/* BOTTOM COMPACT COLOR LEGEND & LIVE MECHANISM BAR                      */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 max-w-[680px] pointer-events-none">
        <div className="bg-[#080e1e]/95 border border-white/10 rounded-2xl px-4 py-2 shadow-xl flex flex-col items-center gap-1">
          <div className="text-[11px] font-semibold text-slate-100 text-center truncate max-w-[620px]">
            {evaluation.headline}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[10px] font-mono text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              +Q Red
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              −Q Blue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              dq / dE
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              dq′ / dE′ Twin
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              dE⊥ Cancels
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              E_net Integral
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AP PHYSICS C TOPIC 8.4 CED REFERENCE MODAL                            */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 8.4 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-[#080e1e] border border-sky-500/40 rounded-2xl max-w-2xl w-full max-h-[84vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                  AP Physics C: Electricity &amp; Magnetism · Unit 8
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 8.4: Electric Fields of Charge Distributions
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
              <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-sky-300 font-mono text-[11px]">
                  LEARNING OBJECTIVE 8.4.A
                </div>
                <p>Describe the electric field resulting from a given charge distribution.</p>
              </div>

              <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-2">
                <div className="font-bold text-sky-300 font-mono text-[11px]">
                  ESSENTIAL KNOWLEDGE
                </div>
                <p className="flex items-center flex-wrap gap-x-1.5 gap-y-1">
                  <span>
                    <strong className="text-white">8.4.A.1:</strong> Expressions for the electric
                    field of specified charge distributions can be found using integration and the
                    principle of superposition:
                  </span>
                  <span className="text-amber-200 px-1.5 py-0.5 rounded bg-white/5">
                    <MathFormula formulaKey="sim-distributions84" />
                  </span>
                </p>
                <p>
                  <strong className="text-white">8.4.A.2:</strong> Symmetry considerations of certain
                  charge distributions can simplify analysis of the electric field resulting from
                  those charge distributions.
                </p>
              </div>

              <div className="bg-[#050811] border border-emerald-500/30 rounded-xl p-3 space-y-1.5">
                <div className="font-bold text-emerald-300 font-mono text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  BOUNDARY STATEMENT — ALL 5 REQUIRED GEOMETRIES INCLUDED
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                  <li>
                    <strong className="text-white">Thin Ring:</strong> Location along the central
                    axis — <span className="font-mono text-sky-300">E = kQx / (x² + R²)^(3/2)</span>
                  </li>
                  <li>
                    <strong className="text-white">Circular / Semicircular Arc:</strong> At its
                    center of curvature —{' '}
                    <span className="font-mono text-sky-300">E = (2kλ / R) sin(α / 2)</span>
                  </li>
                  <li>
                    <strong className="text-white">Finite Line (Bisector):</strong> Along the
                    perpendicular bisector —{' '}
                    <span className="font-mono text-sky-300">E = kQ / [x √(x² + (L/2)²)]</span>
                  </li>
                  <li>
                    <strong className="text-white">Finite Line (Collinear):</strong> Collinear with
                    the line charge —{' '}
                    <span className="font-mono text-sky-300">E = kQ / [a (a + L)]</span>
                  </li>
                  <li>
                    <strong className="text-white">Infinite Wire / Cylinder:</strong> Radial
                    distance r from central axis —{' '}
                    <span className="font-mono text-sky-300">E = λ / (2πε₀r) = 2kλ / r</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-400">
                  Suggested Skills: 1.C · 2.A · 2.C · 3.C
                </span>
                <a
                  href="/assets/aistudio/Topic_8.4_course_requirements_06b37ef1.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition"
                >
                  <span>Open Official Topic 8.4 PDF</span>
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
