'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from '@/lib/physics/projectile-ballistics';
import {
  Play,
  Pause,
  RotateCcw,
  Target,
  Wind,
  Layers,
  Activity,
  Compass,
  Zap,
  Gauge,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';

export interface ProjectileSandboxControls {
  dragModel: DragModel;
  preset: string;
  speed: number; // m/s
  elevationDeg: number; // degrees (0 - 90)
  azimuthDeg: number; // degrees (0 - 360)
  mass: number; // kg
  radius: number; // m
  cd: number; // drag coeff
  airDensity: number; // kg/m^3
  windX: number; // m/s
  windZ: number; // m/s
  showVectors: boolean;
  showComparisonGhost: boolean;
  showIntegralCurves: boolean;
  timeScale: number; // 0.1x to 2.0x
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
}

export const ProjectileSandbox: React.FC<ProjectileSandboxProps> = ({
  onUpdateTelemetry,
  onToast,
  initialControls,
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
    radius: 0.08,
    cd: 0.47,
    airDensity: 1.225,
    windX: 0.0,
    windZ: 0.0,
    showVectors: true,
    showComparisonGhost: true,
    showIntegralCurves: true,
    timeScale: 1.0,
    viewMode: '3d',
    ...initialControls,
  });

  // Simulation execution state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'formulas' | 'parameters' | 'graphs'>('formulas');
  const [selectedFormulaIndex, setSelectedFormulaIndex] = useState<number>(0);
  const [targetDistance, setTargetDistance] = useState<number>(85.0);

  // Physics trajectory cache
  const [trajectories, setTrajectories] = useState<{
    active: TrajectorySummary;
    vacuum?: TrajectorySummary;
    stokes?: TrajectorySummary;
  } | null>(null);

  // Three.js runtime references
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    ballMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;
    cannonPivot: THREE.Group;
    barrelMesh: THREE.Mesh;
    targetMesh: THREE.Group;
    trajectoryLine: THREE.Line;
    vacuumGhostLine: THREE.Line;
    stokesGhostLine: THREE.Line;
    velVectorArrow: THREE.ArrowHelper;
    accVectorArrow: THREE.ArrowHelper;
    dragVectorArrow: THREE.ArrowHelper;
    apexMarker: THREE.Group;
    landingMarker: THREE.Group;
    gridHelper: THREE.GridHelper;
  } | null>(null);

  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // Recalculate trajectories when physics parameters change
  const recomputePhysicsTrajectories = useCallback(() => {
    const c = controlsRef.current;
    const launch: LaunchParameters = {
      x0: 0,
      y0: 1.5, // cannon height above ground
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
      gravity: 9.81,
      stokesB: 0.65,
    };

    const activeTraj = computeTrajectoryRK4(launch, projectile, c.dragModel, 0.005);
    const vacuumTraj = computeTrajectoryRK4(
      launch,
      projectile,
      'vacuum',
      0.005
    );
    const stokesTraj = computeTrajectoryRK4(
      launch,
      projectile,
      'linear',
      0.005
    );

    setTrajectories({
      active: activeTraj,
      vacuum: vacuumTraj,
      stokes: stokesTraj,
    });

    return { activeTraj, vacuumTraj, stokesTraj };
  }, []);

  // Update visual Three.js trajectory lines
  const updateThreeTrajectoryGeometry = useCallback(
    (trajData: {
      activeTraj: TrajectorySummary;
      vacuumTraj: TrajectorySummary;
      stokesTraj: TrajectorySummary;
    }) => {
      const state = threeRef.current;
      if (!state) return;

      const { activeTraj, vacuumTraj, stokesTraj } = trajData;

      // Active Trajectory Line
      const activePts = activeTraj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      state.trajectoryLine.geometry.dispose();
      state.trajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(activePts);

      // Vacuum Ghost Reference Line
      const vacPts = vacuumTraj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      state.vacuumGhostLine.geometry.dispose();
      state.vacuumGhostLine.geometry = new THREE.BufferGeometry().setFromPoints(vacPts);
      state.vacuumGhostLine.visible =
        controlsRef.current.showComparisonGhost && controlsRef.current.dragModel !== 'vacuum';

      // Stokes Ghost Line
      const stokesPts = stokesTraj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      state.stokesGhostLine.geometry.dispose();
      state.stokesGhostLine.geometry = new THREE.BufferGeometry().setFromPoints(stokesPts);
      state.stokesGhostLine.visible =
        controlsRef.current.showComparisonGhost && controlsRef.current.dragModel === 'quadratic';

      // Apex Marker Position
      state.apexMarker.position.set(
        activeTraj.apex.x,
        activeTraj.apex.y,
        activeTraj.apex.z
      );

      // Landing Marker Position
      state.landingMarker.position.set(
        activeTraj.landing.x,
        0.02,
        activeTraj.landing.z
      );

      // Cannon Barrel Pitch & Yaw
      const elevRad = (controlsRef.current.elevationDeg * Math.PI) / 180;
      const azimRad = (controlsRef.current.azimuthDeg * Math.PI) / 180;
      state.cannonPivot.rotation.y = -azimRad;
      state.barrelMesh.rotation.z = elevRad - Math.PI / 2;
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
    scene.fog = new THREE.FogExp2(0x050811, 0.007);

    // 2. Cameras
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    camera.position.set(25, 20, 65);

    const orthoAspect = width / height;
    const orthoSize = 40;
    const orthoCamera = new THREE.OrthographicCamera(
      -orthoSize * orthoAspect,
      orthoSize * orthoAspect,
      orthoSize,
      -orthoSize,
      0.1,
      1000
    );
    orthoCamera.position.set(50, 20, 0);
    orthoCamera.lookAt(50, 10, 0);

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

    // 4. OrbitControls
    const controlsObj = new OrbitControls(camera, canvas);
    controlsObj.enableDamping = true;
    controlsObj.dampingFactor = 0.05;
    controlsObj.maxPolarAngle = Math.PI / 2 - 0.02; // prevent dipping below ground
    controlsObj.minDistance = 5;
    controlsObj.maxDistance = 350;
    controlsObj.target.set(35, 8, 0);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdcfce7, 2.2);
    dirLight.position.set(40, 70, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 250;
    const shadowD = 90;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // 6. Firing Range Ground Plane & Grid
    const groundGeo = new THREE.PlaneGeometry(500, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.85,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(100, 0, 0);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Metric Grid Helper
    const gridHelper = new THREE.GridHelper(300, 60, 0x10b981, 0x1e293b);
    gridHelper.position.set(100, 0.01, 0);
    scene.add(gridHelper);

    // Range Distance Flags / Markers along the firing range
    const createDistanceMarker = (distance: number) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(distance, 0, 0);

      // Post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
      );
      post.position.y = 1.5;
      markerGroup.add(post);

      // Flag pennant
      const flagGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 3.0, 0,
        1.5, 2.5, 0,
        0, 2.0, 0,
      ]);
      flagGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const flagMat = new THREE.MeshBasicMaterial({
        color: distance % 50 === 0 ? 0x10b981 : 0x38bdf8,
        side: THREE.DoubleSide,
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      markerGroup.add(flag);

      // Distance Ground Ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.0, 24),
        new THREE.MeshBasicMaterial({
          color: distance % 50 === 0 ? 0x10b981 : 0x334155,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      markerGroup.add(ring);

      scene.add(markerGroup);
    };

    [25, 50, 75, 100, 125, 150, 175, 200].forEach(d => createDistanceMarker(d));

    // 7. Interactive Target Bullseye
    const targetGroup = new THREE.Group();
    const bullseyeRings = [
      { r: 2.5, color: 0xe2e8f0 }, // outer white
      { r: 2.0, color: 0x0284c7 }, // blue
      { r: 1.5, color: 0xe11d48 }, // red
      { r: 1.0, color: 0xfacc15 }, // yellow
      { r: 0.4, color: 0xf87171 }, // center bullseye
    ];
    bullseyeRings.forEach(br => {
      const ringMesh = new THREE.Mesh(
        new THREE.CircleGeometry(br.r, 32),
        new THREE.MeshBasicMaterial({ color: br.color, side: THREE.DoubleSide })
      );
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.03 + br.r * 0.001;
      targetGroup.add(ringMesh);
    });
    targetGroup.position.set(85, 0, 0);
    scene.add(targetGroup);

    // 8. 3D Cannon Artillery Launcher
    const cannonPivot = new THREE.Group();
    cannonPivot.position.set(0, 0, 0);

    // Base Carriage
    const carriage = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.7 })
    );
    carriage.position.y = 0.4;
    carriage.castShadow = true;
    cannonPivot.add(carriage);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.9,
    });
    [-1.1, 1.1].forEach(wz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.35, 20), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0, 0.8, wz);
      wheel.castShadow = true;
      cannonPivot.add(wheel);
    });

    // Elevated Barrel
    const barrelPivot = new THREE.Group();
    barrelPivot.position.set(0, 1.5, 0);

    const barrelGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 24);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.2,
    });
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.position.y = 1.4;
    barrelMesh.castShadow = true;

    // Muzzle ring
    const muzzleRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24),
      new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9, roughness: 0.3 })
    );
    muzzleRing.position.y = 1.5;
    barrelMesh.add(muzzleRing);

    barrelPivot.add(barrelMesh);
    cannonPivot.add(barrelPivot);
    scene.add(cannonPivot);

    // 9. Flying Projectile Ball
    const ballGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x064e3b,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // Ball Ground Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(0.5, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.04;
    scene.add(shadowMesh);

    // 10. Trajectory Lines
    // Active Trajectory (Emerald glow line)
    const activeLineMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      linewidth: 3,
    });
    const trajectoryLine = new THREE.Line(new THREE.BufferGeometry(), activeLineMat);
    scene.add(trajectoryLine);

    // Vacuum Ghost Trajectory (Sky Blue dashed line)
    const vacLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      dashSize: 1.5,
      gapSize: 0.8,
    });
    const vacuumGhostLine = new THREE.Line(new THREE.BufferGeometry(), vacLineMat);
    scene.add(vacuumGhostLine);

    // Stokes Ghost Trajectory (Amber dashed line)
    const stokesLineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      linewidth: 1.5,
      dashSize: 1.0,
      gapSize: 0.8,
    });
    const stokesGhostLine = new THREE.Line(new THREE.BufferGeometry(), stokesLineMat);
    scene.add(stokesGhostLine);

    // 11. Kinematic Vector Indicators
    // Velocity Vector (Emerald)
    const velVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      4.0,
      0x10b981,
      0.8,
      0.4
    );
    scene.add(velVectorArrow);

    // Acceleration Vector (Rose)
    const accVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 0),
      3.0,
      0xf43f5e,
      0.6,
      0.3
    );
    scene.add(accVectorArrow);

    // Drag Force Vector (Amber)
    const dragVectorArrow = new THREE.ArrowHelper(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0xf59e0b,
      0.5,
      0.25
    );
    scene.add(dragVectorArrow);

    // 12. Apex Marker & Landing Marker
    const apexMarker = new THREE.Group();
    const apexFlag = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    apexFlag.rotation.z = Math.PI;
    apexMarker.add(apexFlag);
    scene.add(apexMarker);

    const landingMarker = new THREE.Group();
    const landRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
    );
    landRing.rotation.x = -Math.PI / 2;
    landingMarker.add(landRing);
    scene.add(landingMarker);

    threeRef.current = {
      scene,
      camera,
      orthoCamera,
      renderer,
      controls: controlsObj,
      ballMesh,
      shadowMesh,
      cannonPivot,
      barrelMesh,
      targetMesh: targetGroup,
      trajectoryLine,
      vacuumGhostLine,
      stokesGhostLine,
      velVectorArrow,
      accVectorArrow,
      dragVectorArrow,
      apexMarker,
      landingMarker,
      gridHelper,
    };

    // Calculate initial trajectories
    const initialTrajs = recomputePhysicsTrajectories();
    updateThreeTrajectoryGeometry(initialTrajs);

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
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaSec = (now - lastTime) * 0.001;
      lastTime = now;

      controlsObj.update();

      const activeCamera =
        controlsRef.current.viewMode === 'side' || controlsRef.current.viewMode === 'top'
          ? orthoCamera
          : camera;

      renderer.render(scene, activeCamera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      ballGeo.dispose();
      ballMat.dispose();
    };
  }, [recomputePhysicsTrajectories, updateThreeTrajectoryGeometry]);

  // Handle camera view modes (3D Perspective vs 2D Side Elevation vs 2D Top)
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    if (controls.viewMode === 'side') {
      state.orthoCamera.position.set(45, 15, 60);
      state.orthoCamera.lookAt(45, 15, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
      state.controls.target.set(45, 15, 0);
    } else if (controls.viewMode === 'top') {
      state.orthoCamera.position.set(45, 80, 0);
      state.orthoCamera.lookAt(45, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
      state.controls.target.set(45, 0, 0);
    } else {
      state.camera.position.set(25, 20, 65);
      state.controls.object = state.camera;
      state.controls.enableRotate = true;
      state.controls.target.set(35, 8, 0);
    }
    state.controls.update();
  }, [controls.viewMode]);

  // Update target position downrange
  useEffect(() => {
    const state = threeRef.current;
    if (state?.targetMesh) {
      state.targetMesh.position.set(targetDistance, 0, 0);
    }
  }, [targetDistance]);

  // Recompute trajectories whenever physics controls change
  useEffect(() => {
    const trajData = recomputePhysicsTrajectories();
    updateThreeTrajectoryGeometry(trajData);
    const timer = setTimeout(() => {
      setSimTime(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    controls.speed,
    controls.elevationDeg,
    controls.azimuthDeg,
    controls.dragModel,
    controls.mass,
    controls.radius,
    controls.cd,
    controls.airDensity,
    controls.windX,
    controls.windZ,
    controls.showComparisonGhost,
    recomputePhysicsTrajectories,
    updateThreeTrajectoryGeometry,
  ]);

  // Projectile Flight Time Simulation Loop & Kinematic Vector Position
  useEffect(() => {
    if (!isPlaying || !trajectories?.active) return;

    const traj = trajectories.active;
    const maxT = traj.flightTime;
    let animId: number;
    let lastClock = performance.now();

    const flightLoop = () => {
      animId = requestAnimationFrame(flightLoop);
      const now = performance.now();
      const dt = (now - lastClock) * 0.001 * controlsRef.current.timeScale;
      lastClock = now;

      setSimTime(prevT => {
        let nextT = prevT + dt;
        if (nextT > maxT) {
          nextT = 0; // continuous loop back to launcher
        }

        // Interpolate position along trajectory points
        const pts = traj.points;
        let pIdx = Math.floor((nextT / maxT) * (pts.length - 1));
        pIdx = Math.min(Math.max(0, pIdx), pts.length - 1);
        const sample = pts[pIdx];

        const state = threeRef.current;
        if (state && sample) {
          // Update Ball Position
          state.ballMesh.position.set(sample.x, sample.y, sample.z);
          state.shadowMesh.position.set(sample.x, 0.04, sample.z);
          const shadowScale = Math.max(0.2, 1.2 - sample.y * 0.035);
          state.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);

          // Update Dynamic Vectors
          if (controlsRef.current.showVectors) {
            state.velVectorArrow.visible = true;
            state.accVectorArrow.visible = true;
            state.dragVectorArrow.visible = controlsRef.current.dragModel !== 'vacuum';

            // Velocity Vector (normalized direction, magnitude scaled)
            const vLen = Math.min(10, sample.speed * 0.15);
            const vDir = new THREE.Vector3(sample.vx, sample.vy, sample.vz).normalize();
            state.velVectorArrow.position.set(sample.x, sample.y, sample.z);
            state.velVectorArrow.setDirection(vDir);
            state.velVectorArrow.setLength(vLen, 0.6, 0.3);

            // Acceleration Vector (gravity + drag deceleration)
            const aSpeed = Math.hypot(sample.ax, sample.ay, sample.az);
            const aLen = Math.min(8, aSpeed * 0.25);
            const aDir = new THREE.Vector3(sample.ax, sample.ay, sample.az).normalize();
            state.accVectorArrow.position.set(sample.x, sample.y, sample.z);
            state.accVectorArrow.setDirection(aDir);
            state.accVectorArrow.setLength(aLen, 0.5, 0.25);

            // Drag Force Vector (opposes relative motion)
            const dMag = Math.hypot(sample.dragFx, sample.dragFy, sample.dragFz);
            const dLen = Math.min(6, (dMag / Math.max(0.01, controlsRef.current.mass)) * 0.25);
            const dDir = new THREE.Vector3(sample.dragFx, sample.dragFy, sample.dragFz).normalize();
            state.dragVectorArrow.position.set(sample.x, sample.y, sample.z);
            state.dragVectorArrow.setDirection(dDir);
            state.dragVectorArrow.setLength(Math.max(0.01, dLen), 0.4, 0.2);
          } else {
            state.velVectorArrow.visible = false;
            state.accVectorArrow.visible = false;
            state.dragVectorArrow.visible = false;
          }

          // Evaluate the 5 Kinematics formulas from screenshot
          const launchParam: LaunchParameters = {
            x0: 0,
            y0: 1.5,
            z0: 0,
            speed: controlsRef.current.speed,
            elevationDeg: controlsRef.current.elevationDeg,
            azimuthDeg: controlsRef.current.azimuthDeg,
            wind: { x: controlsRef.current.windX, y: 0, z: controlsRef.current.windZ },
          };
          const verifiedFormulas = verifyKinematicsFormulas(traj, pIdx, launchParam);

          // Update Parent Telemetry
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
              maxRange: traj.maxRange,
              maxHeight: traj.maxHeight,
              flightTime: traj.flightTime,
              terminalVelocity: traj.terminalVelocity,
              formulas: verifiedFormulas,
            });
          }
        }

        return nextT;
      });
    };

    animId = requestAnimationFrame(flightLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, trajectories, onUpdateTelemetry]);

  // Get current formula verification proofs at active simulation time
  const currentSampleIdx = trajectories?.active
    ? Math.min(
        trajectories.active.points.length - 1,
        Math.floor((simTime / Math.max(0.001, trajectories.active.flightTime)) * trajectories.active.points.length)
      )
    : 0;

  const currentFormulaProofs = trajectories?.active
    ? verifyKinematicsFormulas(trajectories.active, currentSampleIdx, {
        x0: 0,
        y0: 1.5,
        z0: 0,
        speed: controls.speed,
        elevationDeg: controls.elevationDeg,
        azimuthDeg: controls.azimuthDeg,
        wind: { x: controls.windX, y: 0, z: controls.windZ },
      })
    : [];

  const currentPoint =
    trajectories?.active?.points[currentSampleIdx] ?? trajectories?.active?.points[0];

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* ========================================================================= */}
      {/* TOP FLOATING AP PHYSICS C KINEMATICS FORMULA STRIP                        */}
      {/* ========================================================================= */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-auto max-w-[92vw] bg-[#071612]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-2 px-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>AP KINEMATICS AUDITOR</span>
          </div>
          <span className="text-slate-300 hidden sm:inline text-[11px]">
            Real-time verification of the 5 fundamental equations from Unit 1:
          </span>
        </div>

        {/* 5 Formula Quick Tabs */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 font-mono text-[11px]">
          {currentFormulaProofs.map((f, idx) => {
            const isExact = f.status === 'exact';
            const isCalculus = f.status === 'valid_calculus';
            const isInvalid = f.status === 'invalidated_by_drag';

            return (
              <button
                key={f.formulaNumber}
                onClick={() => setSelectedFormulaIndex(idx)}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                  selectedFormulaIndex === idx
                    ? 'bg-emerald-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={f.name}
              >
                <span>#{f.formulaNumber}</span>
                <span className="hidden md:inline font-sans font-medium text-[10px]">
                  {f.latex.replace(/\\/g, '')}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isExact
                      ? 'bg-sky-400'
                      : isCalculus
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Play / Pause / Replay Bar */}
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition flex items-center gap-1 text-[11px] font-semibold"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => setSimTime(0)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Reset to Cannon Muzzle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING LEFT CONTROL POD: BALLISTICS CONFIG & DRAG PARAMETERS            */}
      {/* ========================================================================= */}
      <div className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-[#071511]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 flex flex-col space-y-4 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Ballistics &amp; Drag Controls
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            RK4 SOLVER
          </span>
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

        {/* Projectile Presets */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-semibold">Projectile Preset</span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {PROJECTILE_PRESETS[controls.preset]?.name}
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
                onToast?.(`Selected ${p.name}: ${p.description}`);
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

        {/* Launch Velocity & Elevation Controls */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Muzzle Velocity (v₀):</span>
              <span className="font-mono text-emerald-300 font-bold">
                {controls.speed.toFixed(1)} m/s ({((controls.speed * 3.6)).toFixed(0)} km/h)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={controls.speed}
              onChange={e => setControls(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
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
              min="0"
              max="89"
              step="0.5"
              value={controls.elevationDeg}
              onChange={e =>
                setControls(prev => ({ ...prev, elevationDeg: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between gap-1 pt-1 text-[10px] font-mono">
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

          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Azimuth Angle (φ Horizontal):</span>
              <span className="font-mono text-slate-300 font-bold">
                {controls.azimuthDeg.toFixed(0)}°
              </span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={controls.azimuthDeg}
              onChange={e =>
                setControls(prev => ({ ...prev, azimuthDeg: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-400 cursor-pointer"
            />
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
              <span>Headwind (-) / Tailwind (+) X:</span>
              <span className="font-mono text-white">{controls.windX} m/s</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={controls.windX}
              onChange={e => setControls(prev => ({ ...prev, windX: parseFloat(e.target.value) }))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Crosswind (+Z / -Z):</span>
              <span className="font-mono text-white">{controls.windZ} m/s</span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              step="1"
              value={controls.windZ}
              onChange={e => setControls(prev => ({ ...prev, windZ: parseFloat(e.target.value) }))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Visual Toggles & Comparison Ghost */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <span className="font-bold text-white text-[11px]">Visualization Rig</span>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Dynamic Velocity &amp; Force Vectors</span>
            <input
              type="checkbox"
              checked={controls.showVectors}
              onChange={e => setControls(prev => ({ ...prev, showVectors: e.target.checked }))}
              className="w-4 h-4 rounded accent-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Show Vacuum Ghost Trajectory</span>
            <input
              type="checkbox"
              checked={controls.showComparisonGhost}
              onChange={e =>
                setControls(prev => ({ ...prev, showComparisonGhost: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-sky-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Camera View Mode</span>
            <div className="flex gap-1 text-[10px]">
              {(['3d', 'side', 'top'] as const).map(vm => (
                <button
                  key={vm}
                  onClick={() => setControls(prev => ({ ...prev, viewMode: vm }))}
                  className={`px-2 py-0.5 rounded font-bold uppercase ${
                    controls.viewMode === vm
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {vm}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING RIGHT INSPECTION POD: THE 5 KINEMATICS FORMULAS FROM SCREENSHOT  */}
      {/* ========================================================================= */}
      <div className="absolute top-20 right-4 z-20 w-88 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-[#071612]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 flex flex-col space-y-4 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">
              Formula Verification Station
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            t = {simTime.toFixed(2)}s / {trajectories?.active?.flightTime.toFixed(2)}s
          </span>
        </div>

        {/* Selected Formula Detailed Proof Card */}
        {currentFormulaProofs[selectedFormulaIndex] && (
          <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-3">
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

            {/* Big Math Equation Banner */}
            <div className="py-2.5 px-3 bg-[#050811] rounded-xl border border-white/10 text-center">
              <div className="text-lg font-mono font-black tracking-wide text-white">
                {currentFormulaProofs[selectedFormulaIndex].latex}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {currentFormulaProofs[selectedFormulaIndex].name}
              </div>
            </div>

            {/* LHS vs RHS Numerical Audit */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">
                  {currentFormulaProofs[selectedFormulaIndex].leftHandSideName}
                </div>
                <div className="text-sm font-bold text-emerald-300 mt-1">
                  {currentFormulaProofs[selectedFormulaIndex].leftHandSideValue.toFixed(3)}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">
                  {currentFormulaProofs[selectedFormulaIndex].rightHandSideName}
                </div>
                <div className="text-sm font-bold text-white mt-1">
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
            <p className="text-[11px] text-slate-300 leading-relaxed bg-[#050811]/80 p-2.5 rounded-xl border border-white/5">
              {currentFormulaProofs[selectedFormulaIndex].explanation}
            </p>
          </div>
        )}

        {/* Live Instantaneous Kinematic State Readout */}
        <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instantaneous Kinematics</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">FRAME (t={simTime.toFixed(2)}s)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Position (X, Y, Z)</span>
              <div className="text-white font-bold">
                ({currentPoint?.x.toFixed(1)}m, {currentPoint?.y.toFixed(1)}m,{' '}
                {currentPoint?.z.toFixed(1)}m)
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Speed |v|</span>
              <div className="text-emerald-300 font-bold">
                {currentPoint?.speed.toFixed(1)} m/s
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Velocity (Vx, Vy)</span>
              <div className="text-white">
                ({currentPoint?.vx.toFixed(1)}, {currentPoint?.vy.toFixed(1)}) m/s
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Acceleration (Ax, Ay)</span>
              <div className="text-rose-300">
                ({currentPoint?.ax.toFixed(2)}, {currentPoint?.ay.toFixed(2)}) m/s²
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Aerodynamic Drag</span>
              <div className="text-amber-300 font-bold">
                {Math.hypot(
                  currentPoint?.dragFx ?? 0,
                  currentPoint?.dragFy ?? 0,
                  currentPoint?.dragFz ?? 0
                ).toFixed(2)}{' '}
                N
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">Terminal Velocity v_t</span>
              <div className="text-sky-300 font-bold">
                {isFinite(trajectories?.active?.terminalVelocity ?? Infinity)
                  ? `${trajectories?.active?.terminalVelocity.toFixed(1)} m/s`
                  : 'N/A (Vacuum)'}
              </div>
            </div>
          </div>
        </div>

        {/* Global Trajectory Key Metrics Card */}
        {trajectories?.active && (
          <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
            <span className="font-bold text-white text-[11px]">Flight Envelope Summary</span>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[9px] text-slate-400">MAX RANGE</div>
                <div className="text-sm font-bold text-emerald-300 mt-0.5">
                  {trajectories.active.maxRange.toFixed(1)}m
                </div>
                {trajectories.vacuum && (
                  <div className="text-[9px] text-slate-500">
                    Vac: {trajectories.vacuum.maxRange.toFixed(1)}m
                  </div>
                )}
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[9px] text-slate-400">APEX HEIGHT</div>
                <div className="text-sm font-bold text-sky-300 mt-0.5">
                  {trajectories.active.maxHeight.toFixed(1)}m
                </div>
                {trajectories.vacuum && (
                  <div className="text-[9px] text-slate-500">
                    Vac: {trajectories.vacuum.maxHeight.toFixed(1)}m
                  </div>
                )}
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[9px] text-slate-400">FLIGHT TIME</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {trajectories.active.flightTime.toFixed(2)}s
                </div>
                {trajectories.vacuum && (
                  <div className="text-[9px] text-slate-500">
                    Vac: {trajectories.vacuum.flightTime.toFixed(2)}s
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM CENTER PLAYBACK SCRUBBER BAR                                       */}
      {/* ========================================================================= */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[90vw] max-w-xl bg-[#071612]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3 px-5 shadow-2xl flex items-center gap-4 text-xs font-mono">
        <span className="text-slate-400 shrink-0 text-[11px]">SCRUB FLIGHT:</span>
        <input
          type="range"
          min="0"
          max={trajectories?.active?.flightTime ?? 10}
          step="0.01"
          value={simTime}
          onChange={e => {
            setIsPlaying(false);
            setSimTime(parseFloat(e.target.value));
          }}
          className="w-full accent-emerald-400 cursor-pointer"
        />
        <span className="text-emerald-300 font-bold shrink-0 text-xs">
          {simTime.toFixed(2)}s / {(trajectories?.active?.flightTime ?? 0).toFixed(2)}s
        </span>
      </div>
    </div>
  );
};
