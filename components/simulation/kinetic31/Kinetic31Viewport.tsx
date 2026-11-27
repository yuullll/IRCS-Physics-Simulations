'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Kinetic31Evaluation,
  Kinetic31Mode,
  Kinetic31Params,
  clamp,
} from '@/lib/physics/kinetic-energy-3-1';

interface Kinetic31ViewportProps {
  params: Kinetic31Params;
  evaluation: Kinetic31Evaluation;
  viewMode: '3d' | '2d';
}

interface BadgeRig {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  lastText: string;
}

interface ArrowRig {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
  badge: BadgeRig;
}

function drawBadgeCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  borderColor: string,
  textColor = '#f8fafc',
  bgColor = 'rgba(4, 16, 13, 0.92)',
) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r + 4, 6);
  ctx.lineTo(w - r - 4, 6);
  ctx.quadraticCurveTo(w - 4, 6, w - 4, r + 6);
  ctx.lineTo(w - 4, h - r - 6);
  ctx.quadraticCurveTo(w - 4, h - 6, w - r - 4, h - 6);
  ctx.lineTo(r + 4, h - 6);
  ctx.quadraticCurveTo(4, h - 6, 4, h - r - 6);
  ctx.lineTo(4, r + 6);
  ctx.quadraticCurveTo(4, 6, r + 4, 6);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  ctx.font = '700 25px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
}

function createBadgeRig(
  initialText: string,
  borderColor: string,
  textColor = '#f8fafc',
  scaleX = 1.56,
  scaleY = 0.34,
): BadgeRig {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  drawBadgeCanvas(ctx, canvas, initialText, borderColor, textColor);
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.renderOrder = 30;
  return { sprite, canvas, ctx, tex, lastText: initialText };
}

function updateBadgeRig(
  rig: BadgeRig,
  text: string,
  borderColor: string,
  textColor = '#f8fafc',
) {
  if (rig.lastText === text) return;
  drawBadgeCanvas(rig.ctx, rig.canvas, text, borderColor, textColor);
  rig.tex.needsUpdate = true;
  rig.lastText = text;
}

function createArrowRig(
  colorHex: number,
  borderCss: string,
  textCss: string,
  initialLabel: string,
  radiusScale = 1,
): ArrowRig {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.36,
    roughness: 0.28,
    metalness: 0.2,
  });

  const shaftGeo = new THREE.CylinderGeometry(
    0.042 * radiusScale,
    0.042 * radiusScale,
    1,
    14,
  );
  shaftGeo.translate(0, 0.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, mat);

  const headGeo = new THREE.ConeGeometry(0.118 * radiusScale, 0.26 * radiusScale, 16);
  headGeo.translate(0, 0.13 * radiusScale, 0);
  const head = new THREE.Mesh(headGeo, mat);

  const badge = createBadgeRig(initialLabel, borderCss, textCss, 1.48, 0.32);
  group.add(shaft, head, badge.sprite);

  return { group, shaft, head, badge };
}

const UP_VEC = new THREE.Vector3(0, 1, 0);

function updateArrowRig(
  rig: ArrowRig,
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  visible: boolean,
  labelText: string,
  borderCss: string,
  textCss: string,
  labelOffset: THREE.Vector3,
) {
  rig.group.visible = visible && length > 0.08 && dir.lengthSq() > 1e-8;
  if (!rig.group.visible) return;

  const clampedLen = clamp(length, 0.24, 2.75);
  const shaftLen = Math.max(0.06, clampedLen - 0.25);

  rig.group.position.copy(origin);
  const unitDir = dir.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(UP_VEC, unitDir);

  rig.shaft.quaternion.copy(quat);
  rig.shaft.scale.set(1, shaftLen, 1);

  rig.head.quaternion.copy(quat);
  rig.head.position.copy(unitDir).multiplyScalar(shaftLen);

  rig.badge.sprite.position
    .copy(unitDir)
    .multiplyScalar(clampedLen + 0.3)
    .add(labelOffset);
  updateBadgeRig(rig.badge, labelText, borderCss, textCss);
}

function createDashedSegment(colorHex: number): THREE.Line {
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize: 0.14,
    gapSize: 0.09,
    transparent: true,
    opacity: 0.78,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

function updateSegment(line: THREE.Line, a: THREE.Vector3, b: THREE.Vector3, visible: boolean) {
  line.visible = visible && a.distanceToSquared(b) > 1e-6;
  if (!line.visible) return;
  const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute;
  pos.setXYZ(0, a.x, a.y, a.z);
  pos.setXYZ(1, b.x, b.y, b.z);
  pos.needsUpdate = true;
  line.computeLineDistances();
}

function createCircleLine(
  radius: number,
  segments: number,
  colorHex: number,
  plane: 'xy' | 'xz',
  opacity = 0.72,
): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    if (plane === 'xy') {
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    } else {
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity,
  });
  return new THREE.LineLoop(geo, mat);
}

export const Kinetic31Viewport: React.FC<Kinetic31ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef({ params, evaluation, viewMode });
  const requestRenderRef = useRef<() => void>(() => {});
  const lastCameraSigRef = useRef<string>('');
  const syncCameraRef = useRef<(mode: Kinetic31Mode, vm: '3d' | '2d') => void>(() => {});

  useEffect(() => {
    latestPropsRef.current = { params, evaluation, viewMode };
    const sig = `${params.mode}:${viewMode}`;
    if (lastCameraSigRef.current !== sig) {
      lastCameraSigRef.current = sig;
      syncCameraRef.current(params.mode, viewMode);
    }
    requestRenderRef.current();
  }, [params, evaluation, viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040c0a');
    scene.fog = new THREE.FogExp2('#040c0a', 0.017);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 160);
    camera.position.set(2.4, 3.3, 10.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.2;
    controls.maxDistance = 26;
    controls.target.set(0, 0.2, 0);

    // Studio lab lighting
    const hemiLight = new THREE.HemisphereLight('#a7f3d0', '#061310', 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#f8fafc', 1.8);
    keyLight.position.set(7, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#34d399', 0.85);
    rimLight.position.set(-8, 4, -7);
    scene.add(rimLight);

    // Lab bench floor & grid
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#061511',
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(34, 34, '#10b981', '#0c2921');
    grid.position.y = -2.19;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.3;
    });
    scene.add(grid);

    // Shared PBR materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#0f231e',
      roughness: 0.35,
      metalness: 0.78,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.18,
      metalness: 0.92,
    });
    const emeraldMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#064e3b',
      emissiveIntensity: 0.45,
      roughness: 0.22,
      metalness: 0.52,
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#78350f',
      emissiveIntensity: 0.4,
      roughness: 0.24,
      metalness: 0.5,
    });
    const skyMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0c4a6e',
      emissiveIntensity: 0.4,
      roughness: 0.24,
      metalness: 0.5,
    });

    // =========================================================================
    // GROUP 1: MASS & SPEED SCALING TRACK (3.1.A.1)
    // =========================================================================
    const scalingGroup = new THREE.Group();
    scene.add(scalingGroup);

    const trackLength = 9.2;
    const trackDeck = new THREE.Mesh(
      new THREE.BoxGeometry(trackLength, 0.22, 1.35),
      darkMetalMat,
    );
    trackDeck.position.set(0, -1.05, 0);
    trackDeck.receiveShadow = true;
    scalingGroup.add(trackDeck);

    // Glowing guide rails
    for (const rz of [-0.48, 0.48]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(trackLength - 0.1, 0.06, 0.08),
        chromeMat,
      );
      rail.position.set(0, -0.91, rz);
      scalingGroup.add(rail);
    }

    // Track meter ticks
    for (let x = -4; x <= 4; x += 1) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, 1.1),
        new THREE.MeshStandardMaterial({
          color: x === 0 ? '#34d399' : '#334155',
          emissive: x === 0 ? '#10b981' : '#000000',
          emissiveIntensity: x === 0 ? 0.6 : 0,
        }),
      );
      tick.position.set(x, -0.93, 0);
      scalingGroup.add(tick);
    }

    // Air-track sled (scaled smoothly with m^(1/3))
    const sledGroup = new THREE.Group();
    const sledBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.52, 0.72),
      emeraldMat,
    );
    sledBody.castShadow = true;
    const sledCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.14, 0.54),
      chromeMat,
    );
    sledCap.position.y = 0.32;
    const sledSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.08, 0.8),
      new THREE.MeshStandardMaterial({
        color: '#34d399',
        emissive: '#10b981',
        emissiveIntensity: 0.75,
      }),
    );
    sledSkirt.position.y = -0.26;
    sledGroup.add(sledBody, sledCap, sledSkirt);
    scalingGroup.add(sledGroup);

    const sledMassBadge = createBadgeRig('m=2.0kg', '#10b981', '#a7f3d0', 1.38, 0.3);
    scalingGroup.add(sledMassBadge.sprite);

    const scalingArrowV = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v=5.0m/s');
    scalingGroup.add(scalingArrowV.group);

    // Rear 3D Illuminated Energy Bar Towers (Current K vs Reference K0)
    const towersRig = new THREE.Group();
    towersRig.position.set(0, -1.16, -2.15);
    scalingGroup.add(towersRig);

    const towerPedestal = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.18, 1.15),
      darkMetalMat,
    );
    towerPedestal.position.y = 0.09;
    towersRig.add(towerPedestal);

    const towerUnitGeo = new THREE.BoxGeometry(0.68, 1, 0.68);
    towerUnitGeo.translate(0, 0.5, 0);

    const kTowerMesh = new THREE.Mesh(
      towerUnitGeo,
      new THREE.MeshStandardMaterial({
        color: '#10b981',
        emissive: '#059669',
        emissiveIntensity: 0.6,
        roughness: 0.2,
      }),
    );
    kTowerMesh.position.set(-0.72, 0.18, 0);
    towersRig.add(kTowerMesh);

    const k0TowerMesh = new THREE.Mesh(
      towerUnitGeo,
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#b45309',
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.72,
        roughness: 0.25,
      }),
    );
    k0TowerMesh.position.set(0.72, 0.18, 0);
    towersRig.add(k0TowerMesh);

    const kTowerBadge = createBadgeRig('K = 25.0 J (1.00x)', '#10b981', '#a7f3d0', 1.85, 0.34);
    const k0TowerBadge = createBadgeRig('Ref K₀ = 25.0 J', '#f59e0b', '#fde68a', 1.65, 0.32);
    towersRig.add(kTowerBadge.sprite, k0TowerBadge.sprite);

    // =========================================================================
    // GROUP 2: 2D SCALAR DIRECTION-INVARIANCE ARENA (3.1.A.2)
    // =========================================================================
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const arenaRadius = 3.2;
    const arenaDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(arenaRadius, arenaRadius + 0.15, 0.22, 64),
      darkMetalMat,
    );
    arenaDisc.position.set(-0.6, -1.05, 0);
    arenaDisc.receiveShadow = true;
    arenaGroup.add(arenaDisc);

    const arenaRim = new THREE.Mesh(
      new THREE.TorusGeometry(arenaRadius, 0.06, 16, 72),
      chromeMat,
    );
    arenaRim.rotation.x = Math.PI / 2;
    arenaRim.position.set(-0.6, -0.92, 0);
    arenaGroup.add(arenaRim);

    const arenaOrbitRing = createCircleLine(1.9, 64, 0x34d399, 'xz', 0.38);
    arenaOrbitRing.position.set(-0.6, -0.91, 0);
    arenaGroup.add(arenaOrbitRing);

    // Cardinal X/Y axes on arena surface
    const arenaAxisX = createDashedSegment(0x38bdf8);
    const arenaAxisZ = createDashedSegment(0xf59e0b);
    arenaGroup.add(arenaAxisX, arenaAxisZ);
    updateSegment(
      arenaAxisX,
      new THREE.Vector3(-0.6 - arenaRadius + 0.2, -0.91, 0),
      new THREE.Vector3(-0.6 + arenaRadius - 0.2, -0.91, 0),
      true,
    );
    updateSegment(
      arenaAxisZ,
      new THREE.Vector3(-0.6, -0.91, -(arenaRadius - 0.2)),
      new THREE.Vector3(-0.6, -0.91, arenaRadius - 0.2),
      true,
    );

    const arenaDeg0 = createBadgeRig('0° (+x)', '#38bdf8', '#bae6fd', 1.05, 0.26);
    arenaDeg0.sprite.position.set(-0.6 + arenaRadius + 0.45, -0.75, 0);
    const arenaDeg90 = createBadgeRig('90° (+y)', '#f59e0b', '#fde68a', 1.05, 0.26);
    arenaDeg90.sprite.position.set(-0.6, -0.75, -(arenaRadius + 0.4));
    arenaGroup.add(arenaDeg0.sprite, arenaDeg90.sprite);

    // Puck 1 (Emerald) & optional Puck 2 (Amber opposite-direction system)
    const puck1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.2, 28),
      emeraldMat,
    );
    puck1.castShadow = true;
    const puck2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.2, 28),
      amberMat,
    );
    puck2.castShadow = true;
    arenaGroup.add(puck1, puck2);

    const arenaArrowV1 = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v₁');
    const arenaArrowVx = createArrowRig(0x22d3ee, '#22d3ee', '#cffafe', 'v_x', 0.8);
    const arenaArrowVy = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'v_y', 0.8);
    const arenaArrowV2 = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'v₂=-v₁');
    arenaGroup.add(
      arenaArrowV1.group,
      arenaArrowVx.group,
      arenaArrowVy.group,
      arenaArrowV2.group,
    );

    // Stacked Scalar Energy Pillar (Kx + Ky = Constant K) on right side of arena
    const scalarPillarRig = new THREE.Group();
    scalarPillarRig.position.set(3.55, -1.16, 0);
    arenaGroup.add(scalarPillarRig);

    const pillarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.74, 0.18, 24),
      darkMetalMat,
    );
    pillarBase.position.y = 0.09;
    scalarPillarRig.add(pillarBase);

    const pillarSegGeo = new THREE.CylinderGeometry(0.36, 0.36, 1, 24);
    pillarSegGeo.translate(0, 0.5, 0);

    const kxBarMesh = new THREE.Mesh(pillarSegGeo, skyMat);
    kxBarMesh.position.y = 0.18;
    const kyBarMesh = new THREE.Mesh(pillarSegGeo, amberMat);
    kyBarMesh.position.y = 0.18;
    const kFrameMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#34d399',
        emissive: '#10b981',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      }),
    );
    kFrameMesh.geometry.translate(0, 0.5, 0);
    kFrameMesh.position.y = 0.18;
    scalarPillarRig.add(kxBarMesh, kyBarMesh, kFrameMesh);

    const scalarPillarBadge = createBadgeRig(
      'K = Kx + Ky = 36.0 J',
      '#10b981',
      '#a7f3d0',
      1.95,
      0.34,
    );
    const sysPillarBadge = createBadgeRig('Σp=0 · K_sys=72.0J', '#f59e0b', '#fde68a', 1.95, 0.32);
    scalarPillarRig.add(scalarPillarBadge.sprite, sysPillarBadge.sprite);

    // =========================================================================
    // GROUP 3: REFERENCE FRAMES LAB (3.1.A.3)
    // =========================================================================
    const framesGroup = new THREE.Group();
    scene.add(framesGroup);

    // Dual railway beds (Back = Object P lane, Front = Observer O lane)
    const railBedP = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.18, 0.9), darkMetalMat);
    railBedP.position.set(0, -1.06, -0.85);
    const railBedO = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.18, 0.9), darkMetalMat);
    railBedO.position.set(0, -1.06, 0.95);
    framesGroup.add(railBedP, railBedO);

    // Scrolling ground pylons to visually encode Earth vs Observer reference frame motion
    const pylonGroup = new THREE.Group();
    framesGroup.add(pylonGroup);
    const pylons: THREE.Mesh[] = [];
    for (let i = -6; i <= 6; i++) {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.45, 0.08),
        new THREE.MeshStandardMaterial({
          color: '#334155',
          emissive: '#0f172a',
        }),
      );
      pylon.position.set(i * 1.1, -0.82, -1.65);
      pylons.push(pylon);
      pylonGroup.add(pylon);
    }

    // Earth Station E beacon
    const earthStation = new THREE.Group();
    const earthBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.55, 16), skyMat);
    const earthMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.75, 12), chromeMat);
    earthMast.position.y = 0.55;
    earthStation.add(earthBase, earthMast);
    earthStation.position.set(-4.3, -0.78, -1.9);
    framesGroup.add(earthStation);
    const earthBadge = createBadgeRig('EARTH STATION E', '#38bdf8', '#bae6fd', 1.65, 0.3);
    framesGroup.add(earthBadge.sprite);

    // Object P aerodynamic pod
    const objectP = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.44, 0.58), emeraldMat);
    pBody.castShadow = true;
    const pDome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), chromeMat);
    pDome.position.y = 0.22;
    objectP.add(pBody, pDome);
    framesGroup.add(objectP);
    const pBadge = createBadgeRig('OBJECT P', '#10b981', '#a7f3d0', 1.45, 0.3);
    framesGroup.add(pBadge.sprite);

    // Observer O railcar
    const observerO = new THREE.Group();
    const oBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 0.58), amberMat);
    oBody.castShadow = true;
    const oSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 16), chromeMat);
    oSensor.position.y = 0.3;
    observerO.add(oBody, oSensor);
    framesGroup.add(observerO);
    const oBadge = createBadgeRig('OBSERVER O', '#f59e0b', '#fde68a', 1.55, 0.3);
    framesGroup.add(oBadge.sprite);

    const frameArrowObj = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'v_P');
    const frameArrowObs = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'v_O');
    framesGroup.add(frameArrowObj.group, frameArrowObs.group);

    // Dual Frame Energy Bars (K_P/E vs K_P/O)
    const frameBarGroup = new THREE.Group();
    frameBarGroup.position.set(0, -1.16, -2.55);
    framesGroup.add(frameBarGroup);
    const kEarthBar = new THREE.Mesh(towerUnitGeo, skyMat);
    kEarthBar.position.set(-0.9, 0.18, 0);
    const kObsBar = new THREE.Mesh(towerUnitGeo, amberMat);
    kObsBar.position.set(0.9, 0.18, 0);
    frameBarGroup.add(kEarthBar, kObsBar);
    const kEarthBarBadge = createBadgeRig('K_P/E = 64.0 J', '#38bdf8', '#bae6fd', 1.75, 0.32);
    const kObsBarBadge = createBadgeRig('K_P/O = 25.0 J', '#f59e0b', '#fde68a', 1.75, 0.32);
    frameBarGroup.add(kEarthBarBadge.sprite, kObsBarBadge.sprite);

    // =========================================================================
    // GROUP 4: DUAL SCENARIO COMPARISON (SKILL 2.C)
    // =========================================================================
    const compareGroup = new THREE.Group();
    scene.add(compareGroup);

    const laneADeck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.18, 1.05), darkMetalMat);
    laneADeck.position.set(-0.4, -1.06, -0.95);
    laneADeck.receiveShadow = true;
    const laneBDeck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.18, 1.05), darkMetalMat);
    laneBDeck.position.set(-0.4, -1.06, 0.95);
    laneBDeck.receiveShadow = true;
    compareGroup.add(laneADeck, laneBDeck);

    const cartA = new THREE.Group();
    const cartABody = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.64), emeraldMat);
    cartABody.castShadow = true;
    cartA.add(cartABody);
    compareGroup.add(cartA);

    const cartB = new THREE.Group();
    const cartBBody = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.64), amberMat);
    cartBBody.castShadow = true;
    cartB.add(cartBBody);
    compareGroup.add(cartB);

    const cartABadge = createBadgeRig('Cart A: m=1kg', '#10b981', '#a7f3d0', 1.5, 0.3);
    const cartBBadge = createBadgeRig('Cart B: m=4kg', '#f59e0b', '#fde68a', 1.5, 0.3);
    compareGroup.add(cartABadge.sprite, cartBBadge.sprite);

    const compareArrowA = createArrowRig(0x34d399, '#34d399', '#a7f3d0', 'v_A');
    const compareArrowB = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'v_B');
    compareGroup.add(compareArrowA.group, compareArrowB.group);

    // Compare Energy Towers on right end
    const compareTowers = new THREE.Group();
    compareTowers.position.set(4.95, -1.16, 0);
    compareGroup.add(compareTowers);
    const cTowerBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 3.0), darkMetalMat);
    cTowerBase.position.y = 0.09;
    compareTowers.add(cTowerBase);

    const cTowerA = new THREE.Mesh(towerUnitGeo, emeraldMat);
    cTowerA.position.set(0, 0.18, -0.82);
    const cTowerB = new THREE.Mesh(towerUnitGeo, amberMat);
    cTowerB.position.set(0, 0.18, 0.82);
    compareTowers.add(cTowerA, cTowerB);

    const cTowerABadge = createBadgeRig('K_A = 32.0 J', '#10b981', '#a7f3d0', 1.65, 0.32);
    const cTowerBBadge = createBadgeRig('K_B = 8.0 J', '#f59e0b', '#fde68a', 1.65, 0.32);
    const cRatioBadge = createBadgeRig('K_B / K_A = 0.25x', '#38bdf8', '#bae6fd', 1.85, 0.34);
    compareTowers.add(cTowerABadge.sprite, cTowerBBadge.sprite, cRatioBadge.sprite);

    // =========================================================================
    // CAMERA SYNC FOR 3D vs 2D VIEWS
    // =========================================================================
    const syncCamera = (mode: Kinetic31Mode, vm: '3d' | '2d') => {
      if (vm === '2d') {
        if (mode === 'scalar_arena') {
          camera.position.set(0.8, 11.2, 0.05);
          controls.target.set(0.8, -0.9, 0);
        } else {
          camera.position.set(0.2, 0.55, 11.6);
          controls.target.set(0.2, 0.15, 0);
        }
        controls.enableRotate = false;
      } else {
        if (mode === 'scalar_arena') {
          camera.position.set(1.2, 6.2, 8.8);
          controls.target.set(0.8, -0.4, 0);
        } else if (mode === 'observer_frames') {
          camera.position.set(1.8, 3.5, 10.6);
          controls.target.set(0, 0.1, -0.4);
        } else if (mode === 'scenario_compare') {
          camera.position.set(2.4, 3.6, 10.6);
          controls.target.set(0.5, 0.2, 0);
        } else {
          camera.position.set(2.2, 3.2, 10.4);
          controls.target.set(0, 0.2, -0.4);
        }
        controls.enableRotate = true;
      }
      controls.update();
    };
    syncCameraRef.current = syncCamera;
    syncCamera(latestPropsRef.current.params.mode, latestPropsRef.current.viewMode);

    // =========================================================================
    // SCENE UPDATE & RENDER FUNCTION
    // =========================================================================
    const renderScene = () => {
      const { params: p, evaluation: ev } = latestPropsRef.current;

      scalingGroup.visible = p.mode === 'scaling_track';
      arenaGroup.visible = p.mode === 'scalar_arena';
      framesGroup.visible = p.mode === 'observer_frames';
      compareGroup.visible = p.mode === 'scenario_compare';

      if (p.mode === 'scaling_track') {
        const s = ev.scaling;
        const scaleM = Math.pow(s.massKg / 2.0, 1 / 3);
        sledGroup.scale.setScalar(clamp(scaleM, 0.68, 1.55));
        const sledY = -0.92 + 0.28 * clamp(scaleM, 0.68, 1.55);
        sledGroup.position.set(p.trackPosM, sledY, 0);

        sledMassBadge.sprite.position.set(p.trackPosM, sledY + 0.62, 0);
        updateBadgeRig(
          sledMassBadge,
          `m=${s.massKg.toFixed(1)}kg`,
          '#10b981',
          '#a7f3d0',
        );

        updateArrowRig(
          scalingArrowV,
          new THREE.Vector3(p.trackPosM, sledY + 0.1, 0),
          new THREE.Vector3(1, 0, 0),
          s.speedMs * 0.19,
          p.showVectors && s.speedMs > 0.05,
          `v=${s.speedMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.34, 0),
        );

        towersRig.visible = p.showEnergyTowers;
        if (p.showEnergyTowers) {
          const maxRef = Math.max(s.kineticJ, s.refKineticJ, 50);
          const hK = clamp((s.kineticJ / maxRef) * 2.65, 0.08, 2.85);
          const hK0 = clamp((s.refKineticJ / maxRef) * 2.65, 0.08, 2.85);
          kTowerMesh.scale.y = hK;
          k0TowerMesh.scale.y = hK0;

          kTowerBadge.sprite.position.set(-0.72, 0.45 + hK, 0);
          k0TowerBadge.sprite.position.set(0.72, 0.45 + hK0, 0);
          updateBadgeRig(
            kTowerBadge,
            `K=${s.kineticJ.toFixed(1)}J (${s.energyRatio.toFixed(2)}x)`,
            '#10b981',
            '#a7f3d0',
          );
          updateBadgeRig(
            k0TowerBadge,
            `Ref K₀=${s.refKineticJ.toFixed(1)}J`,
            '#f59e0b',
            '#fde68a',
          );
        }
      } else if (p.mode === 'scalar_arena') {
        const a = ev.arena;
        const cx = -0.6;
        const px = cx + p.arenaPosX;
        const pz = -p.arenaPosY; // +y physics points toward -z on table
        puck1.position.set(px, -0.82, pz);

        const puckScale = clamp(Math.pow(a.massKg / 2.0, 1 / 3), 0.72, 1.45);
        puck1.scale.setScalar(puckScale);
        puck2.scale.setScalar(puckScale);

        arenaOrbitRing.visible = p.arenaPattern === 'circular';

        const dir1 = new THREE.Vector3(Math.cos(a.headingRad), 0, -Math.sin(a.headingRad));
        updateArrowRig(
          arenaArrowV1,
          new THREE.Vector3(px, -0.68, pz),
          dir1,
          a.speedMs * 0.21,
          p.showVectors && a.speedMs > 0.05,
          `v=${a.speedMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.35, 0),
        );

        updateArrowRig(
          arenaArrowVx,
          new THREE.Vector3(px, -0.74, pz),
          new THREE.Vector3(a.vxMs >= 0 ? 1 : -1, 0, 0),
          Math.abs(a.vxMs) * 0.21,
          p.showVectors && p.showComponents && Math.abs(a.vxMs) > 0.12,
          `vx=${a.vxMs.toFixed(1)}`,
          '#22d3ee',
          '#cffafe',
          new THREE.Vector3(0, 0.24, 0.28),
        );

        updateArrowRig(
          arenaArrowVy,
          new THREE.Vector3(px, -0.74, pz),
          new THREE.Vector3(0, 0, a.vyMs >= 0 ? -1 : 1),
          Math.abs(a.vyMs) * 0.21,
          p.showVectors && p.showComponents && Math.abs(a.vyMs) > 0.12,
          `vy=${a.vyMs.toFixed(1)}`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0.28, 0.24, 0),
        );

        puck2.visible = a.showTwoPuckSystem;
        if (a.showTwoPuckSystem) {
          const px2 = cx - p.arenaPosX;
          const pz2 = p.arenaPosY;
          puck2.position.set(px2, -0.82, pz2);
          updateArrowRig(
            arenaArrowV2,
            new THREE.Vector3(px2, -0.68, pz2),
            dir1.clone().negate(),
            a.speedMs * 0.21,
            p.showVectors && a.speedMs > 0.05,
            `v₂=-v₁`,
            '#f59e0b',
            '#fde68a',
            new THREE.Vector3(0, 0.35, 0),
          );
        } else {
          arenaArrowV2.group.visible = false;
        }

        scalarPillarRig.visible = p.showEnergyTowers;
        if (p.showEnergyTowers) {
          const totalH = clamp(a.kineticJ / 60 + 0.35, 0.2, 2.75);
          const fracX = a.kineticJ > 1e-6 ? a.kxJ / a.kineticJ : 0.5;
          const hX = Math.max(0.02, totalH * fracX);
          const hY = Math.max(0.02, totalH * (1 - fracX));

          kxBarMesh.scale.y = hX;
          kyBarMesh.position.y = 0.18 + hX;
          kyBarMesh.scale.y = hY;
          kFrameMesh.scale.y = totalH;

          scalarPillarBadge.sprite.position.set(0, 0.5 + totalH, 0);
          updateBadgeRig(
            scalarPillarBadge,
            `K=Kx+Ky=${a.kineticJ.toFixed(1)}J`,
            '#10b981',
            '#a7f3d0',
          );

          sysPillarBadge.sprite.visible = a.showTwoPuckSystem;
          sysPillarBadge.sprite.position.set(0, 0.92 + totalH, 0);
          updateBadgeRig(
            sysPillarBadge,
            `Σp=0 · K_sys=${a.sysTotalKineticJ.toFixed(1)}J`,
            '#f59e0b',
            '#fde68a',
          );
        }
      } else if (p.mode === 'observer_frames') {
        const f = ev.frames;
        const viewShiftVel = p.activeViewFrame === 'earth' ? 0 : f.vObsRelEarthMs;
        const wrapTrack = (x: number) => {
          const span = 9.2;
          return ((((x + span / 2) % span) + span) % span) - span / 2;
        };

        // Pylon scrolling shows relative ground motion when riding Observer O
        const pylonShift = -viewShiftVel * p.frameSimTimeS * 0.42;
        for (let i = 0; i < pylons.length; i++) {
          const base = (i - 6) * 1.1;
          const span = 13.2;
          const px = ((((base + pylonShift + span / 2) % span) + span) % span) - span / 2;
          pylons[i].position.x = px;
        }

        const xEarth =
          p.activeViewFrame === 'earth'
            ? -4.3
            : wrapTrack(-4.3 - viewShiftVel * p.frameSimTimeS * 0.42);
        earthStation.position.x = xEarth;
        earthBadge.sprite.position.set(xEarth, 0.45, -1.9);

        const xObj = wrapTrack((f.vObjRelEarthMs - viewShiftVel) * p.frameSimTimeS * 0.42 - 1.2);
        const xObs =
          p.activeViewFrame === 'observer_b'
            ? 0
            : wrapTrack((f.vObsRelEarthMs - viewShiftVel) * p.frameSimTimeS * 0.42 - 1.2);

        objectP.position.set(xObj, -0.74, -0.85);
        observerO.position.set(xObs, -0.74, 0.95);

        pBadge.sprite.position.set(xObj, 0.02, -0.85);
        oBadge.sprite.position.set(xObs, 0.02, 0.95);

        const vObjShown =
          p.activeViewFrame === 'earth' ? f.vObjRelEarthMs : f.vObjRelObserverMs;
        const vObsShown = p.activeViewFrame === 'earth' ? f.vObsRelEarthMs : 0;

        updateBadgeRig(
          pBadge,
          `P (${p.activeViewFrame === 'earth' ? 'Earth' : 'Obs O'}: ${vObjShown.toFixed(1)}m/s)`,
          '#10b981',
          '#a7f3d0',
        );
        updateBadgeRig(
          oBadge,
          p.activeViewFrame === 'observer_b' ? 'OBSERVER O (YOU: 0)' : `O (${f.vObsRelEarthMs.toFixed(1)}m/s)`,
          '#f59e0b',
          '#fde68a',
        );

        updateArrowRig(
          frameArrowObj,
          new THREE.Vector3(xObj, -0.42, -0.85),
          new THREE.Vector3(vObjShown >= 0 ? 1 : -1, 0, 0),
          Math.abs(vObjShown) * 0.16,
          p.showVectors && Math.abs(vObjShown) > 0.08,
          `v=${vObjShown.toFixed(1)}`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0, 0.25, 0),
        );

        updateArrowRig(
          frameArrowObs,
          new THREE.Vector3(xObs, -0.42, 0.95),
          new THREE.Vector3(vObsShown >= 0 ? 1 : -1, 0, 0),
          Math.abs(vObsShown) * 0.16,
          p.showVectors && Math.abs(vObsShown) > 0.08,
          `v_O=${vObsShown.toFixed(1)}`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0, 0.25, 0),
        );

        frameBarGroup.visible = p.showEnergyTowers;
        if (p.showEnergyTowers) {
          const maxK = Math.max(f.kEarthJ, f.kObserverJ, 40);
          const hE = clamp((f.kEarthJ / maxK) * 2.35, 0.06, 2.55);
          const hO = clamp((f.kObserverJ / maxK) * 2.35, 0.06, 2.55);
          kEarthBar.scale.y = hE;
          kObsBar.scale.y = hO;
          kEarthBarBadge.sprite.position.set(-0.9, 0.45 + hE, 0);
          kObsBarBadge.sprite.position.set(0.9, 0.45 + hO, 0);
          updateBadgeRig(
            kEarthBarBadge,
            `K_P/E=${f.kEarthJ.toFixed(1)}J`,
            '#38bdf8',
            '#bae6fd',
          );
          updateBadgeRig(
            kObsBarBadge,
            `K_P/O=${f.kObserverJ.toFixed(1)}J`,
            '#f59e0b',
            '#fde68a',
          );
        }
      } else {
        // scenario_compare
        const c = ev.compare;
        const sA = clamp(Math.pow(c.massAKg / 2.0, 1 / 3), 0.68, 1.5);
        const sB = clamp(Math.pow(c.massBKg / 2.0, 1 / 3), 0.68, 1.5);
        cartA.scale.setScalar(sA);
        cartB.scale.setScalar(sB);

        const yA = -0.96 + 0.25 * sA;
        const yB = -0.96 + 0.25 * sB;
        cartA.position.set(p.comparePosA, yA, -0.95);
        cartB.position.set(p.comparePosB, yB, 0.95);

        cartABadge.sprite.position.set(p.comparePosA, yA + 0.56, -0.95);
        cartBBadge.sprite.position.set(p.comparePosB, yB + 0.56, 0.95);
        updateBadgeRig(
          cartABadge,
          `A: ${c.massAKg.toFixed(1)}kg`,
          '#10b981',
          '#a7f3d0',
        );
        updateBadgeRig(
          cartBBadge,
          `B: ${c.massBKg.toFixed(1)}kg`,
          '#f59e0b',
          '#fde68a',
        );

        updateArrowRig(
          compareArrowA,
          new THREE.Vector3(p.comparePosA, yA + 0.1, -0.95),
          new THREE.Vector3(c.velAMs >= 0 ? 1 : -1, 0, 0),
          c.speedAMs * 0.16,
          p.showVectors && c.speedAMs > 0.05,
          `v_A=${c.velAMs.toFixed(1)}`,
          '#34d399',
          '#a7f3d0',
          new THREE.Vector3(0, 0.28, 0),
        );

        updateArrowRig(
          compareArrowB,
          new THREE.Vector3(p.comparePosB, yB + 0.1, 0.95),
          new THREE.Vector3(c.velBMs >= 0 ? 1 : -1, 0, 0),
          c.speedBMs * 0.16,
          p.showVectors && c.speedBMs > 0.05,
          `v_B=${c.velBMs.toFixed(1)}`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0, 0.28, 0),
        );

        compareTowers.visible = p.showEnergyTowers;
        if (p.showEnergyTowers) {
          const maxK = Math.max(c.kAJ, c.kBJ, 40);
          const hA = clamp((c.kAJ / maxK) * 2.55, 0.06, 2.75);
          const hB = clamp((c.kBJ / maxK) * 2.55, 0.06, 2.75);
          cTowerA.scale.y = hA;
          cTowerB.scale.y = hB;

          cTowerABadge.sprite.position.set(0, 0.45 + hA, -0.82);
          cTowerBBadge.sprite.position.set(0, 0.45 + hB, 0.82);
          cRatioBadge.sprite.position.set(0, 0.92 + Math.max(hA, hB), 0);

          updateBadgeRig(cTowerABadge, `K_A=${c.kAJ.toFixed(1)}J`, '#10b981', '#a7f3d0');
          updateBadgeRig(cTowerBBadge, `K_B=${c.kBJ.toFixed(1)}J`, '#f59e0b', '#fde68a');
          updateBadgeRig(
            cRatioBadge,
            c.kRatioBtoA !== null ? `K_B/K_A = ${c.kRatioBtoA.toFixed(2)}x` : 'K_A = 0 J',
            '#38bdf8',
            '#bae6fd',
          );
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    let rafPending = 0;
    const scheduleRender = () => {
      if (rafPending) return;
      rafPending = requestAnimationFrame(() => {
        rafPending = 0;
        renderScene();
      });
    };
    requestRenderRef.current = scheduleRender;
    controls.addEventListener('change', scheduleRender);
    scheduleRender();

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scheduleRender();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (rafPending) cancelAnimationFrame(rafPending);
      controls.removeEventListener('change', scheduleRender);
      controls.dispose();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach(m => {
            if ((m as THREE.SpriteMaterial).map) (m as THREE.SpriteMaterial).map?.dispose();
            m.dispose();
          });
        } else if (mat) {
          if ((mat as THREE.SpriteMaterial).map) (mat as THREE.SpriteMaterial).map?.dispose();
          mat.dispose();
        }
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};
