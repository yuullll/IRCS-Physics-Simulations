'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
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
  Crosshair,
  Bookmark,
  Navigation,
} from 'lucide-react';

// Physical Constants
const EPSILON_0 = 8.8541878128e-12; // C^2 / (N·m^2)
const COULOMB_K_VACUUM = 1 / (4 * Math.PI * EPSILON_0); // ~8.98755e9 N·m^2/C^2
const GRAVITATIONAL_G = 6.6743e-11; // N·m^2/kg^2
const ELEMENTARY_CHARGE = 1.602176634e-19; // Coulombs
const PROTON_MASS = 1.67262192e-27; // kg
const NEUTRON_MASS = 1.6749275e-27; // kg
const ELECTRON_MASS = 9.1093837e-31; // kg
const ALPHA_MASS = 6.6446572e-27; // kg

// Strict Charge Colors: Positive is ALWAYS Red, Negative is ALWAYS Blue
const POSITIVE_RED = '#ef4444';
const NEGATIVE_BLUE = '#3b82f6';
const NEUTRAL_SLATE = '#64748b';

export type ParticleArchetype =
  | 'proton'
  | 'neutron'
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
  qElementary: number; // in units of e (e.g. +1, -1, 0, +2)
  massKg: number; // mass in kilograms
  x: number; // meters in simulation space (-11.5 to +11.5)
  y: number; // meters in simulation space (-6.5 to +6.5)
  color: string;
}

export interface StoredForcePoint {
  id: string;
  label: string;
  x: number;
  y: number;
  saved: boolean;
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
  // Positive charges are ALWAYS Red (#ef4444), Negative charges are ALWAYS Blue (#3b82f6)
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
      color: POSITIVE_RED,
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
      color: NEGATIVE_BLUE,
    },
  ]);

  const [selectedChargeId, setSelectedChargeId] = useState<string>('q1');
  const [selectedMediumId, setSelectedMediumId] = useState<string>('vacuum');
  const [customKappa, setCustomKappa] = useState<number>(1.0);
  const [showGravitationalComparison] = useState<boolean>(true);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'macro' | 'atomic'>('macro');

  // Force arrows display on selected charge: toggle + mode ('net' vs 'individual')
  const [showSelectedChargeForces, setShowSelectedChargeForces] = useState<boolean>(true);
  const [forceVectorDisplayMode, setForceVectorDisplayMode] = useState<'net' | 'individual'>('individual');

  // Functional Dependence / Factor-of-Change Predictor state (Suggested Skill 2.D & LO 8.1.A.2)
  const [scaleMultQ1, setScaleMultQ1] = useState<number>(2);
  const [scaleMultQ2, setScaleMultQ2] = useState<number>(1);
  const [scaleMultR, setScaleMultR] = useState<number>(2);

  // Click-on-plane force probe points & stored points state
  const [probePoints, setProbePoints] = useState<StoredForcePoint[]>([
    { id: 'pt_1', label: 'P1', x: 0.0, y: 2.5, saved: true },
  ]);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>('pt_1');
  const [nextProbeCounter, setNextProbeCounter] = useState<number>(2);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingChargeId, setDraggingChargeId] = useState<string | null>(null);
  const didDragRef = useRef<boolean>(false);

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
      fromName: string;
      toId: string;
      toName: string;
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
        const dirSign = q1 * q2 === 0 ? 0 : isRepulsive ? 1 : -1;
        const feVec = {
          x: dirSign * (dx / r) * feMag,
          y: dirSign * (dy / r) * feMag,
        };

        list.push({
          fromId: c1.id,
          fromName: c1.name.split(' ')[0],
          toId: c2.id,
          toName: c2.name.split(' ')[0],
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
    const map = new Map<string, { fx: number; fy: number; mag: number; angleDeg: number }>();
    charges.forEach(c => {
      const incoming = pairwiseInteractions.filter(p => p.toId === c.id);
      const fx = incoming.reduce((acc, p) => acc + p.feVec.x, 0);
      const fy = incoming.reduce((acc, p) => acc + p.feVec.y, 0);
      const mag = Math.hypot(fx, fy);
      const angleDeg = (Math.atan2(fy, fx) * 180) / Math.PI;
      map.set(c.id, { fx, fy, mag, angleDeg });
    });
    return map;
  }, [charges, pairwiseInteractions]);

  // Calculate electrostatic force at any probed point (x, y) on the plane
  // Uses a standard unit positive test charge at the point (+1 μC in macro mode, +1e in atomic mode)
  const computeForceAtPoint = useCallback(
    (px: number, py: number) => {
      const qProbe = scaleMode === 'atomic' ? ELEMENTARY_CHARGE : 1.0e-6;
      const mProbe = scaleMode === 'atomic' ? PROTON_MASS : 0.001;
      let fx = 0;
      let fy = 0;
      let fgTotal = 0;

      charges.forEach(c => {
        const dx = px - c.x;
        const dy = py - c.y;
        const r = Math.max(0.15, Math.hypot(dx, dy));
        const qSource = getChargeCoulombs(c);
        // F = k * qSource * qProbe / r^2 along (px - c.x, py - c.y)
        const fSigned = (effectiveCoulombK * qSource * qProbe) / (r * r);
        fx += (dx / r) * fSigned;
        fy += (dy / r) * fSigned;

        fgTotal += (GRAVITATIONAL_G * c.massKg * mProbe) / (r * r);
      });

      const mag = Math.hypot(fx, fy);
      const eFieldMag = mag / qProbe;
      const angleDeg = (Math.atan2(fy, fx) * 180) / Math.PI;
      const ratio = fgTotal > 0 ? mag / fgTotal : Infinity;

      return {
        fx,
        fy,
        mag,
        eFieldMag,
        angleDeg,
        fgTotal,
        ratio,
        probeUnitLabel: scaleMode === 'atomic' ? '+1e' : '+1.0 μC',
      };
    },
    [charges, effectiveCoulombK, getChargeCoulombs, scaleMode]
  );

  const selectedProbePoint =
    probePoints.find(p => p.id === selectedProbeId) || probePoints[probePoints.length - 1] || null;

  const selectedProbeForce = useMemo(() => {
    if (!selectedProbePoint) return null;
    return computeForceAtPoint(selectedProbePoint.x, selectedProbePoint.y);
  }, [selectedProbePoint, computeForceAtPoint]);

  // Coordinate Conversion (Pure math on 1000x600 SVG viewBox)
  const toSvgX = (xMeters: number) => 500 + (xMeters / 12) * 450;
  const toSvgY = (yMeters: number) => 300 - (yMeters / 7) * 260;

  // Handle Dragging Charges on the 2D Coordinate Grid
  const handleMouseDownOnCharge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChargeId(id);
    setDraggingChargeId(id);
    didDragRef.current = false;
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingChargeId || !containerRef.current) return;
    didDragRef.current = true;
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

  // Click on plane to probe force at that point and create/select a labeled point
  const handleClickPlane = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingChargeId || didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    const meterX = parseFloat(
      Math.max(-11.5, Math.min(11.5, ((pixelX - rect.width / 2) / (rect.width * 0.45)) * 12)).toFixed(2)
    );
    const meterY = parseFloat(
      Math.max(-6.5, Math.min(6.5, -(((pixelY - rect.height / 2) / (rect.height * 0.433)) * 7))).toFixed(2)
    );

    // Replace any unsaved temporary point or create a new labeled point
    const existingUnsaved = probePoints.find(p => !p.saved);
    if (existingUnsaved) {
      const updatedId = existingUnsaved.id;
      setProbePoints(prev =>
        prev.map(p => (p.id === updatedId ? { ...p, x: meterX, y: meterY } : p))
      );
      setSelectedProbeId(updatedId);
    } else {
      const newId = `pt_${Date.now()}`;
      const newLabel = `P${nextProbeCounter}`;
      setNextProbeCounter(prev => prev + 1);
      setProbePoints(prev => [
        ...prev,
        { id: newId, label: newLabel, x: meterX, y: meterY, saved: false },
      ]);
      setSelectedProbeId(newId);
    }
  };

  const handleStoreCurrentPoint = () => {
    if (!selectedProbePoint) return;
    if (selectedProbePoint.saved) {
      onToast?.(`Point ${selectedProbePoint.label} is already stored.`);
      return;
    }
    setProbePoints(prev =>
      prev.map(p => (p.id === selectedProbePoint.id ? { ...p, saved: true } : p))
    );
    onToast?.(
      `Stored point ${selectedProbePoint.label} at (${selectedProbePoint.x.toFixed(2)}m, ${selectedProbePoint.y.toFixed(2)}m)`
    );
  };

  const handleDeleteProbePoint = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProbePoints(prev => {
      const next = prev.filter(p => p.id !== id);
      if (selectedProbeId === id) {
        setSelectedProbeId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
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
      color: sign > 0 ? POSITIVE_RED : NEGATIVE_BLUE,
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

  // Archetype selection (strictly Red for positive, Blue for negative, Neutral Slate for 0e Neutron)
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
              color: POSITIVE_RED,
            };
          case 'neutron':
            return {
              ...c,
              archetype: 'neutron',
              useElementaryUnits: true,
              qElementary: 0,
              qMicro: 0,
              massKg: NEUTRON_MASS,
              color: NEUTRAL_SLATE,
            };
          case 'electron':
            return {
              ...c,
              archetype: 'electron',
              useElementaryUnits: true,
              qElementary: -1,
              qMicro: -(ELEMENTARY_CHARGE * 1e6),
              massKg: ELECTRON_MASS,
              color: NEGATIVE_BLUE,
            };
          case 'alpha':
            return {
              ...c,
              archetype: 'alpha',
              useElementaryUnits: true,
              qElementary: 2,
              qMicro: 2 * ELEMENTARY_CHARGE * 1e6,
              massKg: ALPHA_MASS,
              color: POSITIVE_RED,
            };
          case 'positron':
            return {
              ...c,
              archetype: 'positron',
              useElementaryUnits: true,
              qElementary: 1,
              qMicro: ELEMENTARY_CHARGE * 1e6,
              massKg: ELECTRON_MASS,
              color: POSITIVE_RED,
            };
          case 'macro_pos':
            return {
              ...c,
              archetype: 'macro_pos',
              useElementaryUnits: false,
              qMicro: 5.0,
              qElementary: Math.round(5.0e-6 / ELEMENTARY_CHARGE),
              massKg: 0.001,
              color: POSITIVE_RED,
            };
          case 'macro_neg':
            return {
              ...c,
              archetype: 'macro_neg',
              useElementaryUnits: false,
              qMicro: -5.0,
              qElementary: -Math.round(5.0e-6 / ELEMENTARY_CHARGE),
              massKg: 0.001,
              color: NEGATIVE_BLUE,
            };
          default:
            return c;
        }
      })
    );
  };

  // Format numbers nicely in scientific notation
  const formatSci = (val: number, unit = ''): string => {
    if (val === 0) return `0 ${unit}`.trim();
    if (Math.abs(val) >= 0.01 && Math.abs(val) < 10000) {
      return `${val.toFixed(3)} ${unit}`.trim();
    }
    const [mantissa, exponent] = val.toExponential(3).split('e');
    return `${mantissa} × 10${exponent.replace('+', '')} ${unit}`.trim();
  };

  // Incoming individual forces on the currently selected charge
  const selectedChargeIncomingForces = useMemo(() => {
    if (!selectedCharge) return [];
    return pairwiseInteractions.filter(p => p.toId === selectedCharge.id);
  }, [pairwiseInteractions, selectedCharge]);

  const selectedChargeNetForce = selectedCharge
    ? netForces.get(selectedCharge.id) || { fx: 0, fy: 0, mag: 0, angleDeg: 0 }
    : { fx: 0, fy: 0, mag: 0, angleDeg: 0 };

  // Functional Dependence Factor of Change (Skill 2.D)
  const factorOfChange = (scaleMultQ1 * scaleMultQ2) / (scaleMultR * scaleMultR);
  const primaryPairForce = pairwiseInteractions[0]?.feMag || 0;
  const predictedScaledForce = primaryPairForce * factorOfChange;

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#050811] text-slate-100 overflow-hidden select-none font-sans"
      onMouseMove={handleMouseMoveCanvas}
      onMouseUp={handleMouseUpCanvas}
      onMouseLeave={handleMouseUpCanvas}
    >
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
          <svg
            viewBox="0 0 1000 600"
            onClick={handleClickPlane}
            className="absolute inset-0 w-full h-full select-none cursor-crosshair"
          >
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
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
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
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
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
              <marker
                id="arrowIndiv"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker
                id="arrowProbe"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
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
                      <circle cx="-7" cy="0" r="3.5" fill={NEGATIVE_BLUE} opacity="0.7" />
                      <circle cx="7" cy="0" r="3.5" fill={POSITIVE_RED} opacity="0.7" />
                      <text x="-9" y="3" fontSize="8" fill="#fff" fontFamily="monospace">-</text>
                      <text x="5" y="3" fontSize="8" fill="#fff" fontFamily="monospace">+</text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Pairwise Dashed Lines of Separation & Distance Labels */}
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
                const r = pInteraction?.r || 1.0;

                return (
                  <g key={`sep-${c1.id}-${c2.id}`}>
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

            {/* Electrostatic Forces Acting Upon Selected Charge (Net vs Individual Toggle) */}
            {showSelectedChargeForces && selectedCharge && (() => {
              const cx = toSvgX(selectedCharge.x);
              const cy = toSvgY(selectedCharge.y);

              if (forceVectorDisplayMode === 'net') {
                const net = netForces.get(selectedCharge.id);
                if (!net || net.mag === 0) return null;

                // Note: SVG Y is inverted relative to Cartesian Y
                const svgAngle = Math.atan2(-net.fy, net.fx);
                const netLen = Math.min(130, Math.max(36, 35 + Math.log10(net.mag + 1e-30) * 6));
                const tipX = cx + Math.cos(svgAngle) * netLen;
                const tipY = cy + Math.sin(svgAngle) * netLen;

                return (
                  <g key={`net-selected-${selectedCharge.id}`}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={tipX}
                      y2={tipY}
                      stroke="#34d399"
                      strokeWidth="3.8"
                      markerEnd="url(#arrowNet)"
                    />
                    <g transform={`translate(${tipX + Math.cos(svgAngle) * 28}, ${tipY + Math.sin(svgAngle) * 18})`}>
                      <rect
                        x="-46"
                        y="-10"
                        width="92"
                        height="20"
                        rx="5"
                        fill="#061512"
                        stroke="#34d399"
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#6ee7b7"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        F_net ({selectedCharge.id})
                      </text>
                    </g>
                  </g>
                );
              } else {
                // Individual Forces acting upon the selected charge from all other charges
                const incoming = pairwiseInteractions.filter(p => p.toId === selectedCharge.id && p.feMag > 0);
                const maxMag = Math.max(...incoming.map(p => p.feMag), 1e-30);
                const minMag = Math.min(...incoming.map(p => p.feMag), maxMag);

                return (
                  <g key={`indiv-selected-${selectedCharge.id}`}>
                    {incoming.map(p => {
                      const svgAngle = Math.atan2(-p.feVec.y, p.feVec.x);
                      // Scale arrow length proportionally to relative force magnitude
                      const ratio = maxMag > minMag ? p.feMag / maxMag : 1.0;
                      const arrowLen = Math.min(135, Math.max(36, 40 + ratio * 75));
                      const tipX = cx + Math.cos(svgAngle) * arrowLen;
                      const tipY = cy + Math.sin(svgAngle) * arrowLen;
                      const strokeColor = p.isRepulsive ? POSITIVE_RED : NEGATIVE_BLUE;
                      const markerId = p.isRepulsive ? 'url(#arrowRepulsive)' : 'url(#arrowAttractive)';

                      return (
                        <g key={`indiv-${p.fromId}-to-${p.toId}`}>
                          <line
                            x1={cx}
                            y1={cy}
                            x2={tipX}
                            y2={tipY}
                            stroke={strokeColor}
                            strokeWidth="3.4"
                            markerEnd={markerId}
                          />
                          <g
                            transform={`translate(${tipX + Math.cos(svgAngle) * 26}, ${
                              tipY + Math.sin(svgAngle) * 16
                            })`}
                          >
                            <rect
                              x="-34"
                              y="-9"
                              width="68"
                              height="18"
                              rx="5"
                              fill="#080e20"
                              stroke={strokeColor}
                              strokeWidth="1.2"
                            />
                            <text
                              x="0"
                              y="3.5"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9.5"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              F_{p.fromId}→{p.toId}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                );
              }
            })()}

            {/* Clicked / Stored Force Probe Points on Plane */}
            {probePoints.map(pt => {
              const sx = toSvgX(pt.x);
              const sy = toSvgY(pt.y);
              const isSelected = pt.id === selectedProbeId;
              const fData = computeForceAtPoint(pt.x, pt.y);
              const svgAngle = Math.atan2(-fData.fy, fData.fx);
              const vecLen = Math.min(75, Math.max(24, 24 + Math.log10(fData.mag + 1e-30) * 4));
              const tipX = sx + Math.cos(svgAngle) * vecLen;
              const tipY = sy + Math.sin(svgAngle) * vecLen;

              return (
                <g
                  key={pt.id}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedProbeId(pt.id);
                  }}
                  className="cursor-pointer"
                >
                  {/* Force vector arrow at selected probe point */}
                  {isSelected && fData.mag > 1e-25 && (
                    <line
                      x1={sx}
                      y1={sy}
                      x2={tipX}
                      y2={tipY}
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      strokeDasharray="3 2"
                      markerEnd="url(#arrowProbe)"
                    />
                  )}

                  {/* Outer pulse ring if selected */}
                  {isSelected && (
                    <circle
                      cx={sx}
                      cy={sy}
                      r="14"
                      fill="rgba(34, 211, 238, 0.15)"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Point Crosshair & Dot */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r="5.5"
                    fill={pt.saved ? '#22d3ee' : '#facc15'}
                    stroke="#050811"
                    strokeWidth="2"
                  />

                  {/* Clickable Small Point Label on Plane */}
                  <g transform={`translate(${sx}, ${sy - 20})`}>
                    <rect
                      x="-52"
                      y="-10"
                      width="104"
                      height="20"
                      rx="6"
                      fill={isSelected ? '#083344' : '#091022'}
                      stroke={isSelected ? '#22d3ee' : pt.saved ? '#38bdf8' : '#facc15'}
                      strokeWidth={isSelected ? '1.8' : '1.1'}
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={isSelected ? '#ecfeff' : '#cbd5e1'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {pt.label} ({pt.x.toFixed(1)}, {pt.y.toFixed(1)})
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Draggable Point Charges (Strictly Red for +, Blue for -, Slate for 0e Neutron) */}
            {charges.map(c => {
              const cx = toSvgX(c.x);
              const cy = toSvgY(c.y);
              const isSelected = c.id === selectedChargeId;
              const qVal = getChargeCoulombs(c);
              const isNeutral = qVal === 0;
              const isPositive = qVal > 0;
              const strictColor = isNeutral
                ? NEUTRAL_SLATE
                : isPositive
                ? POSITIVE_RED
                : NEGATIVE_BLUE;

              return (
                <g
                  key={c.id}
                  transform={`translate(${cx}, ${cy})`}
                  onMouseDown={e => handleMouseDownOnCharge(c.id, e)}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedChargeId(c.id);
                  }}
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
                      opacity="0.85"
                    />
                  )}

                  {/* Main Particle Sphere */}
                  <circle
                    r="20"
                    fill={strictColor}
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
                    {isNeutral ? '0' : isPositive ? '+' : '−'}
                  </text>

                  {/* Charge Label Pill */}
                  <g transform="translate(0, 36)" pointerEvents="none">
                    <rect
                      x="-44"
                      y="-9"
                      width="88"
                      height="18"
                      rx="6"
                      fill="#080e20"
                      stroke={isSelected ? '#ffffff' : strictColor}
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill={isNeutral ? '#cbd5e1' : isPositive ? '#fca5a5' : '#93c5fd'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {c.id}:{' '}
                      {c.useElementaryUnits
                        ? `${c.qElementary > 0 ? '+' : ''}${c.qElementary}e`
                        : `${c.qMicro > 0 ? '+' : ''}${c.qMicro.toFixed(1)}μC`}
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
              <div className="flex flex-wrap items-center gap-4 text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>Positive (+q) / Repulsive</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                  <span>Negative (−q) / Attractive</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                  <span>Net Force (∑ F_E)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
                  <span>Probed Plane Point</span>
                </span>
              </div>
            </div>
          </div>

          {/* Floating Instruction Banner (Positioned below global top bar) */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-[#070e20]/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs text-slate-300 pointer-events-none flex items-center gap-2 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              Click any point on the plane to probe &amp; store force strength, or drag charges to adjust <strong>r</strong>.
            </span>
          </div>
        </div>

        {/* Right Cockpit Parameter & Telemetry Controls Dock (with top padding for global menu bar) */}
        <div className="w-96 border-l border-white/10 bg-[#060a16] flex flex-col overflow-y-auto shrink-0 z-20 pt-16">
          {/* Relocated Scale Mode, High-Symmetry Preset & AP Theory Buttons (Above Laboratory Cockpit) */}
          <div className="p-3.5 border-b border-white/10 bg-[#070c1a] space-y-2">
            <div className="grid grid-cols-2 gap-1.5 bg-[#0b1328] p-1 rounded-xl border border-white/10 text-[11px]">
              <button
                onClick={() => {
                  setScaleMode('macro');
                  setCharges([
                    {
                      id: 'q1',
                      name: 'Charge 1 (q₁)',
                      archetype: 'macro_pos',
                      qMicro: 3.0,
                      useElementaryUnits: false,
                      qElementary: Math.round(3.0e-6 / ELEMENTARY_CHARGE),
                      massKg: 0.001,
                      x: -4.0,
                      y: 0.0,
                      color: POSITIVE_RED,
                    },
                    {
                      id: 'q2',
                      name: 'Charge 2 (q₂)',
                      archetype: 'macro_neg',
                      qMicro: -3.0,
                      useElementaryUnits: false,
                      qElementary: -Math.round(3.0e-6 / ELEMENTARY_CHARGE),
                      massKg: 0.001,
                      x: 4.0,
                      y: 0.0,
                      color: NEGATIVE_BLUE,
                    },
                  ]);
                  setSelectedMediumId('vacuum');
                  onToast?.('Loaded Macro Dipole (+3.0 μC / -3.0 μC)');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  scaleMode === 'macro'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
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
                      color: POSITIVE_RED,
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
                      color: POSITIVE_RED,
                    },
                  ]);
                  setSelectedMediumId('vacuum');
                  onToast?.('Loaded Subatomic Particles: Two Protons (F_E / F_G = 1.24×10³⁶)');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  scaleMode === 'atomic'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Subatomic Particles (e)
              </button>
            </div>

            {/* High-Symmetry Multi-Charge Cancellation Preset (CED Boundary Statement) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setScaleMode('macro');
                  setCharges([
                    {
                      id: 'q1',
                      name: 'Corner 1 (+4μC)',
                      archetype: 'macro_pos',
                      qMicro: 4.0,
                      useElementaryUnits: false,
                      qElementary: 1,
                      massKg: 0.001,
                      x: -4.0,
                      y: 4.0,
                      color: POSITIVE_RED,
                    },
                    {
                      id: 'q2',
                      name: 'Corner 2 (+4μC)',
                      archetype: 'macro_pos',
                      qMicro: 4.0,
                      useElementaryUnits: false,
                      qElementary: 1,
                      massKg: 0.001,
                      x: 4.0,
                      y: 4.0,
                      color: POSITIVE_RED,
                    },
                    {
                      id: 'q3',
                      name: 'Corner 3 (+4μC)',
                      archetype: 'macro_pos',
                      qMicro: 4.0,
                      useElementaryUnits: false,
                      qElementary: 1,
                      massKg: 0.001,
                      x: 4.0,
                      y: -4.0,
                      color: POSITIVE_RED,
                    },
                    {
                      id: 'q4',
                      name: 'Corner 4 (+4μC)',
                      archetype: 'macro_pos',
                      qMicro: 4.0,
                      useElementaryUnits: false,
                      qElementary: 1,
                      massKg: 0.001,
                      x: -4.0,
                      y: -4.0,
                      color: POSITIVE_RED,
                    },
                  ]);
                  setProbePoints([
                    { id: 'pt_sym', label: 'Center', x: 0.0, y: 0.0, saved: true },
                  ]);
                  setSelectedProbeId('pt_sym');
                  onToast?.('Loaded High-Symmetry Square: Net Force at Center (0,0) = 0 N!');
                }}
                className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                title="CED Boundary Statement: High-symmetry charge configuration with ∑F_E = 0 at center"
              >
                High-Symmetry (∑F=0)
              </button>

              <button
                onClick={() => setShowDetailsDrawer(prev => !prev)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border flex items-center justify-center space-x-1 transition ${
                  showDetailsDrawer
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>AP Theory &amp; Formulas</span>
              </button>
            </div>
          </div>

          {/* Laboratory Cockpit Header */}
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

          <div className="p-4 space-y-4 text-xs text-slate-300">
            {/* 1. Clicked Plane Point Force Readout & Stored Points */}
            <div className="p-3.5 rounded-2xl bg-[#091226] border border-cyan-500/30 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Point Force Probe</span>
                </span>
                {selectedProbePoint && (
                  <button
                    onClick={handleStoreCurrentPoint}
                    disabled={selectedProbePoint.saved}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                      selectedProbePoint.saved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>{selectedProbePoint.saved ? 'Stored' : 'Store Point'}</span>
                  </button>
                )}
              </div>

              {selectedProbePoint && selectedProbeForce ? (
                <>
                  <div className="flex items-center justify-between text-[11px] bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/5 font-mono">
                    <span className="text-cyan-300 font-bold">
                      {selectedProbePoint.label} ({selectedProbePoint.x.toFixed(2)}m,{' '}
                      {selectedProbePoint.y.toFixed(2)}m)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Ref: {selectedProbeForce.probeUnitLabel}
                    </span>
                  </div>

                  {/* Electrostatic Force Strength at Selected Point */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Force Strength at {selectedProbePoint.label} (|F_E|):</span>
                      <span className="text-cyan-300 font-mono">
                        θ = {selectedProbeForce.angleDeg.toFixed(1)}°
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-cyan-300 tracking-tight">
                      {formatSci(selectedProbeForce.mag, 'N')}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
                      <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-slate-400 block">F_x Component:</span>
                        <span className="text-white font-bold">
                          {formatSci(selectedProbeForce.fx, 'N')}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                        <span className="text-slate-400 block">F_y Component:</span>
                        <span className="text-white font-bold">
                          {formatSci(selectedProbeForce.fy, 'N')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gravitational Comparison at Probed Point */}
                  {showGravitationalComparison && (
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Gravity Ratio (F_E / F_G):</span>
                      <span className="font-mono font-bold text-amber-300">
                        {selectedProbeForce.ratio > 1e6
                          ? formatSci(selectedProbeForce.ratio)
                          : selectedProbeForce.ratio.toFixed(1)}
                        ×
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-slate-400 italic py-2 text-center">
                  Click anywhere on the 2D coordinate plane to calculate and store the electrostatic force strength at that point.
                </div>
              )}

              {/* Stored Points Selector Pills */}
              {probePoints.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>CLICKED / STORED POINTS ({probePoints.length}):</span>
                    {probePoints.length > 1 && (
                      <button
                        onClick={() => {
                          setProbePoints([]);
                          setSelectedProbeId(null);
                        }}
                        className="text-rose-400 hover:text-rose-300 underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {probePoints.map(pt => {
                      const isSel = pt.id === selectedProbeId;
                      return (
                        <div
                          key={pt.id}
                          onClick={() => setSelectedProbeId(pt.id)}
                          className={`cursor-pointer px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border transition ${
                            isSel
                              ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold'
                              : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              pt.saved ? 'bg-cyan-400' : 'bg-amber-400'
                            }`}
                          />
                          <span>
                            {pt.label} ({pt.x.toFixed(1)}, {pt.y.toFixed(1)})
                          </span>
                          <button
                            onClick={e => handleDeleteProbePoint(pt.id, e)}
                            className="text-slate-400 hover:text-rose-400 ml-0.5"
                            title="Remove point"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Force Vectors on Selected Charge Control (Net vs Individual) */}
            <div className="p-3.5 rounded-2xl bg-[#091124] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white text-xs">
                    Force Arrows on Selected Charge
                  </span>
                </div>
                <button
                  onClick={() => setShowSelectedChargeForces(prev => !prev)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    showSelectedChargeForces
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {showSelectedChargeForces ? 'Displayed' : 'Hidden'}
                </button>
              </div>

              {showSelectedChargeForces && (
                <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                  <button
                    onClick={() => setForceVectorDisplayMode('individual')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                      forceVectorDisplayMode === 'individual'
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Individual Forces
                  </button>
                  <button
                    onClick={() => setForceVectorDisplayMode('net')}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                      forceVectorDisplayMode === 'net'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Net Force (∑ F)
                  </button>
                </div>
              )}
            </div>

            {/* 3. Selected Charge Inspector + Net Force Magnitude Display */}
            {selectedCharge && (
              <div className="p-3.5 rounded-2xl bg-[#091124] border border-white/15 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          getChargeCoulombs(selectedCharge) === 0
                            ? NEUTRAL_SLATE
                            : getChargeCoulombs(selectedCharge) > 0
                            ? POSITIVE_RED
                            : NEGATIVE_BLUE,
                      }}
                    />
                    <span>Selected: {selectedCharge.name}</span>
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

                {/* Net Force Magnitude Acting on Selected Charge */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/35 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Net Force on {selectedCharge.id} (|F_net|):</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      θ = {selectedChargeNetForce.angleDeg.toFixed(1)}°
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-300">
                    {formatSci(selectedChargeNetForce.mag, 'N')}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300 pt-0.5">
                    <div>F_net,x: {formatSci(selectedChargeNetForce.fx, 'N')}</div>
                    <div>F_net,y: {formatSci(selectedChargeNetForce.fy, 'N')}</div>
                  </div>

                  {/* Individual Forces Breakdown */}
                  {selectedChargeIncomingForces.length > 0 && (
                    <div className="pt-1.5 mt-1 border-t border-white/10 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        Individual Forces on {selectedCharge.id}:
                      </div>
                      {selectedChargeIncomingForces.map(p => (
                        <div
                          key={`${p.fromId}->${p.toId}`}
                          className="flex items-center justify-between text-[10px] font-mono"
                        >
                          <span
                            className={
                              p.feMag === 0
                                ? 'text-slate-400'
                                : p.isRepulsive
                                ? 'text-rose-300'
                                : 'text-sky-300'
                            }
                          >
                            |F_{p.fromId}→{p.toId}| (
                            {p.feMag === 0
                              ? 'Neutral q=0'
                              : p.isRepulsive
                              ? 'Repulsive'
                              : 'Attractive'}
                            , r={p.r.toFixed(2)}m):
                          </span>
                          <span className="text-white font-bold">{formatSci(p.feMag, 'N')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Particle Archetype Buttons (Including Neutron 0e per 8.1.A.1.iii) */}
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1.5">
                    Particle Archetype (8.1.A.1.iii):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'proton')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'proton'
                          ? 'bg-red-500/20 text-red-300 border-red-500/50'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Proton (+1e)
                    </button>
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'electron')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'electron'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Electron (−1e)
                    </button>
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'neutron')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'neutron'
                          ? 'bg-slate-500/30 text-slate-200 border-slate-400/60'
                          : 'bg-white/5 text-slate-300 border-white/10'
                      }`}
                    >
                      Neutron (0e, Neutral)
                    </button>
                    <button
                      onClick={() => handleApplyArchetype(selectedCharge.id, 'alpha')}
                      className={`p-1.5 rounded-lg border font-semibold transition ${
                        selectedCharge.archetype === 'alpha'
                          ? 'bg-red-500/20 text-red-300 border-red-500/50'
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
                      <span>Elementary Charge (e = 1.602×10⁻¹⁹ C):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {selectedCharge.qElementary > 0 ? '+' : ''}
                        {selectedCharge.qElementary} e
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[-2, -1, 0, 1, 2, 3].map(val => (
                        <button
                          key={val}
                          onClick={() =>
                            setCharges(prev =>
                              prev.map(c =>
                                c.id === selectedCharge.id
                                  ? {
                                      ...c,
                                      qElementary: val,
                                      color:
                                        val === 0
                                          ? NEUTRAL_SLATE
                                          : val > 0
                                          ? POSITIVE_RED
                                          : NEGATIVE_BLUE,
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
                      <span>Scalar Charge Magnitude (q):</span>
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
                                  color:
                                    val === 0
                                      ? NEUTRAL_SLATE
                                      : val > 0
                                      ? POSITIVE_RED
                                      : NEGATIVE_BLUE,
                                }
                              : c
                          )
                        );
                      }}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                )}

                {/* Quantization N = q/e & Point Charge Approximation Check (8.1.A.1.i, ii, iv) */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantized Units (N = q/e):</span>
                    <span className="text-cyan-300 font-bold">
                      {formatSci(getChargeCoulombs(selectedCharge) / ELEMENTARY_CHARGE, 'e')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Point-Charge Model (d_obj ≪ r):</span>
                    <span className="text-emerald-400 font-bold">Valid (R/r &lt; 0.005)</span>
                  </div>
                </div>

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

            {/* 4. Functional Dependence / Factor-of-Change Predictor (Suggested Skill 2.D & 8.1.A.2) */}
            <div className="p-3.5 rounded-2xl bg-[#091124] border border-cyan-500/25 space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-cyan-300 text-xs">
                  Factor-of-Change Predictor (Skill 2.D)
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  F&apos; / F = (n₁·n₂) / k²
                </span>
              </div>

              <div className="space-y-2 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Scale q₁ (×n₁):</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 3, 4].map(m => (
                      <button
                        key={m}
                        onClick={() => setScaleMultQ1(m)}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                          scaleMultQ1 === m
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                            : 'bg-black/40 text-slate-300 border-white/10'
                        }`}
                      >
                        ×{m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Scale q₂ (×n₂):</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 3, 4].map(m => (
                      <button
                        key={m}
                        onClick={() => setScaleMultQ2(m)}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                          scaleMultQ2 === m
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                            : 'bg-black/40 text-slate-300 border-white/10'
                        }`}
                      >
                        ×{m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Scale Distance r (×k):</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 2, 3, 4].map(m => (
                      <button
                        key={m}
                        onClick={() => setScaleMultR(m)}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold border ${
                          scaleMultR === m
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-black/40 text-slate-300 border-white/10'
                        }`}
                      >
                        ×{m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Force Multiplier:</span>
                  <span className="text-amber-300 font-bold text-sm">
                    ×{factorOfChange.toFixed(3)} ({scaleMultQ1 * scaleMultQ2}/{scaleMultR * scaleMultR})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Predicted |F&apos;₁₂|:</span>
                  <span className="text-cyan-300 font-bold">
                    {formatSci(predictedScaledForce, 'N')}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Dielectric Permittivity & Conductor vs Insulator Mobility (LO 8.1.C.1–4) */}
            <div className="space-y-2 pt-1">
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

              {/* Carrier Mobility Classification (8.1.C.4.i & ii) */}
              <div className="p-2.5 rounded-xl bg-[#0a1122]/80 border border-white/10 space-y-1 text-[11px]">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-slate-400">Carrier Mobility (8.1.C.4):</span>
                  <span
                    className={`font-bold ${
                      selectedMediumId === 'conductor'
                        ? 'text-amber-300'
                        : selectedMediumId === 'vacuum'
                        ? 'text-slate-300'
                        : 'text-sky-300'
                    }`}
                  >
                    {selectedMediumId === 'conductor'
                      ? 'Conductor (Free Carriers)'
                      : selectedMediumId === 'vacuum'
                      ? 'Free Space (ε₀)'
                      : 'Insulator / Dielectric (Bound)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {activeMedium.description}
                </p>
              </div>
            </div>

            {/* 6. Macroscopic Contact Forces (8.1.A.4) & Astronomical Neutrality (8.1.B.3) */}
            <div className="p-3.5 rounded-2xl bg-[#091124] border border-white/10 space-y-2 text-[11px]">
              <div className="font-bold text-white text-xs">
                8.1.A.4 &amp; 8.1.B.3: Macroscopic &amp; Cosmic Scales
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-cyan-300 font-bold block text-[10px] font-mono">
                  8.1.A.4 · EVERYDAY CONTACT FORCES (F_N, F_f, F_T)
                </span>
                <p className="text-slate-300 leading-relaxed text-[10px]">
                  Macroscopic contact forces—<strong>Normal (F_N)</strong>, <strong>Friction (F_f)</strong>, and <strong>Tension (F_T)</strong>—arise from vast numbers of microscopic electrostatic interactions between atomic electron clouds.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-amber-300 font-bold block text-[10px] font-mono">
                  8.1.B.3 · WHY GRAVITY DOMINATES AT LARGE SCALES
                </span>
                <p className="text-slate-300 leading-relaxed text-[10px]">
                  Although F_E ≫ F_G between individual particles, astronomical bodies contain nearly equal protons and electrons (<strong>Q_net ≈ 0</strong>), so attractive gravity dominates cosmic motion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-Up AP Physics C Topic 8.1 Standards & Theory Drawer */}
      {showDetailsDrawer && (
        <div className="border-t border-cyan-500/30 bg-[#060a16] p-5 max-h-80 overflow-y-auto shrink-0 z-30 space-y-4 text-xs text-slate-300 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                AP CED ALIGNMENT
              </span>
              <h3 className="text-sm font-bold text-white">
                Topic 8.1 Required Course Content &amp; Essential Knowledge (8.1.A – 8.1.C)
              </h3>
            </div>
            <button
              onClick={() => setShowDetailsDrawer(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.A.1–3: Charge &amp; Coulomb&apos;s Law</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Charge is a quantized scalar (e = 1.602×10⁻¹⁹ C; proton +e, electron −e, neutron 0). Point-charge model applies when object size ≪ r. Force acts along the separation line.
              </p>
              <div className="pt-1 text-cyan-400 font-mono text-[11px]">
                |F_E| = [1 / (4πε₀)] · |q₁q₂| / r²
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.A.4 &amp; Boundary: Contact &amp; Symmetry</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Microscopic electric forces produce macroscopic contact forces: Normal (F_N), Friction (F_f), and Tension (F_T). Multi-charge superposition is evaluated for ≤4 charges or high-symmetry arrays.
              </p>
              <div className="pt-1 text-amber-400 font-mono text-[11px]">
                ∑ F_E = 0 at High-Symmetry Center
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.B.1–3: Electric vs Gravitational</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Electrostatic force is attractive or repulsive; gravity is always attractive. While F_E ≫ F_G for charged particles, gravity dominates at large scales because bulk systems are electrically neutral.
              </p>
              <div className="pt-1 text-emerald-400 font-mono text-[11px]">
                F_E / F_G (protons) ≈ 1.24 × 10³⁶
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-sky-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>8.1.C.1–4: Permittivity &amp; Mobility</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Permittivity (ε = κε₀ ≥ ε₀) measures induced electron polarization. Conductors allow charge carriers to move easily; insulators restrict carrier motion to local bound polarization.
              </p>
              <div className="pt-1 text-sky-400 font-mono text-[11px]">
                ε = κε₀ · F_E = F_vac / κ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
