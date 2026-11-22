'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Circle,
  Cylinder,
  ExternalLink,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CylindricalProfile,
  Gauss86Params,
  Gauss86Symmetry,
  GaussCalculationRecord,
  PlanarProfile,
  SphericalProfile,
  createDefaultGauss86Params,
  evaluateGauss86,
} from '@/lib/physics/gauss-law-8-6';
import { Gauss86Viewport } from './gauss86/Gauss86Viewport';
import { Gauss86AnalysisPanel } from './gauss86/Gauss86AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface ElectricGauss86WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const SYMMETRY_OPTIONS: {
  id: Gauss86Symmetry;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'point_invariance',
    label: 'Point & Shell',
    sub: 'Size Invariance',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'spherical',
    label: 'Spherical',
    sub: '∫ ρ(r) 4πr² dr',
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  {
    id: 'cylindrical',
    label: 'Cylindrical',
    sub: 'Wall 2πrL · Caps 0',
    icon: <Cylinder className="w-3.5 h-3.5" />,
  },
  {
    id: 'planar',
    label: 'Planar Pillbox',
    sub: 'Sheet · Slab',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
];

export const ElectricGauss86Workbench: React.FC<ElectricGauss86WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Gauss86Params>(() =>
    createDefaultGauss86Params('point_invariance')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showNormals, setShowNormals] = useState(true);
  const [showFieldVectors, setShowFieldVectors] = useState(true);
  const [showChargeBody, setShowChargeBody] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<GaussCalculationRecord[]>([]);

  const animTimerRef = useRef<number | null>(null);
  const animDirRef = useRef<number>(1);

  const evaluation = useMemo(() => evaluateGauss86(params), [params]);

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

  const handleSelectSymmetry = (sym: Gauss86Symmetry) => {
    stopAnimation();
    setParams(createDefaultGauss86Params(sym));
    const opt = SYMMETRY_OPTIONS.find(s => s.id === sym);
    onToast?.(`Loaded ${opt?.label ?? sym} Gauss’s Law mode`);
  };

  const handleToggleAnimation = () => {
    if (isAnimating) {
      stopAnimation();
      return;
    }
    setIsAnimating(true);
    animTimerRef.current = window.setInterval(() => {
      setParams(prev => {
        const minR = prev.symmetry === 'point_invariance' ? 0.55 : 0.25;
        const maxR = prev.symmetry === 'planar' ? 2.1 : 2.35;
        let nextR = prev.gaussianRadiusM + animDirRef.current * 0.045;
        if (nextR >= maxR) {
          nextR = maxR;
          animDirRef.current = -1;
        } else if (nextR <= minR) {
          nextR = minR;
          animDirRef.current = 1;
        }
        return { ...prev, gaussianRadiusM: Number(nextR.toFixed(2)) };
      });
    }, 55);
  };

  const handleReset = () => {
    stopAnimation();
    setParams(createDefaultGauss86Params(params.symmetry));
    onToast?.('Reset Gauss’s Law parameters');
  };

  const handleRecordCalculation = () => {
    let label = '';
    if (params.symmetry === 'point_invariance') {
      label = `q=${params.chargeMagnitudeMicro.toFixed(1)}μC`;
    } else if (params.symmetry === 'spherical') {
      label =
        params.sphericalProfile === 'uniform_solid'
          ? 'Uniform ρ₀'
          : params.sphericalProfile === 'linear_rho'
          ? 'Linear αr'
          : params.sphericalProfile === 'inverse_rho'
          ? 'Inverse β/r'
          : 'Cond. Shell';
    } else if (params.symmetry === 'cylindrical') {
      label =
        params.cylindricalProfile === 'line_charge'
          ? 'Line λ'
          : params.cylindricalProfile === 'uniform_cylinder'
          ? 'Solid ρ₀'
          : params.cylindricalProfile === 'linear_cylinder'
          ? 'Linear αr'
          : 'Hollow Cond.';
    } else {
      label =
        params.planarProfile === 'nonconducting_sheet'
          ? 'Sheet σ'
          : params.planarProfile === 'thick_slab'
          ? 'Slab ρ₀'
          : 'Conductor σ';
    }

    const sizeText =
      params.symmetry === 'planar'
        ? `x=${params.gaussianRadiusM.toFixed(2)}m`
        : `r=${params.gaussianRadiusM.toFixed(2)}m`;

    const rec: GaussCalculationRecord = {
      id: `g86_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      symmetry: params.symmetry,
      label,
      gaussianSizeText: sizeText,
      qEncMicro: evaluation.qEncMicro,
      fluxKNm2C: evaluation.fluxFromGaussKNm2C,
      fieldKNPerC: evaluation.fieldMagKNPerC,
      sign: evaluation.fluxSign,
    };
    setRecords(prev => [rec, ...prev].slice(0, 12));
    onToast?.(`Recorded ${label} (${sizeText}): |E| = ${evaluation.fieldMagKNPerC.toFixed(1)} kN/C`);
  };

  const chargeSliderLabel =
    params.symmetry === 'point_invariance'
      ? 'Enclosed Charge q_enc'
      : params.symmetry === 'spherical'
      ? 'Total Sphere Charge Q'
      : params.symmetry === 'cylindrical'
      ? 'Linear Density λ'
      : 'Surface Density σ';

  const chargeSliderUnit =
    params.symmetry === 'cylindrical'
      ? 'μC/m'
      : params.symmetry === 'planar'
      ? 'μC/m²'
      : 'μC';

  const animButtonLabel = isAnimating
    ? 'Pause Sweep'
    : params.symmetry === 'planar'
    ? 'Sweep Distance x'
    : 'Sweep Radius r';

  return (
    <div
      className="relative w-full h-full bg-[#050811] overflow-hidden select-none"
      data-testid="gauss-86-workbench"
      data-symmetry={params.symmetry}
      data-flux={evaluation.fluxFromGaussKNm2C.toFixed(1)}
      data-field={evaluation.fieldMagKNPerC.toFixed(1)}
    >
      {/* Full-Bleed 3D / 2D WebGL Viewport */}
      <div className="absolute inset-0">
        <Gauss86Viewport
          params={params}
          evaluation={evaluation}
          viewMode={externalViewMode}
          showNormals={showNormals}
          showFieldVectors={showFieldVectors}
          showChargeBody={showChargeBody}
        />
      </div>

      {/* Centered Top Maxwell 1st Eq. HUD Readout (stays clear of top nav & side docks) */}
      <div
        className={`pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-xl bg-[#080e1e]/95 border shadow-xl text-center ${
          evaluation.fluxSign === 'positive'
            ? 'border-emerald-400/40'
            : evaluation.fluxSign === 'negative'
            ? 'border-rose-400/40'
            : 'border-slate-500/40'
        }`}
      >
        <div className="text-[10px] font-mono text-slate-300 tracking-wide whitespace-nowrap">
          {params.symmetry === 'point_invariance'
            ? `MAXWELL 1ST EQ. · Φ_E = q_enc / ε₀ (r = ${params.gaussianRadiusM.toFixed(2)} m)`
            : params.symmetry === 'spherical'
            ? `SPHERICAL GAUSS · q_enc = ${evaluation.qEncMicro >= 0 ? '+' : ''}${evaluation.qEncMicro.toFixed(2)} μC (${(evaluation.enclosedFraction * 100).toFixed(0)}%)`
            : params.symmetry === 'cylindrical'
            ? `CYLINDRICAL GAUSS · E(2πrL) = q_enc / ε₀`
            : params.planarProfile === 'conducting_plate'
            ? 'PLANAR CONDUCTOR · EA = σA / ε₀'
            : 'PLANAR PILLBOX · 2EA = q_enc / ε₀'}
        </div>
        <div
          className={`text-sm font-mono font-bold tabular-nums leading-tight mt-0.5 ${
            evaluation.fluxSign === 'positive'
              ? 'text-emerald-300'
              : evaluation.fluxSign === 'negative'
              ? 'text-rose-300'
              : 'text-slate-200'
          }`}
        >
          {params.symmetry === 'point_invariance'
            ? `Φ_E = ${evaluation.fluxFromGaussKNm2C >= 0 ? '+' : ''}${evaluation.fluxFromGaussKNm2C.toFixed(1)} kN·m²/C`
            : `|E(${params.gaussianRadiusM.toFixed(2)} m)| = ${evaluation.fieldMagKNPerC.toFixed(1)} kN/C`}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FLOATING LEFT CONTROL DOCK (No backdrop-blur over WebGL)              */}
      {/* ===================================================================== */}
      <aside
        aria-label="Gauss's Law Controls"
        className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-tight leading-none truncate">
                8.6 Gauss&apos;s Law Lab
              </h2>
              <span className="text-[10px] font-mono text-sky-300/80 whitespace-nowrap block mt-0.5">
                ∮ E·dA = q_enc / ε₀
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[10px] font-mono font-bold flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
              title="View AP Physics C Topic 8.6 Course Requirements"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>CED 8.6</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              aria-label={isLeftCollapsed ? 'Expand Gauss controls' : 'Collapse Gauss controls'}
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
            {/* 4 AP Boundary-Statement Symmetries */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Gaussian Symmetry</span>
                <span className="text-sky-400">LO 8.6.A</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SYMMETRY_OPTIONS.map(opt => {
                  const active = params.symmetry === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectSymmetry(opt.id)}
                      className={`text-left px-2.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold shadow'
                          : 'bg-[#050811] text-slate-300 border-white/10 hover:border-sky-400/40 hover:text-white'
                      }`}
                    >
                      <span className={active ? 'text-slate-950 shrink-0' : 'text-sky-400 shrink-0'}>
                        {opt.icon}
                      </span>
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

            {/* Source Charge / Density Slider */}
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">{chargeSliderLabel}</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    params.chargeMagnitudeMicro > 0
                      ? 'text-rose-300'
                      : params.chargeMagnitudeMicro < 0
                      ? 'text-sky-300'
                      : 'text-slate-400'
                  }`}
                >
                  {params.chargeMagnitudeMicro >= 0 ? '+' : ''}
                  {params.chargeMagnitudeMicro.toFixed(1)} {chargeSliderUnit}
                </span>
              </div>
              <input
                type="range"
                aria-label={chargeSliderLabel}
                min={-10}
                max={10}
                step={0.5}
                value={params.chargeMagnitudeMicro}
                onChange={e =>
                  setParams(p => ({ ...p, chargeMagnitudeMicro: parseFloat(e.target.value) }))
                }
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Gaussian Surface Size Slider (Primary Exploration Control) */}
            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">
                  {params.symmetry === 'planar' ? 'Pillbox Half-Width x' : 'Gaussian Radius r'}
                </span>
                <span className="font-mono font-bold text-emerald-300 tabular-nums">
                  {params.gaussianRadiusM.toFixed(2)} m
                </span>
              </div>
              <input
                type="range"
                aria-label={params.symmetry === 'planar' ? 'Pillbox Half-Width x' : 'Gaussian Radius r'}
                min={params.symmetry === 'point_invariance' ? 0.5 : 0.2}
                max={2.4}
                step={0.05}
                value={params.gaussianRadiusM}
                onChange={e =>
                  setParams(p => ({ ...p, gaussianRadiusM: parseFloat(e.target.value) }))
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
              {params.symmetry === 'spherical' || params.symmetry === 'cylindrical' || (params.symmetry === 'planar' && params.planarProfile === 'thick_slab') ? (
                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                  <span>
                    Region:{' '}
                    <span className="text-sky-300 font-bold">
                      {evaluation.regionStatus === 'inside'
                        ? params.symmetry === 'planar'
                          ? 'Inside Slab (x < d)'
                          : 'Interior (r < R)'
                        : params.symmetry === 'planar'
                        ? 'Outside Slab (x ≥ d)'
                        : 'Exterior (r ≥ R)'}
                    </span>
                  </span>
                  <span>
                    {params.symmetry === 'planar' ? 'd' : 'R'} = {params.bodyRadiusM.toFixed(2)} m
                  </span>
                </div>
              ) : null}
            </div>

            {/* Symmetry-Specific Controls */}
            {params.symmetry === 'point_invariance' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">External Charge q_ext</span>
                    <span className="font-mono font-bold text-slate-200 tabular-nums">
                      {params.externalChargeMicro >= 0 ? '+' : ''}
                      {params.externalChargeMicro.toFixed(1)} μC
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="External Charge q_ext"
                    min={-8}
                    max={8}
                    step={1}
                    value={params.externalChargeMicro}
                    onChange={e =>
                      setParams(p => ({ ...p, externalChargeMicro: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Interior Charge Offset</span>
                    <span className="font-mono text-amber-300 tabular-nums">
                      {(params.interiorOffsetFrac * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Interior Charge Offset"
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    value={params.interiorOffsetFrac}
                    onChange={e =>
                      setParams(p => ({ ...p, interiorOffsetFrac: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.symmetry === 'spherical' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2">
                <div className="text-[10px] font-mono text-slate-400">
                  Spherical Charge Distribution ρ(r)
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'uniform_solid', label: 'Uniform ρ₀' },
                      { id: 'linear_rho', label: 'Linear ρ=αr' },
                      { id: 'inverse_rho', label: 'Inverse ρ=β/r' },
                      { id: 'conducting_shell', label: 'Cond. Shell' },
                    ] as { id: SphericalProfile; label: string }[]
                  ).map(prof => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setParams(p => ({ ...p, sphericalProfile: prof.id }))}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        params.sphericalProfile === prof.id
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Sphere Radius R</span>
                    <span className="font-mono font-bold text-rose-300 tabular-nums">
                      {params.bodyRadiusM.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Sphere Radius R"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={params.bodyRadiusM}
                    onChange={e =>
                      setParams(p => ({ ...p, bodyRadiusM: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.symmetry === 'cylindrical' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2">
                <div className="text-[10px] font-mono text-slate-400">
                  Cylindrical Distribution
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'line_charge', label: 'Infinite Line' },
                      { id: 'uniform_cylinder', label: 'Uniform Solid' },
                      { id: 'linear_cylinder', label: 'Linear ρ=αr' },
                      { id: 'conducting_cylinder', label: 'Hollow Cond.' },
                    ] as { id: CylindricalProfile; label: string }[]
                  ).map(prof => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setParams(p => ({ ...p, cylindricalProfile: prof.id }))}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        params.cylindricalProfile === prof.id
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Gaussian Length L</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.gaussianLengthM.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Gaussian Length L"
                    min={1.0}
                    max={3.0}
                    step={0.1}
                    value={params.gaussianLengthM}
                    onChange={e =>
                      setParams(p => ({ ...p, gaussianLengthM: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {params.symmetry === 'planar' && (
              <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 space-y-2">
                <div className="text-[10px] font-mono text-slate-400">
                  Planar Distribution
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'nonconducting_sheet', label: 'Sheet σ' },
                      { id: 'thick_slab', label: 'Thick Slab' },
                      { id: 'conducting_plate', label: 'Conductor' },
                    ] as { id: PlanarProfile; label: string }[]
                  ).map(prof => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setParams(p => ({ ...p, planarProfile: prof.id }))}
                      className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                        params.planarProfile === prof.id
                          ? 'bg-sky-400 text-slate-950 font-bold'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {prof.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Pillbox Cap Area A</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.pillboxAreaM2.toFixed(2)} m²
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Pillbox Cap Area A"
                    min={0.6}
                    max={2.6}
                    step={0.1}
                    value={params.pillboxAreaM2}
                    onChange={e =>
                      setParams(p => ({ ...p, pillboxAreaM2: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Playback + Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleAnimation}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isAnimating
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                }`}
              >
                {isAnimating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{animButtonLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset parameters"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                title="Reset current symmetry"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Layer Toggles */}
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setShowNormals(v => !v)}
                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showNormals
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#050811] border-white/10 text-slate-500'
                }`}
              >
                dA Normals
              </button>
              <button
                type="button"
                onClick={() => setShowFieldVectors(v => !v)}
                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showFieldVectors
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-[#050811] border-white/10 text-slate-500'
                }`}
              >
                E-Field
              </button>
              <button
                type="button"
                onClick={() => setShowChargeBody(v => !v)}
                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showChargeBody
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                    : 'bg-[#050811] border-white/10 text-slate-500'
                }`}
              >
                Charge Body
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* FLOATING RIGHT ANALYSIS PANEL                                         */}
      {/* ===================================================================== */}
      <Gauss86AnalysisPanel
        params={params}
        evaluation={evaluation}
        isCollapsed={isRightCollapsed}
        onToggleCollapse={() => setIsRightCollapsed(prev => !prev)}
        records={records}
        onRecordCalculation={handleRecordCalculation}
        onClearRecords={() => {
          setRecords([]);
          onToast?.('Cleared calculation log');
        }}
      />

      {/* ===================================================================== */}
      {/* BOTTOM SUMMARY & LEGEND BAR                                           */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[740px] px-4 py-2 rounded-2xl bg-[#080e1e]/95 border border-white/10 shadow-xl text-center">
        <div className="text-[11px] font-semibold text-white truncate">
          {evaluation.headlineSummary}
        </div>
        <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-300 mt-0.5">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1 align-middle" />
            E-Field
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" />
            Outward dA
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 align-middle" />
            +Φ Gaussian Surface
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1 align-middle" />
            +Charge / −Φ
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AP PHYSICS C TOPIC 8.6 CED REQUIREMENTS MODAL                         */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 8.6 Gauss's Law Requirements"
        >
          <div className="bg-[#080e1e] border border-sky-500/40 rounded-2xl max-w-2xl w-full max-h-[86vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10.5px] font-mono text-sky-400">
                  AP Physics C: Electricity &amp; Magnetism · Unit 8
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 8.6: Gauss&apos;s Law
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCedOpen(false)}
                aria-label="Close Topic 8.6 course requirements"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-1">
              <div className="text-[10.5px] font-mono font-bold text-sky-300">
                Learning Objective 8.6.A
              </div>
              <p className="text-xs text-slate-200">
                Describe the properties of a charge distribution by applying Gauss&apos;s law.
              </p>
            </div>

            <div className="bg-[#050811] border border-white/10 rounded-xl p-3 space-y-2 text-xs text-slate-200 leading-relaxed">
              <div className="text-[10.5px] font-mono font-bold text-sky-300">
                Essential Knowledge (8.6.A.1 – 8.6.A.6)
              </div>
              <p>
                <strong className="text-white">8.6.A.1:</strong> Gauss&apos;s law relates electric flux through a Gaussian surface to the charge enclosed by that surface:{' '}
                <span className="inline-block bg-[#0b1327] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-gauss86" className="text-sky-300" />
                </span>
              </p>
              <p>
                <strong className="text-white">8.6.A.2:</strong> A Gaussian surface is a three-dimensional, closed surface.
              </p>
              <p>
                <strong className="text-white">8.6.A.3:</strong> The total electric flux through a Gaussian surface is independent of the size of the Gaussian surface if the amount of enclosed charge remains constant.
              </p>
              <p>
                <strong className="text-white">8.6.A.4:</strong> Gaussian surfaces are typically constructed such that the electric field generated by the enclosed charge is either perpendicular or parallel to different regions of the Gaussian surface, resulting in a simplified surface integral.
              </p>
              <p>
                <strong className="text-white">8.6.A.5:</strong> If a function of charge density is given, total or enclosed charge is found by integrating over 1D length, 2D area, or 3D volume:{' '}
                <span className="inline-block bg-[#0b1327] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-gauss86-rho" className="text-amber-300" />
                </span>
              </p>
              <p>
                <strong className="text-white">8.6.A.6:</strong> Maxwell&apos;s equations are the collection of equations that fully describe electromagnetism. Gauss&apos;s law is Maxwell&apos;s first equation.
              </p>
            </div>

            <div className="bg-sky-950/35 border border-sky-400/30 rounded-xl p-3 space-y-1 text-xs text-slate-200">
              <div className="text-[10.5px] font-mono font-bold text-sky-300">
                Boundary Statement
              </div>
              <p>
                AP Physics C: Electricity &amp; Magnetism only expects students to quantitatively apply Gauss&apos;s law to point charges and charge distributions that have spherical, cylindrical, or planar symmetry.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                Suggested Skills: 1.A · 2.A · 2.B · 2.D
              </span>
              <a
                href="/assets/aistudio/Topic_8.6_course_requirements_034e0247.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Official Topic 8.6 PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricGauss86Workbench;
