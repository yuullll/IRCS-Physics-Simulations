'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  X,
  Plus,
  Eye,
  Gauge,
  Compass,
  Train,
  Scale,
} from 'lucide-react';
import { MathFormula } from '@/components/ui/MathFormula';
import {
  ArenaMotionPattern,
  DEFAULT_KINETIC_31_PARAMS,
  Kinetic31Mode,
  Kinetic31Params,
  KineticTrialPoint,
  INITIAL_KINETIC_TRIALS_31,
  clamp,
  evaluateKinetic31,
} from '@/lib/physics/kinetic-energy-3-1';
import { Kinetic31Viewport } from './kinetic31/Kinetic31Viewport';
import {
  Kinetic31AnalysisPanel,
  Kinetic31Tab,
} from './kinetic31/Kinetic31AnalysisPanel';

interface KineticEnergy31WorkbenchProps {
  externalViewMode?: '3d' | '2d';
  onToast?: (msg: string) => void;
}

export const KineticEnergy31Workbench: React.FC<KineticEnergy31WorkbenchProps> = ({
  externalViewMode = '3d',
  onToast,
}) => {
  const [params, setParams] = useState<Kinetic31Params>(DEFAULT_KINETIC_31_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<Kinetic31Tab>('1C');
  const [showCedModal, setShowCedModal] = useState<boolean>(false);
  const [trials, setTrials] = useState<KineticTrialPoint[]>(INITIAL_KINETIC_TRIALS_31);

  const evaluation = useMemo(() => evaluateKinetic31(params), [params]);

  // Real-time animation loop across all 4 Topic 3.1 apparatuses
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      setParams(prev => {
        if (prev.mode === 'scaling_track') {
          const vVis = prev.speedMs * 0.42;
          let nextX = prev.trackPosM + vVis * dt;
          if (nextX > 3.9) nextX = -3.9;
          return { ...prev, trackPosM: nextX };
        }

        if (prev.mode === 'scalar_arena') {
          if (prev.arenaPattern === 'circular') {
            const rVis = 1.9;
            const omega = (prev.arenaSpeedMs * 0.42) / rVis;
            const nextRad = (prev.arenaOrbitRad + omega * dt) % (Math.PI * 2);
            const nextX = rVis * Math.cos(nextRad);
            const nextY = rVis * Math.sin(nextRad);
            const tangentDeg = (((nextRad * 180) / Math.PI + 90) % 360 + 360) % 360;
            return {
              ...prev,
              arenaOrbitRad: nextRad,
              arenaPosX: nextX,
              arenaPosY: nextY,
              headingDeg: tangentDeg,
            };
          }

          const rad = (prev.headingDeg * Math.PI) / 180;
          const vScale = prev.arenaSpeedMs * 0.36;
          let nextX = prev.arenaPosX + Math.cos(rad) * vScale * dt;
          let nextY = prev.arenaPosY + Math.sin(rad) * vScale * dt;
          const maxR = 2.65;
          const dist = Math.hypot(nextX, nextY);

          if (prev.arenaPattern === 'rebound') {
            if (dist > maxR) {
              const flippedDeg = (prev.headingDeg + 180) % 360;
              const nx = (nextX / dist) * maxR * 0.98;
              const ny = (nextY / dist) * maxR * 0.98;
              return {
                ...prev,
                arenaPosX: nx,
                arenaPosY: ny,
                headingDeg: flippedDeg,
              };
            }
          } else {
            // linear wrap-around across center chord
            if (dist > maxR) {
              nextX = -Math.cos(rad) * maxR * 0.95;
              nextY = -Math.sin(rad) * maxR * 0.95;
            }
          }

          return { ...prev, arenaPosX: nextX, arenaPosY: nextY };
        }

        if (prev.mode === 'observer_frames') {
          return { ...prev, frameSimTimeS: prev.frameSimTimeS + dt };
        }

        // scenario_compare
        const wrapLane = (x: number) => {
          if (x > 3.6) return -4.4;
          if (x < -4.4) return 3.6;
          return x;
        };
        const nextA = wrapLane(prev.comparePosA + prev.velAMs * 0.36 * dt);
        const nextB = wrapLane(prev.comparePosB + prev.velBMs * 0.36 * dt);
        return { ...prev, comparePosA: nextA, comparePosB: nextB };
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handleModeChange = (mode: Kinetic31Mode) => {
    setParams(prev => {
      if (mode === 'scaling_track') {
        return {
          ...prev,
          mode,
          massKg: 2.0,
          speedMs: 5.0,
          refMassKg: 2.0,
          refSpeedMs: 5.0,
          trackPosM: -3.0,
        };
      }
      if (mode === 'scalar_arena') {
        return {
          ...prev,
          mode,
          arenaMassKg: 2.0,
          arenaSpeedMs: 6.0,
          headingDeg: 35,
          arenaPattern: 'linear',
          showTwoPuckSystem: false,
          arenaPosX: 0,
          arenaPosY: 0,
          arenaOrbitRad: 0,
        };
      }
      if (mode === 'observer_frames') {
        return {
          ...prev,
          mode,
          frameMassKg: 2.0,
          vObjectEarthMs: 8.0,
          vObserverEarthMs: 3.0,
          activeViewFrame: 'earth',
          frameSimTimeS: 0,
        };
      }
      return {
        ...prev,
        mode: 'scenario_compare',
        massAKg: 1.0,
        velAMs: 8.0,
        massBKg: 4.0,
        velBMs: 2.0,
        comparePosA: -2.5,
        comparePosB: -2.5,
      };
    });
  };

  const handleReset = () => {
    handleModeChange(params.mode);
  };

  const handleApplyPreset = (preset: Partial<Kinetic31Params>) => {
    setParams(prev => ({
      ...prev,
      ...preset,
      trackPosM: -2.5,
      arenaPosX: 0,
      arenaPosY: 0,
      frameSimTimeS: 0,
      comparePosA: -2.0,
      comparePosB: -2.0,
    }));
    onToast?.('Applied 3.C verification scenario to 3D Lab');
  };

  const handlePlotCurrentTrial = () => {
    let tr: KineticTrialPoint;
    if (params.mode === 'scaling_track') {
      const s = evaluation.scaling;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'scaling_track',
        label: `m=${s.massKg.toFixed(1)}, v=${s.speedMs.toFixed(1)}`,
        xPrimary: s.speedMs,
        yPrimary: s.kineticJ,
        xSecondary: s.speedMs * s.speedMs,
        ySecondary: s.kineticJ,
        xTertiary: s.massKg,
        yTertiary: s.kineticJ,
      };
    } else if (params.mode === 'scalar_arena') {
      const a = evaluation.arena;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'scalar_arena',
        label: `θ=${a.headingDeg.toFixed(0)}°, v=${a.speedMs.toFixed(1)}`,
        xPrimary: a.headingDeg,
        yPrimary: a.kineticJ,
        xSecondary: a.headingDeg,
        ySecondary: a.vxMs,
        xTertiary: a.headingDeg,
        yTertiary: a.kxJ,
      };
    } else if (params.mode === 'observer_frames') {
      const f = evaluation.frames;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'observer_frames',
        label: `v_O=${f.vObsRelEarthMs.toFixed(1)}, v_rel=${f.vObjRelObserverMs.toFixed(1)}`,
        xPrimary: f.vObsRelEarthMs,
        yPrimary: f.kObserverJ,
        xSecondary: f.vObsRelEarthMs,
        ySecondary: f.vObjRelObserverMs,
        xTertiary: f.vObjRelObserverMs * f.vObjRelObserverMs,
        yTertiary: f.kObserverJ,
      };
    } else {
      const c = evaluation.compare;
      tr = {
        id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        mode: 'scenario_compare',
        label: `A:${c.kAJ.toFixed(0)}J · B:${c.kBJ.toFixed(0)}J`,
        xPrimary: c.velAMs,
        yPrimary: c.kAJ,
        xSecondary: c.pMagA,
        ySecondary: c.kAJ,
        xTertiary: c.massAKg,
        yTertiary: c.kAJ,
      };
    }
    setTrials(prev => [...prev, tr]);
    setActiveTab('1C');
    onToast?.(`Plotted ${tr.label} onto 1.C graph`);
  };

  const handleClearTrials = () => {
    setTrials(prev => prev.filter(tr => tr.mode !== params.mode));
  };

  const modeButtons: Array<{
    id: Kinetic31Mode;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'scaling_track', label: 'Mass & v²', icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: 'scalar_arena', label: 'Scalar 2D', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'observer_frames', label: 'Ref. Frames', icon: <Train className="w-3.5 h-3.5" /> },
    { id: 'scenario_compare', label: 'Compare A/B', icon: <Scale className="w-3.5 h-3.5" /> },
  ];

  const s = evaluation.scaling;
  const a = evaluation.arena;
  const f = evaluation.frames;
  const c = evaluation.compare;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040c0a] select-none">
      {/* Full-Bleed Three.js 3D/2D Viewport */}
      <Kinetic31Viewport
        params={params}
        evaluation={evaluation}
        viewMode={externalViewMode}
      />

      {/* Top-Center AP Curriculum Badge */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-[#04100d]/92 border border-emerald-500/30 shadow-xl">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
          3.1 Translational Kinetic Energy
        </span>
        <span className="text-slate-600">·</span>
        <MathFormula formulaKey="sim-kinetic31-eq" className="text-emerald-200 text-xs" />
        <button
          type="button"
          onClick={() => setShowCedModal(true)}
          className="ml-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
        >
          <BookOpen className="w-3 h-3" />
          <span>CED 3.1</span>
        </button>
      </div>

      {/* Left Floating Controls Dock */}
      <aside className="fixed left-3 top-[68px] z-20 w-[300px] max-h-[calc(100vh-146px)] bg-[#04100d]/92 border border-emerald-500/25 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        <div className="px-3.5 py-2.5 border-b border-emerald-500/20 bg-emerald-950/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Kinetic Energy Controls
            </div>
            <div className="text-[11px] text-slate-300 font-semibold">
              Scalar K = ½mv² &amp; Observer Frames
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
            {externalViewMode.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          {/* 2x2 Mode Selector */}
          <div className="grid grid-cols-2 gap-1.5">
            {modeButtons.map(mb => (
              <button
                key={mb.id}
                type="button"
                onClick={() => handleModeChange(mb.id)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  params.mode === mb.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-bold'
                    : 'bg-slate-950/80 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {mb.icon}
                <span className="truncate">{mb.label}</span>
              </button>
            ))}
          </div>

          {/* Playback & Plot Action Row */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying(p => !p)}
              className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-1.5 px-2.5 rounded-xl bg-slate-950/80 border border-white/10 hover:bg-white/10 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Reset current apparatus"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handlePlotCurrentTrial}
              className="py-1.5 px-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Plot current state onto 1.C graph"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plot</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* MODE 1: MASS & SPEED SCALING TRACK                             */}
          {/* ============================================================== */}
          {params.mode === 'scaling_track' && (
            <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-950/75 border border-white/10">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Object Mass (m)</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {params.massKg.toFixed(1)} kg ({s.massRatio.toFixed(2)}× m₀)
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={params.massKg}
                  onChange={e =>
                    setParams(p => ({ ...p, massKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Object Speed (v)</span>
                  <span className="font-mono font-bold text-sky-300">
                    {params.speedMs.toFixed(1)} m/s ({s.speedRatio.toFixed(2)}× v₀)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={params.speedMs}
                  onChange={e =>
                    setParams(p => ({ ...p, speedMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Quick Scaling Ratios (vs Ref K₀={s.refKineticJ.toFixed(1)}J)
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setParams(p => ({
                        ...p,
                        massKg: clamp(p.refMassKg * 2, 0.5, 10),
                        speedMs: p.refSpeedMs,
                      }))
                    }
                    className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-emerald-300 cursor-pointer"
                  >
                    2× m (2×K)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setParams(p => ({
                        ...p,
                        massKg: p.refMassKg,
                        speedMs: clamp(p.refSpeedMs * 2, 0, 15),
                      }))
                    }
                    className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-sky-300 cursor-pointer"
                  >
                    2× v (4×K)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setParams(p => ({
                        ...p,
                        massKg: clamp(p.refMassKg * 0.5, 0.5, 10),
                        speedMs: clamp(p.refSpeedMs * 2, 0, 15),
                      }))
                    }
                    className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-amber-300 cursor-pointer"
                  >
                    ½m · 2v
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      refMassKg: p.massKg,
                      refSpeedMs: Math.max(0.5, p.speedMs),
                    }))
                  }
                  className="w-full py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-[10px] font-mono font-semibold cursor-pointer"
                >
                  Lock Current State as Reference K₀
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 2: 2D SCALAR DIRECTION-INVARIANCE ARENA                   */}
          {/* ============================================================== */}
          {params.mode === 'scalar_arena' && (
            <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-950/75 border border-white/10">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Puck Mass (m)</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {params.arenaMassKg.toFixed(1)} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={params.arenaMassKg}
                  onChange={e =>
                    setParams(p => ({ ...p, arenaMassKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Constant Speed |v|</span>
                  <span className="font-mono font-bold text-sky-300">
                    {params.arenaSpeedMs.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={0.5}
                  value={params.arenaSpeedMs}
                  onChange={e =>
                    setParams(p => ({ ...p, arenaSpeedMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Velocity Heading (θ)</span>
                  <span className="font-mono font-bold text-amber-300">
                    {a.headingDeg.toFixed(0)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={a.headingDeg}
                  onChange={e =>
                    setParams(p => ({ ...p, headingDeg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[0, 90, 180, 270].map(deg => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setParams(p => ({ ...p, headingDeg: deg }))}
                      className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Arena Trajectory Pattern
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['linear', 'circular', 'rebound'] as ArenaMotionPattern[]).map(pat => (
                    <button
                      key={pat}
                      type="button"
                      onClick={() =>
                        setParams(p => ({
                          ...p,
                          arenaPattern: pat,
                          arenaPosX: pat === 'circular' ? 1.9 : 0,
                          arenaPosY: 0,
                          arenaOrbitRad: 0,
                        }))
                      }
                      className={`py-1 rounded-lg border text-[10px] font-mono capitalize cursor-pointer ${
                        params.arenaPattern === pat
                          ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setParams(p => ({ ...p, showTwoPuckSystem: !p.showTwoPuckSystem }))
                }
                className={`w-full py-1.5 px-2.5 rounded-xl border text-[10.5px] font-semibold transition cursor-pointer ${
                  params.showTwoPuckSystem
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {params.showTwoPuckSystem
                  ? '2-Puck Opposite System: ON (Σp=0, K_sys>0)'
                  : 'Enable 2-Puck Opposite System (Σp=0)'}
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 3: REFERENCE FRAMES LAB                                   */}
          {/* ============================================================== */}
          {params.mode === 'observer_frames' && (
            <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-950/75 border border-white/10">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Active Camera Reference Frame (3.1.A.3)
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setParams(p => ({ ...p, activeViewFrame: 'earth' }))}
                    className={`py-1.5 rounded-lg border text-[10.5px] font-bold cursor-pointer ${
                      params.activeViewFrame === 'earth'
                        ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    Earth Frame E
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams(p => ({ ...p, activeViewFrame: 'observer_b' }))}
                    className={`py-1.5 rounded-lg border text-[10.5px] font-bold cursor-pointer ${
                      params.activeViewFrame === 'observer_b'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    Observer O Frame
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Object P Mass (m)</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {params.frameMassKg.toFixed(1)} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={params.frameMassKg}
                  onChange={e =>
                    setParams(p => ({ ...p, frameMassKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Object Velocity v_P/E</span>
                  <span className="font-mono font-bold text-emerald-300">
                    {params.vObjectEarthMs >= 0 ? '+' : ''}
                    {params.vObjectEarthMs.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={params.vObjectEarthMs}
                  onChange={e =>
                    setParams(p => ({ ...p, vObjectEarthMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Observer Velocity v_O/E</span>
                  <span className="font-mono font-bold text-amber-300">
                    {params.vObserverEarthMs >= 0 ? '+' : ''}
                    {params.vObserverEarthMs.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={params.vObserverEarthMs}
                  onChange={e =>
                    setParams(p => ({ ...p, vObserverEarthMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      vObserverEarthMs: p.vObjectEarthMs,
                      activeViewFrame: 'observer_b',
                    }))
                  }
                  className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-amber-300 cursor-pointer"
                >
                  Match v_O=v_P (K=0)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      vObserverEarthMs: -p.vObjectEarthMs,
                      activeViewFrame: 'observer_b',
                    }))
                  }
                  className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-sky-300 cursor-pointer"
                >
                  Opposite (-v_P · 4×K)
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODE 4: DUAL SCENARIO COMPARISON                               */}
          {/* ============================================================== */}
          {params.mode === 'scenario_compare' && (
            <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-950/75 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-400">
                AP 2.C Comparison Presets
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      massAKg: 1.0,
                      velAMs: 8.0,
                      massBKg: 4.0,
                      velBMs: 2.0,
                    }))
                  }
                  className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-emerald-300 cursor-pointer"
                >
                  Same p
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      massAKg: 2.0,
                      velAMs: 5.0,
                      massBKg: 1.0,
                      velBMs: 10.0,
                    }))
                  }
                  className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-amber-300 cursor-pointer"
                >
                  ½m · 2v
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      massAKg: 2.0,
                      velAMs: 7.0,
                      massBKg: 2.0,
                      velBMs: -7.0,
                    }))
                  }
                  className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-sky-300 cursor-pointer"
                >
                  ±v Same K
                </button>
              </div>

              <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/20 space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-emerald-300">
                  CART A · K_A = {c.kAJ.toFixed(1)} J
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-slate-400">Mass m_A</span>
                  <span className="font-mono text-white">{params.massAKg.toFixed(1)} kg</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={params.massAKg}
                  onChange={e =>
                    setParams(p => ({ ...p, massAKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-slate-400">Velocity v_A</span>
                  <span className="font-mono text-white">
                    {params.velAMs >= 0 ? '+' : ''}
                    {params.velAMs.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={params.velAMs}
                  onChange={e =>
                    setParams(p => ({ ...p, velAMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-amber-300">
                  CART B · K_B = {c.kBJ.toFixed(1)} J
                </div>
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-slate-400">Mass m_B</span>
                  <span className="font-mono text-white">{params.massBKg.toFixed(1)} kg</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={params.massBKg}
                  onChange={e =>
                    setParams(p => ({ ...p, massBKg: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-slate-400">Velocity v_B</span>
                  <span className="font-mono text-white">
                    {params.velBMs >= 0 ? '+' : ''}
                    {params.velBMs.toFixed(1)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.5}
                  value={params.velBMs}
                  onChange={e =>
                    setParams(p => ({ ...p, velBMs: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* LIVE TELEMETRY GRID                                            */}
          {/* ============================================================== */}
          {params.mode === 'scaling_track' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">KINETIC ENERGY K</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {s.kineticJ.toFixed(1)} J
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">RATIO K / K₀</div>
                <div className="text-amber-300 font-bold text-xs">
                  {s.energyRatio.toFixed(2)}×
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">(v / v₀)² FACTOR</div>
                <div className="text-sky-300 font-bold text-xs">
                  {s.speedRatioSquared.toFixed(2)}×
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">MOMENTUM p = mv</div>
                <div className="text-white font-bold text-xs">
                  {s.momentumKgMs.toFixed(1)} kg·m/s
                </div>
              </div>
            </div>
          )}

          {params.mode === 'scalar_arena' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SCALAR K (INVARIANT)</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {a.kineticJ.toFixed(1)} J
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">K_x + K_y SPLIT</div>
                <div className="text-sky-300 font-bold text-xs">
                  {a.kxJ.toFixed(1)} + {a.kyJ.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">v_x / v_y (m/s)</div>
                <div className="text-white font-bold text-xs">
                  {a.vxMs.toFixed(1)} / {a.vyMs.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">SYSTEM K_sys / |p_sys|</div>
                <div className="text-amber-300 font-bold text-xs">
                  {a.sysTotalKineticJ.toFixed(1)}J / {a.sysNetPMag.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {params.mode === 'observer_frames' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">EARTH FRAME K_P/E</div>
                <div className="text-sky-300 font-bold text-xs">
                  {f.kEarthJ.toFixed(1)} J
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">OBSERVER O K_P/O</div>
                <div className="text-amber-300 font-bold text-xs">
                  {f.kObserverJ.toFixed(1)} J
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">REL. VELOCITY v_P/O</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {f.vObjRelObserverMs >= 0 ? '+' : ''}
                  {f.vObjRelObserverMs.toFixed(1)} m/s
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">RATIO K_P/O / K_P/E</div>
                <div className="text-white font-bold text-xs">
                  {f.kRatioObserverToEarth !== null
                    ? `${f.kRatioObserverToEarth.toFixed(2)}×`
                    : 'K_E = 0'}
                </div>
              </div>
            </div>
          )}

          {params.mode === 'scenario_compare' && (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">K_A vs K_B</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {c.kAJ.toFixed(1)} vs {c.kBJ.toFixed(1)} J
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">RATIO K_B / K_A</div>
                <div className="text-sky-300 font-bold text-xs">
                  {c.kRatioBtoA !== null ? `${c.kRatioBtoA.toFixed(2)}×` : 'K_A = 0'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">MOMENTUM p_A / p_B</div>
                <div className="text-white font-bold text-xs">
                  {c.pAKgMs.toFixed(1)} / {c.pBKgMs.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-[9px] text-slate-400">LARGER K</div>
                <div className="text-amber-300 font-bold text-xs">
                  {c.winnerLabel === 'Equal' ? 'Equal K' : `Cart ${c.winnerLabel}`}
                </div>
              </div>
            </div>
          )}

          {/* Visual Overlays */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setParams(p => ({ ...p, showVectors: !p.showVectors }))}
              className={`flex-1 py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
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
              onClick={() => setParams(p => ({ ...p, showComponents: !p.showComponents }))}
              className={`flex-1 py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showComponents
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-950/70 border-white/10 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>vₓ, vᵧ</span>
            </button>
            <button
              type="button"
              onClick={() => setParams(p => ({ ...p, showEnergyTowers: !p.showEnergyTowers }))}
              className={`flex-1 py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                params.showEnergyTowers
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-950/70 border-white/10 text-slate-400'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>K Bars</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Right Floating Analysis Panel (Skills 1.C, 2.C, 3.B, 3.C) */}
      <Kinetic31AnalysisPanel
        params={params}
        evaluation={evaluation}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        trials={trials}
        onPlotCurrentTrial={handlePlotCurrentTrial}
        onClearTrials={handleClearTrials}
        onApplyPreset={handleApplyPreset}
      />

      {/* Bottom Status & Vector Legend Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[650px] px-4 py-2 rounded-2xl bg-[#04100d]/92 border border-emerald-500/25 shadow-xl flex flex-col items-center gap-1">
        <div className="text-[11px] text-slate-200 text-center leading-tight line-clamp-2">
          {evaluation.keyInsight}
        </div>
        <div className="flex items-center flex-wrap justify-center gap-3 text-[10px] font-mono text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>K = ½mv² (Scalar ≥ 0)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span>v / Earth Frame E</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Ref K₀ / Observer O / Cart B</span>
          </span>
        </div>
      </div>

      {/* Official AP CED Topic 3.1 Modal */}
      {showCedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#05120e] border border-emerald-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
            <div className="px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/35 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  AP Physics C: Mechanics · Unit 3 Course Framework (CED Page 67)
                </div>
                <h2 className="text-base font-bold text-white">
                  Topic 3.1: Translational Kinetic Energy — Course Requirements
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
              {/* LO 3.1.A */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/25 space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Learning Objective 3.1.A
                </div>
                <p className="text-slate-100 font-medium">
                  Describe the translational kinetic energy of an object in terms of the object&apos;s
                  mass and velocity.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <MathFormula formulaKey="sim-kinetic31-eq" className="text-emerald-200 text-xs" />
                  <MathFormula
                    formulaKey="sim-kinetic31-components"
                    className="text-sky-200 text-xs"
                  />
                  <MathFormula
                    formulaKey="sim-kinetic31-frame"
                    className="text-amber-200 text-xs"
                  />
                </div>
              </div>

              {/* Essential Knowledge */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">
                  Essential Knowledge (3.1.A.1 – 3.1.A.3)
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">3.1.A.1:</strong> An object&apos;s
                  translational kinetic energy is given by the equation{' '}
                  <span className="font-mono text-white">K = ½ m v²</span>.
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">3.1.A.2:</strong> Translational
                  kinetic energy is a scalar quantity (non-negative, independent of direction, and
                  additive across multi-object systems).
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <strong className="text-emerald-300 font-mono">3.1.A.3:</strong> Different
                  observers may measure different values of the translational kinetic energy of an
                  object, depending on the observer&apos;s frame of reference.
                </div>
              </div>

              {/* Suggested Skills */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-sky-500/25 space-y-2">
                <div className="text-[10px] font-mono uppercase font-bold text-sky-400">
                  Suggested Skills (AP Science Practices)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <strong className="text-emerald-300 font-mono">1.C:</strong> Create qualitative
                    sketches of graphs representing model features or system behavior.
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <strong className="text-emerald-300 font-mono">2.C:</strong> Compare physical
                    quantities between two or more scenarios or at different times/locations.
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <strong className="text-emerald-300 font-mono">3.B:</strong> Apply an
                    appropriate law, definition, theoretical relationship, or model to make a claim.
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                    <strong className="text-emerald-300 font-mono">3.C:</strong> Justify or support
                    a claim using evidence from experimental data or physical principles.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
