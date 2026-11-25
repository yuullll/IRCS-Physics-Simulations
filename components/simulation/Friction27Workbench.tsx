'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Gauge,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Sliders,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  DEFAULT_FRICTION27_PARAMS,
  FRICTION_MATERIALS,
  Friction27Mode,
  Friction27Params,
  INITIAL_LAB_TRIALS_27,
  LabTrialPoint,
  MaterialPairId,
  evaluateFriction27,
} from '@/lib/physics/friction-2-7';
import { Friction27Viewport } from './friction27/Friction27Viewport';
import { Friction27AnalysisPanel } from './friction27/Friction27AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface Friction27WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MATERIAL_ORDER: MaterialPairId[] = [
  'wood_wood',
  'rubber_asphalt',
  'steel_steel',
  'teflon_steel',
  'waxed_snow',
];

const MODE_META: Record<
  Friction27Mode,
  { short: string; sub: string; title: string; ek: string; icon: React.ReactNode }
> = {
  horizontal_pull: {
    short: 'Pull & Break',
    sub: 'F_f vs F_app & Angle φ',
    title: 'Static Breakaway & Kinetic Pull Bench',
    ek: '2.7.A & 2.7.B',
    icon: <Gauge className="w-3.5 h-3.5" />,
  },
  incline_ramp: {
    short: 'Incline Ramp',
    sub: 'θ_c = arctan(μ_s) & Uphill',
    title: 'Inclined Plane Critical Angle & Reversal',
    ek: '2.7.A.1.i & 2.7.B.2',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  stacked_blocks: {
    short: '2-Block Stack',
    sub: 'Forward Friction & 3rd Law',
    title: 'Stacked Two-Block Relative Motion Lab',
    ek: '2.7.A.1.i & 2.7.B.1',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  area_surface_compare: {
    short: 'Area & Surface',
    sub: 'Wide vs Edge & Material μ',
    title: 'Contact Area Independence vs. Material Lab',
    ek: '2.7.A.1.ii & 2.7.A.2.i',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
};

export const Friction27Workbench: React.FC<Friction27WorkbenchProps> = ({
  onToast,
  externalViewMode,
}) => {
  const [params, setParams] = useState<Friction27Params>(DEFAULT_FRICTION27_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simTimeS, setSimTimeS] = useState(0);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [showCedModal, setShowCedModal] = useState(false);
  const [labTrials, setLabTrials] = useState<LabTrialPoint[]>(INITIAL_LAB_TRIALS_27);

  const viewMode: '3d' | '2d' = externalViewMode ?? '3d';

  const evaluation = useMemo(
    () => evaluateFriction27(params, simTimeS, isPlaying),
    [params, simTimeS, isPlaying]
  );

  // Smooth deterministic playback loop (capped cleanly to prevent drift & auto-stops after full travel)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      setSimTimeS(prev => {
        const next = prev + dt;
        const maxDuration = params.mode === 'horizontal_pull' && params.autoRampActive ? 4.4 : 3.6;
        if (next >= maxDuration) {
          setIsPlaying(false);
          return maxDuration;
        }
        return next;
      });
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, params.mode, params.autoRampActive]);

  const handleModeChange = useCallback(
    (mode: Friction27Mode) => {
      setIsPlaying(false);
      setSimTimeS(0);
      setParams(prev => ({
        ...prev,
        mode,
        autoRampActive: false,
      }));
      onToast?.(`Switched to ${MODE_META[mode].ek} ${MODE_META[mode].title}`);
    },
    [onToast]
  );

  const handleMaterialSelect = useCallback((matId: MaterialPairId) => {
    const spec = FRICTION_MATERIALS[matId];
    setIsPlaying(false);
    setSimTimeS(0);
    setParams(prev => ({
      ...prev,
      materialId: matId,
      muS: spec.muS,
      muK: spec.muK,
      topMuS: spec.muS,
      topMuK: spec.muK,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSimTimeS(0);
    setParams(prev => ({ ...prev, autoRampActive: false }));
  }, []);

  const handleRecordTrial = useCallback(() => {
    const h = evaluation.horizontal;
    const trial: LabTrialPoint = {
      id: `trial-${Date.now()}`,
      massKg: params.massKg,
      normalForceN: h.normalForceN,
      maxStaticFrictionN: h.maxStaticFrictionN,
      kineticFrictionN: h.kineticFrictionN,
      materialId: params.materialId,
      orientation: params.orientation,
    };
    setLabTrials(prev => [...prev.slice(-11), trial]);
    onToast?.(
      `Recorded Skill 1.B trial: F_N = ${h.normalForceN.toFixed(1)} N, F_s,max = ${h.maxStaticFrictionN.toFixed(1)} N, F_f,k = ${h.kineticFrictionN.toFixed(1)} N`
    );
  }, [evaluation.horizontal, params.massKg, params.materialId, params.orientation, onToast]);

  const activeMeta = MODE_META[params.mode];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-BLEED 3D / 2D WEBGL LABORATORY VIEWPORT */}
      <Friction27Viewport params={params} evaluation={evaluation} viewMode={viewMode} />

      {/* TOP-CENTER CURRICULUM SPEC BADGE */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#071510]/95 border border-emerald-500/25 shadow-2xl">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
            Unit 2 · Topic 2.7 · Kinetic and Static Friction
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="text-xs font-bold text-white whitespace-nowrap">{activeMeta.title}</span>
            <span className="text-slate-600">·</span>
            <MathFormula formulaKey="sim-friction27" className="text-emerald-300 text-xs" />
          </div>
        </div>
        <button
          onClick={() => setShowCedModal(true)}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5" /> CED 2.7
        </button>
      </div>

      {/* LEFT FLOATING FRICTION CONTROLS DOCK */}
      <aside
        aria-label="Friction Controls"
        className="fixed top-[68px] left-3 z-20 w-[300px] max-w-[calc(100vw-24px)] bg-[#071510]/95 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-84px)] overflow-hidden"
      >
        <button
          onClick={() => setControlsCollapsed(v => !v)}
          aria-expanded={!controlsCollapsed}
          className="w-full px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-500/20 hover:bg-emerald-500/5 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-white">Friction Lab Controls</span>
          </div>
          {controlsCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {!controlsCollapsed && (
          <div className="p-3 overflow-y-auto space-y-3 text-xs">
            {/* 4 Mode Selector Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MODE_META) as Friction27Mode[]).map(m => {
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

            {/* Surface Material Selector (2.7.A.2.i) */}
            {params.mode !== 'stacked_blocks' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Surface Pair (2.7.A.2.i)</span>
                  <span className="font-mono text-emerald-300 text-[10px]">
                    μ_s={params.muS.toFixed(2)} · μ_k={params.muK.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MATERIAL_ORDER.map(matId => {
                    const spec = FRICTION_MATERIALS[matId];
                    const active = params.materialId === matId;
                    return (
                      <button
                        key={matId}
                        onClick={() => handleMaterialSelect(matId)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer truncate ${
                          active
                            ? 'bg-emerald-400/20 border-emerald-400 text-emerald-200'
                            : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {spec.shortName.split(' / ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE 1 CONTROLS: HORIZONTAL / ANGLED PULL & BREAKAWAY         */}
            {/* ============================================================= */}
            {params.mode === 'horizontal_pull' && (
              <div className="space-y-2.5">
                {/* Block Orientation Toggle (2.7.A.1.ii Area Independence!) */}
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'wide', label: 'Wide Face (A)' },
                      { id: 'narrow', label: 'Narrow Edge (A/3)' },
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setParams(prev => ({ ...prev, orientation: opt.id }));
                        onToast?.(
                          opt.id === 'narrow'
                            ? 'Flipped to Narrow Edge (3× pressure) — notice F_s,max & F_f,k do NOT change (2.7.A.1.ii)!'
                            : 'Flipped to Wide Face (Area A) — friction remains identical!'
                        );
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border transition cursor-pointer whitespace-nowrap ${
                        params.orientation === opt.id
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                          : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Applied Pull F_app</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {evaluation.horizontal.effectiveAppliedForceN.toFixed(1)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={0.5}
                    value={params.appliedForceN}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({
                        ...prev,
                        autoRampActive: false,
                        appliedForceN: Number(e.target.value),
                      }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Pull / Push Angle φ</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.pullAngleDeg >= 0 ? `+${params.pullAngleDeg}° (Up)` : `${params.pullAngleDeg}° (Down)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={45}
                    step={5}
                    value={params.pullAngleDeg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, pullAngleDeg: Number(e.target.value) }));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Block Mass m</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.massKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={params.massKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, massKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Static μ_s</span>
                      <span className="font-mono text-emerald-300">{params.muS.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.02}
                      value={params.muS}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setParams(prev => ({
                          ...prev,
                          muS: v,
                          muK: Math.min(prev.muK, Math.max(0.05, Number((v - 0.04).toFixed(2)))),
                        }));
                      }}
                      className="w-full accent-emerald-400"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Kinetic μ_k</span>
                      <span className="font-mono text-amber-300">{params.muK.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.95}
                      step={0.02}
                      value={params.muK}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setParams(prev => ({
                          ...prev,
                          muK: Math.min(v, prev.muS),
                        }));
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>
                </div>

                {/* Action buttons: Auto-Ramp Breakaway + Manual Slide + Record Lab Trial */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (isPlaying) {
                        setIsPlaying(false);
                      } else {
                        setSimTimeS(0);
                        setParams(prev => ({ ...prev, autoRampActive: true }));
                        setIsPlaying(true);
                      }
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Auto-Ramp Pull'}
                  </button>
                  <button
                    onClick={handleRecordTrial}
                    title="Record (F_N, F_f) point to Skill 1.B Lab Plot"
                    className="py-2 px-2.5 rounded-xl bg-sky-400/20 hover:bg-sky-400/30 border border-sky-400/40 text-sky-200 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Trial
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset pull simulation"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE 2 CONTROLS: INCLINED PLANE & CRITICAL ANGLE              */}
            {/* ============================================================= */}
            {params.mode === 'incline_ramp' && (
              <div className="space-y-2.5">
                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Ramp Angle θ</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.inclineAngleDeg.toFixed(0)}° (θ_c = {evaluation.incline.criticalAngleDeg.toFixed(1)}°)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={55}
                    step={1}
                    value={params.inclineAngleDeg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, inclineAngleDeg: Number(e.target.value) }));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                {/* Quick angle presets relative to θ_c */}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({
                        ...prev,
                        inclineAngleDeg: Math.max(5, Math.floor(evaluation.incline.criticalAngleDeg - 6)),
                        inclineInitialVelocityMs: 0,
                      }));
                    }}
                    className="py-1 px-1.5 rounded-lg bg-[#040d0a] border border-white/10 hover:border-emerald-400/50 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Hold (&lt; θ_c)
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({
                        ...prev,
                        inclineAngleDeg: Math.min(55, Math.ceil(evaluation.incline.criticalAngleDeg + 8)),
                        inclineInitialVelocityMs: 0,
                      }));
                    }}
                    className="py-1 px-1.5 rounded-lg bg-[#040d0a] border border-white/10 hover:border-rose-400/50 text-[10px] text-slate-300 cursor-pointer whitespace-nowrap"
                  >
                    Slip (&gt; θ_c)
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({
                        ...prev,
                        inclineAngleDeg: 20,
                        inclineInitialVelocityMs: 5.0,
                      }));
                    }}
                    className={`py-1 px-1.5 rounded-lg border text-[10px] cursor-pointer whitespace-nowrap ${
                      params.inclineInitialVelocityMs > 0
                        ? 'bg-sky-400/20 border-sky-400 text-sky-200'
                        : 'bg-[#040d0a] border-white/10 text-slate-300'
                    }`}
                  >
                    Push Uphill
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Block Mass m</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.inclineMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={params.inclineMassKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, inclineMassKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Velocity v₀ (uphill)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      +{params.inclineInitialVelocityMs.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.5}
                    value={params.inclineInitialVelocityMs}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({
                        ...prev,
                        inclineInitialVelocityMs: Number(e.target.value),
                      }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (!isPlaying && simTimeS > 3.2) setSimTimeS(0);
                      setIsPlaying(v => !v);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Release Block'}
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset incline simulation"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE 3 CONTROLS: STACKED TWO-BLOCK RELATIVE MOTION LAB        */}
            {/* ============================================================= */}
            {params.mode === 'stacked_blocks' && (
              <div className="space-y-2.5">
                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Pull on Sled F_pull</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.stackPullForceN.toFixed(0)} N (F_slip={evaluation.stacked.slipThresholdPullN.toFixed(0)} N)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={1}
                    value={params.stackPullForceN}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, stackPullForceN: Number(e.target.value) }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, stackPullForceN: 24 }));
                    }}
                    className="py-1.5 px-2 rounded-lg bg-[#040d0a] border border-emerald-400/40 text-emerald-200 text-[10.5px] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Grip Together
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, stackPullForceN: 58 }));
                    }}
                    className="py-1.5 px-2 rounded-lg bg-[#040d0a] border border-rose-400/40 text-rose-200 text-[10.5px] font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Slip Top Block
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Sled m₁</span>
                      <span className="font-mono text-sky-300">{params.bottomMassKg} kg</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      step={1}
                      value={params.bottomMassKg}
                      onChange={e => {
                        setIsPlaying(false);
                        setSimTimeS(0);
                        setParams(prev => ({ ...prev, bottomMassKg: Number(e.target.value) }));
                      }}
                      className="w-full accent-sky-400"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Top m₂</span>
                      <span className="font-mono text-amber-300">{params.topMassKg} kg</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={0.5}
                      value={params.topMassKg}
                      onChange={e => {
                        setIsPlaying(false);
                        setSimTimeS(0);
                        setParams(prev => ({ ...prev, topMassKg: Number(e.target.value) }));
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Interface μ_s</span>
                      <span className="font-mono text-emerald-300">{params.topMuS.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={0.9}
                      step={0.05}
                      value={params.topMuS}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setParams(prev => ({
                          ...prev,
                          topMuS: v,
                          topMuK: Math.min(prev.topMuK, Number((v - 0.05).toFixed(2))),
                        }));
                      }}
                      className="w-full accent-emerald-400"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">Floor μ_k</span>
                      <span className="font-mono text-slate-300">{params.floorMuK.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.35}
                      step={0.05}
                      value={params.floorMuK}
                      onChange={e => setParams(prev => ({ ...prev, floorMuK: Number(e.target.value) }))}
                      className="w-full accent-slate-400"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (!isPlaying && simTimeS > 3.2) setSimTimeS(0);
                      setIsPlaying(v => !v);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause' : 'Pull Sled'}
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset stacked blocks"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* MODE 4 CONTROLS: AREA INDEPENDENCE VS MATERIAL DEPENDENCE     */}
            {/* ============================================================= */}
            {params.mode === 'area_surface_compare' && (
              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-300 font-medium">
                    Lane B (Narrow Edge) Surface Material
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {MATERIAL_ORDER.map(matId => {
                      const spec = FRICTION_MATERIALS[matId];
                      const active = params.compareLaneBMaterialId === matId;
                      return (
                        <button
                          key={matId}
                          onClick={() => {
                            setIsPlaying(false);
                            setSimTimeS(0);
                            setParams(prev => ({ ...prev, compareLaneBMaterialId: matId }));
                          }}
                          className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer truncate ${
                            active
                              ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                              : 'bg-[#040d0a] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {spec.shortName.split(' / ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Identical Pull Force F_pull</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.comparePullForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={70}
                    step={1}
                    value={params.comparePullForceN}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, comparePullForceN: Number(e.target.value) }));
                    }}
                    className="w-full accent-sky-400"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Identical Block Mass m</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.compareMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={params.compareMassKg}
                    onChange={e => {
                      setIsPlaying(false);
                      setSimTimeS(0);
                      setParams(prev => ({ ...prev, compareMassKg: Number(e.target.value) }));
                    }}
                    className="w-full accent-amber-400"
                  />
                </label>

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (!isPlaying && simTimeS > 3.2) setSimTimeS(0);
                      setIsPlaying(v => !v);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isPlaying ? 'Pause Race' : 'Run Side-by-Side Race'}
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Reset comparison race"
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

      {/* RIGHT FLOATING ANALYSIS DOCK (SKILLS 1.B, 2.A, 2.B, 3.A, 3.B) */}
      <Friction27AnalysisPanel
        params={params}
        evaluation={evaluation}
        labTrials={labTrials}
        onRecordTrial={handleRecordTrial}
        onResetTrials={() => setLabTrials(INITIAL_LAB_TRIALS_27)}
      />

      {/* BOTTOM STATUS & VECTOR COLOR LEGEND BAR */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[min(920px,calc(100vw-24px))] px-4 py-2 rounded-2xl bg-[#071510]/95 border border-emerald-500/25 shadow-2xl text-center">
        <div className="text-[11px] font-semibold text-white leading-snug">
          {evaluation.statusBanner}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 text-[10px] font-mono mt-1">
          <span className="text-sky-300">Applied Pull F_app</span>
          <span className="text-emerald-300">Normal Force F_N</span>
          <span className="text-amber-300">Weight F_g = mg</span>
          <span className="text-rose-300">Static Friction F_f,s</span>
          <span className="text-purple-300">Kinetic Friction F_f,k</span>
        </div>
      </div>

      {/* CED 2.7 COURSE REQUIREMENTS MODAL */}
      {showCedModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AP Physics C Topic 2.7 Course Requirements"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#071510] border border-emerald-500/35 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                  AP Physics C: Mechanics · Unit 2 · Course Framework V.1 | Pages 53–54
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Topic 2.7: Kinetic and Static Friction
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
                    2.7.A · KINETIC FRICTION
                  </span>
                  <MathFormula formulaKey="sim-friction27-kinetic" className="text-emerald-200 text-xs" />
                </div>
                <p className="leading-relaxed text-slate-300">
                  Occurs when two contacting surfaces move relative to each other (2.7.A.1), directed opposite the relative motion of each surface (2.7.A.1.i), and independent of contact surface area (2.7.A.1.ii). Magnitude equals |F_f,k| = |μ_k F_N| (2.7.A.2), where μ_k depends on material properties (2.7.A.2.i) and F_N is the perpendicular surface force directed away from the surface (2.7.A.2.ii).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-emerald-400">
                    2.7.B · STATIC FRICTION
                  </span>
                  <MathFormula formulaKey="sim-friction27-static" className="text-emerald-200 text-xs" />
                </div>
                <p className="leading-relaxed text-slate-300">
                  Occurs between contacting surfaces that are not moving relative to each other (2.7.B.1). Static friction adopts the exact value and direction required to prevent slipping, up to maximum F_f,s,max = μ_s F_N (2.7.B.2, 2.7.B.2.i–ii). Typically μ_s &gt; μ_k for a given pair of surfaces (2.7.B.3).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#040d0a] border border-emerald-500/20 space-y-1.5">
                <div className="font-mono font-bold text-emerald-400">
                  SUGGESTED SCIENCE PRACTICES (ALL 5 INTERACTIVE)
                </div>
                <p className="leading-relaxed text-slate-300">
                  1.B Quantitative graphs with scales, units &amp; plotted lab data · 2.A Symbolic derivation pathways · 2.B Quantitative calculation pathways with units · 3.A Experimental procedure design · 3.B Applying laws &amp; models to make claims.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <a
                href="/assets/aistudio/Topic_2.7_course_requirements_727bf673.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-300 hover:text-emerald-200 underline flex items-center gap-1.5"
              >
                Open Official Topic 2.7 Course Requirements PDF
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

export default Friction27Workbench;
