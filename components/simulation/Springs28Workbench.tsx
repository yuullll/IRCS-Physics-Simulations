'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Columns2,
  ExternalLink,
  GitCommitHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  DEFAULT_SPRINGS28_PARAMS,
  INITIAL_SPRING_TRIALS_28,
  SpringBehaviorType,
  SpringLabTrial,
  Springs28Mode,
  Springs28Params,
  evaluateSprings28,
} from '@/lib/physics/springs-2-8';
import { Springs28Viewport } from './springs28/Springs28Viewport';
import { Springs28AnalysisPanel } from './springs28/Springs28AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Springs28WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_META: Record<
  Springs28Mode,
  { short: string; sub: string; title: string; ek: string; icon: React.ReactNode }
> = {
  hookes_restoring: {
    short: 'Hooke’s Law',
    sub: 'Ideal vs Nonideal',
    title: 'Hooke’s Law & Restoring Force Bench',
    ek: '2.8.A.1–3',
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  vertical_equilibrium: {
    short: 'Vertical Eq.',
    sub: 'y_eq = -mg/k & Mass',
    title: 'Vertical Hanging Spring & Equilibrium Shift',
    ek: '2.8.A.1 & 2.8.A.3',
    icon: <ArrowDownUp className="w-3.5 h-3.5" />,
  },
  series_springs: {
    short: 'Series k_eq',
    sub: '1/k_eq = Σ(1/k_i)',
    title: 'Series Spring Combination vs. Equivalent',
    ek: '2.8.B.1.i–ii',
    icon: <GitCommitHorizontal className="w-3.5 h-3.5" />,
  },
  parallel_springs: {
    short: 'Parallel k_eq',
    sub: 'k_eq = Σk_i',
    title: 'Parallel Spring Combination vs. Equivalent',
    ek: '2.8.B.1.iii',
    icon: <Columns2 className="w-3.5 h-3.5" />,
  },
};

export const Springs28Workbench: React.FC<Springs28WorkbenchProps> = ({
  onToast,
  externalViewMode,
}) => {
  const [params, setParams] = useState<Springs28Params>(DEFAULT_SPRINGS28_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simTimeS, setSimTimeS] = useState(0);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [showCedModal, setShowCedModal] = useState(false);
  const [labTrials, setLabTrials] = useState<SpringLabTrial[]>(INITIAL_SPRING_TRIALS_28);

  const viewMode: '3d' | '2d' = externalViewMode ?? '3d';

  const evaluation = useMemo(
    () => evaluateSprings28(params, simTimeS),
    [params, simTimeS]
  );

  // Smooth deterministic harmonic / nonlinear oscillation loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.045, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      setSimTimeS(prev => prev + dt);
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleModeChange = useCallback(
    (mode: Springs28Mode) => {
      setIsPlaying(false);
      setSimTimeS(0);
      setParams(prev => ({ ...prev, mode }));
      onToast?.(`Switched to ${MODE_META[mode].ek} ${MODE_META[mode].title}`);
    },
    [onToast]
  );

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSimTimeS(0);
  }, []);

  const handleRecordTrial = useCallback(() => {
    const h = evaluation.hookes;
    const trial: SpringLabTrial = {
      id: `st-${Date.now()}`,
      displacementM: h.displacementM,
      forceN: h.springForceN,
      behavior: params.springBehavior,
      kNm: params.hookeKNm,
    };
    setLabTrials(prev => [...prev.slice(-11), trial]);
    onToast?.(
      `Plotted Skill 1.A point: Δx = ${h.displacementM >= 0 ? '+' : ''}${h.displacementM.toFixed(2)} m, F_s = ${h.springForceN >= 0 ? '+' : ''}${h.springForceN.toFixed(1)} N`
    );
  }, [evaluation.hookes, params.springBehavior, params.hookeKNm, onToast]);

  const activeMeta = MODE_META[params.mode];
  const isComboMode = params.mode === 'series_springs' || params.mode === 'parallel_springs';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-BLEED 3D / 2D WEBGL LABORATORY VIEWPORT */}
      <Springs28Viewport params={params} evaluation={evaluation} viewMode={viewMode} />

      {/* TOP-CENTER CURRICULUM SPEC BADGE */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#071510]/95 border border-emerald-500/25 shadow-2xl">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
            Unit 2 · Topic 2.8 · Spring Forces
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="text-xs font-bold text-white whitespace-nowrap">{activeMeta.title}</span>
            <span className="text-slate-600">·</span>
            <MathFormula formulaKey="sim-springs28" className="text-emerald-300 text-xs" />
          </div>
        </div>
        <button
          onClick={() => setShowCedModal(true)}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5" /> CED 2.8
        </button>
      </div>

      {/* LEFT FLOATING SPRING LAB CONTROLS DOCK */}
      <aside
        aria-label="Spring Lab Controls"
        className="fixed top-[68px] left-3 z-20 w-[300px] max-w-[calc(100vw-24px)] bg-[#071510]/95 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-84px)] overflow-hidden"
      >
        <button
          onClick={() => setControlsCollapsed(v => !v)}
          aria-expanded={!controlsCollapsed}
          className="w-full px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-500/20 hover:bg-emerald-500/5 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-white">Spring Lab Controls</span>
          </div>
          {controlsCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {!controlsCollapsed && (
          <div className="p-3 overflow-y-auto space-y-3 text-xs">
            {/* 4-Mode Selector Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MODE_META) as Springs28Mode[]).map(m => {
                const meta = MODE_META[m];
                const active = params.mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/15'
                        : 'bg-[#040d0a] text-slate-200 border-white/10 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-[11px] whitespace-nowrap">
                      {meta.icon}
                      <span>{meta.short}</span>
                    </div>
                    <div
                      className={`text-[9.5px] font-mono mt-0.5 truncate ${
                        active ? 'text-slate-900/85' : 'text-slate-400'
                      }`}
                    >
                      {meta.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ============================================================= */}
            {/* MODE 1: HOOKE'S LAW & IDEAL VS NONIDEAL SPRINGS               */}
            {/* ============================================================= */}
            {params.mode === 'hookes_restoring' && (
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-300 font-medium">
                    Spring Constitutive Law (2.8.A.1)
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'ideal', label: 'Ideal' },
                        { id: 'nonideal_hardening', label: 'Hardening' },
                        { id: 'nonideal_softening', label: 'Softening' },
                      ] as { id: SpringBehaviorType; label: string }[]
                    ).map(opt => {
                      const active = params.springBehavior === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setIsPlaying(false);
                            setSimTimeS(0);
                            setParams(prev => ({ ...prev, springBehavior: opt.id }));
                          }}
                          className={`py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                            active
                              ? opt.id === 'ideal'
                                ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                                : 'bg-amber-400/20 border-amber-400 text-amber-200'
                              : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Compress / Equilibrium / Stretch presets */}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeDisplacementM: -0.4 }));
                    }}
                    className="py-1 px-1.5 rounded-lg bg-[#040d0a] border border-white/10 hover:border-sky-400/50 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Compress
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeDisplacementM: 0 }));
                    }}
                    className="py-1 px-1.5 rounded-lg bg-[#040d0a] border border-white/10 hover:border-emerald-400/50 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Eq (x=0)
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeDisplacementM: 0.45 }));
                    }}
                    className="py-1 px-1.5 rounded-lg bg-[#040d0a] border border-white/10 hover:border-amber-400/50 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Stretch
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Spring Constant k</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.hookeKNm} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={5}
                    value={params.hookeKNm}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeKNm: Number(e.target.value) }));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Displacement Δx</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.hookeDisplacementM >= 0 ? '+' : ''}
                      {params.hookeDisplacementM.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.55}
                    max={0.55}
                    step={0.05}
                    value={params.hookeDisplacementM}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeDisplacementM: Number(e.target.value) }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Cart Mass m</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.hookeMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={8.0}
                    step={0.5}
                    value={params.hookeMassKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, hookeMassKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setIsPlaying(v => !v)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Oscillate'}
                  </button>
                  <button
                    onClick={handleRecordTrial}
                    title="Plot (Δx, F_s) onto Skill 1.A graph"
                    className="py-2 px-2.5 rounded-xl bg-sky-400/20 hover:bg-sky-400/30 border border-sky-400/40 text-sky-200 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Trial
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset oscillation"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE 2: VERTICAL HANGING SPRING & EQUILIBRIUM SHIFT           */}
            {/* ============================================================= */}
            {params.mode === 'vertical_equilibrium' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalSpringMassKg: 0, verticalOffsetM: -0.2 }));
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                      params.verticalSpringMassKg < 0.01
                        ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-400'
                    }`}
                  >
                    Ideal (m_s = 0)
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalSpringMassKg: 1.0, verticalOffsetM: -0.2 }));
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                      params.verticalSpringMassKg >= 0.01
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-400'
                    }`}
                  >
                    Massive Spring
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Spring Constant k</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.verticalKNm} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={5}
                    value={params.verticalKNm}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalKNm: Number(e.target.value) }));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Hanging Mass m</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.verticalMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.5}
                    value={params.verticalMassKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalMassKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Offset from y_eq (η)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.verticalOffsetM >= 0 ? '+' : ''}
                      {params.verticalOffsetM.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.35}
                    max={0.35}
                    step={0.05}
                    value={params.verticalOffsetM}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalOffsetM: Number(e.target.value) }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Spring Mass m_s (2.8.A.1)</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.verticalSpringMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={params.verticalSpringMassKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, verticalSpringMassKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setIsPlaying(v => !v)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Release & Oscillate'}
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset vertical spring"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODES 3 & 4: PURE SERIES OR PURE PARALLEL COMBINATIONS        */}
            {/* ============================================================= */}
            {isComboMode && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {([2, 3] as const).map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => {
                        setIsPlaying(false);
                        setSimTimeS(0);
                        setParams(prev => ({ ...prev, comboCount: cnt }));
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                        params.comboCount === cnt
                          ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cnt} Springs
                    </button>
                  ))}
                </div>

                {/* Quick AP Comparison Presets */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, k1Nm: 40, k2Nm: 40, k3Nm: 40 }));
                    }}
                    className="py-1 px-2 rounded-lg bg-[#040d0a] border border-white/10 hover:border-emerald-400/40 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Identical (40, 40)
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, k1Nm: 20, k2Nm: 100, k3Nm: 60 }));
                    }}
                    className="py-1 px-2 rounded-lg bg-[#040d0a] border border-white/10 hover:border-amber-400/40 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Soft + Stiff (20, 100)
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-sky-300 font-medium">Spring 1 Constant k₁</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.k1Nm} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={params.k1Nm}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, k1Nm: Number(e.target.value) }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-purple-300 font-medium">Spring 2 Constant k₂</span>
                    <span className="font-mono font-bold text-purple-300 tabular-nums">
                      {params.k2Nm} N/m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={params.k2Nm}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, k2Nm: Number(e.target.value) }));
                    }}
                    className="w-full accent-purple-400"
                  />
                </label>

                {params.comboCount === 3 && (
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-amber-300 font-medium">Spring 3 Constant k₃</span>
                      <span className="font-mono font-bold text-amber-300 tabular-nums">
                        {params.k3Nm} N/m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      step={5}
                      value={params.k3Nm}
                      onChange={e => {
                        setIsPlaying(false);
                        setSimTimeS(0);
                        setParams(prev => ({ ...prev, k3Nm: Number(e.target.value) }));
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>
                )}

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Applied Pull F</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.comboAppliedForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={36}
                    step={2}
                    value={params.comboAppliedForceN}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, comboAppliedForceN: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setIsPlaying(v => !v)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Release & Compare'}
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset combination bench"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* RIGHT FLOATING ANALYSIS DOCK (SKILLS 1.A, 2.B, 2.D, 3.C) */}
      <Springs28AnalysisPanel
        params={params}
        evaluation={evaluation}
        labTrials={labTrials}
        onRecordTrial={handleRecordTrial}
        onResetTrials={() => setLabTrials(INITIAL_SPRING_TRIALS_28)}
      />

      {/* BOTTOM STATUS & VECTOR COLOR LEGEND BAR */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[min(920px,calc(100vw-24px))] px-4 py-2 rounded-2xl bg-[#071510]/95 border border-emerald-500/25 shadow-2xl text-center">
        <div className="text-[11px] font-semibold text-white leading-snug">
          {evaluation.statusBanner}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 text-[10px] font-mono mt-1">
          <span className="text-emerald-300">Spring Force F_s / k_eq</span>
          <span className="text-sky-300">Displacement Δx / k₁</span>
          <span className="text-purple-300">Spring k₂</span>
          <span className="text-amber-300">Weight F_g / Pull F / Nonideal</span>
          <span className="text-rose-300">Net Restoring F_net</span>
        </div>
      </div>

      {/* CED 2.8 COURSE REQUIREMENTS MODAL */}
      {showCedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 2.8 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#071510] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                  AP Physics C: Mechanics · Unit 2 · Course Framework V.1 | Pages 55–56
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Topic 2.8: Spring Forces
                </h2>
              </div>
              <button
                onClick={() => setShowCedModal(false)}
                aria-label="Close CED modal"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="p-3 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-emerald-400">
                    2.8.A · IDEAL VS. NONIDEAL SPRINGS &amp; HOOKE’S LAW
                  </span>
                  <MathFormula formulaKey="sim-springs28-hooke" className="text-emerald-200 text-xs" />
                </div>
                <p className="leading-relaxed text-slate-300">
                  An ideal spring has negligible mass and exerts a force proportional to the change in length from its relaxed length; a nonideal spring has nonnegligible mass or exerts a force not proportional to change in length (2.8.A.1). For an ideal spring, Hooke’s Law gives F_s = -kΔx (2.8.A.2), and the spring force is always directed toward the equilibrium position of the object–spring system (2.8.A.3).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono font-bold text-emerald-400">
                    2.8.B · EQUIVALENT SPRING CONSTANT (SERIES &amp; PARALLEL)
                  </span>
                  <div className="flex items-center gap-2">
                    <MathFormula formulaKey="sim-springs28-series" className="text-amber-200 text-xs" />
                    <MathFormula formulaKey="sim-springs28-parallel" className="text-emerald-200 text-xs" />
                  </div>
                </div>
                <p className="leading-relaxed text-slate-300">
                  A collection of springs behaves as a single equivalent spring with spring constant k_eq (2.8.B.1). In series, 1/k_eq,series = Σ(1/k_i) (2.8.B.1.i), which is always smaller than the smallest constituent spring constant (2.8.B.1.ii). In parallel, k_eq,parallel = Σk_i (2.8.B.1.iii).
                </p>
                <p className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
                  AP Boundary Statement (p. 56): Combinations are strictly limited to pure series OR pure parallel springs — no mixed series-parallel combinations.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                <div className="font-mono font-bold text-emerald-400">
                  SUGGESTED SCIENCE PRACTICES (ALL 4 INTERACTIVE)
                </div>
                <p className="leading-relaxed text-slate-300">
                  1.A Diagrams, quantitative charts &amp; spring breakdown tables · 2.B Step-by-step quantitative calculations with units · 2.D Functional dependence &amp; factor-of-change predictions · 3.C Evidence-based claim justification.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <a
                href="/assets/aistudio/Topic_2.8_course_requirements_de4322a0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1.5"
              >
                Open Official Topic 2.8 Course Requirements PDF
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowCedModal(false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs hover:bg-emerald-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Springs28Workbench;
