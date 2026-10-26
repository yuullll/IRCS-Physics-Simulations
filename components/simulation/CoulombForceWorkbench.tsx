'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Zap,
  Sliders,
  Scale,
  Sparkles,
  Info,
  ChevronDown,
  Trash2,
  Shield,
  Activity,
  CheckCircle2,
  Plus,
} from 'lucide-react';

// Physical Constants
const EPSILON_0 = 8.8541878128e-12; // C^2 / (N·m^2)
const COULOMB_K_VACUUM = 1 / (4 * Math.PI * EPSILON_0); // ~8.98755e9 N·m^2/C^2
const GRAVITATIONAL_G = 6.6743e-11; // N·m^2/kg^2
const ELEMENTARY_CHARGE = 1.602176634e-19; // Coulombs
const PROTON_MASS = 1.67262192e-27; // kg
const ELECTRON_MASS = 9.1093837e-31; // kg
const ALPHA_MASS = 6.6446572e-27; // kg

export type ParticleArchetype =
  | 'proton'
  | 'electron'
  | 'alpha'
  | 'positron'
  | 'macro_pos'
  | 'macro_neg'
  | 'custom';

export interface CoulombCharge {
  id: string;
  name: string;
  archetype: ParticleArchetype;
  qMicro: number; // in microCoulombs
  useElementaryUnits: boolean;
  qElementary: number; // in units of e (e.g. +1, -1, +2)
  massKg: number; // mass in kilograms
  x: number; // meters in simulation space (-11.5 to +11.5)
  y: number; // meters in simulation space (-6.5 to +6.5)
  color: string;
}

export interface DielectricMedium {
  id: string;
  name: string;
  kappa: number; // relative permittivity
  description: string;
  polarizationStrength: number;
}

export const DIELECTRIC_PRESETS: DielectricMedium[] = [
  {
    id: 'vacuum',
    name: 'Vacuum (Free Space)',
    kappa: 1.0,
    description: 'Reference permittivity ε₀ = 8.854×10⁻¹² F/m. Maximum unattenuated electrostatic force.',
    polarizationStrength: 0.0,
  },
  {
    id: 'air',
    name: 'Air at STP',
    kappa: 1.00059,
    description: 'Dry air near 1 atm. Negligible difference (~0.06% reduction) from pure vacuum.',
    polarizationStrength: 0.05,
  },
  {
    id: 'oil',
    name: 'Transformer Oil',
    kappa: 2.2,
    description: 'Insulating mineral dielectric oil. Induces moderate polarization, cutting Coulomb force by ~55%.',
    polarizationStrength: 0.35,
  },
  {
    id: 'paper',
    name: 'Cellulose / Paper',
    kappa: 3.7,
    description: 'Solid fibrous insulator. Electrostatic force reduced to 27% of vacuum value.',
    polarizationStrength: 0.55,
  },
  {
    id: 'glass',
    name: 'Pyrex Glass',
    kappa: 5.0,
    description: 'Rigid silicate lattice. Electron cloud distortion attenuates electric force to 20%.',
    polarizationStrength: 0.7,
  },
  {
    id: 'water',
    name: 'Pure Water (20°C)',
    kappa: 80.4,
    description: 'High dipole moment liquid. Drastic ~80-fold reduction in Coulomb force (allows ionic dissociation).',
    polarizationStrength: 0.95,
  },
  {
    id: 'conductor',
    name: 'Static Conductor (Faraday Shield)',
    kappa: 10000,
    description: 'Free electrons redistribute instantaneously to completely cancel and shield the electrostatic field (F_E → 0).',
    polarizationStrength: 1.0,
  },
];

interface CoulombForceWorkbenchProps {
  onToast?: (msg: string) => void;
}

export const CoulombForceWorkbench: React.FC<CoulombForceWorkbenchProps> = ({ onToast }) => {
  // Charges state (2 to 4 charges, fulfilling AP Physics C limit)
  const [charges, setCharges] = useState<CoulombCharge[]>([
    {
      id: 'q1',
      name: 'Charge 1 (q₁)',
      archetype: 'macro_pos',
      qMicro: 3.0,
      useElementaryUnits: false,
      qElementary: 1,
      massKg: 0.001,
      x: -4.0,
      y: 0.0,
      color: '#f43f5e', // Ruby / Positive
    },
    {
      id: 'q2',
      name: 'Charge 2 (q₂)',
      archetype: 'macro_neg',
      qMicro: -3.0,
      useElementaryUnits: false,
      qElementary: -1,
      massKg: 0.001,
      x: 4.0,
      y: 0.0,
      color: '#38bdf8', // Sky / Negative
    },
  ]);

  const [selectedChargeId, setSelectedChargeId] = useState<string>('q1');
  const [selectedMediumId, setSelectedMediumId] = useState<string>('vacuum');
  const [customKappa, setCustomKappa] = useState<number>(1.0);
  const [showGravitationalComparison] = useState<boolean>(true);
  const [showSuperpositionVectors, setShowSuperpositionVectors] = useState<boolean>(true);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'macro' | 'atomic'>('macro');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingChargeId, setDraggingChargeId] = useState<string | null>(null);

  // Active medium permittivity kappa
  const activeMedium = DIELECTRIC_PRESETS.find(m => m.id === selectedMediumId) || DIELECTRIC_PRESETS[0];
  const effectiveKappa = selectedMediumId === 'custom' ? customKappa : activeMedium.kappa;
  const effectiveCoulombK = COULOMB_K_VACUUM / effectiveKappa;

  // Selected charge
  const selectedCharge = charges.find(c => c.id === selectedChargeId) || charges[0];

  // Helper to get net charge in Coulombs
  const getChargeCoulombs = useCallback((c: CoulombCharge): number => {
    if (c.useElementaryUnits) {
      return c.qElementary * ELEMENTARY_CHARGE;
    }
    return c.qMicro * 1e-6;
  }, []);

  // Compute pairwise Coulomb and Gravitational forces
  const pairwiseInteractions = useMemo(() => {
    const list: {
      fromId: string;
      toId: string;
      r: number;
      feMag: number;
      fgMag: number;
      ratio: number;
      feVec: { x: number; y: number };
      isRepulsive: boolean;
    }[] = [];

    for (let i = 0; i < charges.length; i++) {
      for (let j = 0; j < charges.length; j++) {
        if (i === j) continue;
        const c1 = charges[i];
        const c2 = charges[j];
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const r = Math.max(0.1, Math.hypot(dx, dy));

        const q1 = getChargeCoulombs(c1);
        const q2 = getChargeCoulombs(c2);

        // |F_E| = (1 / 4πε) * |q1 * q2| / r^2
        const feMag = (effectiveCoulombK * Math.abs(q1 * q2)) / (r * r);

        // F_G = G * m1 * m2 / r^2
        const fgMag = (GRAVITATIONAL_G * c1.massKg * c2.massKg) / (r * r);

        const ratio = fgMag > 0 ? feMag / fgMag : Infinity;

        // Force on c2 due to c1:
        // If same sign (q1 * q2 > 0): repulsive, points away from c1 along (c2 - c1)
        // If opposite sign (q1 * q2 < 0): attractive, points toward c1 along -(c2 - c1)
        const isRepulsive = q1 * q2 > 0;
        const dirSign = isRepulsive ? 1 : -1;
        const feVec = {
          x: dirSign * (dx / r) * feMag,
          y: dirSign * (dy / r) * feMag,
        };

        list.push({
          fromId: c1.id,
          toId: c2.id,
          r,
          feMag,
          fgMag,
          ratio,
          feVec,
          isRepulsive,
        });
      }
    }
    return list;
  }, [charges, effectiveCoulombK, getChargeCoulombs]);

  // Compute Net Force on each charge (Vector Superposition: F_net = sum F_ij)
  const netForces = useMemo(() => {
    const map = new Map<string, { fx: number; fy: number; mag: number }>();
    charges.forEach(c => {
      const incoming = pairwiseInteractions.filter(p => p.toId === c.id);
      const fx = incoming.reduce((acc, p) => acc + p.feVec.x, 0);
      const fy = incoming.reduce((acc, p) => acc + p.feVec.y, 0);
      const mag = Math.hypot(fx, fy);
      map.set(c.id, { fx, fy, mag });
    });
    return map;
  }, [charges, pairwiseInteractions]);

  // Coordinate Conversion (Pure math on 1000x600 SVG viewBox, no ref reads during render)
  const toSvgX = (xMeters: number) => 500 + (xMeters / 12) * 450;
  const toSvgY = (yMeters: number) => 300 - (yMeters / 7) * 260;

  // Handle Dragging Charges on the 2D Coordinate Grid
  const handleMouseDownOnCharge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChargeId(id);
    setDraggingChargeId(id);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingChargeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    // Convert pixel to meter space:
    const meterX = ((pixelX - rect.width / 2) / (rect.width * 0.45)) * 12;
    const meterY = -(((pixelY - rect.height / 2) / (rect.height * 0.433)) * 7);

    setCharges(prev =>
      prev.map(c =>
        c.id === draggingChargeId
          ? {
              ...c,
              x: parseFloat(Math.max(-11.5, Math.min(11.5, meterX)).toFixed(2)),
              y: parseFloat(Math.max(-6.5, Math.min(6.5, meterY)).toFixed(2)),
            }
          : c
      )
    );
  };

  const handleMouseUpCanvas = () => {
    if (draggingChargeId) {
      setDraggingChargeId(null);
    }
  };

  // Add / Remove Charge handlers (capped at 4 charges per CED boundary statement)
  const handleAddCharge = () => {
    if (charges.length >= 4) {
      onToast?.('AP Physics C Scope: Maximum 4 interacting point charges.');
      return;
    }
    const newId = `q${charges.length + 1}`;
    const sign = charges.length % 2 === 0 ? 1 : -1;
    const newCharge: CoulombCharge = {
      id: newId,
      name: `Charge ${charges.length + 1} (${newId})`,
      archetype: sign > 0 ? 'macro_pos' : 'macro_neg',
      qMicro: sign * 2.5,
      useElementaryUnits: scaleMode === 'atomic',
      qElementary: sign * 1,
      massKg: scaleMode === 'atomic' ? (sign > 0 ? PROTON_MASS : ELECTRON_MASS) : 0.001,
      x: (charges.length - 1.5) * 3,
      y: charges.length % 2 === 0 ? 3 : -3,
      color: sign > 0 ? '#10b981' : '#f59e0b',
    };
    setCharges(prev => [...prev, newCharge]);
    setSelectedChargeId(newId);
    onToast?.(`Added ${newCharge.name} to the electrostatic system`);
  };

  const handleRemoveCharge = (id: string) => {
    if (charges.length <= 2) {
      onToast?.('A minimum of 2 charges is required to observe Coulomb force pairs.');
      return;
    }
    setCharges(prev => prev.filter(c => c.id !== id));
    if (selectedChargeId === id) {
      setSelectedChargeId(charges.find(c => c.id !== id)?.id || 'q1');
    }
  };

  // Archetype selection
  const handleApplyArchetype = (cId: string, arch: ParticleArchetype) => {
    setCharges(prev =>
      prev.map(c => {
        if (c.id !== cId) return c;
        switch (arch) {
          case 'proton':
            return {
              ...c,
              archetype: 'proton',
              useElementaryUnits: true,
              qElementary: 1,
              qMicro: ELEMENTARY_CHARGE * 1e6,
              massKg: PROTON_MASS,
              color: '#ef4444',
            };
          case 'electron':
            return {
              ...c,
              archetype: 'electron',
              useElementaryUnits: true,
              qElementary: -1,
              qMicro: -(ELEMENTARY_CHARGE * 1e6),
              massKg: ELECTRON_MASS,
              color: '#0ea5e9',
            };
          case 'alpha':
            return {
              ...c,
              archetype: 'alpha',
              useElementaryUnits: true,
              qElementary: 2,
              qMicro: 2 * ELEMENTARY_CHARGE * 1e6,
              massKg: ALPHA_MASS,
              color: '#a855f7',
            };
          case 'positron':
            return {
              ...c,
              archetype: 'positron',
              useElementaryUnits: true,
              qElementary: 1,
              qMicro: ELEMENTARY_CHARGE * 1e6,
              massKg: ELECTRON_MASS,
              color: '#ec4899',
            };
          case 'macro_pos':
            return {
              ...c,
              archetype: 'macro_pos',
              useElementaryUnits: false,
              qMicro: 5.0,
              qElementary: Math.round(5.0e-6 / ELEMENTARY_CHARGE),
              massKg: 0.001,
              color: '#f43f5e',
            };
          case 'macro_neg':
            return {
              ...c,
              archetype: 'macro_neg',
              useElementaryUnits: false,
              qMicro: -5.0,
              qElementary: -Math.round(5.0e-6 / ELEMENTARY_CHARGE),
              massKg: 0.001,
              color: '#38bdf8',
            };
          default:
            return c;
        }
      })
    );
  };

  // Primary pair (q1 and q2) for direct 1-to-1 analysis
  const primaryPair =
    pairwiseInteractions.find(p => p.fromId === 'q1' && p.toId === 'q2') ||
    pairwiseInteractions[0];
  const separationR = primaryPair ? primaryPair.r : 5.0;
  const primaryFE = primaryPair ? primaryPair.feMag : 0;
  const primaryFG = primaryPair ? primaryPair.fgMag : 0;
  const primaryRatio = primaryPair ? primaryPair.ratio : 0;

  // Format numbers nicely in scientific notation
  const formatSci = (val: number, unit = ''): string => {
    if (val === 0) return `0 ${unit}`.trim();
    if (Math.abs(val) >= 0.01 && Math.abs(val) < 10000) {
      return `${val.toFixed(3)} ${unit}`.trim();
    }
    const [mantissa, exponent] = val.toExponential(3).split('e');
    return `${mantissa} × 10${exponent.replace('+', '')} ${unit}`.trim();
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#050811] text-slate-100 overflow-hidden select-none font-sans"
      onMouseMove={handleMouseMoveCanvas}
      onMouseUp={handleMouseUpCanvas}
      onMouseLeave={handleMouseUpCanvas}
    >
      {/* Top Pedagogical Breadcrumb Bar */}
      <div className="px-5 py-3 border-b border-white/10 bg-[#070b18]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40">
                AP Physics C: E&amp;M · Topic 8.1
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight">
                Electric Charge &amp; Coulomb Force Workbench
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Inverse-Square Law · Dielectric Permittivity (ε = κε₀) · Newton&apos;s Third Law · Gravitational Comparison (F_E vs F_G)
            </p>
          </div>
        </div>

        {/* Quick Presets Menu */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#0b1328] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => {
                setScaleMode('macro');
                setCharges([
                  {
                    id: 'q1',
                    name: 'q₁ (+3.0 μC)',
                    archetype: 'macro_pos',
                    qMicro: 3.0,
                    useElementaryUnits: false,
                    qElementary: Math.round(3.0e-6 / ELEMENTARY_CHARGE),
                    massKg: 0.001,
                    x: -4.0,
                    y: 0.0,
                    color: '#f43f5e',
                  },
                  {
                    id: 'q2',
                    name: 'q₂ (-3.0 μC)',
                    archetype: 'macro_neg',
                    qMicro: -3.0,
                    useElementaryUnits: false,
                    qElementary: -Math.round(3.0e-6 / ELEMENTARY_CHARGE),
                    massKg: 0.001,
                    x: 4.0,
                    y: 0.0,
                    color: '#38bdf8',
                  },
                ]);
                setSelectedMediumId('vacuum');
                onToast?.('Loaded Macro Dipole (+3μC / -3μC)');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                scaleMode === 'macro'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Macro Charges (μC)
            </button>
            <button
              onClick={() => {
                setScaleMode('atomic');
                setCharges([
                  {
                    id: 'q1',
                    name: 'Proton p₁ (+1e)',
                    archetype: 'proton',
                    qMicro: ELEMENTARY_CHARGE * 1e6,
                    useElementaryUnits: true,
                    qElementary: 1,
                    massKg: PROTON_MASS,
                    x: -3.0,
                    y: 0.0,
                    color: '#ef4444',
                  },
                  {
                    id: 'q2',
                    name: 'Proton p₂ (+1e)',
                    archetype: 'proton',
                    qMicro: ELEMENTARY_CHARGE * 1e6,
                    useElementaryUnits: true,
                    qElementary: 1,
                    massKg: PROTON_MASS,
                    x: 3.0,
                    y: 0.0,
                    color: '#ef4444',
                  },
                ]);
                setSelectedMediumId('vacuum');
                onToast?.('Loaded Quantum Subatomic: Two Protons (FE / FG = 1.24×10³⁶)');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                scaleMode === 'atomic'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Subatomic Particles (e)
            </button>
          </div>

          <button
            onClick={() => setShowDetailsDrawer(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition ${
              showDetailsDrawer
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>AP Theory &amp; Formulas</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Interactive 2D Coordinate Grid Stage */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-gradient-to-b from-[#03060f] to-[#060a17] overflow-hidden"
        >
          {/* Background Dielectric Ambient Visualization */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700"
            style={{
              opacity: effectiveKappa > 1.05 ? 0.85 : 0.4,
              backgroundImage:
                effectiveKappa > 1.05
                  ? `radial-gradient(circle at 50% 50%, rgba(56, 189, 248, ${Math.min(
                      0.25,
                      0.05 + activeMedium.polarizationStrength * 0.2
                    )}) 0%, transparent 70%)`
                  : 'none',
            }}
          />

          {/* Pure SVG Vector & Charges Canvas (1000x600 viewBox) */}
          <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full select-none">
            <defs>
              <pattern id="gridMinor" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
              </pattern>
              <pattern id="gridMajor" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#gridMinor)" />
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255, 255, 255, 0.09)" strokeWidth="1.2" />
              </pattern>
              <marker
                id="arrowRepulsive"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
              </marker>
              <marker
                id="arrowAttractive"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker
                id="arrowNet"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#34d399" />
              </marker>
            </defs>

            <rect width="1000" height="600" fill="url(#gridMajor)" />

            {/* X and Y Center Axes */}
            <line x1="500" y1="0" x2="500" y2="600" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <line x1="0" y1="300" x2="1000" y2="300" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

            {/* Dielectric Polarized Dipoles (LO 8.1.C.2) */}
            {effectiveKappa > 1.05 && (
              <g opacity={Math.min(0.65, 0.2 + activeMedium.polarizationStrength * 0.45)}>
                {Array.from({ length: 24 }).map((_, idx) => {
                  const px = 100 + (idx % 6) * 160;
                  const py = 90 + Math.floor(idx / 6) * 140;
                  return (
                    <g key={idx} transform={`translate(${px}, ${py})`}>
                      <ellipse rx="16" ry="8" fill="none" stroke="rgba(56,189,248,0.3)" strokeDasharray="2 2" />
                      <circle cx="-7" cy="0" r="3.5" fill="#38bdf8" opacity="0.7" />
                      <circle cx="7" cy="0" r="3.5" fill="#f43f5e" opacity="0.7" />
                      <text x="-9" y="3" fontSize="8" fill="#fff" fontFamily="monospace">-</text>
                      <text x="5" y="3" fontSize="8" fill="#fff" fontFamily="monospace">+</text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Pairwise Lines of Separation & Newton's 3rd Law Force Vectors */}
            {charges.map((c1, i) =>
              charges.slice(i + 1).map(c2 => {
                const x1 = toSvgX(c1.x);
                const y1 = toSvgY(c1.y);
                const x2 = toSvgX(c2.x);
                const y2 = toSvgY(c2.y);
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                const pInteraction = pairwiseInteractions.find(
                  p => p.fromId === c1.id && p.toId === c2.id
                );
                const isRepulsive = pInteraction?.isRepulsive ?? true;
                const r = pInteraction?.r || 1.0;

                // Compute vector arrow length (normalized for clear visualization)
                const vLen = Math.min(
                  80,
                  Math.max(26, 20 + Math.log10(pInteraction?.feMag || 1) * 5)
                );
                const angle = Math.atan2(y2 - y1, x2 - x1);

                // Direction along line of separation
                const arrow1Dir = isRepulsive ? angle + Math.PI : angle;
                const arrow2Dir = isRepulsive ? angle : angle + Math.PI;

                const f1TipX = x1 + Math.cos(arrow1Dir) * vLen;
                const f1TipY = y1 + Math.sin(arrow1Dir) * vLen;
                const f2TipX = x2 + Math.cos(arrow2Dir) * vLen;
                const f2TipY = y2 + Math.sin(arrow2Dir) * vLen;

                return (
                  <g key={`${c1.id}-${c2.id}`}>
                    {/* Dashed line of separation */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.65"
                    />

                    {/* Force Vector 1 (on c1 due to c2): F_21 */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={f1TipX}
                      y2={f1TipY}
                      stroke={isRepulsive ? '#f43f5e' : '#38bdf8'}
                      strokeWidth="3.2"
                      markerEnd={isRepulsive ? 'url(#arrowRepulsive)' : 'url(#arrowAttractive)'}
                    />

                    {/* Force Vector 2 (on c2 due to c1): F_12 = -F_21 (Newton's 3rd Law) */}
                    <line
                      x1={x2}
                      y1={y2}
                      x2={f2TipX}
                      y2={f2TipY}
                      stroke={isRepulsive ? '#f43f5e' : '#38bdf8'}
                      strokeWidth="3.2"
                      markerEnd={isRepulsive ? 'url(#arrowRepulsive)' : 'url(#arrowAttractive)'}
                    />

                    {/* Separation Distance Label Callout */}
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <rect
                        x="-38"
                        y="-10"
                        width="76"
                        height="20"
                        rx="6"
                        fill="#0c1428"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#7dd3fc"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        r = {r.toFixed(2)}m
                      </text>
                    </g>
                  </g>
                );
              })
            )}

            {/* Net Force Vectors when Superposition is enabled */}
            {showSuperpositionVectors &&
              charges.length > 2 &&
              charges.map(c => {
                const cx = toSvgX(c.x);
                const cy = toSvgY(c.y);
                const net = netForces.get(c.id);
                if (!net || net.mag === 0) return null;

                const netAngle = Math.atan2(-net.fy, net.fx);
                const netLen = Math.min(90, Math.max(30, 24 + Math.log10(net.mag) * 5));
                const tipX = cx + Math.cos(netAngle) * netLen;
                const tipY = cy + Math.sin(netAngle) * netLen;

                return (
                  <g key={`net-${c.id}`}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={tipX}
                      y2={tipY}
                      stroke="#34d399"
                      strokeWidth="3.6"
                      markerEnd="url(#arrowNet)"
                    />
                    <text
                      x={tipX + 8}
                      y={tipY + 4}
                      fill="#34d399"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      ∑F_E
                    </text>
                  </g>
                );
              })}

            {/* Draggable Point Charges */}
            {charges.map(c => {
              const cx = toSvgX(c.x);
              const cy = toSvgY(c.y);
              const isSelected = c.id === selectedChargeId;
              const qVal = getChargeCoulombs(c);
              const isPositive = qVal > 0;

              return (
                <g
                  key={c.id}
                  transform={`translate(${cx}, ${cy})`}
                  onMouseDown={e => handleMouseDownOnCharge(c.id, e)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      r="28"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      opacity="0.8"
                    />
                  )}

                  {/* Main Particle Sphere */}
                  <circle
                    r="20"
                    fill={c.color}
                    stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />

                  {/* Sign Symbol */}
                  <text
                    x="0"
                    y="6"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontFamily="monospace"
                    fontWeight="900"
                    pointerEvents="none"
                  >
                    {isPositive ? '+' : '−'}
                  </text>

                  {/* Charge Label Pill */}
                  <g transform="translate(0, 36)" pointerEvents="none">
                    <rect
                      x="-42"
                      y="-9"
                      width="84"
                      height="18"
                      rx="6"
                      fill="#080e20"
                      stroke={isSelected ? '#38bdf8' : 'rgba(255,255,255,0.2)'}
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isPositive ? '#6ee7b7' : '#7dd3fc'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {c.name.split(' ')[0]}:{' '}
                      {c.useElementaryUnits
                        ? `${c.qElementary > 0 ? '+' : ''}${c.qElementary}e`
                        : `${c.qMicro.toFixed(1)}μC`}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Bottom Left Canvas Legend & Mode Indicator */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="bg-[#080e22]/90 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-[11px] space-y-1 shadow-xl">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Scale className="w-3.5 h-3.5 text-cyan-400" />
                <span>Coulomb Force Interactions (LO 8.1.A.3)</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                  <span>Repulsive Force (Like Signs)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  <span>Attractive Force (Opposite)</span>
                </span>
                {charges.length > 2 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                    <span>Net Resultant Vector (∑ F_E)</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
                Newton&apos;s 3rd Law: F₁₂ = -F₂₁ · Line of separation = line of force
              </div>
            </div>
          </div>

          {/* Floating Instruction Banner */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#070e20]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-slate-300 pointer-events-none flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Drag charges on the grid to change separation <strong>r</strong>. Watch force vectors update in real time.
            </span>
          </div>
        </div>

        {/* Right Cockpit Parameter & Telemetry Controls Dock */}
        <div className="w-96 border-l border-white/10 bg-[#060a16] flex flex-col overflow-y-auto shrink-0 z-20">
          <div className="p-4 border-b border-white/10 bg-[#080e20] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Laboratory Cockpit
              </span>
            </div>
            <button
              onClick={handleAddCharge}
              disabled={charges.length >= 4}
              className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] transition flex items-center gap-1"
              title="Add 3rd or 4th point charge for vector superposition"
            >
              <Plus className="w-3 h-3" />
              <span>Add Charge ({charges.length}/4)</span>
            </button>
          </div>

          <div className="p-4 space-y-5 text-xs text-slate-300">
            {/* Live Primary Interaction Quantitative Telemetry */}
            <div className="p-4 rounded-2xl bg-[#091226] border border-cyan-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Calculated Force Readout</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  r = {separationR.toFixed(2)} m
                </span>
              </div>

              {/* Electrostatic Force Magnitude |F_E| */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Coulomb Electrostatic Force |F_E|:</span>
                  <span className={primaryPair?.isRepulsive ? 'text-rose-400' : 'text-sky-400'}>
                    {primaryPair?.isRepulsive ? 'Repulsive' : 'Attractive'}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-cyan-300 tracking-tight">
                  {formatSci(primaryFE, 'N')}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Formula: |F_E| = k·|q₁q₂| / (κ · r²)
                </div>
              </div>

              {/* Gravitational Comparison (Learning Objective 8.1.B) */}
              {showGravitationalComparison && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Gravitational Force F_G:</span>
                    <span className="text-emerald-400 font-medium">Always Attractive</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-300">
                    {formatSci(primaryFG, 'N')}
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1 mt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Strength Ratio (F_E / F_G):</span>
                      <span className="font-mono font-bold text-amber-300">
                        {primaryRatio > 1e6 ? formatSci(primaryRatio) : primaryRatio.toFixed(1)}×
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {scaleMode === 'atomic'
                        ? 'At quantum scales, electrostatic force is ~10³⁶ times stronger than gravity! Gravity only dominates macroscopic worlds because net charge cancels to zero.'
                        : 'For macroscopic 1g masses, electrostatic forces easily overwhelm gravitation by billions of times.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dielectric Permittivity Section (Learning Objective 8.1.C) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Medium Permittivity (ε = κε₀)</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">
                  κ = {effectiveKappa.toFixed(2)}
                </span>
              </div>

              <select
                value={selectedMediumId}
                onChange={e => setSelectedMediumId(e.target.value)}
                className="w-full bg-[#0a1122] border border-white/10 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-cyan-400"
              >
                {DIELECTRIC_PRESETS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} (κ = {m.kappa})
                  </option>
                ))}
                <option value="custom">Custom Dielectric (Manual Slider)</option>
              </select>

              {selectedMediumId === 'custom' && (
                <div className="p-3 bg-[#0a1122] rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Relative Permittivity (κ):</span>
                    <span className="text-cyan-300 font-mono font-bold">
                      {customKappa.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="0.5"
                    value={customKappa}
                    onChange={e => setCustomKappa(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed bg-[#0a1122]/60 p-2.5 rounded-xl border border-white/5">
                {activeMedium.description}
              </p>
            </div>

            {/* Selected Charge Attributes Editor */}
            {selectedCharge && (
              <div className="p-3.5 rounded-2xl bg-[#091124] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCharge.color }}
                    />
                    <span>Configure {selectedCharge.name}</span>
                  </span>
                  {charges.length > 2 && (
                    <button
                      onClick={() => handleRemoveCharge(selectedCharge.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition"
                      title="Remove charge"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Particle Archetype Buttons */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1.5">
                    Particle Archetype:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'proton')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'proton'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Proton (+1e)
                    </button>
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'electron')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'electron'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Electron (−1e)
                    </button>
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'alpha')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'alpha'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Alpha (+2e)
                    </button>
                  </div>
                </div>

                {/* Magnitude Slider */}
                {selectedCharge.useElementaryUnits ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Elementary Charge (e):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {selectedCharge.qElementary > 0 ? '+' : ''}
                        {selectedCharge.qElementary} e
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[-2, -1, 1, 2, 3].map(val => (
                        <button
                          key={val}
                          onClick={() =>
                            setCharges(prev =>
                              prev.map(c =>
                                c.id === selectedCharge.id
                                  ? {
                                      ...c,
                                      qElementary: val,
                                      color: val > 0 ? '#ef4444' : '#0ea5e9',
                                    }
                                  : c
                              )
                            )
                          }
                          className={`flex-1 py-1 rounded-lg border text-xs font-mono font-bold transition ${
                            selectedCharge.qElementary === val
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-black/30 border-white/10 text-slate-300'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Charge Magnitude (q):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {selectedCharge.qMicro > 0 ? '+' : ''}
                        {selectedCharge.qMicro.toFixed(1)} μC
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.5"
                      value={selectedCharge.qMicro}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setCharges(prev =>
                          prev.map(c =>
                            c.id === selectedCharge.id
                              ? {
                                  ...c,
                                  qMicro: val,
                                  color: val >= 0 ? '#f43f5e' : '#38bdf8',
                                }
                              : c
                          )
                        );
                      }}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                )}

                {/* Spatial Coordinates Readout */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Pos X:</span>
                    <span className="text-white font-bold">{selectedCharge.x.toFixed(2)} m</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Pos Y:</span>
                    <span className="text-white font-bold">{selectedCharge.y.toFixed(2)} m</span>
                  </div>
                </div>
              </div>
            )}

            {/* Superposition Switcher for 3+ charges */}
            {charges.length > 2 && (
              <div className="p-3 bg-[#0a1224] rounded-2xl border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-400 block text-xs">
                    Vector Superposition
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Display resultant ∑ F on each charge
                  </span>
                </div>
                <button
                  onClick={() => setShowSuperpositionVectors(prev => !prev)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    showSuperpositionVectors
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {showSuperpositionVectors ? 'Active' : 'Off'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-Up AP Physics C Topic 8.1 Standards & Theory Drawer */}
      {showDetailsDrawer && (
        <div className="border-t border-cyan-500/30 bg-[#060a16] p-5 max-h-72 overflow-y-auto shrink-0 z-30 space-y-4 text-xs text-slate-300 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                AP CED ALIGNMENT
              </span>
              <h3 className="text-sm font-bold text-white">
                Topic 8.1 Required Course Content &amp; Essential Knowledge
              </h3>
            </div>
            <button
              onClick={() => setShowDetailsDrawer(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.A: Coulomb&apos;s Law</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Electrostatic force is proportional to the product of charges and inversely
                proportional to r². Like charges exert repulsive forces; opposite charges exert
                attractive forces strictly along the line of separation.
              </p>
              <div className="pt-1 text-cyan-400 font-mono text-[11px]">
                |F_E| = [1 / (4πε₀)] · |q₁q₂| / r²
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.B: Electric vs Gravitational</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Electrostatic force can be attractive or repulsive, whereas gravity is strictly
                attractive. For charged masses, F_E ≫ F_G. Gravity dominates at astronomical scales
                solely because bulk matter is electrically neutral.
              </p>
              <div className="pt-1 text-emerald-400 font-mono text-[11px]">
                F_E / F_G (protons) ≈ 1.24 × 10³⁶
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-purple-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.C: Dielectric Permittivity</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Permittivity measures the polarization degree of a medium under electric stress.
                Electron rearrangement forms induced opposing dipoles, attenuating force: F = F_vac /
                κ.
              </p>
              <div className="pt-1 text-purple-400 font-mono text-[11px]">
                ε = κε₀ · F_E = 1/(4πε) · |q₁q₂|/r²
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
