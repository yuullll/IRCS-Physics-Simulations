'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Cpu,
  ArrowRight,
  Compass,
  Layers,
  Magnet,
  Activity,
  Plus,
  GraduationCap,
  FolderOpen,
  ClipboardList,
  BookOpen,
  Play,
  Sliders,
  Users,
} from 'lucide-react';
import { UserProfile } from '@/lib/types/lab';

export interface PhysicsModelSlot {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  unit: string;
  equation: string;
  description: string;
  status: 'live' | 'blank';
  simulationMode?: 'field' | 'circuit';
  accentColor: 'cyan' | 'amber' | 'emerald' | 'rose' | 'sky';
  metrics: string[];
}

export const PHYSICS_MODEL_SLOTS: PhysicsModelSlot[] = [
  {
    id: 'model-field',
    code: '01',
    title: 'Electrostatic Field & Lorentz Dynamics',
    subtitle: '3D Vector Calculus & Invariant RK4 Trajectory Engine',
    unit: 'Unit 1 · Electrostatics',
    equation: 'F = q(E + v × B)',
    description:
      'Deploy point charges across a 60×60m Cartesian plane, inspect 3D electric field vectors and equipotential slices, and release zero-initial-velocity test particles governed by fixed-step 4th-order Runge-Kutta integration.',
    status: 'live',
    simulationMode: 'field',
    accentColor: 'cyan',
    metrics: ['60×60m Cartesian Grid', 'Fixed-dt RK4 Integrator', 'Equipotential Slicing'],
  },
  {
    id: 'model-circuit',
    code: '02',
    title: '3D Circuit Workbench & MNA Solver',
    subtitle: 'Real-Time Modified Nodal Analysis & Transient Oscilloscope',
    unit: 'Unit 3 · Electric Circuits',
    equation: '∑ I_in = ∑ I_out · ∑ ΔV = 0',
    description:
      'Construct series, parallel, RC filter, and Wheatstone bridge topologies on an illuminated 3D laboratory breadboard with live digital voltmeters, ammeters, and incandescent filament physics.',
    status: 'live',
    simulationMode: 'circuit',
    accentColor: 'amber',
    metrics: ['Matrix MNA Solver', 'Live V/I Oscilloscope', 'Orthogonal & Curved Wiring'],
  },
  {
    id: 'slot-gauss',
    code: '03',
    title: "Gauss's Law & 3D Flux Surfaces",
    subtitle: 'Closed Surface Integrals & Symmetry Topologies',
    unit: 'Unit 1 · Electrostatic Flux',
    equation: '∮ E · dA = Q_enc / ε₀',
    description:
      'Reserved simulation slot for interactive spherical, cylindrical, and planar Gaussian surfaces with live normal-vector flux integration.',
    status: 'blank',
    accentColor: 'emerald',
    metrics: ['Blank Model Slot', 'Spherical & Cylindrical Shells', 'Surface Integral Mesh'],
  },
  {
    id: 'slot-capacitance',
    code: '04',
    title: 'Dielectrics & Energy Density Space',
    subtitle: 'Polarization Dipoles & Electrostatic Field Energy',
    unit: 'Unit 2 · Conductors & Capacitors',
    equation: 'u_E = ½ κε₀ E²',
    description:
      'Reserved simulation slot for exploring dielectric slab insertion, induced surface charge density, and 3D volumetric energy storage.',
    status: 'blank',
    accentColor: 'sky',
    metrics: ['Blank Model Slot', 'Dielectric Breakdown', 'Volumetric Field Density'],
  },
  {
    id: 'slot-biot-savart',
    code: '05',
    title: 'Biot-Savart & Ampère Current Loops',
    subtitle: '3D Magnetic Fields of Solenoids, Toroids & Wires',
    unit: 'Unit 4 · Magnetic Fields',
    equation: 'dB = (μ₀ / 4π) (I dl × r̂) / r²',
    description:
      'Reserved simulation slot for integrating differential current elements in 3D space and visualizing magnetic circulation loops.',
    status: 'blank',
    accentColor: 'rose',
    metrics: ['Blank Model Slot', '3D Line Integral Path', 'Helmholtz Coil Array'],
  },
  {
    id: 'slot-faraday',
    code: '06',
    title: "Faraday's Law & Lenz Induction",
    subtitle: 'Time-Varying Magnetic Flux & Motional EMF',
    unit: 'Unit 5 · Electromagnetism',
    equation: 'ℰ = -dΦ_B / dt = ∮ E · dl',
    description:
      'Reserved simulation slot for moving bar magnets through conductive coils, eddy current damping, and AC generator dynamics.',
    status: 'blank',
    accentColor: 'cyan',
    metrics: ['Blank Model Slot', 'Dynamic Flux Linkage', 'Eddy Braking Torque'],
  },
  {
    id: 'slot-blank-1',
    code: '07',
    title: 'Open Simulation Slot · Module VII',
    subtitle: 'Unassigned Physics Sandbox Container',
    unit: 'Custom Expansion Slot',
    equation: '∇ × B = μ₀ J + μ₀ ε₀ ∂E/∂t',
    description:
      'Blank architectural slot reserved for upcoming interactive 3D physics models, custom differential equation solvers, and experimental scenes.',
    status: 'blank',
    accentColor: 'emerald',
    metrics: ['Blank Slot', 'Ready for Deployment', 'WebGL / Three.js Pipeline'],
  },
  {
    id: 'slot-blank-2',
    code: '08',
    title: 'Open Simulation Slot · Module VIII',
    subtitle: 'Unassigned Physics Sandbox Container',
    unit: 'Custom Expansion Slot',
    equation: '∂²ψ/∂t² = c² ∇²ψ',
    description:
      'Blank architectural slot reserved for future wave mechanics, optics, or relativistic field simulations in the curriculum catalog.',
    status: 'blank',
    accentColor: 'amber',
    metrics: ['Blank Slot', 'Ready for Deployment', 'WebGL / Three.js Pipeline'],
  },
];

interface ModelCatalogPortalProps {
  onSelectModel: (slot: PhysicsModelSlot) => void;
  onOpenClassroom: () => void;
  onOpenStudentAccount?: () => void;
  onOpenSavedScenes: () => void;
  onOpenGuidedLab: () => void;
  onOpenTheory: () => void;
  currentUser: UserProfile;
  studentCount: number;
  submissionCount: number;
}

export const ModelCatalogPortal: React.FC<ModelCatalogPortalProps> = ({
  onSelectModel,
  onOpenClassroom,
  onOpenStudentAccount,
  onOpenSavedScenes,
  onOpenGuidedLab,
  onOpenTheory,
  currentUser,
  studentCount,
  submissionCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'blank'>('all');
  const [cursorPos, setCursorPos] = useState({ x: 720, y: 400 });
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [cardCoords, setCardCoords] = useState<Record<string, { x: number; y: number; rx: number; ry: number }>>({});

  // Interactive Cursor-Following Vector Field & Particle Canvas
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

    // Ambient floating field particles that react to cursor
    const particles = Array.from({ length: 42 }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      q: i % 2 === 0 ? 1 : -1,
      radius: 1.5 + Math.random() * 1.8,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouse.vx = e.clientX - mouse.x;
      mouse.vy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      setCursorPos({ x: e.clientX, y: e.clientY });
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

      // 1. Subtle Cursor-Following Radial Glow
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

      // 2. Interactive Dipole Vector Grid that Orients Toward the User's Cursor
      const spacing = 64;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gx = c * spacing;
          const gy = r * spacing;
          const dx = smoothMouse.x - gx;
          const dy = smoothMouse.y - gy;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          // Angle points toward cursor with a gentle harmonic wave far away
          const influence = Math.max(0, 1 - dist / 460);
          const baseAngle = Math.sin(gx * 0.003 + t * 0.6) * Math.cos(gy * 0.003 + t * 0.4) * Math.PI;
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

          // Vector tip dot
          if (influence > 0.15) {
            ctx.beginPath();
            ctx.arc(ex, ey, 1.3 + influence * 1.1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${(influence * 0.55).toFixed(3)})`;
            ctx.fill();
          }
        }
      }

      // 3. Interactive Floating Test Particles Reacting to Cursor Charge
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = smoothMouse.x - p.x;
        const dy = smoothMouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy + 1200);

        if (d < 320) {
          // Gentle tangential + radial swirl around cursor
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
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const filteredSlots = PHYSICS_MODEL_SLOTS.filter(s => {
    if (filter === 'live') return s.status === 'live';
    if (filter === 'blank') return s.status === 'blank';
    return true;
  });

  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -5.5;
    const ry = ((x - cx) / cx) * 5.5;
    setCardCoords(prev => ({ ...prev, [id]: { x, y, rx, ry } }));
  };

  return (
    <div className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#050811] text-slate-100 scroll-smooth">
      {/* Interactive Cursor-Responsive Background Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Main Scrollable Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-24 pb-28 space-y-24">
        {/* ================================================================= */}
        {/* HERO SECTION                                                      */}
        {/* ================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-4">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center space-x-2.5 text-xs font-mono text-sky-400 tracking-wide">
              <span>AP PHYSICS C · ELECTRICITY &amp; MAGNETISM</span>
              <span>·</span>
              <span className="text-slate-400">INTERACTIVE 3D LABORATORY</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.06]">
              Spatial Physics &amp;{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">
                Field Calculus
              </span>{' '}
              Observatory.
            </h1>

            <p className="text-base sm:text-lg text-slate-300/90 max-w-2xl leading-relaxed font-normal">
              Explore real-time 3D vector fields, invariant Runge-Kutta particle dynamics, and
              Modified Nodal Analysis circuit topologies. Select an interactive simulation model
              below or scroll to inspect upcoming curriculum slots.
            </p>

            {/* Primary Hero Actions */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => onSelectModel(PHYSICS_MODEL_SLOTS[0])}
                className="group px-5 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center space-x-2.5 shadow-lg shadow-sky-500/20"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Launch Electric Field Sandbox</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => onSelectModel(PHYSICS_MODEL_SLOTS[1])}
                className="group px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/15 font-semibold text-sm transition-all duration-200 flex items-center space-x-2.5 backdrop-blur-md"
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Open 3D Circuit Workbench</span>
                <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Quiet Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-2 font-mono">
              <span>2 Live 3D Engines</span>
              <span>·</span>
              <span>6 Curriculum Expansion Slots</span>
              <span>·</span>
              <span>Cursor-Reactive Field Lattice</span>
            </div>
          </div>

          {/* Right Hero Interactive Cursor-Reactive Telemetry Card */}
          <div className="lg:col-span-5">
            <div
              onClick={() => onSelectModel(PHYSICS_MODEL_SLOTS[0])}
              className="group cursor-pointer relative rounded-2xl bg-[#0a1122]/85 border border-white/10 hover:border-sky-400/40 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div>
                  <div className="text-xs font-mono text-sky-400">LIVE FIELD PREVIEW</div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Cursor Dipole Vector Response
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
              </div>

              {/* Interactive Live Coordinate Readout Following User's Cursor */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs mb-5">
                <div className="p-3 rounded-xl bg-[#050811]/90 border border-white/5">
                  <div className="text-[10px] text-slate-400">CURSOR FIELD VECTOR (X, Y)</div>
                  <div className="text-sm font-bold text-sky-300 mt-1">
                    ({(cursorPos.x * 0.04 - 28).toFixed(1)}m, {(cursorPos.y * 0.04 - 16).toFixed(1)}m)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#050811]/90 border border-white/5">
                  <div className="text-[10px] text-slate-400">INTEGRATOR STEP (Δt)</div>
                  <div className="text-sm font-bold text-emerald-300 mt-1">
                    2.00 ms · Fixed RK4
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                Move your cursor across the page to deflect the background electrostatic vector
                field. Click any simulation card below to enter its dedicated 3D laboratory layer.
              </p>

              <div className="flex items-center justify-between text-xs font-semibold text-sky-300 pt-2 border-t border-white/10">
                <span>Enter 3D Simulation Layer</span>
                <span className="font-mono">→</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* MODEL SELECTION DIRECTORY (SCROLLABLE GRID WITH BLANK SLOTS)       */}
        {/* ================================================================= */}
        <section id="model-directory" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="text-xs font-mono text-sky-400 uppercase tracking-wider">
                01. Simulation Model Catalog
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                Select an Interactive Physics Model
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Active 3D simulations launch immediately; reserved slots preview upcoming curriculum modules.
              </p>
            </div>

            {/* Clean Segmented Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-[#0b1326] rounded-xl border border-white/10 self-start">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'all'
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Slots ({PHYSICS_MODEL_SLOTS.length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'live'
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live 3D Models (2)
              </button>
              <button
                onClick={() => setFilter('blank')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === 'blank'
                    ? 'bg-sky-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Blank / Reserved Slots (6)
              </button>
            </div>
          </div>

          {/* Interactive Cursor-Tracking Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSlots.map(slot => {
              const isLive = slot.status === 'live';
              const coords = cardCoords[slot.id] || { x: 180, y: 120, rx: 0, ry: 0 };
              const isHovered = hoveredCardId === slot.id;

              const accentBorder =
                slot.accentColor === 'amber'
                  ? 'hover:border-amber-400/50'
                  : slot.accentColor === 'emerald'
                  ? 'hover:border-emerald-400/40'
                  : slot.accentColor === 'rose'
                  ? 'hover:border-rose-400/40'
                  : 'hover:border-sky-400/50';

              const spotlightColor =
                slot.accentColor === 'amber'
                  ? 'rgba(245, 158, 11, 0.14)'
                  : slot.accentColor === 'emerald'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : slot.accentColor === 'rose'
                  ? 'rgba(244, 63, 94, 0.12)'
                  : 'rgba(56, 189, 248, 0.14)';

              return (
                <div
                  key={slot.id}
                  onClick={() => onSelectModel(slot)}
                  onMouseEnter={() => setHoveredCardId(slot.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onMouseMove={e => handleCardMouseMove(slot.id, e)}
                  style={{
                    transform: isHovered
                      ? `perspective(900px) rotateX(${coords.rx.toFixed(2)}deg) rotateY(${coords.ry.toFixed(2)}deg) translateY(-4px)`
                      : 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)',
                    backgroundImage: isHovered
                      ? `radial-gradient(360px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 75%)`
                      : undefined,
                  }}
                  className={`group cursor-pointer relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between ${
                    isLive
                      ? `bg-[#0a1224]/90 border border-white/15 ${accentBorder} shadow-xl`
                      : `bg-[#070c18]/75 border border-dashed border-white/10 ${accentBorder}`
                  }`}
                >
                  <div>
                    {/* Top Row: Editorial Index & Status Text */}
                    <div className="flex items-center justify-between text-xs font-mono mb-4">
                      <span className="text-slate-400">
                        {slot.code} · {slot.unit}
                      </span>
                      <span
                        className={
                          isLive
                            ? 'text-emerald-400 font-semibold flex items-center gap-1.5'
                            : 'text-slate-500'
                        }
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        {isLive ? 'LIVE 3D MODEL' : 'BLANK SLOT'}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                      {slot.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{slot.subtitle}</p>

                    {/* Governing Equation Callout */}
                    <div className="my-4 px-3.5 py-2.5 rounded-xl bg-[#050811]/90 border border-white/[0.07] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Governing Law
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-300">
                        {slot.equation}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300/85 leading-relaxed">
                      {slot.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                    {/* Quiet inline capability metadata */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                      {slot.metrics.map((m, idx) => (
                        <React.Fragment key={m}>
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <span>{m}</span>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span
                        className={
                          isLive
                            ? 'text-sky-400 group-hover:text-sky-300'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }
                      >
                        {isLive ? 'Enter 3D Simulation Workspace' : 'Inspect Reserved Slot Blueprint'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </div>
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
            {/* Teacher Class Roster vs Student Academic Enrollment Card */}
            {currentUser.role === 'instructor' ? (
              <div
                onClick={onOpenClassroom}
                className="group cursor-pointer rounded-2xl bg-[#0a1224]/90 border border-white/15 hover:border-amber-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl"
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
                    View all enrolled students in {currentUser.className}, enroll new students, remove
                    students from the roster, reset submissions, and grade 3D lab reports.
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
                className="group cursor-pointer rounded-2xl bg-[#0a1224]/90 border border-white/15 hover:border-cyan-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl"
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
                    Enrolled as student {currentUser.name} in {currentUser.className}. Instructor: Dr. Robert Vance. Manage your account choices, reset progress, or manage device logins.
                  </p>
                </div>
                <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">
                    Student Profile · Active
                  </span>
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
              className="group cursor-pointer rounded-2xl bg-[#0a1224]/90 border border-white/15 hover:border-sky-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl"
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
              className="group cursor-pointer rounded-2xl bg-[#0a1224]/90 border border-white/15 hover:border-emerald-400/50 p-6 transition-all duration-200 flex flex-col justify-between shadow-xl"
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
