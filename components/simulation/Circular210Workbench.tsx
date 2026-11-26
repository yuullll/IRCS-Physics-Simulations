'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  X,
  FileText,
  RefreshCw,
  Compass,
  Triangle,
  Orbit,
  Plus,
  Eye,
} from 'lucide-react';
import { MathFormula } from '@/components/ui/MathFormula';
import {
  Circular210Mode,
  Circular210Params,
  CircularTrialPoint,
  DEFAULT_CIRCULAR_210_PARAMS,
  G_GRAVITY,
  INITIAL_CIRCULAR_TRIALS_210,
  R_EARTH,
  clamp,
  evaluateCircular210,
} from '@/lib/physics/circular-motion-2-10';
import { Circular210Viewport } from './circular210/Circular210Viewport';
import {
  Circular210AnalysisPanel,
  Circular210Tab,
} from './circular210/Circular210AnalysisPanel';

interface Circular210WorkbenchProps {
  externalViewMode?: '3d' | '2d';
}

export const Circular210Workbench: React.FC<Circular210WorkbenchProps> = ({
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Circular210Params>(DEFAULT_CIRCULAR_210_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Circular210Tab>('1A');
  const [showCedModal, setShowCedModal] = useState<boolean>(false);
  const [trials, setTrials] = useState<CircularTrialPoint[]>(INITIAL_CIRCULAR_TRIALS_210);

  const evaluation = useMemo(() => evaluateCircular210(params), [params]);

  // Smooth real-time animation loop across all 4 circular motion apparatuses
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      setParams(prev => {
        if (prev.mode === 'vertical_loop') {
          let nextV = prev.speedMs;
          if (Math.abs(prev.tangentialAccelMs2) > 1e-4) {
            nextV = clamp(prev.speedMs + prev.tangentialAccelMs2 * dt * 0.45, 1.5, 16.0);
          }
          const omegaDegS = ((nextV / Math.max(0.5, prev.radiusM)) * 180) / Math.PI;
          const nextAngle = (prev.loopAngleDeg + omegaDegS * dt * 0.7) % 360;
          return { ...prev, speedMs: nextV, loopAngleDeg: nextAngle };
        }

        if (prev.mode === 'banked_curve') {
          const roadR = Math.max(5, prev.radiusM * 5);
          const omega = prev.speedMs / roadR;
          return {
            ...prev,
            phaseRad: (prev.phaseRad + omega * dt * 2.2) % (Math.PI * 2),
          };
        }

        if (prev.mode === 'conical_pendulum') {
          const h = Math.max(0.2, prev.pendulumLengthM * Math.cos((prev.coneAngleDeg * Math.PI) / 180));
          const omega = Math.sqrt(G_GRAVITY / h);
          return {
            ...prev,
            phaseRad: (prev.phaseRad + omega * dt * 0.9) % (Math.PI * 2),
          };
        }

        // kepler_orbit: exact relative Kepler angular speed ω ∝ √M / R^(3/2)
        const baseOmega = 1.65 * Math.sqrt(prev.centralMassEarth);
        const omegaA = baseOmega / Math.pow(prev.orbitRadiusEarth, 1.5);
        const omegaB = baseOmega / Math.pow(prev.orbitRadiusBEarth, 1.5);
        return {
          ...prev,
          phaseRad: (prev.phaseRad + omegaA * dt) % (Math.PI * 2),
          phaseBRad: (prev.phaseBRad + omegaB * dt) % (Math.PI * 2),
        };
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleModeChange = (mode: Circular210Mode) => {
    setParams(prev => {
      if (mode === 'vertical_loop') {
        return {
          ...prev,
          mode,
          radiusM: 4.0,
          speedMs: 8.0,
          loopAngleDeg: 90,
          tangentialAccelMs2: 0,
        };
      }
      if (mode === 'banked_curve') {
        // Start right at ideal frictionless design speed and front cross-section phase = 0
        const roadR = Math.max(5, prev.radiusM * 5);
        const vIdeal = Math.sqrt(G_GRAVITY * roadR * Math.tan((25 * Math.PI) / 180));
        return {
          ...prev,
          mode,
          bankAngleDeg: 25,
          muStatic: 0.35,
          speedMs: Number(vIdeal.toFixed(1)),
          phaseRad: 0,
        };
      }
      if (mode === 'conical_pendulum') {
        return {
          ...prev,
          mode,
          pendulumLengthM: 3.0,
          coneAngleDeg: 35,
          phaseRad: 0.35,
        };
      }
      return {
        ...prev,
        mode: 'kepler_orbit',
        centralMassEarth: 1.0,
        orbitRadiusEarth: 2.0,
        orbitRadiusBEarth: 4.0,
        phaseRad: 0.4,
        phaseBRad: 2.1,
      };
    });
  };

  const handleReset = () => {
    handleModeChange(params.mode);
  };

  const handlePlotCurrentTrial = () => {
    let tr: CircularTrialPoint;
    if (params.mode === 'vertical_loop') {
      const l = evaluation.loop;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'vertical_loop',
        label: `v=${l.speedMs.toFixed(1)}, θ=${l.angleDeg.toFixed(0)}°`,
        xPrimary: l.speedMs,
        yPrimary: l.acMs2,
        xSecondary: l.angleDeg,
        ySecondary: l.normalRawN,
        xTertiary: l.speedMs,
        yTertiary: l.periodS,
      };
    } else if (params.mode === 'banked_curve') {
      const b = evaluation.banked;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'banked_curve',
        label: `v=${b.speedMs.toFixed(1)}, β=${b.bankAngleDeg}°`,
        xPrimary: b.speedMs,
        yPrimary: b.frictionReqN,
        xSecondary: b.bankAngleDeg,
        ySecondary: b.speedMs,
        xTertiary: b.speedMs,
        yTertiary: b.normalForceN,
      };
    } else if (params.mode === 'conical_pendulum') {
      const c = evaluation.conical;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'conical_pendulum',
        label: `φ=${c.angleDeg.toFixed(0)}°, L=${c.lengthM.toFixed(1)}m`,
        xPrimary: c.angleDeg,
        yPrimary: c.periodS,
        xSecondary: c.angleDeg,
        ySecondary: c.speedMs,
        xTertiary: c.angleDeg,
        yTertiary: c.acMs2,
      };
    } else {
      const k = evaluation.kepler;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'kepler_orbit',
        label: `R=${k.satA.radiusEarthRadii.toFixed(1)}R_⊕`,
        xPrimary: Math.pow(k.satA.radiusEarthRadii, 3),
        yPrimary: k.satA.periodHours * k.satA.periodHours,
        xSecondary: k.satA.radiusEarthRadii,
        ySecondary: k.satA.speedKmS,
        xTertiary: k.satA.radiusEarthRadii,
        yTertiary: k.satA.acMs2,
      };
    }
    setTrials(prev => [...prev, tr]);
    setActiveTab('1A');
  };

  const handleClearTrials = () => {
    setTrials(prev => prev.filter(tr => tr.mode !== params.mode));
  };

  const modeButtons: Array<{
    id: Circular210Mode;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'vertical_loop', label: 'Vertical Loop', icon: <RefreshCw className="w-3.5 h-3.5" /> },
    { id: 'banked_curve', label: 'Banked Curve', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'conical_pendulum', label: 'Conical Pend.', icon: <Triangle className="w-3.5 h-3.5" /> },
    { id: 'kepler_orbit', label: 'Kepler Orbits', icon: <Orbit className="w-3.5 h-3.5" /> },
  ];

  const loop = evaluation.loop;
  const banked = evaluation.banked;
  const conical = evaluation.conical;
  const kepler = evaluation.kepler;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040c0a] select-none">
      {/* Full-Bleed Three.js 3D/2D Viewport */}
      <Circular210Viewport
        params={params}
        evaluation={evaluation}
        viewMode={externalViewMode}
      />

      {/* Top-Center AP Curriculum Badge */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-[#04100d]/92 border border-emerald-500/30 shadow-xl">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
          2.10 Circular Motion
        </span>
        <span className="text-slate-600">·</span>
        <MathFormula formulaKey="sim-circular210" className="text-emerald-200 text-xs" />
        <button
          type="button"
          onClick={() => setShowCedModal(true)}
          className="ml-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <BookOpen className="w-3 h-3" />
          <span>CED 2.10</span>
        </button>
      </div>

      {/* Left Floating Controls Dock */}
      <aside className="fixed left-3 top-[68px] z-20 w-[300px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        <div className="px-3.5 py-2.5 border-b border-emerald-500/20 bg-emerald-950/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Circular Dynamics Controls
            </div>
            <div className="text-[11px] text-slate-300 font-semibold">
              Centripetal Force &amp; Kepler’s 3rd Law
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
            {externalViewMode.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {/* 2x2 Mode Selector */}
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

          {/* Playback + Plot + Reset Bar */}
          <div className="rounded-xl bg-slate-950/80 border border-emerald-500/20 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying(p => !p)}
                className="flex-1 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handlePlotCurrentTrial}
                className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                title="Plot current state onto Skill 1.A graph"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Plot</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title="Reset current mode parameters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Loop Position Angle Scrubber in Vertical Loop Mode */}
            {params.mode === 'vertical_loop' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px] font-mono">
                  <span className="text-slate-400">Loop Position θ</span>
                  <span className="text-emerald-300 font-bold">{loop.angleDeg.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={loop.angleDeg}
                  onChange={e => {
                    setIsPlaying(false);
                    setParams(prev => ({ ...prev, loopAngleDeg: parseFloat(e.target.value) }));
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: 'Side 0°', val: 0 },
                    { label: 'Top 90°', val: 90 },
                    { label: 'Left 180°', val: 180 },
                    { label: 'Bot 270°', val: 270 },
                  ].map(jump => (
                    <button
                      key={jump.label}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setParams(prev => ({ ...prev, loopAngleDeg: jump.val }));
                      }}
                      className="py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 border border-white/10 text-[9.5px] font-mono text-slate-300 hover:text-emerald-200 cursor-pointer"
                    >
                      {jump.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode-Specific AP Scenario Presets */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              AP Scenario Presets
            </div>

            {params.mode === 'vertical_loop' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    const vMin = Math.sqrt(G_GRAVITY * params.radiusM);
                    setParams(prev => ({
                      ...prev,
                      loopAngleDeg: 90,
                      speedMs: Number(vMin.toFixed(2)),
                      tangentialAccelMs2: 0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-amber-500/20 border border-amber-400/30 text-[9.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  Top v=√(gr)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    const vSlow = Math.sqrt(G_GRAVITY * params.radiusM) * 0.72;
                    setParams(prev => ({
                      ...prev,
                      loopAngleDeg: 90,
                      speedMs: Number(vSlow.toFixed(2)),
                      tangentialAccelMs2: 0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-rose-500/20 border border-rose-400/30 text-[9.5px] font-semibold text-rose-200 cursor-pointer"
                >
                  Lose Contact
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setParams(prev => ({
                      ...prev,
                      loopAngleDeg: 35,
                      speedMs: 7.5,
                      tangentialAccelMs2: 5.0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-emerald-400/30 text-[9.5px] font-semibold text-emerald-200 cursor-pointer"
                >
                  Non-Unif (a_t)
                </button>
              </div>
            )}

            {params.mode === 'banked_curve' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const roadR = Math.max(5, params.radiusM * 5);
                    const vIdeal = Math.sqrt(
                      G_GRAVITY * roadR * Math.tan((params.bankAngleDeg * Math.PI) / 180),
                    );
                    setParams(prev => ({
                      ...prev,
                      speedMs: Number(clamp(vIdeal, 1, 30).toFixed(1)),
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-emerald-400/30 text-[9.5px] font-semibold text-emerald-200 cursor-pointer"
                >
                  Ideal f_s=0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParams(prev => ({
                      ...prev,
                      bankAngleDeg: 0,
                      muStatic: 0.45,
                      speedMs: 9.0,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-sky-500/20 border border-sky-400/30 text-[9.5px] font-semibold text-sky-200 cursor-pointer"
                >
                  Flat β=0°
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParams(prev => ({
                      ...prev,
                      bankAngleDeg: 22,
                      muStatic: 0.25,
                      speedMs: 18.5,
                    }));
                  }}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-rose-500/20 border border-rose-400/30 text-[9.5px] font-semibold text-rose-200 cursor-pointer"
                >
                  Skid Test
                </button>
              </div>
            )}

            {params.mode === 'conical_pendulum' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setParams(prev => ({ ...prev, coneAngleDeg: 45 }))}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-amber-500/20 border border-amber-400/30 text-[9.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  45° (a_c=g)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      massKg: prev.massKg >= 4.0 ? 1.5 : Number((prev.massKg * 2).toFixed(1)),
                    }))
                  }
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-emerald-400/30 text-[9.5px] font-semibold text-emerald-200 cursor-pointer"
                >
                  2× Mass Test
                </button>
                <button
                  type="button"
                  onClick={() => setParams(prev => ({ ...prev, coneAngleDeg: 65 }))}
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-sky-500/20 border border-sky-400/30 text-[9.5px] font-semibold text-sky-200 cursor-pointer"
                >
                  Steep 65°
                </button>
              </div>
            )}

            {params.mode === 'kepler_orbit' && (
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      centralMassEarth: 1.0,
                      orbitRadiusEarth: 2.0,
                      orbitRadiusBEarth: 4.0,
                    }))
                  }
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-emerald-500/20 border border-emerald-400/30 text-[9.5px] font-semibold text-emerald-200 cursor-pointer"
                >
                  2× R (2.D)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      centralMassEarth: 1.0,
                      orbitRadiusEarth: Number((42164e3 / R_EARTH).toFixed(2)),
                      orbitRadiusBEarth: 2.0,
                    }))
                  }
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-sky-500/20 border border-sky-400/30 text-[9.5px] font-semibold text-sky-200 cursor-pointer"
                >
                  GEO (24h)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(prev => ({
                      ...prev,
                      centralMassEarth: 4.0,
                      orbitRadiusEarth: 2.0,
                      orbitRadiusBEarth: 4.0,
                    }))
                  }
                  className="py-1 px-1 rounded-lg bg-slate-950/80 hover:bg-amber-500/20 border border-amber-400/30 text-[9.5px] font-semibold text-amber-200 cursor-pointer"
                >
                  4× Mass M
                </button>
              </div>
            )}
          </div>

          {/* Physical Parameter Sliders */}
          <div className="rounded-xl bg-slate-950/75 border border-white/10 p-2.5 space-y-2.5">
            {params.mode === 'vertical_loop' && (
              <>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Tangential Speed v</span>
                    <span className="text-sky-300 font-bold">{params.speedMs.toFixed(2)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={1.5}
                    max={16.0}
                    step={0.1}
                    value={params.speedMs}
                    onChange={e =>
                      setParams(prev => ({ ...prev, speedMs: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Loop Radius r</span>
                    <span className="text-emerald-300 font-bold">{params.radiusM.toFixed(1)} m</span>
                  </div>
                  <input
                    type="range"
                    min={1.5}
                    max={8.0}
                    step={0.1}
                    value={params.radiusM}
                    onChange={e =>
                      setParams(prev => ({ ...prev, radiusM: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Tangential Accel a_t</span>
                    <span className="text-amber-300 font-bold">
                      {params.tangentialAccelMs2 >= 0 ? '+' : ''}
                      {params.tangentialAccelMs2.toFixed(1)} m/s²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-8.0}
                    max={8.0}
                    step={0.2}
                    value={params.tangentialAccelMs2}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        tangentialAccelMs2: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Cart Mass m</span>
                    <span className="text-slate-200 font-bold">{params.massKg.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    value={params.massKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, massKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </>
            )}

            {params.mode === 'banked_curve' && (
              <>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Car Speed v</span>
                    <span className="text-sky-300 font-bold">{params.speedMs.toFixed(1)} m/s</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={26.0}
                    step={0.2}
                    value={params.speedMs}
                    onChange={e =>
                      setParams(prev => ({ ...prev, speedMs: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Bank Angle β</span>
                    <span className="text-emerald-300 font-bold">{params.bankAngleDeg.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={45}
                    step={1}
                    value={params.bankAngleDeg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, bankAngleDeg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Static Friction μ_s</span>
                    <span className="text-rose-300 font-bold">{params.muStatic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.95}
                    step={0.05}
                    value={params.muStatic}
                    onChange={e =>
                      setParams(prev => ({ ...prev, muStatic: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Curve Radius r</span>
                    <span className="text-amber-300 font-bold">{banked.radiusM.toFixed(0)} m</span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={8.0}
                    step={0.2}
                    value={params.radiusM}
                    onChange={e =>
                      setParams(prev => ({ ...prev, radiusM: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </>
            )}

            {params.mode === 'conical_pendulum' && (
              <>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Cone Angle φ</span>
                    <span className="text-amber-300 font-bold">{params.coneAngleDeg.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={75}
                    step={1}
                    value={params.coneAngleDeg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, coneAngleDeg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">String Length L</span>
                    <span className="text-emerald-300 font-bold">
                      {params.pendulumLengthM.toFixed(1)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={6.0}
                    step={0.1}
                    value={params.pendulumLengthM}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        pendulumLengthM: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Bob Mass m (test invariance!)</span>
                    <span className="text-sky-300 font-bold">{params.massKg.toFixed(1)} kg</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    value={params.massKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, massKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </>
            )}

            {params.mode === 'kepler_orbit' && (
              <>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-emerald-300">Sat A Radius R_A</span>
                    <span className="text-emerald-300 font-bold">
                      {params.orbitRadiusEarth.toFixed(2)} R_⊕
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.2}
                    max={7.0}
                    step={0.1}
                    value={params.orbitRadiusEarth}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        orbitRadiusEarth: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-amber-300">Sat B Radius R_B</span>
                    <span className="text-amber-300 font-bold">
                      {params.orbitRadiusBEarth.toFixed(2)} R_⊕
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.2}
                    max={7.0}
                    step={0.1}
                    value={params.orbitRadiusBEarth}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        orbitRadiusBEarth: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Central Mass M</span>
                    <span className="text-sky-300 font-bold">
                      {params.centralMassEarth.toFixed(2)} M_⊕
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={4.0}
                    step={0.25}
                    value={params.centralMassEarth}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        centralMassEarth: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10.5px] font-mono">
                    <span className="text-slate-300">Sat Mass m (cancels in T!)</span>
                    <span className="text-slate-200 font-bold">{params.satMassKg.toFixed(0)} kg</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={100}
                    value={params.satMassKg}
                    onChange={e =>
                      setParams(prev => ({ ...prev, satMassKg: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>

          {/* Live Numeric Telemetry Grid */}
          {params.mode === 'vertical_loop' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">CENTRIPETAL a_c</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {loop.acMs2.toFixed(2)} m/s²
                </div>
                <div className="text-[9px] text-slate-400">|a_net|={loop.aNetMs2.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">TOP v_min=√(gr)</div>
                <div className="text-amber-300 font-bold text-xs">
                  {loop.vMinTopMs.toFixed(2)} m/s
                </div>
                <div className={`text-[9px] ${loop.maintainsContact ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                  F_N = {loop.normalForceN.toFixed(1)} N
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">PERIOD T=2πr/v</div>
                <div className="text-sky-300 font-bold text-xs">{loop.periodS.toFixed(2)} s</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">FREQ f = 1/T</div>
                <div className="text-white font-bold text-xs">{loop.frequencyHz.toFixed(2)} Hz</div>
              </div>
            </div>
          )}

          {params.mode === 'banked_curve' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">IDEAL v_ideal</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {banked.vIdealMs.toFixed(2)} m/s
                </div>
                <div className="text-[9px] text-slate-400">f_s = 0 at ideal</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SAFE RANGE</div>
                <div className="text-amber-300 font-bold text-xs">
                  {banked.vMinMs.toFixed(1)}–
                  {Number.isFinite(banked.vMaxMs) ? banked.vMaxMs.toFixed(1) : '∞'}
                </div>
                <div className="text-[9px] text-slate-400">m/s (with μ_s)</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">REQ. FRICTION f_s</div>
                <div className={`font-bold text-xs ${banked.isSafe ? 'text-rose-300' : 'text-rose-400'}`}>
                  {banked.frictionReqN >= 0 ? '+' : ''}
                  {banked.frictionReqN.toFixed(1)} N
                </div>
                <div className="text-[9px] text-slate-400">max ±{banked.frictionMaxN.toFixed(1)}N</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">HORIZ a_c = v²/r</div>
                <div className="text-sky-300 font-bold text-xs">{banked.acMs2.toFixed(2)} m/s²</div>
                <div className="text-[9px] text-slate-400">T = {banked.periodS.toFixed(1)} s</div>
              </div>
            </div>
          )}

          {params.mode === 'conical_pendulum' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">HORIZ a_c=g tanφ</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {conical.acMs2.toFixed(2)} m/s²
                </div>
                <div className="text-[9px] text-slate-400">r = {conical.radiusM.toFixed(2)} m</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">TENSION T_str</div>
                <div className="text-amber-300 font-bold text-xs">
                  {conical.tensionN.toFixed(1)} N
                </div>
                <div className="text-[9px] text-slate-400">T_r={conical.tensionRadialN.toFixed(1)}N</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">PERIOD T</div>
                <div className="text-sky-300 font-bold text-xs">{conical.periodS.toFixed(2)} s</div>
                <div className="text-[9px] text-slate-400">f = {conical.frequencyHz.toFixed(2)} Hz</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SPEED v</div>
                <div className="text-white font-bold text-xs">{conical.speedMs.toFixed(2)} m/s</div>
                <div className="text-[9px] text-slate-400">m-invariant!</div>
              </div>
            </div>
          )}

          {params.mode === 'kepler_orbit' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SAT A PERIOD T_A</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {kepler.satA.periodHours.toFixed(2)} hr
                </div>
                <div className="text-[9px] text-sky-300">v={kepler.satA.speedKmS.toFixed(2)} km/s</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SAT B PERIOD T_B</div>
                <div className="text-amber-300 font-bold text-xs">
                  {kepler.satB.periodHours.toFixed(2)} hr
                </div>
                <div className="text-[9px] text-amber-200">v={kepler.satB.speedKmS.toFixed(2)} km/s</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">(T_B / T_A)²</div>
                <div className="text-white font-bold text-xs">
                  {kepler.tRatioSquared.toFixed(3)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">(R_B / R_A)³</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {kepler.rRatioCubed.toFixed(3)}
                </div>
              </div>
            </div>
          )}

          {/* Visual Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setParams(prev => ({ ...prev, showVectors: !prev.showVectors }))
              }
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showVectors
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
                setParams(prev => ({ ...prev, showComponents: !prev.showComponents }))
              }
              className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showComponents
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-950/70 border-white/10 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Components</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Right Floating Analysis Panel (Skills 1.A, 2.A, 2.D, 3.C) */}
      <Circular210AnalysisPanel
        params={params}
        evaluation={evaluation}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        trials={trials}
        onPlotCurrentTrial={handlePlotCurrentTrial}
        onClearTrials={handleClearTrials}
      />

      {/* Bottom Status & Vector Legend Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[650px] px-4 py-2 rounded-2xl bg-[#04100d]/92 border border-emerald-500/25 shadow-xl flex flex-col items-center gap-1">
        <div className="text-[11px] text-slate-200 text-center leading-tight line-clamp-2">
          {evaluation.keyInsight}
        </div>
        <div className="flex items-center flex-wrap justify-center gap-3 text-[10px] font-mono text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>a_c = v²/r (inward)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>v (tangent)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>
              {params.mode === 'conical_pendulum'
                ? 'T & Fg'
                : params.mode === 'vertical_loop'
                  ? 'a_t & Fg'
                  : 'Fg'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            <span>
              {params.mode === 'banked_curve'
                ? 'F_N (cyan) · f_s (rose)'
                : params.mode === 'vertical_loop'
                  ? 'F_N (cyan) · a_net (white)'
                  : 'Kepler / Radial Ref'}
            </span>
          </span>
        </div>
      </div>

      {/* Official AP CED Topic 2.10 Modal */}
      {showCedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#05120e] border border-emerald-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
            <div className="px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/35 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  AP Physics C: Mechanics · Unit 2 Course Framework (CED Pages 58–60)
                </div>
                <h2 className="text-base font-bold text-white">
                  Topic 2.10: Circular Motion — Official Course Requirements
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
              {/* LO 2.10.A */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/25 space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Learning Objective 2.10.A
                </div>
                <p className="text-slate-100 font-medium">
                  Describe the motion of an object traveling in a circular path.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <MathFormula formulaKey="sim-circular210-ac" className="text-emerald-200 text-xs" />
                  <MathFormula formulaKey="sim-circular210-vmin" className="text-amber-200 text-xs" />
                  <MathFormula formulaKey="sim-circular210-period" className="text-sky-200 text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Essential Knowledge (2.10.A.1 – 2.10.A.5)
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div>
                    <strong className="text-emerald-300 font-mono">2.10.A.1:</strong> Centripetal
                    acceleration is directed toward the center of the circular path with magnitude
                    a_c = v²/r.
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.10.A.2.i:</strong> At the top of a vertical loop, minimum speed is
                    v = √(gr), where gravity alone causes a_c (F_N = 0).
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.10.A.2.ii:</strong> Components of static friction and the normal
                    force contribute to the net centripetal force on a banked surface.
                  </div>
                  <div className="pl-3 text-slate-300">
                    • <strong>2.10.A.2.iii:</strong> A horizontal component of tension produces
                    centripetal acceleration in a conical pendulum.
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">2.10.A.3 &amp; 2.10.A.4:</strong>{' '}
                  Tangential acceleration a_t is the rate at which speed changes, directed tangent
                  to the circle. Net acceleration is the vector sum a_net = a_c + a_t.
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">2.10.A.5:</strong> Uniform
                  circular motion is described by period T (time per revolution) and frequency f
                  (revolutions per time): T = 1/f and T = 2πr/v.
                </div>
              </div>

              {/* LO 2.10.B */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-sky-500/25 space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-sky-400">
                  Learning Objective 2.10.B · Circular Orbits &amp; Kepler’s Third Law
                </div>
                <p className="text-slate-100 font-medium">
                  Describe circular orbits using Kepler&apos;s third law: gravity is the sole force
                  providing centripetal acceleration for a satellite in circular orbit around
                  central mass M.
                </p>
                <div className="pt-1">
                  <MathFormula formulaKey="sim-circular210-kepler" className="text-sky-200 text-xs" />
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-100 text-[11px]">
                  <strong className="text-amber-300 font-mono">BOUNDARY STATEMENT:</strong> AP
                  Physics C: Mechanics does not expect students to know Kepler&apos;s first or
                  second laws of planetary motion.
                </div>
              </div>

              {/* Official CED Reference Page Links */}
              <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-200">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Official Course Framework Reference (Topic 2.10, Pages 58–60)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'p. 58', href: '/assets/aistudio/Topic_2.10_course_requirements_p1.png' },
                    { label: 'p. 59', href: '/assets/aistudio/Topic_2.10_course_requirements_p2.png' },
                    { label: 'p. 60', href: '/assets/aistudio/Topic_2.10_course_requirements_p3.png' },
                  ].map(pg => (
                    <a
                      key={pg.label}
                      href={pg.href}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10.5px] transition"
                    >
                      {pg.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
