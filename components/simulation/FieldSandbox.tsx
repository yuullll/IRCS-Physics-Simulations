'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  COULOMB_K,
  SourceCharge,
  TestParticle,
  calculateElectricField,
  stepParticleRK4,
  traceFieldLine,
} from '@/lib/physics/coulomb';
import { generateEquipotentialTexture, SlicePlaneOrientation } from '@/lib/physics/equipotential';
import {
  Crosshair,
  Bookmark,
  Shield,
  Zap,
  Info,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export interface FieldSandboxControls {
  showVectors: boolean;
  showForces: boolean;
  showStreamlines: boolean;
  showSlicePlane: boolean;
  sliceOrientation: SlicePlaneOrientation;
  sliceOffset: number;
  gridDensity: number;
  bField: { x: number; y: number; z: number; enabled: boolean };
  viewMode: '3d' | 'top' | 'front' | 'side';
}

export interface TracerSettings {
  qMicro: number;
  massMicro: number;
  vx: number;
  vz: number;
  damping?: number;
  simSpeed?: number;
  lockToPlane?: boolean;
}

export interface ProbedEFieldPoint {
  id: string;
  label: string;
  x: number;
  z: number;
  saved: boolean;
  screenX?: number;
  screenY?: number;
  visible?: boolean;
}

export type EquilibriumMaterialMode = 'point_charges' | 'conductor_sphere' | 'insulator_sphere';

interface FieldSandboxProps {
  controlsState: FieldSandboxControls;
  onSelectCharge: (charge: SourceCharge | null) => void;
  selectedChargeId: string | null;
  onUpdateTelemetry: (data: {
    chargeCount: number;
    eFieldAtCursor: number;
    fPredicted: number;
    activeParticles: number;
    latestParticleEnergy?: { kinetic: number; potential: number; total: number };
  }) => void;
  placementMode: 'none' | 'charge_pos' | 'charge_neg' | 'tracer';
  defaultSourceQ?: number;
  tracerSettings: TracerSettings;
}

let chargeCounter = 1;
let particleCounter = 1;
const SPHERE_RADIUS = 6.0; // 6.0 m radius for Conductor / Insulator Equilibrium Sphere (LO 8.3.B)

export const FieldSandbox: React.FC<FieldSandboxProps> = ({
  controlsState,
  onSelectCharge,
  selectedChargeId,
  onUpdateTelemetry,
  placementMode,
  defaultSourceQ = 5.0,
  tracerSettings,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Conductor vs Insulator Electrostatic Equilibrium Mode (Topic 8.3.B.1 & 8.3.B.2)
  const [materialMode, setMaterialMode] = useState<EquilibriumMaterialMode>('point_charges');
  const [sphereChargeMicro, setSphereChargeMicro] = useState<number>(8.0); // +8.0 μC or -8.0 μC
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);

  // Click-on-plane E-Field probe points & stored points state
  const [probePoints, setProbePoints] = useState<ProbedEFieldPoint[]>([
    { id: 'ept_1', label: 'P1', x: 0.0, z: 3.5, saved: true },
  ]);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>('ept_1');
  const [nextProbeCounter, setNextProbeCounter] = useState<number>(2);
  const [chargesSnapshot, setChargesSnapshot] = useState<SourceCharge[]>([
    { id: 'q_pos_init', q: 5e-6, qMicro: 5, x: -4.5, y: 0.65, z: 0 },
    { id: 'q_neg_init', q: -5e-6, qMicro: -5, x: 4.5, y: 0.65, z: 0 },
  ]);

  // Screen-space projected coordinates for rendering clickable point labels on the plane
  const [projectedLabels, setProjectedLabels] = useState<
    Record<string, { x: number; y: number; visible: boolean }>
  >({});

  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const probePointsRef = useRef<ProbedEFieldPoint[]>(probePoints);
  useEffect(() => {
    probePointsRef.current = probePoints;
  }, [probePoints]);

  const materialModeRef = useRef<EquilibriumMaterialMode>(materialMode);
  const sphereChargeMicroRef = useRef<number>(sphereChargeMicro);
  useEffect(() => {
    materialModeRef.current = materialMode;
    sphereChargeMicroRef.current = sphereChargeMicro;
  }, [materialMode, sphereChargeMicro]);

  const propsRef = useRef({
    controlsState,
    tracerSettings,
    placementMode,
    defaultSourceQ,
  });
  useEffect(() => {
    propsRef.current = {
      controlsState,
      tracerSettings,
      placementMode,
      defaultSourceQ,
    };
  }, [controlsState, tracerSettings, placementMode, defaultSourceQ]);

  // Compute E-field vector at any point (pt.x, pt.y, pt.z) accounting for Point Charges OR Conductor/Insulator Sphere (LO 8.3.B)
  const evaluateElectricFieldAt = useCallback(
    (
      pt: THREE.Vector3,
      chargesList: SourceCharge[],
      mode: EquilibriumMaterialMode,
      sphereQMicro: number
    ): THREE.Vector3 => {
      if (mode === 'point_charges') {
        return calculateElectricField(pt, chargesList);
      }

      // Centered at (0, 0.65, 0) in XZ plane
      const dx = pt.x;
      const dz = pt.z;
      const r = Math.hypot(dx, dz);
      const qTotal = sphereQMicro * 1e-6;

      if (mode === 'conductor_sphere') {
        // LO 8.3.B.1: Inside a conductor in electrostatic equilibrium, E = 0!
        if (r < SPHERE_RADIUS) {
          return new THREE.Vector3(0, 0, 0);
        }
        // LO 8.3.B.1.ii: Outside a spherically symmetric charged conductor, E is identical to a central point charge
        const rSafe = Math.max(SPHERE_RADIUS, r);
        const eMag = (COULOMB_K * qTotal) / (rSafe * rSafe);
        return new THREE.Vector3((dx / rSafe) * eMag, 0, (dz / rSafe) * eMag);
      } else {
        // mode === 'insulator_sphere'
        // LO 8.3.B.2: Excess charge is distributed throughout the interior of the insulator; E inside is nonzero!
        if (r < 0.05) return new THREE.Vector3(0, 0, 0);
        if (r < SPHERE_RADIUS) {
          // Uniformly charged insulating sphere interior: E(r) = k * Q * r / R^3
          const eMag = (COULOMB_K * qTotal * r) / Math.pow(SPHERE_RADIUS, 3);
          return new THREE.Vector3((dx / r) * eMag, 0, (dz / r) * eMag);
        } else {
          const eMag = (COULOMB_K * qTotal) / (r * r);
          return new THREE.Vector3((dx / r) * eMag, 0, (dz / r) * eMag);
        }
      }
    },
    []
  );

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    charges: SourceCharge[];
    chargeMeshes: Map<string, THREE.Group>;
    equilibriumGroup: THREE.Group;
    probeMarkersGroup: THREE.Group;
    vectorGroup: THREE.Group;
    forceGroup: THREE.Group;
    streamlineGroup: THREE.Group;
    slicePlaneMesh: THREE.Mesh | null;
    particles: TestParticle[];
    particleMeshes: Map<string, { mesh: THREE.Mesh; line: THREE.Line }>;
    selectionRing: THREE.Group | null;
    cursorProjection: THREE.Group | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    dragPlane: THREE.Plane;
    isDragging: boolean;
    draggedChargeId: string | null;
  } | null>(null);

  const updateSelectionRingVisual = () => {
    const state = threeRef.current;
    if (!state || !state.selectionRing) return;

    if (!selectedChargeId || materialModeRef.current !== 'point_charges') {
      state.selectionRing.visible = false;
      return;
    }

    const ch = state.charges.find(c => c.id === selectedChargeId);
    if (!ch) {
      state.selectionRing.visible = false;
      return;
    }

    state.selectionRing.visible = true;
    state.selectionRing.position.set(ch.x, 0.05, ch.z);
    const isPos = ch.qMicro >= 0;
    const ringMat = (state.selectionRing.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    ringMat.color.setHex(isPos ? 0xef4444 : 0x3b82f6);
  };

  // Helper to create 3D magnitude badge for each source charge
  const createChargeBadge = (qMicro: number): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const isPos = qMicro >= 0;
      ctx.fillStyle = isPos ? 'rgba(239, 68, 68, 0.92)' : 'rgba(59, 130, 246, 0.92)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 148, 52, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = `${isPos ? '+' : ''}${qMicro.toFixed(1)} μC`;
      ctx.fillText(text, 80, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 0.64, 1);
    sprite.position.set(0, 1.45, 0);
    return sprite;
  };

  // Rebuild Conductor / Insulator Equilibrium Sphere 3D visuals (LO 8.3.B.1 & 8.3.B.2)
  const rebuildEquilibriumVisuals = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;

    while (state.equilibriumGroup.children.length > 0) {
      state.equilibriumGroup.remove(state.equilibriumGroup.children[0]);
    }

    const mode = materialModeRef.current;
    if (mode === 'point_charges') return;

    const qMicro = sphereChargeMicroRef.current;
    const isPos = qMicro >= 0;
    const chargeColor = isPos ? 0xef4444 : 0x3b82f6;

    if (mode === 'conductor_sphere') {
      // Conducting sphere: metallic translucent interior + bright surface boundary ring + surface charges ONLY on outer boundary (r = R)
      const sphereGeo = new THREE.CylinderGeometry(SPHERE_RADIUS, SPHERE_RADIUS, 0.4, 64);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.25,
        transparent: true,
        opacity: 0.55,
      });
      const cylinder = new THREE.Mesh(sphereGeo, sphereMat);
      cylinder.position.set(0, 0.2, 0);
      state.equilibriumGroup.add(cylinder);

      // Outer conducting boundary ring where all excess charge resides
      const ringGeo = new THREE.RingGeometry(SPHERE_RADIUS - 0.14, SPHERE_RADIUS + 0.14, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: chargeColor,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.42;
      state.equilibriumGroup.add(ring);

      // Distribute excess charge symbols strictly on the outer surface (r = SPHERE_RADIUS)
      const numSurfaceCharges = 16;
      for (let i = 0; i < numSurfaceCharges; i++) {
        const angle = (i / numSurfaceCharges) * Math.PI * 2;
        const sx = Math.cos(angle) * SPHERE_RADIUS;
        const sz = Math.sin(angle) * SPHERE_RADIUS;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 16, 16),
          new THREE.MeshBasicMaterial({ color: chargeColor })
        );
        dot.position.set(sx, 0.55, sz);
        state.equilibriumGroup.add(dot);
      }
    } else if (mode === 'insulator_sphere') {
      // Insulating sphere: dielectric amber/sky volume with charges distributed throughout the interior AND surface (LO 8.3.B.2)
      const sphereGeo = new THREE.CylinderGeometry(SPHERE_RADIUS, SPHERE_RADIUS, 0.4, 64);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isPos ? 0x451a03 : 0x0c4a6e,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
      });
      const cylinder = new THREE.Mesh(sphereGeo, sphereMat);
      cylinder.position.set(0, 0.2, 0);
      state.equilibriumGroup.add(cylinder);

      const ringGeo = new THREE.RingGeometry(SPHERE_RADIUS - 0.1, SPHERE_RADIUS + 0.1, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: chargeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.42;
      state.equilibriumGroup.add(ring);

      // Distribute excess charges throughout interior rings (r = 1.8m, 3.8m, 5.7m)
      const radii = [1.8, 3.8, 5.7];
      const counts = [5, 10, 15];
      radii.forEach((rad, rIdx) => {
        const count = counts[rIdx];
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + rIdx * 0.4;
          const sx = Math.cos(angle) * rad;
          const sz = Math.sin(angle) * rad;
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 14, 14),
            new THREE.MeshBasicMaterial({ color: chargeColor })
          );
          dot.position.set(sx, 0.55, sz);
          state.equilibriumGroup.add(dot);
        }
      });
    }
  }, []);

  // Rebuild 3D pins for clicked probe points
  const rebuildProbeMarkers = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;

    while (state.probeMarkersGroup.children.length > 0) {
      state.probeMarkersGroup.remove(state.probeMarkersGroup.children[0]);
    }

    probePointsRef.current.forEach(pt => {
      const isSelected = pt.id === selectedProbeId;
      const pinGroup = new THREE.Group();
      pinGroup.position.set(pt.x, 0.1, pt.z);

      const ringGeo = new THREE.RingGeometry(isSelected ? 0.45 : 0.3, isSelected ? 0.65 : 0.45, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x22d3ee : pt.saved ? 0x38bdf8 : 0xfacc15,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      pinGroup.add(ring);

      const centerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({
          color: isSelected ? 0x22d3ee : pt.saved ? 0x38bdf8 : 0xfacc15,
        })
      );
      centerDot.position.y = 0.15;
      pinGroup.add(centerDot);

      // Draw local E-field vector arrow at the selected probe point
      if (isSelected) {
        const E = evaluateElectricFieldAt(
          new THREE.Vector3(pt.x, 0.65, pt.z),
          state.charges,
          materialModeRef.current,
          sphereChargeMicroRef.current
        );
        const eMag = E.length();
        if (eMag > 1) {
          const dir = E.clone().normalize();
          const len = Math.min(3.2, Math.max(1.0, Math.log10(eMag + 1) * 0.5));
          const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0.25, 0), len, 0x22d3ee, 0.5, 0.28);
          pinGroup.add(arrow);
        }
      }

      state.probeMarkersGroup.add(pinGroup);
    });
  }, [evaluateElectricFieldAt, selectedProbeId]);

  // Charge Meshes Builder
  const rebuildChargeMeshes = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;

    // Clear old meshes
    state.chargeMeshes.forEach(mesh => state.scene.remove(mesh));
    state.chargeMeshes.clear();

    setChargesSnapshot(state.charges.map(c => ({ ...c })));

    if (materialModeRef.current !== 'point_charges') {
      updateSelectionRingVisual();
      return;
    }

    state.charges.forEach(ch => {
      const isPos = ch.qMicro >= 0;
      const color = isPos ? 0xef4444 : 0x3b82f6;

      const group = new THREE.Group();

      // Center sphere
      const sphereGeo = new THREE.SphereGeometry(0.65, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.4,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.castShadow = true;
      group.add(sphere);

      // Orbital glow halo
      const haloGeo = new THREE.RingGeometry(0.75, 1.02, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      group.add(halo);

      // Sign symbol (+ or -)
      const signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const barH = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.12), signMat);
      barH.position.z = 0.66;
      group.add(barH);

      if (isPos) {
        const barV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), signMat);
        barV.position.z = 0.66;
        group.add(barV);
      }

      // Add magnitude badge floating above charge
      const badge = createChargeBadge(ch.qMicro);
      group.add(badge);

      group.position.set(ch.x, ch.y, ch.z);
      state.scene.add(group);
      state.chargeMeshes.set(ch.id, group);
    });

    updateSelectionRingVisual();
  }, []);

  // Field Visualizations (Vector Grid, Forces, Streamlines, Slice Plane)
  const updateFieldVisuals = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;

    const mode = materialModeRef.current;
    const sphereQ = sphereChargeMicroRef.current;

    // 1. Vector Grid covering whole 60x60 Cartesian grid
    while (state.vectorGroup.children.length > 0) {
      state.vectorGroup.remove(state.vectorGroup.children[0]);
    }

    const hasActiveField =
      mode !== 'point_charges' ? Math.abs(sphereQ) > 0.01 : state.charges.length > 0;

    if (controlsState.showVectors && hasActiveField) {
      const span = 60;
      const density = Math.max(controlsState.gridDensity, 20);
      const step = span / density;
      const half = span / 2;

      for (let x = -half; x <= half; x += step) {
        for (let z = -half; z <= half; z += step) {
          const pt = new THREE.Vector3(x, 0.65, z);

          if (mode === 'point_charges') {
            let tooClose = false;
            for (let c = 0; c < state.charges.length; c++) {
              const ch = state.charges[c];
              if (pt.distanceTo(new THREE.Vector3(ch.x, ch.y, ch.z)) < 1.1) {
                tooClose = true;
                break;
              }
            }
            if (tooClose) continue;
          }

          const E = evaluateElectricFieldAt(pt, state.charges, mode, sphereQ);
          const eMag = E.length();
          if (eMag < 10) continue;

          const dir = E.clone().normalize();
          const arrowLength = Math.min(Math.log10(eMag + 1) * 0.35, 1.6);
          const normE = Math.min(eMag / 2e5, 1.0);

          const arrowColor = new THREE.Color();
          if (normE < 0.5) {
            arrowColor.lerpColors(new THREE.Color(0x6366f1), new THREE.Color(0x06b6d4), normE * 2);
          } else {
            arrowColor.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0xf59e0b), (normE - 0.5) * 2);
          }

          const arrow = new THREE.ArrowHelper(dir, pt, arrowLength, arrowColor.getHex(), 0.32, 0.18);
          state.vectorGroup.add(arrow);
        }
      }
    }

    // 2. Pairwise Coulomb Forces (when in point_charges mode)
    while (state.forceGroup.children.length > 0) {
      state.forceGroup.remove(state.forceGroup.children[0]);
    }

    if (mode === 'point_charges' && controlsState.showForces && state.charges.length > 1) {
      for (let i = 0; i < state.charges.length; i++) {
        for (let j = i + 1; j < state.charges.length; j++) {
          const c1 = state.charges[i];
          const c2 = state.charges[j];
          const p1 = new THREE.Vector3(c1.x, c1.y, c1.z);
          const p2 = new THREE.Vector3(c2.x, c2.y, c2.z);
          const rVec = new THREE.Vector3().subVectors(p2, p1);
          const r = rVec.length();
          if (r < 0.2) continue;

          const fMag = (COULOMB_K * Math.abs(c1.q * c2.q)) / (r * r);
          const isRepulsion = c1.q * c2.q > 0;
          const dir1 = rVec.clone().normalize();
          if (isRepulsion) dir1.negate();
          const dir2 = dir1.clone().negate();

          const fLen = Math.min(Math.log10(fMag + 1) * 0.45 + 0.6, 3.2);
          const color = isRepulsion ? 0xef4444 : 0x3b82f6;

          const arr1 = new THREE.ArrowHelper(dir1, p1, fLen, color, 0.45, 0.25);
          const arr2 = new THREE.ArrowHelper(dir2, p2, fLen, color, 0.45, 0.25);
          state.forceGroup.add(arr1);
          state.forceGroup.add(arr2);
        }
      }
    }

    // 3. Continuous Field Streamlines
    while (state.streamlineGroup.children.length > 0) {
      state.streamlineGroup.remove(state.streamlineGroup.children[0]);
    }

    if (controlsState.showStreamlines && hasActiveField) {
      if (mode === 'point_charges') {
        const posCharges = state.charges.filter(c => c.q > 0);
        const seeds: THREE.Vector3[] = [];

        posCharges.forEach(ch => {
          const numRays = 16;
          for (let a = 0; a < numRays; a++) {
            const theta = (a / numRays) * Math.PI * 2;
            seeds.push(
              new THREE.Vector3(ch.x + Math.cos(theta) * 0.85, ch.y, ch.z + Math.sin(theta) * 0.85)
            );
          }
        });

        seeds.forEach(seed => {
          const pts = traceFieldLine(seed, state.charges, 0.35, 120, true);
          if (pts.length > 1) {
            const geom = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({
              color: 0x38bdf8,
              transparent: true,
              opacity: 0.65,
            });
            const line = new THREE.Line(geom, mat);
            state.streamlineGroup.add(line);
          }
        });
      } else {
        // Radial field lines for Conductor (starting at surface r = R) vs Insulator (starting inside r = 1.2m)
        const numRays = 16;
        const startR = mode === 'conductor_sphere' ? SPHERE_RADIUS + 0.1 : 1.0;
        const endR = 28;
        for (let a = 0; a < numRays; a++) {
          const theta = (a / numRays) * Math.PI * 2;
          const pts = [
            new THREE.Vector3(Math.cos(theta) * startR, 0.65, Math.sin(theta) * startR),
            new THREE.Vector3(Math.cos(theta) * endR, 0.65, Math.sin(theta) * endR),
          ];
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.65,
          });
          state.streamlineGroup.add(new THREE.Line(geom, mat));
        }
      }
    }

    // 4. Equipotential Slice Plane
    if (state.slicePlaneMesh) {
      state.scene.remove(state.slicePlaneMesh);
      state.slicePlaneMesh = null;
    }

    if (mode === 'point_charges' && controlsState.showSlicePlane && state.charges.length > 0) {
      const extent = 60;
      const texture = generateEquipotentialTexture(
        state.charges,
        controlsState.sliceOrientation,
        controlsState.sliceOffset,
        256,
        extent
      );

      const planeGeo = new THREE.PlaneGeometry(extent, extent);
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });

      const planeMesh = new THREE.Mesh(planeGeo, planeMat);

      if (controlsState.sliceOrientation === 'xz') {
        planeMesh.rotation.x = -Math.PI / 2;
        planeMesh.position.set(0, controlsState.sliceOffset, 0);
      } else if (controlsState.sliceOrientation === 'xy') {
        planeMesh.position.set(0, 0, controlsState.sliceOffset);
      } else {
        planeMesh.rotation.y = Math.PI / 2;
        planeMesh.position.set(controlsState.sliceOffset, 0, 0);
      }

      state.slicePlaneMesh = planeMesh;
      state.scene.add(planeMesh);
    }

    rebuildEquilibriumVisuals();
    rebuildProbeMarkers();

    onUpdateTelemetry({
      chargeCount: state.charges.length,
      eFieldAtCursor: 0,
      fPredicted: 0,
      activeParticles: state.particles.length,
    });
  }, [
    controlsState,
    evaluateElectricFieldAt,
    onUpdateTelemetry,
    rebuildEquilibriumVisuals,
    rebuildProbeMarkers,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);

    // Cameras
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 20, 24);

    const frustumSize = 35;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    orthoCamera.position.set(0, 40, 0);
    orthoCamera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 5;
    controls.maxDistance = 80;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3D Cartesian Grid Ground (60x60 units)
    const grid = new THREE.GridHelper(60, 60, 0x0284c7, 0x172554);
    grid.position.y = 0;
    scene.add(grid);

    // Cartesian Axes
    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-30, 0.02, 0),
      new THREE.Vector3(30, 0.02, 0),
    ]);
    const xAxisMat = new THREE.LineBasicMaterial({ color: 0xf43f5e });
    scene.add(new THREE.Line(xAxisGeo, xAxisMat));

    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, -30),
      new THREE.Vector3(0, 0.02, 30),
    ]);
    const zAxisMat = new THREE.LineBasicMaterial({ color: 0x06b6d4 });
    scene.add(new THREE.Line(zAxisGeo, zAxisMat));

    // Outer Perimeter Boundary Border at +/- 30
    const borderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-30, 0.02, -30),
      new THREE.Vector3(30, 0.02, -30),
      new THREE.Vector3(30, 0.02, 30),
      new THREE.Vector3(-30, 0.02, 30),
      new THREE.Vector3(-30, 0.02, -30),
    ]);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Line(borderGeo, borderMat));

    // Groups
    const equilibriumGroup = new THREE.Group();
    const probeMarkersGroup = new THREE.Group();
    const vectorGroup = new THREE.Group();
    const forceGroup = new THREE.Group();
    const streamlineGroup = new THREE.Group();
    scene.add(equilibriumGroup);
    scene.add(probeMarkersGroup);
    scene.add(vectorGroup);
    scene.add(forceGroup);
    scene.add(streamlineGroup);

    // Selection Ring for active charge
    const ringGeo = new THREE.RingGeometry(0.85, 1.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const selectionRing = new THREE.Group();
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    selectionRing.add(ringMesh);
    selectionRing.visible = false;
    scene.add(selectionRing);

    // Cursor Projection Reticle
    const cursorProjection = new THREE.Group();
    const outerReticleGeo = new THREE.RingGeometry(0.5, 0.62, 32);
    const outerReticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const outerReticle = new THREE.Mesh(outerReticleGeo, outerReticleMat);
    outerReticle.rotation.x = -Math.PI / 2;
    cursorProjection.add(outerReticle);
    cursorProjection.visible = false;
    scene.add(cursorProjection);

    // Initial default charges: Dipole
    const initialCharges: SourceCharge[] = [
      { id: 'q_pos_init', q: 5e-6, qMicro: 5, x: -4.5, y: 0.65, z: 0 },
      { id: 'q_neg_init', q: -5e-6, qMicro: -5, x: 4.5, y: 0.65, z: 0 },
    ];

    threeRef.current = {
      scene,
      camera,
      orthoCamera,
      renderer,
      controls,
      charges: initialCharges,
      chargeMeshes: new Map(),
      equilibriumGroup,
      probeMarkersGroup,
      vectorGroup,
      forceGroup,
      streamlineGroup,
      slicePlaneMesh: null,
      particles: [],
      particleMeshes: new Map(),
      selectionRing,
      cursorProjection,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      isDragging: false,
      draggedChargeId: null,
    };

    rebuildChargeMeshes();
    updateFieldVisuals();

    // Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const asp = w / h;

      camera.aspect = asp;
      camera.updateProjectionMatrix();

      orthoCamera.left = (-frustumSize * asp) / 2;
      orthoCamera.right = (frustumSize * asp) / 2;
      orthoCamera.top = frustumSize / 2;
      orthoCamera.bottom = -frustumSize / 2;
      orthoCamera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let lastTime = performance.now();
    let frameCounter = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = threeRef.current;
      if (!state) return;

      state.controls.update();

      // Rotate charge halos & selection ring
      state.chargeMeshes.forEach(grp => {
        const halo = grp.children[1];
        if (halo) halo.rotation.z += 0.012;
      });

      if (state.selectionRing && state.selectionRing.visible) {
        state.selectionRing.children[0].rotation.z += 0.02;
      }

      // Step test particles with Lorentz integrator using live propsRef
      const liveControls = propsRef.current.controlsState;
      const liveTracer = propsRef.current.tracerSettings;

      const bVec = liveControls.bField.enabled
        ? new THREE.Vector3(liveControls.bField.x, liveControls.bField.y, liveControls.bField.z)
        : new THREE.Vector3(0, 0, 0);

      const simSpeed = liveTracer.simSpeed ?? 1.0;
      const damping = liveTracer.damping ?? 0.28;
      const lockToPlane = liveTracer.lockToPlane ?? true;

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        const visual = state.particleMeshes.get(p.id);

        if (p.absorbing) {
          if (visual) {
            visual.mesh.scale.multiplyScalar(0.82);
            if (visual.mesh.scale.x < 0.08) {
              state.scene.remove(visual.mesh);
              state.scene.remove(visual.line);
              state.particleMeshes.delete(p.id);
              state.particles.splice(i, 1);
            }
          }
          continue;
        }

        if (!p.active) continue;

        stepParticleRK4(p, state.charges, bVec, dt * simSpeed, damping, lockToPlane, 0.65);

        if (visual) {
          visual.mesh.position.copy(p.pos);

          const positions = new Float32Array(p.trail.length * 3);
          for (let j = 0; j < p.trail.length; j++) {
            positions[j * 3] = p.trail[j].x;
            positions[j * 3 + 1] = p.trail[j].y;
            positions[j * 3 + 2] = p.trail[j].z;
          }
          visual.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          visual.line.geometry.attributes.position.needsUpdate = true;
        }

        if (Math.abs(p.pos.x) > 31.5 || Math.abs(p.pos.z) > 31.5 || p.pos.length() > 46) {
          p.active = false;
          if (visual) {
            state.scene.remove(visual.mesh);
            state.scene.remove(visual.line);
            state.particleMeshes.delete(p.id);
          }
          state.particles.splice(i, 1);
        }
      }

      const activeCamera = liveControls.viewMode === '3d' ? state.camera : state.orthoCamera;
      renderer.render(state.scene, activeCamera);

      // Update projected 2D screen coordinates for clicked point labels every 3 frames
      frameCounter++;
      if (frameCounter % 3 === 0 && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const nextProj: Record<string, { x: number; y: number; visible: boolean }> = {};
        probePointsRef.current.forEach(pt => {
          const worldVec = new THREE.Vector3(pt.x, 0.45, pt.z);
          worldVec.project(activeCamera);
          const sx = (worldVec.x * 0.5 + 0.5) * w;
          const sy = (-(worldVec.y * 0.5) + 0.5) * h;
          const isVisible = worldVec.z < 1.0 && sx >= 0 && sx <= w && sy >= 0 && sy <= h;
          nextProj[pt.id] = { x: sx, y: sy, visible: isVisible };
        });
        setProjectedLabels(nextProj);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [rebuildChargeMeshes, updateFieldVisuals]);

  // Update cameras on viewMode toggle
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    if (controlsState.viewMode === 'top') {
      state.orthoCamera.position.set(0, 45, 0);
      state.orthoCamera.lookAt(0, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
    } else if (controlsState.viewMode === 'front') {
      state.orthoCamera.position.set(0, 0, 45);
      state.orthoCamera.lookAt(0, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
    } else if (controlsState.viewMode === 'side') {
      state.orthoCamera.position.set(45, 0, 0);
      state.orthoCamera.lookAt(0, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
    } else {
      state.controls.object = state.camera;
      state.controls.enableRotate = true;
    }
    state.controls.update();
  }, [controlsState.viewMode]);

  // Re-run visuals when controls, materialMode, sphereCharge, or probePoints change
  useEffect(() => {
    rebuildChargeMeshes();
    updateFieldVisuals();
  }, [controlsState, materialMode, sphereChargeMicro, rebuildChargeMeshes, updateFieldVisuals]);

  useEffect(() => {
    rebuildProbeMarkers();
  }, [probePoints, selectedProbeId, rebuildProbeMarkers]);

  // Pointer interaction (dragging charges, placing charges, launching particles, or clicking a point to probe E-field)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
    state.raycaster.setFromCamera(state.mouse, activeCamera);

    const intersection = new THREE.Vector3();
    const hitPlane = state.raycaster.ray.intersectPlane(state.dragPlane, intersection);

    // Placement Mode actions
    if (placementMode === 'charge_pos' || placementMode === 'charge_neg') {
      if (hitPlane) {
        setMaterialMode('point_charges');
        const qMag = defaultSourceQ ?? 5.0;
        const qMicro = placementMode === 'charge_pos' ? Math.abs(qMag) : -Math.abs(qMag);
        const newCharge: SourceCharge = {
          id: `q_${chargeCounter++}`,
          q: qMicro * 1e-6,
          qMicro,
          x: Math.max(-29.5, Math.min(29.5, intersection.x)),
          y: 0.65,
          z: Math.max(-29.5, Math.min(29.5, intersection.z)),
        };
        state.charges.push(newCharge);
        rebuildChargeMeshes();
        updateFieldVisuals();
        onSelectCharge(newCharge);
      }
      return;
    }

    if (placementMode === 'tracer') {
      if (hitPlane) {
        launchParticleAt(intersection.x, intersection.z);
      }
      return;
    }

    // Check click on charge meshes for selection / drag
    if (materialMode === 'point_charges') {
      const chargeObjects: THREE.Object3D[] = [];
      state.chargeMeshes.forEach(grp => chargeObjects.push(grp.children[0]));

      const hits = state.raycaster.intersectObjects(chargeObjects);
      if (hits.length > 0) {
        state.controls.enabled = false;
        state.isDragging = true;

        for (const [id, grp] of state.chargeMeshes.entries()) {
          if (grp.children.includes(hits[0].object)) {
            state.draggedChargeId = id;
            const found = state.charges.find(c => c.id === id);
            if (found) onSelectCharge(found);
            break;
          }
        }
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
    state.raycaster.setFromCamera(state.mouse, activeCamera);

    const intersection = new THREE.Vector3();
    const hitPlane = state.raycaster.ray.intersectPlane(state.dragPlane, intersection);

    if (state.cursorProjection) {
      if (placementMode !== 'none' && hitPlane) {
        state.cursorProjection.visible = true;
        state.cursorProjection.position.set(
          Math.max(-29.5, Math.min(29.5, intersection.x)),
          0.05,
          Math.max(-29.5, Math.min(29.5, intersection.z))
        );
        const reticleMesh = state.cursorProjection.children[0] as THREE.Mesh;
        if (reticleMesh && reticleMesh.material) {
          const mat = reticleMesh.material as THREE.MeshBasicMaterial;
          if (placementMode === 'charge_pos') mat.color.setHex(0xef4444);
          else if (placementMode === 'charge_neg') mat.color.setHex(0x3b82f6);
          else if (placementMode === 'tracer') mat.color.setHex(0x10b981);
        }
      } else {
        state.cursorProjection.visible = false;
      }
    }

    if (state.isDragging && state.draggedChargeId && hitPlane) {
      const ch = state.charges.find(c => c.id === state.draggedChargeId);
      if (ch && !ch.pinned) {
        ch.x = Math.max(-29.5, Math.min(29.5, intersection.x));
        ch.z = Math.max(-29.5, Math.min(29.5, intersection.z));

        const meshGrp = state.chargeMeshes.get(ch.id);
        if (meshGrp) meshGrp.position.set(ch.x, ch.y, ch.z);

        setChargesSnapshot(state.charges.map(c => ({ ...c })));
        updateSelectionRingVisual();
        updateFieldVisuals();
      }
    }

    if (hitPlane) {
      const E = evaluateElectricFieldAt(
        intersection,
        state.charges,
        materialModeRef.current,
        sphereChargeMicroRef.current
      );
      const eMag = E.length();
      const qTest = tracerSettings.qMicro * 1e-6;
      const fMag = eMag * Math.abs(qTest);

      onUpdateTelemetry({
        chargeCount: state.charges.length,
        eFieldAtCursor: eMag,
        fPredicted: fMag,
        activeParticles: state.particles.length,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;

    const wasDraggingCharge = state.isDragging;
    state.controls.enabled = true;
    state.isDragging = false;
    state.draggedChargeId = null;

    // If user clicked (didn't orbit/drag) on the plane while placementMode === 'none', probe the E-field at that point!
    if (!wasDraggingCharge && placementMode === 'none' && pointerDownPosRef.current) {
      const moveDist = Math.hypot(
        e.clientX - pointerDownPosRef.current.x,
        e.clientY - pointerDownPosRef.current.y
      );
      if (moveDist < 5 && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
        state.raycaster.setFromCamera(state.mouse, activeCamera);

        // Check if we clicked a charge first
        const chargeObjects: THREE.Object3D[] = [];
        state.chargeMeshes.forEach(grp => chargeObjects.push(grp.children[0]));
        const chargeHits = state.raycaster.intersectObjects(chargeObjects);
        if (chargeHits.length === 0) {
          const intersection = new THREE.Vector3();
          const hitPlane = state.raycaster.ray.intersectPlane(state.dragPlane, intersection);
          if (hitPlane) {
            const px = parseFloat(Math.max(-29.0, Math.min(29.0, intersection.x)).toFixed(2));
            const pz = parseFloat(Math.max(-29.0, Math.min(29.0, intersection.z)).toFixed(2));

            const existingUnsaved = probePointsRef.current.find(p => !p.saved);
            if (existingUnsaved) {
              const updatedId = existingUnsaved.id;
              setProbePoints(prev =>
                prev.map(p => (p.id === updatedId ? { ...p, x: px, z: pz } : p))
              );
              setSelectedProbeId(updatedId);
            } else {
              const newId = `ept_${Date.now()}`;
              const newLabel = `P${nextProbeCounter}`;
              setNextProbeCounter(prev => prev + 1);
              setProbePoints(prev => [
                ...prev,
                { id: newId, label: newLabel, x: px, z: pz, saved: false },
              ]);
              setSelectedProbeId(newId);
            }
          }
        }
      }
    }
    pointerDownPosRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
    state.raycaster.setFromCamera(state.mouse, activeCamera);

    const intersection = new THREE.Vector3();
    const hitPlane = state.raycaster.ray.intersectPlane(state.dragPlane, intersection);
    if (hitPlane) {
      launchParticleAt(intersection.x, intersection.z);
    }
  };

  const launchParticleAt = (x: number, z: number) => {
    const state = threeRef.current;
    if (!state) return;

    const liveTracer = propsRef.current.tracerSettings;
    const qVal = liveTracer.qMicro * 1e-6;
    const mVal = Math.max(liveTracer.massMicro * 1e-6, 1e-9);
    const isPos = qVal >= 0;
    const color = isPos ? 0xef4444 : 0x3b82f6;

    const cx = Math.max(-29.5, Math.min(29.5, x));
    const cz = Math.max(-29.5, Math.min(29.5, z));
    const startPos = new THREE.Vector3(cx, 0.65, cz);
    const startVel = new THREE.Vector3(0, 0, 0);

    const sphereGeo = new THREE.SphereGeometry(0.38, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const pMesh = new THREE.Mesh(sphereGeo, sphereMat);
    pMesh.position.copy(startPos);
    state.scene.add(pMesh);

    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array([startPos.x, startPos.y, startPos.z]);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    state.scene.add(trailLine);

    const particleId = `p_${particleCounter++}`;
    const particle: TestParticle = {
      id: particleId,
      q: qVal,
      mass: mVal,
      pos: startPos,
      vel: startVel,
      acc: new THREE.Vector3(0, 0, 0),
      color,
      trail: [startPos.clone()],
      maxTrail: 600,
      initialEnergy: 0,
      currentEnergy: { kinetic: 0, potential: 0, total: 0 },
      workDone: 0,
      active: true,
      timeAccumulator: 0,
    };

    state.particles.push(particle);
    state.particleMeshes.set(particleId, { mesh: pMesh, line: trailLine });
  };

  // Preset Configurations Loader (including Conductor vs Insulator Sphere presets for LO 8.3.B)
  const loadPreset = useCallback(
    (preset: string) => {
      const state = threeRef.current;
      if (!state) return;

      if (preset === 'conductor_sphere') {
        setMaterialMode('conductor_sphere');
        setProbePoints([
          { id: 'ept_in', label: 'P1 (Inside)', x: 2.0, z: 0.0, saved: true },
          { id: 'ept_out', label: 'P2 (Outside)', x: 8.5, z: 0.0, saved: true },
        ]);
        setSelectedProbeId('ept_in');
        return;
      }

      if (preset === 'insulator_sphere') {
        setMaterialMode('insulator_sphere');
        setProbePoints([
          { id: 'ept_in', label: 'P1 (Inside)', x: 3.0, z: 0.0, saved: true },
          { id: 'ept_out', label: 'P2 (Outside)', x: 8.5, z: 0.0, saved: true },
        ]);
        setSelectedProbeId('ept_in');
        return;
      }

      setMaterialMode('point_charges');
      state.charges = [];

      if (preset === 'dipole') {
        state.charges.push(
          { id: 'dipole_pos', q: 5e-6, qMicro: 5, x: -5, y: 0.65, z: 0 },
          { id: 'dipole_neg', q: -5e-6, qMicro: -5, x: 5, y: 0.65, z: 0 }
        );
      } else if (preset === 'quadrupole') {
        state.charges.push(
          { id: 'quad_1', q: 5e-6, qMicro: 5, x: -5, y: 0.65, z: -5 },
          { id: 'quad_2', q: -5e-6, qMicro: -5, x: 5, y: 0.65, z: -5 },
          { id: 'quad_3', q: -5e-6, qMicro: -5, x: -5, y: 0.65, z: 5 },
          { id: 'quad_4', q: 5e-6, qMicro: 5, x: 5, y: 0.65, z: 5 }
        );
      } else if (preset === 'capacitor') {
        for (let x = -8; x <= 8; x += 2.5) {
          state.charges.push({ id: `cap_pos_${x}`, q: 2e-6, qMicro: 2, x, y: 0.65, z: -4 });
          state.charges.push({ id: `cap_neg_${x}`, q: -2e-6, qMicro: -2, x, y: 0.65, z: 4 });
        }
      } else if (preset === 'grounded_plane') {
        state.charges.push({ id: 'real_q', q: 6e-6, qMicro: 6, x: -6, y: 0.65, z: 0 });
        for (let z = -12; z <= 12; z += 2.5) {
          state.charges.push({ id: `ground_${z}`, q: -1e-6, qMicro: -1, x: 0, y: 0.65, z });
        }
      } else if (preset === 'repulsion') {
        state.charges.push(
          { id: 'rep_1', q: 6e-6, qMicro: 6, x: -5, y: 0.65, z: 0 },
          { id: 'rep_2', q: 6e-6, qMicro: 6, x: 5, y: 0.65, z: 0 }
        );
      }

      rebuildChargeMeshes();
      updateFieldVisuals();
      onSelectCharge(null);
    },
    [onSelectCharge, rebuildChargeMeshes, updateFieldVisuals]
  );

  // Expose methods to parent
  useEffect(() => {
    (window as any).__fieldSandbox = {
      loadPreset,
      clearCharges: () => {
        const state = threeRef.current;
        if (!state) return;
        state.charges = [];
        rebuildChargeMeshes();
        updateFieldVisuals();
        onSelectCharge(null);
      },
      clearTracers: () => {
        const state = threeRef.current;
        if (!state) return;
        state.particles.forEach(p => {
          const v = state.particleMeshes.get(p.id);
          if (v) {
            state.scene.remove(v.mesh);
            state.scene.remove(v.line);
          }
        });
        state.particles = [];
        state.particleMeshes.clear();
      },
      clearParticles: () => {
        const state = threeRef.current;
        if (!state) return;
        state.particles.forEach(p => {
          const v = state.particleMeshes.get(p.id);
          if (v) {
            state.scene.remove(v.mesh);
            state.scene.remove(v.line);
          }
        });
        state.particles = [];
        state.particleMeshes.clear();
      },
      updateSelectedCharge: (updated: SourceCharge) => {
        const state = threeRef.current;
        if (!state) return;
        const idx = state.charges.findIndex(c => c.id === updated.id);
        if (idx !== -1) {
          state.charges[idx] = { ...updated };
          rebuildChargeMeshes();
          updateFieldVisuals();
        }
      },
      deleteSelectedCharge: (id: string) => {
        const state = threeRef.current;
        if (!state) return;
        state.charges = state.charges.filter(c => c.id !== id);
        rebuildChargeMeshes();
        updateFieldVisuals();
        onSelectCharge(null);
      },
      fireTracer: () => {
        launchParticleAt(-5, 5);
      },
      getSnapshot: () => {
        const state = threeRef.current;
        return {
          charges: state ? state.charges.map(c => ({ ...c })) : [],
          controlsState: propsRef.current.controlsState,
          tracerSettings: propsRef.current.tracerSettings,
        };
      },
      restoreSnapshot: (fieldData: any, cameraState?: any) => {
        const state = threeRef.current;
        if (!state) return;
        if (fieldData?.charges) {
          state.charges = fieldData.charges.map((c: any) => ({ ...c }));
          rebuildChargeMeshes();
          updateFieldVisuals();
        }
        if (cameraState && state.camera) {
          state.camera.position.set(cameraState.x, cameraState.y, cameraState.z);
          state.controls.target.set(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
          state.controls.update();
        }
      },
      getCameraState: () => {
        const state = threeRef.current;
        if (!state) return undefined;
        return {
          x: state.camera.position.x,
          y: state.camera.position.y,
          z: state.camera.position.z,
          targetX: state.controls.target.x,
          targetY: state.controls.target.y,
          targetZ: state.controls.target.z,
        };
      },
    };
  }, [loadPreset, rebuildChargeMeshes, updateFieldVisuals, onSelectCharge]);

  // Selected Probe Point & Calculated E-Field Data
  const selectedProbePoint =
    probePoints.find(p => p.id === selectedProbeId) || probePoints[probePoints.length - 1] || null;

  const selectedProbeData = useMemo(() => {
    if (!selectedProbePoint) return null;
    const ptVec = new THREE.Vector3(selectedProbePoint.x, 0.65, selectedProbePoint.z);
    const E = evaluateElectricFieldAt(ptVec, chargesSnapshot, materialMode, sphereChargeMicro);
    const eMag = E.length();
    const angleDeg = (Math.atan2(-E.z, E.x) * 180) / Math.PI;
    const rFromOrigin = Math.hypot(selectedProbePoint.x, selectedProbePoint.z);

    // Force on test charge q_0 (LO 8.3.A.2: E = F_E / q_0)
    const qTestCoulombs = tracerSettings.qMicro * 1e-6;
    const fVec = E.clone().multiplyScalar(qTestCoulombs);
    const fMag = fVec.length();

    // Individual source contributions (LO 8.3.A.3.i: Superposition E_net = sum E_i)
    const contributions =
      materialMode === 'point_charges'
        ? chargesSnapshot.map((ch, idx) => {
            const singleE = calculateElectricField(ptVec, [ch]);
            return {
              id: ch.id,
              label: `q${idx + 1} (${ch.qMicro >= 0 ? '+' : ''}${ch.qMicro.toFixed(1)}μC)`,
              mag: singleE.length(),
            };
          })
        : [];

    return {
      ex: E.x,
      ez: E.z,
      eMag,
      angleDeg,
      rFromOrigin,
      fMag,
      qTestMicro: tracerSettings.qMicro,
      isSameDirection: tracerSettings.qMicro >= 0,
      contributions,
    };
  }, [
    selectedProbePoint,
    evaluateElectricFieldAt,
    chargesSnapshot,
    materialMode,
    sphereChargeMicro,
    tracerSettings.qMicro,
  ]);

  const formatSci = (val: number, unit = ''): string => {
    if (val === 0 || Math.abs(val) < 1e-12) return `0.00 ${unit}`.trim();
    if (Math.abs(val) >= 0.1 && Math.abs(val) < 10000) {
      return `${val.toFixed(2)} ${unit}`.trim();
    }
    const [m, exp] = val.toExponential(2).split('e');
    return `${m}×10^${exp.replace('+', '')} ${unit}`.trim();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full block ${
          placementMode !== 'none' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* 2D Projected Clickable Labels for Probed E-Field Points on the Plane */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {probePoints.map(pt => {
          const proj = projectedLabels[pt.id];
          if (!proj || !proj.visible) return null;
          const isSelected = pt.id === selectedProbeId;
          const ptE = evaluateElectricFieldAt(
            new THREE.Vector3(pt.x, 0.65, pt.z),
            chargesSnapshot,
            materialMode,
            sphereChargeMicro
          ).length();

          return (
            <button
              key={pt.id}
              onClick={e => {
                e.stopPropagation();
                setSelectedProbeId(pt.id);
              }}
              style={{
                left: `${proj.x}px`,
                top: `${proj.y - 18}px`,
              }}
              className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border shadow-lg transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-cyan-950/95 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/30 scale-105'
                  : pt.saved
                  ? 'bg-[#081022]/90 text-slate-200 border-sky-500/50 hover:border-cyan-300'
                  : 'bg-[#1a1505]/90 text-amber-200 border-amber-400/70'
              }`}
              title="Click to inspect E-field strength at this point"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSelected ? 'bg-cyan-400 animate-pulse' : pt.saved ? 'bg-sky-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {pt.label} ({pt.x.toFixed(1)}, {pt.z.toFixed(1)})
              </span>
              {isSelected && (
                <span className="text-cyan-300 border-l border-white/20 pl-1">
                  {formatSci(ptE, 'N/C')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top-Center Mode Switcher for Topic 8.3: Point Charges vs Conductor Sphere vs Insulator Sphere (LO 8.3.B) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#080e1e]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 text-xs">
        <button
          onClick={() => setMaterialMode('point_charges')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
            materialMode === 'point_charges'
              ? 'bg-sky-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Point Charges (8.3.A)</span>
        </button>
        <button
          onClick={() => loadPreset('conductor_sphere')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
            materialMode === 'conductor_sphere'
              ? 'bg-emerald-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Conducting Sphere (8.3.B.1)</span>
        </button>
        <button
          onClick={() => loadPreset('insulator_sphere')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
            materialMode === 'insulator_sphere'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Insulating Sphere (8.3.B.2)</span>
        </button>
        <button
          onClick={() => setShowTheoryModal(prev => !prev)}
          className={`px-2.5 py-1.5 rounded-xl font-semibold border transition flex items-center gap-1 ${
            showTheoryModal
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
              : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
          }`}
          title="Topic 8.3 AP Course Requirements Summary"
        >
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">8.3 Guide</span>
        </button>
      </div>

      {/* Floating E-Field Point Probe & Equilibrium Inspector Dock (Bottom-Left / Center-Right safe zone) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92vw] max-w-xl bg-[#080e1e]/92 backdrop-blur-xl border border-cyan-500/35 rounded-2xl p-3.5 shadow-2xl text-xs text-slate-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white">
              Clicked Point E-Field Probe (Click Plane to Probe &amp; Store)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedProbePoint && (
              <button
                onClick={() => {
                  setProbePoints(prev =>
                    prev.map(p => (p.id === selectedProbePoint.id ? { ...p, saved: true } : p))
                  );
                }}
                disabled={selectedProbePoint.saved}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                  selectedProbePoint.saved
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>{selectedProbePoint.saved ? 'Point Stored' : 'Store Point'}</span>
              </button>
            )}
          </div>
        </div>

        {selectedProbePoint && selectedProbeData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left Column: E-Field Magnitude & Components at Clicked Point */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-cyan-300 font-bold">
                  {selectedProbePoint.label} ({selectedProbePoint.x.toFixed(1)}m,{' '}
                  {selectedProbePoint.z.toFixed(1)}m)
                </span>
                <span className="text-slate-400">r = {selectedProbeData.rFromOrigin.toFixed(2)}m</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-slate-400">E-Field Strength |E|:</span>
                <span className="text-lg font-black font-mono text-cyan-300">
                  {formatSci(selectedProbeData.eMag, 'N/C')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-300 pt-0.5">
                <div className="bg-white/5 px-1.5 py-1 rounded">
                  Ex: {formatSci(selectedProbeData.ex)}
                </div>
                <div className="bg-white/5 px-1.5 py-1 rounded">
                  Ez: {formatSci(selectedProbeData.ez)}
                </div>
                <div className="bg-white/5 px-1.5 py-1 rounded">
                  θ: {selectedProbeData.angleDeg.toFixed(1)}°
                </div>
              </div>

              {/* LO 8.3.A.2: E = F_E / q_0 relationship */}
              <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">
                  Force on q₀ ({selectedProbeData.qTestMicro >= 0 ? '+' : ''}
                  {selectedProbeData.qTestMicro.toFixed(1)}μC):
                </span>
                <span className="text-emerald-300 font-bold">
                  |F_E| = {formatSci(selectedProbeData.fMag, 'N')} (
                  {selectedProbeData.isSameDirection ? '∥ E' : 'anti-∥ E'})
                </span>
              </div>
            </div>

            {/* Right Column: Stored Points List & Conductor/Insulator Equilibrium Status */}
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex flex-col justify-between space-y-2">
              {materialMode !== 'point_charges' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-300">
                      {materialMode === 'conductor_sphere'
                        ? 'Conductor Sphere (R = 6m)'
                        : 'Insulator Sphere (R = 6m)'}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <span>Q:</span>
                      <button
                        onClick={() => setSphereChargeMicro(prev => -prev)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-cyan-300 font-bold"
                      >
                        {sphereChargeMicro >= 0 ? `+${sphereChargeMicro}μC` : `${sphereChargeMicro}μC`} (±)
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    {materialMode === 'conductor_sphere'
                      ? selectedProbeData.rFromOrigin < SPHERE_RADIUS
                        ? 'LO 8.3.B.1: Point is INSIDE the conductor (r < 6m). All excess charge resides on the outer surface, so E_inside = 0 N/C!'
                        : 'LO 8.3.B.1.ii: Point is OUTSIDE the sphere (r ≥ 6m). By Shell Theorem, E matches a central point charge Q!'
                      : selectedProbeData.rFromOrigin < SPHERE_RADIUS
                      ? 'LO 8.3.B.2: Point is INSIDE the uniform insulator (r < 6m). Charge is distributed throughout the interior, so E_inside = kQr/R³ ≠ 0!'
                      : 'LO 8.3.B.2: Outside the insulating sphere (r ≥ 6m), E = kQ/r².'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">
                    Superposition |E_net| = |∑ E_i| (LO 8.3.A.3.i):
                  </div>
                  <div className="max-h-14 overflow-y-auto space-y-0.5 pr-1">
                    {selectedProbeData.contributions.slice(0, 4).map(c => (
                      <div key={c.id} className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-300">{c.label}:</span>
                        <span className="text-sky-300">{formatSci(c.mag, 'N/C')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stored Points Pills */}
              <div className="pt-1 border-t border-white/10 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>STORED / CLICKED POINTS ({probePoints.length}):</span>
                  {probePoints.length > 1 && (
                    <button
                      onClick={() => {
                        setProbePoints([]);
                        setSelectedProbeId(null);
                      }}
                      className="text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {probePoints.map(pt => {
                    const isSel = pt.id === selectedProbeId;
                    return (
                      <div
                        key={pt.id}
                        onClick={() => setSelectedProbeId(pt.id)}
                        className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition ${
                          isSel
                            ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>
                          {pt.label} ({pt.x.toFixed(1)}, {pt.z.toFixed(1)})
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setProbePoints(prev => prev.filter(x => x.id !== pt.id));
                          }}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic text-center py-1">
            Click any point on the plane to calculate, label, and store the E-field strength at that coordinate.
          </div>
        )}
      </div>

      {/* Topic 8.3 Course Requirements Guide Modal */}
      {showTheoryModal && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-2xl bg-[#070d1d]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 shadow-2xl text-xs text-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white">
                AP Physics C Topic 8.3: Electric Fields — Course Requirements
              </span>
            </div>
            <button
              onClick={() => setShowTheoryModal(false)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
              <div className="font-bold text-sky-300">
                8.3.A: Point Charges, Test Charges &amp; Field Maps
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • <strong>E = F_E / q</strong>: Ratio of electric force on a test charge to its charge. A test charge must be small enough not to perturb the source field (8.3.A.2.i).
                <br />• <strong>Direction</strong>: Points away from isolated + charges and toward − charges. Force on +q₀ is parallel to E; force on −q₀ is opposite to E.
                <br />• <strong>Superposition</strong>: E_net = ∑ E_i at any probed point.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
              <div className="font-bold text-emerald-300">
                8.3.B: Conductors vs. Insulators in Equilibrium
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • <strong>Conductors (8.3.B.1)</strong>: Excess charge resides strictly on the outer surface; <strong>E_inside = 0</strong> everywhere inside! At the surface, E ⊥ surface. Outside a spherical shell, E matches a central point charge.
                <br />• <strong>Insulators (8.3.B.2)</strong>: Excess charge can be distributed throughout the interior as well as the surface, so <strong>E_inside ≠ 0</strong> (grows as E ∝ r inside a uniform sphere).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
