'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Gravity26Evaluation,
  Gravity26Mode,
  Gravity26Params,
} from '@/lib/physics/gravitational-force-2-6';

export interface Gravity26ViewportProps {
  params: Gravity26Params;
  evaluation: Gravity26Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const AMBER_GOLD = 0xf59e0b;
const ROSE_MAIN = 0xf43f5e;
const VIOLET_ACCENT = 0xa78bfa;
const CHROME_METAL = 0xcbd5e1;

const _upVec = new THREE.Vector3(0, 1, 0);
const _tmpDir = new THREE.Vector3();

function makeLabelSprite(
  text: string,
  color = '#ecfdf5',
  bgColor = 'rgba(4, 15, 11, 0.94)',
  worldHeight = 0.27
): THREE.Sprite {
  const fontSize = 26;
  const padX = 18;
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  const textWidth = Math.ceil(mctx.measureText(text).width);
  const w = Math.max(110, textWidth + padX * 2);
  const h = 46;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(r + 2, 2);
  ctx.lineTo(w - r - 2, 2);
  ctx.quadraticCurveTo(w - 2, 2, w - 2, r + 2);
  ctx.lineTo(w - 2, h - r - 2);
  ctx.quadraticCurveTo(w - 2, h - 2, w - r - 2, h - 2);
  ctx.lineTo(r + 2, h - 2);
  ctx.quadraticCurveTo(2, h - 2, 2, h - r - 2);
  ctx.lineTo(2, r + 2);
  ctx.quadraticCurveTo(2, 2, r + 2, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = w / h;
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  sprite.renderOrder = 24;
  return sprite;
}

function makePlanetSurfaceTexture(
  baseHex: number,
  accentHex: number,
  maxAniso: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const baseColor = new THREE.Color(baseHex);
  const accentColor = new THREE.Color(accentHex);

  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, `#${baseColor.clone().multiplyScalar(0.55).getHexString()}`);
  grad.addColorStop(0.5, `#${baseColor.getHexString()}`);
  grad.addColorStop(1, `#${baseColor.clone().multiplyScalar(0.55).getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle zonal bands & terrain continents
  ctx.fillStyle = `rgba(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)}, 0.32)`;
  const blobs = [
    [90, 95, 52, 24],
    [160, 145, 70, 28],
    [290, 82, 84, 30],
    [390, 155, 62, 26],
    [450, 105, 45, 22],
    [225, 118, 40, 18],
  ];
  for (const [bx, by, rx, ry] of blobs) {
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scientific latitude/longitude grid lines
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
  ctx.lineWidth = 1.2;
  for (let i = 1; i < 6; i++) {
    const y = (i / 6) * c.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const x = (i / 12) * c.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, c.height);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeScaleDisplayTexture(readingN: number, isWeightless: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#04120d';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = isWeightless ? '#f43f5e' : '#10b981';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, c.width - 8, c.height - 8);

  ctx.fillStyle = isWeightless ? '#fda4af' : '#6ee7b7';
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FLOOR SCALE F_N', c.width / 2, 26);

  ctx.fillStyle = isWeightless ? '#fb7185' : '#34d399';
  ctx.font = '700 36px "JetBrains Mono", monospace';
  ctx.fillText(`${readingN.toFixed(0)} N`, c.width / 2, 70);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createVectorArrow3D(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.044
): THREE.Group {
  const group = new THREE.Group();
  if (length < 0.06 || dir.lengthSq() < 1e-8) return group;
  _tmpDir.copy(dir).normalize();
  const headLen = Math.min(0.32, length * 0.34);
  const shaftLen = Math.max(0.04, length - headLen);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.32,
    roughness: 0.3,
    metalness: 0.25,
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 12),
    mat
  );
  shaft.position.y = shaftLen / 2;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(shaftRadius * 2.35, headLen, 14),
    mat
  );
  head.position.y = shaftLen + headLen / 2;

  const holder = new THREE.Group();
  holder.add(shaft, head);
  holder.quaternion.setFromUnitVectors(_upVec, _tmpDir);
  holder.position.copy(origin);
  group.add(holder);
  return group;
}

/**
 * Composite 5-part procedural orbital planet / massive body
 */
function buildCompositePlanet(
  radius: number,
  baseHex: number,
  accentHex: number,
  atmoHex: number,
  maxAniso: number
): THREE.Group {
  const g = new THREE.Group();

  // 1. Primary textured planetary sphere
  const planetTex = makePlanetSurfaceTexture(baseHex, accentHex, maxAniso);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 36, 28),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: planetTex,
      roughness: 0.65,
      metalness: 0.12,
    })
  );
  g.add(sphere);

  // 2. Subtle atmospheric limb halo
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.07, 28, 20),
    new THREE.MeshBasicMaterial({
      color: atmoHex,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.BackSide,
    })
  );
  g.add(atmo);

  // 3. Equatorial orbital measurement ring
  const eqRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.18, 0.02, 10, 64),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.7,
    })
  );
  eqRing.rotation.x = Math.PI / 2;
  g.add(eqRing);

  // 4. Polar axis calibration spindles
  const axisSpindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, radius * 2.45, 10),
    new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.25, metalness: 0.85 })
  );
  g.add(axisSpindle);

  // 5. Center-of-mass beacon cap markers at poles
  const poleMat = new THREE.MeshStandardMaterial({
    color: AMBER_GOLD,
    emissive: AMBER_GOLD,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.5,
  });
  for (const sy of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), poleMat);
    cap.position.y = sy * radius * 1.24;
    g.add(cap);
  }

  return g;
}

/**
 * Composite 6-part orbital test probe / spacecraft (no bare sphere placeholder)
 */
function buildCompositeSatellite(scale = 1.0): THREE.Group {
  const g = new THREE.Group();

  // 1. Gold-foil octagonal spacecraft bus
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.78 })
  );
  bus.rotation.z = Math.PI / 2;
  g.add(bus);

  // 2. Twin blue-silicon solar panel wings
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.2,
    metalness: 0.55,
  });
  const strutMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.3, metalness: 0.85 });
  for (const sz of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), strutMat);
    strut.rotation.x = Math.PI / 2;
    strut.position.z = sz * 0.36;
    g.add(strut);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.028, 0.62), panelMat);
    wing.position.z = sz * 0.62;
    g.add(wing);
  }

  // 3. Parabolic telemetry dish
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.12, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.6,
      side: THREE.DoubleSide,
    })
  );
  dish.rotation.z = Math.PI / 2;
  dish.position.x = -0.25;
  g.add(dish);

  // 4. Center-of-mass emerald core beacon
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 14, 12),
    new THREE.MeshStandardMaterial({
      color: EMERALD_MAIN,
      emissive: EMERALD_MAIN,
      emissiveIntensity: 0.65,
      roughness: 0.2,
    })
  );
  beacon.position.y = 0.22;
  g.add(beacon);

  g.scale.setScalar(scale);
  return g;
}

/**
 * Composite 7-part elevator cabin with digital floor scale and standing test mass
 */
function buildElevatorCabin(
  scaleReadingN: number,
  isWeightless: boolean,
  accentHex: number,
  showRocketThruster: boolean,
  ballDropOffsetM: number | null
): THREE.Group {
  const cabin = new THREE.Group();
  const w = 2.3;
  const h = 2.7;
  const d = 1.9;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.6,
  });

  // 1. Floor deck & ceiling cap
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), frameMat);
  floor.position.y = -h / 2;
  cabin.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), frameMat);
  ceiling.position.y = h / 2;
  cabin.add(ceiling);

  // 2. 4 corner structural pillars
  const pillarGeo = new THREE.BoxGeometry(0.11, h, 0.11);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, frameMat);
      p.position.set(sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08));
      cabin.add(p);
    }
  }

  // 3. Back translucent glass bulkhead
  const backGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.22, h - 0.22),
    new THREE.MeshStandardMaterial({
      color: 0x0b1f18,
      roughness: 0.2,
      metalness: 0.2,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
    })
  );
  backGlass.position.z = -d / 2 + 0.06;
  cabin.add(backGlass);

  // 4. Trim accent rails
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.06, d + 0.05), trimMat);
  topTrim.position.y = h / 2 + 0.09;
  cabin.add(topTrim);

  // 5. Digital floor scale pedestal with live reading canvas texture
  const scaleBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.26, 0.92),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 })
  );
  scaleBase.position.set(-0.18, -h / 2 + 0.21, 0);
  cabin.add(scaleBase);

  const displayTex = makeScaleDisplayTexture(scaleReadingN, isWeightless);
  const displayFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.98, 0.22),
    new THREE.MeshBasicMaterial({ map: displayTex })
  );
  displayFace.position.set(-0.18, -h / 2 + 0.21, 0.465);
  cabin.add(displayFace);

  // 6. Standing test mass / observer mannequin (slightly lifted in weightlessness)
  const hoverLift = isWeightless ? 0.34 : 0.0;
  const rider = new THREE.Group();
  const riderBaseY = -h / 2 + 0.34 + hoverLift;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.78, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5, metalness: 0.25 })
  );
  torso.position.y = riderBaseY + 0.42;
  rider.add(torso);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.1, 16),
    new THREE.MeshStandardMaterial({ color: AMBER_GOLD, roughness: 0.35, metalness: 0.65 })
  );
  belt.position.y = riderBaseY + 0.38;
  rider.add(belt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.5 })
  );
  head.position.y = riderBaseY + 0.98;
  rider.add(head);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 12, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.3, Math.PI * 0.35),
    new THREE.MeshStandardMaterial({ color: SKY_MAIN, emissive: SKY_MAIN, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.85 })
  );
  visor.position.set(0, riderBaseY + 0.98, 0.08);
  rider.add(visor);

  rider.position.x = -0.18;
  cabin.add(rider);

  // 7. Optional synchronized equivalence-principle dropped ball inside right corner of cabin
  if (ballDropOffsetM !== null) {
    const dropRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1.75, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.6 })
    );
    dropRail.position.set(0.72, -0.1, 0.15);
    cabin.add(dropRail);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 18, 14),
      new THREE.MeshStandardMaterial({
        color: AMBER_GOLD,
        emissive: AMBER_GOLD,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    ball.position.set(0.72, 0.72 - ballDropOffsetM, 0.15);
    cabin.add(ball);
  }

  // 8. Optional rocket thruster bell + glowing exhaust plume for deep-space equivalence cabin
  if (showRocketThruster) {
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.52, 0.55, 20),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.32, metalness: 0.85 })
    );
    bell.position.y = -h / 2 - 0.34;
    cabin.add(bell);

    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.45, 18),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.72,
      })
    );
    plume.rotation.x = Math.PI;
    plume.position.y = -h / 2 - 1.32;
    cabin.add(plume);

    const innerPlume = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.95, 14),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.9,
      })
    );
    innerPlume.rotation.x = Math.PI;
    innerPlume.position.y = -h / 2 - 1.05;
    cabin.add(innerPlume);
  }

  return cabin;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material;
    if (Array.isArray(mat)) {
      mat.forEach(m => {
        const sm = m as THREE.MeshStandardMaterial;
        if (sm.map) sm.map.dispose();
        m.dispose();
      });
    } else if (mat) {
      const sm = mat as THREE.MeshStandardMaterial;
      if (sm.map) sm.map.dispose();
      mat.dispose();
    }
  });
}

export const Gravity26Viewport: React.FC<Gravity26ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ params, evaluation, viewMode });

  const rebuildSceneRef = useRef<(() => void) | null>(null);
  const applyCameraPresetRef = useRef<
    ((mode: Gravity26Mode, vMode: '3d' | '2d', equivalenceSplit: boolean) => void) | null
  >(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d0a);
    scene.fog = new THREE.FogExp2(0x040d0a, 0.018);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Mandatory studio environment map via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    // Warm/Cool 3-point lighting rig
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x062018, 0.95);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.0);
    keyLight.position.set(9, 13, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 0.75);
    rimLight.position.set(-10, 6, -8);
    scene.add(rimLight);

    // Subtle procedural starfield backdrop (InstancedMesh / Points)
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const theta = ((i * 137.508) % 360) * (Math.PI / 180);
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 260);
      const rad = 28 + (i % 7) * 2.5;
      starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = rad * Math.cos(phi);
      starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xa7f3d0,
      size: 0.13,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Cameras
    const perspCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 180);
    const aspect = width / height;
    const orthoHalfH = 5.4;
    const orthoCamera = new THREE.OrthographicCamera(
      -orthoHalfH * aspect,
      orthoHalfH * aspect,
      orthoHalfH,
      -orthoHalfH,
      0.1,
      180
    );

    let activeCamera: THREE.Camera =
      stateRef.current.viewMode === '2d' ? orthoCamera : perspCamera;

    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.2;
    controls.maxDistance = 30;

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    // Coalesced on-demand renderer with software-WebGL afterDraw pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function' && typeof gl.clientWaitSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        let polls = 0;
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          polls += 1;
          const waitRes = sync ? gl.clientWaitSync(sync, 0, 0) : gl.ALREADY_SIGNALED;
          if (waitRes === gl.TIMEOUT_EXPIRED && polls < 18) {
            frameId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 32);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 36);
      }
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = window.requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        if (activeCamera === perspCamera) {
          controls.update();
        }
        renderer.render(scene, activeCamera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    controls.addEventListener('change', requestRender);

    const applyCameraPreset = (
      mode: Gravity26Mode,
      vMode: '3d' | '2d',
      equivalenceSplit: boolean
    ) => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const asp = w / Math.max(1, h);

      let target = new THREE.Vector3(0, 0, 0);
      let pos3d = new THREE.Vector3(0, 3.6, 11.4);
      let orthoH = 4.9;

      if (mode === 'universal_field') {
        target.set(0.05, 0, 0);
        pos3d.set(0.25, 3.8, 12.6);
        orthoH = 4.9;
      } else if (mode === 'near_surface') {
        target.set(-0.05, -0.05, 0);
        pos3d.set(0.0, 1.85, 13.8);
        orthoH = 5.6;
      } else if (mode === 'apparent_weight') {
        if (equivalenceSplit) {
          target.set(0, -0.15, 0);
          pos3d.set(0.0, 1.45, 14.2);
          orthoH = 5.8;
        } else {
          target.set(0, 0.0, 0);
          pos3d.set(0.0, 1.35, 12.6);
          orthoH = 5.2;
        }
      } else {
        target.set(0.25, 0, 0);
        pos3d.set(2.1, 2.9, 10.2);
        orthoH = 4.5;
      }

      perspCamera.aspect = asp;
      perspCamera.position.copy(pos3d);
      perspCamera.updateProjectionMatrix();

      orthoCamera.left = -orthoH * asp;
      orthoCamera.right = orthoH * asp;
      orthoCamera.top = orthoH;
      orthoCamera.bottom = -orthoH;
      orthoCamera.position.set(target.x, target.y, 16);
      orthoCamera.lookAt(target);
      orthoCamera.updateProjectionMatrix();

      controls.target.copy(target);
      controls.enabled = vMode === '3d';
      controls.update();

      activeCamera = vMode === '2d' ? orthoCamera : perspCamera;
      requestRender();
    };

    applyCameraPresetRef.current = applyCameraPreset;

    const rebuildScene = () => {
      while (dynamicGroup.children.length > 0) {
        const ch = dynamicGroup.children[0];
        dynamicGroup.remove(ch);
        disposeObjectTree(ch);
      }

      const { params: p, evaluation: ev } = stateRef.current;

      // =====================================================================
      // MODE 1: UNIVERSAL GRAVITATION & GRAVITATIONAL FIELD (2.6.A)
      // =====================================================================
      if (p.mode === 'universal_field') {
        const u = ev.universal;
        const planetRadius = 1.0 + 0.2 * Math.cbrt(p.primaryMassFactor);
        const planetPos = new THREE.Vector3(-1.45, 0, 0);
        const probeDistVisual = 1.48 + (u.animatedSeparationInR - 1.0) * 1.28;
        const probePos = new THREE.Vector3(planetPos.x + probeDistVisual, 0, 0);

        // Reference orbital grid plane slightly below equatorial plane
        const grid = new THREE.GridHelper(14, 14, 0x10b981, 0x0b2a20);
        grid.position.set(0.4, -2.05, 0);
        dynamicGroup.add(grid);

        // Composite Planet M
        const planet = buildCompositePlanet(planetRadius, 0x1d6fa5, EMERALD_MAIN, SKY_MAIN, maxAniso);
        planet.position.copy(planetPos);
        dynamicGroup.add(planet);

        const mLabel = makeLabelSprite(
          `M = ${(u.primaryMassKg / 1e24).toFixed(2)}×10²⁴ kg`,
          '#6ee7b7',
          'rgba(4,15,11,0.94)',
          0.26
        );
        mLabel.position.set(planetPos.x, -planetRadius - 0.55, 0);
        dynamicGroup.add(mLabel);

        // Radial gravitational field vectors g(r) around M (2.6.A.2)
        if (p.showFieldVectors) {
          const rings = [planetRadius + 1.05, planetRadius + 2.35];
          const dirsPerRing = [10, 14];
          rings.forEach((rad, rIdx) => {
            const count = dirsPerRing[rIdx];
            const arrowLen = rIdx === 0 ? 0.62 : 0.34;
            for (let i = 0; i < count; i++) {
              const ang = (i / count) * Math.PI * 2;
              const start = new THREE.Vector3(
                planetPos.x + Math.cos(ang) * rad,
                Math.sin(ang) * rad * 0.88,
                0
              );
              const inward = planetPos.clone().sub(start).normalize();
              const gVec = createVectorArrow3D(start, inward, arrowLen, SKY_MAIN, 0.025);
              dynamicGroup.add(gVec);
            }
          });
        }

        // Line of action connecting centers of mass (2.6.A.1.ii & iii)
        if (p.showComLine) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([planetPos, probePos]);
          const lineMat = new THREE.LineDashedMaterial({
            color: 0x94a3b8,
            dashSize: 0.18,
            gapSize: 0.12,
          });
          const comLine = new THREE.Line(lineGeo, lineMat);
          comLine.computeLineDistances();
          dynamicGroup.add(comLine);

          const rLabel = makeLabelSprite(
            `r = ${u.animatedSeparationInR.toFixed(2)} R_E`,
            '#cbd5e1',
            'rgba(10,18,28,0.92)',
            0.24
          );
          rLabel.position.set((planetPos.x + probePos.x) / 2, -0.58, 0.3);
          dynamicGroup.add(rLabel);
        }

        // Composite Satellite / Test Mass m
        const satScale = 0.82 + Math.min(0.45, Math.cbrt(p.testMassKg / 10) * 0.25);
        const sat = buildCompositeSatellite(satScale);
        sat.position.copy(probePos);
        dynamicGroup.add(sat);

        const probeLabel = makeLabelSprite(
          `m = ${p.testMassKg.toFixed(0)} kg`,
          '#fde68a',
          'rgba(18,14,6,0.94)',
          0.25
        );
        probeLabel.position.set(probePos.x, 0.92, 0);
        dynamicGroup.add(probeLabel);

        // Action-Reaction Attractive Force Pair F_g (2.6.A.1.i) & local field g
        const forceLen = Math.max(0.55, Math.min(2.15, 0.45 + Math.log10(1 + u.gravitationalForceN) * 0.62));
        if (p.showForcePair) {
          const fOnM = createVectorArrow3D(
            probePos.clone().add(new THREE.Vector3(-0.35, 0.16, 0)),
            new THREE.Vector3(-1, 0, 0),
            forceLen,
            AMBER_GOLD,
            0.048
          );
          dynamicGroup.add(fOnM);

          const fOnPlanet = createVectorArrow3D(
            planetPos.clone().add(new THREE.Vector3(planetRadius + 0.1, 0.16, 0)),
            new THREE.Vector3(1, 0, 0),
            forceLen,
            AMBER_GOLD,
            0.048
          );
          dynamicGroup.add(fOnPlanet);

          const fLabel = makeLabelSprite(
            `F_g = ${u.gravitationalForceN.toFixed(1)} N`,
            '#fcd34d',
            'rgba(22,15,4,0.94)',
            0.25
          );
          fLabel.position.set(probePos.x - forceLen * 0.55, 0.62, 0.2);
          dynamicGroup.add(fLabel);
        }

        // Observed free-fall acceleration vector a = g (2.6.A.2.ii)
        const aLen = Math.max(0.45, Math.min(1.6, 0.35 + (u.fieldStrengthNPerKg / 9.8) * 0.85));
        const aArrow = createVectorArrow3D(
          probePos.clone().add(new THREE.Vector3(-0.32, -0.34, 0)),
          new THREE.Vector3(-1, 0, 0),
          aLen,
          ROSE_MAIN,
          0.038
        );
        dynamicGroup.add(aArrow);

        const gReadout = makeLabelSprite(
          `|g| = ${u.fieldStrengthNPerKg.toFixed(2)} N/kg · a = ${u.observedAccelMs2.toFixed(2)} m/s²`,
          '#fda4af',
          'rgba(24,7,12,0.94)',
          0.24
        );
        gReadout.position.set(probePos.x - 0.5, -0.92, 0.25);
        dynamicGroup.add(gReadout);
      }

      // =====================================================================
      // MODE 2: NEAR-SURFACE CONSTANT g & INERTIAL/GRAVITATIONAL MASS (2.6.B & 2.6.D)
      // =====================================================================
      else if (p.mode === 'near_surface') {
        const ns = ev.nearSurface;

        // Left half: Planetary Horizon & Altitude Probe (2.6.B.1–2)
        const leftGroup = new THREE.Group();
        leftGroup.position.set(-1.75, -0.15, 0);

        const planetR = 1.32;
        const planet = buildCompositePlanet(
          planetR,
          ns.body.colorHex,
          ns.body.accentHex,
          ns.body.atmosphereHex,
          maxAniso
        );
        planet.position.set(0, -1.0, 0);
        leftGroup.add(planet);

        // Altitude mast & probe at h / R
        const hFrac = Math.min(1.15, p.altitudeKm / ns.body.radiusKm);
        const probeY = -1.0 + planetR + 0.25 + hFrac * 1.95;

        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, probeY - (-1.0 + planetR), 10),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.7 })
        );
        mast.position.set(0, (-1.0 + planetR + probeY) / 2, 0);
        leftGroup.add(mast);

        const altProbe = buildCompositeSatellite(0.62);
        altProbe.position.set(0, probeY, 0);
        leftGroup.add(altProbe);

        const gArrowLen = Math.max(0.32, Math.min(1.25, (ns.gAtAltitude / Math.max(1.5, ns.gSurface)) * 1.08));
        leftGroup.add(
          createVectorArrow3D(
            new THREE.Vector3(0.4, probeY, 0),
            new THREE.Vector3(0, -1, 0),
            gArrowLen,
            SKY_MAIN,
            0.036
          )
        );

        const altBadge = makeLabelSprite(
          `${ns.body.name}: h=${p.altitudeKm.toFixed(0)} km · g=${ns.gAtAltitude.toFixed(2)} N/kg`,
          ns.constantGValid ? '#6ee7b7' : '#fcd34d',
          'rgba(4,15,11,0.95)',
          0.2
        );
        altBadge.position.set(0.15, probeY + 0.56, 0.2);
        leftGroup.add(altBadge);

        const surfBadge = makeLabelSprite(
          `g₀=${ns.gSurface.toFixed(2)} N/kg · R=${ns.body.radiusKm} km`,
          '#bae6fd',
          'rgba(6,16,28,0.94)',
          0.19
        );
        surfBadge.position.set(0.1, -2.62, 0.2);
        leftGroup.add(surfBadge);

        dynamicGroup.add(leftGroup);

        // Right half: Vacuum Drop Rig proving m_g = m_i (2.6.D.1–3)
        const rig = new THREE.Group();
        rig.position.set(1.75, -0.15, 0);

        const towerH = 3.9;
        const basePad = new THREE.Mesh(
          new THREE.BoxGeometry(2.85, 0.22, 1.35),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.5 })
        );
        basePad.position.y = -towerH / 2;
        rig.add(basePad);

        const gantry = new THREE.Mesh(
          new THREE.BoxGeometry(2.85, 0.2, 1.1),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.7 })
        );
        gantry.position.y = towerH / 2;
        rig.add(gantry);

        // Twin vertical guide pillars
        for (const sx of [-1.26, 1.26]) {
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, towerH, 12),
            new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.25, metalness: 0.85 })
          );
          col.position.x = sx;
          rig.add(col);
        }

        // Heavy sphere m_1 (left lane) and Light sphere m_2 (right lane)
        const topY = towerH / 2 - 0.52;
        const travelSpan = towerH - 1.0;
        const heavyY = topY - (ns.heavyDropDistM / ns.dropHeightM) * travelSpan;
        const lightY = topY - (ns.lightDropDistM / ns.dropHeightM) * travelSpan;

        const rHeavy = 0.23 + Math.min(0.16, p.dropMassHeavyKg * 0.008);
        const rLight = 0.15 + Math.min(0.09, p.dropMassLightKg * 0.014);

        const heavySphere = new THREE.Mesh(
          new THREE.SphereGeometry(rHeavy, 24, 18),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.8 })
        );
        heavySphere.position.set(-0.56, heavyY, 0);
        rig.add(heavySphere);

        const lightSphere = new THREE.Mesh(
          new THREE.SphereGeometry(rLight, 24, 18),
          new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, roughness: 0.3, metalness: 0.65 })
        );
        lightSphere.position.set(0.56, lightY, 0);
        rig.add(lightSphere);

        // Force vectors F_g proportional to weight, and acceleration vectors a
        const maxFg = Math.max(ns.heavyFgN, ns.lightFgN, 1);
        const fHeavyLen = Math.max(0.3, (ns.heavyFgN / maxFg) * 1.25);
        const fLightLen = Math.max(0.22, (ns.lightFgN / maxFg) * 1.25);
        rig.add(
          createVectorArrow3D(
            new THREE.Vector3(-0.56, heavyY - rHeavy, 0),
            new THREE.Vector3(0, -1, 0),
            fHeavyLen,
            AMBER_GOLD,
            0.04
          )
        );
        rig.add(
          createVectorArrow3D(
            new THREE.Vector3(0.56, lightY - rLight, 0),
            new THREE.Vector3(0, -1, 0),
            fLightLen,
            AMBER_GOLD,
            0.03
          )
        );

        // Equal acceleration arrows beside each mass
        const aScale = 0.68 / Math.max(1, ns.gAtAltitude);
        rig.add(
          createVectorArrow3D(
            new THREE.Vector3(-1.0, heavyY, 0),
            new THREE.Vector3(0, -1, 0),
            Math.max(0.32, ns.heavyAccelMs2 * aScale),
            ROSE_MAIN,
            0.03
          )
        );
        rig.add(
          createVectorArrow3D(
            new THREE.Vector3(1.0, lightY, 0),
            new THREE.Vector3(0, -1, 0),
            Math.max(0.32, ns.lightAccelMs2 * aScale),
            ROSE_MAIN,
            0.03
          )
        );

        const rigTitle = makeLabelSprite(
          `Vacuum Drop (m_g/m_i=${p.hypotheticalMgOverMi.toFixed(2)}): ${p.dropMassHeavyKg}kg vs ${p.dropMassLightKg}kg`,
          '#ecfdf5',
          'rgba(4,15,11,0.95)',
          0.19
        );
        rigTitle.position.set(-0.14, towerH / 2 + 0.38, 0.2);
        rig.add(rigTitle);

        const dropStats = makeLabelSprite(
          `F_g1=${ns.heavyFgN.toFixed(0)}N (a=${ns.heavyAccelMs2.toFixed(1)}) · F_g2=${ns.lightFgN.toFixed(0)}N (a=${ns.lightAccelMs2.toFixed(1)})`,
          '#fcd34d',
          'rgba(18,14,4,0.95)',
          0.19
        );
        dropStats.position.set(-0.14, -towerH / 2 - 0.42, 0.2);
        rig.add(dropStats);

        dynamicGroup.add(rig);
      }

      // =====================================================================
      // MODE 3: APPARENT WEIGHT & EQUIVALENCE PRINCIPLE (2.6.C)
      // =====================================================================
      else if (p.mode === 'apparent_weight') {
        const ap = ev.apparent;

        if (!p.equivalenceSplit) {
          // Single Elevator Shaft + Scale Cabin + Live FBD
          const shaftH = 5.9;
          const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.75 });
          for (const sx of [-1.42, 1.42]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, shaftH, 0.14), railMat);
            rail.position.set(sx, -0.15, -0.35);
            dynamicGroup.add(rail);
          }

          // Overhead hoist beam
          const hoist = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.2, 0.85), railMat);
          hoist.position.set(0, shaftH / 2 - 0.15, 0);
          dynamicGroup.add(hoist);

          const cabinY = ap.cabinOffsetM * 0.45 - 0.15;
          const cabin = buildElevatorCabin(
            ap.apparentWeightFnN,
            ap.isWeightless,
            ap.isWeightless ? ROSE_MAIN : EMERALD_MAIN,
            false,
            null
          );
          cabin.position.set(0, cabinY, 0);
          dynamicGroup.add(cabin);

          // Suspension cable (snapped / broken in free fall!)
          const cableTopY = shaftH / 2 - 0.15;
          const cableLen = Math.max(0.2, cableTopY - (cabinY + 1.44));
          if (!ap.isWeightless) {
            const cable = new THREE.Mesh(
              new THREE.CylinderGeometry(0.032, 0.032, cableLen, 10),
              new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.3, metalness: 0.85 })
            );
            cable.position.set(0, cabinY + 1.44 + cableLen / 2, 0);
            dynamicGroup.add(cable);
          } else {
            const snapLabel = makeLabelSprite(
              'CABLE CUT — FREE FALL (F_N = 0)',
              '#fda4af',
              'rgba(32,6,14,0.95)',
              0.21
            );
            snapLabel.position.set(0, cabinY + 1.85, 0.25);
            dynamicGroup.add(snapLabel);
          }

          // FBD Force Vectors on Rider (Right of cabin, comfortably clear of right dock)
          const fbdOrigin = new THREE.Vector3(1.85, cabinY - 0.05, 0.25);
          const fScale = 1.25 / Math.max(100, ap.trueWeightFgN);

          // F_g downward (always present!)
          const fgLen = Math.max(0.42, Math.min(1.9, ap.trueWeightFgN * fScale));
          dynamicGroup.add(
            createVectorArrow3D(fbdOrigin, new THREE.Vector3(0, -1, 0), fgLen, AMBER_GOLD, 0.048)
          );
          const fgLbl = makeLabelSprite(
            `F_g = ${ap.trueWeightFgN.toFixed(0)} N`,
            '#fcd34d',
            'rgba(22,15,4,0.94)',
            0.21
          );
          fgLbl.position.set(fbdOrigin.x + 0.85, fbdOrigin.y - fgLen * 0.62, 0.25);
          dynamicGroup.add(fgLbl);

          // F_N upward (apparent weight)
          if (ap.apparentWeightFnN > 1) {
            const fnLen = Math.max(0.3, Math.min(2.15, ap.apparentWeightFnN * fScale));
            dynamicGroup.add(
              createVectorArrow3D(fbdOrigin, new THREE.Vector3(0, 1, 0), fnLen, EMERALD_MAIN, 0.048)
            );
            const fnLbl = makeLabelSprite(
              `F_N = ${ap.apparentWeightFnN.toFixed(0)} N`,
              '#6ee7b7',
              'rgba(4,18,13,0.94)',
              0.21
            );
            fnLbl.position.set(fbdOrigin.x + 0.85, fbdOrigin.y + fnLen * 0.62, 0.25);
            dynamicGroup.add(fnLbl);
          }

          // Cabin Acceleration Vector on Left
          if (Math.abs(ap.effectiveAccelMs2) > 0.08) {
            const dirY = ap.effectiveAccelMs2 > 0 ? 1 : -1;
            const aLen = Math.max(0.45, Math.min(1.65, Math.abs(ap.effectiveAccelMs2) * 0.15));
            dynamicGroup.add(
              createVectorArrow3D(
                new THREE.Vector3(-1.92, cabinY, 0.2),
                new THREE.Vector3(0, dirY, 0),
                aLen,
                ROSE_MAIN,
                0.045
              )
            );
            const aLbl = makeLabelSprite(
              `a_y = ${ap.effectiveAccelMs2 >= 0 ? '+' : ''}${ap.effectiveAccelMs2.toFixed(1)} m/s²`,
              '#fda4af',
              'rgba(28,8,14,0.94)',
              0.21
            );
            aLbl.position.set(-2.05, cabinY + dirY * (aLen + 0.34), 0.25);
            dynamicGroup.add(aLbl);
          }
        } else {
          // EQUIVALENCE PRINCIPLE SPLIT VIEW (2.6.C.4)
          // Left: Stationary Lab on Planet Surface (g = planetG, a = 0)
          const leftCabin = buildElevatorCabin(
            ap.trueWeightFgN,
            false,
            EMERALD_MAIN,
            false,
            ap.equivalenceBallDropM
          );
          leftCabin.scale.setScalar(0.84);
          leftCabin.position.set(-1.85, 0.15, 0);
          dynamicGroup.add(leftCabin);

          // Planetary ground slab beneath left cabin
          const groundSlab = new THREE.Mesh(
            new THREE.BoxGeometry(2.7, 0.5, 2.0),
            new THREE.MeshStandardMaterial({ color: 0x0f2922, roughness: 0.82, metalness: 0.15 })
          );
          groundSlab.position.set(-1.85, -1.28, 0);
          dynamicGroup.add(groundSlab);

          const planetLbl = makeLabelSprite(
            `Frame A: Planet (g=${p.planetG.toFixed(1)}, a=0)`,
            '#6ee7b7',
            'rgba(4,16,12,0.95)',
            0.2
          );
          planetLbl.position.set(-1.85, 1.82, 0.2);
          dynamicGroup.add(planetLbl);

          // Right: Deep-Space Rocket Accelerating Upward (g = 0, a = +planetG)
          const rightCabin = buildElevatorCabin(
            ap.equivalenceRocketFnN,
            false,
            AMBER_GOLD,
            true,
            ap.equivalenceBallDropM
          );
          rightCabin.scale.setScalar(0.84);
          rightCabin.position.set(1.85, 0.15, 0);
          dynamicGroup.add(rightCabin);

          const rocketLbl = makeLabelSprite(
            `Frame B: Rocket (g=0, a=+${p.planetG.toFixed(1)})`,
            '#fcd34d',
            'rgba(22,15,4,0.95)',
            0.2
          );
          rocketLbl.position.set(1.85, 1.82, 0.2);
          dynamicGroup.add(rocketLbl);

          // Central Equivalence Banner
          const eqLbl = makeLabelSprite(
            `IDENTICAL INSIDE: F_N = ${ap.trueWeightFgN.toFixed(0)} N & Synchronized Drop`,
            '#bae6fd',
            'rgba(7,17,28,0.95)',
            0.21
          );
          eqLbl.position.set(0, -2.6, 0.35);
          dynamicGroup.add(eqLbl);
        }
      }

      // =====================================================================
      // MODE 4: NEWTON'S SHELL THEOREM & UNIFORM SPHERE (2.6.E)
      // =====================================================================
      else {
        const sh = ev.shell;
        const Rvis = 2.05 * Math.pow(p.shellRadiusFactor, 0.45);
        const center = new THREE.Vector3(-0.35, 0, 0);

        // Cutaway angle exposes front-right octant/quadrant clearly to the camera
        const phiStart = Math.PI * 0.22;
        const phiLen = Math.PI * 1.48;

        if (p.shellKind === 'solid_sphere') {
          // Outer sphere (contributes F_outer = 0 when probe is inside!)
          const outerMat = new THREE.MeshStandardMaterial({
            color: sh.isInside ? 0x334155 : 0x0f766e,
            roughness: 0.55,
            metalness: 0.2,
            transparent: true,
            opacity: sh.isInside ? 0.32 : 0.78,
            side: THREE.DoubleSide,
            depthWrite: !sh.isInside,
          });
          const outerSphere = new THREE.Mesh(
            new THREE.SphereGeometry(Rvis, 36, 26, phiStart, phiLen),
            outerMat
          );
          outerSphere.position.copy(center);
          dynamicGroup.add(outerSphere);

          // Outer boundary wireframe equatorial ring
          const ringR = new THREE.Mesh(
            new THREE.TorusGeometry(Rvis, 0.025, 10, 64),
            new THREE.MeshStandardMaterial({
              color: SKY_MAIN,
              emissive: SKY_MAIN,
              emissiveIntensity: 0.35,
              roughness: 0.25,
            })
          );
          ringR.position.copy(center);
          dynamicGroup.add(ringR);

          // Enclosed Partial Mass Sphere m_partial = ρ (4/3)π r³ (bright emerald!)
          const activeRatio = Math.min(1.0, Math.abs(sh.animatedROverR));
          if (activeRatio > 0.04) {
            const rInnerVis = activeRatio * Rvis;
            const innerCore = new THREE.Mesh(
              new THREE.SphereGeometry(rInnerVis, 32, 24),
              new THREE.MeshStandardMaterial({
                color: EMERALD_MAIN,
                emissive: EMERALD_MAIN,
                emissiveIntensity: 0.28,
                roughness: 0.38,
                metalness: 0.25,
                transparent: true,
                opacity: 0.72,
              })
            );
            innerCore.position.copy(center);
            dynamicGroup.add(innerCore);
          }
        } else {
          // Thin Hollow Spherical Shell
          const shellMat = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9,
            emissive: 0x0369a1,
            emissiveIntensity: 0.18,
            roughness: 0.32,
            metalness: 0.65,
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const shellMesh = new THREE.Mesh(
            new THREE.SphereGeometry(Rvis, 38, 28, phiStart, phiLen),
            shellMat
          );
          shellMesh.position.copy(center);
          dynamicGroup.add(shellMesh);

          const rimRing = new THREE.Mesh(
            new THREE.TorusGeometry(Rvis, 0.032, 12, 64),
            new THREE.MeshStandardMaterial({
              color: 0x38bdf8,
              emissive: 0x38bdf8,
              emissiveIntensity: 0.4,
              roughness: 0.25,
              metalness: 0.8,
            })
          );
          rimRing.position.copy(center);
          dynamicGroup.add(rimRing);
        }

        // Diametral gravity tunnel axis line (from -1.15R to +2.65R)
        const boreGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(center.x - Rvis * 1.15, 0, 0),
          new THREE.Vector3(center.x + Rvis * 2.55, 0, 0),
        ]);
        const boreLine = new THREE.Line(
          boreGeo,
          new THREE.LineDashedMaterial({ color: 0x64748b, dashSize: 0.14, gapSize: 0.1 })
        );
        boreLine.computeLineDistances();
        dynamicGroup.add(boreLine);

        // Center point marker O
        const centerDot = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 })
        );
        centerDot.position.copy(center);
        dynamicGroup.add(centerDot);

        // Test Probe position along X axis at animatedROverR * Rvis
        const probePos = new THREE.Vector3(center.x + sh.animatedROverR * Rvis, 0, 0);
        const probe = buildCompositeSatellite(0.68);
        probe.position.copy(probePos);
        dynamicGroup.add(probe);

        // Hollow Shell Interior: Visualize Opposing Differential Solid-Angle Patches (2.6.E.1 & 2.6.E.2.i)
        if (
          p.shellKind === 'hollow_shell' &&
          Math.abs(sh.animatedROverR) < 0.96 &&
          p.showDifferentialPatches
        ) {
          const dNear = Math.max(0.18, Rvis - (probePos.x - center.x));
          const dFar = Math.max(0.18, Rvis + (probePos.x - center.x));
          const halfAngle = 0.22;

          // Near cone (smaller patch area, closer distance -> exact same dF!)
          const nearCone = new THREE.Mesh(
            new THREE.ConeGeometry(dNear * Math.tan(halfAngle), dNear, 18, 1, true),
            new THREE.MeshBasicMaterial({
              color: VIOLET_ACCENT,
              transparent: true,
              opacity: 0.24,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          nearCone.rotation.z = Math.PI / 2;
          nearCone.position.set(probePos.x + dNear / 2, 0, 0);
          dynamicGroup.add(nearCone);

          // Far cone (larger patch area, larger distance -> exact canceling dF!)
          const farCone = new THREE.Mesh(
            new THREE.ConeGeometry(dFar * Math.tan(halfAngle), dFar, 18, 1, true),
            new THREE.MeshBasicMaterial({
              color: AMBER_GOLD,
              transparent: true,
              opacity: 0.24,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          farCone.rotation.z = -Math.PI / 2;
          farCone.position.set(probePos.x - dFar / 2, 0, 0);
          dynamicGroup.add(farCone);

          // Equal & opposite differential pull vectors dF_near and dF_far
          dynamicGroup.add(
            createVectorArrow3D(probePos, new THREE.Vector3(1, 0, 0), 0.72, VIOLET_ACCENT, 0.032)
          );
          dynamicGroup.add(
            createVectorArrow3D(probePos, new THREE.Vector3(-1, 0, 0), 0.72, AMBER_GOLD, 0.032)
          );

          const cancelLbl = makeLabelSprite(
            'dF_near + dF_far = 0  ⇒  F_net = 0 N',
            '#ddd6fe',
            'rgba(18,10,32,0.95)',
            0.24
          );
          cancelLbl.position.set(probePos.x, 1.05, 0.25);
          dynamicGroup.add(cancelLbl);
        }

        // Net Gravitational Force Vector on Probe (when nonzero)
        const absF = Math.abs(sh.animatedSignedForceN);
        if (absF > 0.05) {
          const dirX = sh.animatedSignedForceN >= 0 ? 1 : -1;
          const surfaceF = sh.surfaceFieldG * p.probeMassKg;
          const fLen = Math.max(0.42, Math.min(2.0, (absF / Math.max(1, surfaceF)) * 1.65));
          dynamicGroup.add(
            createVectorArrow3D(
              probePos.clone().add(new THREE.Vector3(0, 0.28, 0)),
              new THREE.Vector3(dirX, 0, 0),
              fLen,
              AMBER_GOLD,
              0.048
            )
          );

          const fLbl = makeLabelSprite(
            p.shellKind === 'solid_sphere' && Math.abs(sh.animatedROverR) < 1
              ? `F_g = -kr = ${sh.animatedSignedForceN.toFixed(1)} N`
              : `F_g = ${absF.toFixed(1)} N (Point Mass M at Center)`,
            '#fcd34d',
            'rgba(22,15,4,0.95)',
            0.24
          );
          fLbl.position.set(probePos.x + dirX * fLen * 0.45, 0.92, 0.25);
          dynamicGroup.add(fLbl);
        }

        // Bottom radius & enclosed mass summary sprite
        const summaryText =
          p.shellKind === 'solid_sphere'
            ? `r = ${Math.abs(sh.animatedROverR).toFixed(2)} R · m_partial = ${(sh.partialMassFraction * 100).toFixed(1)}% M`
            : `r = ${Math.abs(sh.animatedROverR).toFixed(2)} R · ${Math.abs(sh.animatedROverR) < 1 ? 'Inside Cavity (m_enc = 0)' : 'Outside Shell (m_enc = 100% M)'}`;
        const sumLbl = makeLabelSprite(summaryText, '#6ee7b7', 'rgba(4,16,12,0.95)', 0.24);
        sumLbl.position.set(center.x + 0.65, -Rvis - 0.58, 0.2);
        dynamicGroup.add(sumLbl);
      }

      requestRender();
    };

    rebuildSceneRef.current = rebuildScene;

    applyCameraPreset(
      stateRef.current.params.mode,
      stateRef.current.viewMode,
      stateRef.current.params.equivalenceSplit
    );
    rebuildScene();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      applyCameraPreset(
        stateRef.current.params.mode,
        stateRef.current.viewMode,
        stateRef.current.params.equivalenceSplit
      );
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeObjectTree(dynamicGroup);
      starGeo.dispose();
      starMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Keep latest state ref synced outside render and rebuild dynamic 3D objects
  useEffect(() => {
    stateRef.current = { params, evaluation, viewMode };
    rebuildSceneRef.current?.();
  }, [params, evaluation, viewMode]);

  // Reset camera framing when switching mode, equivalence split, or 3D/2D view
  useEffect(() => {
    applyCameraPresetRef.current?.(params.mode, viewMode, params.equivalenceSplit);
  }, [params.mode, viewMode, params.equivalenceSplit]);

  return (
    <div
      ref={containerRef}
      data-testid="gravity26-viewport"
      data-mode={params.mode}
      data-view={viewMode}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};
