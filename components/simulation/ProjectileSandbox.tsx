'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  DragModel,
  LaunchParameters,
  ProjectileParameters,
  PROJECTILE_PRESETS,
  computeTrajectoryRK4,
  verifyKinematicsFormulas,
  TrajectorySummary,
  KinematicFormulaProof,
  SHOT_COLOR_PALETTE,
  SavedProjectileShot,
} from '@/lib/physics/projectile-ballistics';
import {
  Play,
  Pause,
  RotateCcw,
  Wind,
  Activity,
  Zap,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flag,
  Trash2,
  Crosshair,
  Clock,
  Rocket,
  Eye,
  X,
  Compass,
} from 'lucide-react';
import { MathFormula, Var, Vec, Sub, Sup, Dot, BigSum } from '@/components/ui/MathFormula';

export interface ProjectileSandboxControls {
  dragModel: DragModel;
  preset: string;
  speed: number; // m/s
  elevationDeg: number; // degrees (0 - 90)
  azimuthDeg: number; // degrees (0 - 360)
  mass: number; // kg
  gravity: number; // m/s^2
  radius: number; // m
  cd: number; // drag coeff
  airDensity: number; // kg/m^3
  windX: number; // m/s
  windZ: number; // m/s
  showVectors: boolean;
  showFreeBodyDiagram: boolean;
  showComparisonGhost: boolean;
  /**
   * Multiplier in terms of actual physics flight time:
   * e.g. 2.0 means a 2-second calculated flight takes 4.0 seconds of real-time animation (2.0x actual time).
   */
  actualTimeMultiplier: number;
  viewMode: '3d' | 'side' | 'top';
}

export interface ProjectileTelemetry {
  time: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  ax: number;
  ay: number;
  az: number;
  dragForce: number;
  maxRange: number;
  maxHeight: number;
  flightTime: number;
  terminalVelocity: number;
  formulas: KinematicFormulaProof[];
}

interface ProjectileSandboxProps {
  onUpdateTelemetry?: (telem: ProjectileTelemetry) => void;
  onToast?: (msg: string) => void;
  initialControls?: Partial<ProjectileSandboxControls>;
  externalViewMode?: '3d' | '2d';
  onViewModeChange?: (mode: '3d' | '2d') => void;
}

/**
 * Helper to create a 3D billboard text sprite for impact flags
 */
function createFlagLabelSprite(
  shotNumber: number,
  x: number,
  z: number,
  colorHex: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Pill background
    ctx.fillStyle = 'rgba(5, 8, 17, 0.88)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 304, 80, 18);
    ctx.fill();
    ctx.stroke();

    // Shot badge
    ctx.fillStyle = colorHex;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`FLAG #${shotNumber}`, 160, 40);

    // Coordinates
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`(${x.toFixed(1)}m, ${z.toFixed(1)}m)`, 160, 70);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(7.5, 2.25, 1);
  return sprite;
}

/**
 * Helper to build a thick, high-visibility 3D TubeGeometry from trajectory samples
 */
function buildTrajectoryTubeGeometry(
  points: { x: number; y: number; z: number }[],
  radius: number = 0.28
): THREE.BufferGeometry {
  if (points.length < 2) {
    return new THREE.SphereGeometry(radius, 8, 8);
  }
  const vectors: THREE.Vector3[] = [];
  // Subsample cleanly to avoid degenerate zero-length segments
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const v = new THREE.Vector3(p.x, Math.max(0.05, p.y), p.z);
    if (vectors.length === 0 || vectors[vectors.length - 1].distanceToSquared(v) > 0.002) {
      vectors.push(v);
    }
  }
  if (vectors.length < 2) {
    vectors.push(vectors[0].clone().add(new THREE.Vector3(0.1, 0.1, 0)));
  }
  const curve = new THREE.CatmullRomCurve3(vectors);
  const tubularSegments = Math.min(200, Math.max(32, vectors.length * 2));
  return new THREE.TubeGeometry(curve, tubularSegments, radius, 12, false);
}

export const ProjectileSandbox: React.FC<ProjectileSandboxProps> = ({
  onUpdateTelemetry,
  onToast,
  initialControls,
  externalViewMode,
  onViewModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active controls state
  const [controls, setControls] = useState<ProjectileSandboxControls>({
    dragModel: 'quadratic',
    preset: 'cannonball',
    speed: 35.0,
    elevationDeg: 45.0,
    azimuthDeg: 0.0,
    mass: 10.0,
    gravity: 9.81,
    radius: 0.08,
    cd: 0.47,
    airDensity: 1.225,
    windX: 0.0,
    windZ: 0.0,
    showVectors: true,
    showFreeBodyDiagram: true,
    showComparisonGhost: true,
    actualTimeMultiplier: 1.0,
    viewMode: externalViewMode === '2d' ? 'side' : '3d',
    ...initialControls,
  });

  // Effective view mode (synchronize with externalViewMode if supplied)
  const effectiveViewMode = externalViewMode
    ? externalViewMode === '2d'
      ? 'side'
      : '3d'
    : controls.viewMode;

  // Simulation playback & shot memory state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [selectedFormulaIndex, setSelectedFormulaIndex] = useState<number>(0);
  const [repAxis, setRepAxis] = useState<'y' | 'x'>('y');
  const [repTab, setRepTab] = useState<'pos' | 'vel' | 'acc' | 'diagram'>('vel');

  // Saved Projectile Shots & Impact Flags Memory
  const [savedShots, setSavedShots] = useState<SavedProjectileShot[]>([]);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [auditShotId, setAuditShotId] = useState<string>('active');
  const [inspectedFlagShotId, setInspectedFlagShotId] = useState<string | null>(null);
  const [nextShotNumber, setNextShotNumber] = useState<number>(1);
  const nextShotCounterRef = useRef<number>(1);

  // Panel minimize / expand states
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  // Live preview trajectory for current slider settings
  const [liveTrajectories, setLiveTrajectories] = useState<{
    active: TrajectorySummary;
    vacuum: TrajectorySummary;
  } | null>(null);

  // Three.js runtime references
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    raycaster: THREE.Raycaster;
    ballMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;
    cannonPivot: THREE.Group;
    barrelPivot: THREE.Group;
    previewTubeMesh: THREE.Mesh;
    vacuumGhostTubeMesh: THREE.Mesh;
    savedShotsGroup: THREE.Group;
    flagHitMeshes: Map<string, THREE.Object3D>;
    selectedFlagRing: THREE.Mesh;
    velVectorArrow: THREE.ArrowHelper;
    vxVectorArrow: THREE.ArrowHelper;
    vyVectorArrow: THREE.ArrowHelper;
    accVectorArrow: THREE.ArrowHelper;
    fgVectorArrow: THREE.ArrowHelper;
    dragVectorArrow: THREE.ArrowHelper;
    apexMarker: THREE.Group;
  } | null>(null);

  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const savedShotsRef = useRef<SavedProjectileShot[]>(savedShots);
  useEffect(() => {
    savedShotsRef.current = savedShots;
  }, [savedShots]);

  // Compute trajectory for given controls
  const computeTrajectoriesForControls = useCallback((c: ProjectileSandboxControls) => {
    // Launch directly from the origin (0, 0, 0) of the plane!
    const launch: LaunchParameters = {
      x0: 0,
      y0: 0,
      z0: 0,
      speed: c.speed,
      elevationDeg: c.elevationDeg,
      azimuthDeg: c.azimuthDeg,
      wind: { x: c.windX, y: 0, z: c.windZ },
    };

    const projectile: ProjectileParameters = {
      mass: c.mass,
      radius: c.radius,
      dragCoefficient: c.cd,
      airDensity: c.airDensity,
      gravity: c.gravity,
      stokesB: 0.65,
    };

    const activeTraj = computeTrajectoryRK4(launch, projectile, c.dragModel, 0.005);
    const vacuumTraj = computeTrajectoryRK4(launch, projectile, 'vacuum', 0.005);

    return { launch, projectile, activeTraj, vacuumTraj };
  }, []);

  // Add a 3D trajectory tube and clickable 3D flag at impact point for a saved shot
  const addShotToThreeScene = useCallback((shot: SavedProjectileShot) => {
    const state = threeRef.current;
    if (!state) return;

    const shotContainer = new THREE.Group();
    shotContainer.name = `shot_${shot.id}`;

    // 1. Thick 3D Trajectory Tube in the projectile's allocated color
    const tubeGeo = buildTrajectoryTubeGeometry(shot.summary.points, 0.28);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: shot.colorThree,
      emissive: shot.colorThree,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.3,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.castShadow = true;
    shotContainer.add(tubeMesh);

    // 2. Impact Flag Group at the exact landing coordinates (landing.x, 0, landing.z)
    const flagGroup = new THREE.Group();
    flagGroup.position.set(shot.summary.landing.x, 0, shot.summary.landing.z);
    flagGroup.userData = { shotId: shot.id };

    // Glowing impact ground ring
    const ringGeo = new THREE.RingGeometry(0.9, 1.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: shot.colorThree,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    ringMesh.userData = { shotId: shot.id };
    flagGroup.add(ringMesh);

    // Flagpole pedestal base
    const baseGeo = new THREE.CylinderGeometry(0.45, 0.6, 0.3, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: shot.colorThree,
      emissive: shot.colorThree,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.15;
    baseMesh.userData = { shotId: shot.id };
    flagGroup.add(baseMesh);

    // Tall Flagpole
    const poleHeight = 5.2;
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, poleHeight, 12);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.85,
      roughness: 0.2,
    });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.y = poleHeight / 2;
    poleMesh.castShadow = true;
    poleMesh.userData = { shotId: shot.id };
    flagGroup.add(poleMesh);

    // Colored Flag Pennant Banner
    const pennantGeo = new THREE.BoxGeometry(2.6, 1.45, 0.14);
    const pennantMat = new THREE.MeshStandardMaterial({
      color: shot.colorThree,
      emissive: shot.colorThree,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.2,
    });
    const pennantMesh = new THREE.Mesh(pennantGeo, pennantMat);
    pennantMesh.position.set(1.3, poleHeight - 0.8, 0);
    pennantMesh.castShadow = true;
    pennantMesh.userData = { shotId: shot.id };
    flagGroup.add(pennantMesh);

    // Top finial sphere
    const topBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16),
      new THREE.MeshStandardMaterial({
        color: shot.colorThree,
        emissive: shot.colorThree,
        emissiveIntensity: 0.6,
      })
    );
    topBall.position.y = poleHeight + 0.15;
    topBall.userData = { shotId: shot.id };
    flagGroup.add(topBall);

    // Floating Coordinate & Shot # Label Sprite above flag
    const labelSprite = createFlagLabelSprite(
      shot.shotNumber,
      shot.summary.landing.x,
      shot.summary.landing.z,
      shot.colorHex
    );
    labelSprite.position.set(0, poleHeight + 1.6, 0);
    labelSprite.userData = { shotId: shot.id };
    flagGroup.add(labelSprite);

    // Invisible generous collider cylinder so clicking the flag is effortless at any zoom level
    const hitGeo = new THREE.CylinderGeometry(2.4, 2.4, poleHeight + 2.5, 12);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.y = (poleHeight + 2.5) / 2;
    hitMesh.userData = { shotId: shot.id };
    flagGroup.add(hitMesh);

    state.flagHitMeshes.set(shot.id, flagGroup);
    shotContainer.add(flagGroup);
    state.savedShotsGroup.add(shotContainer);
  }, []);

  // Remove a saved shot and its flag from the 3D scene
  const removeShotFromThreeScene = useCallback((shotId: string) => {
    const state = threeRef.current;
    if (!state) return;

    const existing = state.savedShotsGroup.getObjectByName(`shot_${shotId}`);
    if (existing) {
      existing.traverse(obj => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
      state.savedShotsGroup.remove(existing);
    }
    state.flagHitMeshes.delete(shotId);
  }, []);

  // Launch and record a new projectile with its own allocated color and impact flag
  const handleLaunchNewProjectile = useCallback(
    (customControls?: ProjectileSandboxControls, silent?: boolean) => {
      const c = customControls || controlsRef.current;
      const { launch, projectile, activeTraj, vacuumTraj } = computeTrajectoriesForControls(c);

      const shotNum = nextShotCounterRef.current++;
      const paletteEntry = SHOT_COLOR_PALETTE[(shotNum - 1) % SHOT_COLOR_PALETTE.length];

      const newShot: SavedProjectileShot = {
        id: `shot_${shotNum}_${Date.now()}`,
        shotNumber: shotNum,
        colorName: paletteEntry.name,
        colorHex: paletteEntry.hex,
        colorThree: paletteEntry.threeHex,
        presetName: PROJECTILE_PRESETS[c.preset]?.name || 'Custom Projectile',
        dragModel: c.dragModel,
        launch,
        projectile,
        summary: activeTraj,
      };

      addShotToThreeScene(newShot);

      // Update ball color to match the newly launched projectile
      const state = threeRef.current;
      if (state) {
        const ballMat = state.ballMesh.material as THREE.MeshStandardMaterial;
        ballMat.color.setHex(paletteEntry.threeHex);
        ballMat.emissive.setHex(paletteEntry.threeHex);
        ballMat.emissiveIntensity = 0.45;
      }

      setSavedShots(prev => [...prev, newShot]);
      setNextShotNumber(nextShotCounterRef.current);
      setActiveShotId(newShot.id);
      setAuditShotId(newShot.id);
      setInspectedFlagShotId(newShot.id);
      setLiveTrajectories({ active: activeTraj, vacuum: vacuumTraj });
      setSimTime(0);
      setIsPlaying(true);

      if (!silent && onToast) {
        onToast(
          `Launched Shot #${shotNum} (${paletteEntry.name}) → Impact Flag placed at (${activeTraj.landing.x.toFixed(1)}m, ${activeTraj.landing.z.toFixed(1)}m)`
        );
      }
    },
    [computeTrajectoriesForControls, addShotToThreeScene, onToast]
  );

  // Delete a specific projectile and its impact flag
  const handleDeleteShot = useCallback(
    (shotId: string) => {
      const targetShot = savedShotsRef.current.find(s => s.id === shotId);
      removeShotFromThreeScene(shotId);

      setSavedShots(prev => {
        const remaining = prev.filter(s => s.id !== shotId);
        if (activeShotId === shotId) {
          setActiveShotId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }
        if (inspectedFlagShotId === shotId) {
          setInspectedFlagShotId(null);
        }
        return remaining;
      });

      setAuditShotId(prev => (prev === shotId ? 'active' : prev));

      if (targetShot && onToast) {
        onToast(`Deleted Shot #${targetShot.shotNumber} (${targetShot.colorName}) and its impact flag`);
      }
    },
    [activeShotId, inspectedFlagShotId, removeShotFromThreeScene, onToast]
  );

  // Clear all saved shots and flags
  const handleClearAllShots = useCallback(() => {
    savedShotsRef.current.forEach(s => removeShotFromThreeScene(s.id));
    setSavedShots([]);
    setActiveShotId(null);
    setAuditShotId('active');
    setInspectedFlagShotId(null);
    if (onToast) {
      onToast('Cleared all projectile traces and impact flags');
    }
  }, [removeShotFromThreeScene, onToast]);

  // Update Three.js live preview tube & cannon orientation
  const updatePreviewAndCannonGeometry = useCallback(
    (trajData: { activeTraj: TrajectorySummary; vacuumTraj: TrajectorySummary }) => {
      const state = threeRef.current;
      if (!state) return;

      const { activeTraj, vacuumTraj } = trajData;
      const nextColor =
        SHOT_COLOR_PALETTE[
          (nextShotCounterRef.current - 1) % SHOT_COLOR_PALETTE.length
        ];

      // Thick Live Aiming Preview Tube
      state.previewTubeMesh.geometry.dispose();
      state.previewTubeMesh.geometry = buildTrajectoryTubeGeometry(activeTraj.points, 0.22);
      const previewMat = state.previewTubeMesh.material as THREE.MeshStandardMaterial;
      previewMat.color.setHex(nextColor.threeHex);
      previewMat.emissive.setHex(nextColor.threeHex);

      // Thick Vacuum Ghost Comparison Tube
      state.vacuumGhostTubeMesh.geometry.dispose();
      state.vacuumGhostTubeMesh.geometry = buildTrajectoryTubeGeometry(vacuumTraj.points, 0.16);
      state.vacuumGhostTubeMesh.visible =
        controlsRef.current.showComparisonGhost && controlsRef.current.dragModel !== 'vacuum';

      // Apex Marker Position
      state.apexMarker.position.set(
        activeTraj.apex.x,
        activeTraj.apex.y,
        activeTraj.apex.z
      );

      // Cannon Barrel Pitch & Full 360° Azimuth Yaw around the origin (0, 0, 0)
      const elevRad = (controlsRef.current.elevationDeg * Math.PI) / 180;
      const azimRad = (controlsRef.current.azimuthDeg * Math.PI) / 180;
      state.cannonPivot.rotation.y = -azimRad;
      state.barrelPivot.rotation.z = elevRad - Math.PI / 2;
    },
    []
  );

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.0028);

    // 2. Cameras
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1200);
    camera.position.set(-28, 32, 78);

    const orthoAspect = width / height;
    const orthoSize = 65;
    const orthoCamera = new THREE.OrthographicCamera(
      -orthoSize * orthoAspect,
      orthoSize * orthoAspect,
      orthoSize,
      -orthoSize,
      0.1,
      1200
    );
    orthoCamera.position.set(0, 25, 120);
    orthoCamera.lookAt(0, 15, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls centered near the origin
    const controlsObj = new OrbitControls(camera, canvas);
    controlsObj.enableDamping = true;
    controlsObj.dampingFactor = 0.05;
    controlsObj.maxPolarAngle = Math.PI / 2 - 0.015;
    controlsObj.minDistance = 6;
    controlsObj.maxDistance = 500;
    controlsObj.target.set(25, 8, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdcfce7, 2.2);
    dirLight.position.set(40, 90, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 350;
    const shadowD = 140;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    fillLight.position.set(-50, 30, -50);
    scene.add(fillLight);

    // 6. Firing Range Ground Plane Centered at Origin (0, 0, 0)
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.85,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, 0);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Metric Grid Helper Centered at Origin (0, 0, 0)
    const gridHelper = new THREE.GridHelper(400, 80, 0x10b981, 0x1e293b);
    gridHelper.position.set(0, 0.01, 0);
    scene.add(gridHelper);

    // Origin (0, 0, 0) Coordinate Crosshair Axes & Launch Pad Ring
    const axesGroup = new THREE.Group();
    const xAxisGeo = new THREE.BoxGeometry(400, 0.04, 0.18);
    const xAxisMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 });
    const xAxisMesh = new THREE.Mesh(xAxisGeo, xAxisMat);
    xAxisMesh.position.set(0, 0.02, 0);
    axesGroup.add(xAxisMesh);

    const zAxisGeo = new THREE.BoxGeometry(0.18, 0.04, 400);
    const zAxisMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
    const zAxisMesh = new THREE.Mesh(zAxisGeo, zAxisMat);
    zAxisMesh.position.set(0, 0.02, 0);
    axesGroup.add(zAxisMesh);

    const originPadRing = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.2, 36),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    originPadRing.rotation.x = -Math.PI / 2;
    originPadRing.position.set(0, 0.03, 0);
    axesGroup.add(originPadRing);
    scene.add(axesGroup);

    // 7. 3D Cannon Artillery Launcher at Origin (0, 0, 0)
    const cannonPivot = new THREE.Group();
    cannonPivot.position.set(0, 0, 0);

    // Base Carriage
    const carriage = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.6, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.75 })
    );
    carriage.position.y = 0.3;
    carriage.castShadow = true;
    cannonPivot.add(carriage);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.9,
    });
    [-0.95, 0.95].forEach(wz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.3, 20), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.65, wz);
      wheel.castShadow = true;
      cannonPivot.add(wheel);
    });

    // Elevated Barrel pivoted at origin
    const barrelPivot = new THREE.Group();
    barrelPivot.position.set(0, 0.65, 0);

    const barrelGeo = new THREE.CylinderGeometry(0.32, 0.46, 2.8, 24);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.2,
    });
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.position.y = 1.1;
    barrelMesh.castShadow = true;

    const muzzleRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9, roughness: 0.25 })
    );
    muzzleRing.position.y = 1.3;
    barrelMesh.add(muzzleRing);

    barrelPivot.add(barrelMesh);
    cannonPivot.add(barrelPivot);
    scene.add(cannonPivot);

    // 8. Flying Projectile Sphere
    const ballGeo = new THREE.SphereGeometry(0.6, 28, 28);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.2,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // Ground Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(0.65, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.04;
    scene.add(shadowMesh);

    // 9. Thick 3D Trajectory Tubes (Preview, Vacuum Ghost, and Saved Shots Group)
    const previewTubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.55,
      roughness: 0.3,
    });
    const previewTubeMesh = new THREE.Mesh(new THREE.BufferGeometry(), previewTubeMat);
    scene.add(previewTubeMesh);

    const vacuumGhostMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.32,
      wireframe: false,
    });
    const vacuumGhostTubeMesh = new THREE.Mesh(new THREE.BufferGeometry(), vacuumGhostMat);
    scene.add(vacuumGhostTubeMesh);

    const savedShotsGroup = new THREE.Group();
    scene.add(savedShotsGroup);

    // Selection Highlight Ring for Clicked Impact Flag
    const selectedFlagRing = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.25, 36),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
      })
    );
    selectedFlagRing.rotation.x = -Math.PI / 2;
    selectedFlagRing.position.y = 0.05;
    selectedFlagRing.visible = false;
    scene.add(selectedFlagRing);

    // 10. 3D Kinematic & Free-Body Diagram Vector Arrows on the Projectile
    // Total Velocity v (Emerald)
    const velVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4.0,
      0x10b981,
      0.9,
      0.45
    );
    scene.add(velVectorArrow);

    // Horizontal Velocity Component v_xz (Sky Blue)
    const vxVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      3.0,
      0x38bdf8,
      0.7,
      0.35
    );
    scene.add(vxVectorArrow);

    // Vertical Velocity Component v_y (Cyan)
    const vyVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      3.0,
      0x22d3ee,
      0.7,
      0.35
    );
    scene.add(vyVectorArrow);

    // Net Acceleration Vector a (Rose)
    const accVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 0),
      3.0,
      0xf43f5e,
      0.75,
      0.38
    );
    scene.add(accVectorArrow);

    // Gravity Force Vector F_g (Purple)
    const fgVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 0),
      3.0,
      0xa855f7,
      0.7,
      0.35
    );
    scene.add(fgVectorArrow);

    // Aerodynamic Drag Force Vector F_drag (Amber)
    const dragVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0xf59e0b,
      0.7,
      0.35
    );
    scene.add(dragVectorArrow);

    // 11. Apex Marker
    const apexMarker = new THREE.Group();
    const apexCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.3, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    apexCone.rotation.z = Math.PI;
    apexMarker.add(apexCone);
    scene.add(apexMarker);

    threeRef.current = {
      scene,
      camera,
      orthoCamera,
      renderer,
      controls: controlsObj,
      raycaster: new THREE.Raycaster(),
      ballMesh,
      shadowMesh,
      cannonPivot,
      barrelPivot,
      previewTubeMesh,
      vacuumGhostTubeMesh,
      savedShotsGroup,
      flagHitMeshes: new Map(),
      selectedFlagRing,
      velVectorArrow,
      vxVectorArrow,
      vyVectorArrow,
      accVectorArrow,
      fgVectorArrow,
      dragVectorArrow,
      apexMarker,
    };

    // Launch initial Shot #1 (Sky Blue) automatically so the user sees a thick trace and blue flag immediately
    const timer = setTimeout(() => {
      handleLaunchNewProjectile(controlsRef.current, true);
    }, 0);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const aspect = w / h;
      orthoCamera.left = -orthoSize * aspect;
      orthoCamera.right = orthoSize * aspect;
      orthoCamera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controlsObj.update();

      const activeCamera =
        controlsRef.current.viewMode === 'top'
          ? orthoCamera
          : camera;

      renderer.render(scene, activeCamera);
    };

    animate();

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      ballGeo.dispose();
      ballMat.dispose();
    };
  }, [handleLaunchNewProjectile]);

  // Determine which trajectory is currently being animated/audited
  const activeShot = savedShots.find(s => s.id === activeShotId) || null;
  const activeSummary = activeShot?.summary ?? liveTrajectories?.active ?? null;
  const activeLaunchParams: LaunchParameters = useMemo(
    () =>
      activeShot?.launch ?? {
        x0: 0,
        y0: 0,
        z0: 0,
        speed: controls.speed,
        elevationDeg: controls.elevationDeg,
        azimuthDeg: controls.azimuthDeg,
        wind: { x: controls.windX, y: 0, z: controls.windZ },
      },
    [
      activeShot,
      controls.speed,
      controls.elevationDeg,
      controls.azimuthDeg,
      controls.windX,
      controls.windZ,
    ]
  );
  const activeMass = activeShot?.projectile.mass ?? controls.mass;
  const activeGravity = activeShot?.projectile.gravity ?? controls.gravity;

  // Handle camera view modes (3D Perspective vs 2D Orthogonal Parabolic Elevation vs 2D Top)
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    if (effectiveViewMode === 'side') {
      // 2D View: Position camera at a 90° vantage point relative to the selected projectile's motion plane
      const targetShot =
        savedShots.find(s => s.id === auditShotId) ||
        savedShots.find(s => s.id === activeShotId) ||
        savedShots[savedShots.length - 1];
      const targetAzimuth = targetShot ? targetShot.launch.azimuthDeg : controls.azimuthDeg;
      const targetSummary = targetShot
        ? targetShot.summary
        : activeSummary || liveTrajectories?.active;

      const phiRad = (targetAzimuth * Math.PI) / 180;
      const normalAngle = ((targetAzimuth + 90) * Math.PI) / 180;
      const R = Math.max(12, targetSummary?.maxRange || 40);
      const H = Math.max(5, targetSummary?.maxHeight || 15);
      const midX = R * 0.5 * Math.cos(phiRad);
      const midZ = R * 0.5 * Math.sin(phiRad);
      const midY = Math.max(2, H * 0.5);
      const distance = Math.max(45, R * 1.35, H * 2.2);

      const camX = midX + Math.cos(normalAngle) * distance;
      const camY = Math.max(midY, 4);
      const camZ = midZ + Math.sin(normalAngle) * distance;

      state.camera.position.set(camX, camY, camZ);
      state.camera.lookAt(midX, midY, midZ);
      state.controls.object = state.camera;
      state.controls.enableRotate = false; // Lock 2D perspective so projectile appears as a true upright 2D parabola
      state.controls.target.set(midX, midY, midZ);
    } else if (effectiveViewMode === 'top') {
      state.orthoCamera.position.set(0, 140, 0);
      state.orthoCamera.lookAt(0, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
      state.controls.target.set(0, 0, 0);
    } else {
      state.camera.position.set(-28, 32, 78);
      state.controls.object = state.camera;
      state.controls.enableRotate = true;
      state.controls.target.set(25, 8, 0);
    }
    state.controls.update();
  }, [
    effectiveViewMode,
    controls.azimuthDeg,
    auditShotId,
    activeShotId,
    savedShots,
    activeSummary,
    liveTrajectories,
  ]);

  // Highlight selected flag ring in 3D scene
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;
    const inspected = savedShots.find(s => s.id === inspectedFlagShotId);
    if (inspected) {
      state.selectedFlagRing.visible = true;
      state.selectedFlagRing.position.set(
        inspected.summary.landing.x,
        0.05,
        inspected.summary.landing.z
      );
    } else {
      state.selectedFlagRing.visible = false;
    }
  }, [inspectedFlagShotId, savedShots]);

  // Recompute live aiming preview whenever physics sliders change
  useEffect(() => {
    const { activeTraj, vacuumTraj } = computeTrajectoriesForControls(controls);
    updatePreviewAndCannonGeometry({ activeTraj, vacuumTraj });
    const timer = setTimeout(() => {
      setLiveTrajectories({ active: activeTraj, vacuum: vacuumTraj });
    }, 0);
    return () => clearTimeout(timer);
  }, [
    controls,
    computeTrajectoriesForControls,
    updatePreviewAndCannonGeometry,
  ]);

  // Projectile Flight Time Simulation Loop & Kinematic Vector Position
  useEffect(() => {
    if (!activeSummary) return;

    const maxT = Math.max(0.01, activeSummary.flightTime);
    let animId: number;
    let lastClock = performance.now();

    const updateThreeBallAndVectors = (timeVal: number) => {
      const pts = activeSummary.points;
      let pIdx = Math.floor((timeVal / maxT) * (pts.length - 1));
      pIdx = Math.min(Math.max(0, pIdx), pts.length - 1);
      const sample = pts[pIdx];

      const state = threeRef.current;
      if (state && sample) {
        // Update Ball Position
        state.ballMesh.position.set(sample.x, Math.max(0.3, sample.y), sample.z);
        state.shadowMesh.position.set(sample.x, 0.04, sample.z);
        const shadowScale = Math.max(0.25, 1.2 - sample.y * 0.025);
        state.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);

        // Update Dynamic 3D Vectors
        if (controlsRef.current.showVectors) {
          const pos = new THREE.Vector3(sample.x, Math.max(0.3, sample.y), sample.z);

          // 1. Total Velocity Vector (Emerald)
          state.velVectorArrow.visible = sample.speed > 0.05;
          if (sample.speed > 0.05) {
            const vLen = Math.min(11, Math.max(1.5, sample.speed * 0.18));
            const vDir = new THREE.Vector3(sample.vx, sample.vy, sample.vz).normalize();
            state.velVectorArrow.position.copy(pos);
            state.velVectorArrow.setDirection(vDir);
            state.velVectorArrow.setLength(vLen, 0.8, 0.4);
          }

          // 2. Horizontal Velocity Component v_xz (Sky Blue)
          const vHoriz = Math.hypot(sample.vx, sample.vz);
          state.vxVectorArrow.visible = vHoriz > 0.05;
          if (vHoriz > 0.05) {
            const vhLen = Math.min(9, Math.max(1.2, vHoriz * 0.18));
            const vhDir = new THREE.Vector3(sample.vx, 0, sample.vz).normalize();
            state.vxVectorArrow.position.copy(pos);
            state.vxVectorArrow.setDirection(vhDir);
            state.vxVectorArrow.setLength(vhLen, 0.65, 0.32);
          }

          // 3. Vertical Velocity Component v_y (Cyan)
          state.vyVectorArrow.visible = Math.abs(sample.vy) > 0.05;
          if (Math.abs(sample.vy) > 0.05) {
            const vyLen = Math.min(9, Math.max(1.2, Math.abs(sample.vy) * 0.18));
            const vyDir = new THREE.Vector3(0, Math.sign(sample.vy), 0);
            state.vyVectorArrow.position.copy(pos);
            state.vyVectorArrow.setDirection(vyDir);
            state.vyVectorArrow.setLength(vyLen, 0.65, 0.32);
          }

          // 4. Gravity Force Vector F_g (Purple)
          state.fgVectorArrow.visible = true;
          const fgLen = Math.min(7, Math.max(1.5, activeGravity * 0.25));
          state.fgVectorArrow.position.copy(pos);
          state.fgVectorArrow.setDirection(new THREE.Vector3(0, -1, 0));
          state.fgVectorArrow.setLength(fgLen, 0.65, 0.32);

          // 5. Drag Force Vector F_drag (Amber)
          const dMag = Math.hypot(sample.dragFx, sample.dragFy, sample.dragFz);
          const dragAccel = dMag / Math.max(0.005, activeMass);
          state.dragVectorArrow.visible =
            activeSummary.dragModel !== 'vacuum' && dragAccel > 0.05;
          if (state.dragVectorArrow.visible) {
            const dLen = Math.min(8, Math.max(1.2, dragAccel * 0.25));
            const dDir = new THREE.Vector3(
              sample.dragFx,
              sample.dragFy,
              sample.dragFz
            ).normalize();
            state.dragVectorArrow.position.copy(pos);
            state.dragVectorArrow.setDirection(dDir);
            state.dragVectorArrow.setLength(dLen, 0.65, 0.32);
          }

          // 6. Net Acceleration Vector a (Rose)
          const aMag = Math.hypot(sample.ax, sample.ay, sample.az);
          state.accVectorArrow.visible = aMag > 0.05;
          if (aMag > 0.05) {
            const aLen = Math.min(8, Math.max(1.4, aMag * 0.22));
            const aDir = new THREE.Vector3(sample.ax, sample.ay, sample.az).normalize();
            state.accVectorArrow.position.copy(pos);
            state.accVectorArrow.setDirection(aDir);
            state.accVectorArrow.setLength(aLen, 0.7, 0.35);
          }
        } else {
          state.velVectorArrow.visible = false;
          state.vxVectorArrow.visible = false;
          state.vyVectorArrow.visible = false;
          state.accVectorArrow.visible = false;
          state.fgVectorArrow.visible = false;
          state.dragVectorArrow.visible = false;
        }

        // Evaluate the 5 Kinematics formulas from screenshot
        const verifiedFormulas = verifyKinematicsFormulas(
          activeSummary,
          pIdx,
          activeLaunchParams
        );

        if (onUpdateTelemetry) {
          onUpdateTelemetry({
            time: sample.time,
            x: sample.x,
            y: sample.y,
            z: sample.z,
            vx: sample.vx,
            vy: sample.vy,
            vz: sample.vz,
            speed: sample.speed,
            ax: sample.ax,
            ay: sample.ay,
            az: sample.az,
            dragForce: Math.hypot(sample.dragFx, sample.dragFy, sample.dragFz),
            maxRange: activeSummary.maxRange,
            maxHeight: activeSummary.maxHeight,
            flightTime: activeSummary.flightTime,
            terminalVelocity: activeSummary.terminalVelocity,
            formulas: verifiedFormulas,
          });
        }
      }
    };

    if (!isPlaying) {
      updateThreeBallAndVectors(simTime);
      return;
    }

    const flightLoop = () => {
      animId = requestAnimationFrame(flightLoop);
      const now = performance.now();
      const wallDt = (now - lastClock) * 0.001;
      lastClock = now;

      // actualTimeMultiplier: e.g. 2.0x actual time means a 2s physics flight takes 4s of real-time animation!
      const multiplier = Math.max(0.1, controlsRef.current.actualTimeMultiplier);
      const simDt = wallDt / multiplier;

      setSimTime(prevT => {
        let nextT = prevT + simDt;
        if (nextT > maxT) {
          nextT = 0;
        }
        updateThreeBallAndVectors(nextT);
        return nextT;
      });
    };

    animId = requestAnimationFrame(flightLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    isPlaying,
    activeSummary,
    activeLaunchParams,
    activeMass,
    activeGravity,
    simTime,
    onUpdateTelemetry,
  ]);

  // Handle clicking on impact flags in the 3D scene
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const activeCamera =
      controls.viewMode === 'side' || controls.viewMode === 'top'
        ? state.orthoCamera
        : state.camera;

    state.raycaster.setFromCamera(mouse, activeCamera);

    const flagObjects: THREE.Object3D[] = [];
    state.flagHitMeshes.forEach(group => {
      flagObjects.push(group);
    });

    const hits = state.raycaster.intersectObjects(flagObjects, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.shotId) {
        obj = obj.parent;
      }
      const clickedShotId = obj?.userData?.shotId;
      if (clickedShotId) {
        setInspectedFlagShotId(clickedShotId);
        setActiveShotId(clickedShotId);
        const foundShot = savedShots.find(s => s.id === clickedShotId);
        if (foundShot) {
          const ballMat = state.ballMesh.material as THREE.MeshStandardMaterial;
          ballMat.color.setHex(foundShot.colorThree);
          ballMat.emissive.setHex(foundShot.colorThree);
          onToast?.(
            `Inspecting Flag #${foundShot.shotNumber} (${foundShot.colorName}) at (${foundShot.summary.landing.x.toFixed(2)}m, ${foundShot.summary.landing.z.toFixed(2)}m)`
          );
        }
      }
    }
  };

  // Determine which projectile motion is audited in the Formula Verification Station
  const auditedShot = savedShots.find(s => s.id === auditShotId) || null;
  const auditedSummary = auditedShot?.summary ?? activeSummary;
  const auditedLaunchParams = auditedShot?.launch ?? activeLaunchParams;

  // Current sample & formula verification proofs for chosen projectile
  const currentSampleIdx = auditedSummary
    ? Math.min(
        auditedSummary.points.length - 1,
        Math.floor(
          (simTime / Math.max(0.001, auditedSummary.flightTime)) *
            auditedSummary.points.length
        )
      )
    : 0;

  const currentFormulaProofs = auditedSummary
    ? verifyKinematicsFormulas(auditedSummary, currentSampleIdx, auditedLaunchParams)
    : [];

  const currentPoint =
    auditedSummary?.points[currentSampleIdx] ?? auditedSummary?.points[0];

  const inspectedShot = savedShots.find(s => s.id === inspectedFlagShotId) || null;
  const nextShotColor =
    SHOT_COLOR_PALETTE[(nextShotNumber - 1) % SHOT_COLOR_PALETTE.length];

  // Free Body Diagram force & velocity values at current instant
  const fgMagnitude = activeMass * activeGravity;
  const dragFx = currentPoint?.dragFx ?? 0;
  const dragFy = currentPoint?.dragFy ?? 0;
  const dragFz = currentPoint?.dragFz ?? 0;
  const dragMagnitude = Math.hypot(dragFx, dragFy, dragFz);
  const dragHoriz = Math.hypot(dragFx, dragFz) * (dragFx < 0 ? -1 : 1);
  const netFx = dragFx;
  const netFy = -fgMagnitude + dragFy;
  const netFz = dragFz;
  const netForceMagnitude = Math.hypot(netFx, netFy, netFz);

  const currVx = currentPoint?.vx ?? 0;
  const currVy = currentPoint?.vy ?? 0;
  const currVz = currentPoint?.vz ?? 0;
  const currVHoriz = Math.hypot(currVx, currVz);
  const currSpeed = currentPoint?.speed ?? 0;

  // SVG vector scaling for real-time 2D Free Body Diagram & Velocity Decomposition
  const maxForceScale = Math.max(fgMagnitude, dragMagnitude, netForceMagnitude, 1);
  const fgSvgLen = Math.min(44, Math.max(12, (fgMagnitude / maxForceScale) * 42));
  const dragSvgX =
    dragMagnitude > 0.01
      ? Math.max(-44, Math.min(44, (dragHoriz / maxForceScale) * 42))
      : 0;
  const dragSvgY =
    dragMagnitude > 0.01
      ? Math.max(-44, Math.min(44, (-dragFy / maxForceScale) * 42))
      : 0;
  const netSvgX = Math.max(-44, Math.min(44, (netFx / maxForceScale) * 42));
  const netSvgY = Math.max(-44, Math.min(44, (-netFy / maxForceScale) * 42));

  const maxVelScale = Math.max(activeLaunchParams.speed, currSpeed, 1);
  const vxSvgLen = Math.max(-44, Math.min(44, (currVHoriz / maxVelScale) * 42));
  const vySvgLen = Math.max(-44, Math.min(44, (-currVy / maxVelScale) * 42));

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* ========================================================================= */}
      {/* FLOATING LEFT CONTROL POD: LAUNCHER, MASS, GRAVITY, SPEED & MEMORY        */}
      {/* ========================================================================= */}
      <div
        className={`absolute top-20 left-4 z-20 ${
          isLeftPanelCollapsed ? 'w-64' : 'w-84 max-h-[calc(100vh-6.5rem)] overflow-y-auto'
        } bg-[#071511]/92 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 flex flex-col space-y-3.5 shadow-2xl text-slate-100 transition-all duration-200`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Origin Launcher &amp; Ballistics
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded-lg border border-emerald-500/30">
              (0, 0, 0)
            </span>
            <button
              onClick={() => setIsLeftPanelCollapsed(prev => !prev)}
              className="text-[11px] text-slate-400 hover:text-white font-mono px-1 py-0.5 rounded hover:bg-white/10 transition"
              title={isLeftPanelCollapsed ? 'Expand Launcher Controls' : 'Minimize Launcher Controls'}
            >
              {isLeftPanelCollapsed ? 'Expand' : 'Minimize'}
            </button>
          </div>
        </div>

        {!isLeftPanelCollapsed && (
          <>
            {/* PRIMARY ACTION: FIRE NEW PROJECTILE WITH ALLOCATED COLOR & IMPACT FLAG */}
            <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/30 space-y-2.5">
          <button
            onClick={() => handleLaunchNewProjectile()}
            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-slate-950 shadow-lg transition flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99]"
            style={{ backgroundColor: nextShotColor.hex }}
          >
            <Rocket className="w-4 h-4" />
            <span>
              Launch Projectile #{nextShotNumber} ({nextShotColor.name})
            </span>
          </button>

          {/* Saved Projectiles & Impact Flags Memory Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>IMPACT FLAGS IN MEMORY ({savedShots.length}):</span>
              {savedShots.length > 0 && (
                <button
                  onClick={handleClearAllShots}
                  className="text-rose-400 hover:text-rose-300 underline"
                >
                  Clear All
                </button>
              )}
            </div>
            {savedShots.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic py-1">
                Click Launch above to fire a projectile and plant an impact flag.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {savedShots.map(shot => {
                  const isSelected = inspectedFlagShotId === shot.id;
                  return (
                    <div
                      key={shot.id}
                      onClick={() => {
                        setInspectedFlagShotId(shot.id);
                        setActiveShotId(shot.id);
                        const state = threeRef.current;
                        if (state) {
                          const ballMat = state.ballMesh
                            .material as THREE.MeshStandardMaterial;
                          ballMat.color.setHex(shot.colorThree);
                          ballMat.emissive.setHex(shot.colorThree);
                        }
                      }}
                      className={`cursor-pointer px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border transition ${
                        isSelected
                          ? 'bg-white/15 border-white text-white font-bold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: shot.colorHex }}
                      />
                      <span>#{shot.shotNumber}</span>
                      <span className="text-slate-400">
                        ({shot.summary.landing.x.toFixed(0)}m,{' '}
                        {shot.summary.landing.z.toFixed(0)}m)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Aerodynamic Drag Model Selector */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">Aerodynamic Regime</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {controls.dragModel === 'vacuum'
                ? 'Ideal AP Kinematics'
                : controls.dragModel === 'linear'
                ? 'Stokes F = -bv'
                : 'Newtonian F = -cv²'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px] font-semibold">
            <button
              onClick={() => {
                setControls(prev => ({ ...prev, dragModel: 'vacuum' }));
                onToast?.('Switched to Ideal Vacuum Kinematics (Formulas 1-3 hold)');
              }}
              className={`py-1.5 rounded-lg transition ${
                controls.dragModel === 'vacuum'
                  ? 'bg-sky-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vacuum
            </button>
            <button
              onClick={() => {
                setControls(prev => ({ ...prev, dragModel: 'linear' }));
                onToast?.('Switched to Linear Stokes Drag (F = -bv)');
              }}
              className={`py-1.5 rounded-lg transition ${
                controls.dragModel === 'linear'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => {
                setControls(prev => ({ ...prev, dragModel: 'quadratic' }));
                onToast?.('Switched to Quadratic Aerodynamic Drag (F = -cv²)');
              }}
              className={`py-1.5 rounded-lg transition ${
                controls.dragModel === 'quadratic'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quadratic
            </button>
          </div>
        </div>

        {/* Projectile Preset & Mass / Gravity Controls */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Projectile Preset</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Cd = {controls.cd.toFixed(2)}
              </span>
            </div>
            <select
              value={controls.preset}
              onChange={e => {
                const pKey = e.target.value;
                const p = PROJECTILE_PRESETS[pKey];
                if (p) {
                  setControls(prev => ({
                    ...prev,
                    preset: pKey,
                    mass: p.mass,
                    radius: p.radius,
                    cd: p.cd,
                  }));
                  onToast?.(`Selected ${p.name} (m = ${p.mass} kg)`);
                }
              }}
              className="w-full bg-[#050811] border border-white/10 text-slate-200 text-xs rounded-xl p-2 focus:border-emerald-400 focus:outline-none"
            >
              {Object.entries(PROJECTILE_PRESETS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.name} (m={item.mass}kg, Cd={item.cd})
                </option>
              ))}
            </select>
          </div>

          {/* Projectile Mass (m) Control */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-slate-300">
              <span>Projectile Mass (m):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.005"
                  max="100"
                  step="0.1"
                  value={controls.mass}
                  onChange={e => {
                    const val = Math.max(0.005, parseFloat(e.target.value) || 0.005);
                    setControls(prev => ({ ...prev, mass: val }));
                  }}
                  className="w-16 px-1.5 py-0.5 bg-black/60 border border-white/15 rounded text-right font-mono text-emerald-300 font-bold text-xs"
                />
                <span className="font-mono text-[10px] text-slate-400">kg</span>
              </div>
            </div>
            <input
              type="range"
              min="0.05"
              max="50"
              step="0.05"
              value={Math.min(50, controls.mass)}
              onChange={e =>
                setControls(prev => ({ ...prev, mass: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between gap-1 text-[10px] font-mono">
              {[0.05, 0.145, 1.0, 10.0, 25.0].map(mVal => (
                <button
                  key={mVal}
                  onClick={() => setControls(prev => ({ ...prev, mass: mVal }))}
                  className={`flex-1 py-0.5 rounded ${
                    Math.abs(controls.mass - mVal) < 0.001
                      ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {mVal}kg
                </button>
              ))}
            </div>
          </div>

          {/* Gravity (g) Control */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-slate-300">
              <span>Gravity (g):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.01"
                  value={controls.gravity}
                  onChange={e => {
                    const val = Math.max(0.5, parseFloat(e.target.value) || 9.81);
                    setControls(prev => ({ ...prev, gravity: val }));
                  }}
                  className="w-16 px-1.5 py-0.5 bg-black/60 border border-white/15 rounded text-right font-mono text-purple-300 font-bold text-xs"
                />
                <span className="font-mono text-[10px] text-slate-400">m/s²</span>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="25"
              step="0.05"
              value={controls.gravity}
              onChange={e =>
                setControls(prev => ({ ...prev, gravity: parseFloat(e.target.value) }))
              }
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
              {[
                { label: 'AP 10.0', g: 10.0 },
                { label: 'Earth 9.81', g: 9.81 },
                { label: 'Earth 9.8', g: 9.8 },
                { label: 'Moon 1.62', g: 1.62 },
                { label: 'Mars 3.72', g: 3.72 },
              ].map(planet => (
                <button
                  key={planet.label}
                  onClick={() => setControls(prev => ({ ...prev, gravity: planet.g }))}
                  className={`py-0.5 px-1 rounded truncate ${
                    Math.abs(controls.gravity - planet.g) < 0.03
                      ? 'bg-purple-500/30 text-purple-200 font-bold border border-purple-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                  title={
                    planet.g === 10.0
                      ? 'AP Physics C Exam Standard Approximation: g ≈ 10 m/s² (LO 1.3.A.3)'
                      : `Set g = ${planet.g} m/s²`
                  }
                >
                  {planet.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Launch Velocity, Elevation & Full 360° Azimuth Controls */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Muzzle Velocity (v₀):</span>
              <span className="font-mono text-emerald-300 font-bold">
                {controls.speed.toFixed(1)} m/s ({(controls.speed * 3.6).toFixed(0)} km/h)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={controls.speed}
              onChange={e =>
                setControls(prev => ({ ...prev, speed: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Launch Elevation Angle (θ):</span>
              <span className="font-mono text-emerald-300 font-bold">
                {controls.elevationDeg.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="89"
              step="0.5"
              value={controls.elevationDeg}
              onChange={e =>
                setControls(prev => ({
                  ...prev,
                  elevationDeg: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between gap-1 text-[10px] font-mono">
              {[15, 30, 45, 60, 75].map(ang => (
                <button
                  key={ang}
                  onClick={() => setControls(prev => ({ ...prev, elevationDeg: ang }))}
                  className={`flex-1 py-0.5 rounded ${
                    controls.elevationDeg === ang
                      ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {ang}°
                </button>
              ))}
            </div>
          </div>

          {/* Full 360° Azimuth Rotation */}
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="flex justify-between text-slate-300">
              <span>Azimuth Angle (φ 360° Rotation):</span>
              <span className="font-mono text-sky-300 font-bold">
                {controls.azimuthDeg.toFixed(0)}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={controls.azimuthDeg}
              onChange={e =>
                setControls(prev => ({
                  ...prev,
                  azimuthDeg: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
              {[
                { label: '0° (+X)', deg: 0 },
                { label: '90° (+Z)', deg: 90 },
                { label: '180° (-X)', deg: 180 },
                { label: '270° (-Z)', deg: 270 },
                { label: '360°', deg: 360 },
              ].map(az => (
                <button
                  key={az.label}
                  onClick={() => setControls(prev => ({ ...prev, azimuthDeg: az.deg }))}
                  className={`py-0.5 rounded ${
                    controls.azimuthDeg === az.deg
                      ? 'bg-sky-500/30 text-sky-300 font-bold border border-sky-500/40'
                      : 'bg-white/5 hover:bg-white/10 text-slate-400'
                  }`}
                >
                  {az.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Simulation Animation Duration Speed (in terms of Actual Time) */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Animation Duration Scale</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">
              {controls.actualTimeMultiplier.toFixed(1)}x actual time
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-snug">
            Does not alter trajectory physics. Scales animation duration:{' '}
            <strong className="text-slate-200">
              {(activeSummary?.flightTime ?? 0).toFixed(2)}s
            </strong>{' '}
            calculated flight plays over{' '}
            <strong className="text-amber-300">
              {((activeSummary?.flightTime ?? 0) * controls.actualTimeMultiplier).toFixed(
                2
              )}
              s
            </strong>
            .
          </p>
          <input
            type="range"
            min="0.25"
            max="8.0"
            step="0.25"
            value={controls.actualTimeMultiplier}
            onChange={e =>
              setControls(prev => ({
                ...prev,
                actualTimeMultiplier: parseFloat(e.target.value),
              }))
            }
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="grid grid-cols-5 gap-1 text-[10px] font-mono">
            {[0.5, 1.0, 2.0, 4.0, 8.0].map(mult => (
              <button
                key={mult}
                onClick={() =>
                  setControls(prev => ({ ...prev, actualTimeMultiplier: mult }))
                }
                className={`py-1 rounded ${
                  Math.abs(controls.actualTimeMultiplier - mult) < 0.05
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {mult.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>

        {/* 3D Atmospheric Wind Conditions */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Atmospheric Wind Vector</span>
            </span>
            <span className="text-[10px] text-sky-400 font-mono">
              {controls.windX >= 0 ? '+' : ''}
              {controls.windX}m/s X · {controls.windZ >= 0 ? '+' : ''}
              {controls.windZ}m/s Z
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Wind X:</span>
              <span className="font-mono text-white">{controls.windX} m/s</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={controls.windX}
              onChange={e =>
                setControls(prev => ({ ...prev, windX: parseFloat(e.target.value) }))
              }
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Crosswind Z:</span>
              <span className="font-mono text-white">{controls.windZ} m/s</span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={controls.windZ}
              onChange={e =>
                setControls(prev => ({ ...prev, windZ: parseFloat(e.target.value) }))
              }
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Visual Toggles */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <span className="font-bold text-white text-[11px]">Visualization Rig</span>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Real-Time Free-Body Diagram</span>
            <input
              type="checkbox"
              checked={controls.showFreeBodyDiagram}
              onChange={e =>
                setControls(prev => ({ ...prev, showFreeBodyDiagram: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">3D Force &amp; Velocity Vectors</span>
            <input
              type="checkbox"
              checked={controls.showVectors}
              onChange={e =>
                setControls(prev => ({ ...prev, showVectors: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Show Vacuum Ghost Tube</span>
            <input
              type="checkbox"
              checked={controls.showComparisonGhost}
              onChange={e =>
                setControls(prev => ({ ...prev, showComparisonGhost: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-sky-400"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300">Camera View Mode</span>
            <div className="flex gap-1 text-[10px]">
              {(['3d', 'side'] as const).map(vm => (
                <button
                  key={vm}
                  onClick={() => {
                    setControls(prev => ({ ...prev, viewMode: vm }));
                    if (onViewModeChange) {
                      onViewModeChange(vm === 'side' ? '2d' : '3d');
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded font-bold uppercase transition ${
                    (vm === 'side' ? effectiveViewMode !== '3d' : effectiveViewMode === '3d')
                      ? 'bg-emerald-400 text-slate-950 shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {vm === 'side' ? '2D' : '3D'}
                </button>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CLICKED IMPACT FLAG INSPECTOR POPUP CARD (TOP-CENTER OVERLAY)             */}
      {/* ========================================================================= */}
      {inspectedShot && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-96 max-w-[92vw] bg-[#071612]/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border text-xs space-y-3"
          style={{ borderColor: inspectedShot.colorHex }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" style={{ color: inspectedShot.colorHex }} />
              <span className="font-bold text-white">
                Impact Flag #{inspectedShot.shotNumber} ({inspectedShot.colorName})
              </span>
            </div>
            <button
              onClick={() => setInspectedFlagShotId(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close Flag Inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Exact Impact Coordinates */}
          <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1 font-mono">
            <div className="text-[10px] text-slate-400 uppercase">
              Exact Impact Coordinates (Plane Origin 0,0,0)
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-1.5 rounded-lg bg-white/5">
                <div className="text-[9px] text-slate-400">X COORD</div>
                <div className="text-sm font-bold text-white">
                  {inspectedShot.summary.landing.x.toFixed(2)}m
                </div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <div className="text-[9px] text-slate-400">Y ELEV</div>
                <div className="text-sm font-bold text-emerald-300">0.00m</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <div className="text-[9px] text-slate-400">Z COORD</div>
                <div className="text-sm font-bold text-sky-300">
                  {inspectedShot.summary.landing.z.toFixed(2)}m
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1.5 text-[11px] text-slate-300">
              <span>Radial Range from Origin:</span>
              <span className="font-bold text-emerald-300">
                {inspectedShot.summary.maxRange.toFixed(2)} m
              </span>
            </div>
          </div>

          {/* Key Launch Information for this Projectile */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px] bg-[#050811]/80 p-2.5 rounded-xl border border-white/5">
            <div className="flex justify-between">
              <span className="text-slate-400">Launch v₀:</span>
              <span className="text-white font-bold">
                {inspectedShot.launch.speed.toFixed(1)} m/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Angle (θ, φ):</span>
              <span className="text-white font-bold">
                {inspectedShot.launch.elevationDeg}°, {inspectedShot.launch.azimuthDeg}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Mass (m):</span>
              <span className="text-emerald-300 font-bold">
                {inspectedShot.projectile.mass} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gravity (g):</span>
              <span className="text-purple-300 font-bold">
                {inspectedShot.projectile.gravity} m/s²
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Drag Model:</span>
              <span className="text-amber-300 font-bold uppercase">
                {inspectedShot.dragModel}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Flight Time:</span>
              <span className="text-sky-300 font-bold">
                {inspectedShot.summary.flightTime.toFixed(2)} s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Apex Height:</span>
              <span className="text-white font-bold">
                {inspectedShot.summary.maxHeight.toFixed(2)} m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Impact |v|:</span>
              <span className="text-rose-300 font-bold">
                {inspectedShot.summary.landing.speed.toFixed(1)} m/s
              </span>
            </div>
          </div>

          {/* Actions: Replay Flight or Delete Projectile */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setActiveShotId(inspectedShot.id);
                setSimTime(0);
                setIsPlaying(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Replay Flight</span>
            </button>
            <button
              onClick={() => handleDeleteShot(inspectedShot.id)}
              className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Projectile</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING RIGHT PANEL: MERGED AP KINEMATICS AUDITOR & FORMULA STATION      */}
      {/* + REAL-TIME FREE-BODY DIAGRAM & VELOCITY DECOMPOSITION                    */}
      {/* ========================================================================= */}
      <div
        className={`absolute top-20 right-4 z-20 ${
          isRightPanelCollapsed ? 'w-72' : 'w-96 max-h-[calc(100vh-6.5rem)] overflow-y-auto'
        } bg-[#071612]/92 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 flex flex-col space-y-3.5 shadow-2xl text-slate-100 transition-all duration-200`}
      >
        {/* Merged Header: AP Kinematics Auditor & Formula Verification Station */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white tracking-tight">
                Formula Verification Station
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                AP KINEMATICS AUDITOR · 5 EQUATIONS
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
              t = {simTime.toFixed(2)}s
            </span>
            <button
              onClick={() => setIsRightPanelCollapsed(prev => !prev)}
              className="text-[11px] text-slate-400 hover:text-white font-mono px-1.5 py-0.5 rounded hover:bg-white/10 transition"
              title={isRightPanelCollapsed ? 'Expand Formula Station' : 'Minimize Formula Station'}
            >
              {isRightPanelCollapsed ? 'Expand' : 'Minimize'}
            </button>
          </div>
        </div>

        {!isRightPanelCollapsed && (
          <>
            {/* Projectile Choice Selector for Formula Verification Station */}
        {savedShots.length > 0 && (
          <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>EXAMINE PROJECTILE MOTION:</span>
              </span>
              {auditedShot && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{ backgroundColor: `${auditedShot.colorHex}25`, color: auditedShot.colorHex }}
                >
                  #{auditedShot.shotNumber} {auditedShot.colorName}
                </span>
              )}
            </div>
            <select
              value={auditShotId}
              onChange={e => {
                const val = e.target.value;
                setAuditShotId(val);
                if (val !== 'active') {
                  setActiveShotId(val);
                  setInspectedFlagShotId(val);
                  const s = savedShots.find(x => x.id === val);
                  if (s && threeRef.current) {
                    const ballMat = threeRef.current.ballMesh.material as THREE.MeshStandardMaterial;
                    ballMat.color.setHex(s.colorThree);
                    ballMat.emissive.setHex(s.colorThree);
                  }
                }
              }}
              className="w-full bg-[#050811] text-emerald-300 font-mono text-xs border border-emerald-500/40 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="active">
                Active Settings (v₀={controls.speed.toFixed(0)}m/s, θ={controls.elevationDeg.toFixed(0)}°, {controls.dragModel})
              </option>
              {savedShots.map(s => (
                <option key={s.id} value={s.id}>
                  Shot #{s.shotNumber} ({s.colorName}) · R={s.summary.maxRange.toFixed(1)}m · t={s.summary.flightTime.toFixed(2)}s · {s.dragModel}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Merged 5 Kinematic Equations Selector Grid */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Select AP Kinematics Equation to Audit:
          </div>
          <div className="grid grid-cols-5 gap-1 bg-black/50 p-1 rounded-xl border border-white/10 font-mono text-[11px]">
            {currentFormulaProofs.map((f, idx) => {
              const isExact = f.status === 'exact';
              const isCalculus = f.status === 'valid_calculus';
              return (
                <button
                  key={f.formulaNumber}
                  onClick={() => setSelectedFormulaIndex(idx)}
                  className={`py-1.5 px-1 rounded-lg transition flex flex-col items-center justify-center gap-0.5 ${
                    selectedFormulaIndex === idx
                      ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={f.name}
                >
                  <div className="flex items-center gap-1">
                    <span>#{f.formulaNumber}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isExact
                          ? 'bg-sky-400'
                          : isCalculus
                          ? 'bg-emerald-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] truncate max-w-full opacity-85">
                    {f.formulaNumber === 1
                      ? 'v_x(t)'
                      : f.formulaNumber === 2
                      ? 'x(t)'
                      : f.formulaNumber === 3
                      ? 'v_x²'
                      : f.formulaNumber === 4
                      ? '∫v_x dt'
                      : '∫a_x dt'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Formula Detailed Proof Card */}
        {currentFormulaProofs[selectedFormulaIndex] && (
          <div className="p-3 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Equation #{currentFormulaProofs[selectedFormulaIndex].formulaNumber}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  currentFormulaProofs[selectedFormulaIndex].status === 'exact'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : currentFormulaProofs[selectedFormulaIndex].status === 'valid_calculus'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {currentFormulaProofs[selectedFormulaIndex].status === 'exact' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                    <span>Exact (Vacuum)</span>
                  </>
                ) : currentFormulaProofs[selectedFormulaIndex].status === 'valid_calculus' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Exact Calculus Integral</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Invalidated by Drag</span>
                  </>
                )}
              </span>
            </div>

            {/* Big Math Equation Banner in Standard Handwritten Typography */}
            <div className="py-2.5 px-3 bg-[#050811] rounded-xl border border-white/10 text-center flex flex-col items-center justify-center">
              <div className="text-lg font-bold text-white min-h-[36px] flex items-center justify-center">
                <MathFormula
                  rawLatex={currentFormulaProofs[selectedFormulaIndex].latex}
                  fallbackText={currentFormulaProofs[selectedFormulaIndex].latex}
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {currentFormulaProofs[selectedFormulaIndex].name}
              </div>
            </div>

            {/* LHS vs RHS Numerical Audit in Standard Mathematical Notation */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[11px] text-slate-300 font-serif italic truncate">
                  <MathFormula fallbackText={currentFormulaProofs[selectedFormulaIndex].leftHandSideName} />
                </div>
                <div className="text-sm font-bold font-mono text-emerald-300 mt-0.5">
                  {currentFormulaProofs[selectedFormulaIndex].leftHandSideValue.toFixed(3)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[11px] text-slate-300 font-serif italic truncate">
                  <MathFormula fallbackText={currentFormulaProofs[selectedFormulaIndex].rightHandSideName} />
                </div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {currentFormulaProofs[selectedFormulaIndex].rightHandSideValue.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Discrepancy & Percent Error */}
            <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-white/10">
              <span className="text-slate-400">Discrepancy |LHS - RHS|:</span>
              <span
                className={`font-bold ${
                  currentFormulaProofs[selectedFormulaIndex].percentError < 1.0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {currentFormulaProofs[selectedFormulaIndex].discrepancy.toFixed(3)} (
                {currentFormulaProofs[selectedFormulaIndex].percentError.toFixed(2)}% err)
              </span>
            </div>

            {/* Pedagogical Explanation */}
            <p className="text-[11px] text-slate-300 leading-relaxed bg-[#050811]/80 p-2 rounded-xl border border-white/5">
              {currentFormulaProofs[selectedFormulaIndex].explanation}
            </p>
          </div>
        )}

        {/* ===================================================================== */}
        {/* REAL-TIME FREE-BODY DIAGRAM (FBD) & VELOCITY COMPONENTS               */}
        {/* ===================================================================== */}
        {controls.showFreeBodyDiagram && (
          <div className="p-3 rounded-2xl bg-[#050811]/85 border border-emerald-500/30 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-Time Free-Body Diagram</span>
              </span>
              <span className="text-[11px] font-serif text-emerald-400">
                <Var>m</Var> = {activeMass} kg <Dot /> <Var>g</Var> = {activeGravity} m/s²
              </span>
            </div>

            {/* Dual Visual SVG Diagrams: Forces FBD (Left) & Velocity Components (Right) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Diagram 1: Forces Acting on Projectile */}
              <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center">
                <span className="text-[10px] font-mono text-slate-300 font-bold mb-1">
                  FORCES (FBD)
                </span>
                <svg width="120" height="120" viewBox="-60 -60 120 120" className="overflow-visible">
                  {/* Coordinate Crosshair */}
                  <line x1="-52" y1="0" x2="52" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="0" y1="-52" x2="0" y2="52" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />

                  <defs>
                    <marker id="arrow-fg" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#a855f7" />
                    </marker>
                    <marker id="arrow-drag" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
                    </marker>
                    <marker id="arrow-net" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {/* Net Force Vector ΣF */}
                  <line
                    x1="0"
                    y1="0"
                    x2={netSvgX}
                    y2={netSvgY}
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                    markerEnd="url(#arrow-net)"
                  />

                  {/* Gravity Force Vector F_g = mg (Downward) */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={fgSvgLen}
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-fg)"
                  />
                  <text x="6" y={fgSvgLen - 2} fill="#d8b4fe" fontSize="9" fontFamily="monospace">
                    Fg
                  </text>

                  {/* Drag Force Vector F_drag */}
                  {dragMagnitude > 0.05 && (
                    <>
                      <line
                        x1="0"
                        y1="0"
                        x2={dragSvgX}
                        y2={dragSvgY}
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow-drag)"
                      />
                      <text
                        x={dragSvgX < 0 ? dragSvgX - 16 : dragSvgX + 4}
                        y={dragSvgY - 4}
                        fill="#fcd34d"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        Fd
                      </text>
                    </>
                  )}

                  {/* Projectile Center Mass Body */}
                  <circle cx="0" cy="0" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
                <div className="w-full space-y-0.5 font-serif text-[11px] pt-1 border-t border-white/5">
                  <div className="flex justify-between text-purple-300">
                    <span><Var>F</Var><Sub>g</Sub> = <Var>m</Var><Var>g</Var>:</span>
                    <span className="font-mono">{fgMagnitude.toFixed(1)} N ↓</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>|<Vec>F</Vec><Sub>drag</Sub>|:</span>
                    <span className="font-mono">{dragMagnitude.toFixed(1)} N</span>
                  </div>
                  <div className="flex justify-between text-rose-300 font-bold">
                    <span>|<BigSum /><Vec>F</Vec><Sub>net</Sub>|:</span>
                    <span className="font-mono">{netForceMagnitude.toFixed(1)} N</span>
                  </div>
                </div>
              </div>

              {/* Diagram 2: Velocity Components Decomposition */}
              <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex flex-col items-center">
                <span className="text-[10px] font-mono text-slate-300 font-bold mb-1">
                  VELOCITY (Vx, Vy)
                </span>
                <svg width="120" height="120" viewBox="-60 -60 120 120" className="overflow-visible">
                  {/* Coordinate Crosshair */}
                  <line x1="-52" y1="0" x2="52" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="0" y1="-52" x2="0" y2="52" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />

                  <defs>
                    <marker id="arrow-v" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
                    </marker>
                    <marker id="arrow-vx" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
                    </marker>
                    <marker id="arrow-vy" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee" />
                    </marker>
                  </defs>

                  {/* Projection Box Dashed Lines */}
                  <line
                    x1={vxSvgLen}
                    y1="0"
                    x2={vxSvgLen}
                    y2={vySvgLen}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1="0"
                    y1={vySvgLen}
                    x2={vxSvgLen}
                    y2={vySvgLen}
                    stroke="#475569"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  {/* Horizontal Velocity Component v_x */}
                  {Math.abs(vxSvgLen) > 2 && (
                    <>
                      <line
                        x1="0"
                        y1="0"
                        x2={vxSvgLen}
                        y2="0"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow-vx)"
                      />
                      <text x={vxSvgLen / 2 - 6} y="12" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
                        Vx
                      </text>
                    </>
                  )}

                  {/* Vertical Velocity Component v_y */}
                  {Math.abs(vySvgLen) > 2 && (
                    <>
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={vySvgLen}
                        stroke="#22d3ee"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow-vy)"
                      />
                      <text x="-18" y={vySvgLen / 2} fill="#67e8f9" fontSize="9" fontFamily="monospace">
                        Vy
                      </text>
                    </>
                  )}

                  {/* Resultant Total Velocity Vector v */}
                  {currSpeed > 0.1 && (
                    <>
                      <line
                        x1="0"
                        y1="0"
                        x2={vxSvgLen}
                        y2={vySvgLen}
                        stroke="#10b981"
                        strokeWidth="2.5"
                        markerEnd="url(#arrow-v)"
                      />
                      <text
                        x={vxSvgLen + 4}
                        y={vySvgLen - 4}
                        fill="#6ee7b7"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        v
                      </text>
                    </>
                  )}

                  {/* Projectile Center Mass Body */}
                  <circle cx="0" cy="0" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
                <div className="w-full space-y-0.5 font-serif text-[11px] pt-1 border-t border-white/5">
                  <div className="flex justify-between text-sky-300">
                    <span><Var>v</Var><Sub>x</Sub>:</span>
                    <span className="font-mono">{currVx.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between text-cyan-300">
                    <span><Var>v</Var><Sub>y</Sub>:</span>
                    <span className="font-mono">{currVy.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between text-emerald-300 font-bold">
                    <span>|<Vec>v</Vec>|:</span>
                    <span className="font-mono">{currSpeed.toFixed(1)} m/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instantaneous Position & Acceleration Readout */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instantaneous Telemetry</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeShot ? `SHOT #${activeShot.shotNumber}` : 'LIVE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 text-[10px]">Position (X, Y, Z)</span>
              <div className="text-white font-bold">
                ({currentPoint?.x.toFixed(1)}m, {currentPoint?.y.toFixed(1)}m,{' '}
                {currentPoint?.z.toFixed(1)}m)
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">Velocity Vz (Cross)</span>
              <div className="text-sky-300 font-bold">{currVz.toFixed(2)} m/s</div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">Accel (Ax, Ay, Az)</span>
              <div className="text-rose-300">
                ({currentPoint?.ax.toFixed(1)}, {currentPoint?.ay.toFixed(1)},{' '}
                {currentPoint?.az.toFixed(1)}) m/s²
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">Terminal Speed v_t</span>
              <div className="text-amber-300 font-bold">
                {isFinite(activeSummary?.terminalVelocity ?? Infinity)
                  ? `${activeSummary?.terminalVelocity.toFixed(1)} m/s`
                  : '∞ (Vacuum)'}
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TOPIC 1.3 REPRESENTING MOTION: GRAPHS (TANGENT SLOPE & AREA UNDER     */}
        {/* CURVE), STROBOSCOPIC MOTION DIAGRAM & NARRATIVE DESCRIPTION           */}
        {/* ===================================================================== */}
        {auditedSummary && auditedSummary.points.length > 1 && (() => {
          const pts = auditedSummary.points;
          const totalT = Math.max(0.05, auditedSummary.flightTime);
          const curPt = currentPoint || pts[0];
          const curT = curPt.time;

          // Axis selection: 'y' (Vertical Motion) or 'x' (Horizontal Motion)
          const isY = repAxis === 'y';
          const posVal = isY ? curPt.y : curPt.x;
          const velVal = isY ? curPt.vy : curPt.vx;
          const accVal = isY ? curPt.ay : curPt.ax;
          const v0Val = isY ? pts[0].vy : pts[0].vx;
          const deltaPos = posVal - (isY ? pts[0].y : pts[0].x);
          const deltaVel = velVal - v0Val;

          // SVG Graph Geometry (280 x 130)
          const gW = 280;
          const gH = 130;
          const padL = 32;
          const padR = 12;
          const padT = 14;
          const padB = 20;
          const plotW = gW - padL - padR;
          const plotH = gH - padT - padB;

          const toGX = (tVal: number) => padL + Math.min(1, Math.max(0, tVal / totalT)) * plotW;

          // Narrative Description Generator (LO 1.3.A.1)
          const apexT = auditedSummary.apex.time;
          const phaseDesc =
            curT < 0.05
              ? 'Initial Launch (t ≈ 0s): Object leaves the origin with maximum initial speed.'
              : Math.abs(curT - apexT) < 0.12
              ? 'Turning Point / Apex: Vertical velocity v_y passes through zero while downward gravitational acceleration remains non-zero.'
              : curPt.vy > 0
              ? 'Ascent Phase (v_y > 0, a_y < 0): Velocity and vertical acceleration have opposite signs, so vertical speed decreases.'
              : 'Descent Phase (v_y < 0, a_y < 0): Velocity and vertical acceleration have the same downward sign, so vertical speed increases.';

          return (
            <div className="p-3 rounded-2xl bg-[#050811]/90 border border-emerald-500/35 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-white">
                    Topic 1.3 Motion Representations
                  </span>
                </div>
                <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
                  <button
                    onClick={() => setRepAxis('y')}
                    className={`px-2 py-0.5 rounded transition ${
                      repAxis === 'y'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vertical (y)
                  </button>
                  <button
                    onClick={() => setRepAxis('x')}
                    className={`px-2 py-0.5 rounded transition ${
                      repAxis === 'x'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Horiz (x)
                  </button>
                </div>
              </div>

              {/* Representation Mode Tabs */}
              <div className="grid grid-cols-4 gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
                <button
                  onClick={() => setRepTab('pos')}
                  className={`py-1 rounded-lg transition ${
                    repTab === 'pos'
                      ? 'bg-emerald-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isY ? 'y(t) Slope' : 'x(t) Slope'}
                </button>
                <button
                  onClick={() => setRepTab('vel')}
                  className={`py-1 rounded-lg transition ${
                    repTab === 'vel'
                      ? 'bg-sky-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isY ? 'v_y(t) Area' : 'v_x(t) Area'}
                </button>
                <button
                  onClick={() => setRepTab('acc')}
                  className={`py-1 rounded-lg transition ${
                    repTab === 'acc'
                      ? 'bg-rose-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isY ? 'a_y(t) Area' : 'a_x(t) Area'}
                </button>
                <button
                  onClick={() => setRepTab('diagram')}
                  className={`py-1 rounded-lg transition ${
                    repTab === 'diagram'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Strobe Dots
                </button>
              </div>

              {/* Graph / Stroboscopic Diagram Canvas */}
              {repTab !== 'diagram' ? (() => {
                const values = pts.map(p =>
                  repTab === 'pos'
                    ? isY
                      ? p.y
                      : p.x
                    : repTab === 'vel'
                    ? isY
                      ? p.vy
                      : p.vx
                    : isY
                    ? p.ay
                    : p.ax
                );
                const minV = Math.min(0, ...values);
                const maxV = Math.max(0.1, ...values);
                const spanV = Math.max(1e-3, maxV - minV);
                const toGY = (v: number) => padT + plotH - ((v - minV) / spanV) * plotH;
                const zeroY = toGY(0);

                // Downsample points for smooth SVG path
                const step = Math.max(1, Math.floor(pts.length / 60));
                const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
                const polyPoints = sampled
                  .map(p => {
                    const v =
                      repTab === 'pos'
                        ? isY
                          ? p.y
                          : p.x
                        : repTab === 'vel'
                        ? isY
                          ? p.vy
                          : p.vx
                        : isY
                        ? p.ay
                        : p.ax;
                    return `${toGX(p.time).toFixed(1)},${toGY(v).toFixed(1)}`;
                  })
                  .join(' ');

                // Shaded integral area polygon from t = 0 to current time t (for v(t) and a(t), LO 1.3.A.4.iii & iv)
                const activeSampled = sampled.filter(p => p.time <= curT + 0.01);
                const areaPolygon =
                  activeSampled.length > 0
                    ? `${toGX(0).toFixed(1)},${zeroY.toFixed(1)} ` +
                      activeSampled
                        .map(p => {
                          const v =
                            repTab === 'vel'
                              ? isY
                                ? p.vy
                                : p.vx
                              : isY
                              ? p.ay
                              : p.ax;
                          return `${toGX(p.time).toFixed(1)},${toGY(v).toFixed(1)}`;
                        })
                        .join(' ') +
                      ` ${toGX(curT).toFixed(1)},${zeroY.toFixed(1)}`
                    : '';

                // Instantaneous point & tangent line (LO 1.3.A.4.i & ii)
                const curVal =
                  repTab === 'pos' ? posVal : repTab === 'vel' ? velVal : accVal;
                const curDeriv =
                  repTab === 'pos' ? velVal : repTab === 'vel' ? accVal : 0;
                const cx = toGX(curT);
                const cy = toGY(curVal);
                const dtSpan = totalT * 0.18;
                const t1 = Math.max(0, curT - dtSpan);
                const t2 = Math.min(totalT, curT + dtSpan);
                const tanY1 = toGY(curVal + curDeriv * (t1 - curT));
                const tanY2 = toGY(curVal + curDeriv * (t2 - curT));

                return (
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-xl bg-black/60 border border-white/10">
                      <svg viewBox={`0 0 ${gW} ${gH}`} className="w-full h-32 overflow-visible">
                        {/* Zero horizontal axis */}
                        <line
                          x1={padL}
                          y1={zeroY}
                          x2={gW - padR}
                          y2={zeroY}
                          stroke="#475569"
                          strokeWidth="1"
                          strokeDasharray="3 2"
                        />
                        {/* Vertical axis */}
                        <line
                          x1={padL}
                          y1={padT}
                          x2={padL}
                          y2={gH - padB}
                          stroke="#64748b"
                          strokeWidth="1.2"
                        />

                        {/* Shaded Area Under Curve for Velocity or Acceleration (LO 1.3.A.4.iii & iv) */}
                        {(repTab === 'vel' || repTab === 'acc') && areaPolygon && (
                          <polygon
                            points={areaPolygon}
                            fill={
                              repTab === 'vel'
                                ? 'rgba(56, 189, 248, 0.25)'
                                : 'rgba(244, 63, 94, 0.25)'
                            }
                          />
                        )}

                        {/* Function Curve */}
                        <polyline
                          fill="none"
                          stroke={
                            repTab === 'pos'
                              ? '#10b981'
                              : repTab === 'vel'
                              ? '#38bdf8'
                              : '#f43f5e'
                          }
                          strokeWidth="2.2"
                          points={polyPoints}
                        />

                        {/* Tangent Line Showing Instantaneous Rate of Change (LO 1.3.A.4.i & ii) */}
                        {(repTab === 'pos' || repTab === 'vel') && (
                          <line
                            x1={toGX(t1)}
                            y1={Math.max(padT, Math.min(gH - padB, tanY1))}
                            x2={toGX(t2)}
                            y2={Math.max(padT, Math.min(gH - padB, tanY2))}
                            stroke="#facc15"
                            strokeWidth="2"
                          />
                        )}

                        {/* Current Time Point */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#facc15"
                          stroke="#050811"
                          strokeWidth="1.5"
                        />

                        {/* Axis Labels */}
                        <text x="4" y={padT + 6} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                          {maxV.toFixed(1)}
                        </text>
                        <text x="4" y={gH - padB} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                          {minV.toFixed(1)}
                        </text>
                        <text
                          x={gW - padR}
                          y={gH - 4}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          t ({totalT.toFixed(1)}s)
                        </text>
                      </svg>
                    </div>

                    {/* Calculus & Graphical Interpretation Readout (LO 1.3.A.4.i - iv) */}
                    <div className="p-2 rounded-xl bg-black/50 border border-white/5 font-mono text-[10px] space-y-1">
                      {repTab === 'pos' && (
                        <>
                          <div className="flex justify-between text-amber-300 font-bold">
                            <span>Tangent Slope d{repAxis}/dt = v_{repAxis}(t) [1.3.A.4.i]:</span>
                            <span>{velVal.toFixed(2)} m/s</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Instantaneous Position {repAxis}(t):</span>
                            <span className="text-emerald-300">{posVal.toFixed(2)} m</span>
                          </div>
                        </>
                      )}
                      {repTab === 'vel' && (
                        <>
                          <div className="flex justify-between text-amber-300 font-bold">
                            <span>Tangent Slope dv_{repAxis}/dt = a_{repAxis}(t) [1.3.A.4.ii]:</span>
                            <span>{accVal.toFixed(2)} m/s²</span>
                          </div>
                          <div className="flex justify-between text-sky-300 font-bold">
                            <span>Shaded Area ∫v_{repAxis} dt = Δ{repAxis} [1.3.A.4.iii]:</span>
                            <span>{deltaPos.toFixed(2)} m</span>
                          </div>
                        </>
                      )}
                      {repTab === 'acc' && (
                        <>
                          <div className="flex justify-between text-rose-300 font-bold">
                            <span>Shaded Area ∫a_{repAxis} dt = Δv_{repAxis} [1.3.A.4.iv]:</span>
                            <span>{deltaVel.toFixed(2)} m/s</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Instantaneous Accel a_{repAxis}(t):</span>
                            <span className="text-white">{accVal.toFixed(2)} m/s²</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })() : (() => {
                // Stroboscopic Motion Diagram (Equal Δt Snapshots with v and a vectors, LO 1.3.A.1)
                const numDots = 9;
                const maxX = Math.max(10, auditedSummary.maxRange);
                const maxY = Math.max(5, auditedSummary.maxHeight * 1.25);
                const strobeSamples = Array.from({ length: numDots }).map((_, idx) => {
                  const pIdx = Math.min(
                    pts.length - 1,
                    Math.floor((idx / (numDots - 1)) * (pts.length - 1))
                  );
                  return pts[pIdx];
                });

                return (
                  <div className="space-y-1.5">
                    <div className="p-2 rounded-xl bg-black/60 border border-white/10">
                      <svg viewBox="0 0 280 120" className="w-full h-28 overflow-visible">
                        <line x1="16" y1="104" x2="268" y2="104" stroke="#334155" strokeWidth="1.2" />
                        {strobeSamples.map((sp, idx) => {
                          const rHoriz = Math.hypot(sp.x, sp.z);
                          const sx = 20 + (rHoriz / maxX) * 236;
                          const sy = 102 - (Math.max(0, sp.y) / maxY) * 82;
                          const vxLen = (Math.hypot(sp.vx, sp.vz) / Math.max(1, activeLaunchParams.speed)) * 18;
                          const vyLen = (-sp.vy / Math.max(1, activeLaunchParams.speed)) * 18;
                          return (
                            <g key={idx}>
                              {/* Velocity Vector at Equal Δt Snapshot */}
                              <line
                                x1={sx}
                                y1={sy}
                                x2={sx + vxLen}
                                y2={sy + vyLen}
                                stroke="#10b981"
                                strokeWidth="1.6"
                              />
                              {/* Downward Acceleration Vector at Snapshot */}
                              <line
                                x1={sx}
                                y1={sy}
                                x2={sx}
                                y2={sy + 12}
                                stroke="#f43f5e"
                                strokeWidth="1.4"
                              />
                              <circle cx={sx} cy={sy} r="3.2" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
                            </g>
                          );
                        })}
                      </svg>
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 pt-1">
                        <span>Equal Δt = {(totalT / 8).toFixed(2)}s snapshots</span>
                        <span className="text-emerald-400">Green: v⃗ · Red: a⃗</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Narrative Motion Description (LO 1.3.A.1) */}
              <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/25 text-[10px] text-slate-200 leading-relaxed">
                <span className="font-bold text-emerald-300 uppercase font-mono mr-1">
                  Narrative (1.3.A.1):
                </span>
                {phaseDesc}
              </div>
            </div>
          );
        })()}
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM CENTER PLAYBACK, SCRUBBER & SPEED BAR                              */}
      {/* ========================================================================= */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[92vw] max-w-2xl bg-[#071612]/92 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-2.5 px-4 shadow-2xl flex items-center gap-3 text-xs font-mono">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-sans font-bold transition flex items-center gap-1.5 shrink-0"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={() => setSimTime(0)}
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 transition shrink-0"
          title="Restart Flight at Origin (0,0,0)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="0"
          max={activeSummary?.flightTime ?? 10}
          step="0.01"
          value={simTime}
          onChange={e => {
            setIsPlaying(false);
            setSimTime(parseFloat(e.target.value));
          }}
          className="w-full accent-emerald-400 cursor-pointer"
        />

        <span className="text-emerald-300 font-bold shrink-0 text-[11px]">
          {simTime.toFixed(2)}s / {(activeSummary?.flightTime ?? 0).toFixed(2)}s
        </span>

        <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-3 shrink-0">
          <span className="text-[10px] text-amber-300">
            {controls.actualTimeMultiplier.toFixed(1)}x actual time
          </span>
        </div>
      </div>
    </div>
  );
};
