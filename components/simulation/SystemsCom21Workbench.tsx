'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ExternalLink,
  Layers,
  MoveRight,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  DiscretePreset,
  DynamicsScenario,
  PlateGeometry,
  RodDensityProfile,
  Systems21Mode,
  Systems21Params,
  Systems21Record,
  createDefaultSystems21Params,
  evaluateSystems21,
  getDiscretePresetMasses,
} from '@/lib/physics/systems-com-2-1';
import { Systems21Viewport } from './systems21/Systems21Viewport';
import { Systems21AnalysisPanel } from './systems21/Systems21AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface SystemsCom21WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Systems21Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'discrete_com',
    label: 'Discrete COM',
    sub: 'Σm_i r_i / Σm_i',
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
  {
    id: 'continuous_rod',
    label: 'Nonuniform Rod',
    sub: '∫ r dm / ∫ dm',
    icon: <MoveRight className="w-3.5 h-3.5" />,
  },
  {
    id: 'composite_2d',
    label: '2D Plate & Hole',
    sub: 'Symmetry · Cutout',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    id: 'system_dynamics',
    label: 'System vs Parts',
    sub: 'Baton · Split',
    icon: <Box className="w-3.5 h-3.5" />,
  },
];

export const SystemsCom21Workbench: React.FC<SystemsCom21WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Systems21Params>(() =>
    createDefaultSystems21Params('discrete_com')
  );
  const [selectedMassIdx, setSelectedMassIdx] = useState<number>(0);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showSymmetryGuides, setShowSymmetryGuides] = useState(true);
  const [showSingleObjectModel, setShowSingleObjectModel] = useState(false);
  const [showTrailsAndVectors, setShowTrailsAndVectors] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<Systems21Record[]>([]);

  const animTimerRef = useRef<number | null>(null);

  const evaluation = useMemo(() => evaluateSystems21(params), [params]);

  const stopPlayback = useCallback(() => {
    if (animTimerRef.current !== null) {
      window.clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimerRef.current !== null) {
        window.clearInterval(animTimerRef.current);
      }
    };
  }, []);

  const handleSelectMode = (mode: Systems21Mode) => {
    stopPlayback();
    setParams(createDefaultSystems21Params(mode));
    setSelectedMassIdx(0);
    setShowSingleObjectModel(false);
    const opt = MODE_OPTIONS.find(m => m.id === mode);
    onToast?.(`Loaded ${opt?.label ?? mode} mode`);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    setIsPlaying(true);
    animTimerRef.current = window.setInterval(() => {
      setParams(prev => {
        if (prev.mode === 'system_dynamics') {
          const maxT = prev.dynamicsScenario === 'spring_carts' ? 2.0 : 1.45;
          let nextT = prev.timeS + 0.035;
          if (nextT > maxT) nextT = 0;
          return { ...prev, timeS: Number(nextT.toFixed(2)) };
        }
        if (prev.mode === 'continuous_rod') {
          let nextN = prev.riemannSlices + 2;
          if (nextN > 40) nextN = 4;
          return { ...prev, riemannSlices: nextN };
        }
        if (prev.mode === 'composite_2d' && prev.plateGeometry === 'disk_hole') {
          let nextH = prev.holeOffsetFrac + 0.06;
          if (nextH > 0.9) nextH = 0;
          return { ...prev, holeOffsetFrac: Number(nextH.toFixed(2)) };
        }
        // Discrete mode: sweep selected mass m1 mass up & down to watch COM shift
        const updated = prev.masses.map((m, i) => {
          if (i !== selectedMassIdx) return m;
          let nextM = m.massKg + 0.4;
          if (nextM > 10.0) nextM = 1.0;
          return { ...m, massKg: Number(nextM.toFixed(1)) };
        });
        return { ...prev, masses: updated };
      });
    }, 65);
  };

  const handleReset = () => {
    stopPlayback();
    setParams(createDefaultSystems21Params(params.mode));
    setShowSingleObjectModel(false);
    onToast?.('Reset Topic 2.1 parameters');
  };

  const handleRecordTrial = () => {
    let label = '';
    let note = '';
    if (params.mode === 'discrete_com') {
      label = `Discrete (${params.discretePreset.replace('_', ' ')})`;
      note = params.masses.map(m => `${m.label}=${m.massKg.toFixed(1)}kg`).join(' ');
    } else if (params.mode === 'continuous_rod') {
      label = `Rod (${params.rodProfile})`;
      note = `L=${params.rodLengthM.toFixed(1)}m, N=${params.riemannSlices}`;
    } else if (params.mode === 'composite_2d') {
      label = `Plate (${params.plateGeometry.replace('_', ' ')})`;
      note = `σ=${params.surfaceDensityKgPerM2.toFixed(1)} kg/m²`;
    } else {
      label = `System (${params.dynamicsScenario.replace('_', ' ')})`;
      note = `t=${params.timeS.toFixed(2)}s, ${params.systemBoundary === 'whole_system' ? 'Whole' : 'Part 1'}`;
    }

    const rec: Systems21Record = {
      id: `s21_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      mode: params.mode,
      label,
      totalMassKg: evaluation.totalMassKg,
      xComM: evaluation.xComM,
      yComM: evaluation.yComM,
      note,
    };
    setRecords(prev => [rec, ...prev].slice(0, 12));
    onToast?.(
      `Recorded ${label}: COM = (${evaluation.xComM.toFixed(2)}, ${evaluation.yComM.toFixed(2)}) m`
    );
  };

  const activeMass = params.masses[selectedMassIdx] || params.masses[0];

  const playButtonLabel = isPlaying
    ? 'Pause'
    : params.mode === 'system_dynamics'
    ? 'Play Motion'
    : params.mode === 'continuous_rod'
    ? 'Sweep Slices N'
    : params.mode === 'composite_2d'
    ? 'Sweep Cutout'
    : 'Sweep Mass m';

  return (
    <div
      className="relative w-full h-full bg-[#040b09] overflow-hidden select-none"
      data-testid="systems-21-workbench"
      data-mode={params.mode}
      data-xcom={evaluation.xComM.toFixed(2)}
      data-ycom={evaluation.yComM.toFixed(2)}
    >
      {/* Full-Bleed 3D / 2D WebGL Viewport */}
      <div className="absolute inset-0">
        <Systems21Viewport
          params={params}
          evaluation={evaluation}
          viewMode={externalViewMode}
          showSymmetryGuides={showSymmetryGuides}
          showSingleObjectModel={showSingleObjectModel}
          showTrailsAndVectors={showTrailsAndVectors}
        />
      </div>

      {/* Centered Top COM HUD Readout (stays clear of top nav & side docks) */}
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-xl bg-[#061410]/95 border border-emerald-400/40 shadow-xl text-center">
        <div className="text-[10px] font-mono text-slate-300 tracking-wide whitespace-nowrap">
          {evaluation.hudTopTitle}
        </div>
        <div className="text-sm font-mono font-bold text-amber-300 tabular-nums leading-tight mt-0.5">
          {evaluation.hudTopValue}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FLOATING LEFT CONTROL DOCK (No backdrop-blur over WebGL)              */}
      {/* ===================================================================== */}
      <aside
        aria-label="Systems and Center of Mass Controls"
        className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.25rem)] overflow-y-auto bg-[#061410]/95 border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-tight leading-none truncate">
                2.1 Systems &amp; COM Lab
              </h2>
              <span className="text-[10px] font-mono text-emerald-300/80 whitespace-nowrap block mt-0.5">
                r_cm = ∫ r dm / ∫ dm
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 whitespace-nowrap transition cursor-pointer"
              title="View AP Physics C Topic 2.1 Course Requirements"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>CED 2.1</span>
            </button>
            <button
              type="button"
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              aria-label={isLeftCollapsed ? 'Expand Topic 2.1 controls' : 'Collapse Topic 2.1 controls'}
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
            {/* 4 Topic 2.1 Exploration Modes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>System Model</span>
                <span className="text-emerald-400">LO 2.1.A &amp; 2.1.B</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MODE_OPTIONS.map(opt => {
                  const active = params.mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectMode(opt.id)}
                      className={`text-left px-2.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-2 ${
                        active
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold shadow'
                          : 'bg-[#040b09] text-slate-300 border-white/10 hover:border-emerald-400/40 hover:text-white'
                      }`}
                    >
                      <span className={active ? 'text-slate-950 shrink-0' : 'text-emerald-400 shrink-0'}>
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

            {/* MODE 1 CONTROLS: Discrete Point Masses */}
            {params.mode === 'discrete_com' && (
              <>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    Symmetry Presets (2.1.B.1)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'asymmetric', label: 'Asymmetric' },
                        { id: 'symmetric_mirror', label: 'Mirror Sym.' },
                        { id: 'heavy_anchor', label: 'Heavy m₁' },
                        { id: 'hollow_ring', label: 'Empty Center' },
                      ] as { id: DiscretePreset; label: string }[]
                    ).map(pre => (
                      <button
                        key={pre.id}
                        type="button"
                        onClick={() =>
                          setParams(p => ({
                            ...p,
                            discretePreset: pre.id,
                            masses: getDiscretePresetMasses(pre.id),
                          }))
                        }
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.discretePreset === pre.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Constituent Mass Editor */}
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    {params.masses.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMassIdx(idx)}
                        className={`py-1 rounded-lg text-[10.5px] font-mono font-bold transition cursor-pointer ${
                          selectedMassIdx === idx
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {m.label} ({m.massKg.toFixed(1)}kg)
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Mass {activeMass.label}</span>
                      <span className="font-mono font-bold text-emerald-300 tabular-nums">
                        {activeMass.massKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={`Mass ${activeMass.label}`}
                      min={0.5}
                      max={10}
                      step={0.5}
                      value={activeMass.massKg}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setParams(p => ({
                          ...p,
                          masses: p.masses.map((m, i) =>
                            i === selectedMassIdx ? { ...m, massKg: val } : m
                          ),
                        }));
                      }}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Position x ({activeMass.label})</span>
                      <span className="font-mono text-sky-300 tabular-nums">
                        {activeMass.xM >= 0 ? '+' : ''}
                        {activeMass.xM.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={`Position x of ${activeMass.label}`}
                      min={-2.4}
                      max={2.4}
                      step={0.1}
                      value={activeMass.xM}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setParams(p => ({
                          ...p,
                          masses: p.masses.map((m, i) =>
                            i === selectedMassIdx ? { ...m, xM: val } : m
                          ),
                        }));
                      }}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Position y ({activeMass.label})</span>
                      <span className="font-mono text-rose-300 tabular-nums">
                        {activeMass.yM >= 0 ? '+' : ''}
                        {activeMass.yM.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label={`Position y of ${activeMass.label}`}
                      min={-1.6}
                      max={1.6}
                      step={0.1}
                      value={activeMass.yM}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setParams(p => ({
                          ...p,
                          masses: p.masses.map((m, i) =>
                            i === selectedMassIdx ? { ...m, yM: val } : m
                          ),
                        }));
                      }}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {/* MODE 2 CONTROLS: Continuous Nonuniform Rod */}
            {params.mode === 'continuous_rod' && (
              <>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    Linear Density λ(x) = dm/dx (2.1.B.3.i)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'uniform', label: 'Uniform λ₀' },
                        { id: 'linear', label: 'Linear λ₀+αx' },
                        { id: 'quadratic', label: 'Quadratic βx²' },
                        { id: 'piecewise', label: '2-Metal Rod' },
                      ] as { id: RodDensityProfile; label: string }[]
                    ).map(prof => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => setParams(p => ({ ...p, rodProfile: prof.id }))}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.rodProfile === prof.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {prof.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Rod Length L</span>
                      <span className="font-mono font-bold text-emerald-300 tabular-nums">
                        {params.rodLengthM.toFixed(1)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Rod Length L"
                      min={2.0}
                      max={6.0}
                      step={0.5}
                      value={params.rodLengthM}
                      onChange={e =>
                        setParams(p => ({ ...p, rodLengthM: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  {params.rodProfile !== 'uniform' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">
                          {params.rodProfile === 'piecewise' ? 'Right/Left Contrast' : 'Density Gradient'}
                        </span>
                        <span className="font-mono font-bold text-rose-300 tabular-nums">
                          {params.gradientCoeff.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Density Gradient"
                        min={0.5}
                        max={4.0}
                        step={0.5}
                        value={params.gradientCoeff}
                        onChange={e =>
                          setParams(p => ({ ...p, gradientCoeff: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-rose-400 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Riemann Slices N (dm)</span>
                      <span className="font-mono font-bold text-sky-300 tabular-nums">
                        {params.riemannSlices} slices
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Riemann Slices N"
                      min={4}
                      max={40}
                      step={2}
                      value={params.riemannSlices}
                      onChange={e =>
                        setParams(p => ({ ...p, riemannSlices: parseInt(e.target.value, 10) }))
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {/* MODE 3 CONTROLS: 2D Composite Plate & Cutout */}
            {params.mode === 'composite_2d' && (
              <>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    2D Plate Geometry (2.1.B.1 &amp; 2.1.B.3.ii)
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(
                      [
                        { id: 'disk_hole', label: 'Disk + Hole' },
                        { id: 'l_bracket', label: 'L-Bracket' },
                        { id: 't_beam', label: 'T-Beam' },
                        { id: 'right_triangle', label: 'Right Triangle' },
                      ] as { id: PlateGeometry; label: string }[]
                    ).map(geo => (
                      <button
                        key={geo.id}
                        type="button"
                        onClick={() => setParams(p => ({ ...p, plateGeometry: geo.id }))}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.plateGeometry === geo.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {geo.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Surface Density σ</span>
                      <span className="font-mono font-bold text-emerald-300 tabular-nums">
                        {params.surfaceDensityKgPerM2.toFixed(1)} kg/m²
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Surface Density"
                      min={0.5}
                      max={5.0}
                      step={0.5}
                      value={params.surfaceDensityKgPerM2}
                      onChange={e =>
                        setParams(p => ({
                          ...p,
                          surfaceDensityKgPerM2: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  {params.plateGeometry === 'disk_hole' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Cutout Offset (+x)</span>
                        <span className="font-mono font-bold text-rose-300 tabular-nums">
                          {(params.holeOffsetFrac * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Cutout Offset"
                        min={0}
                        max={0.9}
                        step={0.05}
                        value={params.holeOffsetFrac}
                        onChange={e =>
                          setParams(p => ({
                            ...p,
                            holeOffsetFrac: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-rose-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* MODE 4 CONTROLS: System vs. Parts Dynamics (LO 2.1.A & 2.1.B.4) */}
            {params.mode === 'system_dynamics' && (
              <>
                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400">
                    Multi-Object Scenario (LO 2.1.A)
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'tossed_baton', label: 'Baton' },
                        { id: 'midflight_split', label: 'Mid-Split' },
                        { id: 'spring_carts', label: 'Spring' },
                      ] as { id: DynamicsScenario; label: string }[]
                    ).map(sc => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          stopPlayback();
                          setParams(p => ({ ...p, dynamicsScenario: sc.id, timeS: 0.65 }));
                        }}
                        className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.dynamicsScenario === sc.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>

                  {/* System Boundary Choice (EK 2.1.A.3 & 2.1.A.5) */}
                  <div className="pt-1 space-y-1">
                    <div className="text-[10px] font-mono text-slate-400">
                      Chosen System Boundary (2.1.A.3)
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setParams(p => ({ ...p, systemBoundary: 'whole_system' }))}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.systemBoundary === 'whole_system'
                            ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 font-bold'
                            : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                      >
                        Whole System
                      </button>
                      <button
                        type="button"
                        onClick={() => setParams(p => ({ ...p, systemBoundary: 'part_only' }))}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold whitespace-nowrap transition cursor-pointer ${
                          params.systemBoundary === 'part_only'
                            ? 'bg-sky-500/25 border border-sky-400/60 text-sky-200 font-bold'
                            : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                      >
                        Part 1 Only
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#040b09] border border-white/10 rounded-xl p-2.5 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Time t</span>
                      <span className="font-mono font-bold text-amber-300 tabular-nums">
                        {params.timeS.toFixed(2)} s
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Time t"
                      min={0}
                      max={params.dynamicsScenario === 'spring_carts' ? 2.0 : 1.45}
                      step={0.05}
                      value={params.timeS}
                      onChange={e =>
                        setParams(p => ({ ...p, timeS: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Mass Ratio m₂ / m₁</span>
                      <span className="font-mono font-bold text-rose-300 tabular-nums">
                        {params.massRatio.toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Mass Ratio m2 over m1"
                      min={0.5}
                      max={3.5}
                      step={0.5}
                      value={params.massRatio}
                      onChange={e =>
                        setParams(p => ({ ...p, massRatio: parseFloat(e.target.value) }))
                      }
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>

                  {params.dynamicsScenario === 'spring_carts' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">External Force F_ext</span>
                        <span className="font-mono font-bold text-sky-300 tabular-nums">
                          {params.externalForceN.toFixed(1)} N
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="External Force"
                        min={0}
                        max={10}
                        step={1}
                        value={params.externalForceN}
                        onChange={e =>
                          setParams(p => ({ ...p, externalForceN: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Playback + Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playButtonLabel}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset Topic 2.1 parameters"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                title="Reset current mode"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visual Layer Toggles */}
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setShowSymmetryGuides(v => !v)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showSymmetryGuides
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-[#040b09] border-white/10 text-slate-500'
                }`}
              >
                {params.mode === 'system_dynamics' ? 'Boundary' : 'Symmetry'}
              </button>
              <button
                type="button"
                onClick={() => setShowTrailsAndVectors(v => !v)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showTrailsAndVectors
                    ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                    : 'bg-[#040b09] border-white/10 text-slate-500'
                }`}
              >
                {params.mode === 'system_dynamics' ? 'Trails' : 'Vectors'}
              </button>
              <button
                type="button"
                onClick={() => setShowSingleObjectModel(v => !v)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold border whitespace-nowrap transition cursor-pointer ${
                  showSingleObjectModel
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#040b09] border-white/10 text-slate-500'
                }`}
                title="Model system as a single point mass M at its center of mass (2.1.A.2 & 2.1.B.4)"
              >
                1-Object
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* FLOATING RIGHT ANALYSIS PANEL                                         */}
      {/* ===================================================================== */}
      <Systems21AnalysisPanel
        params={params}
        evaluation={evaluation}
        isCollapsed={isRightCollapsed}
        onToggleCollapse={() => setIsRightCollapsed(prev => !prev)}
        records={records}
        onRecordTrial={handleRecordTrial}
        onClearRecords={() => {
          setRecords([]);
          onToast?.('Cleared recorded COM trials');
        }}
      />

      {/* ===================================================================== */}
      {/* BOTTOM SUMMARY & LEGEND BAR                                           */}
      {/* ===================================================================== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[740px] px-4 py-2 rounded-2xl bg-[#061410]/95 border border-white/10 shadow-xl text-center">
        <div className="text-[11px] font-semibold text-white truncate">
          {evaluation.headlineSummary}
        </div>
        <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-300 mt-0.5">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1 align-middle" />
            Center of Mass (COM)
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1 align-middle" />
            Mass m₁ / Symmetry
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1 align-middle" />
            Element dm / F_ext
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1 align-middle" />
            Mass m₂ / Cutout
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AP PHYSICS C TOPIC 2.1 CED REQUIREMENTS MODAL                         */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 2.1 Systems and Center of Mass Requirements"
        >
          <div className="bg-[#061410] border border-emerald-500/40 rounded-2xl max-w-2xl w-full max-h-[86vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[10.5px] font-mono text-emerald-400">
                  AP Physics C: Mechanics · Unit 2: Force and Translational Dynamics
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 2.1: Systems and Center of Mass
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCedOpen(false)}
                aria-label="Close Topic 2.1 course requirements"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-1.5 text-xs text-slate-200 leading-relaxed">
              <div className="text-[10.5px] font-mono font-bold text-emerald-300">
                LO 2.1.A — Describe the properties and interactions of a system (2.1.A.1 – 2.1.A.6)
              </div>
              <p><strong className="text-white">2.1.A.1:</strong> System properties are determined by the interactions between objects within the system.</p>
              <p><strong className="text-white">2.1.A.2:</strong> If constituent properties/interactions are not important in modeling macroscopic behavior, the system can be treated as a single object.</p>
              <p><strong className="text-white">2.1.A.3:</strong> Systems may allow interactions between constituent parts and the environment, resulting in transfer of energy or mass.</p>
              <p><strong className="text-white">2.1.A.4:</strong> Individual objects within a chosen system may behave differently from each other as well as from the system as a whole.</p>
              <p><strong className="text-white">2.1.A.5–6:</strong> Internal structure affects system analysis, and changing external variables may change the system&apos;s substructure.</p>
            </div>

            <div className="bg-[#040b09] border border-white/10 rounded-xl p-3 space-y-2 text-xs text-slate-200 leading-relaxed">
              <div className="text-[10.5px] font-mono font-bold text-emerald-300">
                LO 2.1.B — Describe a system&apos;s center of mass with respect to its parts (2.1.B.1 – 2.1.B.4)
              </div>
              <p>
                <strong className="text-white">2.1.B.1:</strong> For symmetrical mass distributions, the center of mass lies on lines of symmetry.
              </p>
              <p>
                <strong className="text-white">2.1.B.2:</strong> Discrete system center of mass:{' '}
                <span className="inline-block bg-[#081a14] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-systems21" className="text-emerald-300" />
                </span>
              </p>
              <p>
                <strong className="text-white">2.1.B.3 (i–ii):</strong> Continuous nonuniform solid center of mass:{' '}
                <span className="inline-block bg-[#081a14] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-systems21-int" className="text-amber-300" />
                </span>{' '}
                with linear mass density{' '}
                <span className="inline-block bg-[#081a14] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-systems21-lambda" className="text-sky-300" />
                </span>{' '}
                and total mass{' '}
                <span className="inline-block bg-[#081a14] px-2 py-0.5 rounded border border-white/10 mx-1">
                  <MathFormula formulaKey="sim-systems21-mass" className="text-emerald-300" />
                </span>
              </p>
              <p>
                <strong className="text-white">2.1.B.4:</strong> A system can be modeled as a singular object located at its center of mass.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                Suggested Skills: 1.A · 2.B · 2.C · 3.B
              </span>
              <a
                href="/assets/aistudio/Topic_2.1_course_requirements_bcd380bf.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Official Topic 2.1 PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemsCom21Workbench;
