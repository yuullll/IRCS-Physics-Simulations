'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import {
  AxisAlignment,
  BUILDER_SCENARIOS,
  BuilderAuditResult,
  BuilderScenarioId,
  CollinearPreset,
  Forces22Mode,
  Forces22Params,
  Forces22Record,
  SystemSelection,
  auditBuilderFbd,
  createDefaultForces22Params,
  evaluateForces22,
  getBuilderScenario,
} from '@/lib/physics/forces-fbd-2-2';
import { Forces22Viewport } from './forces22/Forces22Viewport';
import { Forces22AnalysisPanel } from './forces22/Forces22AnalysisPanel';
import { MathFormula } from '@/components/ui/MathFormula';

export interface ForcesFbd22WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const MODE_OPTIONS: {
  id: Forces22Mode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'incline_axes',
    label: 'Incline & Axes',
    sub: 'Rotated x′ ∥ a',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'collinear_sidebyside',
    label: 'Parallel Forces',
    sub: 'Side-by-Side Rule',
    icon: <ArrowDownUp className="w-3.5 h-3.5" />,
  },
  {
    id: 'interaction_system',
    label: 'Interactions',
    sub: 'A+B vs Self-Force',
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    id: 'fbd_builder',
    label: 'FBD Builder',
    sub: 'AP Audit Lab',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
];

export const ForcesFbd22Workbench: React.FC<ForcesFbd22WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Forces22Params>(() =>
    createDefaultForces22Params('incline_axes')
  );
  const [builderSelectedIds, setBuilderSelectedIds] = useState<string[]>(['fg', 'fn']);
  const [builderAudit, setBuilderAudit] = useState<BuilderAuditResult | null>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [records, setRecords] = useState<Forces22Record[]>([]);

  const evaluation = useMemo(
    () => evaluateForces22(params, builderSelectedIds),
    [params, builderSelectedIds]
  );

  // Smooth playback loop for sliding incline / parallel pull / pushed blocks
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
        if (prev.mode === 'fbd_builder') return prev;
        const nextT = prev.simTimeS + dt * 0.85;
        return { ...prev, simTimeS: nextT > 2.2 ? 0 : nextT };
      });
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const handleModeChange = useCallback(
    (mode: Forces22Mode) => {
      setIsPlaying(false);
      setParams(prev => ({
        ...createDefaultForces22Params(mode),
        showFbdDotOnly: prev.showFbdDotOnly,
      }));
      setBuilderAudit(null);
      if (mode === 'fbd_builder') {
        setBuilderSelectedIds(['fg', 'fn']);
      }
    },
    []
  );

  const handleBuilderScenarioChange = (scenarioId: BuilderScenarioId) => {
    setParams(prev => ({ ...prev, builderScenario: scenarioId }));
    setBuilderSelectedIds(['fg']);
    setBuilderAudit(null);
  };

  const handleToggleBuilderVector = (id: string) => {
    setBuilderAudit(null);
    setBuilderSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAuditBuilder = () => {
    const res = auditBuilderFbd(params.builderScenario, builderSelectedIds);
    setBuilderAudit(res);
    onToast?.(res.passed ? 'AP FBD Audit Passed!' : 'AP FBD Audit found issues to fix');
  };

  const handleShowBuilderSolution = () => {
    const spec = getBuilderScenario(params.builderScenario);
    const reqIds = spec.candidates.filter(c => c.isRequired).map(c => c.id);
    setBuilderSelectedIds(reqIds);
    const res = auditBuilderFbd(params.builderScenario, reqIds);
    setBuilderAudit(res);
    onToast?.(`Loaded AP-compliant solution for ${spec.shortTitle}`);
  };

  const handleRecordTrial = useCallback(() => {
    const id = `fbd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let label = '';
    let detail = '';
    if (params.mode === 'incline_axes') {
      label = `Incline θ=${params.inclineAngleDeg}° (${params.axisAlignment})`;
      detail = `m=${params.massKg.toFixed(1)}kg, μ=${params.muFriction.toFixed(2)}, trig=${evaluation.decomposedCountActive}`;
    } else if (params.mode === 'collinear_sidebyside') {
      label = `Parallel (${params.collinearPreset.replace(/_/g, ' ')})`;
      detail = `F1=${params.force1N}N, F2=${params.force2N}N`;
    } else if (params.mode === 'interaction_system') {
      label = `System: ${params.systemSelection}`;
      detail = `F_app=${params.appliedPushN}N, F_A↔B=${evaluation.internalContactForceN.toFixed(1)}N`;
    } else {
      label = `Builder: ${getBuilderScenario(params.builderScenario).shortTitle}`;
      detail = `${evaluation.forces.length} vectors selected`;
    }
    setRecords(prev => [
      {
        id,
        label,
        forceCount: evaluation.forces.length,
        netForceN: evaluation.netForceMagN,
        accelMps2: evaluation.accelMagMps2,
        axisAngleDeg: evaluation.axisAngleDeg,
        detail,
      },
      ...prev.slice(0, 7),
    ]);
    onToast?.(`Recorded FBD trial: ${label}`);
  }, [evaluation, onToast, params]);

  const handleReset = () => {
    setIsPlaying(false);
    setParams(createDefaultForces22Params(params.mode));
    setBuilderAudit(null);
    if (params.mode === 'fbd_builder') {
      setBuilderSelectedIds(['fg', 'fn']);
    }
    onToast?.('Reset Topic 2.2 parameters');
  };

  const activeBuilderSpec = getBuilderScenario(params.builderScenario);

  return (
    <div className="relative w-full h-full bg-[#040b09] overflow-hidden select-none">
      {/* 3D / 2D Interactive WebGL Stage */}
      <Forces22Viewport
        params={params}
        evaluation={evaluation}
        viewMode={externalViewMode}
        builderAudit={builderAudit}
      />

      {/* Centered Top HUD Readout Pill (Clean, non-overlapping below top nav) */}
      <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-20 max-w-[560px]">
        <div className="bg-[#061410]/95 border border-emerald-500/35 rounded-xl px-4 py-1.5 shadow-2xl text-center">
          <div className="text-[10px] font-mono tracking-wide text-emerald-300 truncate">
            {evaluation.hudTopTitle}
          </div>
          <div className="text-xs font-mono font-bold text-amber-300 tabular-nums truncate">
            {evaluation.hudTopValue}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LEFT CONTROL DOCK                                                     */}
      {/* ===================================================================== */}
      <aside
        aria-label="Forces and Free-Body Diagrams Controls"
        className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.5rem)] flex flex-col bg-[#061410]/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white tracking-tight truncate">
                2.2 Forces &amp; FBD Lab
              </h2>
              <div className="text-[10px] font-mono text-emerald-300/80 truncate">
                LO 2.2.A &amp; 2.2.B · AP FBD
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-semibold text-emerald-200 transition flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="View AP Physics C Topic 2.2 Course Requirements"
            >
              <BookOpen className="w-3 h-3 shrink-0" />
              <span>CED 2.2</span>
            </button>
            <button
              onClick={() => setIsLeftCollapsed(v => !v)}
              aria-label={
                isLeftCollapsed ? 'Expand Topic 2.2 controls' : 'Collapse Topic 2.2 controls'
              }
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              {isLeftCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!isLeftCollapsed && (
          <div className="p-3.5 overflow-y-auto space-y-3 text-xs">
            {/* 4-Mode Selector Grid */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-300">Investigation Mode</span>
                <span className="font-mono text-emerald-400">LO 2.2.A &amp; 2.2.B</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MODE_OPTIONS.map(m => {
                  const active = params.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleModeChange(m.id)}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold shadow-lg shadow-emerald-500/15'
                          : 'bg-[#040d0a] border-emerald-500/20 text-slate-200 hover:border-emerald-400/50'
                      }`}
                    >
                      <span className="shrink-0">{m.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[11px] leading-tight truncate">{m.label}</span>
                        <span
                          className={`block text-[9.5px] font-mono leading-tight truncate ${
                            active ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {m.sub}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============================================================= */}
            {/* MODE 1 CONTROLS: INCLINED PLANE & ROTATED AXES (2.2.B.4)       */}
            {/* ============================================================= */}
            {params.mode === 'incline_axes' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    Coordinate Axes Orientation (2.2.B.4)
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'aligned', label: 'Aligned (∥a)' },
                        { id: 'standard', label: 'Standard x-y' },
                        { id: 'custom', label: 'Custom φ' },
                      ] as { id: AxisAlignment; label: string }[]
                    ).map(ax => (
                      <button
                        key={ax.id}
                        onClick={() => setParams(p => ({ ...p, axisAlignment: ax.id }))}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                          params.axisAlignment === ax.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-[#071812] text-slate-300 hover:text-white border border-emerald-500/15'
                        }`}
                      >
                        {ax.label}
                      </button>
                    ))}
                  </div>
                  {params.axisAlignment === 'custom' && (
                    <div>
                      <div className="flex justify-between text-[10.5px] mb-1">
                        <span className="text-slate-300">Axis Rotation φ</span>
                        <span className="font-mono text-emerald-300 tabular-nums">
                          {params.customAxisAngleDeg}°
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Coordinate axis rotation angle"
                        min={-45}
                        max={45}
                        step={5}
                        value={params.customAxisAngleDeg}
                        onChange={e =>
                          setParams(p => ({ ...p, customAxisAngleDeg: Number(e.target.value) }))
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Incline Angle θ</span>
                      <span className="font-mono text-emerald-300 tabular-nums">
                        {params.inclineAngleDeg}°
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Incline angle degrees"
                      min={5}
                      max={55}
                      step={1}
                      value={params.inclineAngleDeg}
                      onChange={e =>
                        setParams(p => ({
                          ...p,
                          inclineAngleDeg: Number(e.target.value),
                          simTimeS: 0,
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Block Mass m</span>
                      <span className="font-mono text-amber-300 tabular-nums">
                        {params.massKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Block mass kg"
                      min={1}
                      max={12}
                      step={0.5}
                      value={params.massKg}
                      onChange={e =>
                        setParams(p => ({ ...p, massKg: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Friction Coeff μ</span>
                      <span className="font-mono text-rose-300 tabular-nums">
                        {params.muFriction.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Friction coefficient"
                      min={0}
                      max={0.7}
                      step={0.05}
                      value={params.muFriction}
                      onChange={e =>
                        setParams(p => ({ ...p, muFriction: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Up-Ramp Tension F_T</span>
                      <span className="font-mono text-sky-300 tabular-nums">
                        {params.tensionUpN.toFixed(0)} N
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Up-ramp cable tension Newtons"
                      min={0}
                      max={80}
                      step={2}
                      value={params.tensionUpN}
                      onChange={e =>
                        setParams(p => ({ ...p, tensionUpN: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* MODE 2 CONTROLS: SIDE-BY-SIDE PARALLEL FORCES                  */}
            {/* ============================================================= */}
            {params.mode === 'collinear_sidebyside' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    Same-Direction Force Presets (Boundary Rule)
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(
                      [
                        { id: 'downward_push', label: 'Downward Push + Gravity (∥ −y)' },
                        { id: 'twin_pull_right', label: 'Twin Parallel Ropes Right (∥ +x)' },
                        { id: 'double_cable_hoist', label: 'Double-Cable Vertical Hoist (∥ +y)' },
                      ] as { id: CollinearPreset; label: string }[]
                    ).map(pr => (
                      <button
                        key={pr.id}
                        onClick={() =>
                          setParams(p => ({ ...p, collinearPreset: pr.id, simTimeS: 0 }))
                        }
                        className={`py-1.5 px-2.5 rounded-lg text-[10.5px] text-left font-semibold transition cursor-pointer ${
                          params.collinearPreset === pr.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-[#071812] text-slate-300 hover:text-white border border-emerald-500/15'
                        }`}
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Object Mass m</span>
                      <span className="font-mono text-amber-300 tabular-nums">
                        {params.massKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Object mass kg"
                      min={1}
                      max={10}
                      step={0.5}
                      value={params.massKg}
                      onChange={e =>
                        setParams(p => ({ ...p, massKg: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">
                        {params.collinearPreset === 'downward_push'
                          ? 'Applied Push F_push'
                          : 'Cable / Rope 1 Tension'}
                      </span>
                      <span className="font-mono text-emerald-300 tabular-nums">
                        {params.force1N.toFixed(0)} N
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Primary parallel force Newtons"
                      min={8}
                      max={60}
                      step={2}
                      value={params.force1N}
                      onChange={e =>
                        setParams(p => ({ ...p, force1N: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  {params.collinearPreset !== 'downward_push' && (
                    <div>
                      <div className="flex justify-between text-[10.5px] mb-1">
                        <span className="text-slate-300">Cable / Rope 2 Tension</span>
                        <span className="font-mono text-teal-300 tabular-nums">
                          {params.force2N.toFixed(0)} N
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Secondary parallel force Newtons"
                        min={8}
                        max={60}
                        step={2}
                        value={params.force2N}
                        onChange={e =>
                          setParams(p => ({ ...p, force2N: Number(e.target.value), simTimeS: 0 }))
                        }
                        className="w-full accent-teal-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* MODE 3 CONTROLS: INTERACTIONS & SYSTEM BOUNDARY (2.2.A.1–2)    */}
            {/* ============================================================= */}
            {params.mode === 'interaction_system' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    Choose FBD System Boundary (2.2.A.1.ii)
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'whole_ab', label: 'System A+B' },
                        { id: 'block_a', label: 'Block A' },
                        { id: 'block_b', label: 'Block B' },
                      ] as { id: SystemSelection; label: string }[]
                    ).map(sys => (
                      <button
                        key={sys.id}
                        onClick={() => setParams(p => ({ ...p, systemSelection: sys.id }))}
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                          params.systemSelection === sys.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-[#071812] text-slate-300 hover:text-white border border-emerald-500/15'
                        }`}
                      >
                        {sys.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Applied Push F_app</span>
                      <span className="font-mono text-emerald-300 tabular-nums">
                        {params.appliedPushN.toFixed(0)} N
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Applied push Newtons"
                      min={10}
                      max={80}
                      step={2}
                      value={params.appliedPushN}
                      onChange={e =>
                        setParams(p => ({
                          ...p,
                          appliedPushN: Number(e.target.value),
                          simTimeS: 0,
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Mass Block A (m_A)</span>
                      <span className="font-mono text-emerald-300 tabular-nums">
                        {params.massAKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Mass of Block A"
                      min={1}
                      max={8}
                      step={0.5}
                      value={params.massAKg}
                      onChange={e =>
                        setParams(p => ({ ...p, massAKg: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10.5px] mb-1">
                      <span className="text-slate-300">Mass Block B (m_B)</span>
                      <span className="font-mono text-rose-300 tabular-nums">
                        {params.massBKg.toFixed(1)} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Mass of Block B"
                      min={1}
                      max={8}
                      step={0.5}
                      value={params.massBKg}
                      onChange={e =>
                        setParams(p => ({ ...p, massBKg: Number(e.target.value), simTimeS: 0 }))
                      }
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setParams(p => ({ ...p, showMicroContact: !p.showMicroContact }))
                    }
                    className={`w-full py-1.5 px-2.5 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                      params.showMicroContact
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#071812] border-emerald-500/20 text-slate-300 hover:text-white'
                    }`}
                  >
                    {params.showMicroContact
                      ? 'Hide Interatomic Contact View'
                      : 'Show Interatomic Electric View (2.2.A.2)'}
                  </button>
                </div>
              </>
            )}

            {/* ============================================================= */}
            {/* MODE 4 CONTROLS: AP FBD BUILDER & AUDIT                        */}
            {/* ============================================================= */}
            {params.mode === 'fbd_builder' && (
              <>
                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-2">
                  <div className="text-[10px] font-semibold text-emerald-300">
                    AP Exam FBD Challenge
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BUILDER_SCENARIOS.map(sc => (
                      <button
                        key={sc.id}
                        onClick={() => handleBuilderScenarioChange(sc.id)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition cursor-pointer truncate ${
                          params.builderScenario === sc.id
                            ? 'bg-emerald-400 text-slate-950 font-bold'
                            : 'bg-[#071812] text-slate-300 hover:text-white border border-emerald-500/15'
                        }`}
                      >
                        {sc.shortTitle}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-300 leading-snug">
                    {activeBuilderSpec.description}
                  </p>
                </div>

                <div className="bg-[#040d0a] border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                  <div className="text-[10px] font-semibold text-slate-300 mb-1">
                    Toggle Vectors on COM Dot:
                  </div>
                  {activeBuilderSpec.candidates.map(c => {
                    const isOn = builderSelectedIds.includes(c.id);
                    const isFlagged =
                      builderAudit &&
                      builderAudit.illegalSelections.some(i => i.symbol === c.symbol);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleToggleBuilderVector(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[10.5px] transition flex items-center justify-between gap-2 cursor-pointer ${
                          isFlagged
                            ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                            : isOn
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-semibold'
                            : 'bg-[#071812] border-emerald-500/15 text-slate-300 hover:border-emerald-400/40'
                        }`}
                      >
                        <span className="truncate">
                          <span className="font-mono font-bold mr-1.5" style={{ color: c.colorHex }}>
                            {c.symbol}
                          </span>
                          <span>{c.label}</span>
                        </span>
                        <span className="font-mono text-[9.5px] shrink-0">
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}

                  <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                    <button
                      onClick={handleAuditBuilder}
                      className="py-2 px-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Audit AP FBD</span>
                    </button>
                    <button
                      onClick={handleShowBuilderSolution}
                      className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-[11px] transition cursor-pointer"
                    >
                      Show Solution
                    </button>
                  </div>

                  {builderAudit && (
                    <div
                      className={`mt-1.5 rounded-lg p-2 text-[10.5px] leading-snug border ${
                        builderAudit.passed
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="font-semibold mb-0.5">{builderAudit.summary}</div>
                      {builderAudit.illegalSelections.map((ill, idx) => (
                        <div key={idx} className="text-[10px] text-rose-200/90 mt-1">
                          • <strong>{ill.symbol}:</strong> {ill.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Playback & Display Toggles */}
            {params.mode !== 'fbd_builder' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(v => !v)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause Motion' : 'Play Motion'}</span>
                </button>
                <button
                  onClick={handleReset}
                  aria-label="Reset Topic 2.2 parameters"
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* AP Exam FBD Presentation Toggles */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setParams(p => ({ ...p, showFbdDotOnly: !p.showFbdDotOnly }))}
                className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                  params.showFbdDotOnly
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-[#040d0a] border-emerald-500/20 text-slate-300 hover:text-white'
                }`}
              >
                {params.showFbdDotOnly ? 'COM Dot Only ✓' : 'COM Dot Only'}
              </button>
              {params.mode === 'incline_axes' ? (
                <button
                  onClick={() =>
                    setParams(p => ({
                      ...p,
                      showScratchpadComponents: !p.showScratchpadComponents,
                    }))
                  }
                  className={`py-1.5 px-2 rounded-lg border text-[10.5px] font-semibold transition cursor-pointer ${
                    params.showScratchpadComponents
                      ? 'bg-violet-500/20 border-violet-400 text-violet-200'
                      : 'bg-[#040d0a] border-emerald-500/20 text-slate-300 hover:text-white'
                  }`}
                >
                  {params.showScratchpadComponents ? 'Scratchpad ✓' : 'Off-Exam Comp.'}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="py-1.5 px-2 rounded-lg border bg-[#040d0a] border-emerald-500/20 text-slate-300 hover:text-white text-[10.5px] font-semibold transition cursor-pointer"
                >
                  Reset View
                </button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* RIGHT AP SKILLS ANALYSIS DOCK                                         */}
      {/* ===================================================================== */}
      <Forces22AnalysisPanel
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
            <span className="text-amber-300">F_g Gravity (Field)</span>
            <span className="text-sky-300">F_N Normal (Contact)</span>
            <span className="text-rose-300">f Friction (Contact)</span>
            <span className="text-emerald-300">F_T / F_app External</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CED 2.2 COURSE REQUIREMENTS MODAL                                     */}
      {/* ===================================================================== */}
      {isCedOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AP Physics C Topic 2.2 Forces and Free-Body Diagrams Requirements"
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#061410] border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-xs text-slate-200"
          >
            <div className="flex items-start justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <div className="text-[10px] font-mono text-emerald-400">
                  AP Physics C: Mechanics · Unit 2: Force and Translational Dynamics
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Topic 2.2: Forces and Free-Body Diagrams
                </h3>
              </div>
              <button
                onClick={() => setIsCedOpen(false)}
                aria-label="Close Topic 2.2 course requirements"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="font-bold text-emerald-300">
                LO 2.2.A — Describe a force as an interaction between two objects or systems
              </div>
              <p>
                <strong>2.2.A.1:</strong> Forces are vector quantities describing interactions
                between objects or systems.
              </p>
              <p>
                <strong>2.2.A.1.i:</strong> A force exerted on an object or system is always due to
                the interaction of that object or system with another object or system.
              </p>
              <p>
                <strong>2.2.A.1.ii:</strong> An object or system cannot exert a net force on itself.
              </p>
              <p>
                <strong>2.2.A.2:</strong> Contact forces describe the interaction of an object or
                system touching another object or system and are macroscopic effects of interatomic
                electric forces.
              </p>
            </div>

            <div className="space-y-2.5 bg-[#040d0a] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="font-bold text-emerald-300">
                LO 2.2.B — Describe the forces exerted on an object or system using a free-body
                diagram
              </div>
              <p>
                <strong>2.2.B.1–2:</strong> Free-body diagrams visualize every force exerted on a
                single object or system by the environment and translate the physical setup into
                equations:{' '}
                <MathFormula formulaKey="sim-forces22" className="text-emerald-300 ml-1" />
              </p>
              <p>
                <strong>2.2.B.3:</strong> Forces are represented as vectors originating from the
                center-of-mass dot; the system is treated as though all its mass is located at the
                center of mass.
              </p>
              <p>
                <strong>2.2.B.4:</strong> Aligning one coordinate axis parallel to the direction of
                acceleration (such as along an inclined plane) simplifies translation from the FBD
                to algebraic equations.
              </p>
              <div className="bg-amber-950/40 border border-amber-500/35 rounded-lg p-2.5 text-amber-100">
                <strong>AP Exam Boundary Statement:</strong> Depict ONLY the forces exerted on
                objects, <strong>never force components</strong>, on free-body diagrams. Draw each
                force as an individual straight arrow originating on the dot; forces in the same
                direction must be drawn <strong>side by side, not overlapping</strong>.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <span className="font-mono text-[10.5px] text-slate-400">
                Suggested Skills: 1.A · 2.C · 3.B · 3.C
              </span>
              <a
                href="/assets/aistudio/Topic_2.2_course_requirements_c1106d87.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <span>Open Official Topic 2.2 PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForcesFbd22Workbench;
