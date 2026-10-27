'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Sliders,
  Info,
  ChevronDown,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Move,
  ArrowLeftRight,
  Navigation,
  Sparkles,
  Layers,
} from 'lucide-react';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type VectorLabSubMode = 'addition' | 'unit_vector' | 'scalar_vs_vector' | 'sign_1d';

interface ScalarsVectorsWorkbenchProps {
  onToast?: (msg: string) => void;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

export const ScalarsVectorsWorkbench: React.FC<ScalarsVectorsWorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
  onViewModeChange,
}) => {
  const [labMode, setLabMode] = useState<VectorLabSubMode>('addition');
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(false);

  // 3D Camera Orbit Angles (when in 3D view mode)
  const [camYawDeg, setCamYawDeg] = useState<number>(32);
  const [camPitchDeg, setCamPitchDeg] = useState<number>(24);
  const isOrbitDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mode 1: Vector Addition & Unit Vector Notation (1.1.A.2, 1.1.A.4.i, 1.1.A.4.iii)
  const [vecA, setVecA] = useState<Vector3D>({ x: 5.0, y: 3.0, z: 2.0 });
  const [vecB, setVecB] = useState<Vector3D>({ x: -2.0, y: 4.0, z: 3.0 });
  const [additionPlacement, setAdditionPlacement] = useState<'tip_to_tail' | 'origin'>('tip_to_tail');
  const [showComponents, setShowComponents] = useState<boolean>(true);
  const [notationStyle, setNotationStyle] = useState<'unit_vector' | 'mag_dir'>('unit_vector');

  // Mode 2: Position Vector r & Unit Vector r_hat (1.1.A.4.ii)
  const [posR, setPosR] = useState<Vector3D>({ x: 6.0, y: 4.0, z: 3.0 });

  // Mode 3: Scalar vs Vector Path Lab (1.1.A.1 & 1.1.A.3)
  const [pathStart] = useState<Vector3D>({ x: -6.0, y: -2.0, z: 0.0 });
  const [pathMid, setPathMid] = useState<Vector3D>({ x: 2.0, y: 5.0, z: 2.0 });
  const [pathEnd, setPathEnd] = useState<Vector3D>({ x: 6.0, y: -3.0, z: -1.0 });
  const [pathProgress, setPathProgress] = useState<number>(0.65); // 0 to 1 (t / T_total)
  const [isPathPlaying, setIsPathPlaying] = useState<boolean>(false);
  const totalTimeSec = 10.0;

  // Mode 4: 1D Coordinate System Sign Convention (1.1.A.5)
  const [axisPositiveRight, setAxisPositiveRight] = useState<boolean>(true);
  const [pos1DPhysical, setPos1DPhysical] = useState<number>(4.0); // physical meters right of origin
  const [vel1DPhysical, setVel1DPhysical] = useState<number>(-3.5); // physical m/s (negative = moving left)
  const [acc1DPhysical, setAcc1DPhysical] = useState<number>(2.0); // physical m/s^2 (positive = pointing right)

  // Dragging handles in 2D mode
  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<
    'A' | 'B' | 'R' | 'mid' | 'end' | null
  >(null);

  // Animation loop for Scalar vs Vector Path Lab
  useEffect(() => {
    if (!isPathPlaying) return;
    let animId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setPathProgress(prev => {
        const next = prev + dt * 0.18;
        return next > 1.0 ? 0.0 : next;
      });
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPathPlaying]);

  // Effective vectors depending on 2D vs 3D viewMode
  const is3D = externalViewMode === '3d';
  const effA: Vector3D = is3D ? vecA : { x: vecA.x, y: vecA.y, z: 0 };
  const effB: Vector3D = is3D ? vecB : { x: vecB.x, y: vecB.y, z: 0 };
  const effC: Vector3D = {
    x: effA.x + effB.x,
    y: effA.y + effB.y,
    z: effA.z + effB.z,
  };

  const effPosR: Vector3D = is3D ? posR : { x: posR.x, y: posR.y, z: 0 };
  const magPosR = Math.max(0.001, Math.hypot(effPosR.x, effPosR.y, effPosR.z));
  const unitR: Vector3D = {
    x: effPosR.x / magPosR,
    y: effPosR.y / magPosR,
    z: effPosR.z / magPosR,
  };

  // Vector helper calculations
  const getMagnitude = (v: Vector3D) => Math.hypot(v.x, v.y, v.z);
  const getAzimuthDeg = (v: Vector3D) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
  const getElevationDeg = (v: Vector3D) => {
    const mag = getMagnitude(v);
    if (mag < 1e-6) return 0;
    return (Math.asin(v.z / mag) * 180) / Math.PI;
  };

  const formatUnitVector = (v: Vector3D, precision = 2) => {
    const fmt = (n: number, sym: string, first = false) => {
      const sign = n >= 0 ? (first ? '' : ' + ') : first ? '−' : ' − ';
      return `${sign}${Math.abs(n).toFixed(precision)}${sym}`;
    };
    if (is3D) {
      return `${fmt(v.x, 'î', true)}${fmt(v.y, 'ĵ')}${fmt(v.z, 'k̂')}`;
    }
    return `${fmt(v.x, 'î', true)}${fmt(v.y, 'ĵ')}`;
  };

  // 3D / 2D Projection to 1000x600 SVG Canvas
  const projectPoint = (pt: Vector3D): { sx: number; sy: number } => {
    const scale = 30; // pixels per meter
    if (!is3D) {
      return {
        sx: 500 + pt.x * scale,
        sy: 300 - pt.y * scale,
      };
    }
    // 3D Orthographic-Perspective Projection with yaw and pitch
    // Standard right-handed coordinate visual: X right/forward, Y up, Z out/depth
    const yaw = (camYawDeg * Math.PI) / 180;
    const pitch = (camPitchDeg * Math.PI) / 180;

    // Rotate around Y (vertical axis in screen space is Y, depth is Z)
    const x1 = pt.x * Math.cos(yaw) + pt.z * Math.sin(yaw);
    const z1 = -pt.x * Math.sin(yaw) + pt.z * Math.cos(yaw);
    const y1 = pt.y * Math.cos(pitch) - z1 * Math.sin(pitch);

    return {
      sx: 500 + x1 * scale,
      sy: 310 - y1 * scale,
    };
  };

  // Mouse handlers for 2D vector tip dragging or 3D camera orbit
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingTarget) return;
    if (is3D) {
      isOrbitDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingTarget && !is3D && svgContainerRef.current) {
      const rect = svgContainerRef.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 1000;
      const py = ((e.clientY - rect.top) / rect.height) * 600;
      const mx = parseFloat(Math.max(-10, Math.min(10, (px - 500) / 30)).toFixed(1));
      const my = parseFloat(Math.max(-8, Math.min(8, (300 - py) / 30)).toFixed(1));

      if (draggingTarget === 'A') {
        setVecA(prev => ({ ...prev, x: mx, y: my }));
      } else if (draggingTarget === 'B') {
        if (additionPlacement === 'tip_to_tail') {
          setVecB(prev => ({
            ...prev,
            x: parseFloat(Math.max(-10, Math.min(10, mx - vecA.x)).toFixed(1)),
            y: parseFloat(Math.max(-8, Math.min(8, my - vecA.y)).toFixed(1)),
          }));
        } else {
          setVecB(prev => ({ ...prev, x: mx, y: my }));
        }
      } else if (draggingTarget === 'R') {
        setPosR(prev => ({ ...prev, x: mx, y: my }));
      } else if (draggingTarget === 'mid') {
        setPathMid(prev => ({ ...prev, x: mx, y: my }));
      } else if (draggingTarget === 'end') {
        setPathEnd(prev => ({ ...prev, x: mx, y: my }));
      }
      return;
    }

    if (isOrbitDraggingRef.current && is3D) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setCamYawDeg(prev => (prev - dx * 0.45) % 360);
      setCamPitchDeg(prev => Math.max(-65, Math.min(65, prev + dy * 0.35)));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingTarget(null);
    isOrbitDraggingRef.current = false;
  };

  // Mode 3 Path Calculations (Scalar Distance & Speed vs Vector Position, Displacement, Velocity, Acceleration)
  const effStart: Vector3D = is3D ? pathStart : { ...pathStart, z: 0 };
  const effMid: Vector3D = is3D ? pathMid : { ...pathMid, z: 0 };
  const effEnd: Vector3D = is3D ? pathEnd : { ...pathEnd, z: 0 };

  const leg1Vec: Vector3D = {
    x: effMid.x - effStart.x,
    y: effMid.y - effStart.y,
    z: effMid.z - effStart.z,
  };
  const leg2Vec: Vector3D = {
    x: effEnd.x - effMid.x,
    y: effEnd.y - effMid.y,
    z: effEnd.z - effMid.z,
  };
  const leg1Len = getMagnitude(leg1Vec);
  const leg2Len = getMagnitude(leg2Vec);

  // Current position along 2-segment path at pathProgress in [0, 1]
  const currentParticlePos: Vector3D =
    pathProgress <= 0.5
      ? {
          x: effStart.x + leg1Vec.x * (pathProgress * 2),
          y: effStart.y + leg1Vec.y * (pathProgress * 2),
          z: effStart.z + leg1Vec.z * (pathProgress * 2),
        }
      : {
          x: effMid.x + leg2Vec.x * ((pathProgress - 0.5) * 2),
          y: effMid.y + leg2Vec.y * ((pathProgress - 0.5) * 2),
          z: effMid.z + leg2Vec.z * ((pathProgress - 0.5) * 2),
        };

  const scalarDistanceTraveled =
    pathProgress <= 0.5
      ? leg1Len * (pathProgress * 2)
      : leg1Len + leg2Len * ((pathProgress - 0.5) * 2);

  const vectorDisplacement: Vector3D = {
    x: currentParticlePos.x - effStart.x,
    y: currentParticlePos.y - effStart.y,
    z: currentParticlePos.z - effStart.z,
  };
  const displacementMag = getMagnitude(vectorDisplacement);
  const elapsedSec = Math.max(0.1, pathProgress * totalTimeSec);
  const scalarAvgSpeed = scalarDistanceTraveled / elapsedSec;
  const vectorAvgVelocity: Vector3D = {
    x: vectorDisplacement.x / elapsedSec,
    y: vectorDisplacement.y / elapsedSec,
    z: vectorDisplacement.z / elapsedSec,
  };

  // Instantaneous velocity vector on current leg
  const instVelocityVec: Vector3D =
    pathProgress <= 0.5
      ? {
          x: leg1Vec.x / (totalTimeSec * 0.5),
          y: leg1Vec.y / (totalTimeSec * 0.5),
          z: leg1Vec.z / (totalTimeSec * 0.5),
        }
      : {
          x: leg2Vec.x / (totalTimeSec * 0.5),
          y: leg2Vec.y / (totalTimeSec * 0.5),
          z: leg2Vec.z / (totalTimeSec * 0.5),
        };

  // Acceleration vector impulse at the turn (v2 - v1) / dt
  const turnAccelVec: Vector3D = {
    x: (leg2Vec.x - leg1Vec.x) / (totalTimeSec * 0.25),
    y: (leg2Vec.y - leg1Vec.y) / (totalTimeSec * 0.25),
    z: (leg2Vec.z - leg1Vec.z) / (totalTimeSec * 0.25),
  };

  // Mode 4: 1D Coordinate System Sign Convention Values (LO 1.1.A.5)
  const signMultiplier = axisPositiveRight ? 1 : -1;
  const signedPos1D = pos1DPhysical * signMultiplier;
  const signedVel1D = vel1DPhysical * signMultiplier;
  const signedAcc1D = acc1DPhysical * signMultiplier;

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#040b09] text-slate-100 overflow-hidden select-none font-sans"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      {/* Main Interactive Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Interactive 2D/3D Coordinate Grid Stage */}
        <div
          ref={svgContainerRef}
          className={`flex-1 relative bg-gradient-to-b from-[#030907] to-[#06130f] overflow-hidden ${
            is3D ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
        >
          <svg viewBox="0 0 1000 600" className="absolute inset-0 w-full h-full select-none">
            <defs>
              <pattern id="vecGridMinor" width="30" height="30" patternUnits="userSpaceOnUse">
                <path
                  d="M 30 0 L 0 0 0 30"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.05)"
                  strokeWidth="1"
                />
              </pattern>
              <pattern id="vecGridMajor" width="150" height="150" patternUnits="userSpaceOnUse">
                <rect width="150" height="150" fill="url(#vecGridMinor)" />
                <path
                  d="M 150 0 L 0 0 0 150"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.12)"
                  strokeWidth="1.2"
                />
              </pattern>

              <marker
                id="arrowVecA"
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
                id="arrowVecB"
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
                id="arrowVecC"
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
                id="arrowUnitHat"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#facc15" />
              </marker>
              <marker
                id="arrowRose"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb7185" />
              </marker>
            </defs>

            <rect width="1000" height="600" fill="url(#vecGridMajor)" />

            {/* Coordinate System Axes (2D or 3D î, ĵ, k̂) */}
            {labMode !== 'sign_1d' && (() => {
              const orig = projectPoint({ x: 0, y: 0, z: 0 });
              const xPos = projectPoint({ x: 9.5, y: 0, z: 0 });
              const xNeg = projectPoint({ x: -9.5, y: 0, z: 0 });
              const yPos = projectPoint({ x: 0, y: 7.5, z: 0 });
              const yNeg = projectPoint({ x: 0, y: -7.5, z: 0 });
              const zPos = projectPoint({ x: 0, y: 0, z: 8.5 });
              const zNeg = projectPoint({ x: 0, y: 0, z: -8.5 });

              // Unit basis vectors î, ĵ, k̂ at origin
              const iHat = projectPoint({ x: 1, y: 0, z: 0 });
              const jHat = projectPoint({ x: 0, y: 1, z: 0 });
              const kHat = projectPoint({ x: 0, y: 0, z: 1 });

              return (
                <g>
                  {/* X Axis */}
                  <line
                    x1={xNeg.sx}
                    y1={xNeg.sy}
                    x2={xPos.sx}
                    y2={xPos.sy}
                    stroke="rgba(248, 113, 113, 0.35)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xPos.sx + 10}
                    y={xPos.sy + 4}
                    fill="#fca5a5"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +x (î)
                  </text>

                  {/* Y Axis */}
                  <line
                    x1={yNeg.sx}
                    y1={yNeg.sy}
                    x2={yPos.sx}
                    y2={yPos.sy}
                    stroke="rgba(52, 211, 153, 0.35)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={yPos.sx + 8}
                    y={yPos.sy - 6}
                    fill="#6ee7b7"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +y (ĵ)
                  </text>

                  {/* Z Axis (in 3D mode) */}
                  {is3D && (
                    <>
                      <line
                        x1={zNeg.sx}
                        y1={zNeg.sy}
                        x2={zPos.sx}
                        y2={zPos.sy}
                        stroke="rgba(56, 189, 248, 0.35)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={zPos.sx + 8}
                        y={zPos.sy + 4}
                        fill="#7dd3fc"
                        fontSize="12"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        +z (k̂)
                      </text>
                    </>
                  )}

                  {/* Basis Unit Vectors î, ĵ, k̂ of length 1 */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={iHat.sx}
                    y2={iHat.sy}
                    stroke="#f87171"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={jHat.sx}
                    y2={jHat.sy}
                    stroke="#34d399"
                    strokeWidth="2.5"
                  />
                  {is3D && (
                    <line
                      x1={orig.sx}
                      y1={orig.sy}
                      x2={kHat.sx}
                      y2={kHat.sy}
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                    />
                  )}
                  <circle cx={orig.sx} cy={orig.sy} r="3.5" fill="#ffffff" />
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 1: VECTOR ADDITION & UNIT VECTOR ALGEBRA (C = A + B)         */}
            {/* ================================================================= */}
            {labMode === 'addition' && (() => {
              const orig = projectPoint({ x: 0, y: 0, z: 0 });
              const tipA = projectPoint(effA);
              const startB =
                additionPlacement === 'tip_to_tail' ? tipA : orig;
              const endB =
                additionPlacement === 'tip_to_tail'
                  ? projectPoint(effC)
                  : projectPoint(effB);
              const tipC = projectPoint(effC);

              // Component legs for Vector A
              const axPt = projectPoint({ x: effA.x, y: 0, z: 0 });
              const axyPt = projectPoint({ x: effA.x, y: effA.y, z: 0 });

              return (
                <g>
                  {/* Component Projections for Vector A */}
                  {showComponents && (
                    <g opacity="0.75">
                      <line
                        x1={orig.sx}
                        y1={orig.sy}
                        x2={axPt.sx}
                        y2={axPt.sy}
                        stroke="#f87171"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      <line
                        x1={axPt.sx}
                        y1={axPt.sy}
                        x2={axyPt.sx}
                        y2={axyPt.sy}
                        stroke="#34d399"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      {is3D && (
                        <line
                          x1={axyPt.sx}
                          y1={axyPt.sy}
                          x2={tipA.sx}
                          y2={tipA.sy}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                      )}
                    </g>
                  )}

                  {/* Parallelogram helper lines when origin-centered */}
                  {additionPlacement === 'origin' && (
                    <g opacity="0.45">
                      <line
                        x1={tipA.sx}
                        y1={tipA.sy}
                        x2={tipC.sx}
                        y2={tipC.sy}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                      />
                      <line
                        x1={endB.sx}
                        y1={endB.sy}
                        x2={tipC.sx}
                        y2={tipC.sy}
                        stroke="#34d399"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                      />
                    </g>
                  )}

                  {/* Vector A Arrow */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={tipA.sx}
                    y2={tipA.sy}
                    stroke="#34d399"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecA)"
                  />
                  <g transform={`translate(${(orig.sx + tipA.sx) / 2}, ${(orig.sy + tipA.sy) / 2 - 14})`}>
                    <rect
                      x="-68"
                      y="-11"
                      width="136"
                      height="22"
                      rx="6"
                      fill="#04150f"
                      stroke="#34d399"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {notationStyle === 'unit_vector'
                        ? `A = ${formatUnitVector(effA, 1)}`
                        : `|A| = ${getMagnitude(effA).toFixed(2)}m`}
                    </text>
                  </g>

                  {/* Vector B Arrow */}
                  <line
                    x1={startB.sx}
                    y1={startB.sy}
                    x2={endB.sx}
                    y2={endB.sy}
                    stroke="#38bdf8"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecB)"
                  />
                  <g
                    transform={`translate(${(startB.sx + endB.sx) / 2}, ${
                      (startB.sy + endB.sy) / 2 - 14
                    })`}
                  >
                    <rect
                      x="-68"
                      y="-11"
                      width="136"
                      height="22"
                      rx="6"
                      fill="#061526"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {notationStyle === 'unit_vector'
                        ? `B = ${formatUnitVector(effB, 1)}`
                        : `|B| = ${getMagnitude(effB).toFixed(2)}m`}
                    </text>
                  </g>

                  {/* Resultant Vector C = A + B Arrow */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={tipC.sx}
                    y2={tipC.sy}
                    stroke="#f59e0b"
                    strokeWidth="4.2"
                    strokeDasharray="6 3"
                    markerEnd="url(#arrowVecC)"
                  />
                  <g transform={`translate(${tipC.sx}, ${tipC.sy - 22})`}>
                    <rect
                      x="-85"
                      y="-11"
                      width="170"
                      height="22"
                      rx="6"
                      fill="#1c1104"
                      stroke="#f59e0b"
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#fcd34d"
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {notationStyle === 'unit_vector'
                        ? `C = A+B = ${formatUnitVector(effC, 1)}`
                        : `|C| = ${getMagnitude(effC).toFixed(2)}m`}
                    </text>
                  </g>

                  {/* Interactive 2D Drag Handles */}
                  {!is3D && (
                    <>
                      <circle
                        cx={tipA.sx}
                        cy={tipA.sy}
                        r="9"
                        fill="rgba(52, 211, 153, 0.3)"
                        stroke="#34d399"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseDown={e => {
                          e.stopPropagation();
                          setDraggingTarget('A');
                        }}
                      />
                      <circle
                        cx={endB.sx}
                        cy={endB.sy}
                        r="9"
                        fill="rgba(56, 189, 248, 0.3)"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseDown={e => {
                          e.stopPropagation();
                          setDraggingTarget('B');
                        }}
                      />
                    </>
                  )}
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 2: POSITION VECTOR r & UNIT VECTOR r_hat (LO 1.1.A.4.ii)     */}
            {/* ================================================================= */}
            {labMode === 'unit_vector' && (() => {
              const orig = projectPoint({ x: 0, y: 0, z: 0 });
              const tipR = projectPoint(effPosR);
              // Scale unit vector visual slightly so 1.0m is clearly visible on the grid
              const tipUnit = projectPoint({
                x: unitR.x * 2.2,
                y: unitR.y * 2.2,
                z: unitR.z * 2.2,
              });
              const rxPt = projectPoint({ x: effPosR.x, y: 0, z: 0 });
              const rxyPt = projectPoint({ x: effPosR.x, y: effPosR.y, z: 0 });

              return (
                <g>
                  {/* Component projections */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={rxPt.sx}
                    y2={rxPt.sy}
                    stroke="#f87171"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <line
                    x1={rxPt.sx}
                    y1={rxPt.sy}
                    x2={rxyPt.sx}
                    y2={rxyPt.sy}
                    stroke="#34d399"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  {is3D && (
                    <line
                      x1={rxyPt.sx}
                      y1={rxyPt.sy}
                      x2={tipR.sx}
                      y2={tipR.sy}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Full Position Vector r */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={tipR.sx}
                    y2={tipR.sy}
                    stroke="#34d399"
                    strokeWidth="3.5"
                    markerEnd="url(#arrowVecA)"
                  />

                  {/* Unit Vector r_hat = r / |r| overlaid in gold */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={tipUnit.sx}
                    y2={tipUnit.sy}
                    stroke="#facc15"
                    strokeWidth="5"
                    markerEnd="url(#arrowUnitHat)"
                  />

                  {/* Unit Vector Label */}
                  <g transform={`translate(${tipUnit.sx + 20}, ${tipUnit.sy + 18})`}>
                    <rect
                      x="-78"
                      y="-11"
                      width="156"
                      height="22"
                      rx="6"
                      fill="#1f1905"
                      stroke="#facc15"
                      strokeWidth="1.4"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      r̂ = {formatUnitVector(unitR, 2)} (|r̂|=1)
                    </text>
                  </g>

                  {/* Point P(x,y,z) & Position Vector Label */}
                  <circle
                    cx={tipR.sx}
                    cy={tipR.sy}
                    r="8"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className={!is3D ? 'cursor-pointer' : ''}
                    onMouseDown={e => {
                      if (!is3D) {
                        e.stopPropagation();
                        setDraggingTarget('R');
                      }
                    }}
                  />
                  <g transform={`translate(${tipR.sx}, ${tipR.sy - 22})`}>
                    <rect
                      x="-84"
                      y="-11"
                      width="168"
                      height="22"
                      rx="6"
                      fill="#04150f"
                      stroke="#34d399"
                      strokeWidth="1.3"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="10.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      r = {formatUnitVector(effPosR, 1)} (|r|={magPosR.toFixed(2)}m)
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 3: SCALAR VS VECTOR MOTION PATH LAB (LO 1.1.A.1 & 1.1.A.3)   */}
            {/* ================================================================= */}
            {labMode === 'scalar_vs_vector' && (() => {
              const orig = projectPoint({ x: 0, y: 0, z: 0 });
              const p0 = projectPoint(effStart);
              const p1 = projectPoint(effMid);
              const p2 = projectPoint(effEnd);
              const pCur = projectPoint(currentParticlePos);

              // Velocity & Acceleration vector tips from current particle
              const velTip = projectPoint({
                x: currentParticlePos.x + instVelocityVec.x * 1.4,
                y: currentParticlePos.y + instVelocityVec.y * 1.4,
                z: currentParticlePos.z + instVelocityVec.z * 1.4,
              });
              const accTip = projectPoint({
                x: currentParticlePos.x + turnAccelVec.x * 0.45,
                y: currentParticlePos.y + turnAccelVec.y * 0.45,
                z: currentParticlePos.z + turnAccelVec.z * 0.45,
              });

              return (
                <g>
                  {/* Full Scalar Path Segments (Distance d = s1 + s2) */}
                  <polyline
                    points={`${p0.sx},${p0.sy} ${p1.sx},${p1.sy} ${p2.sx},${p2.sy}`}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                  />

                  {/* Position Vector r(t) from Origin */}
                  <line
                    x1={orig.sx}
                    y1={orig.sy}
                    x2={pCur.sx}
                    y2={pCur.sy}
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    markerEnd="url(#arrowVecB)"
                  />

                  {/* Net Displacement Vector Δr = r(t) - r0 */}
                  <line
                    x1={p0.sx}
                    y1={p0.sy}
                    x2={pCur.sx}
                    y2={pCur.sy}
                    stroke="#34d399"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecA)"
                  />

                  {/* Instantaneous Velocity Vector v */}
                  <line
                    x1={pCur.sx}
                    y1={pCur.sy}
                    x2={velTip.sx}
                    y2={velTip.sy}
                    stroke="#f59e0b"
                    strokeWidth="3.2"
                    markerEnd="url(#arrowVecC)"
                  />

                  {/* Acceleration Vector a near waypoint turn */}
                  <line
                    x1={pCur.sx}
                    y1={pCur.sy}
                    x2={accTip.sx}
                    y2={accTip.sy}
                    stroke="#fb7185"
                    strokeWidth="2.8"
                    markerEnd="url(#arrowRose)"
                  />

                  {/* Waypoint markers */}
                  <circle cx={p0.sx} cy={p0.sy} r="6" fill="#64748b" stroke="#fff" strokeWidth="1.5" />
                  <text x={p0.sx - 28} y={p0.sy + 18} fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                    Start r₀
                  </text>

                  <circle
                    cx={p1.sx}
                    cy={p1.sy}
                    r="7"
                    fill="#38bdf8"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className={!is3D ? 'cursor-pointer' : ''}
                    onMouseDown={e => {
                      if (!is3D) {
                        e.stopPropagation();
                        setDraggingTarget('mid');
                      }
                    }}
                  />
                  <text x={p1.sx - 30} y={p1.sy - 12} fill="#7dd3fc" fontSize="11" fontFamily="monospace">
                    Turn r₁
                  </text>

                  <circle
                    cx={p2.sx}
                    cy={p2.sy}
                    r="7"
                    fill="#f43f5e"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className={!is3D ? 'cursor-pointer' : ''}
                    onMouseDown={e => {
                      if (!is3D) {
                        e.stopPropagation();
                        setDraggingTarget('end');
                      }
                    }}
                  />
                  <text x={p2.sx + 10} y={p2.sy + 4} fill="#fda4af" fontSize="11" fontFamily="monospace">
                    End r₂
                  </text>

                  {/* Moving Particle */}
                  <circle
                    cx={pCur.sx}
                    cy={pCur.sy}
                    r="9"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <g transform={`translate(${pCur.sx}, ${pCur.sy - 22})`}>
                    <rect
                      x="-90"
                      y="-11"
                      width="180"
                      height="22"
                      rx="6"
                      fill="#04150f"
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
                      |Δr|={displacementMag.toFixed(1)}m vs Dist d={scalarDistanceTraveled.toFixed(1)}m
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 4: 1D COORDINATE SYSTEM & OPPOSITE SIGNS (LO 1.1.A.5)        */}
            {/* ================================================================= */}
            {labMode === 'sign_1d' && (() => {
              const axisY = 300;
              const origX = 500;
              const scale1D = 36; // px per meter
              const objX = origX + pos1DPhysical * scale1D;
              const velEndX = objX + vel1DPhysical * 18;
              const accEndX = objX + acc1DPhysical * 18;

              return (
                <g>
                  {/* 1D Number Line Axis */}
                  <line
                    x1="80"
                    y1={axisY}
                    x2="920"
                    y2={axisY}
                    stroke="#34d399"
                    strokeWidth="3"
                    markerEnd={axisPositiveRight ? 'url(#arrowVecA)' : undefined}
                    markerStart={!axisPositiveRight ? 'url(#arrowVecA)' : undefined}
                  />

                  {/* Coordinate Ticks (-10 to +10) */}
                  {Array.from({ length: 21 }).map((_, idx) => {
                    const physM = idx - 10;
                    const tx = origX + physM * scale1D;
                    const coordVal = physM * signMultiplier;
                    return (
                      <g key={physM} transform={`translate(${tx}, ${axisY})`}>
                        <line y1="-8" y2="8" stroke="#6ee7b7" strokeWidth={physM === 0 ? '2.5' : '1.2'} />
                        <text
                          y="26"
                          textAnchor="middle"
                          fill={physM === 0 ? '#ffffff' : coordVal > 0 ? '#6ee7b7' : '#fda4af'}
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {coordVal > 0 ? `+${coordVal}` : coordVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Axis Direction Labels */}
                  <text
                    x={axisPositiveRight ? 900 : 100}
                    y={axisY - 22}
                    textAnchor="middle"
                    fill="#34d399"
                    fontSize="14"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    +x Axis Direction (+)
                  </text>
                  <text
                    x={axisPositiveRight ? 100 : 900}
                    y={axisY - 22}
                    textAnchor="middle"
                    fill="#fb7185"
                    fontSize="14"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    −x Opposite Direction (−)
                  </text>

                  {/* Position Vector from Origin x=0 to Object */}
                  <line
                    x1={origX}
                    y1={axisY - 45}
                    x2={objX}
                    y2={axisY - 45}
                    stroke="#34d399"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecA)"
                  />
                  <text
                    x={(origX + objX) / 2}
                    y={axisY - 55}
                    textAnchor="middle"
                    fill="#6ee7b7"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Position x = {signedPos1D >= 0 ? `+${signedPos1D.toFixed(1)}` : signedPos1D.toFixed(1)} m
                  </text>

                  {/* Velocity Vector v_x */}
                  <line
                    x1={objX}
                    y1={axisY - 95}
                    x2={velEndX}
                    y2={axisY - 95}
                    stroke="#38bdf8"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecB)"
                  />
                  <text
                    x={(objX + velEndX) / 2}
                    y={axisY - 107}
                    textAnchor="middle"
                    fill="#7dd3fc"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Velocity v_x = {signedVel1D >= 0 ? `+${signedVel1D.toFixed(1)}` : signedVel1D.toFixed(1)} m/s
                  </text>

                  {/* Acceleration Vector a_x */}
                  <line
                    x1={objX}
                    y1={axisY + 65}
                    x2={accEndX}
                    y2={axisY + 65}
                    stroke="#f59e0b"
                    strokeWidth="4"
                    markerEnd="url(#arrowVecC)"
                  />
                  <text
                    x={(objX + accEndX) / 2}
                    y={axisY + 88}
                    textAnchor="middle"
                    fill="#fcd34d"
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    Acceleration a_x = {signedAcc1D >= 0 ? `+${signedAcc1D.toFixed(1)}` : signedAcc1D.toFixed(1)} m/s²
                  </text>

                  {/* Particle on 1D Line */}
                  <circle
                    cx={objX}
                    cy={axisY}
                    r="13"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="3"
                  />
                </g>
              );
            })()}
          </svg>

          {/* Bottom Left Canvas Legend */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="bg-[#061410]/90 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/20 text-[11px] space-y-1 shadow-xl">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Topic 1.1: Scalars &amp; Vectors (LO 1.1.A.1 – 1.1.A.5)</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34d399]" />
                  <span>Vector A / Displacement Δr</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  <span>Vector B / Position r</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  <span>Resultant C = A+B / Velocity v</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
                  <span>Unit Vector r̂ = r/|r|</span>
                </span>
              </div>
            </div>
          </div>

          {/* Floating Instruction Banner */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-[#061510]/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/25 text-xs text-slate-200 pointer-events-none flex items-center gap-2 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {is3D
                ? '3D Mode: Drag anywhere on the canvas to orbit the 3D (î, ĵ, k̂) coordinate axes, or switch to 2D to drag vector tips.'
                : '2D Mode: Drag vector tips directly on the Cartesian grid or adjust components in the cockpit.'}
            </span>
          </div>
        </div>

        {/* Right Cockpit Parameter & Telemetry Controls Dock */}
        <div className="w-96 border-l border-emerald-500/20 bg-[#050e0b] flex flex-col overflow-y-auto shrink-0 z-20 pt-16">
          {/* Sub-Lab Mode Selector & AP Theory Button */}
          <div className="p-3.5 border-b border-white/10 bg-[#06130f] space-y-2">
            <div className="grid grid-cols-2 gap-1.5 bg-[#040b08] p-1 rounded-xl border border-white/10 text-[11px]">
              <button
                onClick={() => setLabMode('addition')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'addition'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. Vector Sum (A+B)
              </button>
              <button
                onClick={() => setLabMode('unit_vector')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'unit_vector'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Unit Vector (r̂)
              </button>
              <button
                onClick={() => setLabMode('scalar_vs_vector')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'scalar_vs_vector'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                3. Scalar vs Vector
              </button>
              <button
                onClick={() => setLabMode('sign_1d')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'sign_1d'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                4. 1D Signs (±x)
              </button>
            </div>

            <div className="flex gap-1.5">
              {is3D && (
                <button
                  onClick={() => {
                    setCamYawDeg(32);
                    setCamPitchDeg(24);
                    onToast?.('Reset 3D camera orientation');
                  }}
                  className="py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reset 3D View</span>
                </button>
              )}
              <button
                onClick={() => setShowDetailsDrawer(prev => !prev)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center space-x-1.5 transition ${
                  showDetailsDrawer
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>AP 1.1 Theory &amp; Formulas</span>
              </button>
            </div>
          </div>

          {/* Laboratory Cockpit Header */}
          <div className="p-4 border-b border-white/10 bg-[#071612] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Vector Algebra Cockpit
              </span>
            </div>
            <button
              onClick={() => onViewModeChange?.(is3D ? '2d' : '3d')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold transition"
            >
              Mode: {is3D ? '3D (î, ĵ, k̂)' : '2D (î, ĵ)'}
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs text-slate-300">
            {/* ================================================================= */}
            {/* COCKPIT FOR MODE 1: VECTOR ADDITION & UNIT VECTOR ALGEBRA         */}
            {/* ================================================================= */}
            {labMode === 'addition' && (
              <>
                {/* Resultant Vector Readout Card (LO 1.1.A.4.i & iii) */}
                <div className="p-3.5 rounded-2xl bg-[#071a14] border border-amber-500/35 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Resultant Vector C = A + B</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">LO 1.1.A.4.iii</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-amber-300 font-bold text-center">
                    C = {formatUnitVector(effC, 2)} m
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Magnitude |C|:</span>
                      <span className="text-white font-bold text-sm">
                        {getMagnitude(effC).toFixed(2)} m
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Direction θ_xy:</span>
                      <span className="text-white font-bold text-sm">
                        {getAzimuthDeg(effC).toFixed(1)}°
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 bg-black/30 p-2 rounded-lg border border-white/5 space-y-0.5">
                    <div>C_x = A_x + B_x = ({effA.x.toFixed(1)}) + ({effB.x.toFixed(1)}) = {effC.x.toFixed(1)}</div>
                    <div>C_y = A_y + B_y = ({effA.y.toFixed(1)}) + ({effB.y.toFixed(1)}) = {effC.y.toFixed(1)}</div>
                    {is3D && (
                      <div>C_z = A_z + B_z = ({effA.z.toFixed(1)}) + ({effB.z.toFixed(1)}) = {effC.z.toFixed(1)}</div>
                    )}
                  </div>
                </div>

                {/* Display Toggles: Tip-to-Tail vs Origin & Unit Vector vs Mag/Dir */}
                <div className="p-3 rounded-2xl bg-[#071510] border border-white/10 space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                    <button
                      onClick={() => setAdditionPlacement('tip_to_tail')}
                      className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                        additionPlacement === 'tip_to_tail'
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Tip-to-Tail
                    </button>
                    <button
                      onClick={() => setAdditionPlacement('origin')}
                      className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                        additionPlacement === 'origin'
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Parallelogram
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                    <button
                      onClick={() => setNotationStyle('unit_vector')}
                      className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                        notationStyle === 'unit_vector'
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Aî + Bĵ + Ck̂
                    </button>
                    <button
                      onClick={() => setNotationStyle('mag_dir')}
                      className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                        notationStyle === 'mag_dir'
                          ? 'bg-cyan-400 text-slate-950 font-bold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Mag &amp; Angle (|r|, θ)
                    </button>
                  </div>

                  <label className="flex items-center justify-between text-[11px] pt-1 cursor-pointer">
                    <span className="text-slate-300">Show î, ĵ, k̂ Component Legs:</span>
                    <input
                      type="checkbox"
                      checked={showComponents}
                      onChange={e => setShowComponents(e.target.checked)}
                      className="accent-emerald-400"
                    />
                  </label>
                </div>

                {/* Vector A Sliders */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">
                      Vector A ({formatUnitVector(effA, 1)})
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      |A| = {getMagnitude(effA).toFixed(2)}m
                    </span>
                  </div>
                  {(['x', 'y', ...(is3D ? ['z'] : [])] as ('x' | 'y' | 'z')[]).map(axis => (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          A_{axis} ({axis === 'x' ? 'î' : axis === 'y' ? 'ĵ' : 'k̂'}):
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {vecA[axis] >= 0 ? `+${vecA[axis].toFixed(1)}` : vecA[axis].toFixed(1)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="0.5"
                        value={vecA[axis]}
                        onChange={e =>
                          setVecA(prev => ({ ...prev, [axis]: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  ))}
                </div>

                {/* Vector B Sliders */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-sky-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300">
                      Vector B ({formatUnitVector(effB, 1)})
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      |B| = {getMagnitude(effB).toFixed(2)}m
                    </span>
                  </div>
                  {(['x', 'y', ...(is3D ? ['z'] : [])] as ('x' | 'y' | 'z')[]).map(axis => (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          B_{axis} ({axis === 'x' ? 'î' : axis === 'y' ? 'ĵ' : 'k̂'}):
                        </span>
                        <span className="text-sky-300 font-bold">
                          {vecB[axis] >= 0 ? `+${vecB[axis].toFixed(1)}` : vecB[axis].toFixed(1)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="0.5"
                        value={vecB[axis]}
                        onChange={e =>
                          setVecB(prev => ({ ...prev, [axis]: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-sky-400"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ================================================================= */}
            {/* COCKPIT FOR MODE 2: POSITION VECTOR r & UNIT VECTOR r_hat         */}
            {/* ================================================================= */}
            {labMode === 'unit_vector' && (
              <>
                <div className="p-3.5 rounded-2xl bg-[#071a14] border border-amber-400/40 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Unit Vector r̂ = r / |r| (1.1.A.4.ii)</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">
                        Position Vector r:
                      </span>
                      <span className="text-emerald-300 font-bold">
                        r = {formatUnitVector(effPosR, 2)} m
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">
                        Magnitude |r| = √(x² + y²{is3D ? ' + z²' : ''}):
                      </span>
                      <span className="text-white font-bold">{magPosR.toFixed(3)} m</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-400/40">
                      <span className="text-amber-200/80 block text-[10px]">
                        Unit Direction Vector r̂ = r / |r|:
                      </span>
                      <span className="text-amber-300 font-bold text-xs">
                        r̂ = {formatUnitVector(unitR, 3)}
                      </span>
                      <div className="text-[10px] text-emerald-300 pt-1">
                        Verified Magnitude: |r̂| = √(r̂_x² + r̂_y²{is3D ? ' + r̂_z²' : ''}) ={' '}
                        {getMagnitude(unitR).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sliders for Position Vector r */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-white/10 space-y-2.5">
                  <div className="font-bold text-white">Point Coordinates P(x, y{is3D ? ', z' : ''})</div>
                  {(['x', 'y', ...(is3D ? ['z'] : [])] as ('x' | 'y' | 'z')[]).map(axis => (
                    <div key={axis} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">
                          Coordinate {axis} ({axis === 'x' ? 'î' : axis === 'y' ? 'ĵ' : 'k̂'}):
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {posR[axis].toFixed(1)} m
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="0.5"
                        value={posR[axis]}
                        onChange={e =>
                          setPosR(prev => ({ ...prev, [axis]: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-slate-400 block">Azimuth θ_xy:</span>
                      <span className="text-white font-bold">
                        {getAzimuthDeg(effPosR).toFixed(1)}°
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-slate-400 block">Elevation φ_z:</span>
                      <span className="text-white font-bold">
                        {getElevationDeg(effPosR).toFixed(1)}°
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ================================================================= */}
            {/* COCKPIT FOR MODE 3: SCALAR VS VECTOR MOTION PATH LAB              */}
            {/* ================================================================= */}
            {labMode === 'scalar_vs_vector' && (
              <>
                {/* Playback & Scrubbing Controls */}
                <div className="p-3.5 rounded-2xl bg-[#071a14] border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      <span>Motion Path Scrubber (t = {elapsedSec.toFixed(1)}s)</span>
                    </span>
                    <button
                      onClick={() => setIsPathPlaying(prev => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      {isPathPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPathPlaying ? 'Pause' : 'Animate'}</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="1"
                    step="0.01"
                    value={pathProgress}
                    onChange={e => {
                      setIsPathPlaying(false);
                      setPathProgress(parseFloat(e.target.value));
                    }}
                    className="w-full accent-emerald-400"
                  />
                </div>

                {/* Scalar Quantities Card (Magnitude Only - LO 1.1.A.1 & 1.1.A.3) */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-slate-500/30 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-slate-200">
                      SCALARS (Magnitude Only · 1.1.A.3)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">No Direction</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Distance (d):</span>
                      <span className="text-white font-bold text-base">
                        {scalarDistanceTraveled.toFixed(2)} m
                      </span>
                      <span className="text-[9px] text-slate-400 block">Total path length</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Avg Speed (d/Δt):</span>
                      <span className="text-white font-bold text-base">
                        {scalarAvgSpeed.toFixed(2)} m/s
                      </span>
                      <span className="text-[9px] text-slate-400 block">|v| = {getMagnitude(instVelocityVec).toFixed(2)} m/s</span>
                    </div>
                  </div>
                </div>

                {/* Vector Quantities Card (Magnitude & Direction - LO 1.1.A.1 & 1.1.A.3) */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-emerald-500/35 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-emerald-300">
                      VECTORS (Mag &amp; Direction · 1.1.A.3)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Arrow Model</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[10.5px]">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                      <span className="text-sky-300">Position r(t):</span>
                      <span className="text-white font-bold">
                        {formatUnitVector(currentParticlePos, 1)} m
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                      <span className="text-emerald-300">Displacement Δr:</span>
                      <span className="text-white font-bold">
                        {formatUnitVector(vectorDisplacement, 1)} m (|Δr|={displacementMag.toFixed(2)}m)
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                      <span className="text-amber-300">Avg Velocity v_avg:</span>
                      <span className="text-white font-bold">
                        {formatUnitVector(vectorAvgVelocity, 2)} m/s
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex justify-between">
                      <span className="text-rose-300">Turn Accel a:</span>
                      <span className="text-white font-bold">
                        {formatUnitVector(turnAccelVec, 2)} m/s²
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ================================================================= */}
            {/* COCKPIT FOR MODE 4: 1D COORDINATE SYSTEM & SIGNS (LO 1.1.A.5)     */}
            {/* ================================================================= */}
            {labMode === 'sign_1d' && (
              <>
                <div className="p-3.5 rounded-2xl bg-[#071a14] border border-emerald-500/35 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>1D Sign Convention (LO 1.1.A.5)</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    In a 1D coordinate system, <strong>opposite directions are denoted by opposite signs (+ vs −)</strong>. Flip the coordinate axis below to see how algebraic signs invert while physical arrows stay unchanged!
                  </p>

                  <button
                    onClick={() => {
                      setAxisPositiveRight(prev => !prev);
                      onToast?.(
                        `Flipped +x coordinate axis to point ${
                          !axisPositiveRight ? 'Right (East)' : 'Left (West)'
                        }`
                      );
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>
                      +x Axis Points: {axisPositiveRight ? 'RIGHT (East →)' : 'LEFT (← West)'}
                    </span>
                  </button>
                </div>

                {/* 1D Vector Sliders */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-white/10 space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">1D Position (x):</span>
                      <span className="text-emerald-300 font-bold">
                        {signedPos1D >= 0 ? `+${signedPos1D.toFixed(1)}` : signedPos1D.toFixed(1)} î m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="8"
                      step="0.5"
                      value={pos1DPhysical}
                      onChange={e => setPos1DPhysical(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">1D Velocity (v_x):</span>
                      <span className="text-sky-300 font-bold">
                        {signedVel1D >= 0 ? `+${signedVel1D.toFixed(1)}` : signedVel1D.toFixed(1)} î m/s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="8"
                      step="0.5"
                      value={vel1DPhysical}
                      onChange={e => setVel1DPhysical(parseFloat(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">1D Acceleration (a_x):</span>
                      <span className="text-amber-300 font-bold">
                        {signedAcc1D >= 0 ? `+${signedAcc1D.toFixed(1)}` : signedAcc1D.toFixed(1)} î m/s²
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="8"
                      step="0.5"
                      value={acc1DPhysical}
                      onChange={e => setAcc1DPhysical(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[10.5px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">v_x &amp; a_x Relative Sign:</span>
                      <span className="text-white font-bold">
                        {signedVel1D * signedAcc1D > 0
                          ? 'Same Sign (Speeding Up)'
                          : signedVel1D * signedAcc1D < 0
                          ? 'Opposite Signs (Slowing Down)'
                          : 'Zero Acceleration/Velocity'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Slide-Up AP Physics C Topic 1.1 Standards & Theory Drawer */}
      {showDetailsDrawer && (
        <div className="border-t border-emerald-500/30 bg-[#050e0b] p-5 max-h-72 overflow-y-auto shrink-0 z-30 space-y-4 text-xs text-slate-300 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                AP CED ALIGNMENT
              </span>
              <h3 className="text-sm font-bold text-white">
                Topic 1.1 Scalars and Vectors Required Course Content (1.1.A.1 – 1.1.A.5)
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
              <div className="font-bold text-emerald-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1.1.A.1 – 1.1.A.3: Scalars vs Vectors</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Scalars (distance, speed) have magnitude only. Vectors (position r, displacement Δr, velocity v, acceleration a) have magnitude and direction, modeled as proportional arrows.
              </p>
              <div className="pt-1 text-emerald-400 font-mono text-[11px]">
                |Δr| ≤ Distance d
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1.1.A.4.i: Unit Vector Notation</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Any 3D vector can be expressed in terms of orthogonal basis unit vectors î, ĵ, and k̂ along the x-, y-, and z-axes, or as a magnitude and direction.
              </p>
              <div className="pt-1 text-cyan-400 font-mono text-[11px]">
                r = Aî + Bĵ + Ck̂
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1.1.A.4.ii – iii: r̂ &amp; Resultant Sum</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The unit vector in the direction of r is r̂ = r / |r| (|r̂| = 1). A resultant vector C = A + B is the algebraic sum of the addend vectors&apos; components.
              </p>
              <div className="pt-1 text-amber-400 font-mono text-[11px]">
                C = (A_x+B_x)î + (A_y+B_y)ĵ + (A_z+B_z)k̂
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
              <div className="font-bold text-rose-300 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1.1.A.5: 1D Opposite Signs</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                In a chosen one-dimensional (1D) coordinate system, opposite physical directions are denoted by opposite algebraic signs (+ vs −).
              </p>
              <div className="pt-1 text-rose-400 font-mono text-[11px]">
                +x Direction vs −x Direction
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
