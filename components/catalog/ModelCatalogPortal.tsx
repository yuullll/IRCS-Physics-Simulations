'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Cpu,
  ArrowRight,
  Compass,
  GraduationCap,
  FolderOpen,
  ClipboardList,
  Users,
  Orbit,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { UserProfile } from '@/lib/types/lab';

export type PhysicsCourseId = 'mechanics' | 'em';

export interface PhysicsModelSlot {
  id: string;
  course?: PhysicsCourseId;
  code: string;
  title: string;
  subtitle: string;
  unit: string;
  equation: string;
  description: string;
  status: 'live' | 'blank';
  simulationMode?: 'field' | 'circuit' | 'projectile';
  accentColor: 'cyan' | 'amber' | 'emerald' | 'rose' | 'sky';
  metrics: string[];
}

export interface PhysicsSubtopic {
  id: string;
  code: string;
  title: string;
  isSummaryBlock?: boolean;
  simulation?: PhysicsModelSlot;
}

export interface PhysicsUnitModule {
  id: string;
  unitNumber: number;
  course: PhysicsCourseId;
  code: string;
  title: string;
  equation: string;
  accentColor: 'cyan' | 'amber' | 'emerald' | 'rose' | 'sky';
  subtopics: PhysicsSubtopic[];
}

export const LIVE_SIMULATION_SLOTS: Record<'projectile' | 'field' | 'circuit', PhysicsModelSlot> = {
  projectile: {
    id: 'mech-kinematics-drag',
    course: 'mechanics',
    code: '1.3',
    title: 'Non-Linear Projectile & Drag Ballistics',
    subtitle: 'Differential Equations of Motion with Linear & Quadratic Air Resistance',
    unit: 'Unit 1 · Kinematics (1.3 Representing Motion)',
    equation: 'm dv/dt = m g - b v - c |v| v',
    description:
      'Interactive 3D projectile ballistics under vacuum, Stokes linear, and Newtonian quadratic drag. Validates all 5 AP kinematics formulas (v_x, x(t), v_x², ∫v_x dt, ∫a_x dt) with live RK4 integration.',
    status: 'live',
    simulationMode: 'projectile',
    accentColor: 'emerald',
    metrics: ['Live 3D RK4 Integrator', '5 Kinematics Formulas Proof', 'Impact Flags & FBD'],
  },
  field: {
    id: 'model-field',
    course: 'em',
    code: '8.3',
    title: 'Electrostatic Field & Lorentz Dynamics',
    subtitle: '3D Vector Calculus & Invariant RK4 Trajectory Engine',
    unit: 'Unit 8 · Electric Charges, Fields, and Gauss’s Law (8.3 Electric Fields)',
    equation: 'F = q(E + v × B)',
    description:
      'Deploy point charges across a 60×60m Cartesian plane, inspect 3D electric field vectors and equipotential slices, and release zero-initial-velocity test particles governed by fixed-step 4th-order Runge-Kutta integration.',
    status: 'live',
    simulationMode: 'field',
    accentColor: 'sky',
    metrics: ['60×60m Cartesian Grid', 'Fixed-dt RK4 Integrator', 'Equipotential Slicing'],
  },
  circuit: {
    id: 'model-circuit',
    course: 'em',
    code: '11.S',
    title: '3D Circuit Workbench & MNA Solver',
    subtitle: 'Real-Time Modified Nodal Analysis & Transient Oscilloscope',
    unit: 'Unit 11 · Electric Circuits (Unit 11 Summary)',
    equation: '∑ I_in = ∑ I_out · ∑ ΔV = 0',
    description:
      'Construct series, parallel, RC filter, and Wheatstone bridge topologies on an illuminated 3D laboratory breadboard with live digital voltmeters, ammeters, and incandescent filament physics.',
    status: 'live',
    simulationMode: 'circuit',
    accentColor: 'amber',
    metrics: ['Matrix MNA Solver', 'Live V/I Oscilloscope', 'Auto-Splicing & Wiring'],
  },
};

export const MECHANICS_UNITS: PhysicsUnitModule[] = [
  {
    id: 'unit-1-kinematics',
    unitNumber: 1,
    course: 'mechanics',
    code: 'Unit 1',
    title: 'Unit 1: Kinematics',
    equation: 'v(t) = dr/dt · a(t) = dv/dt',
    accentColor: 'emerald',
    subtopics: [
      {
        id: 'sub-1-1',
        code: '1.1',
        title: '1.1 Scalars and Vectors',
      },
      {
        id: 'sub-1-2',
        code: '1.2',
        title: '1.2 Displacement, Velocity, and Acceleration',
      },
      {
        id: 'sub-1-3',
        code: '1.3',
        title: '1.3 Representing Motion',
        simulation: LIVE_SIMULATION_SLOTS.projectile,
      },
      {
        id: 'sub-1-4',
        code: '1.4',
        title: '1.4 Reference Frames and Relative Motion',
      },
      {
        id: 'sub-1-5',
        code: '1.5',
        title: '1.5 Motion in Two or Three Dimensions',
      },
    ],
  },
  {
    id: 'unit-2-dynamics',
    unitNumber: 2,
    course: 'mechanics',
    code: 'Unit 2',
    title: 'Unit 2: Force and Translational Dynamics',
    equation: '∑ F = dp/dt = m a',
    accentColor: 'amber',
    subtopics: [
      { id: 'sub-2-1', code: '2.1', title: 'Under Development' },
      { id: 'sub-2-2', code: '2.2', title: 'Under Development' },
      { id: 'sub-2-3', code: '2.3', title: 'Under Development' },
      { id: 'sub-2-4', code: '2.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-3-work-energy',
    unitNumber: 3,
    course: 'mechanics',
    code: 'Unit 3',
    title: 'Unit 3: Work, Energy, and Power',
    equation: 'W = ∫ F · dr = ΔK · F(x) = -dU/dx',
    accentColor: 'cyan',
    subtopics: [
      { id: 'sub-3-1', code: '3.1', title: 'Under Development' },
      { id: 'sub-3-2', code: '3.2', title: 'Under Development' },
      { id: 'sub-3-3', code: '3.3', title: 'Under Development' },
      { id: 'sub-3-4', code: '3.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-4-momentum',
    unitNumber: 4,
    course: 'mechanics',
    code: 'Unit 4',
    title: 'Unit 4: Linear Momentum',
    equation: 'J = ∫ F(t) dt = Δp',
    accentColor: 'rose',
    subtopics: [
      { id: 'sub-4-1', code: '4.1', title: 'Under Development' },
      { id: 'sub-4-2', code: '4.2', title: 'Under Development' },
      { id: 'sub-4-3', code: '4.3', title: 'Under Development' },
      { id: 'sub-4-4', code: '4.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-5-rotation',
    unitNumber: 5,
    course: 'mechanics',
    code: 'Unit 5',
    title: 'Unit 5: Torque and Rotational Dynamics',
    equation: '∑ τ = I α · τ = r × F',
    accentColor: 'emerald',
    subtopics: [
      { id: 'sub-5-1', code: '5.1', title: 'Under Development' },
      { id: 'sub-5-2', code: '5.2', title: 'Under Development' },
      { id: 'sub-5-3', code: '5.3', title: 'Under Development' },
      { id: 'sub-5-4', code: '5.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-6-rotating-energy',
    unitNumber: 6,
    course: 'mechanics',
    code: 'Unit 6',
    title: 'Unit 6: Energy and Momentum of Rotating Systems',
    equation: 'L = I ω = r × p · K_rot = ½ I ω²',
    accentColor: 'sky',
    subtopics: [
      { id: 'sub-6-1', code: '6.1', title: 'Under Development' },
      { id: 'sub-6-2', code: '6.2', title: 'Under Development' },
      { id: 'sub-6-3', code: '6.3', title: 'Under Development' },
      { id: 'sub-6-4', code: '6.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-7-oscillations',
    unitNumber: 7,
    course: 'mechanics',
    code: 'Unit 7',
    title: 'Unit 7: Oscillations',
    equation: 'd²x/dt² + ω₀² x = 0',
    accentColor: 'amber',
    subtopics: [
      { id: 'sub-7-1', code: '7.1', title: 'Under Development' },
      { id: 'sub-7-2', code: '7.2', title: 'Under Development' },
      { id: 'sub-7-3', code: '7.3', title: 'Under Development' },
      { id: 'sub-7-4', code: '7.4', title: 'Under Development' },
    ],
  },
];

export const EM_UNITS: PhysicsUnitModule[] = [
  {
    id: 'unit-8-electrostatics',
    unitNumber: 8,
    course: 'em',
    code: 'Unit 8',
    title: 'Unit 8: Electric Charges, Fields, and Gauss’s Law',
    equation: '∮ E · dA = Q_enc / ε₀',
    accentColor: 'sky',
    subtopics: [
      {
        id: 'sub-8-1',
        code: '8.1',
        title: '8.1 Electric Charge and Electric Force',
      },
      {
        id: 'sub-8-2',
        code: '8.2',
        title: '8.2 Conservation of Electric Charge and the Process of Charging',
      },
      {
        id: 'sub-8-3',
        code: '8.3',
        title: '8.3 Electric Fields',
        simulation: LIVE_SIMULATION_SLOTS.field,
      },
      {
        id: 'sub-8-4',
        code: '8.4',
        title: '8.4 Electric Fields of Charge Distributions',
      },
      {
        id: 'sub-8-5',
        code: '8.5',
        title: '8.5 Electric Flux',
      },
      {
        id: 'sub-8-6',
        code: '8.6',
        title: '8.6 Gauss’s Law',
      },
    ],
  },
  {
    id: 'unit-9-potential',
    unitNumber: 9,
    course: 'em',
    code: 'Unit 9',
    title: 'Unit 9: Electric Potential',
    equation: 'ΔV = -∫ E · dr · E = -∇V',
    accentColor: 'cyan',
    subtopics: [
      { id: 'sub-9-1', code: '9.1', title: 'Under Development' },
      { id: 'sub-9-2', code: '9.2', title: 'Under Development' },
      { id: 'sub-9-3', code: '9.3', title: 'Under Development' },
      { id: 'sub-9-4', code: '9.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-10-capacitors',
    unitNumber: 10,
    course: 'em',
    code: 'Unit 10',
    title: 'Unit 10: Conductors and Capacitors',
    equation: 'Q = C ΔV · U_C = ½ C (ΔV)²',
    accentColor: 'emerald',
    subtopics: [
      { id: 'sub-10-1', code: '10.1', title: 'Under Development' },
      { id: 'sub-10-2', code: '10.2', title: 'Under Development' },
      { id: 'sub-10-3', code: '10.3', title: 'Under Development' },
      { id: 'sub-10-4', code: '10.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-11-circuits',
    unitNumber: 11,
    course: 'em',
    code: 'Unit 11',
    title: 'Unit 11: Electric Circuits',
    equation: '∑ I_in = ∑ I_out · ∑ ΔV = 0',
    accentColor: 'amber',
    subtopics: [
      {
        id: 'sub-11-1',
        code: '11.1',
        title: '11.1 Electric Current',
      },
      {
        id: 'sub-11-2',
        code: '11.2',
        title: '11.2 Simple Circuits',
      },
      {
        id: 'sub-11-3',
        code: '11.3',
        title: "11.3 Resistance, Resistivity, and Ohm's Law",
      },
      {
        id: 'sub-11-4',
        code: '11.4',
        title: '11.4 Electric Power',
      },
      {
        id: 'sub-11-5',
        code: '11.5',
        title: '11.5 Compound Direct Current Circuits',
      },
      {
        id: 'sub-11-6',
        code: '11.6',
        title: "11.6 Kirchhoff's Loop Rule",
      },
      {
        id: 'sub-11-7',
        code: '11.7',
        title: "11.7 Kirchhoff's Junction Rule",
      },
      {
        id: 'sub-11-8',
        code: '11.8',
        title: '11.8 Resistor Capacitor (RC) Circuits',
      },
      {
        id: 'sub-11-summary',
        code: 'Summary',
        title: 'Unit 11 Summary',
        isSummaryBlock: true,
        simulation: LIVE_SIMULATION_SLOTS.circuit,
      },
    ],
  },
  {
    id: 'unit-12-magnetism',
    unitNumber: 12,
    course: 'em',
    code: 'Unit 12',
    title: 'Unit 12: Magnetic Fields and Electromagnetism',
    equation: '∮ B · dl = μ₀ I_enc · F_B = q v × B',
    accentColor: 'rose',
    subtopics: [
      { id: 'sub-12-1', code: '12.1', title: 'Under Development' },
      { id: 'sub-12-2', code: '12.2', title: 'Under Development' },
      { id: 'sub-12-3', code: '12.3', title: 'Under Development' },
      { id: 'sub-12-4', code: '12.4', title: 'Under Development' },
    ],
  },
  {
    id: 'unit-13-induction',
    unitNumber: 13,
    course: 'em',
    code: 'Unit 13',
    title: 'Unit 13: Electromagnetic Induction',
    equation: 'ℰ = -dΦ_B / dt = ∮ E · dl',
    accentColor: 'sky',
    subtopics: [
      { id: 'sub-13-1', code: '13.1', title: 'Under Development' },
      { id: 'sub-13-2', code: '13.2', title: 'Under Development' },
      { id: 'sub-13-3', code: '13.3', title: 'Under Development' },
      { id: 'sub-13-4', code: '13.4', title: 'Under Development' },
    ],
  },
];

export const ALL_PHYSICS_UNITS: PhysicsUnitModule[] = [...MECHANICS_UNITS, ...EM_UNITS];

export const PHYSICS_MODEL_SLOTS: PhysicsModelSlot[] = [
  LIVE_SIMULATION_SLOTS.projectile,
  LIVE_SIMULATION_SLOTS.field,
  LIVE_SIMULATION_SLOTS.circuit,
];

/**
 * Simplistic, preliminary cursor-following interactive visualization inside each Unit Module card
 * that visually represents the specific physics unit and responds to the user's cursor in real time.
 */
const UnitCursorInteraction: React.FC<{
  unitNumber: number;
  normX: number; // 0 to 1 within card (or relative to card)
  normY: number; // 0 to 1 within card
  isHovered: boolean;
}> = ({ unitNumber, normX, normY, isHovered }) => {
  // Clamp normalized cursor coordinates to [0.08, 0.92]
  const cx = Math.max(0.08, Math.min(0.92, normX));
  const cy = Math.max(0.12, Math.min(0.88, normY));

  const targetX = 24 + cx * 212; // SVG width 260
  const targetY = 12 + cy * 68; // SVG height 92

  switch (unitNumber) {
    case 1: {
      // Unit 1: Kinematics — Parabolic trajectory arc & velocity vector aiming toward cursor
      const startX = 24;
      const startY = 76;
      const ctrlX = (startX + targetX) * 0.5;
      const ctrlY = Math.min(startY, targetY) - 32;
      const pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;
      const vx = (targetX - startX) * 0.32;
      const vy = (ctrlY - startY) * 0.45;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <line x1="16" y1="76" x2="244" y2="76" stroke="#1e293b" strokeWidth="1" />
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
          {/* Initial Velocity Vector v0 */}
          <line
            x1={startX}
            y1={startY}
            x2={startX + vx}
            y2={startY + vy}
            stroke="#34d399"
            strokeWidth="2"
          />
          <circle cx={startX} cy={startY} r="3.5" fill="#10b981" />
          {/* Projectile tracking cursor */}
          <circle cx={targetX} cy={targetY} r={isHovered ? 5.5 : 4.5} fill="#34d399" />
          <text x="195" y="18" fill="#6ee7b7" fontSize="9" fontFamily="monospace">
            r(t), v(t)
          </text>
        </svg>
      );
    }

    case 2: {
      // Unit 2: Force & Translational Dynamics — Mass block with FBD vectors following cursor pull
      const centerX = 110 + (cx - 0.5) * 45;
      const centerY = 50;
      const pullDx = Math.max(-55, Math.min(65, targetX - centerX));
      const pullDy = Math.max(-30, Math.min(30, targetY - centerY));
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <line x1="16" y1="64" x2="244" y2="64" stroke="#334155" strokeWidth="1.5" />
          {/* Normal Force Fn & Gravity Fg */}
          <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - 24} stroke="#38bdf8" strokeWidth="1.8" />
          <line x1={centerX} y1={centerY} x2={centerX} y2={centerY + 24} stroke="#a855f7" strokeWidth="1.8" />
          {/* Applied Force F toward cursor */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + pullDx}
            y2={centerY + pullDy}
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <circle cx={centerX + pullDx} cy={centerY + pullDy} r="3" fill="#fbbf24" />
          {/* Mass Block */}
          <rect
            x={centerX - 13}
            y={centerY - 13}
            width="26"
            height="26"
            rx="4"
            fill="#0f172a"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text x={centerX - 4} y={centerY + 3} fill="#fde68a" fontSize="9" fontFamily="monospace">
            m
          </text>
          <text x="188" y="18" fill="#fcd34d" fontSize="9" fontFamily="monospace">
            ∑F = ma
          </text>
        </svg>
      );
    }

    case 3: {
      // Unit 3: Work, Energy, and Power — Potential energy well U(x) with bead following cursor X
      const beadX = Math.max(35, Math.min(205, targetX));
      const normU = Math.pow((beadX - 120) / 85, 2); // Parabola 0..1
      const beadY = 72 - normU * 48;
      const kHeight = Math.max(4, (1 - normU) * 44);
      const uHeight = Math.max(4, normU * 44);
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Potential Energy Well Curve U(x) */}
          <path
            d="M 35 24 Q 120 120 205 24"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
          {/* Bead on Potential Well */}
          <circle cx={beadX} cy={beadY} r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
          {/* Live K and U Energy Bars */}
          <rect x="222" y={74 - kHeight} width="9" height={kHeight} fill="#10b981" rx="2" />
          <rect x="236" y={74 - uHeight} width="9" height={uHeight} fill="#38bdf8" rx="2" />
          <text x="223" y="85" fill="#6ee7b7" fontSize="8" fontFamily="monospace">
            K
          </text>
          <text x="237" y="85" fill="#7dd3fc" fontSize="8" fontFamily="monospace">
            U
          </text>
          <text x="20" y="18" fill="#67e8f9" fontSize="9" fontFamily="monospace">
            U(x) + K = E
          </text>
        </svg>
      );
    }

    case 4: {
      // Unit 4: Linear Momentum — 2D Collision & Impulse vectors following cursor
      const colX = 135;
      const colY = 46;
      const inX = Math.min(115, targetX);
      const inY = targetY;
      const dy = colY - inY;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Incident momentum vector p1 */}
          <line x1={inX} y1={inY} x2={colX - 8} y2={colY} stroke="#fb7185" strokeWidth="2.2" />
          {/* Scattered momentum vectors p1' and p2' */}
          <line
            x1={colX + 8}
            y1={colY}
            x2={colX + 65}
            y2={colY - dy * 0.6 - 16}
            stroke="#fb7185"
            strokeWidth="1.8"
            strokeDasharray="3 2"
          />
          <line
            x1={colX + 8}
            y1={colY}
            x2={colX + 65}
            y2={colY + dy * 0.6 + 16}
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeDasharray="3 2"
          />
          <circle cx={inX} cy={inY} r="5.5" fill="#f43f5e" />
          <circle cx={colX} cy={colY} r="6.5" fill="#38bdf8" />
          <text x="180" y="18" fill="#fda4af" fontSize="9" fontFamily="monospace">
            p₁ + p₂ = const
          </text>
        </svg>
      );
    }

    case 5: {
      // Unit 5: Torque and Rotational Dynamics — Pivoted lever arm rotating toward cursor
      const pivX = 85;
      const pivY = 50;
      const angle = Math.atan2(targetY - pivY, targetX - pivX);
      const armLen = 58;
      const endX = pivX + Math.cos(angle) * armLen;
      const endY = pivY + Math.sin(angle) * armLen;
      // Perpendicular force vector
      const fx = -Math.sin(angle) * 22;
      const fy = Math.cos(angle) * 22;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <circle cx={pivX} cy={pivY} r="24" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Lever Arm r */}
          <line x1={pivX} y1={pivY} x2={endX} y2={endY} stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
          {/* Tangential Force Vector F */}
          <line x1={endX} y1={endY} x2={endX + fx} y2={endY + fy} stroke="#f59e0b" strokeWidth="2.2" />
          <circle cx={pivX} cy={pivY} r="4.5" fill="#f8fafc" />
          <circle cx={endX} cy={endY} r="4.5" fill="#34d399" />
          <text x="178" y="18" fill="#6ee7b7" fontSize="9" fontFamily="monospace">
            τ = r × F
          </text>
        </svg>
      );
    }

    case 6: {
      // Unit 6: Energy and Momentum of Rotating Systems — Orbiting body whose radius tracks cursor
      const cX = 125;
      const cY = 46;
      const dx = targetX - cX;
      const dy = targetY - cY;
      const r = Math.max(14, Math.min(38, Math.hypot(dx, dy) * 0.45));
      const ang = Math.atan2(dy, dx);
      const satX = cX + Math.cos(ang) * r;
      const satY = cY + Math.sin(ang) * r;
      // Tangential velocity scales inversely with r (conservation of L = mvr)
      const vLen = Math.min(34, (32 / r) * 16);
      const vx = -Math.sin(ang) * vLen;
      const vy = Math.cos(ang) * vLen;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <circle cx={cX} cy={cY} r={r} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={cX} cy={cY} r="6" fill="#0ea5e9" />
          <line x1={cX} y1={cY} x2={satX} y2={satY} stroke="#64748b" strokeWidth="1.2" />
          <line x1={satX} y1={satY} x2={satX + vx} y2={satY + vy} stroke="#10b981" strokeWidth="2.2" />
          <circle cx={satX} cy={satY} r="4.5" fill="#34d399" />
          <text x="178" y="18" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
            L = Iω = const
          </text>
        </svg>
      );
    }

    case 7: {
      // Unit 7: Oscillations — Spring-mass SHM displaced by cursor X
      const wallX = 22;
      const massX = Math.max(68, Math.min(205, targetX));
      const coils = 7;
      const step = (massX - 12 - wallX) / coils;
      let springPoints = `${wallX},46 `;
      for (let i = 0; i < coils; i++) {
        const sx = wallX + (i + 0.25) * step;
        const sx2 = wallX + (i + 0.75) * step;
        springPoints += `${sx.toFixed(1)},34 ${sx2.toFixed(1)},58 `;
      }
      springPoints += `${massX - 12},46`;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <line x1={wallX} y1="24" x2={wallX} y2="68" stroke="#64748b" strokeWidth="3" />
          <line x1="130" y1="20" x2="130" y2="74" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
          <polyline points={springPoints} fill="none" stroke="#f59e0b" strokeWidth="2" />
          <rect x={massX - 12} y="34" width="24" height="24" rx="4" fill="#10b981" />
          <text x="172" y="18" fill="#fcd34d" fontSize="9" fontFamily="monospace">
            F = -kx (SHM)
          </text>
        </svg>
      );
    }

    case 8: {
      // Unit 8: Electric Charges, Fields, and Gauss's Law — Source charge + Gaussian surface + cursor field vectors
      const srcX = 95;
      const srcY = 46;
      const rays = 8;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Gaussian Surface dashed circle */}
          <circle cx={srcX} cy={srcY} r="28" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="4 3" />
          {/* Electric Field lines bending toward cursor test charge */}
          {Array.from({ length: rays }).map((_, idx) => {
            const a = (idx / rays) * Math.PI * 2;
            const r1 = 10;
            const x1 = srcX + Math.cos(a) * r1;
            const y1 = srcY + Math.sin(a) * r1;
            const x2 = srcX + Math.cos(a) * 34 + (targetX - srcX) * 0.18;
            const y2 = srcY + Math.sin(a) * 34 + (targetY - srcY) * 0.18;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#38bdf8"
                strokeWidth="1.6"
              />
            );
          })}
          {/* Dipole interaction line to cursor */}
          <line x1={srcX} y1={srcY} x2={targetX} y2={targetY} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx={srcX} cy={srcY} r="7" fill="#ef4444" />
          <text x={srcX - 4} y={srcY + 3} fill="#fff" fontSize="8" fontFamily="monospace">
            +Q
          </text>
          <circle cx={targetX} cy={targetY} r="5" fill="#38bdf8" />
          <text x="175" y="18" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
            ∮E·dA = Q/ε₀
          </text>
        </svg>
      );
    }

    case 9: {
      // Unit 9: Electric Potential — Equipotential contour rings around cursor probe & -∇V arrow
      const gradDx = (130 - targetX) * 0.35;
      const gradDy = (46 - targetY) * 0.35;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {[14, 26, 40].map((rad, i) => (
            <circle
              key={rad}
              cx={targetX}
              cy={targetY}
              r={rad}
              fill="none"
              stroke={i === 0 ? '#22d3ee' : i === 1 ? '#0ea5e9' : '#1e293b'}
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
          ))}
          <line
            x1={targetX}
            y1={targetY}
            x2={targetX + gradDx}
            y2={targetY + gradDy}
            stroke="#f59e0b"
            strokeWidth="2.2"
          />
          <circle cx={targetX} cy={targetY} r="4.5" fill="#22d3ee" />
          <text x="180" y="18" fill="#67e8f9" fontSize="9" fontFamily="monospace">
            E = -∇V
          </text>
        </svg>
      );
    }

    case 10: {
      // Unit 10: Conductors and Capacitors — Parallel plates + Dielectric slab following cursor
      const dielecX = Math.max(60, Math.min(160, targetX - 20));
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Top Plate (+Q) and Bottom Plate (-Q) */}
          <rect x="52" y="18" width="140" height="5" fill="#ef4444" rx="2" />
          <rect x="52" y="68" width="140" height="5" fill="#38bdf8" rx="2" />
          {/* Uniform internal E-field arrows */}
          {[70, 98, 126, 154, 180].map(lx => (
            <line
              key={lx}
              x1={lx}
              y1="25"
              x2={lx}
              y2="66"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
          ))}
          {/* Cursor-positioned Dielectric Slab κ */}
          <rect
            x={dielecX}
            y="28"
            width="44"
            height="35"
            rx="3"
            fill="rgba(16, 185, 129, 0.28)"
            stroke="#10b981"
            strokeWidth="1.6"
          />
          <text x={dielecX + 16} y="49" fill="#6ee7b7" fontSize="9" fontFamily="monospace">
            κ
          </text>
          <text x="198" y="20" fill="#6ee7b7" fontSize="9" fontFamily="monospace">
            C = κε₀A/d
          </text>
        </svg>
      );
    }

    case 11: {
      // Unit 11: Electric Circuits — Closed loop with moving current dots responding to cursor
      const offset = (cx * 28) % 14;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          <rect
            x="44"
            y="20"
            width="156"
            height="52"
            rx="6"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
          />
          {/* Resistor Zigzag on top wire */}
          <polyline
            points="98,20 104,13 112,27 120,13 128,27 136,13 142,20"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.2"
          />
          {/* Charge carriers shifting with cursor */}
          {[60, 88, 156, 182].map(bx => (
            <circle key={bx} cx={bx + offset - 7} cy="72" r="3" fill="#38bdf8" />
          ))}
          {/* Voltage probe at cursor */}
          <circle cx={targetX} cy={targetY} r="4" fill="#fbbf24" />
          <text x="188" y="16" fill="#fcd34d" fontSize="9" fontFamily="monospace">
            ∑ΔV = 0
          </text>
        </svg>
      );
    }

    case 12: {
      // Unit 12: Magnetic Fields and Electromagnetism — B-field lattice & Lorentz F = qv x B
      const vx = (targetX - 130) * 0.38;
      const vy = (targetY - 46) * 0.38;
      // Perpendicular magnetic force F_B = v x B
      const fbx = -vy * 0.85;
      const fby = vx * 0.85;
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Uniform B-field crosses */}
          {[40, 85, 130, 175, 220].map(bx =>
            [26, 66].map(by => (
              <text key={`${bx}-${by}`} x={bx} y={by} fill="#334155" fontSize="10" fontFamily="monospace">
                ×
              </text>
            ))
          )}
          {/* Velocity vector v */}
          <line x1={targetX} y1={targetY} x2={targetX + vx} y2={targetY + vy} stroke="#10b981" strokeWidth="2.2" />
          {/* Perpendicular Lorentz Force vector F_B */}
          <line x1={targetX} y1={targetY} x2={targetX + fbx} y2={targetY + fby} stroke="#f43f5e" strokeWidth="2.2" />
          <circle cx={targetX} cy={targetY} r="5" fill="#fb7185" />
          <text x="172" y="18" fill="#fda4af" fontSize="9" fontFamily="monospace">
            F = q(v × B)
          </text>
        </svg>
      );
    }

    default: {
      // Unit 13: Electromagnetic Induction — Bar magnet following cursor near conductive coil
      const magX = Math.max(30, Math.min(145, targetX - 24));
      const coilX = 185;
      const fluxStrength = Math.max(0.2, 1 - Math.abs( coilX - (magX + 36) ) / 140);
      return (
        <svg viewBox="0 0 260 92" className="w-full h-24 rounded-xl bg-black/50 border border-white/10 overflow-hidden">
          {/* Magnetic Flux Lines */}
          <ellipse
            cx={(magX + 36 + coilX) * 0.5}
            cy="46"
            rx="42"
            ry="22"
            fill="none"
            stroke={`rgba(56, 189, 248, ${fluxStrength.toFixed(2)})`}
            strokeWidth="1.6"
            strokeDasharray="4 2"
          />
          {/* Bar Magnet N-S following cursor */}
          <rect x={magX} y="36" width="22" height="20" fill="#3b82f6" rx="2" />
          <rect x={magX + 22} y="36" width="22" height="20" fill="#ef4444" rx="2" />
          <text x={magX + 28} y="49" fill="#fff" fontSize="9" fontFamily="monospace">
            N
          </text>
          {/* Conductive Induction Coil */}
          <ellipse
            cx={coilX}
            cy="46"
            rx="12"
            ry="28"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <text x="168" y="18" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
            ℰ = -dΦ_B/dt
          </text>
        </svg>
      );
    }
  }
};

interface ModelCatalogPortalProps {
  activeCourse: PhysicsCourseId;
  onChangeCourse: (course: PhysicsCourseId) => void;
  onSelectUnit: (unit: PhysicsUnitModule) => void;
  onOpenClassroom: () => void;
  onOpenStudentAccount?: () => void;
  onOpenSavedScenes: () => void;
  onOpenGuidedLab: () => void;
  onOpenTheory: () => void;
  onHeaderVisibilityChange?: (visible: boolean) => void;
  currentUser: UserProfile;
  studentCount: number;
  submissionCount: number;
}

export const ModelCatalogPortal: React.FC<ModelCatalogPortalProps> = ({
  activeCourse,
  onChangeCourse,
  onSelectUnit,
  onOpenClassroom,
  onOpenStudentAccount,
  onOpenSavedScenes,
  onOpenGuidedLab,
  onOpenTheory,
  onHeaderVisibilityChange,
  currentUser,
  studentCount,
  submissionCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const [cursorPos, setCursorPos] = useState({ x: 720, y: 400 });
  const [cursorSpeed, setCursorSpeed] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [cardCoords, setCardCoords] = useState<
    Record<string, { x: number; y: number; rx: number; ry: number; normX: number; normY: number }>
  >({});

  const isMechanics = activeCourse === 'mechanics';
  const activeUnits = isMechanics ? MECHANICS_UNITS : EM_UNITS;

  // Handle scroll direction to hide top navigation pods when scrolling down to modules
  // and reveal them when scrolling back up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentTop = e.currentTarget.scrollTop;
    const delta = currentTop - lastScrollTopRef.current;

    if (currentTop < 50) {
      onHeaderVisibilityChange?.(true);
    } else if (delta > 5 && currentTop > 70) {
      onHeaderVisibilityChange?.(false);
    } else if (delta < -5) {
      onHeaderVisibilityChange?.(true);
    }

    lastScrollTopRef.current = currentTop;
  };

  // Interactive Cursor-Following Physics Canvas (Mechanics Orbital Gravity Well vs. E&M Dipole Field)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width * 0.5, y: height * 0.35, vx: 0, vy: 0, active: false };
    const smoothMouse = { x: width * 0.5, y: height * 0.35 };

    const particles = Array.from({ length: 44 }, (_, i) => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        vx: (Math.random() - 0.5) * (isMechanics ? 1.4 : 0.45),
        vy: (Math.random() - 0.5) * (isMechanics ? 1.4 : 0.45),
        q: i % 2 === 0 ? 1 : -1,
        mass: 1 + (i % 3) * 0.6,
        radius: 1.6 + Math.random() * 1.9,
        trail: [{ x, y }],
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      const dvx = e.clientX - mouse.x;
      const dvy = e.clientY - mouse.y;
      mouse.vx = dvx;
      mouse.vy = dvy;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      setCursorPos({ x: e.clientX, y: e.clientY });
      setCursorSpeed(Math.min(99.9, Math.hypot(dvx, dvy) * 0.8));
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      const t = time * 0.001;

      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.09;
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.09;

      ctx.clearRect(0, 0, width, height);

      if (!isMechanics) {
        // E&M MODE: ELECTROSTATIC DIPOLE VECTOR LATTICE & LORENTZ CHARGES
        const grad = ctx.createRadialGradient(
          smoothMouse.x,
          smoothMouse.y,
          10,
          smoothMouse.x,
          smoothMouse.y,
          420
        );
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.13)');
        grad.addColorStop(0.45, 'rgba(14, 165, 233, 0.04)');
        grad.addColorStop(1, 'rgba(5, 8, 17, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const spacing = 64;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const gx = c * spacing;
            const gy = r * spacing;
            const dx = smoothMouse.x - gx;
            const dy = smoothMouse.y - gy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const influence = Math.max(0, 1 - dist / 460);
            const baseAngle =
              Math.sin(gx * 0.003 + t * 0.6) * Math.cos(gy * 0.003 + t * 0.4) * Math.PI;
            const targetAngle = Math.atan2(dy, dx);
            const angle = baseAngle * (1 - influence) + targetAngle * influence;

            const len = 7 + influence * 11;
            const ex = gx + Math.cos(angle) * len;
            const ey = gy + Math.sin(angle) * len;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(ex, ey);
            const alpha = 0.06 + influence * 0.32;
            ctx.strokeStyle =
              influence > 0.35
                ? `rgba(56, 189, 248, ${alpha.toFixed(3)})`
                : `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1 + influence * 0.8;
            ctx.stroke();

            if (influence > 0.15) {
              ctx.beginPath();
              ctx.arc(ex, ey, 1.3 + influence * 1.1, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(56, 189, 248, ${(influence * 0.55).toFixed(3)})`;
              ctx.fill();
            }
          }
        }

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = smoothMouse.x - p.x;
          const dy = smoothMouse.y - p.y;
          const d = Math.sqrt(dx * dx + dy * dy + 1200);

          if (d < 320) {
            const force = (p.q * 18) / (d * d);
            p.vx += (dx / d) * force + (-dy / d) * 0.015;
            p.vy += (dy / d) * force + (dx / d) * 0.015;
          }

          p.vx *= 0.97;
          p.vy *= 0.97;
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.q > 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(245, 158, 11, 0.4)';
          ctx.fill();
        }
      } else {
        // MECHANICS MODE: GRAVITATIONAL POTENTIAL WELL, KEPLER ORBITS & PHASE SPACE
        const grad = ctx.createRadialGradient(
          smoothMouse.x,
          smoothMouse.y,
          8,
          smoothMouse.x,
          smoothMouse.y,
          450
        );
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
        grad.addColorStop(0.45, 'rgba(20, 184, 166, 0.05)');
        grad.addColorStop(0.8, 'rgba(168, 85, 247, 0.02)');
        grad.addColorStop(1, 'rgba(4, 11, 9, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        [68, 136, 220].forEach((radius, idx) => {
          ctx.beginPath();
          ctx.arc(smoothMouse.x, smoothMouse.y, radius + Math.sin(t * 1.5 + idx) * 3, 0, Math.PI * 2);
          ctx.strokeStyle =
            idx === 0
              ? 'rgba(16, 185, 129, 0.14)'
              : idx === 1
              ? 'rgba(20, 184, 166, 0.09)'
              : 'rgba(245, 158, 11, 0.05)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 7]);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        const spacing = 64;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const gx = c * spacing;
            const gy = r * spacing;
            const dx = smoothMouse.x - gx;
            const dy = smoothMouse.y - gy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const influence = Math.max(0, 1 - dist / 480);
            const harmonicWave =
              Math.cos(gx * 0.003 + t * 0.7) * Math.sin(gy * 0.003 + t * 0.5) * Math.PI;
            const radialAngle = Math.atan2(dy, dx);
            const orbitalTangent = radialAngle + Math.PI * 0.36;
            const angle = harmonicWave * (1 - influence) + orbitalTangent * influence;

            const len = 7 + influence * 12;
            const ex = gx + Math.cos(angle) * len;
            const ey = gy + Math.sin(angle) * len;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(ex, ey);
            const alpha = 0.06 + influence * 0.34;
            ctx.strokeStyle =
              influence > 0.35
                ? `rgba(16, 185, 129, ${alpha.toFixed(3)})`
                : `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1 + influence * 0.85;
            ctx.stroke();

            if (influence > 0.15) {
              ctx.beginPath();
              ctx.arc(ex, ey, 1.3 + influence * 1.15, 0, Math.PI * 2);
              ctx.fillStyle =
                (r + c) % 3 === 0
                  ? `rgba(245, 158, 11, ${(influence * 0.55).toFixed(3)})`
                  : `rgba(16, 185, 129, ${(influence * 0.58).toFixed(3)})`;
              ctx.fill();
            }
          }
        }

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = smoothMouse.x - p.x;
          const dy = smoothMouse.y - p.y;
          const dSq = dx * dx + dy * dy + 1600;
          const d = Math.sqrt(dSq);

          if (d < 420) {
            const gPull = (36 * p.mass) / dSq;
            const swirl = 0.032 / Math.max(1, d * 0.015);
            p.vx += (dx / d) * gPull + (-dy / d) * swirl * p.q;
            p.vy += (dy / d) * gPull + (dx / d) * swirl * p.q;
          }

          p.vx *= 0.985;
          p.vy *= 0.985;
          p.x += p.vx;
          p.y += p.vy;

          let wrapped = false;
          if (p.x < 0) {
            p.x = width;
            wrapped = true;
          }
          if (p.x > width) {
            p.x = 0;
            wrapped = true;
          }
          if (p.y < 0) {
            p.y = height;
            wrapped = true;
          }
          if (p.y > height) {
            p.y = 0;
            wrapped = true;
          }

          if (wrapped) {
            p.trail = [{ x: p.x, y: p.y }];
          } else {
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 9) p.trail.shift();
          }

          if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let k = 1; k < p.trail.length; k++) {
              ctx.lineTo(p.trail[k].x, p.trail[k].y);
            }
            ctx.strokeStyle =
              p.q > 0 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.20)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.q > 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(245, 158, 11, 0.48)';
          ctx.fill();
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMechanics]);

  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -5.0;
    const ry = ((x - cx) / cx) * 5.0;
    const normX = rect.width > 0 ? x / rect.width : 0.5;
    const normY = rect.height > 0 ? y / rect.height : 0.5;
    setCardCoords(prev => ({ ...prev, [id]: { x, y, rx, ry, normX, normY } }));
  };

  // Global normalized cursor fallback so unit previews also subtly respond when moving cursor across page
  const globalNormX =
    typeof window !== 'undefined' ? Math.max(0.1, Math.min(0.9, cursorPos.x / window.innerWidth)) : 0.5;
  const globalNormY =
    typeof window !== 'undefined' ? Math.max(0.1, Math.min(0.9, cursorPos.y / window.innerHeight)) : 0.5;

  const cedUrl = isMechanics
    ? 'https://apcentral.collegeboard.org/media/pdf/ap-physics-c-mechanics-course-and-exam-description.pdf'
    : 'https://apcentral.collegeboard.org/media/pdf/ap-physics-c-electricity-and-magnetism-course-and-exam-description.pdf';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`relative w-full h-full overflow-y-auto overflow-x-hidden text-slate-100 scroll-smooth transition-colors duration-500 ${
        isMechanics ? 'bg-[#040b09]' : 'bg-[#050811]'
      }`}
    >
      {/* Interactive Cursor-Responsive Background Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Main Scrollable Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-24 pb-28 space-y-20">
        {/* ================================================================= */}
        {/* AP PHYSICS C CURRICULUM PAGE SWITCHER (MECHANICS LEFT, E&M RIGHT) */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-[#091220]/85 border border-white/10 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 px-3 py-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMechanics ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
            />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
              Select AP Physics C Curriculum Page:
            </span>
          </div>

          {/* Mechanics on Left, E&M on Right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              onClick={() => onChangeCourse('mechanics')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isMechanics
                  ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>AP Physics C: Mechanics</span>
            </button>

            <button
              onClick={() => onChangeCourse('em')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                !isMechanics
                  ? 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>AP Physics C: Electricity &amp; Magnetism</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* HERO SECTION (ADAPTS TO MECHANICS OR E&M PAGE)                    */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
          <div className="lg:col-span-7 space-y-6">
            <div
              className={`flex items-center space-x-2.5 text-xs font-mono tracking-wide ${
                isMechanics ? 'text-emerald-400' : 'text-sky-400'
              }`}
            >
              <span>
                {isMechanics
                  ? 'AP PHYSICS C · CLASSICAL MECHANICS'
                  : 'AP PHYSICS C · ELECTRICITY & MAGNETISM'}
              </span>
              <span>·</span>
              <span className="text-slate-400">INTERACTIVE 3D LABORATORY</span>
            </div>

            {isMechanics ? (
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.06]">
                Newtonian Dynamics &amp;{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                  Phase-Space Calculus
                </span>{' '}
                Observatory.
              </h1>
            ) : (
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.06]">
                Spatial Physics &amp;{' '}
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
                  Field Calculus
                </span>{' '}
                Observatory.
              </h1>
            )}

            <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl leading-relaxed font-normal">
              {isMechanics
                ? 'Explore all 7 AP Physics C: Mechanics curriculum units (Units 1–7). Move your cursor across any unit module below to interact with its preliminary physics preview, or click a unit to browse its subtopics and 3D simulations.'
                : 'Explore all 6 AP Physics C: Electricity & Magnetism curriculum units (Units 8–13). Move your cursor across any unit module below to interact with its preliminary field preview, or click a unit to browse its subtopics and 3D simulations.'}
            </p>

            {/* Single Primary Button Linking to Official College Board CED & Formula Sheet */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a
                href={cedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`group px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center space-x-2.5 shadow-lg ${
                  isMechanics
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-sky-500/20'
                }`}
              >
                <span>See Course &amp; Exam Description / Get Formula Sheet</span>
                <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            {/* Quiet Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2 font-mono">
              {isMechanics ? (
                <>
                  <span>Units 1–7 (7 Mechanics Modules)</span>
                  <span>·</span>
                  <span>Cursor-Reactive Unit Previews</span>
                  <span>·</span>
                  <span>Subtopic Simulation Directory</span>
                </>
              ) : (
                <>
                  <span>Units 8–13 (6 E&amp;M Modules)</span>
                  <span>·</span>
                  <span>Cursor-Reactive Unit Previews</span>
                  <span>·</span>
                  <span>Subtopic Simulation Directory</span>
                </>
              )}
            </div>
          </div>

          {/* Right Hero Interactive Cursor-Reactive Telemetry Card */}
          <div className="lg:col-span-5">
            <div
              onClick={() => onSelectUnit(activeUnits[0])}
              className={`group cursor-pointer relative rounded-2xl border p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 overflow-hidden ${
                isMechanics
                  ? 'bg-[#071612]/85 border-emerald-500/20 hover:border-emerald-400/50'
                  : 'bg-[#0a1122]/85 border-white/10 hover:border-sky-400/40'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div>
                  <div
                    className={`text-xs font-mono ${
                      isMechanics ? 'text-emerald-400' : 'text-sky-400'
                    }`}
                  >
                    {isMechanics
                      ? 'LIVE GRAVITATIONAL & ORBITAL PREVIEW'
                      : 'LIVE FIELD PREVIEW'}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {isMechanics
                      ? 'Cursor Central-Force Attractor'
                      : 'Cursor Dipole Vector Response'}
                  </h3>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center group-hover:scale-110 transition-transform ${
                    isMechanics
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  }`}
                >
                  {isMechanics ? (
                    <Orbit className="w-5 h-5" />
                  ) : (
                    <Compass className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Interactive Live Coordinate Readout Following User's Cursor */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs mb-5">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-slate-400">
                    {isMechanics ? 'ATTRACTOR COM (X, Y)' : 'CURSOR FIELD VECTOR (X, Y)'}
                  </div>
                  <div
                    className={`text-sm font-bold mt-1 ${
                      isMechanics ? 'text-emerald-300' : 'text-sky-300'
                    }`}
                  >
                    ({(cursorPos.x * 0.04 - 28).toFixed(1)}m, {(cursorPos.y * 0.04 - 16).toFixed(1)}m)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-slate-400">
                    {isMechanics ? 'CURSOR KINEMATIC |v|' : 'INTEGRATOR STEP (Δt)'}
                  </div>
                  <div className="text-sm font-bold text-amber-300 mt-1">
                    {isMechanics ? `${cursorSpeed.toFixed(1)} m/s · ΔE = 0` : '2.00 ms · Fixed RK4'}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                {isMechanics
                  ? 'Move your cursor across the page to shift the gravitational potential well, or click any Unit module below to open its subtopics page.'
                  : 'Move your cursor across the page to deflect the background electrostatic vector field, or click any Unit module below to open its subtopics page.'}
              </p>

              <div
                className={`flex items-center justify-between text-xs font-semibold pt-2 border-t border-white/10 ${
                  isMechanics ? 'text-emerald-300' : 'text-sky-300'
                }`}
              >
                <span>
                  Open {activeUnits[0].title}
                </span>
                <span className="font-mono">→</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* UNIT MODULE SELECTION DIRECTORY                                   */}
        {/* ================================================================= */}
        <section id="unit-directory" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div
                className={`text-xs font-mono uppercase tracking-wider ${
                  isMechanics ? 'text-emerald-400' : 'text-sky-400'
                }`}
              >
                01. {isMechanics ? 'AP Physics C: Mechanics Units (1–7)' : 'AP Physics C: E&M Units (8–13)'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                {isMechanics
                  ? 'Select a Mechanics Unit Module'
                  : 'Select an Electricity & Magnetism Unit Module'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Each unit card includes a cursor-responsive preliminary physics interaction and leads to its unit subtopics page.
              </p>
            </div>

            <div className="text-xs font-mono text-slate-400">
              {activeUnits.length} Curriculum Units
            </div>
          </div>

          {/* Interactive Cursor-Tracking Unit Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeUnits.map(unit => {
              const coords = cardCoords[unit.id] || {
                x: 180,
                y: 120,
                rx: 0,
                ry: 0,
                normX: globalNormX,
                normY: globalNormY,
              };
              const isHovered = hoveredCardId === unit.id;
              const liveSimCount = unit.subtopics.filter(s => Boolean(s.simulation)).length;

              const accentBorder =
                unit.accentColor === 'amber'
                  ? 'hover:border-amber-400/50'
                  : unit.accentColor === 'emerald'
                  ? 'hover:border-emerald-400/50'
                  : unit.accentColor === 'rose'
                  ? 'hover:border-rose-400/40'
                  : 'hover:border-sky-400/50';

              const spotlightColor =
                unit.accentColor === 'amber'
                  ? 'rgba(245, 158, 11, 0.14)'
                  : unit.accentColor === 'emerald'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : unit.accentColor === 'rose'
                  ? 'rgba(244, 63, 94, 0.12)'
                  : 'rgba(56, 189, 248, 0.14)';

              return (
                <div
                  key={unit.id}
                  onClick={() => onSelectUnit(unit)}
                  onMouseEnter={() => setHoveredCardId(unit.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onMouseMove={e => handleCardMouseMove(unit.id, e)}
                  style={{
                    transform: isHovered
                      ? `perspective(900px) rotateX(${coords.rx.toFixed(2)}deg) rotateY(${coords.ry.toFixed(2)}deg) translateY(-4px)`
                      : 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)',
                    backgroundImage: isHovered
                      ? `radial-gradient(360px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 75%)`
                      : undefined,
                  }}
                  className={`group cursor-pointer relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                    isMechanics
                      ? `bg-[#071511]/90 border border-emerald-500/20 ${accentBorder} shadow-xl`
                      : `bg-[#0a1224]/90 border border-white/15 ${accentBorder} shadow-xl`
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Unit Code & Subtopic Count */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={isMechanics ? 'text-emerald-400' : 'text-sky-400'}>
                        {unit.code}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {unit.subtopics.length} Subtopics
                          {liveSimCount > 0 ? ` · ${liveSimCount} Live 3D` : ''}
                        </span>
                      </span>
                    </div>

                    {/* Unit Title */}
                    <h3
                      className={`text-xl font-bold text-white transition-colors ${
                        isMechanics ? 'group-hover:text-emerald-300' : 'group-hover:text-sky-300'
                      }`}
                    >
                      {unit.title}
                    </h3>

                    {/* Preliminary Cursor-Following Physics Interaction for this Unit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>CURSOR INTERACTION PREVIEW</span>
                        <span className={isHovered ? 'text-emerald-300' : 'text-slate-500'}>
                          {isHovered ? 'ACTIVE TRACKING' : 'MOVE CURSOR'}
                        </span>
                      </div>
                      <UnitCursorInteraction
                        unitNumber={unit.unitNumber}
                        normX={isHovered ? coords.normX : globalNormX}
                        normY={isHovered ? coords.normY : globalNormY}
                        isHovered={isHovered}
                      />
                    </div>

                    {/* Governing Law */}
                    <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/[0.07] flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                        Unit Law
                      </span>
                      <span
                        className={`text-xs font-mono font-bold truncate ${
                          isMechanics ? 'text-emerald-300' : 'text-sky-300'
                        }`}
                      >
                        {unit.equation}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                    <span
                      className={
                        isMechanics
                          ? 'text-emerald-400 group-hover:text-emerald-300'
                          : 'text-sky-400 group-hover:text-sky-300'
                      }
                    >
                      Open {unit.code} Subtopics Page
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================= */}
        {/* 02. CLASSROOM ADMINISTRATION & LAB WORKFLOW LAYER                 */}
        {/* ================================================================= */}
        <section className="space-y-6">
          <div className="border-b border-white/10 pb-5">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              02. Academic Layer &amp; Teacher Administration
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
              Classroom Administration, Lab Reports &amp; Saved Scenes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentUser.role === 'instructor' ? (
              <div
                onClick={onOpenClassroom}
                className={`group cursor-pointer rounded-2xl border border-white/15 hover:border-amber-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl ${
                  isMechanics ? 'bg-[#071612]/90' : 'bg-[#0a1224]/90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-400">
                      INSTRUCTOR ADMINISTRATION
                    </span>
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    Class Roster &amp; Student Management
                  </h3>
                  <p className="text-xs text-slate-300/85 leading-relaxed">
                    View all enrolled students in {currentUser.className}, enroll new students,
                    remove students from the roster, reset submissions, and grade 3D lab reports.
                  </p>
                </div>
                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    {studentCount} Students · {submissionCount} Submissions
                  </span>
                  <span className="text-amber-400 font-sans font-bold flex items-center gap-1">
                    <span>Manage Class</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={onOpenStudentAccount}
                className={`group cursor-pointer rounded-2xl border border-white/15 hover:border-cyan-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl ${
                  isMechanics ? 'bg-[#071612]/90' : 'bg-[#0a1224]/90'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400">
                      STUDENT ACADEMIC ENROLLMENT
                    </span>
                    <GraduationCap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    My Course &amp; Account Choices
                  </h3>
                  <p className="text-xs text-slate-300/85 leading-relaxed">
                    Enrolled as student {currentUser.name} in {currentUser.className}. Instructor:
                    Dr. Robert Vance. Manage your account choices, reset progress, or manage device
                    logins.
                  </p>
                </div>
                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Student Profile · Active</span>
                  <span className="text-cyan-400 font-sans font-bold flex items-center gap-1">
                    <span>Account Choices</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            )}

            {/* Guided Lab Report Card */}
            <div
              onClick={onOpenGuidedLab}
              className={`group cursor-pointer rounded-2xl border border-white/15 hover:border-sky-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl ${
                isMechanics ? 'bg-[#071612]/90' : 'bg-[#0a1224]/90'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400">CURRICULUM ASSESSMENT</span>
                  <ClipboardList className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                  Lab 01: Coulomb Inverse-Square Verification
                </h3>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  Record experimental separation trials, compute analytical vs. simulated percent
                  error, attach live 3D scene snapshots, and submit for instructor grading.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">100 Point Rubric</span>
                <span className="text-sky-400 font-sans font-bold flex items-center gap-1">
                  <span>Open Lab Sheet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Saved Scenes & Theory Guide */}
            <div
              onClick={onOpenSavedScenes}
              className={`group cursor-pointer rounded-2xl border border-white/15 hover:border-emerald-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl ${
                isMechanics ? 'bg-[#071612]/90' : 'bg-[#0a1224]/90'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400">SNAPSHOT REPOSITORY</span>
                  <FolderOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Saved 3D Experiments &amp; JSON Snapshots
                </h3>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  Save custom charge arrangements and circuit topologies, export portable JSON scene
                  files, or restore auto-saved sessions across layers.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onOpenTheory();
                  }}
                  className="text-slate-300 hover:text-white underline font-sans"
                >
                  Read Calculus Theory Guide
                </button>
                <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                  <span>Open Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
