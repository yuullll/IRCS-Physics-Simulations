'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Resistive29Params,
  Resistive29Evaluation,
  clamp,
} from '@/lib/physics/resistive-2-9';

interface Resistive29ViewportProps {
  params: Resistive29Params;
  evaluation: Resistive29Evaluation;
  viewMode: '3d' | '2d';
}

interface ArrowRig {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
  label: THREE.Sprite;
  labelCtx: CanvasRenderingContext2D;
  labelCanvas: HTMLCanvasElement;
  labelTex: THREE.CanvasTexture;
  lastText: string;
}

function createBadgeSprite(
  initialText: string,
  borderColor: string,
  textColor = '#f8fafc',
  bgColor = 'rgba(4, 16, 13, 0.9)',
): {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 76;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  drawBadgeCanvas(ctx, canvas, initialText, borderColor, textColor, bgColor);
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.32, 0.31, 1);
  sprite.renderOrder = 25;
  return { sprite, canvas, ctx, tex };
}

function drawBadgeCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  borderColor: string,
  textColor = '#f8fafc',
  bgColor = 'rgba(4, 16, 13, 0.9)',
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

  ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);
}

function createArrowRig(
  colorHex: number,
  borderCss: string,
  textCss: string,
  initialLabel: string,
): ArrowRig {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.2,
  });

  const shaftGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 14);
  shaftGeo.translate(0, 0.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, mat);

  const headGeo = new THREE.ConeGeometry(0.125, 0.28, 16);
  headGeo.translate(0, 0.14, 0);
  const head = new THREE.Mesh(headGeo, mat);

  const badge = createBadgeSprite(initialLabel, borderCss, textCss);
  group.add(shaft, head, badge.sprite);

  return {
    group,
    shaft,
    head,
    label: badge.sprite,
    labelCtx: badge.ctx,
    labelCanvas: badge.canvas,
    labelTex: badge.tex,
    lastText: initialLabel,
  };
}

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
  rig.group.visible = visible && length > 0.08;
  if (!rig.group.visible) return;

  const clampedLen = clamp(length, 0.18, 2.55);
  const shaftLen = Math.max(0.06, clampedLen - 0.26);

  rig.group.position.copy(origin);
  const unitDir = dir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, unitDir);

  rig.shaft.quaternion.copy(quat);
  rig.shaft.scale.set(1, shaftLen, 1);

  rig.head.quaternion.copy(quat);
  rig.head.position.copy(unitDir).multiplyScalar(shaftLen);

  // Place sprite cleanly beyond tip with custom lateral offset to avoid collisions
  rig.label.position
    .copy(unitDir)
    .multiplyScalar(clampedLen + 0.26)
    .add(labelOffset);

  if (rig.lastText !== labelText) {
    drawBadgeCanvas(rig.labelCtx, rig.labelCanvas, labelText, borderCss, textCss);
    rig.labelTex.needsUpdate = true;
    rig.lastText = labelText;
  }
}

function createRulerTexture(isVertical: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = isVertical ? 96 : 512;
  canvas.height = isVertical ? 512 : 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#071713';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#10b981';
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 18px ui-monospace, monospace';

  if (isVertical) {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    for (let i = 0; i <= 20; i++) {
      const y = 20 + ((canvas.height - 40) * i) / 20;
      const major = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(canvas.width - 6, y);
      ctx.lineTo(canvas.width - (major ? 34 : 18), y);
      ctx.strokeStyle = major ? '#34d399' : 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = major ? 2.5 : 1.5;
      ctx.stroke();
      if (major) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i * 2}m`, 10, y);
      }
    }
  } else {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    for (let i = 0; i <= 20; i++) {
      const x = 20 + ((canvas.width - 40) * i) / 20;
      const major = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x, major ? 34 : 20);
      ctx.strokeStyle = major ? '#34d399' : 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = major ? 2.5 : 1.5;
      ctx.stroke();
      if (major) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Math.round((i / 20) * 100)}%`, x, canvas.height - 12);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Resistive29Viewport: React.FC<Resistive29ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef({ params, evaluation, viewMode });
  const requestRenderRef = useRef<() => void>(() => {});
  const lastCameraSignatureRef = useRef<string>('');
  const syncCameraRef = useRef<(mode: Resistive29Params['mode'], vm: '3d' | '2d') => void>(() => {});

  useEffect(() => {
    latestPropsRef.current = { params, evaluation, viewMode };
    const sig = `${params.mode}:${viewMode}`;
    if (lastCameraSignatureRef.current !== sig) {
      lastCameraSignatureRef.current = sig;
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
    scene.fog = new THREE.FogExp2('#040c0a', 0.022);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
    camera.position.set(4.8, 1.5, 10.2);

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
    controls.minDistance = 4.5;
    controls.maxDistance = 24;
    controls.target.set(0, 0.1, 0);

    // Studio lab lighting
    const hemiLight = new THREE.HemisphereLight('#a7f3d0', '#061310', 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#f8fafc', 1.75);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#34d399', 0.85);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    // Lab bench floor & subtle reference grid
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#061511',
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.45;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(28, 28, '#10b981', '#0c2921');
    grid.position.y = -3.44;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.35;
    });
    scene.add(grid);

    // Shared materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#0f221d',
      roughness: 0.35,
      metalness: 0.8,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.18,
      metalness: 0.92,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#a7f3d0',
      transparent: true,
      opacity: 0.13,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const emeraldSphereMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#064e3b',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.55,
    });
    const amberSphereMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#78350f',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.55,
    });

    const vRulerTex = createRulerTexture(true);
    const hRulerTex = createRulerTexture(false);

    // =========================================================================
    // GROUP 1: VERTICAL DROP COLUMN (vertical_drop)
    // =========================================================================
    const verticalGroup = new THREE.Group();
    scene.add(verticalGroup);

    // Base & top manifolds
    const vPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.75, 0.38, 8),
      darkMetalMat,
    );
    vPedestal.position.y = -3.26;
    vPedestal.receiveShadow = true;
    vPedestal.castShadow = true;
    verticalGroup.add(vPedestal);

    const vTopCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.38, 0.24, 24),
      darkMetalMat,
    );
    vTopCap.position.y = 3.12;
    verticalGroup.add(vTopCap);

    // Borosilicate glass drop column
    const vGlassTube = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.12, 6.08, 32, 1, true),
      glassMat,
    );
    vGlassTube.position.y = 0.0;
    verticalGroup.add(vGlassTube);

    // 4 perimeter tie rods
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 6.18, 10),
        chromeMat,
      );
      rod.position.set(Math.cos(ang) * 1.28, 0.0, Math.sin(ang) * 1.28);
      verticalGroup.add(rod);
    }

    // Illuminated metric depth ruler
    const vRuler = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 5.8, 0.06),
      new THREE.MeshStandardMaterial({ map: vRulerTex, roughness: 0.4, metalness: 0.2 }),
    );
    vRuler.position.set(-1.72, 0.0, 0.0);
    verticalGroup.add(vRuler);

    // Scrolling fluid depth rings inside column (show motion even at constant terminal speed!)
    const vFlowRings: THREE.Mesh[] = [];
    const flowRingGeo = new THREE.TorusGeometry(0.98, 0.014, 8, 36);
    const flowRingMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.28,
    });
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(flowRingGeo, flowRingMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -2.6 + i * 1.05;
      verticalGroup.add(ring);
      vFlowRings.push(ring);
    }

    // Terminal equilibrium halo ring around sphere
    const terminalHaloMat = new THREE.MeshBasicMaterial({
      color: '#10b981',
      transparent: true,
      opacity: 0.0,
    });
    const terminalHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.028, 12, 36),
      terminalHaloMat,
    );
    terminalHalo.rotation.x = Math.PI / 2;
    verticalGroup.add(terminalHalo);

    // Falling sphere & viscous wake ribbons
    const vSphere = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), emeraldSphereMat);
    vSphere.castShadow = true;
    verticalGroup.add(vSphere);

    const vWakeMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    const vWakeCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.34, 1.0, 16, 1, true),
      vWakeMat,
    );
    verticalGroup.add(vWakeCone);

    // Vertical drop arrows
    const vArrowFg = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'Fg');
    const vArrowFr = createArrowRig(0xf43f5e, '#f43f5e', '#fecdd3', 'Fr');
    const vArrowFnet = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'Fnet');
    const vArrowVel = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v');
    verticalGroup.add(vArrowFg.group, vArrowFr.group, vArrowFnet.group, vArrowVel.group);

    // =========================================================================
    // GROUP 2: HORIZONTAL COAST & POWERED THRUST RAIL (horizontal_coast | powered_thrust)
    // =========================================================================
    const horizGroup = new THREE.Group();
    scene.add(horizGroup);

    // Rail deck + twin chrome guide rods + support stanchions (compact span framed between docks)
    const railBase = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.24, 1.3), darkMetalMat);
    railBase.position.set(0, -1.15, 0);
    railBase.receiveShadow = true;
    horizGroup.add(railBase);

    for (const zOff of [-0.4, 0.4]) {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 6.1, 14),
        chromeMat,
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, -0.88, zOff);
      horizGroup.add(rod);
    }

    for (const xLeg of [-2.75, 2.75]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 1.1), darkMetalMat);
      leg.position.set(xLeg, -2.35, 0);
      horizGroup.add(leg);
    }

    // Translucent cyan viscous fluid damping trough under the rail (horizontal_coast)
    const fluidTrough = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.32, 0.54),
      new THREE.MeshPhysicalMaterial({
        color: '#06b6d4',
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.05,
      }),
    );
    fluidTrough.position.set(0, -0.92, 0);
    horizGroup.add(fluidTrough);

    // Horizontal ruler strip along front edge
    const hRuler = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.36, 0.04),
      new THREE.MeshStandardMaterial({ map: hRulerTex, roughness: 0.4, metalness: 0.2 }),
    );
    hRuler.position.set(0, -1.15, 0.68);
    horizGroup.add(hRuler);

    // Glowing stopping asymptote barrier plane x_max = m*v0/k (horizontal_coast)
    const asymptoteWallGroup = new THREE.Group();
    const asymptotePane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 2.35),
      new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    asymptotePane.rotation.y = Math.PI / 2;
    asymptotePane.position.set(2.45, 0.18, 0);
    const asymptoteBorder = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.4, 1.48),
      new THREE.MeshBasicMaterial({
        color: '#34d399',
        wireframe: true,
      }),
    );
    asymptoteBorder.position.set(2.45, 0.18, 0);
    const asymptoteBadge = createBadgeSprite('x_max = mv₀/k', '#10b981', '#a7f3d0');
    asymptoteBadge.sprite.position.set(2.25, 1.68, 0);
    asymptoteBadge.sprite.scale.set(1.52, 0.35, 1);
    asymptoteWallGroup.add(asymptotePane, asymptoteBorder, asymptoteBadge.sprite);
    horizGroup.add(asymptoteWallGroup);

    // Slipstream airflow streaks (powered_thrust)
    const hSlipstreams: THREE.Mesh[] = [];
    const slipGeo = new THREE.BoxGeometry(0.85, 0.022, 0.022);
    const slipMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.45,
    });
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(slipGeo, slipMat);
      s.position.set(-3.2 + i * 0.92, 0.55 + (i % 3) * 0.48, (i % 2 === 0 ? 1 : -1) * 0.52);
      horizGroup.add(s);
      hSlipstreams.push(s);
    }

    // Wake trail bar behind glider (horizontal_coast)
    const hWakeTrail = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.06, 0.24),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.35,
      }),
    );
    hWakeTrail.position.set(-3.2, -0.78, 0);
    horizGroup.add(hWakeTrail);

    // Aerodynamic sled / glider assembly
    const sledGroup = new THREE.Group();
    const sledBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.46, 0.72),
      emeraldSphereMat,
    );
    sledBody.castShadow = true;
    const sledNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.48, 16),
      chromeMat,
    );
    sledNose.rotation.z = -Math.PI / 2;
    sledNose.position.set(0.8, 0, 0);
    // Damping fin dipping into fluid channel
    const sledFin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.06), chromeMat);
    sledFin.position.set(0, -0.45, 0);
    // Glowing thruster exhaust cone (powered_thrust)
    const thrusterPlumeMat = new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.85,
    });
    const thrusterPlume = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.9, 16),
      thrusterPlumeMat,
    );
    thrusterPlume.rotation.z = Math.PI / 2;
    thrusterPlume.position.set(-1.02, 0, 0);

    sledGroup.add(sledBody, sledNose, sledFin, thrusterPlume);
    sledGroup.position.set(-3.2, -0.42, 0);
    horizGroup.add(sledGroup);

    // Horizontal arrows
    const hArrowDrive = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'F_drive');
    const hArrowFr = createArrowRig(0xf43f5e, '#f43f5e', '#fecdd3', 'Fr');
    const hArrowFnet = createArrowRig(0x10b981, '#10b981', '#a7f3d0', 'Fnet');
    const hArrowVel = createArrowRig(0x38bdf8, '#38bdf8', '#bae6fd', 'v');
    horizGroup.add(hArrowDrive.group, hArrowFr.group, hArrowFnet.group, hArrowVel.group);

    // =========================================================================
    // GROUP 3: DUAL COMPARE TWIN COLUMNS (dual_compare — Skill 2.C)
    // =========================================================================
    const dualGroup = new THREE.Group();
    scene.add(dualGroup);

    const dualPedestal = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 0.38, 2.5),
      darkMetalMat,
    );
    dualPedestal.position.set(0, -3.26, 0);
    dualPedestal.receiveShadow = true;
    dualGroup.add(dualPedestal);

    const dualTopBridge = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.24, 1.8),
      darkMetalMat,
    );
    dualTopBridge.position.set(0, 3.12, 0);
    dualGroup.add(dualTopBridge);

    // Shared central depth ruler
    const dualRuler = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 5.8, 0.06),
      new THREE.MeshStandardMaterial({ map: vRulerTex, roughness: 0.4, metalness: 0.2 }),
    );
    dualRuler.position.set(0, 0, 0);
    dualGroup.add(dualRuler);

    const lanePositions = [-1.85, 1.85];
    const dualFlowRingsA: THREE.Mesh[] = [];
    const dualFlowRingsB: THREE.Mesh[] = [];

    lanePositions.forEach((lx, laneIdx) => {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 6.08, 28, 1, true),
        glassMat,
      );
      tube.position.set(lx, 0, 0);
      dualGroup.add(tube);

      const ringColor = laneIdx === 0 ? '#34d399' : '#fbbf24';
      const rMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.26,
      });
      const rGeo = new THREE.TorusGeometry(0.84, 0.013, 8, 32);
      for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(lx, -2.5 + i * 1.2, 0);
        dualGroup.add(ring);
        if (laneIdx === 0) dualFlowRingsA.push(ring);
        else dualFlowRingsB.push(ring);
      }
    });

    const dualSphereA = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), emeraldSphereMat);
    const dualSphereB = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), amberSphereMat);
    dualSphereA.castShadow = true;
    dualSphereB.castShadow = true;
    dualGroup.add(dualSphereA, dualSphereB);

    const dualLabelA = createBadgeSprite('Lane A', '#10b981', '#a7f3d0');
    dualLabelA.sprite.position.set(-1.85, -2.72, 1.25);
    dualLabelA.sprite.scale.set(1.68, 0.35, 1);
    const dualLabelB = createBadgeSprite('Lane B', '#f59e0b', '#fde68a');
    dualLabelB.sprite.position.set(1.85, -2.72, 1.25);
    dualLabelB.sprite.scale.set(1.68, 0.35, 1);
    dualGroup.add(dualLabelA.sprite, dualLabelB.sprite);

    const dArrowFgA = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'Fg,A');
    const dArrowFrA = createArrowRig(0xf43f5e, '#f43f5e', '#fecdd3', 'Fr,A');
    const dArrowFgB = createArrowRig(0xf59e0b, '#f59e0b', '#fde68a', 'Fg,B');
    const dArrowFrB = createArrowRig(0xf43f5e, '#f43f5e', '#fecdd3', 'Fr,B');
    dualGroup.add(dArrowFgA.group, dArrowFrA.group, dArrowFgB.group, dArrowFrB.group);

    // =========================================================================
    // CAMERA PRESETS (Framed cleanly between top badge, bottom bar & side docks)
    // =========================================================================
    const syncCamera = (mode: Resistive29Params['mode'], vm: '3d' | '2d') => {
      controls.enableRotate = vm === '3d';
      if (mode === 'vertical_drop') {
        controls.target.set(0.1, 0.25, 0);
        if (vm === '2d') {
          camera.position.set(0.1, 0.25, 13.0);
        } else {
          camera.position.set(4.5, 1.55, 12.2);
        }
      } else if (mode === 'dual_compare') {
        controls.target.set(0.1, 0.25, 0);
        if (vm === '2d') {
          camera.position.set(0.1, 0.25, 14.2);
        } else {
          camera.position.set(2.9, 1.4, 13.6);
        }
      } else {
        // horizontal_coast or powered_thrust
        controls.target.set(0.15, 0.05, 0);
        if (vm === '2d') {
          camera.position.set(0.15, 0.2, 13.8);
        } else {
          camera.position.set(1.3, 2.35, 13.2);
        }
      }
      camera.lookAt(controls.target);
      controls.update();
    };
    syncCameraRef.current = syncCamera;
    syncCamera(latestPropsRef.current.params.mode, latestPropsRef.current.viewMode);
    lastCameraSignatureRef.current = `${latestPropsRef.current.params.mode}:${latestPropsRef.current.viewMode}`;

    // =========================================================================
    // SCENE UPDATE FROM PHYSICS STATE
    // =========================================================================
    const updateSceneVisuals = () => {
      const { params: curP, evaluation: curE } = latestPropsRef.current;
      const pA = curE.primary;
      const pB = curE.secondary;
      const showVec = curP.showForceVectors;
      const showAsym = curP.showAsymptotes;

      verticalGroup.visible = curP.mode === 'vertical_drop';
      horizGroup.visible = curP.mode === 'horizontal_coast' || curP.mode === 'powered_thrust';
      dualGroup.visible = curP.mode === 'dual_compare';

      if (curP.mode === 'vertical_drop') {
        const radiusScale = clamp(Math.cbrt(pA.massKg / 1.5), 0.72, 1.38);
        vSphere.scale.setScalar(radiusScale);

        // Smooth physical fall mapping inside column so sphere visibly drops yet never clips pedestal
        const sphereY = 2.25 - 3.15 * (1 - Math.exp(-pA.positionM / 11));
        vSphere.position.set(0, sphereY, 0);

        // Scroll airflow depth rings upward proportionally to fall depth
        const spacing = 1.05;
        const offset = (pA.positionM * 0.22) % spacing;
        vFlowRings.forEach((ring, idx) => {
          let y = -2.6 + idx * spacing + offset;
          if (y > 2.85) y -= 6 * spacing;
          ring.position.y = y;
        });

        // Viscous wake cone above falling sphere
        const wakeLen = clamp(pA.velocityMs * 0.14, 0.05, 1.8);
        vWakeCone.visible = pA.velocityMs > 0.2;
        vWakeCone.scale.set(radiusScale, wakeLen, radiusScale);
        vWakeCone.position.set(0, sphereY + 0.36 * radiusScale + wakeLen * 0.5, 0);
        vWakeMat.opacity = clamp(pA.velocityMs / Math.max(1, pA.vTerminal) * 0.36, 0.08, 0.42);

        // Terminal equilibrium halo
        terminalHalo.position.set(0, sphereY, 0);
        terminalHaloMat.opacity = showAsym && pA.isAtTerminal ? 0.75 : 0.0;

        // Force normalization scale (relative to max force so arrows stay crisp inside viewport)
        const forceRef = Math.max(pA.drivingForceN, pA.dragMagN, 12);
        const fScale = 1.65 / forceRef;
        const vScale = 1.55 / Math.max(pA.vTerminal, pA.v0, 8);

        updateArrowRig(
          vArrowFg,
          new THREE.Vector3(0, sphereY - 0.35 * radiusScale, 0),
          new THREE.Vector3(0, -1, 0),
          pA.drivingForceN * fScale,
          showVec,
          `Fg=${pA.drivingForceN.toFixed(1)}N`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0.68, -0.05, 0),
        );

        updateArrowRig(
          vArrowFr,
          new THREE.Vector3(0, sphereY + 0.35 * radiusScale, 0),
          new THREE.Vector3(0, 1, 0),
          pA.dragMagN * fScale,
          showVec && pA.dragMagN > 0.08,
          `Fr=${pA.dragMagN.toFixed(1)}N`,
          '#f43f5e',
          '#fecdd3',
          new THREE.Vector3(1.15, -0.45, 0),
        );

        const netDir = pA.netForceN >= 0 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 1, 0);
        updateArrowRig(
          vArrowFnet,
          new THREE.Vector3(1.55, sphereY, 0),
          netDir,
          Math.abs(pA.netForceN) * fScale,
          showVec && Math.abs(pA.netForceN) > 0.15,
          `Fnet=${pA.netForceN.toFixed(1)}N`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0.55, 0, 0),
        );

        updateArrowRig(
          vArrowVel,
          new THREE.Vector3(-1.12, sphereY, 0),
          new THREE.Vector3(0, -1, 0),
          Math.abs(pA.velocityMs) * vScale,
          showVec && Math.abs(pA.velocityMs) > 0.1,
          `v=${pA.velocityMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(-0.62, 0, 0),
        );
      } else if (curP.mode === 'horizontal_coast' || curP.mode === 'powered_thrust') {
        const isCoast = curP.mode === 'horizontal_coast';
        fluidTrough.visible = isCoast;
        sledFin.visible = isCoast;
        asymptoteWallGroup.visible = isCoast && showAsym;
        hWakeTrail.visible = isCoast;
        thrusterPlume.visible = !isCoast;

        let sledX = -2.45;
        if (isCoast) {
          const xMax = Math.max(0.5, pA.xMaxAsymptote ?? 10);
          const frac = clamp(pA.positionM / xMax, 0, 0.996);
          sledX = -2.45 + frac * 4.55;
          const wakeW = Math.max(0.05, sledX - -2.45);
          hWakeTrail.scale.set(wakeW, 1, 1);
          hWakeTrail.position.set(-2.45 + wakeW / 2, -0.76, 0);

          const wallText = `x_max=${xMax.toFixed(1)}m`;
          drawBadgeCanvas(asymptoteBadge.ctx, asymptoteBadge.canvas, wallText, '#10b981', '#a7f3d0');
          asymptoteBadge.tex.needsUpdate = true;
          hSlipstreams.forEach(s => {
            s.visible = false;
          });
        } else {
          // powered_thrust: glides into measurement zone while slipstream bars stream leftward at v(t)
          sledX = -1.75 + 2.0 * (1 - Math.exp(-pA.positionM / 14));
          const plumeScale = clamp(curP.driveForceN / 18, 0.55, 1.4);
          thrusterPlume.scale.set(1, plumeScale, 1);
          thrusterPlume.position.set(-0.56 - 0.42 * plumeScale, 0, 0);

          hSlipstreams.forEach((s, idx) => {
            s.visible = pA.velocityMs > 0.2;
            const span = 5.8;
            const rawX = ((idx * 0.72 - pA.positionM * 0.38) % span + span) % span;
            s.position.x = -2.9 + rawX;
          });
        }

        sledGroup.position.set(sledX, -0.42, 0);

        const forceRef = Math.max(pA.drivingForceN, pA.dragMagN, pA.dragK * pA.v0, 10);
        const fScale = 1.55 / forceRef;
        const vScale = 1.45 / Math.max(pA.vTerminal, pA.v0, 8);

        updateArrowRig(
          hArrowDrive,
          new THREE.Vector3(sledX + 0.62, -0.42, 0),
          new THREE.Vector3(1, 0, 0),
          pA.drivingForceN * fScale,
          showVec && !isCoast,
          `F_drv=${pA.drivingForceN.toFixed(1)}N`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(-0.35, 0.45, 0),
        );

        updateArrowRig(
          hArrowFr,
          new THREE.Vector3(sledX - 0.62, -0.42, 0),
          new THREE.Vector3(-1, 0, 0),
          pA.dragMagN * fScale,
          showVec && pA.dragMagN > 0.08,
          `Fr=${pA.dragMagN.toFixed(1)}N`,
          '#f43f5e',
          '#fecdd3',
          new THREE.Vector3(-0.05, 0.42, 0),
        );

        const netHDir = pA.netForceN >= 0 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(-1, 0, 0);
        updateArrowRig(
          hArrowFnet,
          new THREE.Vector3(sledX, 0.45, 0),
          netHDir,
          Math.abs(pA.netForceN) * fScale,
          showVec && Math.abs(pA.netForceN) > 0.15,
          `Fnet=${pA.netForceN.toFixed(1)}N`,
          '#10b981',
          '#a7f3d0',
          new THREE.Vector3(0, 0.36, 0),
        );

        updateArrowRig(
          hArrowVel,
          new THREE.Vector3(sledX, 1.15, 0),
          new THREE.Vector3(1, 0, 0),
          Math.abs(pA.velocityMs) * vScale,
          showVec && Math.abs(pA.velocityMs) > 0.1,
          `v=${pA.velocityMs.toFixed(1)}m/s`,
          '#38bdf8',
          '#bae6fd',
          new THREE.Vector3(0, 0.34, 0),
        );
      } else if (curP.mode === 'dual_compare' && pB) {
        const scaleA = clamp(Math.cbrt(pA.massKg / 1.5), 0.72, 1.35);
        const scaleB = clamp(Math.cbrt(pB.massKg / 1.5), 0.72, 1.35);
        dualSphereA.scale.setScalar(scaleA);
        dualSphereB.scale.setScalar(scaleB);

        // Shared strictly monotonic fall-depth mapping so relative race positions are 100% faithful
        const yA = 2.25 - 3.65 * (1 - Math.exp(-pA.positionM / 13));
        const yB = 2.25 - 3.65 * (1 - Math.exp(-pB.positionM / 13));
        dualSphereA.position.set(-1.85, yA, 0);
        dualSphereB.position.set(1.85, yB, 0);

        const spacing = 1.2;
        const offA = (pA.positionM * 0.2) % spacing;
        const offB = (pB.positionM * 0.2) % spacing;
        dualFlowRingsA.forEach((ring, idx) => {
          let y = -2.5 + idx * spacing + offA;
          if (y > 2.8) y -= 5 * spacing;
          ring.position.y = y;
        });
        dualFlowRingsB.forEach((ring, idx) => {
          let y = -2.5 + idx * spacing + offB;
          if (y > 2.8) y -= 5 * spacing;
          ring.position.y = y;
        });

        drawBadgeCanvas(
          dualLabelA.ctx,
          dualLabelA.canvas,
          `A: ${pA.massKg.toFixed(1)}kg · k=${pA.dragK.toFixed(1)}`,
          '#10b981',
          '#a7f3d0',
        );
        dualLabelA.tex.needsUpdate = true;

        drawBadgeCanvas(
          dualLabelB.ctx,
          dualLabelB.canvas,
          `B: ${pB.massKg.toFixed(1)}kg · k=${pB.dragK.toFixed(1)}`,
          '#f59e0b',
          '#fde68a',
        );
        dualLabelB.tex.needsUpdate = true;

        const maxForce = Math.max(pA.drivingForceN, pB.drivingForceN, pA.dragMagN, pB.dragMagN, 12);
        const fScale = 1.55 / maxForce;

        updateArrowRig(
          dArrowFgA,
          new THREE.Vector3(-1.85, yA - 0.32 * scaleA, 0),
          new THREE.Vector3(0, -1, 0),
          pA.drivingForceN * fScale,
          showVec,
          `Fg=${pA.drivingForceN.toFixed(1)}N`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(-0.68, 0, 0),
        );
        updateArrowRig(
          dArrowFrA,
          new THREE.Vector3(-1.85, yA + 0.32 * scaleA, 0),
          new THREE.Vector3(0, 1, 0),
          pA.dragMagN * fScale,
          showVec && pA.dragMagN > 0.08,
          `Fr=${pA.dragMagN.toFixed(1)}N`,
          '#f43f5e',
          '#fecdd3',
          new THREE.Vector3(-0.68, 0, 0),
        );

        updateArrowRig(
          dArrowFgB,
          new THREE.Vector3(1.85, yB - 0.32 * scaleB, 0),
          new THREE.Vector3(0, -1, 0),
          pB.drivingForceN * fScale,
          showVec,
          `Fg=${pB.drivingForceN.toFixed(1)}N`,
          '#f59e0b',
          '#fde68a',
          new THREE.Vector3(0.68, 0, 0),
        );
        updateArrowRig(
          dArrowFrB,
          new THREE.Vector3(1.85, yB + 0.32 * scaleB, 0),
          new THREE.Vector3(0, 1, 0),
          pB.dragMagN * fScale,
          showVec && pB.dragMagN > 0.08,
          `Fr=${pB.dragMagN.toFixed(1)}N`,
          '#f43f5e',
          '#fecdd3',
          new THREE.Vector3(0.68, 0, 0),
        );
      }
    };

    // =========================================================================
    // SOFTWARE-WEBGL COALESCED RENDERING WITH GPU FENCE PACING
    // =========================================================================
    const rawGl = renderer.getContext();
    const gl2 = typeof WebGL2RenderingContext !== 'undefined' && rawGl instanceof WebGL2RenderingContext ? rawGl : null;
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
      vRulerTex.dispose();
      hRulerTex.dispose();
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
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
      aria-label="Topic 2.9 Resistive Forces 3D/2D Simulation Viewport"
    />
  );
};
