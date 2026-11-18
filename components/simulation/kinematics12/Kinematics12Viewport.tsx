'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  MotionScenarioId,
  MotionParams,
  IntervalAnalysis,
  evaluateMotionState,
  sampleMotionSeries,
} from '@/lib/physics/kinematics-1-2';

export type ObjectModelMode = 'extended' | 'point_mass';

export interface Kinematics12ViewportProps {
  scenario: MotionScenarioId;
  maxTime: number;
  params: MotionParams;
  t1: number;
  dt: number;
  simTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  objectModel: ObjectModelMode;
  viewMode: '3d' | '2d';
  showVInst: boolean;
  showVAvg: boolean;
  showAInst: boolean;
  showAComponents: boolean;
  showDeltaR: boolean;
  analysis: IntervalAnalysis;
  onAdvanceTime: (nextTime: number) => void;
}

// Pre-allocated scratch math helpers (Zero GC inside frame loops)
const _vStart = new THREE.Vector3();
const _vEnd = new THREE.Vector3();
const _vDir = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _targetCamPos = new THREE.Vector3();
const _targetControlsCenter = new THREE.Vector3();

interface ArrowRig {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
}

function createVectorArrowRig(
  colorHex: number,
  shaftRadius = 0.08,
  headRadius = 0.21,
  headLength = 0.48
): ArrowRig {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.2,
  });

  // Unit-height shaft centered at +0.5 on Y so scaling Y adjusts length cleanly
  const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, 1, 10);
  shaftGeo.translate(0, 0.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, mat);

  const headGeo = new THREE.ConeGeometry(headRadius, headLength, 12);
  headGeo.translate(0, headLength * 0.5, 0);
  const head = new THREE.Mesh(headGeo, mat);

  group.add(shaft);
  group.add(head);
  group.userData = { headLength };
  return { group, shaft, head };
}

function updateArrowFromPoints(
  rig: ArrowRig,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  minLength = 0.15
) {
  _vStart.set(x0, y0, z0);
  _vEnd.set(x1, y1, z1);
  _vDir.subVectors(_vEnd, _vStart);
  const totalLen = _vDir.length();
  if (totalLen < minLength) {
    rig.group.visible = false;
    return;
  }
  rig.group.visible = true;
  rig.group.position.copy(_vStart);

  _vDir.divideScalar(totalLen);
  _quat.setFromUnitVectors(_vUp, _vDir);
  rig.group.quaternion.copy(_quat);

  const headLength = (rig.group.userData.headLength as number) || 0.48;
  const effHead = Math.min(headLength, totalLen * 0.42);
  const shaftLen = Math.max(0.02, totalLen - effHead);

  rig.shaft.scale.set(1, shaftLen, 1);
  rig.head.position.set(0, shaftLen, 0);
  rig.head.scale.set(1, effHead / headLength, 1);
}

function createProceduralGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#061510';
    ctx.fillRect(0, 0, size, size);

    // Subtle sub-grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.14)';
    ctx.lineWidth = 1;
    const subStep = size / 8;
    for (let i = 0; i <= 8; i++) {
      const p = i * subStep;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Major 2m tile border
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.34)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.30)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Build composite 8-part procedural kinematics rover (3 silhouette scales, varied roughness/metalness, bottom-center pivot y=0)
 */
function buildCompositeRover(): {
  roverGroup: THREE.Group;
  wheels: THREE.Mesh[];
  solidMeshes: THREE.Mesh[];
  ghostShell: THREE.Mesh;
} {
  const roverGroup = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const solidMeshes: THREE.Mesh[] = [];

  // Shared PBR Materials with roughness >= 0.25 contrast
  const anodizedHullMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.34,
    metalness: 0.62,
  });
  const matteSkidMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.86,
    metalness: 0.14,
  });
  const brushedAluminumMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.22,
    metalness: 0.88,
  });
  const rubberTireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.05,
  });
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x6ee7b7,
    emissive: 0x34d399,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.2,
  });

  // 1. Primary silhouette: Beveled extruded fuselage oriented along +X
  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-0.85, 0);
  chassisShape.lineTo(0.85, 0);
  chassisShape.lineTo(0.95, 0.22);
  chassisShape.lineTo(0.55, 0.42);
  chassisShape.lineTo(-0.68, 0.42);
  chassisShape.lineTo(-0.92, 0.2);
  chassisShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(chassisShape, {
    depth: 0.96,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  hullGeo.translate(0, 0.22, -0.48);
  const hullMesh = new THREE.Mesh(hullGeo, anodizedHullMat);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  roverGroup.add(hullMesh);
  solidMeshes.push(hullMesh);

  // 2. Secondary base: Matte undertray skidframe
  const undertray = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.86), matteSkidMat);
  undertray.position.set(0, 0.2, 0);
  undertray.castShadow = true;
  roverGroup.add(undertray);
  solidMeshes.push(undertray);

  // 3. Brushed aluminum axles (front & rear)
  for (const axX of [-0.55, 0.55]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.24, 10), brushedAluminumMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(axX, 0.24, 0);
    roverGroup.add(axle);
    solidMeshes.push(axle);
  }

  // 4-7. Four wheels (tires + metallic rim caps) touching floor y = 0 (radius 0.24 at y = 0.24)
  const wheelCoords: Array<[number, number]> = [
    [-0.55, 0.58],
    [0.55, 0.58],
    [-0.55, -0.58],
    [0.55, -0.58],
  ];
  const tireGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 18);
  tireGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12);
  hubGeo.rotateX(Math.PI / 2);

  for (const [wx, wz] of wheelCoords) {
    const tire = new THREE.Mesh(tireGeo, rubberTireMat);
    tire.position.set(wx, 0.24, wz);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, brushedAluminumMat);
    tire.add(hub);
    roverGroup.add(tire);
    wheels.push(tire);
    solidMeshes.push(tire, hub);
  }

  // 8. Sensor canopy dome + top LiDAR beacon (accent detail)
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    canopyMat
  );
  canopy.position.set(0.06, 0.64, 0);
  canopy.renderOrder = 4;
  roverGroup.add(canopy);
  solidMeshes.push(canopy);

  const lidarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.16, 12), brushedAluminumMat);
  lidarMast.position.set(-0.36, 0.72, 0);
  roverGroup.add(lidarMast);
  solidMeshes.push(lidarMast);

  const lidarBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 14), beaconMat);
  lidarBeacon.position.set(-0.36, 0.82, 0);
  roverGroup.add(lidarBeacon);
  solidMeshes.push(lidarBeacon);

  // Subtle wireframe ghost silhouette shown when toggled to Point-Mass Model (EK 1.2.A.1)
  const ghostShell = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.72, 1.18),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    })
  );
  ghostShell.position.set(0, 0.42, 0);
  ghostShell.visible = false;
  roverGroup.add(ghostShell);

  return { roverGroup, wheels, solidMeshes, ghostShell };
}

function buildCurveTube(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material
): THREE.Mesh | null {
  if (points.length < 2) return null;
  const deduped: THREE.Vector3[] = [];
  for (const p of points) {
    if (deduped.length === 0 || deduped[deduped.length - 1].distanceToSquared(p) > 0.002) {
      deduped.push(p);
    }
  }
  if (deduped.length < 2) {
    deduped.push(deduped[0].clone().add(new THREE.Vector3(0.05, 0, 0)));
  }
  const curve = new THREE.CatmullRomCurve3(deduped);
  const segs = Math.min(180, Math.max(24, deduped.length * 2));
  const geo = new THREE.TubeGeometry(curve, segs, radius, 10, false);
  return new THREE.Mesh(geo, material);
}

export const Kinematics12Viewport: React.FC<Kinematics12ViewportProps> = props => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef<Kinematics12ViewportProps>(props);
  useEffect(() => {
    latestPropsRef.current = props;
  });

  // Imperative handles synced without recreating renderer
  const sceneControlRef = useRef<{
    rebuildTrajectory: () => void;
    syncDynamicObjects: (t: number) => void;
    requestRender: () => void;
    startLoopIfNeeded: () => void;
    setCameraMode: (mode: '3d' | '2d') => void;
    prevTimeRef: number;
  } | null>(null);

  // Initialize Three.js scene once on mount
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // 1. Detect software WebGL cleanly from GPU renderer string
    const isSoftwareGl = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = mountEl.clientWidth || 1000;
    const height = mountEl.clientHeight || 640;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b09);
    scene.fog = new THREE.FogExp2(0x040b09, 0.011);

    // 2. Procedural studio environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 250);
    const initial2D = latestPropsRef.current.viewMode === '2d';
    if (initial2D) {
      camera.position.set(0, 26, 0.01);
    } else {
      camera.position.set(11, 10.5, 16);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 4;
    controls.maxDistance = 65;
    controls.target.set(0, 0.4, 0);
    controls.update();

    // 3. Warm Key + Cool Hemisphere Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x052e26, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
    keyLight.position.set(14, 22, 12);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 0.65);
    rimLight.position.set(-14, 8, -14);
    scene.add(rimLight);

    // 4. Laboratory Ground Plane + Metric Track Rail + Origin Beacon
    const gridTex = createProceduralGridTexture();
    gridTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const floorGeo = new THREE.PlaneGeometry(96, 96);
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.12,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Track rail along X-axis (y = 0.025 avoids Z-fighting)
    const railGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x0f2922,
      roughness: 0.55,
      metalness: 0.5,
    });
    const railStrip = new THREE.Mesh(new THREE.BoxGeometry(34, 0.04, 1.35), railMat);
    railStrip.position.set(0, 0.02, 0);
    railStrip.receiveShadow = true;
    railGroup.add(railStrip);

    // Instanced metric sleeper/ticks along X (-14m to +14m every 2m)
    const tickGeo = new THREE.BoxGeometry(0.08, 0.045, 1.48);
    const tickMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.4,
      metalness: 0.3,
    });
    const tickPositions: number[] = [];
    for (let m = -14; m <= 14; m += 2) tickPositions.push(m);
    const tickInst = new THREE.InstancedMesh(tickGeo, tickMat, tickPositions.length);
    const dummy = new THREE.Object3D();
    tickPositions.forEach((xm, i) => {
      dummy.position.set(xm, 0.025, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tickInst.setMatrixAt(i, dummy.matrix);
    });
    tickInst.instanceMatrix.needsUpdate = true;
    tickInst.computeBoundingSphere();
    railGroup.add(tickInst);
    scene.add(railGroup);

    // Vertical origin reference gate at (0, 0, 0)
    const originMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.4, 10),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.8,
      })
    );
    originMarker.position.set(0, 0.7, -1.0);
    scene.add(originMarker);

    // 5. Contact Shadow Disc + Rover + Point-Mass Particle
    const shadowTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 24),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.015, 0);
    scene.add(contactShadow);

    const { roverGroup, wheels, solidMeshes, ghostShell } = buildCompositeRover();
    scene.add(roverGroup);

    const pointMassGroup = new THREE.Group();
    const pointCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 20, 16),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.3,
      })
    );
    pointCore.position.set(0, 0.42, 0);
    const dropPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x34d399, emissiveIntensity: 0.6 })
    );
    dropPin.position.set(0, 0.21, 0);
    const ringFloor = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide })
    );
    ringFloor.rotation.x = -Math.PI / 2;
    ringFloor.position.set(0, 0.03, 0);
    pointMassGroup.add(pointCore, dropPin, ringFloor);
    scene.add(pointMassGroup);

    // 6. Interval Anchor Spheres (t1 = cyan, t2 = violet)
    const t1Beacon = new THREE.Group();
    const t1Sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.9 })
    );
    t1Sphere.position.set(0, 0.42, 0);
    const t1Stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    t1Stem.position.set(0, 0.21, 0);
    t1Beacon.add(t1Sphere, t1Stem);
    scene.add(t1Beacon);

    const t2Beacon = new THREE.Group();
    const t2Sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 0.9 })
    );
    t2Sphere.position.set(0, 0.42, 0);
    const t2Stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.42, 8),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    t2Stem.position.set(0, 0.21, 0);
    t2Beacon.add(t2Sphere, t2Stem);
    scene.add(t2Beacon);

    // 7. Dynamic Trajectory & Interval Tube Containers
    const trajectoryGroup = new THREE.Group();
    scene.add(trajectoryGroup);
    const fullTubeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      transparent: true,
      opacity: 0.52,
    });
    const intervalTubeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });

    // 8. 3D Vector Arrows
    const arrowDeltaR = createVectorArrowRig(0xfbbf24, 0.075, 0.2, 0.46); // Displacement chord Δr
    const arrowVAvg = createVectorArrowRig(0xf59e0b, 0.06, 0.17, 0.38); // Average velocity v_avg
    const arrowVInst = createVectorArrowRig(0x10b981, 0.07, 0.19, 0.42); // Instantaneous v(t)
    const arrowAInst = createVectorArrowRig(0xf43f5e, 0.065, 0.18, 0.4); // Instantaneous a(t)
    const arrowATan = createVectorArrowRig(0x38bdf8, 0.045, 0.14, 0.32); // Tangential a_||
    const arrowANorm = createVectorArrowRig(0xa855f7, 0.045, 0.14, 0.32); // Normal a_⊥
    scene.add(
      arrowDeltaR.group,
      arrowVAvg.group,
      arrowVInst.group,
      arrowAInst.group,
      arrowATan.group,
      arrowANorm.group
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // State & Render Scheduling
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;
    let camTransitionActive = false;
    let wheelAngle = 0;
    let liveTime = latestPropsRef.current.simTime;
    let lastTimestamp = performance.now();
    let lastHudSyncMs = 0;

    function clearGroupMeshes(group: THREE.Group) {
      while (group.children.length > 0) {
        const child = group.children[0] as THREE.Mesh;
        group.remove(child);
        if (child.geometry) child.geometry.dispose();
      }
    }

    function rebuildTrajectory() {
      const p = latestPropsRef.current;
      clearGroupMeshes(trajectoryGroup);

      const fullSamples = sampleMotionSeries(p.scenario, 0, p.maxTime, 120, p.params);
      const fullPts = fullSamples.map(s => new THREE.Vector3(s.r.x, 0.12, s.r.z));
      const fullTube = buildCurveTube(fullPts, 0.06, fullTubeMat);
      if (fullTube) trajectoryGroup.add(fullTube);

      const tEnd = Math.min(p.maxTime, p.t1 + p.dt);
      const intervalSamples = sampleMotionSeries(p.scenario, p.t1, Math.max(p.t1 + 0.01, tEnd), 44, p.params);
      const intervalPts = intervalSamples.map(s => new THREE.Vector3(s.r.x, 0.16, s.r.z));
      const intTube = buildCurveTube(intervalPts, 0.1, intervalTubeMat);
      if (intTube) trajectoryGroup.add(intTube);
    }

    function syncDynamicObjects(tVal: number) {
      const p = latestPropsRef.current;
      const st = evaluateMotionState(p.scenario, tVal, p.params);
      const an = p.analysis;

      // Ground rover / point-mass at (r.x, 0, r.z)
      roverGroup.position.set(st.r.x, 0.04, st.r.z);
      pointMassGroup.position.set(st.r.x, 0.04, st.r.z);
      contactShadow.position.set(st.r.x, 0.015, st.r.z);

      // Orient extended rover toward direction of travel (when speed > 0.05)
      if (st.speed > 0.05) {
        const heading = Math.atan2(-st.v.z, st.v.x);
        roverGroup.rotation.y = heading;
      }

      // Spin wheels according to distance
      const deltaT = tVal - (sceneControlRef.current?.prevTimeRef ?? tVal);
      wheelAngle += (st.speed * deltaT) / 0.24;
      for (const w of wheels) {
        w.rotation.z = -wheelAngle;
      }
      if (sceneControlRef.current) sceneControlRef.current.prevTimeRef = tVal;

      // Toggle Extended vs Point-Mass visibility (EK 1.2.A.1)
      const isPointMass = p.objectModel === 'point_mass';
      for (const m of solidMeshes) m.visible = !isPointMass;
      ghostShell.visible = isPointMass;
      pointMassGroup.visible = isPointMass;
      contactShadow.scale.setScalar(isPointMass ? 0.55 : 1.0);

      // Update t1 & t2 markers
      t1Beacon.position.set(an.state1.r.x, 0.04, an.state1.r.z);
      t2Beacon.position.set(an.state2.r.x, 0.04, an.state2.r.z);

      // Displacement vector chord Δr from r(t1) -> r(t2)
      if (p.showDeltaR) {
        updateArrowFromPoints(
          arrowDeltaR,
          an.state1.r.x,
          0.32,
          an.state1.r.z,
          an.state2.r.x,
          0.32,
          an.state2.r.z,
          0.18
        );
      } else {
        arrowDeltaR.group.visible = false;
      }

      // Average velocity vector anchored at t1 (scaled 0.45 m per m/s for readable proportions)
      const vScale = 0.42;
      if (p.showVAvg) {
        updateArrowFromPoints(
          arrowVAvg,
          an.state1.r.x,
          0.72,
          an.state1.r.z,
          an.state1.r.x + an.vAvg.x * vScale,
          0.72,
          an.state1.r.z + an.vAvg.z * vScale,
          0.15
        );
      } else {
        arrowVAvg.group.visible = false;
      }

      // Instantaneous velocity vector anchored at rover
      if (p.showVInst) {
        updateArrowFromPoints(
          arrowVInst,
          st.r.x,
          0.88,
          st.r.z,
          st.r.x + st.v.x * vScale,
          0.88,
          st.r.z + st.v.z * vScale,
          0.15
        );
      } else {
        arrowVInst.group.visible = false;
      }

      // Instantaneous acceleration vector anchored at rover
      const aScale = 0.45;
      if (p.showAInst) {
        updateArrowFromPoints(
          arrowAInst,
          st.r.x,
          1.12,
          st.r.z,
          st.r.x + st.a.x * aScale,
          1.12,
          st.r.z + st.a.z * aScale,
          0.14
        );
      } else {
        arrowAInst.group.visible = false;
      }

      // Optional Tangential a_|| & Normal a_⊥ decomposition vectors (EK 1.2.B.4)
      if (p.showAComponents && st.speed > 0.05) {
        const vxUnit = st.v.x / st.speed;
        const vzUnit = st.v.z / st.speed;
        const aTanX = st.aTangential * vxUnit;
        const aTanZ = st.aTangential * vzUnit;
        const aNormX = st.a.x - aTanX;
        const aNormZ = st.a.z - aTanZ;

        updateArrowFromPoints(
          arrowATan,
          st.r.x,
          1.28,
          st.r.z,
          st.r.x + aTanX * aScale,
          1.28,
          st.r.z + aTanZ * aScale,
          0.12
        );
        updateArrowFromPoints(
          arrowANorm,
          st.r.x,
          1.28,
          st.r.z,
          st.r.x + aNormX * aScale,
          1.28,
          st.r.z + aNormZ * aScale,
          0.12
        );
      } else {
        arrowATan.group.visible = false;
        arrowANorm.group.visible = false;
      }
    }

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (isDisposed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (isDisposed || latestPropsRef.current.isPlaying) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (isDisposed) return;
        renderDirty = false;
        if (camTransitionActive) {
          const dtCam = 0.05;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 7, dtCam);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 7, dtCam);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 7, dtCam);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetControlsCenter.x, 7, dtCam);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetControlsCenter.y, 7, dtCam);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetControlsCenter.z, 7, dtCam);
          if (camera.position.distanceTo(_targetCamPos) < 0.08) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetControlsCenter);
            camTransitionActive = false;
          } else {
            renderDirty = true;
          }
        }
        controls.update();
        syncDynamicObjects(latestPropsRef.current.simTime);
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !isDisposed && !latestPropsRef.current.isPlaying) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    function tick() {
      if (isDisposed || !latestPropsRef.current.isPlaying) return;
      const now = performance.now();
      const elapsedSec = Math.min(0.12, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      const p = latestPropsRef.current;
      liveTime += elapsedSec * p.playbackSpeed;
      if (liveTime > p.maxTime) {
        liveTime = 0;
      }

      if (camTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 7, elapsedSec);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 7, elapsedSec);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 7, elapsedSec);
        if (camera.position.distanceTo(_targetCamPos) < 0.08) camTransitionActive = false;
      }

      controls.update();
      syncDynamicObjects(liveTime);
      renderer.render(scene, camera);

      // Throttle React HUD updates to <= 10Hz during playback
      if (now - lastHudSyncMs >= 100) {
        lastHudSyncMs = now;
        p.onAdvanceTime(Number(liveTime.toFixed(2)));
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    function startLoopIfNeeded() {
      if (isDisposed) return;
      if (latestPropsRef.current.isPlaying) {
        liveTime = latestPropsRef.current.simTime;
        lastTimestamp = performance.now();
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        frameId = requestAnimationFrame(tick);
      } else {
        requestRender();
      }
    }

    function setCameraMode(mode: '3d' | '2d') {
      if (mode === '2d') {
        _targetCamPos.set(0, 26, 0.01);
        _targetControlsCenter.set(0, 0, 0);
      } else {
        _targetCamPos.set(11, 10.5, 16);
        _targetControlsCenter.set(0, 0.4, 0);
      }
      camTransitionActive = true;
      requestRender();
    }

    const handleControlsChange = () => {
      if (!latestPropsRef.current.isPlaying) {
        requestRender();
      }
    };
    const handleControlsStart = () => {
      camTransitionActive = false;
    };
    controls.addEventListener('change', handleControlsChange);
    controls.addEventListener('start', handleControlsStart);

    const handleResize = () => {
      if (!mountEl || isDisposed) return;
      const w = mountEl.clientWidth || 1000;
      const h = mountEl.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    sceneControlRef.current = {
      rebuildTrajectory,
      syncDynamicObjects,
      requestRender,
      startLoopIfNeeded,
      setCameraMode,
      prevTimeRef: latestPropsRef.current.simTime,
    };

    rebuildTrajectory();
    syncDynamicObjects(latestPropsRef.current.simTime);
    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', handleControlsChange);
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      clearGroupMeshes(trajectoryGroup);
      scene.traverse(obj => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
          else m.material?.dispose();
        }
      });
      gridTex.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Rebuild trajectory tubes only when scenario, params, or interval [t1, dt] change
  useEffect(() => {
    sceneControlRef.current?.rebuildTrajectory();
    sceneControlRef.current?.syncDynamicObjects(latestPropsRef.current.simTime);
    sceneControlRef.current?.requestRender();
  }, [props.scenario, props.maxTime, props.params, props.t1, props.dt]);

  // Sync pose/vectors/object model whenever UI controls or scrubbed simTime change
  useEffect(() => {
    sceneControlRef.current?.syncDynamicObjects(props.simTime);
    sceneControlRef.current?.requestRender();
  }, [
    props.simTime,
    props.objectModel,
    props.showVInst,
    props.showVAvg,
    props.showAInst,
    props.showAComponents,
    props.showDeltaR,
  ]);

  // Start / stop playback loop cleanly
  useEffect(() => {
    sceneControlRef.current?.startLoopIfNeeded();
  }, [props.isPlaying]);

  // Smooth camera switch on 3D/2D toggle
  useEffect(() => {
    sceneControlRef.current?.setCameraMode(props.viewMode);
  }, [props.viewMode]);

  return (
    <div
      ref={mountRef}
      data-testid="kinematics12-canvas"
      data-scenario={props.scenario}
      data-object-model={props.objectModel}
      data-view-mode={props.viewMode}
      data-playing={String(props.isPlaying)}
      className="w-full h-full bg-[#040b09]"
    />
  );
};
