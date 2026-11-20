'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Hand,
  Link2,
  Magnet,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Unlink,
  X,
  Zap,
} from 'lucide-react';
import {
  Charging82Params,
  Charging82Scenario,
  ComparisonTrialRecord,
  TRIBO_PAIRS,
  TriboMaterialPair,
  applyGroundedInductionStep,
  computeInducedMagnitude,
  createDefaultCharging82Params,
  evaluateCharging82State,
} from '@/lib/physics/charge-conservation-8-2';
import { Charging82Viewport } from './charging82/Charging82Viewport';
import { Charging82AnalysisPanel } from './charging82/Charging82AnalysisPanel';

export interface ChargeConservation82WorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

const SCENARIO_TABS: {
  id: Charging82Scenario;
  shortLabel: string;
  ekTag: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'friction_tribo',
    shortLabel: 'Friction',
    ekTag: '8.2.A.1.i',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'conduction_contact',
    shortLabel: 'Contact',
    ekTag: '8.2.A.1.i',
    icon: <Link2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'induction_polarization',
    shortLabel: 'Induction',
    ekTag: '8.2.A.1.ii-iii',
    icon: <Magnet className="w-3.5 h-3.5" />,
  },
  {
    id: 'grounding_earth',
    shortLabel: 'Grounding',
    ekTag: '8.2.A.3',
    icon: <Power className="w-3.5 h-3.5" />,
  },
];

export const ChargeConservation82Workbench: React.FC<ChargeConservation82WorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
}) => {
  const [params, setParams] = useState<Charging82Params>(() =>
    createDefaultCharging82Params('friction_tribo')
  );
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [showCarriers, setShowCarriers] = useState(true);
  const [showFlowArrows, setShowFlowArrows] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [isCedOpen, setIsCedOpen] = useState(false);
  const [trials, setTrials] = useState<ComparisonTrialRecord[]>([]);

  // Smooth interactive animation states (rubbing stroke & conduction equilibration)
  const [rubAnimPhase, setRubAnimPhase] = useState(0);
  const animTimerRef = useRef<number | null>(null);

  const simState = useMemo(() => evaluateCharging82State(params), [params]);

  const clearActiveAnim = useCallback(() => {
    if (animTimerRef.current !== null) {
      window.clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearActiveAnim();
  }, [clearActiveAnim]);

  const handleSelectScenario = (scenario: Charging82Scenario) => {
    clearActiveAnim();
    setRubAnimPhase(0);
    setParams(createDefaultCharging82Params(scenario));
  };

  // Animated "Rub Rod & Cloth" stroke for Scenario 1
  const handleRunRubAnimation = () => {
    clearActiveAnim();
    let step = 0;
    const totalSteps = 22;
    setParams(prev => ({ ...prev, rubProgress: 0 }));
    animTimerRef.current = window.setInterval(() => {
      step += 1;
      const frac = Math.min(1, step / totalSteps);
      setRubAnimPhase(frac < 1 ? frac * Math.PI * 4 : 0);
      setParams(prev => ({ ...prev, rubProgress: Number(frac.toFixed(2)) }));
      if (step >= totalSteps) {
        clearActiveAnim();
        setRubAnimPhase(0);
        onToast?.('Triboelectric transfer complete: Q_rod + Q_cloth = 0 conserved.');
      }
    }, 55);
  };

  // Animated "Touch & Equilibrate" for Scenario 2
  const handleTouchSpheres = () => {
    clearActiveAnim();
    let step = 0;
    const totalSteps = 16;
    setParams(prev => ({ ...prev, contactPhase: 'touching', contactProgress: 0 }));
    animTimerRef.current = window.setInterval(() => {
      step += 1;
      const frac = Math.min(1, step / totalSteps);
      setParams(prev => ({
        ...prev,
        contactPhase: 'touching',
        contactProgress: Number(frac.toFixed(2)),
      }));
      if (step >= totalSteps) {
        clearActiveAnim();
        onToast?.('Electrostatic equilibrium reached (V_A = V_B). Separate spheres to lock.');
      }
    }, 55);
  };

  const handleSeparateContactSpheres = () => {
    clearActiveAnim();
    setParams(prev => ({ ...prev, contactPhase: 'after', contactProgress: 1 }));
    onToast?.('Spheres separated with equilibrated conserved charges.');
  };

  // Toggle separating/reconnecting touching polarized spheres in Scenario 3
  const handleToggleInductionSeparate = () => {
    if (!params.spheresSeparated) {
      const inducedMag = computeInducedMagnitude(params.rodCharge, params.rodProximity);
      const trappedQA = Number((-Math.sign(params.rodCharge) * inducedMag).toFixed(2));
      setParams(prev => ({
        ...prev,
        spheresSeparated: true,
        lockedInducedQ: trappedQA,
      }));
      onToast?.(
        `Spheres A & B separated — locked Q_A = ${trappedQA >= 0 ? '+' : ''}${trappedQA.toFixed(1)}, Q_B = ${-trappedQA >= 0 ? '+' : ''}${(-trappedQA).toFixed(1)}.`
      );
    } else {
      setParams(prev => ({
        ...prev,
        spheresSeparated: false,
        lockedInducedQ: 0,
      }));
      onToast?.('Spheres A & B brought back into contact.');
    }
  };

  // Toggle ground switch in Scenario 4 (honors real physical order of operations!)
  const handleToggleGround = () => {
    const nextGrounded = !params.isGrounded;
    if (params.groundingMode === 'direct_ground') {
      setParams(prev => ({ ...prev, isGrounded: nextGrounded }));
      onToast?.(
        nextGrounded
          ? 'Ground switch CLOSED: electrons exchange with Earth until Q_sphere = 0.'
          : 'Ground switch OPEN: sphere is electrically isolated.'
      );
    } else if (nextGrounded) {
      const inducedMag = computeInducedMagnitude(params.groundRodCharge, params.groundRodProximity);
      const liveQ = Number((-Math.sign(params.groundRodCharge) * inducedMag).toFixed(2));
      setParams(prev => ({
        ...prev,
        isGrounded: true,
        groundStep: 2,
        trappedGroundQ: liveQ,
      }));
      onToast?.('Ground switch CLOSED: Earth exchanges electrons with sphere.');
    } else {
      const inducedMag = computeInducedMagnitude(params.groundRodCharge, params.groundRodProximity);
      const lockedQ = Number((-Math.sign(params.groundRodCharge) * inducedMag).toFixed(2));
      setParams(prev => ({
        ...prev,
        isGrounded: false,
        groundStep: prev.groundRodProximity > 0.2 ? 3 : 4,
        trappedGroundQ: lockedQ,
      }));
      onToast?.(
        `Ground switch OPENED: trapped Q = ${lockedQ >= 0 ? '+' : ''}${lockedQ.toFixed(1)} q₀ on sphere.`
      );
    }
  };

  // Record a Skill 2.C comparison trial snapshot
  const handleRecordTrial = () => {
    const sysObjs = simState.objects.filter(o => o.role === 'system');
    const earthObj = simState.objects.find(o => o.id === 'earth');
    const obj1 = sysObjs[0];
    const obj2 = sysObjs[1];

    const labelMap: Record<Charging82Scenario, string> = {
      friction_tribo: `Friction (${TRIBO_PAIRS[params.triboPair].rodName.split(' ')[0]})`,
      conduction_contact: `Contact (R=${params.radiusA.toFixed(1)}:${params.radiusB.toFixed(1)})`,
      induction_polarization:
        params.inductionTarget === 'conductor_pair'
          ? `Induction (${params.spheresSeparated ? 'Separated' : 'Touching'})`
          : 'Insulator Polarization',
      grounding_earth:
        params.groundingMode === 'direct_ground'
          ? `Direct Ground (${params.isGrounded ? 'Closed' : 'Open'})`
          : `Grounded Ind. (Step ${params.groundStep})`,
    };

    const record: ComparisonTrialRecord = {
      id: `trial_${Date.now()}`,
      label: labelMap[params.scenario],
      scenario: params.scenario,
      qAInitial: obj1?.initialCharge ?? 0,
      qBInitial: obj2?.initialCharge ?? 0,
      qAFinal: obj1?.netCharge ?? 0,
      qBFinal: obj2?.netCharge ?? 0,
      qEarthDelta: earthObj?.netCharge ?? 0,
      qTotalBefore: simState.systemInitialCharge,
      qTotalAfter: Number(
        (simState.systemCurrentCharge + simState.surroundingsDeltaCharge).toFixed(2)
      ),
      notes: simState.flow.summary,
    };

    setTrials(prev => [record, ...prev].slice(0, 12));
    onToast?.(`Logged comparison snapshot: ${record.label}`);
  };

  const handleResetCurrent = () => {
    clearActiveAnim();
    setRubAnimPhase(0);
    setParams(createDefaultCharging82Params(params.scenario));
    onToast?.('Reset scenario parameters to defaults.');
  };

  return (
    <div className="relative w-full h-full bg-[#050811] overflow-hidden select-none">
      {/* FULL-VIEWPORT 3D / 2D LABORATORY CANVAS */}
      <Charging82Viewport
        params={params}
        simState={simState}
        viewMode={externalViewMode}
        showCarriers={showCarriers}
        showFlowArrows={showFlowArrows}
        showFieldLines={showFieldLines}
        rubAnimPhase={rubAnimPhase}
      />

      {/* ================================================================= */}
      {/* LEFT FLOATING CONTROLS DOCK (E&M NAVY/SKY THEME, NO BACKDROP BLUR) */}
      {/* ================================================================= */}
      <div className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.75rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col space-y-3 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                8.2 Charge Conservation Lab
              </div>
              <div className="text-[10px] font-mono text-sky-400">
                Unit 8 · AP Physics C: E&amp;M
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCedOpen(true)}
              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
              title="Open AP Physics C Topic 8.2 CED Requirements"
            >
              <BookOpen className="w-3 h-3" />
              <span>CED 8.2</span>
            </button>
            <button
              onClick={() => setIsLeftCollapsed(prev => !prev)}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
              title={isLeftCollapsed ? 'Expand Controls' : 'Collapse Controls'}
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
            {/* 4 Charging Mechanism Scenario Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span>Charging Mechanism</span>
                <span className="text-sky-400">LO 8.2.A</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SCENARIO_TABS.map(tab => {
                  const active = params.scenario === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectScenario(tab.id)}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-sky-400/20 border-sky-400 text-white shadow-md'
                          : 'bg-[#050811] border-white/10 text-slate-300 hover:border-sky-500/40'
                      }`}
                    >
                      <span className={active ? 'text-sky-300' : 'text-slate-400'}>
                        {tab.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold leading-tight truncate">
                          {tab.shortLabel}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400">{tab.ekTag}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SCENARIO 1 CONTROLS: FRICTION / TRIBOELECTRIC */}
            {params.scenario === 'friction_tribo' && (
              <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Triboelectric Material Pair (8.2.A.1.i)
                </div>
                <div className="space-y-1">
                  {(['glass_silk', 'teflon_wool', 'acrylic_fur'] as TriboMaterialPair[]).map(
                    pairId => {
                      const meta = TRIBO_PAIRS[pairId];
                      const active = params.triboPair === pairId;
                      return (
                        <button
                          key={pairId}
                          onClick={() =>
                            setParams(prev => ({
                              ...prev,
                              triboPair: pairId,
                              rubProgress: 0.65,
                            }))
                          }
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-medium transition flex items-center justify-between cursor-pointer ${
                            active
                              ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                              : 'bg-[#0a1224] border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span>{meta.label}</span>
                          <span className="text-[9px] font-mono text-sky-300">
                            {meta.electronFlowDirection === 'rod_to_cloth' ? 'Rod→Cloth' : 'Cloth→Rod'}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Rubbing Contact Progress</span>
                    <span className="font-mono font-bold text-sky-300">
                      {Math.round(params.rubProgress * 100)}% ({Math.round(params.rubProgress * params.maxTriboTransfer)} e⁻)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={params.rubProgress}
                    onChange={e =>
                      setParams(prev => ({ ...prev, rubProgress: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={handleRunRubAnimation}
                    className="py-2 px-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Rub Together</span>
                  </button>
                  <button
                    onClick={() => setParams(prev => ({ ...prev, rubProgress: 0 }))}
                    className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-semibold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Neutralize</span>
                  </button>
                </div>
              </div>
            )}

            {/* SCENARIO 2 CONTROLS: CONTACT / CONDUCTION */}
            {params.scenario === 'conduction_contact' && (
              <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                    Conductor Initial State
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setParams(prev => ({
                          ...prev,
                          radiusA: 1.0,
                          radiusB: 1.0,
                          contactPhase: 'before',
                          contactProgress: 0,
                        }))
                      }
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] font-mono text-slate-300 border border-white/10 cursor-pointer"
                    >
                      1:1 Equal
                    </button>
                    <button
                      onClick={() =>
                        setParams(prev => ({
                          ...prev,
                          initialQA: 9,
                          initialQB: 0,
                          radiusA: 1.6,
                          radiusB: 0.8,
                          contactPhase: 'before',
                          contactProgress: 0,
                        }))
                      }
                      className="px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-[9px] font-mono text-sky-300 border border-sky-400/30 cursor-pointer"
                    >
                      2:1 Radii
                    </button>
                  </div>
                </div>

                {/* Initial Q_A */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Q_A</span>
                    <span
                      className={`font-mono font-bold ${
                        params.initialQA > 0
                          ? 'text-red-400'
                          : params.initialQA < 0
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {params.initialQA > 0 ? '+' : ''}
                      {params.initialQA} q₀
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="9"
                    step="1"
                    value={params.initialQA}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        initialQA: parseInt(e.target.value, 10),
                        contactPhase: 'before',
                        contactProgress: 0,
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Initial Q_B */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Initial Q_B</span>
                    <span
                      className={`font-mono font-bold ${
                        params.initialQB > 0
                          ? 'text-red-400'
                          : params.initialQB < 0
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {params.initialQB > 0 ? '+' : ''}
                      {params.initialQB} q₀
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="9"
                    step="1"
                    value={params.initialQB}
                    onChange={e =>
                      setParams(prev => ({
                        ...prev,
                        initialQB: parseInt(e.target.value, 10),
                        contactPhase: 'before',
                        contactProgress: 0,
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Radii R_A & R_B */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Radius R_A</span>
                      <span className="text-white">{params.radiusA.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.2"
                      value={params.radiusA}
                      onChange={e =>
                        setParams(prev => ({
                          ...prev,
                          radiusA: parseFloat(e.target.value),
                          contactPhase: 'before',
                          contactProgress: 0,
                        }))
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Radius R_B</span>
                      <span className="text-white">{params.radiusB.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.2"
                      value={params.radiusB}
                      onChange={e =>
                        setParams(prev => ({
                          ...prev,
                          radiusB: parseFloat(e.target.value),
                          contactPhase: 'before',
                          contactProgress: 0,
                        }))
                      }
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={handleTouchSpheres}
                    className="py-2 px-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Touch Spheres</span>
                  </button>
                  <button
                    onClick={handleSeparateContactSpheres}
                    disabled={params.contactPhase === 'before'}
                    className={`py-2 px-2 rounded-xl font-semibold text-[11px] border transition flex items-center justify-center gap-1 ${
                      params.contactPhase === 'before'
                        ? 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-white cursor-pointer'
                    }`}
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Separate</span>
                  </button>
                </div>
              </div>
            )}

            {/* SCENARIO 3 CONTROLS: INDUCTION & POLARIZATION */}
            {params.scenario === 'induction_polarization' && (
              <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Neutral Target System (8.2.A.1.ii–iii)
                </div>
                <div className="grid grid-cols-2 gap-1 bg-[#0a1224] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() =>
                      setParams(prev => ({
                        ...prev,
                        inductionTarget: 'conductor_pair',
                        rodProximity: 0.9,
                        spheresSeparated: false,
                        lockedInducedQ: 0,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      params.inductionTarget === 'conductor_pair'
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Conductors A &amp; B
                  </button>
                  <button
                    onClick={() =>
                      setParams(prev => ({
                        ...prev,
                        inductionTarget: 'neutral_insulator',
                        rodProximity: 0.9,
                        spheresSeparated: false,
                        lockedInducedQ: 0,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      params.inductionTarget === 'neutral_insulator'
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Neutral Insulator
                  </button>
                </div>

                {/* Inducing Rod Charge */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Inducing Rod Charge</span>
                    <span
                      className={`font-mono font-bold ${
                        params.rodCharge > 0
                          ? 'text-red-400'
                          : params.rodCharge < 0
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {params.rodCharge > 0 ? '+' : ''}
                      {params.rodCharge} q₀
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="1"
                    value={params.rodCharge}
                    onChange={e =>
                      setParams(prev => ({ ...prev, rodCharge: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Rod Proximity */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Rod Proximity (No Contact)</span>
                    <span className="font-mono font-bold text-sky-300">
                      {Math.round(params.rodProximity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={params.rodProximity}
                    onChange={e =>
                      setParams(prev => ({ ...prev, rodProximity: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {params.inductionTarget === 'conductor_pair' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={handleToggleInductionSeparate}
                      className={`py-2 px-2 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer ${
                        params.spheresSeparated
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                      }`}
                    >
                      {params.spheresSeparated ? (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Reconnect A &amp; B</span>
                        </>
                      ) : (
                        <>
                          <Unlink className="w-3.5 h-3.5" />
                          <span>Separate A &amp; B</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setParams(prev => ({
                          ...prev,
                          rodProximity: prev.rodProximity > 0.2 ? 0 : 0.9,
                        }))
                      }
                      className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-[11px] transition cursor-pointer"
                    >
                      {params.rodProximity > 0.2 ? 'Pull Rod Away' : 'Bring Rod Near'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SCENARIO 4 CONTROLS: GROUNDING & EARTH RESERVOIR */}
            {params.scenario === 'grounding_earth' && (
              <div className="p-3 rounded-xl bg-[#050811] border border-white/10 space-y-2.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Earth Grounding Lab (8.2.A.3)
                </div>

                <div className="grid grid-cols-2 gap-1 bg-[#0a1224] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() =>
                      setParams(prev => applyGroundedInductionStep(prev, 1))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      params.groundingMode === 'induction_ground'
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    4-Step Induction
                  </button>
                  <button
                    onClick={() =>
                      setParams(prev => ({
                        ...prev,
                        groundingMode: 'direct_ground',
                        isGrounded: false,
                        groundInitialQ: 6,
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      params.groundingMode === 'direct_ground'
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Direct Discharge
                  </button>
                </div>

                {params.groundingMode === 'direct_ground' ? (
                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Initial Sphere Q₀</span>
                        <span
                          className={`font-mono font-bold ${
                            params.groundInitialQ > 0
                              ? 'text-red-400'
                              : params.groundInitialQ < 0
                              ? 'text-blue-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {params.groundInitialQ > 0 ? '+' : ''}
                          {params.groundInitialQ} q₀
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="1"
                        value={params.groundInitialQ}
                        onChange={e =>
                          setParams(prev => ({
                            ...prev,
                            groundInitialQ: parseInt(e.target.value, 10),
                            isGrounded: false,
                          }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={handleToggleGround}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        params.isGrounded
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {params.isGrounded ? 'Open Ground Switch' : 'Close Ground Switch (Connect Earth)'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Guided 4-Step Sequence Buttons */}
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { step: 1, label: '1. Rod Near' },
                        { step: 2, label: '2. Close Ground' },
                        { step: 3, label: '3. Open Ground' },
                        { step: 4, label: '4. Remove Rod' },
                      ].map(item => (
                        <button
                          key={item.step}
                          onClick={() =>
                            setParams(prev => applyGroundedInductionStep(prev, item.step))
                          }
                          className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                            params.groundStep === item.step
                              ? 'bg-sky-400 text-slate-950 border-sky-300'
                              : 'bg-[#0a1224] text-slate-300 border-white/10 hover:border-sky-400/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Inducing Rod Charge & Manual Switch Override */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Inducing Rod Q</span>
                        <span
                          className={`font-mono font-bold ${
                            params.groundRodCharge > 0
                              ? 'text-red-400'
                              : params.groundRodCharge < 0
                              ? 'text-blue-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {params.groundRodCharge > 0 ? '+' : ''}
                          {params.groundRodCharge} q₀
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="1"
                        value={params.groundRodCharge}
                        onChange={e =>
                          setParams(prev => ({
                            ...prev,
                            groundRodCharge: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Rod Proximity</span>
                        <span className="font-mono font-bold text-sky-300">
                          {Math.round(params.groundRodProximity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={params.groundRodProximity}
                        onChange={e =>
                          setParams(prev => ({
                            ...prev,
                            groundRodProximity: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={handleToggleGround}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        params.isGrounded
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        Ground Switch: {params.isGrounded ? 'CLOSED (Connected)' : 'OPEN (Isolated)'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Visual Layer Toggles & Reset */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              <div className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => setShowCarriers(v => !v)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    showCarriers
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-[#050811] border-white/10 text-slate-400'
                  }`}
                >
                  +/− Ions
                </button>
                <button
                  onClick={() => setShowFlowArrows(v => !v)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    showFlowArrows
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-[#050811] border-white/10 text-slate-400'
                  }`}
                >
                  e⁻ Flow
                </button>
                <button
                  onClick={() => setShowFieldLines(v => !v)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                    showFieldLines
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-[#050811] border-white/10 text-slate-400'
                  }`}
                >
                  E-Field
                </button>
              </div>
              <button
                onClick={handleResetCurrent}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer"
                title="Reset Scenario"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* RIGHT FLOATING AP ANALYSIS DOCK (1.A CHARTS / 2.C / 3.B-3.C)       */}
      {/* ================================================================= */}
      <div className="absolute top-20 right-4 z-20 w-[356px] max-h-[calc(100vh-6.75rem)] overflow-y-auto bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col space-y-3 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-bold text-white">AP Charge Conservation Analysis</span>
          </div>
          <button
            onClick={() => setIsRightCollapsed(prev => !prev)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition cursor-pointer"
            title={isRightCollapsed ? 'Expand Analysis' : 'Collapse Analysis'}
          >
            {isRightCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {!isRightCollapsed && (
          <Charging82AnalysisPanel
            params={params}
            simState={simState}
            trials={trials}
            onRecordTrial={handleRecordTrial}
            onClearTrials={() => setTrials([])}
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* BOTTOM COMPACT LEGEND & LIVE PHYSICS STATUS BAR                    */}
      {/* ================================================================= */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[92vw] bg-[#080e1e]/95 border border-sky-500/30 rounded-2xl px-4 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]">
        <div className="flex items-center gap-1.5 font-mono text-red-300">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
            +
          </span>
          <span>Fixed Protons</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-blue-300">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
            −
          </span>
          <span>Mobile Electrons (e⁻)</span>
        </div>
        <div className="hidden md:block h-3.5 w-px bg-white/15" />
        <div className="text-sky-200 font-medium truncate max-w-[380px]">
          {simState.mechanismHeadline}
        </div>
      </div>

      {/* ================================================================= */}
      {/* TOPIC 8.2 CED COURSE REQUIREMENTS MODAL                            */}
      {/* ================================================================= */}
      {isCedOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#080e1e] border border-sky-400/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  AP Physics C: Electricity and Magnetism · Unit 8
                </div>
                <h2 className="text-lg font-extrabold text-white">
                  Topic 8.2: Conservation of Electric Charge and the Process of Charging
                </h2>
              </div>
              <button
                onClick={() => setIsCedOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                aria-label="Close CED modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-[#050811] border border-sky-500/25">
                <div className="font-mono text-sky-400 font-bold mb-1">
                  Learning Objective 8.2.A
                </div>
                <p className="text-slate-200">
                  Describe the behavior of a system using conservation of charge.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Essential Knowledge Coverage in This Simulation
                </div>
                <ul className="space-y-1.5 text-slate-300">
                  <li>
                    <strong className="text-sky-300 font-mono">8.2.A.1.i:</strong> Net charge changes due to <em>friction</em> (Triboelectric Lab) or <em>contact</em> (Conductor Conduction Lab).
                  </li>
                  <li>
                    <strong className="text-sky-300 font-mono">8.2.A.1.ii–iii:</strong> Induced charge separation polarizes conductors and <em>neutral</em> insulators via electrostatic force without contact.
                  </li>
                  <li>
                    <strong className="text-sky-300 font-mono">8.2.A.2.i–ii:</strong> Charging involves transfer of <em>electrons</em> to/from surroundings; isolated system net charge stays strictly constant.
                  </li>
                  <li>
                    <strong className="text-sky-300 font-mono">8.2.A.3:</strong> Grounding electrically connects a conductor to Earth (much larger, approximately neutral reservoir).
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-white/10">
                <div className="font-mono text-sky-400 font-bold mb-1">
                  Suggested Science Practices
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div><strong className="text-white">1.A:</strong> Charge bar charts &amp; carrier tables</div>
                  <div><strong className="text-white">2.C:</strong> Multi-trial &amp; radius comparisons</div>
                  <div><strong className="text-white">3.B:</strong> Apply conservation laws to claims</div>
                  <div><strong className="text-white">3.C:</strong> Evidence-based justification</div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <a
                href="/assets/aistudio/Topic_8.2_course_requirements_af702a88.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Official Topic 8.2 CED PDF</span>
              </a>
              <button
                onClick={() => setIsCedOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition cursor-pointer"
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
