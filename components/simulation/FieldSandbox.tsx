'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  COULOMB_K,
  SourceCharge,
  TestParticle,
  calculateElectricField,
  calculateElectricPotential,
  stepParticleRK4,
  traceFieldLine,
} from '@/lib/physics/coulomb';
import { generateEquipotentialTexture, SlicePlaneOrientation } from '@/lib/physics/equipotential';

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

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    charges: SourceCharge[];
    chargeMeshes: Map<string, THREE.Group>;
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

    if (!selectedChargeId) {
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
    ringMat.color.setHex(isPos ? 0xff2b56 : 0x0ea5e9);
  };

  // Helper to create 3D magnitude badge for each source charge
  const createChargeBadge = (qMicro: number): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const isPos = qMicro >= 0;
      ctx.fillStyle = isPos ? 'rgba(225, 29, 72, 0.9)' : 'rgba(14, 165, 233, 0.9)';
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

  // Charge Meshes Builder
  const rebuildChargeMeshes = () => {
    const state = threeRef.current;
    if (!state) return;

    // Clear old meshes
    state.chargeMeshes.forEach(mesh => state.scene.remove(mesh));
    state.chargeMeshes.clear();

    state.charges.forEach(ch => {
      const isPos = ch.qMicro >= 0;
      const color = isPos ? 0xff2b56 : 0x0ea5e9;

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

    // Update selection ring if active
    updateSelectionRingVisual();
  };

  // Field Visualizations (Vector Grid, Forces, Streamlines, Slice Plane)
  const updateFieldVisuals = () => {
    const state = threeRef.current;
    if (!state) return;

    // 1. Vector Grid covering whole 60x60 Cartesian grid
    while (state.vectorGroup.children.length > 0) {
      state.vectorGroup.remove(state.vectorGroup.children[0]);
    }

    if (controlsState.showVectors && state.charges.length > 0) {
      const span = 60; // Spanning full 60x60 Cartesian plane
      const density = Math.max(controlsState.gridDensity, 20);
      const step = span / density;
      const half = span / 2;

      for (let x = -half; x <= half; x += step) {
        for (let z = -half; z <= half; z += step) {
          const pt = new THREE.Vector3(x, 0.65, z);

          // Skip near charges
          let tooClose = false;
          for (let c = 0; c < state.charges.length; c++) {
            const ch = state.charges[c];
            if (pt.distanceTo(new THREE.Vector3(ch.x, ch.y, ch.z)) < 1.1) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;

          const E = calculateElectricField(pt, state.charges);
          const eMag = E.length();
          if (eMag < 50) continue;

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

    // 2. Pairwise Coulomb Forces
    while (state.forceGroup.children.length > 0) {
      state.forceGroup.remove(state.forceGroup.children[0]);
    }

    if (controlsState.showForces && state.charges.length > 1) {
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
          const color = isRepulsion ? 0xf97316 : 0x10b981;

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

    if (controlsState.showStreamlines && state.charges.length > 0) {
      const posCharges = state.charges.filter(c => c.q > 0);
      const seeds: THREE.Vector3[] = [];

      // Radially distribute seed rays from each positive charge
      posCharges.forEach(ch => {
        const numRays = 16;
        for (let a = 0; a < numRays; a++) {
          const theta = (a / numRays) * Math.PI * 2;
          seeds.push(new THREE.Vector3(ch.x + Math.cos(theta) * 0.85, ch.y, ch.z + Math.sin(theta) * 0.85));
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
    }

    // 4. Equipotential Slice Plane (spanning 60 to cover Cartesian grid)
    if (state.slicePlaneMesh) {
      state.scene.remove(state.slicePlaneMesh);
      state.slicePlaneMesh = null;
    }

    if (controlsState.showSlicePlane && state.charges.length > 0) {
      const extent = 60; // Spanning full Cartesian grid
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
        // yz
        planeMesh.rotation.y = Math.PI / 2;
        planeMesh.position.set(controlsState.sliceOffset, 0, 0);
      }

      state.slicePlaneMesh = planeMesh;
      state.scene.add(planeMesh);
    }

    // Telemetry callback
    onUpdateTelemetry({
      chargeCount: state.charges.length,
      eFieldAtCursor: 0,
      fPredicted: 0,
      activeParticles: state.particles.length,
    });
  };

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

    // 3D Cartesian Grid Ground (60x60 units, 60 cells: 1x1 meter cells from -30 to +30)
    const grid = new THREE.GridHelper(60, 60, 0x0284c7, 0x172554);
    grid.position.y = 0;
    scene.add(grid);

    // Cartesian Axes: Red X-axis and Cyan Z-axis
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
    const vectorGroup = new THREE.Group();
    const forceGroup = new THREE.Group();
    const streamlineGroup = new THREE.Group();
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

    // Rebuild charge visual representations
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

      // Step test particles with Lorentz integrator
      const bVec = controlsState.bField.enabled
        ? new THREE.Vector3(controlsState.bField.x, controlsState.bField.y, controlsState.bField.z)
        : new THREE.Vector3(0, 0, 0);

      const simSpeed = tracerSettings.simSpeed ?? 1.0;
      const damping = tracerSettings.damping ?? 0.12;
      const lockToPlane = tracerSettings.lockToPlane ?? true;

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        const visual = state.particleMeshes.get(p.id);

        // Oppositely charged electrode absorption animation
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

        // Update Three.js mesh
        if (visual) {
          visual.mesh.position.copy(p.pos);

          // Update trail line geometry
          const positions = new Float32Array(p.trail.length * 3);
          for (let j = 0; j < p.trail.length; j++) {
            positions[j * 3] = p.trail[j].x;
            positions[j * 3 + 1] = p.trail[j].y;
            positions[j * 3 + 2] = p.trail[j].z;
          }
          visual.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          visual.line.geometry.attributes.position.needsUpdate = true;
        }

        // Boundary removal covering full Cartesian grid (60x60, so +/- 30)
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

      // Active camera selection based on viewMode
      const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
      renderer.render(state.scene, activeCamera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

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
      // 3D perspective
      state.controls.object = state.camera;
      state.controls.enableRotate = true;
    }
    state.controls.update();
  }, [controlsState.viewMode]);

  // Re-run visuals when controls or charges change
  useEffect(() => {
    updateFieldVisuals();
  }, [controlsState]);

  // Pointer interaction (dragging charges, placing charges, launching particles)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

    // Placement Mode actions
    if (placementMode === 'charge_pos' || placementMode === 'charge_neg') {
      if (hitPlane) {
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
    const chargeObjects: THREE.Object3D[] = [];
    state.chargeMeshes.forEach(grp => chargeObjects.push(grp.children[0]));

    const hits = state.raycaster.intersectObjects(chargeObjects);
    if (hits.length > 0) {
      state.controls.enabled = false;
      state.isDragging = true;

      // Find hit charge
      for (const [id, grp] of state.chargeMeshes.entries()) {
        if (grp.children.includes(hits[0].object)) {
          state.draggedChargeId = id;
          const found = state.charges.find(c => c.id === id);
          if (found) onSelectCharge(found);
          break;
        }
      }
    } else {
      onSelectCharge(null);
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

    // Reticle cursor position update
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
          if (placementMode === 'charge_pos') mat.color.setHex(0xff2b56);
          else if (placementMode === 'charge_neg') mat.color.setHex(0x0ea5e9);
          else if (placementMode === 'tracer') mat.color.setHex(0x10b981);
        }
      } else {
        state.cursorProjection.visible = false;
      }
    }

    // Drag charge covering entire Cartesian grid (+/- 29.5)
    if (state.isDragging && state.draggedChargeId && hitPlane) {
      const ch = state.charges.find(c => c.id === state.draggedChargeId);
      if (ch && !ch.pinned) {
        ch.x = Math.max(-29.5, Math.min(29.5, intersection.x));
        ch.z = Math.max(-29.5, Math.min(29.5, intersection.z));

        const meshGrp = state.chargeMeshes.get(ch.id);
        if (meshGrp) meshGrp.position.set(ch.x, ch.y, ch.z);

        updateSelectionRingVisual();
        updateFieldVisuals();
      }
    }

    // Telemetry at pointer
    if (hitPlane && state.charges.length > 0) {
      const E = calculateElectricField(intersection, state.charges);
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

  const handlePointerUp = () => {
    const state = threeRef.current;
    if (!state) return;
    state.controls.enabled = true;
    state.isDragging = false;
    state.draggedChargeId = null;
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

    const qVal = tracerSettings.qMicro * 1e-6;
    // massMicro in milligrams -> 1 mg = 1e-6 kg
    const mVal = Math.max(tracerSettings.massMicro * 1e-6, 1e-9);
    const isPos = qVal >= 0;
    const color = isPos ? 0xff2b56 : 0x0ea5e9;

    const cx = Math.max(-29.5, Math.min(29.5, x));
    const cz = Math.max(-29.5, Math.min(29.5, z));
    const startPos = new THREE.Vector3(cx, 0.65, cz);
    const startVel = new THREE.Vector3(tracerSettings.vx, 0, tracerSettings.vz);

    const sphereGeo = new THREE.SphereGeometry(0.38, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const pMesh = new THREE.Mesh(sphereGeo, sphereMat);
    pMesh.position.copy(startPos);
    state.scene.add(pMesh);

    // Trail Line
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array([startPos.x, startPos.y, startPos.z]);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
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
      maxTrail: 240,
      initialEnergy: 0,
      currentEnergy: { kinetic: 0, potential: 0, total: 0 },
      workDone: 0,
      active: true,
    };

    state.particles.push(particle);
    state.particleMeshes.set(particleId, { mesh: pMesh, line: trailLine });
  };

  // Preset Configurations Loader
  const loadPreset = (preset: string) => {
    const state = threeRef.current;
    if (!state) return;

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
      // Parallel plate capacitor
      for (let x = -8; x <= 8; x += 2.5) {
        state.charges.push({ id: `cap_pos_${x}`, q: 2e-6, qMicro: 2, x, y: 0.65, z: -4 });
        state.charges.push({ id: `cap_neg_${x}`, q: -2e-6, qMicro: -2, x, y: 0.65, z: 4 });
      }
    } else if (preset === 'grounded_plane') {
      // Point charge near grounded plane (simulated by image charge)
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
  };

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
          controlsState,
          tracerSettings,
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
  }, [rebuildChargeMeshes, updateFieldVisuals, onSelectCharge]);

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
    </div>
  );
};
