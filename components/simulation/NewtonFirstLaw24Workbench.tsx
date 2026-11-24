'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Move,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Sliders,
  TrainFront,
  X,
} from 'lucide-react';
import {
  ConstantVPreset,
  EquilibriumPreset,
  Newton24Mode,
  Newton24Params,
  Newton24Record,
  ObserverFrame,
  computeEquilibrantForce,
  createDefaultNewton24Params,
  evaluateNewton24,
} from '@/lib/physics/newton-first-law-2-4';
import { Newton24Viewport } from './newton24/Newton24Viewport';
import { Newton24AnalysisPanel } from './newton24/Newton24AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface NewtonFirstLaw24WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Newton24Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'equilibrium',
    label: 'Equilibrium',
    sub: 'ΣF_i = 0 Vector Sum',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
  {
    id: 'constant_v',
    label: 'Constant v',
    sub: 'ΣF = 0 ⇒ v = const',
    icon: <Move className="w-3.5 h-3.5" />,
  },
  {
    id: 'axis_independence',
    label: 'Balanced Axes',
    sub: 'X Balanced · Y Unbal.',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'inertial_frame',
    label: 'Inertial Frame',
    sub: 'Railcar vs Earth Test',
    icon: <TrainFront className="w-3.5 h-3.5" />,
  },
];

export const NewtonFirstLaw24Workbench: React.FC<NewtonFirstLaw24WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Newton24Params>(() =>
    createDefaultNewton24Params('equilibrium')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<Newton24Record[]>([]);

  const evaluation = useMemo(() => evaluateNewton24(params), [params]);

  // Smooth playback clock for Constant v, Balanced Axes, and Inertial Frame labs
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
        const loopMax = prev.mode === 'constant_v' ? 4.0 : 2.4;
        const nextT = prev.simTimeS + dt * 0.85;
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

  const handleModeChange = useCallback((mode: Newton24Mode) => {
    setIsPlaying(false);
    setParams(createDefaultNewton24Params(mode));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setParams(prev => createDefaultNewton24Params(prev.mode));
  }, []);

  const handleAutoBalance = useCallback(() => {
    setParams(prev => {
      const eq = computeEquilibrantForce(
        prev.f1MagN,
        prev.f1AngleDeg,
        prev.f2MagN,
        prev.f2AngleDeg
      );
      return {
        ...prev,
        f3MagN: Number(eq.mag.toFixed(1)),
        f3AngleDeg: Math.round(eq.angleDeg),
      };
    });
    onToast?.('Applied exact equilibrant F_3 = -(F_1 + F_2) for ΣF = 0');
  }, [onToast]);

  const applyConstantVPreset = useCallback((preset: ConstantVPreset) => {
    setIsPlaying(false);
    setParams(prev => {
      if (preset === 'at_rest') {
        return { ...prev, cvPreset: preset, gliderV0Ms: 0, thrustForceN: 0, opposeForceN: 0, simTimeS: 0 };
      }
      if (preset === 'constant_cruise') {
        return { ...prev, cvPreset: preset, gliderV0Ms: 3.0, thrustForceN: 20, opposeForceN: 20, simTimeS: 0 };
      }
      return { ...prev, cvPreset: preset, gliderV0Ms: 1.5, thrustForceN: 28, opposeForceN: 12, simTimeS: 0 };
    });
  }, []);

  const handleRecordTrial = useCallback(() => {
    const id = `t24-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let rec: Newton24Record;
    if (params.mode === 'equilibrium') {
      rec = {
        id,
        modeLabel: params.eqPreset === 'force_table' ? 'Force Table' : 'Hanging Sign',
        setupSummary:
          params.eqPreset === 'force_table'
            ? `F1=${params.f1MagN}N@${params.f1AngleDeg}°, F2=${params.f2MagN}N@${params.f2AngleDeg}°, F3=${params.f3MagN}N@${params.f3AngleDeg}°`
            : `m=${params.signMassKg}kg · θ1=${params.leftCableAngleDeg}°, θ2=${params.rightCableAngleDeg}°`,
        netForceLabel: `|ΣF| = ${evaluation.fNetMag.toFixed(1)} N`,
        motionResult:
          params.eqPreset === 'force_table'
            ? `Equilibrant needed: ${evaluation.equilibrantMag.toFixed(1)} N @ ${evaluation.equilibrantAngleDeg.toFixed(0)}°`
            : `T_1 = ${evaluation.signTensionLeftN.toFixed(1)} N, T_2 = ${evaluation.signTensionRightN.toFixed(1)} N`,
        verdict: evaluation.isEquilibrium ? 'Translational Equilibrium (ΣF = 0)' : 'Unbalanced (ΣF ≠ 0)',
      };
    } else if (params.mode === 'constant_v') {
      rec = {
        id,
        modeLabel: 'Constant v Lab',
        setupSummary: `v0=${params.gliderV0Ms}m/s · F_thrust=${params.thrustForceN}N, F_oppose=${params.opposeForceN}N`,
        netForceLabel: `ΣF_x = ${evaluation.fNetX.toFixed(1)} N`,
        motionResult: `a_x = ${evaluation.accelX.toFixed(2)} m/s², v_x(t) = ${evaluation.vxNow.toFixed(1)} m/s`,
        verdict: evaluation.isVxConstant ? 'Velocity strictly constant (2.4.A.3)' : 'Accelerating (ΣF_x ≠ 0)',
      };
    } else if (params.mode === 'axis_independence') {
      rec = {
        id,
        modeLabel: 'Balanced Axes',
        setupSummary: `ΣF_x=${evaluation.fNetX.toFixed(0)}N, ΣF_y=${evaluation.fNetY.toFixed(0)}N (m=${params.puckMassKg}kg)`,
        netForceLabel: `|ΣF| = ${evaluation.fNetMag.toFixed(1)} N`,
        motionResult: `v_x=${evaluation.vxNow.toFixed(1)} m/s, v_y=${evaluation.vyNow.toFixed(1)} m/s`,
        verdict: evaluation.isVxConstant ? 'X invariant · Y changes independently (2.4.A.4)' : 'Both axes accelerating',
      };
    } else {
      rec = {
        id,
        modeLabel: 'Reference Frame',
        setupSummary: `Observer=${params.observerFrame} · v_car=${params.railcarV0Ms}m/s, a_car=${params.railcarAccelMs2}m/s²`,
        netForceLabel: 'ΣF_real,x = 0 N',
        motionResult: `a_puck/car=${evaluation.puckCarAx.toFixed(1)} m/s², Plumb θ=${evaluation.plumbTiltDeg.toFixed(1)}°`,
        verdict: evaluation.isFrameInertial ? 'Inertial Frame (1st Law holds)' : 'Non-Inertial Frame (1st Law fails)',
      };
    }
    setRecords(prev => [rec, ...prev].slice(0, 12));
    onToast?.('Trial logged in Skill 2.C Comparison Table');
  }, [params, evaluation, onToast]);

  const activeTitle =
    params.mode === 'equilibrium'
      ? params.eqPreset === 'force_table'
        ? 'Vector Sum & Force Table Equilibrium'
        : 'Hanging Sign Static Equilibrium'
      : params.mode === 'constant_v'
      ? 'Constant Velocity & Inertia Track'
      : params.mode === 'axis_independence'
      ? 'Balanced vs. Unbalanced Axes (2D)'
      : 'Inertial vs. Non-Inertial Frames';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#040d0a] text-slate-100 select-none">
      {/* FULL-SCREEN 3D/2D WEBGL VIEWPORT */}
      <Newton24Viewport params={params} evaluation={evaluation} viewMode={externalViewMode} />

      {/* ===================================================================== */}
      {/* TOP CENTER HUD BANNER (Positioned cleanly below global top pods)      */}
      {/* ===================================================================== */}
      <div className="pointer-events-none fixed top-[76px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center max-w-[630px]">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#061410]/95 border border-emerald-500/30 rounded-2xl px-3.5 py-1.5 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[9.5px] font-mono text-emerald-400 tracking-wide whitespace-nowrap">
              UNIT 2 · TOPIC 2.4 · NEWTON’S FIRST LAW
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] font-bold text-white tracking-tight whitespace-nowrap">
                {activeTitle}
              </h1>
              <span className="text-slate-600">·</span>
              <MathFormula formulaKey="sim-newton24" className="text-emerald-300 text-[11.5px] shrink-0" />
            </div>
          </div>

          <button
            onClick={() => setIsCedOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CED 2.4</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEFT PARAMETER & MODE CONTROL DOCK                                    */}
      {/* ===================================================================== */}
      <aside
        aria-label="Topic 2.4 Controls"
        className="absolute top-20 left-4 z-20 w-[322px] max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              First-Law Lab Controls
            </span>
          </div>
          <button
            onClick={() => setIsLeftCollapsed(v => !v)}
            aria-label={isLeftCollapsed ? 'Expand controls panel' : 'Collapse controls panel'}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isLeftCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
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
            {/* MODE 1: VECTOR SUM & TRANSLATIONAL EQUILIBRIUM (2.4.A.1-2)      */}
            {/* =============================================================== */}
            {params.mode === 'equilibrium' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'force_table', label: '3-Force Table' },
                      { id: 'hanging_sign', label: 'Hanging Sign' },
                    ] as { id: EquilibriumPreset; label: string }[]
                  ).map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => setParams(p => ({ ...p, eqPreset: pr.id }))}
                      className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                        params.eqPreset === pr.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                {params.eqPreset === 'force_table' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">F_1 Mag</span>
                          <span className="font-mono text-emerald-300 tabular-nums">{params.f1MagN.toFixed(0)} N</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={40}
                          step={1}
                          value={params.f1MagN}
                          onChange={e => setParams(p => ({ ...p, f1MagN: Number(e.target.value) }))}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">θ_1</span>
                          <span className="font-mono text-emerald-300 tabular-nums">{params.f1AngleDeg.toFixed(0)}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={355}
                          step={5}
                          value={params.f1AngleDeg}
                          onChange={e => setParams(p => ({ ...p, f1AngleDeg: Number(e.target.value) }))}
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">F_2 Mag</span>
                          <span className="font-mono text-sky-300 tabular-nums">{params.f2MagN.toFixed(0)} N</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={40}
                          step={1}
                          value={params.f2MagN}
                          onChange={e => setParams(p => ({ ...p, f2MagN: Number(e.target.value) }))}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">θ_2</span>
                          <span className="font-mono text-sky-300 tabular-nums">{params.f2AngleDeg.toFixed(0)}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={355}
                          step={5}
                          value={params.f2AngleDeg}
                          onChange={e => setParams(p => ({ ...p, f2AngleDeg: Number(e.target.value) }))}
                          className="w-full accent-sky-400 cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/15">
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">F_3 Mag</span>
                          <span className="font-mono text-amber-300 tabular-nums">{params.f3MagN.toFixed(1)} N</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={60}
                          step={0.5}
                          value={params.f3MagN}
                          onChange={e => setParams(p => ({ ...p, f3MagN: Number(e.target.value) }))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-300">θ_3</span>
                          <span className="font-mono text-amber-300 tabular-nums">{params.f3AngleDeg.toFixed(0)}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={359}
                          step={1}
                          value={params.f3AngleDeg}
                          onChange={e => setParams(p => ({ ...p, f3AngleDeg: Number(e.target.value) }))}
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleAutoBalance}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      Auto-Balance (Set ΣF = 0)
                    </button>

                    <button
                      onClick={() => setParams(p => ({ ...p, showTipToTail: !p.showTipToTail }))}
                      className={`w-full py-1.5 px-3 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                        params.showTipToTail
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                      }`}
                    >
                      {params.showTipToTail ? '3D Tip-to-Tail Loop Visible ✓' : 'Show 3D Tip-to-Tail Loop'}
                    </button>
                  </>
                ) : (
                  <>
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Sign Mass (m)</span>
                        <span className="font-mono font-bold text-amber-300 tabular-nums">
                          {params.signMassKg.toFixed(1)} kg
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={params.signMassKg}
                        onChange={e => setParams(p => ({ ...p, signMassKg: Number(e.target.value) }))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </label>
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Left Cable Angle (θ_1)</span>
                        <span className="font-mono font-bold text-emerald-300 tabular-nums">
                          {params.leftCableAngleDeg.toFixed(0)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={75}
                        step={5}
                        value={params.leftCableAngleDeg}
                        onChange={e => setParams(p => ({ ...p, leftCableAngleDeg: Number(e.target.value) }))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </label>
                    <label className="block space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Right Cable Angle (θ_2)</span>
                        <span className="font-mono font-bold text-sky-300 tabular-nums">
                          {params.rightCableAngleDeg.toFixed(0)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={75}
                        step={5}
                        value={params.rightCableAngleDeg}
                        onChange={e => setParams(p => ({ ...p, rightCableAngleDeg: Number(e.target.value) }))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 2: CONSTANT VELOCITY & INERTIA (EK 2.4.A.3)                */}
            {/* =============================================================== */}
            {params.mode === 'constant_v' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'at_rest', label: 'At Rest' },
                      { id: 'constant_cruise', label: 'Cruise v≠0' },
                      { id: 'unbalanced_thrust', label: 'Unbalanced' },
                    ] as { id: ConstantVPreset; label: string }[]
                  ).map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => applyConstantVPreset(pr.id)}
                      className={`py-1.5 px-1.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                        params.cvPreset === pr.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Velocity (v_x0)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.gliderV0Ms >= 0 ? '+' : ''}
                      {params.gliderV0Ms.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={6}
                    step={0.5}
                    value={params.gliderV0Ms}
                    onChange={e => setParams(p => ({ ...p, gliderV0Ms: Number(e.target.value), simTimeS: 0 }))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Forward Thruster (F_thrust)</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      {params.thrustForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={2}
                    value={params.thrustForceN}
                    onChange={e => setParams(p => ({ ...p, thrustForceN: Number(e.target.value), simTimeS: 0 }))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Opposing Drag / Brake (F_oppose)</span>
                    <span className="font-mono font-bold text-rose-300 tabular-nums">
                      {params.opposeForceN.toFixed(0)} N
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={2}
                    value={params.opposeForceN}
                    onChange={e => setParams(p => ({ ...p, opposeForceN: Number(e.target.value), simTimeS: 0 }))}
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </label>

                <button
                  onClick={() =>
                    setParams(p => ({ ...p, opposeForceN: p.thrustForceN, cvPreset: 'constant_cruise', simTimeS: 0 }))
                  }
                  className="w-full py-1.5 px-3 rounded-lg border bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/40 text-emerald-200 text-[10.5px] font-semibold transition cursor-pointer"
                >
                  Match Forces (Set F_oppose = F_thrust ⇒ ΣF_x = 0)
                </button>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 3: BALANCED VS UNBALANCED AXES (EK 2.4.A.4)                */}
            {/* =============================================================== */}
            {params.mode === 'axis_independence' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">F_x+</span>
                      <span className="font-mono text-emerald-300">{params.fxPlusN} N</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={params.fxPlusN}
                      onChange={e => setParams(p => ({ ...p, fxPlusN: Number(e.target.value), simTimeS: 0 }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">F_x-</span>
                      <span className="font-mono text-emerald-300">{params.fxMinusN} N</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={params.fxMinusN}
                      onChange={e => setParams(p => ({ ...p, fxMinusN: Number(e.target.value), simTimeS: 0 }))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">F_y+</span>
                      <span className="font-mono text-rose-300">{params.fyPlusN} N</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={params.fyPlusN}
                      onChange={e => setParams(p => ({ ...p, fyPlusN: Number(e.target.value), simTimeS: 0 }))}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </label>
                  <label className="block space-y-1">
                    <div className="flex justify-between text-[10.5px]">
                      <span className="text-slate-300">F_y-</span>
                      <span className="font-mono text-sky-300">{params.fyMinusN} N</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={params.fyMinusN}
                      onChange={e => setParams(p => ({ ...p, fyMinusN: Number(e.target.value), simTimeS: 0 }))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Horizontal Velocity (v_x0)</span>
                    <span className="font-mono font-bold text-emerald-300 tabular-nums">
                      +{params.puckVx0Ms.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={params.puckVx0Ms}
                    onChange={e => setParams(p => ({ ...p, puckVx0Ms: Number(e.target.value), simTimeS: 0 }))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                <button
                  onClick={() => setParams(p => ({ ...p, showStrobeDots: !p.showStrobeDots }))}
                  className={`w-full py-1.5 px-3 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                    params.showStrobeDots
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                  }`}
                >
                  {params.showStrobeDots ? 'Equal-Δt Strobe Dots Active ✓' : 'Show Strobe Dots'}
                </button>
              </div>
            )}

            {/* =============================================================== */}
            {/* MODE 4: INERTIAL VS NON-INERTIAL REFERENCE FRAMES (EK 2.4.A.5)  */}
            {/* =============================================================== */}
            {params.mode === 'inertial_frame' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[10.5px] font-semibold text-emerald-300">
                    Observer Reference Frame
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'earth', label: 'Earth Frame' },
                        { id: 'railcar', label: 'Inside Railcar' },
                      ] as { id: ObserverFrame; label: string }[]
                    ).map(obs => (
                      <button
                        key={obs.id}
                        onClick={() => setParams(p => ({ ...p, observerFrame: obs.id }))}
                        className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                          params.observerFrame === obs.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                        }`}
                      >
                        {obs.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Inertial vs Non-Inertial Car State Toggle */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setParams(p => ({ ...p, railcarAccelMs2: 0, simTimeS: 0 }))}
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      Math.abs(params.railcarAccelMs2) < 0.05
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Inertial (a=0)
                  </button>
                  <button
                    onClick={() =>
                      setParams(p => ({
                        ...p,
                        railcarAccelMs2: Math.abs(p.railcarAccelMs2) < 0.05 ? 3.0 : p.railcarAccelMs2,
                        simTimeS: 0,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      Math.abs(params.railcarAccelMs2) >= 0.05
                        ? 'bg-rose-400 text-slate-950 border-rose-300 font-bold'
                        : 'bg-[#040d0a] border-emerald-500/20 text-slate-300'
                    }`}
                  >
                    Accelerating
                  </button>
                </div>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Railcar Acceleration (a_car)</span>
                    <span className="font-mono font-bold text-rose-300 tabular-nums">
                      {params.railcarAccelMs2 >= 0 ? '+' : ''}
                      {params.railcarAccelMs2.toFixed(1)} m/s²
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-5}
                    max={5}
                    step={0.5}
                    value={params.railcarAccelMs2}
                    onChange={e =>
                      setParams(p => ({ ...p, railcarAccelMs2: Number(e.target.value), simTimeS: 0 }))
                    }
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </label>

                <label className="block space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Railcar Initial Speed (v_car,0)</span>
                    <span className="font-mono font-bold text-sky-300 tabular-nums">
                      {params.railcarV0Ms.toFixed(1)} m/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={params.railcarV0Ms}
                    onChange={e =>
                      setParams(p => ({ ...p, railcarV0Ms: Number(e.target.value), simTimeS: 0 }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Playback & Reset Controls */}
            <div className="flex items-center gap-2 pt-1">
              {params.mode !== 'equilibrium' && (
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
                aria-label="Reset Topic 2.4 parameters"
                className={`${
                  params.mode === 'equilibrium'
                    ? 'flex-1 py-2 px-3 justify-center gap-1.5 text-xs font-semibold'
                    : 'p-2'
                } rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition cursor-pointer flex items-center`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {params.mode === 'equilibrium' && <span>Reset Defaults</span>}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT AP SKILLS ANALYSIS DOCK                                         */}
      {/* ===================================================================== */}
      <Newton24AnalysisPanel
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
            <span className="text-emerald-300">Balanced / Constant Axis</span>
            <span className="text-rose-300">Unbalanced Net Force / Non-Inertial</span>
            <span className="text-sky-300">Velocity / Normal / Cable T_2</span>
            <span className="text-amber-300">Equilibrant / Gravity / Strobe</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CED 2.4 COURSE REQUIREMENTS MODAL                                     */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AP Physics C Topic 2.4 Newton's First Law Requirements"
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#061410] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-xs text-slate-200"
          >
            <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono text-emerald-400">
                  AP Physics C: Mechanics · Unit 2: Force and Translational Dynamics
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 2.4: Newton’s First Law
                </h3>
              </div>
              <button
                onClick={() => setIsCedOpen(false)}
                aria-label="Close Topic 2.4 course requirements"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="font-bold text-emerald-300">
                LO 2.4.A — Describe the conditions under which a system’s velocity remains constant
              </div>
              <p>
                <strong>2.4.A.1:</strong> The net force on a system is the vector sum of all forces
                exerted on the system.
              </p>
              <p>
                <strong>2.4.A.2:</strong> Translational equilibrium is the configuration of forces
                such that the net force exerted on a system is zero:{' '}
                <MathFormula formulaKey="sim-newton24" className="text-emerald-300 ml-1" />
              </p>
              <p>
                <strong>2.4.A.3:</strong> Newton’s first law states that if the net force exerted
                on a system is zero, the velocity of that system will remain constant.
              </p>
              <p>
                <strong>2.4.A.4:</strong> Forces may be balanced in one dimension but unbalanced in
                another. The system’s velocity will change only in the direction of the unbalanced
                force.
              </p>
              <p>
                <strong>2.4.A.5:</strong> An inertial reference frame is one from which an observer
                would verify Newton’s first law of motion.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <span className="font-mono text-[10.5px] text-slate-400">
                Suggested Skills: 1.C · 2.B · 2.C · 3.C
              </span>
              <a
                href="/assets/aistudio/Topic_2.4_course_requirements_d715bdcc.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Official Topic 2.4 PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewtonFirstLaw24Workbench;
