'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Circular210Evaluation,
  Circular210Mode,
  Circular210Params,
  clamp,
} from '@/lib/physics/circular-motion-2-10';

interface Circular210ViewportProps {
  params: Circular210Params;
  evaluation: Circular210Evaluation;
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

  ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
}

function createBadgeRig(
  initialText: string,
  borderColor: string,
  textColor = '#f8fafc',
  scaleX = 1.42,
  scaleY = 0.32,
): BadgeRig {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 76;
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

  const badge = createBadgeRig(initialLabel, borderCss, textCss);
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

  const clampedLen = clamp(length, 0.24, 2.55);
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
    .multiplyScalar(clampedLen + 0.28)
    .add(labelOffset);

  updateBadgeRig(rig.badge, labelText, borderCss, textCss);
}

function createDashedSegment(colorHex: number): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  const mat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize: 0.12,
    gapSize: 0.08,
    transparent: true,
    opacity: 0.85,
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
  opacity = 0.75,
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

export const Circular210Viewport: React.FC<Circular210ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef({ params, evaluation, viewMode });
  const requestRenderRef = useRef<() => void>(() => {});
  const lastCameraSigRef = useRef<string>('');
  const syncCameraRef = useRef<(mode: Circular210Mode, vm: '3d' | '2d') => void>(() => {});

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
    scene.fog = new THREE.FogExp2('#040c0a', 0.018);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 160);
    camera.position.set(3.2, 1.4, 10.8);

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
    controls.maxDistance = 28;
    controls.target.set(0, 0.1, 0);

    // Studio lab lighting
    const hemiLight = new THREE.HemisphereLight('#a7f3d0', '#061310', 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#f8fafc', 1.75);
    keyLight.position.set(7, 11, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#34d399', 0.85);
    rimLight.position.set(-8, 4, -7);
    scene.add(rimLight);

    // Lab bench floor & subtle reference grid (hidden in orbital space mode)
    const labFloorGroup = new THREE.Group();
    scene.add(labFloorGroup);

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#061511',
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(54, 54), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.45;
    floor.receiveShadow = true;
    labFloorGroup.add(floor);

    const grid = new THREE.GridHelper(32, 32, '#10b981', '#0c2921');
    grid.position.y = -3.44;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.32;
    });
    labFloorGroup.add(grid);

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
      emissiveIntensity: 0.4,
      roughness: 0.22,
      metalness: 0.55,
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#78350f',
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.55,
    });
    const roseAlertMat = new THREE.MeshStandardMaterial({
      color: '#f43f5e',
      emissive: '#9f1239',
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.4,
    });

    // =========================================================================
    // GROUP 1: VERTICAL LOOP & NON-UNIFORM CIRCULAR MOTION
    // =========================================================================
    const loopGroup = new THREE.Group();
    scene.add(loopGroup);

    const loopCenterY = 0.25;
    const loopAssembly = new THREE.Group();
    loopAssembly.position.set(0, loopCenterY, 0);
    loopGroup.add(loopAssembly);

    // Scalable unit-radius track rings (scaled uniformly by R_vis)
    const loopRailFront = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.032, 16, 72),
      chromeMat,
    );
    loopRailFront.position.z = 0.22;
    const loopRailBack = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.032, 16, 72),
      chromeMat,
    );
    loopRailBack.position.z = -0.22;

    const loopTrackRibbon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.03, 1.03, 0.46, 72, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#0b221c',
        roughness: 0.45,
        metalness: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    loopTrackRibbon.rotation.x = Math.PI / 2;

    const loopInnerGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.99, 0.015, 10, 72),
      new THREE.MeshStandardMaterial({
        color: '#34d399',
        emissive: '#10b981',
        emissiveIntensity: 0.7,
        roughness: 0.2,
      }),
    );

    const loopUnitScalable = new THREE.Group();
    loopUnitScalable.add(loopRailFront, loopRailBack, loopTrackRibbon, loopInnerGlow);
    loopAssembly.add(loopUnitScalable);

    // Center hub + stanchion base
    const loopCenterHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 20, 20),
      emeraldMat,
    );
    loopAssembly.add(loopCenterHub);

    const loopBasePlate = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.24, 1.4),
      darkMetalMat,
    );
    loopBasePlate.position.set(0, -3.33, 0);
    loopBasePlate.receiveShadow = true;
    loopGroup.add(loopBasePlate);

    const loopStanchionL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1, 14),
      darkMetalMat,
    );
    const loopStanchionR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1, 14),
      darkMetalMat,
    );
    loopGroup.add(loopStanchionL, loopStanchionR);

    // Dynamic radius spoke & non-uniform parallelogram dashed lines
    const loopRadiusLine = createDashedSegment(0x34d399);
    const loopParaLineA = createDashedSegment(0x34d399);
    const loopParaLineB = createDashedSegment(0xf59e0b);
    loopGroup.add(loopRadiusLine, loopParaLineA, loopParaLineB);

    // Top / Bottom reference badges
    const loopTopBadge = createBadgeRig('TOP 90° · v_min=√(gr)', '#f59e0b', '#fde68a', 1.75, 0.3);
    const loopBotBadge = createBadgeRig('BOT 270°', '#38bdf8', '#bae6fd', 1.12, 0.28);
    const loopAlertBadge = createBadgeRig('CONTACT LOST · F_N=0', '#f43f5e', '#fecdd3', 1.95, 0.34);
    loopGroup.add(loopTopBadge.sprite, loopBotBadge.sprite, loopAlertBadge.sprite);

    // Sleek Loop Cart / Puck
    const loopCart = new THREE.Group();
    const cartBodyMat = emeraldMat.clone();
    const cartBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.22, 0.34),
      cartBodyMat,
    );
    cartBody.castShadow = true;
    const cartCanopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      chromeMat,
    );
    cartCanopy.position.y = 0.08;
    loopCart.add(cartBody, cartCanopy);
    for (const wx of [-0.15, 0.15]) {
      for (const wz of [-0.17, 0.17]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
          chromeMat,
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -0.11, wz);
        loopCart.add(wheel);
      }
    }
    loopGroup.add(loopCart);

    // Loop Vector Arrows
    const lArrowV = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v');
    const lArrowAc = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'a_c');
    const lArrowAt = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'a_t');
    const lArrowANet = createArrowRig(0xf8fafc, '#e2e8f0', '#ffffff', 'a_net', 1.05);
    const lArrowFg = createArrowRig(0xeab308, '#eab308', '#fef08a', 'Fg');
    const lArrowFn = createArrowRig(0x22d3ee, '#22d3ee', '#cffafe', 'F_N');
    loopGroup.add(
      lArrowV.group,
      lArrowAc.group,
      lArrowAt.group,
      lArrowANet.group,
      lArrowFg.group,
      lArrowFn.group,
    );

    // =========================================================================
    // GROUP 2: BANKED CURVE WITH STATIC FRICTION (2.10.A.2.ii)
    // =========================================================================
    const bankedGroup = new THREE.Group();
    scene.add(bankedGroup);

    // Dynamic conical-frustum banked roadway mesh
    const BANK_SEGS = 72;
    const bankGeo = new THREE.BufferGeometry();
    const bankVerts = new Float32Array((BANK_SEGS + 1) * 2 * 3);
    const bankIndices: number[] = [];
    for (let i = 0; i < BANK_SEGS; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      bankIndices.push(a, b, c, b, d, c);
    }
    bankGeo.setAttribute('position', new THREE.BufferAttribute(bankVerts, 3));
    bankGeo.setIndex(bankIndices);

    const bankRoadMat = new THREE.MeshStandardMaterial({
      color: '#0e241f',
      roughness: 0.58,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const bankRoadMesh = new THREE.Mesh(bankGeo, bankRoadMat);
    bankRoadMesh.receiveShadow = true;
    bankedGroup.add(bankRoadMesh);

    const bankInnerRim = createCircleLine(1, BANK_SEGS, 0x10b981, 'xz', 0.55);
    const bankOuterRim = createCircleLine(1, BANK_SEGS, 0x34d399, 'xz', 0.7);
    const bankPathRing = createCircleLine(1, BANK_SEGS, 0x38bdf8, 'xz', 0.9);
    bankedGroup.add(bankInnerRim, bankOuterRim, bankPathRing);

    // Center vertical axis pylon & horizontal radial line
    const bankAxisPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.08, 3.6, 16),
      darkMetalMat,
    );
    bankAxisPole.position.set(0, -1.65, 0);
    const bankCenterSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 18, 18),
      emeraldMat,
    );
    bankCenterSphere.position.set(0, 0, 0);
    const bankCenterBadge = createBadgeRig('Circle Center (Horizontal r)', '#10b981', '#a7f3d0', 1.85, 0.28);
    bankCenterBadge.sprite.position.set(0, 0.52, 0);
    bankedGroup.add(bankAxisPole, bankCenterSphere, bankCenterBadge.sprite);

    const bankRadialLine = createDashedSegment(0x10b981);
    const bankFnHorizLine = createDashedSegment(0x22d3ee);
    const bankFnVertLine = createDashedSegment(0x22d3ee);
    bankedGroup.add(bankRadialLine, bankFnHorizLine, bankFnVertLine);

    // Banked Car Rig
    const bankCar = new THREE.Group();
    const bankChassisMat = emeraldMat.clone();
    const bankChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.2, 0.92),
      bankChassisMat,
    );
    bankChassis.position.y = 0.14;
    bankChassis.castShadow = true;
    const bankCabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.16, 0.48),
      chromeMat,
    );
    bankCabin.position.set(0, 0.3, -0.04);
    bankCar.add(bankChassis, bankCabin);
    for (const wx of [-0.28, 0.28]) {
      for (const wz of [-0.28, 0.28]) {
        const w = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085, 0.085, 0.08, 14),
          darkMetalMat,
        );
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, 0.085, wz);
        bankCar.add(w);
      }
    }
    bankedGroup.add(bankCar);

    const bankStatusBadge = createBadgeRig('IDEAL · f_s = 0', '#10b981', '#a7f3d0', 1.85, 0.32);
    bankedGroup.add(bankStatusBadge.sprite);

    // Banked Force & Acceleration Arrows
    const bArrowFg = createArrowRig(0xeab308, '#eab308', '#fef08a', 'Fg');
    const bArrowFn = createArrowRig(0x22d3ee, '#22d3ee', '#cffafe', 'F_N');
    const bArrowFs = createArrowRig(0xf43f5e, '#f43f5e', '#fecdd3', 'f_s');
    const bArrowAc = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'a_c');
    bankedGroup.add(bArrowFg.group, bArrowFn.group, bArrowFs.group, bArrowAc.group);

    // =========================================================================
    // GROUP 3: CONICAL PENDULUM (2.10.A.2.iii)
    // =========================================================================
    const conicalGroup = new THREE.Group();
    scene.add(conicalGroup);

    const pivotY = 2.65;
    // Overhead lab tripod / gantry stand
    const gantryPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 6.2, 16),
      darkMetalMat,
    );
    gantryPost.position.set(-2.9, -0.35, 0);
    const gantryArm = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.16, 0.22),
      darkMetalMat,
    );
    gantryArm.position.set(-1.35, pivotY + 0.12, 0);
    const gantryFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.9, 0.24, 16),
      darkMetalMat,
    );
    gantryFoot.position.set(-2.9, -3.33, 0);
    const pivotHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      chromeMat,
    );
    pivotHub.position.set(0, pivotY, 0);
    conicalGroup.add(gantryPost, gantryArm, gantryFoot, pivotHub);

    // Translucent swept cone geometry (apex at origin, base at y=-1, radius=1 -> scaled dynamically)
    const coneGeo = new THREE.ConeGeometry(1, 1, 56, 1, true);
    coneGeo.translate(0, -0.5, 0);
    const coneMat = new THREE.MeshPhysicalMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sweptCone = new THREE.Mesh(coneGeo, coneMat);
    sweptCone.position.set(0, pivotY, 0);
    conicalGroup.add(sweptCone);

    // Taut pendulum cable
    const cableGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 12);
    cableGeo.translate(0, 0.5, 0);
    const pendulumCable = new THREE.Mesh(cableGeo, chromeMat);
    conicalGroup.add(pendulumCable);

    // Horizontal circle ring, plumb vertical line, horizontal radius spoke, component dashes
    const conicalCircleRing = createCircleLine(1, 72, 0x38bdf8, 'xz', 0.85);
    const conicalPlumbLine = createDashedSegment(0x94a3b8);
    const conicalRadiusLine = createDashedSegment(0x10b981);
    const conicalTyLine = createDashedSegment(0xf59e0b);
    const conicalTrLine = createDashedSegment(0x10b981);
    const conicalCircleCenterDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      emeraldMat,
    );
    conicalGroup.add(
      conicalCircleRing,
      conicalPlumbLine,
      conicalRadiusLine,
      conicalTyLine,
      conicalTrLine,
      conicalCircleCenterDot,
    );

    // Bob sphere
    const conicalBob = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 28, 28),
      emeraldMat,
    );
    conicalBob.castShadow = true;
    conicalGroup.add(conicalBob);

    const conicalAngleBadge = createBadgeRig('φ = 35°', '#f59e0b', '#fde68a', 1.15, 0.28);
    conicalGroup.add(conicalAngleBadge.sprite);

    const cArrowT = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'T');
    const cArrowFg = createArrowRig(0xeab308, '#eab308', '#fef08a', 'Fg');
    const cArrowAc = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'a_c (horiz)');
    const cArrowV = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v');
    conicalGroup.add(cArrowT.group, cArrowFg.group, cArrowAc.group, cArrowV.group);

    // =========================================================================
    // GROUP 4: CIRCULAR ORBITS & KEPLER'S THIRD LAW (LO 2.10.B / 2.10.B.1)
    // =========================================================================
    const keplerGroup = new THREE.Group();
    scene.add(keplerGroup);

    // Subtle deep-space starfield points
    const starPositions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      // Deterministic pseudo-random stars (pure, reproducible)
      const s1 = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
      const s2 = Math.sin(i * 78.233 + 1.7182) * 24634.6345;
      const s3 = Math.sin(i * 39.425 + 8.3145) * 19283.1234;
      const u = s1 - Math.floor(s1);
      const v = s2 - Math.floor(s2);
      const w = s3 - Math.floor(s3);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rad = 16 + w * 18;
      starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = rad * Math.cos(phi);
      starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#a7f3d0',
      size: 0.11,
      transparent: true,
      opacity: 0.65,
    });
    const starField = new THREE.Points(starGeo, starMat);
    keplerGroup.add(starField);

    // Central Planet Core + Atmospheric Halo + Equatorial Grid
    const planetGroup = new THREE.Group();
    const planetCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 36, 36),
      new THREE.MeshStandardMaterial({
        color: '#0f766e',
        emissive: '#064e3b',
        emissiveIntensity: 0.55,
        roughness: 0.4,
        metalness: 0.2,
      }),
    );
    const planetAtmo = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 32, 32),
      new THREE.MeshPhysicalMaterial({
        color: '#34d399',
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        depthWrite: false,
      }),
    );
    const planetEquator = createCircleLine(0.98, 64, 0x34d399, 'xz', 0.55);
    planetGroup.add(planetCore, planetAtmo, planetEquator);
    keplerGroup.add(planetGroup);

    const planetBadge = createBadgeRig('M = 1.0 M_⊕', '#10b981', '#a7f3d0', 1.35, 0.28);
    planetBadge.sprite.position.set(0, 1.32, 0);
    keplerGroup.add(planetBadge.sprite);

    // Concentric Circular Orbit Rings A (emerald) & B (amber)
    const orbitRingA = createCircleLine(1, 96, 0x10b981, 'xz', 0.85);
    const orbitRingB = createCircleLine(1, 96, 0xf59e0b, 'xz', 0.72);
    const orbitRadiusLineA = createDashedSegment(0x10b981);
    const orbitRadiusLineB = createDashedSegment(0xf59e0b);
    keplerGroup.add(orbitRingA, orbitRingB, orbitRadiusLineA, orbitRadiusLineB);

    // Helper to build sleek 3D satellite mesh
    const buildSatelliteMesh = (bodyMat: THREE.Material) => {
      const sat = new THREE.Group();
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), bodyMat);
      const wingMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0c4a6e',
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.7,
      });
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.48), wingMat);
      wingL.position.z = 0.42;
      const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.48), wingMat);
      wingR.position.z = -0.42;
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.1, 14), chromeMat);
      dish.rotation.z = Math.PI / 2;
      dish.position.x = -0.18;
      sat.add(bus, wingL, wingR, dish);
      return sat;
    };

    const satMeshA = buildSatelliteMesh(emeraldMat);
    const satMeshB = buildSatelliteMesh(amberMat);
    keplerGroup.add(satMeshA, satMeshB);

    const satABadge = createBadgeRig('Sat A · R=2.0 R_⊕', '#10b981', '#a7f3d0', 1.65, 0.28);
    const satBBadge = createBadgeRig('Sat B · R=4.0 R_⊕', '#f59e0b', '#fde68a', 1.65, 0.28);
    keplerGroup.add(satABadge.sprite, satBBadge.sprite);

    const kArrowFgA = createArrowRig(0xeab308, '#eab308', '#fef08a', 'Fg = Fc');
    const kArrowVA = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v_A');
    const kArrowFgB = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'Fg,B', 0.85);
    const kArrowVB = createArrowRig(0xfbbf24, '#fbbf24', '#fef3c7', 'v_B', 0.85);
    keplerGroup.add(
      kArrowFgA.group,
      kArrowVA.group,
      kArrowFgB.group,
      kArrowVB.group,
    );

    // =========================================================================
    // CAMERA SYNC FOR 3D PERSPECTIVE VS 2D ORTHOGRAPHIC-FEEL VIEWS
    // =========================================================================
    const syncCamera = (mode: Circular210Mode, vm: '3d' | '2d') => {
      if (mode === 'vertical_loop') {
        controls.target.set(0, 0.25, 0);
        if (vm === '2d') {
          camera.position.set(0, 0.25, 10.8);
        } else {
          camera.position.set(3.2, 1.35, 10.4);
        }
      } else if (mode === 'banked_curve') {
        controls.target.set(0, 0.0, 0);
        if (vm === '2d') {
          // Front cross-section view of the banked incline!
          camera.position.set(0.6, 0.65, 11.4);
        } else {
          camera.position.set(5.4, 4.4, 8.8);
        }
      } else if (mode === 'conical_pendulum') {
        controls.target.set(0, 0.35, 0);
        if (vm === '2d') {
          camera.position.set(0, 0.45, 10.8);
        } else {
          camera.position.set(4.4, 2.2, 9.6);
        }
      } else {
        // kepler_orbit
        controls.target.set(0, 0, 0);
        if (vm === '2d') {
          camera.position.set(0, 14.5, 0.02);
        } else {
          camera.position.set(0, 7.6, 11.4);
        }
      }
      camera.lookAt(controls.target);
      controls.update();
    };
    syncCameraRef.current = syncCamera;
    syncCamera(latestPropsRef.current.params.mode, latestPropsRef.current.viewMode);
    lastCameraSigRef.current = `${latestPropsRef.current.params.mode}:${latestPropsRef.current.viewMode}`;

    // =========================================================================
    // SCENE VISUAL UPDATE FROM PHYSICS EVALUATION
    // =========================================================================
    const updateSceneVisuals = () => {
      const { params: curP, evaluation: curE } = latestPropsRef.current;
      const showVec = curP.showVectors;
      const showComp = curP.showComponents;

      loopGroup.visible = curP.mode === 'vertical_loop';
      bankedGroup.visible = curP.mode === 'banked_curve';
      conicalGroup.visible = curP.mode === 'conical_pendulum';
      keplerGroup.visible = curP.mode === 'kepler_orbit';
      labFloorGroup.visible = curP.mode !== 'kepler_orbit';

      if (curP.mode === 'vertical_loop') {
        const l = curE.loop;
        const rVis = clamp(1.65 + (l.radiusM - 1.5) * 0.24, 1.65, 2.75);
        loopUnitScalable.scale.setScalar(rVis);

        // Anchor support stanchions neatly to the base plate
        const bottomY = loopCenterY - rVis;
        const stanchionH = Math.max(0.25, bottomY - -3.22);
        loopStanchionL.scale.set(1, stanchionH, 1);
        loopStanchionR.scale.set(1, stanchionH, 1);
        loopStanchionL.position.set(-rVis * 0.42, -3.22 + stanchionH * 0.5, 0);
        loopStanchionR.position.set(rVis * 0.42, -3.22 + stanchionH * 0.5, 0);

        const theta = l.angleRad;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Cart rides along inside of loop; if contact lost, pulls slightly inward off rail
        const radialTrackOffset = l.maintainsContact ? rVis - 0.18 : rVis - 0.52;
        const cartPos = new THREE.Vector3(
          cosT * radialTrackOffset,
          loopCenterY + sinT * radialTrackOffset,
          0,
        );
        loopCart.position.copy(cartPos);
        // Orient cart so its wheels point outward toward the track
        loopCart.rotation.set(0, 0, theta + Math.PI / 2);

        if (!l.maintainsContact) {
          cartBodyMat.color.set('#f43f5e');
          cartBodyMat.emissive.set('#881337');
        } else if (l.isCriticalTop) {
          cartBodyMat.color.set('#f59e0b');
          cartBodyMat.emissive.set('#78350f');
        } else {
          cartBodyMat.color.set('#10b981');
          cartBodyMat.emissive.set('#064e3b');
        }

        const centerPos = new THREE.Vector3(0, loopCenterY, 0);
        updateSegment(loopRadiusLine, centerPos, cartPos, showComp);

        loopTopBadge.sprite.position.set(0, loopCenterY + rVis + 0.48, 0);
        updateBadgeRig(
          loopTopBadge,
          `TOP 90° · v_min=${l.vMinTopMs.toFixed(1)}m/s`,
          l.isCriticalTop ? '#34d399' : '#f59e0b',
          l.isCriticalTop ? '#a7f3d0' : '#fde68a',
        );
        loopBotBadge.sprite.position.set(0, loopCenterY - rVis - 0.36, 0);

        loopAlertBadge.sprite.visible = !l.maintainsContact;
        loopAlertBadge.sprite.position.set(cartPos.x, cartPos.y + 0.65, 0.35);

        // Unit vectors in XY loop plane
        const inwardDir = new THREE.Vector3(-cosT, -sinT, 0);
        const tangentDir = new THREE.Vector3(-sinT, cosT, 0); // CCW motion
        const downDir = new THREE.Vector3(0, -1, 0);

        const aScale = clamp(1.35 / Math.max(l.aNetMs2, 10), 0.04, 0.16);
        const fScale = clamp(1.35 / Math.max(l.fcN, l.fgN, 20), 0.02, 0.09);

        const acLen = l.acMs2 * aScale;
        const atLen = Math.abs(l.atMs2) * aScale;
        const atVec = tangentDir.clone().multiplyScalar(l.atMs2 >= 0 ? 1 : -1);
        const aNetDir = inwardDir
          .clone()
          .multiplyScalar(l.acMs2)
          .add(tangentDir.clone().multiplyScalar(l.atMs2));
        const aNetLen = l.aNetMs2 * aScale;

        // Velocity vector tangent to loop
        updateArrowRig(
          lArrowV,
          cartPos,
          tangentDir,
          clamp(l.speedMs * 0.14, 0.5, 1.9),
          showVec,
          `v=${l.speedMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.22, 0.12),
        );

        // Centripetal acceleration a_c strictly toward center
        updateArrowRig(
          lArrowAc,
          cartPos,
          inwardDir,
          acLen,
          showVec,
          `a_c=${l.acMs2.toFixed(1)}m/s²`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0, -0.22, 0.12),
        );

        // Tangential acceleration a_t (visible when non-zero)
        updateArrowRig(
          lArrowAt,
          cartPos,
          atVec,
          atLen,
          showVec && !l.isUniform,
          `a_t=${l.atMs2.toFixed(1)}m/s²`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0, -0.28, 0.15),
        );

        // Net acceleration vector sum a_net = a_c + a_t (shown prominently when a_t != 0)
        updateArrowRig(
          lArrowANet,
          cartPos,
          aNetDir,
          aNetLen,
          showVec && !l.isUniform,
          `a_net=${l.aNetMs2.toFixed(1)}`,
          '#e2e8f0',
          '#ffffff',
          new THREE.Vector3(0.18, 0.18, 0.2),
        );

        // Vector parallelogram dashes proving a_net = a_c + a_t
        const showPara = showVec && showComp && !l.isUniform;
        const tipAc = cartPos.clone().addScaledVector(inwardDir, clamp(acLen, 0.24, 2.55));
        const tipAt = cartPos.clone().addScaledVector(atVec, clamp(atLen, 0.24, 2.55));
        const tipNet = cartPos
          .clone()
          .addScaledVector(aNetDir.clone().normalize(), clamp(aNetLen, 0.24, 2.55));
        updateSegment(loopParaLineA, tipAc, tipNet, showPara);
        updateSegment(loopParaLineB, tipAt, tipNet, showPara);

        // Force vectors offset slightly in +Z so FBD arrows never collide with kinematics arrows
        const forceOrigin = cartPos.clone().add(new THREE.Vector3(0, 0, 0.26));
        updateArrowRig(
          lArrowFg,
          forceOrigin,
          downDir,
          l.fgN * fScale,
          showVec,
          `Fg=${l.fgN.toFixed(1)}N`,
          '#eab308',
          '#fef08a',
          new THREE.Vector3(0.45, -0.05, 0.1),
        );
        updateArrowRig(
          lArrowFn,
          forceOrigin,
          inwardDir,
          l.normalForceN * fScale,
          showVec && l.normalForceN > 0.15,
          `F_N=${l.normalForceN.toFixed(1)}N`,
          '#22d3ee',
          '#cffafe',
          new THREE.Vector3(-0.48, 0.08, 0.15),
        );
      } else if (curP.mode === 'banked_curve') {
        const b = curE.banked;
        const beta = b.bankAngleRad;
        const cosB = Math.cos(beta);
        const sinB = Math.sin(beta);

        const rVis = clamp(2.15 + (b.radiusM - 10) * 0.035, 2.05, 3.25);
        const halfW = 0.85;
        const rIn = rVis - halfW * cosB;
        const rOut = rVis + halfW * cosB;
        const yIn = -halfW * sinB;
        const yOut = halfW * sinB;

        // Update conical-frustum banked surface vertices in place
        const posAttr = bankGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i <= BANK_SEGS; i++) {
          const ang = (i / BANK_SEGS) * Math.PI * 2;
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          posAttr.setXYZ(i * 2, rIn * ca, yIn, rIn * sa);
          posAttr.setXYZ(i * 2 + 1, rOut * ca, yOut, rOut * sa);
        }
        posAttr.needsUpdate = true;
        bankGeo.computeVertexNormals();

        bankInnerRim.scale.set(rIn, 1, rIn);
        bankInnerRim.position.y = yIn + 0.01;
        bankOuterRim.scale.set(rOut, 1, rOut);
        bankOuterRim.position.y = yOut + 0.01;
        bankPathRing.scale.set(rVis, 1, rVis);
        bankPathRing.position.y = 0.01;

        // Car position along horizontal circle at phaseRad
        const phi = curP.phaseRad;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const carPos = new THREE.Vector3(rVis * cp, 0, rVis * sp);

        // Local orthogonal basis on the banked track at angle phi:
        //  radialOut = (cp, 0, sp)
        //  radialIn  = (-cp, 0, -sp)
        //  tangent   = (-sp, 0, cp) (direction of forward travel)
        //  upSlope   = (cp*cosB, sinB, sp*cosB)
        //  downSlope = (-cp*cosB, -sinB, -sp*cosB)
        //  normalDir = (-cp*sinB, cosB, -sp*sinB) (perpendicular to road, tilted inward!)
        const radialIn = new THREE.Vector3(-cp, 0, -sp);
        const tangent = new THREE.Vector3(-sp, 0, cp);
        const upSlope = new THREE.Vector3(cp * cosB, sinB, sp * cosB).normalize();
        const downSlope = upSlope.clone().negate();
        const normalDir = new THREE.Vector3(-cp * sinB, cosB, -sp * sinB).normalize();

        // Orient car cleanly to road frame (x = upSlope, y = normalDir, z = tangent)
        const rotMat = new THREE.Matrix4().makeBasis(upSlope, normalDir, tangent);
        bankCar.position.copy(carPos);
        bankCar.quaternion.setFromRotationMatrix(rotMat);

        if (!b.isSafe) {
          bankChassisMat.color.set('#f43f5e');
          bankChassisMat.emissive.set('#881337');
        } else if (b.status === 'ideal_frictionless') {
          bankChassisMat.color.set('#34d399');
          bankChassisMat.emissive.set('#065f46');
        } else {
          bankChassisMat.color.set('#10b981');
          bankChassisMat.emissive.set('#064e3b');
        }

        const centerPos = new THREE.Vector3(0, 0, 0);
        updateSegment(bankRadialLine, centerPos, carPos, showComp);

        // Status floating badge above car
        const statusLabel =
          b.status === 'ideal_frictionless'
            ? 'IDEAL BANK · f_s = 0 N'
            : b.status === 'skidding_outward'
              ? 'SKIDDING OUTWARD (v > v_max)'
              : b.status === 'sliding_inward'
                ? 'SLIDING INWARD (v < v_min)'
                : b.status === 'safe_down_slope'
                  ? 'SAFE · f_s DOWN-BANK'
                  : 'SAFE · f_s UP-BANK';
        const statusColor = !b.isSafe ? '#f43f5e' : '#10b981';
        const statusText = !b.isSafe ? '#fecdd3' : '#a7f3d0';
        updateBadgeRig(bankStatusBadge, statusLabel, statusColor, statusText);
        bankStatusBadge.sprite.position.set(carPos.x, carPos.y + 1.85, carPos.z);

        const maxForce = Math.max(b.normalForceN, b.fgN, Math.abs(b.frictionReqN), b.fcN, 15);
        const fScale = 1.65 / maxForce;
        const vecOrigin = carPos.clone().addScaledVector(normalDir, 0.24);

        // Weight Fg straight down
        updateArrowRig(
          bArrowFg,
          vecOrigin,
          new THREE.Vector3(0, -1, 0),
          b.fgN * fScale,
          showVec,
          `Fg=${b.fgN.toFixed(1)}N`,
          '#eab308',
          '#fef08a',
          new THREE.Vector3(0.32, -0.05, 0),
        );

        // Normal force F_N perpendicular to banked surface
        const fnLen = clamp(b.normalForceN * fScale, 0.24, 2.55);
        updateArrowRig(
          bArrowFn,
          vecOrigin,
          normalDir,
          fnLen,
          showVec,
          `F_N=${b.normalForceN.toFixed(1)}N`,
          '#22d3ee',
          '#cffafe',
          new THREE.Vector3(0, 0.22, 0),
        );

        // Dashed vertical & horizontal components of F_N
        const fnTip = vecOrigin.clone().addScaledVector(normalDir, fnLen);
        const fnVertCorner = vecOrigin.clone().add(new THREE.Vector3(0, fnLen * cosB, 0));
        updateSegment(bankFnVertLine, vecOrigin, fnVertCorner, showVec && showComp && beta > 0.02);
        updateSegment(bankFnHorizLine, fnVertCorner, fnTip, showVec && showComp && beta > 0.02);

        // Static friction f_s along slope (downSlope if >0, upSlope if <0)
        const fsDir = b.frictionReqN >= 0 ? downSlope : upSlope;
        const fsDisplayMag = Math.min(Math.abs(b.frictionReqN), b.frictionMaxN + 0.01);
        updateArrowRig(
          bArrowFs,
          vecOrigin,
          fsDir,
          (b.isSafe ? Math.abs(b.frictionReqN) : fsDisplayMag) * fScale,
          showVec && Math.abs(b.frictionReqN) > 0.12 && (b.muStatic > 0.005 || !b.isSafe),
          b.isSafe
            ? `f_s=${Math.abs(b.frictionReqN).toFixed(1)}N`
            : `f_s,max=${b.frictionMaxN.toFixed(1)}N`,
          '#f43f5e',
          '#fecdd3',
          new THREE.Vector3(0, -0.25, 0.1),
        );

        // Strictly horizontal centripetal acceleration a_c / net radial force
        updateArrowRig(
          bArrowAc,
          vecOrigin,
          radialIn,
          clamp(b.fcN * fScale, 0.45, 2.1),
          showVec,
          `a_c=${b.acMs2.toFixed(1)}m/s²`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0, 0.28, 0),
        );
      } else if (curP.mode === 'conical_pendulum') {
        const c = curE.conical;
        const scale = clamp(3.6 / Math.max(c.lengthM, 1.5), 0.78, 1.55);
        const lVis = clamp(c.lengthM * scale, 2.3, 4.4);
        const rVis = lVis * Math.sin(c.angleRad);
        const hVis = lVis * Math.cos(c.angleRad);

        const circleY = pivotY - hVis;
        const phi = curP.phaseRad;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);

        const pivotPos = new THREE.Vector3(0, pivotY, 0);
        const circleCenter = new THREE.Vector3(0, circleY, 0);
        const bobPos = new THREE.Vector3(rVis * cp, circleY, rVis * sp);

        // Scale bob subtly with mass
        const bobScale = clamp(Math.cbrt(c.massKg / 2.0), 0.72, 1.38);
        conicalBob.scale.setScalar(bobScale);
        conicalBob.position.copy(bobPos);

        // Swept translucent cone
        sweptCone.scale.set(rVis, hVis, rVis);
        sweptCone.visible = showComp;

        // Cable from pivot to bob
        const cableVec = bobPos.clone().sub(pivotPos);
        const cableLen = cableVec.length();
        pendulumCable.position.copy(pivotPos);
        pendulumCable.quaternion.setFromUnitVectors(UP_VEC, cableVec.clone().normalize());
        pendulumCable.scale.set(1, cableLen, 1);

        // Horizontal orbit circle & geometry reference lines
        conicalCircleRing.scale.set(rVis, 1, rVis);
        conicalCircleRing.position.y = circleY;
        conicalCircleCenterDot.position.copy(circleCenter);

        updateSegment(conicalPlumbLine, pivotPos, circleCenter, showComp);
        updateSegment(conicalRadiusLine, circleCenter, bobPos, showComp);

        conicalAngleBadge.sprite.position.set(rVis * 0.22 * cp + 0.35, pivotY - hVis * 0.25, rVis * 0.22 * sp);
        updateBadgeRig(conicalAngleBadge, `φ=${c.angleDeg.toFixed(0)}°`, '#f59e0b', '#fde68a');

        // Unit directions at bob
        const stringDir = pivotPos.clone().sub(bobPos).normalize();
        const radialIn = new THREE.Vector3(-cp, 0, -sp);
        const tangent = new THREE.Vector3(-sp, 0, cp);
        const downDir = new THREE.Vector3(0, -1, 0);

        const maxForce = Math.max(c.tensionN, c.fgN, 15);
        const fScale = 1.9 / maxForce;

        const tLen = clamp(c.tensionN * fScale, 0.35, 2.5);
        updateArrowRig(
          cArrowT,
          bobPos,
          stringDir,
          tLen,
          showVec,
          `T=${c.tensionN.toFixed(1)}N`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0.32, 0.16, 0),
        );

        // Dashed vertical & horizontal components of tension (Ty = mg, Tr = Fc)
        const tTip = bobPos.clone().addScaledVector(stringDir, tLen);
        const tyCorner = bobPos.clone().add(new THREE.Vector3(0, tLen * Math.cos(c.angleRad), 0));
        updateSegment(conicalTyLine, bobPos, tyCorner, showVec && showComp);
        updateSegment(conicalTrLine, tyCorner, tTip, showVec && showComp);

        updateArrowRig(
          cArrowFg,
          bobPos,
          downDir,
          c.fgN * fScale,
          showVec,
          `Fg=${c.fgN.toFixed(1)}N`,
          '#eab308',
          '#fef08a',
          new THREE.Vector3(0.38, -0.05, 0),
        );

        updateArrowRig(
          cArrowAc,
          bobPos,
          radialIn,
          clamp(c.tensionRadialN * fScale, 0.4, 2.2),
          showVec,
          `a_c=${c.acMs2.toFixed(1)}m/s²`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0, -0.28, 0),
        );

        updateArrowRig(
          cArrowV,
          bobPos,
          tangent,
          clamp(c.speedMs * 0.25, 0.5, 1.8),
          showVec,
          `v=${c.speedMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.24, 0),
        );
      } else {
        // kepler_orbit
        const k = curE.kepler;
        const planetScale = clamp(Math.cbrt(k.centralMassEarth), 0.72, 1.48);
        planetGroup.scale.setScalar(planetScale);
        updateBadgeRig(planetBadge, `M = ${k.centralMassEarth.toFixed(2)} M_⊕`, '#10b981', '#a7f3d0');
        planetBadge.sprite.position.set(0, 1.15 * planetScale + 0.3, 0);

        const mapOrbitR = (rRe: number) => clamp(1.35 + (rRe - 1.0) * 0.56, 1.45, 4.95);
        const rVisA = mapOrbitR(k.satA.radiusEarthRadii);
        const rVisB = mapOrbitR(k.satB.radiusEarthRadii);

        orbitRingA.scale.set(rVisA, 1, rVisA);
        orbitRingB.scale.set(rVisB, 1, rVisB);

        const angA = curP.phaseRad;
        const angB = curP.phaseBRad;
        const posA = new THREE.Vector3(Math.cos(angA) * rVisA, 0, Math.sin(angA) * rVisA);
        const posB = new THREE.Vector3(Math.cos(angB) * rVisB, 0, Math.sin(angB) * rVisB);

        satMeshA.position.copy(posA);
        satMeshA.rotation.y = -angA;
        satMeshB.position.copy(posB);
        satMeshB.rotation.y = -angB;

        const origin = new THREE.Vector3(0, 0, 0);
        updateSegment(orbitRadiusLineA, origin, posA, showComp);
        updateSegment(orbitRadiusLineB, origin, posB, showComp);

        satABadge.sprite.position.set(posA.x, 0.62, posA.z);
        updateBadgeRig(
          satABadge,
          `Sat A · ${k.satA.radiusEarthRadii.toFixed(1)}R_⊕ · T=${k.satA.periodHours.toFixed(1)}h`,
          '#10b981',
          '#a7f3d0',
        );
        satBBadge.sprite.position.set(posB.x, 0.62, posB.z);
        updateBadgeRig(
          satBBadge,
          `Sat B · ${k.satB.radiusEarthRadii.toFixed(1)}R_⊕ · T=${k.satB.periodHours.toFixed(1)}h`,
          '#f59e0b',
          '#fde68a',
        );

        const inA = new THREE.Vector3(-Math.cos(angA), 0, -Math.sin(angA));
        const tanA = new THREE.Vector3(-Math.sin(angA), 0, Math.cos(angA));
        const inB = new THREE.Vector3(-Math.cos(angB), 0, -Math.sin(angB));
        const tanB = new THREE.Vector3(-Math.sin(angB), 0, Math.cos(angB));

        const maxAc = Math.max(k.satA.acMs2, k.satB.acMs2, 2);
        const acScale = 1.45 / maxAc;
        const maxV = Math.max(k.satA.speedKmS, k.satB.speedKmS, 4);
        const vScale = 1.65 / maxV;

        updateArrowRig(
          kArrowFgA,
          posA,
          inA,
          clamp(k.satA.acMs2 * acScale, 0.4, 1.8),
          showVec,
          `Fg=Fc (${k.satA.acMs2.toFixed(2)}m/s²)`,
          '#eab308',
          '#fef08a',
          new THREE.Vector3(0, -0.32, 0),
        );
        updateArrowRig(
          kArrowVA,
          posA,
          tanA,
          clamp(k.satA.speedKmS * vScale, 0.45, 1.9),
          showVec,
          `v_A=${k.satA.speedKmS.toFixed(2)}km/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.25, 0),
        );

        updateArrowRig(
          kArrowFgB,
          posB,
          inB,
          clamp(k.satB.acMs2 * acScale, 0.35, 1.5),
          showVec,
          `a_c,B=${k.satB.acMs2.toFixed(2)}`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0, -0.32, 0),
        );
        updateArrowRig(
          kArrowVB,
          posB,
          tanB,
          clamp(k.satB.speedKmS * vScale, 0.4, 1.65),
          showVec,
          `v_B=${k.satB.speedKmS.toFixed(2)}km/s`,
          '#fbbf24',
          '#fef3c7',
          new THREE.Vector3(0, 0.25, 0),
        );
      }
    };

    // =========================================================================
    // SOFTWARE-WEBGL COALESCED RENDERING WITH GPU FENCE PACING
    // =========================================================================
    const rawGl = renderer.getContext();
    const gl2 =
      typeof WebGL2RenderingContext !== 'undefined' &&
      rawGl instanceof WebGL2RenderingContext
        ? rawGl
        : null;
    let disposed = false;
    let dirty = true;
    let rafId = 0;
    let activeSync: WebGLSync | null = null;
    let syncPolls = 0;

    const tick = () => {
      rafId = 0;
      if (disposed) return;

      if (gl2 && activeSync) {
        const res = gl2.clientWaitSync(activeSync, 0, 0);
        if (res === gl2.TIMEOUT_EXPIRED && syncPolls < 18) {
          syncPolls++;
          rafId = requestAnimationFrame(tick);
          return;
        }
        gl2.deleteSync(activeSync);
        activeSync = null;
        syncPolls = 0;
      }

      if (dirty) {
        dirty = false;
        controls.update();
        updateSceneVisuals();
        renderer.render(scene, camera);
        if (gl2) {
          activeSync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl2.flush();
        }
      }
    };

    const requestRender = () => {
      if (disposed) return;
      dirty = true;
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(entry.contentRect.width, 320);
      const h = Math.max(entry.contentRect.height, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    requestRender();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (gl2 && activeSync) gl2.deleteSync(activeSync);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      envTex.dispose();
      pmrem.dispose();
      roseAlertMat.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        } else if (obj instanceof THREE.Sprite) {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
      aria-label="Topic 2.10 Circular Motion 3D/2D Simulation Viewport"
    />
  );
};
