'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Trash2,
  Plus,
  Activity,
  Gauge,
  FastForward,
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
  onSubModeChange?: (mode: VectorLabSubMode) => void;
}

export const ScalarsVectorsWorkbench: React.FC<ScalarsVectorsWorkbenchProps> = ({
  onToast,
  externalViewMode = '3d',
  onViewModeChange,
  onSubModeChange,
}) => {
  const [labMode, setLabMode] = useState<VectorLabSubMode>('addition');
  const [showDetailsDrawer, setShowDetailsDrawer] = useState<boolean>(false);
  const [showCanvasEquations, setShowCanvasEquations] = useState<boolean>(true);

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

  // Mode 3: Scalar vs Vector Dynamic Waypoints Lab (1.1.A.1 & 1.1.A.3)
  const [waypoints, setWaypoints] = useState<Vector3D[]>([
    { x: -6.0, y: -2.0, z: 0.0 }, // Start r0
    { x: 1.5, y: 4.5, z: 2.0 },   // Turning Point r1
    { x: 6.0, y: -3.0, z: -1.0 }, // End r2
  ]);
  const [pathProgress, setPathProgress] = useState<number>(0.65); // 0 to 1 (t / T_total)
  const [isPathPlaying, setIsPathPlaying] = useState<boolean>(false);
  const totalTimeSec = 10.0;

  // Mode 4: 1D Coordinate System Sign Convention & Real-Time Simulation (1.1.A.5)
  const [axisPositiveRight, setAxisPositiveRight] = useState<boolean>(true);
  const [pos1DPhysical, setPos1DPhysical] = useState<number>(4.0); // physical meters right of origin
  const [vel1DPhysical, setVel1DPhysical] = useState<number>(-3.5); // physical m/s (negative = moving left)
  const [acc1DPhysical, setAcc1DPhysical] = useState<number>(2.0); // physical m/s^2 (positive = pointing right)
  const [isSimulating1D, setIsSimulating1D] = useState<boolean>(false);
  const [simTime1D, setSimTime1D] = useState<number>(0);
  const [simSpeed1D, setSimSpeed1D] = useState<number>(1.0);

  // Dragging handles in 2D mode
  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const [draggingTarget, setDraggingTarget] = useState<string | null>(null);

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
    if ((e.target as HTMLElement)?.closest('button, input, select, a, textarea')) return;
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
      } else if (typeof draggingTarget === 'string' && draggingTarget.startsWith('wp_')) {
        const wpIdx = parseInt(draggingTarget.replace('wp_', ''), 10);
        if (!isNaN(wpIdx)) {
          setWaypoints(prev => {
            const next = [...prev];
            if (next[wpIdx]) {
              next[wpIdx] = { ...next[wpIdx], x: mx, y: my };
            }
            return next;
          });
        }
      }
      return;
    }

    if (isOrbitDraggingRef.current && is3D) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      // Follow cursor rotation: +dx so moving cursor right orbits the coordinate system right
      setCamYawDeg(prev => (prev + dx * 0.45) % 360);
      setCamPitchDeg(prev => Math.max(-65, Math.min(65, prev + dy * 0.35)));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingTarget(null);
    isOrbitDraggingRef.current = false;
  };

  // Waypoint manipulation helpers for Mode 3
  const updateWaypoint = (idx: number, coord: Partial<Vector3D>) => {
    setWaypoints(prev => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], ...coord };
      }
      return next;
    });
  };

  const addTurningPoint = () => {
    setWaypoints(prev => {
      if (prev.length < 2) return prev;
      const lastIdx = prev.length - 1;
      const pPrev = prev[lastIdx - 1];
      const pEnd = prev[lastIdx];
      const newPt: Vector3D = {
        x: parseFloat(((pPrev.x + pEnd.x) / 2 + 1.2).toFixed(1)),
        y: parseFloat(((pPrev.y + pEnd.y) / 2 - 1.2).toFixed(1)),
        z: parseFloat(((pPrev.z + pEnd.z) / 2).toFixed(1)),
      };
      const next = [...prev];
      next.splice(lastIdx, 0, newPt);
      return next;
    });
    onToast?.('Added new turning point to motion path');
  };

  const deleteTurningPoint = (idx: number) => {
    if (waypoints.length <= 2) {
      onToast?.('Cannot delete: At least a Start and End point are required');
      return;
    }
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
    onToast?.(`Deleted Turning Point ${idx}`);
  };

  // Dynamic Waypoint Calculations (Scalar Distance vs Vector Displacement)
  const effWaypoints: Vector3D[] = useMemo(() => {
    return waypoints.map(w => (is3D ? w : { ...w, z: 0 }));
  }, [waypoints, is3D]);

  const pathSegments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < effWaypoints.length - 1; i++) {
      const pA = effWaypoints[i];
      const pB = effWaypoints[i + 1];
      const delta: Vector3D = {
        x: pB.x - pA.x,
        y: pB.y - pA.y,
        z: pB.z - pA.z,
      };
      const len = getMagnitude(delta);
      segs.push({ pA, pB, delta, len, index: i });
    }
    return segs;
  }, [effWaypoints]);

  const totalScalarDistance = useMemo(() => {
    return pathSegments.reduce((sum, s) => sum + s.len, 0);
  }, [pathSegments]);

  // Current position and kinematics along piecewise waypoint path
  const computePathKinematics = () => {
    if (pathSegments.length === 0) {
      const p = effWaypoints[0] || { x: 0, y: 0, z: 0 };
      return {
        currentParticlePos: p,
        scalarDistanceTraveled: 0,
        instVelocityVec: { x: 0, y: 0, z: 0 },
        activeSegmentIndex: 0,
      };
    }
    const targetDist = pathProgress * totalScalarDistance;
    let accumulated = 0;
    for (let i = 0; i < pathSegments.length; i++) {
      const seg = pathSegments[i];
      if (targetDist <= accumulated + seg.len || i === pathSegments.length - 1) {
        const segProg = seg.len > 1e-6 ? Math.max(0, Math.min(1, (targetDist - accumulated) / seg.len)) : 0;
        const pos: Vector3D = {
          x: seg.pA.x + seg.delta.x * segProg,
          y: seg.pA.y + seg.delta.y * segProg,
          z: seg.pA.z + seg.delta.z * segProg,
        };
        const segTime = Math.max(0.1, (seg.len / Math.max(0.1, totalScalarDistance)) * totalTimeSec);
        const vel: Vector3D = {
          x: seg.delta.x / segTime,
          y: seg.delta.y / segTime,
          z: seg.delta.z / segTime,
        };
        return {
          currentParticlePos: pos,
          scalarDistanceTraveled: targetDist,
          instVelocityVec: vel,
          activeSegmentIndex: i,
        };
      }
      accumulated += seg.len;
    }
    const lastSeg = pathSegments[pathSegments.length - 1];
    return {
      currentParticlePos: lastSeg.pB,
      scalarDistanceTraveled: totalScalarDistance,
      instVelocityVec: { x: 0, y: 0, z: 0 },
      activeSegmentIndex: pathSegments.length - 1,
    };
  };

  const pathKinematics = computePathKinematics();
  const currentParticlePos = pathKinematics.currentParticlePos;
  const scalarDistanceTraveled = pathKinematics.scalarDistanceTraveled;
  const instVelocityVec = pathKinematics.instVelocityVec;
  const activeSegmentIndex = pathKinematics.activeSegmentIndex;

  // Net displacement vector: Δr = r(t) - r(0)
  const p0 = effWaypoints[0] || { x: 0, y: 0, z: 0 };
  const vectorDisplacement: Vector3D = {
    x: currentParticlePos.x - p0.x,
    y: currentParticlePos.y - p0.y,
    z: currentParticlePos.z - p0.z,
  };

  const displacementMag = getMagnitude(vectorDisplacement);
  const elapsedSec = Math.max(0.1, pathProgress * totalTimeSec);
  const scalarAvgSpeed = scalarDistanceTraveled / elapsedSec;
  const vectorAvgVelocity: Vector3D = {
    x: vectorDisplacement.x / elapsedSec,
    y: vectorDisplacement.y / elapsedSec,
    z: vectorDisplacement.z / elapsedSec,
  };

  // Turn impulse acceleration between segments
  const turnAccelVec: Vector3D = useMemo(() => {
    if (pathSegments.length <= 1) return { x: 0, y: 0, z: 0 };
    const curSeg = pathSegments[activeSegmentIndex] || pathSegments[0];
    const nextSeg = pathSegments[activeSegmentIndex + 1] || pathSegments[pathSegments.length - 1];
    const segTimeCur = Math.max(0.1, (curSeg.len / Math.max(0.1, totalScalarDistance)) * totalTimeSec);
    const segTimeNext = Math.max(0.1, (nextSeg.len / Math.max(0.1, totalScalarDistance)) * totalTimeSec);
    const v1 = { x: curSeg.delta.x / segTimeCur, y: curSeg.delta.y / segTimeCur, z: curSeg.delta.z / segTimeCur };
    const v2 = { x: nextSeg.delta.x / segTimeNext, y: nextSeg.delta.y / segTimeNext, z: nextSeg.delta.z / segTimeNext };
    return {
      x: (v2.x - v1.x) / (totalTimeSec * 0.25),
      y: (v2.y - v1.y) / (totalTimeSec * 0.25),
      z: (v2.z - v1.z) / (totalTimeSec * 0.25),
    };
  }, [pathSegments, activeSegmentIndex, totalScalarDistance, totalTimeSec]);

  // Mode 4: 1D Real-Time Kinematics Simulation Loop
  useEffect(() => {
    if (!isSimulating1D) return;
    let animId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = ((now - lastTime) / 1000) * simSpeed1D;
      lastTime = now;
      setSimTime1D(prev => prev + dt);
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating1D, simSpeed1D]);

  // Mode 4: 1D Coordinate System Sign Convention Values (LO 1.1.A.5)
  const signMultiplier = axisPositiveRight ? 1 : -1;
  const signedPos1D = pos1DPhysical * signMultiplier;
  const signedVel1D = vel1DPhysical * signMultiplier;
  const signedAcc1D = acc1DPhysical * signMultiplier;

  // Real-time kinematic physical state at elapsed time simTime1D
  const currentPhysX1D = pos1DPhysical + vel1DPhysical * simTime1D + 0.5 * acc1DPhysical * simTime1D * simTime1D;
  const currentPhysV1D = vel1DPhysical + acc1DPhysical * simTime1D;
  const currentPhysA1D = acc1DPhysical;
  const currentSignedX1D = currentPhysX1D * signMultiplier;
  const currentSignedV1D = currentPhysV1D * signMultiplier;
  const currentSignedA1D = currentPhysA1D * signMultiplier;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#040b09] text-slate-100 overflow-hidden select-none font-sans">
      {/* Main Interactive Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Interactive 2D/3D Coordinate Grid Stage */}
        <div
          ref={svgContainerRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
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
                  {/* Vector A Label Badge */}
                  {showCanvasEquations ? (() => {
                    const labelA = notationStyle === 'unit_vector'
                      ? `A = ${formatUnitVector(effA, 1)}`
                      : `|A| = ${getMagnitude(effA).toFixed(2)}m`;
                    const badgeWA = Math.max(120, labelA.length * 7.2 + 24);
                    return (
                      <g transform={`translate(${(orig.sx + tipA.sx) / 2}, ${(orig.sy + tipA.sy) / 2 - 14})`}>
                        <rect
                          x={-badgeWA / 2}
                          y="-11"
                          width={badgeWA}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelA}
                        </text>
                      </g>
                    );
                  })() : (
                    <g transform={`translate(${(orig.sx + tipA.sx) / 2}, ${(orig.sy + tipA.sy) / 2 - 12})`}>
                      <circle r="9" fill="#04150f" stroke="#34d399" strokeWidth="1.2" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        A
                      </text>
                    </g>
                  )}

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
                  {showCanvasEquations ? (() => {
                    const labelB = notationStyle === 'unit_vector'
                      ? `B = ${formatUnitVector(effB, 1)}`
                      : `|B| = ${getMagnitude(effB).toFixed(2)}m`;
                    const badgeWB = Math.max(120, labelB.length * 7.2 + 24);
                    return (
                      <g
                        transform={`translate(${(startB.sx + endB.sx) / 2}, ${
                          (startB.sy + endB.sy) / 2 - 14
                        })`}
                      >
                        <rect
                          x={-badgeWB / 2}
                          y="-11"
                          width={badgeWB}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelB}
                        </text>
                      </g>
                    );
                  })() : (
                    <g transform={`translate(${(startB.sx + endB.sx) / 2}, ${(startB.sy + endB.sy) / 2 - 12})`}>
                      <circle r="9" fill="#061526" stroke="#38bdf8" strokeWidth="1.2" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        B
                      </text>
                    </g>
                  )}

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
                  {showCanvasEquations ? (() => {
                    const labelC = notationStyle === 'unit_vector'
                      ? `C = A+B = ${formatUnitVector(effC, 1)}`
                      : `|C| = ${getMagnitude(effC).toFixed(2)}m`;
                    const badgeWC = Math.max(140, labelC.length * 7.2 + 28);
                    return (
                      <g transform={`translate(${tipC.sx}, ${tipC.sy - 22})`}>
                        <rect
                          x={-badgeWC / 2}
                          y="-11"
                          width={badgeWC}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelC}
                        </text>
                      </g>
                    );
                  })() : (
                    <g transform={`translate(${tipC.sx}, ${tipC.sy - 20})`}>
                      <circle r="9" fill="#1c1104" stroke="#f59e0b" strokeWidth="1.4" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#fcd34d" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        C
                      </text>
                    </g>
                  )}

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
                  {showCanvasEquations ? (() => {
                    const labelUnit = `r̂ = ${formatUnitVector(unitR, 2)} (|r̂|=1)`;
                    const badgeWUnit = Math.max(140, labelUnit.length * 7.2 + 24);
                    return (
                      <g transform={`translate(${tipUnit.sx + 20}, ${tipUnit.sy + 18})`}>
                        <rect
                          x={-badgeWUnit / 2}
                          y="-11"
                          width={badgeWUnit}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelUnit}
                        </text>
                      </g>
                    );
                  })() : (
                    <g transform={`translate(${tipUnit.sx + 16}, ${tipUnit.sy + 16})`}>
                      <circle r="9" fill="#1f1905" stroke="#facc15" strokeWidth="1.4" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#fef08a" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        r̂
                      </text>
                    </g>
                  )}

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
                  {showCanvasEquations ? (() => {
                    const labelPos = `r = ${formatUnitVector(effPosR, 1)} (|r|=${magPosR.toFixed(2)}m)`;
                    const badgeWPos = Math.max(160, labelPos.length * 7.2 + 24);
                    return (
                      <g transform={`translate(${tipR.sx}, ${tipR.sy - 22})`}>
                        <rect
                          x={-badgeWPos / 2}
                          y="-11"
                          width={badgeWPos}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelPos}
                        </text>
                      </g>
                    );
                  })() : (
                    <g transform={`translate(${tipR.sx}, ${tipR.sy - 20})`}>
                      <circle r="9" fill="#04150f" stroke="#34d399" strokeWidth="1.3" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        P
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 3: DYNAMIC WAYPOINTS SCALAR VS VECTOR LAB (LO 1.1.A.1, 1.1.A.3)*/}
            {/* ================================================================= */}
            {labMode === 'scalar_vs_vector' && (() => {
              const orig = projectPoint({ x: 0, y: 0, z: 0 });
              const projWaypoints = effWaypoints.map(w => projectPoint(w));
              const pCur = projectPoint(currentParticlePos);
              const p0 = projWaypoints[0] || orig;

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

              const polyPoints = projWaypoints.map(p => `${p.sx},${p.sy}`).join(' ');

              return (
                <g>
                  {/* Full Scalar Path Segments (Distance d = sum |Δs_i|) */}
                  <polyline
                    points={polyPoints}
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
                  {pathSegments.length > 1 && (
                    <line
                      x1={pCur.sx}
                      y1={pCur.sy}
                      x2={accTip.sx}
                      y2={accTip.sy}
                      stroke="#fb7185"
                      strokeWidth="2.8"
                      markerEnd="url(#arrowRose)"
                    />
                  )}

                  {/* Interactive Waypoint markers (Start, Turning Points, End) */}
                  {projWaypoints.map((pw, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === projWaypoints.length - 1;
                    const fillCol = isStart ? '#64748b' : isEnd ? '#f43f5e' : '#38bdf8';
                    const wpCoord = effWaypoints[idx];
                    const labelTitle = isStart ? 'Start r₀' : isEnd ? `End r_${idx}` : `Turn r_${idx}`;

                    return (
                      <g key={`wp-marker-${idx}`}>
                        <circle
                          cx={pw.sx}
                          cy={pw.sy}
                          r={isStart ? 6.5 : 8}
                          fill={fillCol}
                          stroke="#ffffff"
                          strokeWidth="2"
                          className={!is3D ? 'cursor-pointer' : ''}
                          onMouseDown={e => {
                            if (!is3D) {
                              e.stopPropagation();
                              setDraggingTarget(`wp_${idx}`);
                            }
                          }}
                        />
                        <text
                          x={pw.sx + 10}
                          y={pw.sy + 4}
                          fill={isStart ? '#cbd5e1' : isEnd ? '#fda4af' : '#7dd3fc'}
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelTitle} ({wpCoord?.x.toFixed(1)}, {wpCoord?.y.toFixed(1)})
                        </text>
                      </g>
                    );
                  })}

                  {/* Moving Particle */}
                  <circle
                    cx={pCur.sx}
                    cy={pCur.sy}
                    r="9.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  {showCanvasEquations ? (() => {
                    const labelMotion = `|Δr|=${displacementMag.toFixed(1)}m vs Dist d=${scalarDistanceTraveled.toFixed(1)}m`;
                    const badgeWMotion = Math.max(180, labelMotion.length * 7.2 + 24);
                    return (
                      <g transform={`translate(${pCur.sx}, ${pCur.sy - 22})`}>
                        <rect
                          x={-badgeWMotion / 2}
                          y="-11"
                          width={badgeWMotion}
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
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {labelMotion}
                        </text>
                      </g>
                    );
                  })() : null}
                </g>
              );
            })()}

            {/* ================================================================= */}
            {/* MODE 4: 1D COORDINATE SYSTEM & REAL-TIME TEST PARTICLE (1.1.A.5)  */}
            {/* ================================================================= */}
            {labMode === 'sign_1d' && (() => {
              const axisY = 300;
              const origX = 500;
              const scale1D = 36; // px per meter
              const initObjX = origX + pos1DPhysical * scale1D;
              const liveObjX = origX + currentPhysX1D * scale1D;
              const liveVelEndX = liveObjX + currentPhysV1D * 18;
              const liveAccEndX = liveObjX + currentPhysA1D * 18;

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

                  {/* Initial Position Ghost Marker (x0) */}
                  <circle
                    cx={initObjX}
                    cy={axisY}
                    r="6"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.8"
                    strokeDasharray="3 2"
                  />
                  <text
                    x={initObjX}
                    y={axisY + 44}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    x₀ = {signedPos1D >= 0 ? `+${signedPos1D.toFixed(1)}` : signedPos1D.toFixed(1)}m
                  </text>

                  {/* Position Vector from Origin x=0 to Active Particle */}
                  <line
                    x1={origX}
                    y1={axisY - 45}
                    x2={liveObjX}
                    y2={axisY - 45}
                    stroke="#34d399"
                    strokeWidth="3.5"
                    markerEnd="url(#arrowVecA)"
                  />
                  {showCanvasEquations && (
                    <text
                      x={(origX + liveObjX) / 2}
                      y={axisY - 55}
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      x(t) = {currentSignedX1D >= 0 ? `+${currentSignedX1D.toFixed(2)}` : currentSignedX1D.toFixed(2)} m
                    </text>
                  )}

                  {/* Real-time Instantaneous Velocity Vector v_x(t) */}
                  {Math.abs(currentPhysV1D) > 0.05 && (
                    <>
                      <line
                        x1={liveObjX}
                        y1={axisY - 85}
                        x2={liveVelEndX}
                        y2={axisY - 85}
                        stroke="#38bdf8"
                        strokeWidth="3.8"
                        markerEnd="url(#arrowVecB)"
                      />
                      {showCanvasEquations && (
                        <text
                          x={(liveObjX + liveVelEndX) / 2}
                          y={axisY - 96}
                          textAnchor="middle"
                          fill="#7dd3fc"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          v_x = {currentSignedV1D >= 0 ? `+${currentSignedV1D.toFixed(2)}` : currentSignedV1D.toFixed(2)} m/s
                        </text>
                      )}
                    </>
                  )}

                  {/* Real-time Acceleration Vector a_x */}
                  {Math.abs(currentPhysA1D) > 0.05 && (
                    <>
                      <line
                        x1={liveObjX}
                        y1={axisY + 65}
                        x2={liveAccEndX}
                        y2={axisY + 65}
                        stroke="#f59e0b"
                        strokeWidth="3.8"
                        markerEnd="url(#arrowVecC)"
                      />
                      {showCanvasEquations && (
                        <text
                          x={(liveObjX + liveAccEndX) / 2}
                          y={axisY + 86}
                          textAnchor="middle"
                          fill="#fcd34d"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          a_x = {currentSignedA1D >= 0 ? `+${currentSignedA1D.toFixed(1)}` : currentSignedA1D.toFixed(1)} m/s²
                        </text>
                      )}
                    </>
                  )}

                  {/* Active 1D Test Particle */}
                  <g transform={`translate(${liveObjX}, ${axisY})`}>
                    {(isSimulating1D || simTime1D > 0) && (
                      <circle
                        r="18"
                        fill="rgba(16, 185, 129, 0.2)"
                        stroke="#34d399"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                    )}
                    <circle
                      r="12"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill="#04150f"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="900"
                    >
                      P
                    </text>
                  </g>
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

          {/* Floating Top Stage Controls & Instruction Banner */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setShowCanvasEquations(prev => !prev)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold border shadow-lg transition flex items-center gap-1.5 ${
                  showCanvasEquations
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-black/60 border-white/10 text-slate-400 hover:text-white'
                }`}
                title="Toggle displaying vector equation formulas on the 3D plane"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Equations on Plane: {showCanvasEquations ? 'ON' : 'OFF'}</span>
              </button>

              {labMode === 'sign_1d' && (
                <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold shadow-lg">
                  1D Signs Mode (3D N/A)
                </div>
              )}
            </div>

            <div className="bg-[#061510]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/25 text-xs text-slate-200 pointer-events-none flex items-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {labMode === 'sign_1d'
                  ? '1D Signs: Launch the test particle to watch real-time kinematics on the number line!'
                  : is3D
                  ? '3D Mode: Drag anywhere on the canvas to orbit coordinate axes. Sliders in cockpit stay stationary.'
                  : '2D Mode: Drag vector tips or waypoint markers directly on the Cartesian grid.'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Cockpit Parameter & Telemetry Controls Dock (Stops event propagation so 3D plane stays stationary during adjustment) */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          className="w-96 border-l border-emerald-500/20 bg-[#050e0b] flex flex-col overflow-y-auto shrink-0 z-20 pt-16 select-text"
        >
          {/* Sub-Lab Mode Selector & AP Theory Button */}
          <div className="p-3.5 border-b border-white/10 bg-[#06130f] space-y-2">
            <div className="grid grid-cols-2 gap-1.5 bg-[#040b08] p-1 rounded-xl border border-white/10 text-[11px]">
              <button
                onClick={() => {
                  setLabMode('addition');
                  onSubModeChange?.('addition');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'addition'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. Vector Sum (A+B)
              </button>
              <button
                onClick={() => {
                  setLabMode('unit_vector');
                  onSubModeChange?.('unit_vector');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'unit_vector'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Unit Vector (r̂)
              </button>
              <button
                onClick={() => {
                  setLabMode('scalar_vs_vector');
                  onSubModeChange?.('scalar_vs_vector');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  labMode === 'scalar_vs_vector'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                3. Scalar vs Vector
              </button>
              <button
                onClick={() => {
                  setLabMode('sign_1d');
                  onSubModeChange?.('sign_1d');
                  onViewModeChange?.('2d');
                }}
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
            {/* COCKPIT FOR MODE 3: SCALAR VS VECTOR DYNAMIC WAYPOINTS PATH LAB   */}
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

                {/* Dynamic Waypoints & Turning Points Manager */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-white text-xs">Path Waypoints &amp; Turning Points</span>
                    <button
                      onClick={addTurningPoint}
                      className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Turning Point</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {/* Start Position Waypoint */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-300 font-bold">Start Position (r₀):</span>
                        <span className="text-emerald-300">({waypoints[0]?.x.toFixed(1)}, {waypoints[0]?.y.toFixed(1)}{is3D ? `, ${waypoints[0]?.z.toFixed(1)}` : ''})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400">x: {waypoints[0]?.x.toFixed(1)}m</span>
                          <input
                            type="range"
                            min="-9"
                            max="9"
                            step="0.5"
                            value={waypoints[0]?.x ?? -6}
                            onChange={e => updateWaypoint(0, { x: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-400"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">y: {waypoints[0]?.y.toFixed(1)}m</span>
                          <input
                            type="range"
                            min="-7"
                            max="7"
                            step="0.5"
                            value={waypoints[0]?.y ?? -2}
                            onChange={e => updateWaypoint(0, { y: parseFloat(e.target.value) })}
                            className="w-full accent-emerald-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Intermediate Turning Points */}
                    {waypoints.slice(1, -1).map((wp, i) => {
                      const realIdx = i + 1;
                      return (
                        <div key={`wp-editor-${realIdx}`} className="p-2.5 rounded-xl bg-[#081522] border border-sky-500/20 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-sky-300 font-bold">Turning Point #{realIdx} (r_{realIdx}):</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sky-200">({wp.x.toFixed(1)}, {wp.y.toFixed(1)})</span>
                              <button
                                onClick={() => deleteTurningPoint(realIdx)}
                                className="p-1 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                                title="Delete turning point"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400">x: {wp.x.toFixed(1)}m</span>
                              <input
                                type="range"
                                min="-9"
                                max="9"
                                step="0.5"
                                value={wp.x}
                                onChange={e => updateWaypoint(realIdx, { x: parseFloat(e.target.value) })}
                                className="w-full accent-sky-400"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400">y: {wp.y.toFixed(1)}m</span>
                              <input
                                type="range"
                                min="-7"
                                max="7"
                                step="0.5"
                                value={wp.y}
                                onChange={e => updateWaypoint(realIdx, { y: parseFloat(e.target.value) })}
                                className="w-full accent-sky-400"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* End Position Waypoint */}
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-rose-300 font-bold">End Position (r_end):</span>
                        <span className="text-rose-200">
                          ({waypoints[waypoints.length - 1]?.x.toFixed(1)}, {waypoints[waypoints.length - 1]?.y.toFixed(1)})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400">x: {waypoints[waypoints.length - 1]?.x.toFixed(1)}m</span>
                          <input
                            type="range"
                            min="-9"
                            max="9"
                            step="0.5"
                            value={waypoints[waypoints.length - 1]?.x ?? 6}
                            onChange={e => updateWaypoint(waypoints.length - 1, { x: parseFloat(e.target.value) })}
                            className="w-full accent-rose-400"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400">y: {waypoints[waypoints.length - 1]?.y.toFixed(1)}m</span>
                          <input
                            type="range"
                            min="-7"
                            max="7"
                            step="0.5"
                            value={waypoints[waypoints.length - 1]?.y ?? -3}
                            onChange={e => updateWaypoint(waypoints.length - 1, { y: parseFloat(e.target.value) })}
                            className="w-full accent-rose-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <span className="text-[9px] text-slate-400 block">Total scalar path</span>
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
            {/* COCKPIT FOR MODE 4: 1D COORDINATE SYSTEM & REAL-TIME SIMULATION   */}
            {/* ================================================================= */}
            {labMode === 'sign_1d' && (
              <>
                {/* Real-Time Kinematics Particle Launcher Panel */}
                <div className="p-3.5 rounded-2xl bg-[#071a14] border border-emerald-500/35 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                      <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Real-Time 1D Particle Launcher</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsSimulating1D(prev => !prev)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-md ${
                          isSimulating1D
                            ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                            : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                        }`}
                      >
                        {isSimulating1D ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isSimulating1D ? 'Pause' : 'Launch Particle'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsSimulating1D(false);
                          setSimTime1D(0);
                        }}
                        className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
                        title="Reset simulation to initial position x0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Live Real-Time Telemetry */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Elapsed Time (t):</span>
                      <span className="text-white font-bold text-base">
                        {simTime1D.toFixed(2)} s
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Sim Speed:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[0.5, 1.0, 2.0].map(sp => (
                          <button
                            key={sp}
                            onClick={() => setSimSpeed1D(sp)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                              simSpeed1D === sp
                                ? 'bg-emerald-400 text-slate-950 font-bold'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-500/25 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-emerald-300">Position x(t):</span>
                      <span className="text-white font-bold">
                        {currentSignedX1D >= 0 ? `+${currentSignedX1D.toFixed(2)}` : currentSignedX1D.toFixed(2)} î m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-300">Velocity v(t):</span>
                      <span className="text-white font-bold">
                        {currentSignedV1D >= 0 ? `+${currentSignedV1D.toFixed(2)}` : currentSignedV1D.toFixed(2)} î m/s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-300">Acceleration a:</span>
                      <span className="text-white font-bold">
                        {currentSignedA1D >= 0 ? `+${currentSignedA1D.toFixed(1)}` : currentSignedA1D.toFixed(1)} î m/s²
                      </span>
                    </div>
                    <div className="pt-1 border-t border-white/10 flex justify-between text-[10px]">
                      <span className="text-slate-400">Motion State:</span>
                      <span className="text-emerald-300 font-bold">
                        {Math.abs(currentPhysV1D) < 0.05
                          ? 'Turnaround Point (v=0)'
                          : currentPhysV1D * currentPhysA1D > 0
                          ? 'Speeding Up'
                          : currentPhysV1D * currentPhysA1D < 0
                          ? 'Slowing Down'
                          : 'Constant Velocity'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1D Sign Convention Direction Switcher */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-emerald-500/35 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Coordinate Axis Direction (LO 1.1.A.5)</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Opposite directions are denoted by opposite algebraic signs (+ vs −). Flip the coordinate axis to see signs invert without changing the physics:
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

                {/* Initial 1D Vector Kinematic Parameters */}
                <div className="p-3.5 rounded-2xl bg-[#071510] border border-white/10 space-y-3">
                  <div className="font-bold text-white text-xs">Initial Kinematic Parameters</div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Initial Position (x₀):</span>
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
                      onChange={e => {
                        setPos1DPhysical(parseFloat(e.target.value));
                        if (!isSimulating1D) setSimTime1D(0);
                      }}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Initial Velocity (v₀):</span>
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
                      onChange={e => {
                        setVel1DPhysical(parseFloat(e.target.value));
                        if (!isSimulating1D) setSimTime1D(0);
                      }}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Constant Accel (a):</span>
                      <span className="text-amber-300 font-bold">
                        {signedAcc1D >= 0 ? `+${signedAcc1D.toFixed(1)}` : signedAcc1D.toFixed(1)} î m/s²
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-6"
                      max="6"
                      step="0.5"
                      value={acc1DPhysical}
                      onChange={e => {
                        setAcc1DPhysical(parseFloat(e.target.value));
                        if (!isSimulating1D) setSimTime1D(0);
                      }}
                      className="w-full accent-amber-400"
                    />
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
