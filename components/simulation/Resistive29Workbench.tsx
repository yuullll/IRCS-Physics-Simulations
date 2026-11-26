'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  X,
  FileText,
  ArrowDown,
  MoveRight,
  Rocket,
  GitCompareArrows,
  Plus,
  Eye,
} from 'lucide-react';
import { MathFormula } from '@/components/ui/MathFormula';
import {
  DEFAULT_RESISTIVE_29_PARAMS,
  INITIAL_RESISTIVE_TRIALS_29,
  Resistive29Mode,
  Resistive29Params,
  ResistiveTrialPoint,
  evaluateResistive29,
  G_GRAVITY,
} from '@/lib/physics/resistive-2-9';
import { Resistive29Viewport } from './resistive29/Resistive29Viewport';
import {
  Resistive29AnalysisPanel,
  Resistive29Tab,
} from './resistive29/Resistive29AnalysisPanel';

interface Resistive29WorkbenchProps {
  externalViewMode?: '3d' | '2d';
}

export const Resistive29Workbench: React.FC<Resistive29WorkbenchProps> = ({
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Resistive29Params>(DEFAULT_RESISTIVE_29_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Resistive29Tab>('1B');
  const [showCedModal, setShowCedModal] = useState<boolean>(false);
  const [trials, setTrials] = useState<ResistiveTrialPoint[]>(INITIAL_RESISTIVE_TRIALS_29);

  const evaluation = useMemo(() => evaluateResistive29(params), [params]);
  const maxTimeRef = useRef<number>(evaluation.maxRecommendedTimeS);

  useEffect(() => {
    maxTimeRef.current = evaluation.maxRecommendedTimeS;
  }, [evaluation.maxRecommendedTimeS]);

  // Smooth real-time animation loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      setParams(prev => {
        const nextT = prev.timeS + dt;
        const limit = maxTimeRef.current;
        if (nextT >= limit) {
          setIsPlaying(false);
          return { ...prev, timeS: limit };
        }
        return { ...prev, timeS: nextT };
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleModeChange = (mode: Resistive29Mode) => {
    setIsPlaying(false);
    setParams(prev => {
      if (mode === 'vertical_drop') {
        return { ...prev, mode, v0: 0, timeS: 0 };
      }
      if (mode === 'horizontal_coast') {
        return { ...prev, mode, v0: 12, massKg: 2.0, dragK: 1.6, timeS: 0 };
      }
      if (mode === 'powered_thrust') {
        return { ...prev, mode, v0: 0, driveForceN: 18, massKg: 1.8, dragK: 1.5, timeS: 0 };
      }
      return {
        ...prev,
        mode: 'dual_compare',
        massKg: 1.5,
        dragK: 1.5,
        v0: 0,
        massBKg: 3.0,
        dragBK: 1.5,
        v0B: 0,
        timeS: 0,
      };
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    setParams(prev => ({ ...prev, timeS: 0 }));
  };

  const handlePlotCurrentTrial = () => {
    const p = evaluation.primary;
    const newTrial: ResistiveTrialPoint = {
      id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode: params.mode,
      timeS: Number(evaluation.timeS.toFixed(2)),
      velocityMs: Number(p.velocityMs.toFixed(2)),
      accelMs2: Number(p.accelMs2.toFixed(2)),
      positionM: Number(p.positionM.toFixed(2)),
      dragMagN: Number(p.dragMagN.toFixed(2)),
      massKg: p.massKg,
      dragK: p.dragK,
      label: `t = ${evaluation.timeS.toFixed(2)} s`,
    };
    setTrials(prev => [...prev, newTrial]);
    setActiveTab('1B');
  };

  const handleClearTrials = () => {
    setTrials(prev => prev.filter(tr => tr.mode !== params.mode));
  };

  const pA = evaluation.primary;
  const pB = evaluation.secondary;

  const modeButtons: Array<{
    id: Resistive29Mode;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'vertical_drop', label: 'Vertical Drop', icon: <ArrowDown className="w-3.5 h-3.5" /> },
    { id: 'horizontal_coast', label: 'Horiz. Coast', icon: <MoveRight className="w-3.5 h-3.5" /> },
    { id: 'powered_thrust', label: 'Thrust vs Drag', icon: <Rocket className="w-3.5 h-3.5" /> },
    { id: 'dual_compare', label: 'Dual Race (2.C)', icon: <GitCompareArrows className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040c0a] select-none">
      {/* Full-Bleed Three.js 3D/2D Viewport */}
      <Resistive29Viewport
        params={params}
        evaluation={evaluation}
        viewMode={externalViewMode}
      />

      {/* Top-Center AP Curriculum Badge */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-[#04100d]/92 border border-emerald-500/30 shadow-xl">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
          2.9 Resistive Forces
        </span>
        <span className="text-slate-600">·</span>
        <MathFormula formulaKey="sim-resistive29" className="text-emerald-200 text-xs" />
        <button
          type="button"
          onClick={() => setShowCedModal(true)}
          className="ml-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <BookOpen className="w-3 h-3" />
          <span>CED 2.9</span>
        </button>
      </div>

      {/* Left Floating Controls Dock */}
      <aside className="fixed left-3 top-[68px] z-20 w-[300px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        <div className="px-3.5 py-2.5 border-b border-emerald-500/20 bg-emerald-950/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Resistive Dynamics Controls
            </div>
            <div className="text-[11px] text-slate-300 font-semibold">
              Linear Drag F_r = −kv · ODE Lab
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
            {externalViewMode.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {/* Mode Selector (2x2) */}
          <div className="grid grid-cols-2 gap-1.5">
            {modeButtons.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeChange(m.id)}
                className={`px-2 py-1.5 rounded-xl border text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  params.mode === m.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                    : 'bg-slate-950/70 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Playback + Time Scrubber */}
          <div className="rounded-xl bg-slate-950/80 border border-emerald-500/20 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!isPlaying && params.timeS >= evaluation.maxRecommendedTimeS - 0.05) {
                    setParams(prev => ({ ...prev, timeS: 0 }));
                  }
                  setIsPlaying(p => !p);
                }}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handlePlotCurrentTrial}
                className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                title="Plot current time & speed on Skill 1.B graph"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Plot</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title="Reset time to t = 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className="text-slate-400">Time t</span>
                <span className="text-emerald-300 font-bold">
                  {evaluation.timeS.toFixed(2)} s ({(evaluation.timeS / pA.tauS).toFixed(2)}τ)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={evaluation.maxRecommendedTimeS}
                step={0.05}
                value={Math.min(params.timeS, evaluation.maxRecommendedTimeS)}
                onChange={e => {
                  setIsPlaying(false);
                  setParams(prev => ({ ...prev, timeS: parseFloat(e.target.value) }));
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { label: 't=0', val: 0 },
                  { label: '1τ', val: pA.tauS },
                  { label: '2τ', val: pA.tauS * 2 },
                  { label: '4τ', val: Math.min(pA.tauS * 4, evaluation.maxRecommendedTimeS) },
                ].map(jump => (
                  <button
                    key={jump.label}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setParams(prev => ({ ...prev, timeS: Number(jump.val.toFixed(2)) }));
                    }}
                    className="py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-[9.5px] font-mono text-slate-300 hover:text-emerald-200 cursor-pointer"
                  >
                    {jump.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mode-Specific AP Quick Presets */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              AP Scenario Presets
            </div>
            {params.mode === 'vertical_drop' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, v0: 0, timeS: 0 }));
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[10px] font-semibold text-slate-200 cursor-pointer"
                >
                  Drop (v₀=0)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    const vt = (params.massKg * G_GRAVITY) / params.dragK;
                    setParams(prev => ({
                      ...prev,
                      v0: Number(Math.min(25, vt * 1.9).toFixed(1)),
                      timeS: 0,
                    }));
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-500/20 border border-white/10 text-[10px] font-semibold text-rose-200 cursor-pointer"
                >
                  Fast (v₀&gt;v_T)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    const vt = (params.massKg * G_GRAVITY) / params.dragK;
                    setParams(prev => ({
                      ...prev,
                      v0: Number(Math.min(25, vt).toFixed(2)),
                      timeS: 0,
                    }));
                  }}
                  className="py-1 px-1.5 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[10px] font-semibold text-emerald-300 cursor-pointer"
                >
                  At v_T
                </button>
              </div>
            )}

            {params.mode === 'horizontal_coast' && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, massKg: 1.2, dragK: 2.4, v0: 14, timeS: 0 }));
                  }}
                  className="py-1 px-2 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[10px] font-semibold text-slate-200 cursor-pointer"
                >
                  High Drag (Short x_max)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, massKg: 3.0, dragK: 1.0, v0: 12, timeS: 0 }));
                  }}
                  className="py-1 px-2 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[10px] font-semibold text-slate-200 cursor-pointer"
                >
                  Heavy Glider (Long τ)
                </button>
              </div>
            )}

            {params.mode === 'powered_thrust' && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, driveForceN: 18, dragK: 1.5, v0: 0, timeS: 0 }));
                  }}
                  className="py-1 px-2 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[10px] font-semibold text-slate-200 cursor-pointer"
                >
                  Launch From Rest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, driveForceN: 15, dragK: 1.5, v0: 20, timeS: 0 }));
                  }}
                  className="py-1 px-2 rounded-lg bg-slate-950/80 hover:bg-rose-500/20 border border-white/10 text-[10px] font-semibold text-rose-200 cursor-pointer"
                >
                  Over-Speed (v₀&gt;v_T)
                </button>
              </div>
            )}

            {params.mode === 'dual_compare' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({
                      ...prev,
                      massKg: 1.5,
                      dragK: 1.5,
                      massBKg: 3.0,
                      dragBK: 1.5,
                      v0: 0,
                      v0B: 0,
                      timeS: 0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-white/10 text-[9.5px] font-semibold text-slate-200 cursor-pointer"
                >
                  2× Mass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({
                      ...prev,
                      massKg: 2.0,
                      dragK: 1.5,
                      massBKg: 2.0,
                      dragBK: 3.0,
                      v0: 0,
                      v0B: 0,
                      timeS: 0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-amber-500/20 border border-white/10 text-[9.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  2× Drag k
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({
                      ...prev,
                      massKg: 1.5,
                      dragK: 1.5,
                      massBKg: 3.0,
                      dragBK: 3.0,
                      v0: 0,
                      v0B: 0,
                      timeS: 0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-sky-500/20 border border-white/10 text-[9.5px] font-semibold text-sky-200 cursor-pointer"
                >
                  2m &amp; 2k
                </button>
              </div>
            )}
          </div>

          {/* Physical Parameter Sliders */}
          <div className="rounded-xl bg-slate-950/75 border border-white/10 p-2.5 space-y-2.5">
            {/* Mass A */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10.5px] font-mono">
                <span className="text-slate-300">
                  {params.mode === 'dual_compare' ? 'Lane A Mass m_A' : 'Object Mass m'}
                </span>
                <span className="text-emerald-300 font-bold">{params.massKg.toFixed(1)} kg</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={5.0}
                step={0.1}
                value={params.massKg}
                onChange={e =>
                  setParams(prev => ({ ...prev, massKg: parseFloat(e.target.value) }))
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Drag k A */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10.5px] font-mono">
                <span className="text-slate-300">
                  {params.mode === 'dual_compare' ? 'Lane A Drag k_A' : 'Linear Drag Coeff. k'}
                </span>
                <span className="text-rose-300 font-bold">{params.dragK.toFixed(1)} kg/s</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={6.0}
                step={0.1}
                value={params.dragK}
                onChange={e =>
                  setParams(prev => ({ ...prev, dragK: parseFloat(e.target.value) }))
                }
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            {/* Initial Speed v0 (non-dual modes) */}
            {params.mode !== 'dual_compare' && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10.5px] font-mono">
                  <span className="text-slate-300">Initial Speed v₀</span>
                  <span className="text-sky-300 font-bold">{params.v0.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min={params.mode === 'horizontal_coast' ? 1 : 0}
                  max={25}
                  step={0.5}
                  value={params.v0}
                  onChange={e =>
                    setParams(prev => ({ ...prev, v0: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            )}

            {/* Constant Drive Force (powered_thrust) */}
            {params.mode === 'powered_thrust' && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10.5px] font-mono">
                  <span className="text-slate-300">Constant Thrust F_drive</span>
                  <span className="text-amber-300 font-bold">
                    {params.driveForceN.toFixed(1)} N
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={1}
                  value={params.driveForceN}
                  onChange={e =>
                    setParams(prev => ({ ...prev, driveForceN: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}

            {/* Lane B controls (dual_compare) */}
            {params.mode === 'dual_compare' && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-amber-200">Lane B Mass m_B</span>
                    <span className="text-amber-300 font-bold">{params.massBKg.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={5.0}
                    step={0.1}
                    value={params.massBKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, massBKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-amber-200">Lane B Drag k_B</span>
                    <span className="text-amber-300 font-bold">{params.dragBK.toFixed(1)} kg/s</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    value={params.dragBK}
                    onChange={e =>
                      setParams(prev => ({ ...prev, dragBK: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Numeric Telemetry Grid */}
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
              <div className="text-[9px] text-slate-400">SPEED v(t)</div>
              <div className="text-sky-300 font-bold text-xs">
                {pA.velocityMs.toFixed(2)} m/s
              </div>
              {pB && (
                <div className="text-[9.5px] text-amber-300">B: {pB.velocityMs.toFixed(2)} m/s</div>
              )}
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
              <div className="text-[9px] text-slate-400">
                {pA.xMaxAsymptote !== null ? 'STOP ASYMPTOTE' : 'TERMINAL v_T'}
              </div>
              <div className="text-emerald-300 font-bold text-xs">
                {pA.xMaxAsymptote !== null
                  ? `${pA.xMaxAsymptote.toFixed(2)} m`
                  : `${pA.vTerminal.toFixed(2)} m/s`}
              </div>
              {pB && (
                <div className="text-[9.5px] text-amber-300">B: {pB.vTerminal.toFixed(2)} m/s</div>
              )}
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
              <div className="text-[9px] text-slate-400">ACCEL a(t)</div>
              <div className="text-white font-bold text-xs">{pA.accelMs2.toFixed(2)} m/s²</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
              <div className="text-[9px] text-slate-400">TIME CONST. τ=m/k</div>
              <div className="text-emerald-200 font-bold text-xs">{pA.tauS.toFixed(2)} s</div>
            </div>
          </div>

          {/* Visual Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setParams(prev => ({ ...prev, showForceVectors: !prev.showForceVectors }))
              }
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showForceVectors
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-950/70 border-white/10 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Vectors</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setParams(prev => ({ ...prev, showAsymptotes: !prev.showAsymptotes }))
              }
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showAsymptotes
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-950/70 border-white/10 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Asymptotes</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Right Floating Analysis Panel (Skills 1.B, 2.A, 2.C, 3.A, 3.C) */}
      <Resistive29AnalysisPanel
        params={params}
        evaluation={evaluation}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        trials={trials}
        onPlotCurrentTrial={handlePlotCurrentTrial}
        onClearTrials={handleClearTrials}
        onSwitchToDualCompare={() => handleModeChange('dual_compare')}
      />

      {/* Bottom Status & Vector Legend Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[640px] px-4 py-2 rounded-2xl bg-[#04100d]/92 border border-emerald-500/25 shadow-xl flex flex-col items-center gap-1">
        <div className="text-[11px] text-slate-200 text-center leading-tight line-clamp-2">
          {evaluation.keyInsight}
        </div>
        <div className="flex items-center flex-wrap justify-center gap-3 text-[10px] font-mono text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>{params.mode === 'powered_thrust' ? 'F_drive' : 'Fg = mg'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Fr = −kv</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>F_net / Asymptote</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>v(t)</span>
          </span>
        </div>
      </div>

      {/* Official AP CED Topic 2.9 Modal */}
      {showCedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#05120e] border border-emerald-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
            <div className="px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/35 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  AP Physics C: Mechanics · Unit 2 Course Framework (CED Page 57)
                </div>
                <h2 className="text-base font-bold text-white">
                  Topic 2.9: Resistive Forces — Official Requirements
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCedModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/25 space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Learning Objective 2.9.A
                </div>
                <p className="text-slate-100 font-medium">
                  Describe the motion of an object subject to a resistive force.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <MathFormula formulaKey="sim-resistive29-ode" className="text-emerald-200 text-xs" />
                  <MathFormula formulaKey="sim-resistive29-exp" className="text-sky-200 text-xs" />
                  <MathFormula formulaKey="sim-resistive29-vt" className="text-amber-200 text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Essential Knowledge (2.9.A.1 – 2.9.A.3)
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">2.9.A.1:</strong> A resistive force
                  is a velocity-dependent force in the opposite direction of an object&apos;s
                  velocity (e.g., F_r = −kv).
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div>
                    <strong className="text-emerald-300 font-mono">2.9.A.2:</strong> Applying
                    Newton&apos;s second law to an object with a resistive force yields a differential
                    equation for velocity.
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.9.A.2.i:</strong> Use separation of variables with proper limits of
                    integration to derive v(t).
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.9.A.2.ii:</strong> Derive acceleration a(t) = dv/dt and position
                    x(t) = ∫ v(t) dt using initial conditions and calculus.
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.9.A.2.iii:</strong> Under F_r = −kv, position, velocity, and
                    acceleration are exponential functions with asymptotes set by initial conditions
                    and applied forces.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">2.9.A.3:</strong> Terminal
                  velocity v_T is the maximum speed reached under a constant driving force and
                  opposing resistive force, occurring when F_net = 0 (a = 0).
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-200">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Official Course Framework PDF (Topic 2.9, Page 57)</span>
                </div>
                <a
                  href="/assets/aistudio/Topic_2.9_course_requirements_9a299f64.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shrink-0 transition"
                >
                  Open PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
