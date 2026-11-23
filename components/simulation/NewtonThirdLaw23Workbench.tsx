'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ExternalLink,
  GitFork,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import {
  ActionReactionPreset,
  Newton23Mode,
  Newton23Params,
  Newton23Record,
  PulleyPreset,
  StringOrientation,
  createDefaultNewton23Params,
  evaluateNewton23,
} from '@/lib/physics/newton-third-law-2-3';
import { Newton23Viewport } from './newton23/Newton23Viewport';
import { Newton23AnalysisPanel } from './newton23/Newton23AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface NewtonThirdLaw23WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Newton23Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'action_reaction',
    label: 'Paired Forces',
    sub: 'F_A on B = -F_B on A',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
  },
  {
    id: 'internal_com',
    label: 'Internal & COM',
    sub: 'System {A+B} Proof',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    id: 'string_tension',
    label: 'String Tension',
    sub: 'Ideal vs Massive Rope',
    icon: <GitFork className="w-3.5 h-3.5" />,
  },
  {
    id: 'ideal_pulley',
    label: 'Ideal Pulley',
    sub: 'Atwood T_A vs T_B',
    icon: <CircleDot className="w-3.5 h-3.5" />,
  },
];

export const NewtonThirdLaw23Workbench: React.FC<NewtonThirdLaw23WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Newton23Params>(() =>
    createDefaultNewton23Params('action_reaction')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<Newton23Record[]>([]);

  const evaluation = useMemo(() => evaluateNewton23(params), [params]);

  // Smooth playback loop for motion demos (push, push-off, spring COM oscillation, pulley rotation)
  useEffect(() => {
    if (!isPlaying) return;
    let active = true;
    let rafId = 0;
    let lastTs = performance.now();
    const step = (ts: number) => {
      if (!active) return;
      const dt = Math.min(0.05, (ts - lastTs) * 0.001);
      lastTs = ts;
      setParams(prev => {
        const loopMax = prev.mode === 'internal_com' ? 4.2 : 2.2;
        const nextT = prev.simTimeS + dt * 0.9;
        return { ...prev, simTimeS: nextT > loopMax ? 0 : nextT };
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const handleModeChange = useCallback((mode: Newton23Mode) => {
    setIsPlaying(false);
    setParams(createDefaultNewton23Params(mode));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setParams(prev => createDefaultNewton23Params(prev.mode));
  }, []);

  const handleRecordTrial = useCallback(() => {
    const id = `trial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let rec: Newton23Record;
    if (params.mode === 'action_reaction') {
      rec = {
        id,
        modeLabel: 'Paired Forces',
        setupSummary: `${params.arPreset.replace('_', ' ')} · mA=${params.massA}kg, mB=${params.massB}kg`,
        qtyALabel: '|F_B on A|',
        qtyAValue: `${evaluation.pairMagBonA.toFixed(1)} N`,
        qtyBLabel: '|F_A on B|',
        qtyBValue: `${evaluation.pairMagAonB.toFixed(1)} N`,
        keyResult: `a_A=${evaluation.accelA_x.toFixed(2)}, a_B=${evaluation.accelB_x.toFixed(2)} m/s²`,
      };
    } else if (params.mode === 'internal_com') {
      rec = {
        id,
        modeLabel: 'Internal & COM',
        setupSummary: `F_int=${params.internalForceAmpN}N, F_ext=${params.externalForceN}N`,
        qtyALabel: 'ΣF_int',
        qtyAValue: '0.0 N',
        qtyBLabel: 'a_cm',
        qtyBValue: `${evaluation.accelCom_x.toFixed(2)} m/s²`,
        keyResult: `COM depends solely on F_ext / (m_A + m_B)`,
      };
    } else if (params.mode === 'string_tension') {
      rec = {
        id,
        modeLabel: 'String Tension',
        setupSummary: `m_load=${params.loadMassKg}kg, m_rope=${params.ropeMassKg}kg`,
        qtyALabel: 'T_load',
        qtyAValue: `${evaluation.tensionBottomN.toFixed(1)} N`,
        qtyBLabel: 'T_pull/top',
        qtyBValue: `${evaluation.tensionTopN.toFixed(1)} N`,
        keyResult: evaluation.isTensionUniform
          ? 'Ideal: T uniform (ΔT = 0 N)'
          : `Massive: ΔT = +${evaluation.tensionDeltaN.toFixed(1)} N`,
      };
    } else {
      rec = {
        id,
        modeLabel: 'Pulley Lab',
        setupSummary: `${params.isIdealPulley ? 'Ideal' : `Real ${params.pulleyWheelMassKg}kg`} · ${params.pulleyMassA}/${params.pulleyMassB}kg`,
        qtyALabel: 'T_A',
        qtyAValue: `${evaluation.pulleyTensionAN.toFixed(1)} N`,
        qtyBLabel: 'T_B',
        qtyBValue: `${evaluation.pulleyTensionBN.toFixed(1)} N`,
        keyResult: evaluation.isTensionUniform
          ? `Ideal: T_A = T_B (a=${evaluation.pulleyAccelMs2.toFixed(2)} m/s²)`
          : `Real: ΔT = ${evaluation.pulleyTensionDiffN.toFixed(1)} N (a=${evaluation.pulleyAccelMs2.toFixed(2)} m/s²)`,
      };
    }
    setRecords(prev => [rec, ...prev].slice(0, 12));
    onToast?.('Trial recorded in 2.C Comparison Log');
  }, [params, evaluation, onToast]);

  const activeTitle =
    params.mode === 'action_reaction'
      ? 'Newton’s Third Law: Paired Forces'
      : params.mode === 'internal_com'
      ? 'Internal Forces & System COM'
      : params.mode === 'string_tension'
      ? 'Micro-Segment String Tension'
      : 'Ideal vs. Real Pulley Lab';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-SCREEN 3D/2D WEBGL VIEWPORT */}
      <Newton23Viewport params={params} evaluation={evaluation} viewMode={externalViewMode} />

      {/* ===================================================================== */}
      {/* TOP CENTER HUD BANNER (Positioned cleanly below global top pods)      */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed top-[76px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center max-w-[620px]">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#061410]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-1.5 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[9.5px] font-mono text-emerald-400 tracking-wide whitespace-nowrap">
              UNIT 2 · TOPIC 2.3 · NEWTON’S THIRD LAW
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-bold text-white tracking-tight whitespace-nowrap">
                {activeTitle}
              </h1>
              <span className="text-slate-600">·</span>
              <MathFormula formulaKey="sim-newton23" className="text-emerald-300 text-[11.5px] shrink-0" />
            </div>
          </div>

          <button
            onClick={() => setIsCedOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CED 2.3</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEFT PARAMETER & MODE CONTROL DOCK                                    */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 2.3 Controls"
        className="absolute top-20 left-4 z-20 w-[322px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Third-Law Lab Controls
            </span>
          </div>
          <button
            onClick={() => setIsLeftCollapsed(v => !v)}
            aria-label={isLeftCollapsed ? 'Expand controls panel' : 'Collapse controls panel'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isLeftCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
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
            {/* MODE 1 CONTROLS: ACTION-REACTION PAIRED FORCES (2.3.A.1)        */}
            {/* =============================================================== */}
            {params.mode === 'action_reaction' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10.5px] font-semibold text-emerald-300">
                    Interaction Scenario (EK 2.3.A.1)
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'contact_push', label: 'Push Blocks' },
                        { id: 'ice_pushoff', label: 'Ice Push-Off' },
                        { id: 'book_earth', label: 'Book & Earth' },
                      ] as { id: ActionReactionPreset; label: string }[]
                    ).map(pr => (
                      <button
                        key={pr.id}
                        onClick={() => {
                          setIsPlaying(false);
                          setParams(p => ({ ...p, arPreset: pr.id, simTimeS: 0 }));
                        }}
                        className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                          params.arPreset === pr.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-[#040d0a] border-emerald-500/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mass A */}
                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">
                      {params.arPreset === 'book_earth' ? 'Book Mass (m_A)' : 'Mass of Object A (m_A)'}
                    </span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.massA.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={0.5}
                    value={params.massA}
                    onChange={e =>
                      setParams(p => ({ ...p, massA: Number(e.target.value), simTimeS: 0 }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                {params.arPreset !== 'book_earth' && (
                  <>
                    {/* Mass B */}
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Mass of Object B (m_B)</span>
                        <span className="font-mono font-bold text-sky-300 tabular-nums">
                          {params.massB.toFixed(1)} kg
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={params.massB}
                        onChange={e =>
                          setParams(p => ({ ...p, massB: Number(e.target.value), simTimeS: 0 }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </label>

                    {/* Push / Push-Off Force */}
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">
                          {params.arPreset === 'contact_push'
                            ? 'External Push Force (F_push)'
                            : 'Internal Push-Off Force (F_int)'}
                        </span>
                        <span className="font-mono font-bold text-rose-300 tabular-nums">
                          {params.appliedForceN.toFixed(0)} N
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={80}
                        step={2}
                        value={params.appliedForceN}
                        onChange={e =>
                          setParams(p => ({
                            ...p,
                            appliedForceN: Number(e.target.value),
                            simTimeS: 0,
                          }))
                        }
                        className="w-full accent-rose-400 cursor-pointer"
                      />
                    </label>
                  </>
                )}

                <button
                  onClick={() =>
                    setParams(p => ({ ...p, highlightThirdLawPair: !p.highlightThirdLawPair }))
                  }
                  className={`w-full py-1.5 px-3 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                    params.highlightThirdLawPair
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                      : 'bg-[#040d0a] border-emerald-500/20 text-slate-300 hover:text-white'
                  }`}
                >
                  {params.highlightThirdLawPair
                    ? '3rd-Law Pair Linker Highlighted ✓'
                    : 'Highlight 3rd-Law Pair Linker'}
                </button>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 2 CONTROLS: INTERNAL FORCES & SYSTEM COM (2.3.A.2)         */}
            {/* =============================================================== */}
            {params.mode === 'internal_com' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setParams(p => ({ ...p, showSystemBoundary: true }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      params.showSystemBoundary
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    System &#123;A+B&#125;
                  </button>
                  <button
                    onClick={() => setParams(p => ({ ...p, showSystemBoundary: false }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      !params.showSystemBoundary
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Isolated Carts
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Internal Spring Force Amp.</span>
                    <span className="font-mono font-bold text-rose-300 tabular-nums">
                      {params.internalForceAmpN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={2}
                    value={params.internalForceAmpN}
                    onChange={e =>
                      setParams(p => ({ ...p, internalForceAmpN: Number(e.target.value) }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">External Force (F_ext on System)</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.externalForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={2}
                    value={params.externalForceN}
                    onChange={e =>
                      setParams(p => ({
                        ...p,
                        externalForceN: Number(e.target.value),
                        simTimeS: 0,
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">m_A</span>
                      <span className="font-mono text-emerald-300">{params.massA.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={params.massA}
                      onChange={e => setParams(p => ({ ...p, massA: Number(e.target.value) }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">m_B</span>
                      <span className="font-mono text-sky-300">{params.massB.toFixed(1)} kg</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={params.massB}
                      onChange={e => setParams(p => ({ ...p, massB: Number(e.target.value) }))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 3 CONTROLS: STRING TENSION (2.3.A.3, 2.3.A.3.i–iii)        */}
            {/* =============================================================== */}
            {params.mode === 'string_tension' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'vertical_hanging', label: 'Vertical Hanging' },
                      { id: 'horizontal_pull', label: 'Horizontal Pull' },
                    ] as { id: StringOrientation; label: string }[]
                  ).map(o => (
                    <button
                      key={o.id}
                      onClick={() => setParams(p => ({ ...p, stringOrientation: o.id }))}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                        params.stringOrientation === o.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Quick Ideal vs Massive Rope Toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setParams(p => ({ ...p, ropeMassKg: 0 }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      params.ropeMassKg === 0
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Ideal String (0 kg)
                  </button>
                  <button
                    onClick={() =>
                      setParams(p => ({ ...p, ropeMassKg: p.ropeMassKg > 0 ? p.ropeMassKg : 3.0 }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      params.ropeMassKg > 0
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Massive Rope (&gt;0 kg)
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Rope Mass (m_rope)</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {params.ropeMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.5}
                    value={params.ropeMassKg}
                    onChange={e => setParams(p => ({ ...p, ropeMassKg: Number(e.target.value) }))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Load Block Mass (m_load)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.loadMassKg.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={params.loadMassKg}
                    onChange={e => setParams(p => ({ ...p, loadMassKg: Number(e.target.value) }))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>

                {params.stringOrientation === 'vertical_hanging' ? (
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Hoist Vertical Accel (a_y)</span>
                      <span className="font-mono font-bold text-emerald-300 tabular-nums">
                        {params.verticalAccelMs2 >= 0 ? '+' : ''}
                        {params.verticalAccelMs2.toFixed(1)} m/s²
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-4}
                      max={6}
                      step={0.5}
                      value={params.verticalAccelMs2}
                      onChange={e =>
                        setParams(p => ({ ...p, verticalAccelMs2: Number(e.target.value) }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </label>
                ) : (
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">Horizontal Pull Force (F_pull)</span>
                      <span className="font-mono font-bold text-rose-300 tabular-nums">
                        {params.horizontalPullN.toFixed(0)} N
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={2}
                      value={params.horizontalPullN}
                      onChange={e =>
                        setParams(p => ({ ...p, horizontalPullN: Number(e.target.value) }))
                      }
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </label>
                )}

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Inspect Micro-Segment dm_k</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      Segment #{params.probeSegmentIndex + 1} / {params.segmentCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={params.segmentCount - 1}
                    step={1}
                    value={params.probeSegmentIndex}
                    onChange={e =>
                      setParams(p => ({ ...p, probeSegmentIndex: Number(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 4 CONTROLS: IDEAL VS REAL PULLEY (2.3.A.3.iv)              */}
            {/* =============================================================== */}
            {params.mode === 'ideal_pulley' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'atwood', label: 'Atwood Machine' },
                      { id: 'modified_atwood', label: 'Table Pulley' },
                    ] as { id: PulleyPreset; label: string }[]
                  ).map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(p => ({ ...p, pulleyPreset: pr.id, simTimeS: 0 }));
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                        params.pulleyPreset === pr.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                {/* Ideal vs Non-Ideal Pulley Toggle (EK 2.3.A.3.iv) */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setParams(p => ({ ...p, isIdealPulley: true, simTimeS: 0 }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      params.isIdealPulley
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Ideal Pulley ✓
                  </button>
                  <button
                    onClick={() => setParams(p => ({ ...p, isIdealPulley: false, simTimeS: 0 }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      !params.isIdealPulley
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Real Pulley (m_p, τ_f)
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Mass A (m_A)</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.pulleyMassA.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={params.pulleyMassA}
                    onChange={e =>
                      setParams(p => ({ ...p, pulleyMassA: Number(e.target.value), simTimeS: 0 }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Mass B (m_B)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.pulleyMassB.toFixed(1)} kg
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={params.pulleyMassB}
                    onChange={e =>
                      setParams(p => ({ ...p, pulleyMassB: Number(e.target.value), simTimeS: 0 }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>

                {!params.isIdealPulley && (
                  <div className="space-y-2.5 pt-1 border-t border-emerald-500/15">
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Pulley Rim Mass (m_p)</span>
                        <span className="font-mono font-bold text-amber-300 tabular-nums">
                          {params.pulleyWheelMassKg.toFixed(1)} kg
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={params.pulleyWheelMassKg}
                        onChange={e =>
                          setParams(p => ({
                            ...p,
                            pulleyWheelMassKg: Number(e.target.value),
                            simTimeS: 0,
                          }))
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </label>
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Axle Friction Torque (τ_f)</span>
                        <span className="font-mono font-bold text-rose-300 tabular-nums">
                          {params.pulleyFrictionTorqueNm.toFixed(1)} N·m
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.5}
                        step={0.1}
                        value={params.pulleyFrictionTorqueNm}
                        onChange={e =>
                          setParams(p => ({
                            ...p,
                            pulleyFrictionTorqueNm: Number(e.target.value),
                            simTimeS: 0,
                          }))
                        }
                        className="w-full accent-rose-400 cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Playback & Reset Controls */}
            <div className="flex items-center gap-2 pt-1">
              {!(params.mode === 'action_reaction' && params.arPreset === 'book_earth') &&
                params.mode !== 'string_tension' && (
                  <button
                    onClick={() => setIsPlaying(v => !v)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pause Motion' : 'Play Motion'}</span>
                  </button>
                )}
              <button
                onClick={handleReset}
                aria-label="Reset Topic 2.3 parameters"
                className={`${
                  params.mode === 'string_tension' ||
                  (params.mode === 'action_reaction' && params.arPreset === 'book_earth')
                    ? 'flex-1 py-2 px-3 justify-center gap-1.5 text-xs font-semibold'
                    : 'p-2'
                } rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition cursor-pointer flex items-center`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {(params.mode === 'string_tension' ||
                  (params.mode === 'action_reaction' && params.arPreset === 'book_earth')) && (
                  <span>Reset Defaults</span>
                )}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT AP SKILLS ANALYSIS DOCK                                         */}
      {/* ===================================================================== */}
      <Newton23AnalysisPanel
        params={params}
        evaluation={evaluation}
        records={records}
        onRecordTrial={handleRecordTrial}
        onClearRecords={() => setRecords([])}
      />

      {/* ===================================================================== */}
      {/* BOTTOM COMPACT LEGEND BAR                                             */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[680px]">
        <div className="bg-[#061410]/95 border border-emerald-500/25 rounded-xl px-4 py-1.5 text-center shadow-xl">
          <div className="text-[11px] font-semibold text-slate-100 truncate">
            {evaluation.headlineSummary}
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-slate-400 mt-0.5">
            <span className="text-rose-300">F_A on B = -F_B on A (3rd Law Pair)</span>
            <span className="text-emerald-300">External / Upper Tension</span>
            <span className="text-sky-300">Normal / Lower Tension</span>
            <span className="text-amber-300">System COM / Gravity</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CED 2.3 COURSE REQUIREMENTS MODAL                                     */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AP Physics C Topic 2.3 Newton's Third Law Requirements"
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#061410] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-xs text-slate-200"
          >
            <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono text-emerald-400">
                  AP Physics C: Mechanics · Unit 2: Force and Translational Dynamics
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 2.3: Newton’s Third Law
                </h3>
              </div>
              <button
                onClick={() => setIsCedOpen(false)}
                aria-label="Close Topic 2.3 course requirements"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="font-bold text-emerald-300">
                LO 2.3.A — Describe the interaction of two objects or systems using Newton’s third
                law and a representation of paired forces exerted on each object or system
              </div>
              <p>
                <strong>2.3.A.1:</strong> Newton’s third law describes the interaction of two
                objects or systems in terms of the paired forces that each exerts on the other:{' '}
                <MathFormula formulaKey="sim-newton23" className="text-emerald-300 ml-1" />
              </p>
              <p>
                <strong>2.3.A.2:</strong> Interactions between objects within a system (internal
                forces) do not influence the motion of a system’s center of mass.
              </p>
            </div>

            <div className="space-y-2 bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="font-bold text-emerald-300">
                EK 2.3.A.3 — Tension, Ideal vs. Massive Strings, and Ideal Pulleys
              </div>
              <p>
                <strong>2.3.A.3:</strong> Tension is the macroscopic net result of forces that
                infinitesimal segments of a string, cable, chain, or similar system exert on each
                other in response to an external force.
              </p>
              <p>
                <strong>2.3.A.3.i:</strong> An ideal string has negligible mass and does not stretch
                when under tension.
              </p>
              <p>
                <strong>2.3.A.3.ii:</strong> The tension in an ideal string is the same at all
                points within the string.
              </p>
              <p>
                <strong>2.3.A.3.iii:</strong> In a string with nonnegligible mass, tension may not
                be the same at all points within the string.
              </p>
              <p>
                <strong>2.3.A.3.iv:</strong> An ideal pulley is a pulley that has negligible mass
                and rotates about an axle through its center of mass with negligible friction.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <span className="font-mono text-[10.5px] text-slate-400">
                Suggested Skills: 1.A · 2.C · 3.B · 3.C
              </span>
              <a
                href="/assets/aistudio/Topic_2.3_course_requirements_e33929a0.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Official Topic 2.3 PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewtonThirdLaw23Workbench;
