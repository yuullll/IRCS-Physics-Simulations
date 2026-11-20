'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Distribution84Evaluation,
  Distribution84Params,
  Vec3,
} from '@/lib/physics/charge-distributions-8-4';

const POSITIVE_RED = 0xef4444;
const POSITIVE_EMISSIVE = 0x7f1d1d;
const NEGATIVE_BLUE = 0x3b82f6;
const NEGATIVE_EMISSIVE = 0x1e3a8a;
const NEUTRAL_SLATE = 0x64748b;

const DQ_AMBER = 0xf59e0b;
const TWIN_CYAN = 0x22d3ee;
const PERP_ROSE = 0xfb7185;
const PERP_VIOLET = 0xc084fc;
const ENET_EMERALD = 0x10b981;
const GRID_SKY = 0x38bdf8;
const PROBE_GOLD = 0xfde68a;

const SCENE_SCALE = 0.84;

export interface Distributions84ViewportProps {
  params: Distribution84Params;
  evaluation: Distribution84Evaluation;
  viewMode: '3d' | '2d';
  showSymmetryTwin: boolean;
  showDiffVectors: boolean;
  showFieldGrid: boolean;
}

function makeBadgeSprite(
  title: string,
  valueText: string,
  accentHex: string,
  scaleX = 1.85,
  scaleY = 0.5
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const r = 18;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.94)';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(r + 6, 8);
  ctx.lineTo(canvas.width - r - 6, 8);
  ctx.quadraticCurveTo(canvas.width - 6, 8, canvas.width - 6, r + 8);
  ctx.lineTo(canvas.width - 6, canvas.height - r - 8);
  ctx.quadraticCurveTo(canvas.width - 6, canvas.height - 8, canvas.width - r - 6, canvas.height - 8);
  ctx.lineTo(r + 6, canvas.height - 8);
  ctx.quadraticCurveTo(6, canvas.height - 8, 6, canvas.height - r - 8);
  ctx.lineTo(6, r + 8);
  ctx.quadraticCurveTo(6, 8, r + 6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 23px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, canvas.width / 2, 42);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 31px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(valueText, canvas.width / 2, 85);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.renderOrder = 25;
  return sprite;
}

function makeMiniTagSprite(text: string, accentHex: string): THREE.Sprite {
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = 'bold 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  const textW = Math.ceil(measureCtx.measureText(text).width);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(128, textW + 48);
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(8, 14, 30, 0.94)';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, 52, 14);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(text, canvas.width / 2, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  const scaleW = (canvas.width / 160) * 0.68;
  sprite.scale.set(scaleW, 0.27, 1);
  sprite.renderOrder = 26;
  return sprite;
}

function createStyledArrow(
  origin: THREE.Vector3,
  dirUnit: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.036,
  headRadius = 0.095,
  headLength = 0.24,
  opacity = 1
): THREE.Group {
  const group = new THREE.Group();
  if (length < 0.06 || dirUnit.lengthSq() < 1e-8) return group;

  const actualHeadLen = Math.min(headLength, length * 0.48);
  const shaftLen = Math.max(0.02, length - actualHeadLen);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.2,
    transparent: opacity < 1,
    opacity,
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 14),
    mat
  );
  shaft.position.y = shaftLen * 0.5;
  group.add(shaft);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(headRadius, actualHeadLen, 16),
    mat
  );
  head.position.y = shaftLen + actualHeadLen * 0.5;
  group.add(head);

  group.position.copy(origin);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dirUnit.clone().normalize());
  group.quaternion.copy(quat);

  return group;
}

function createDashedSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  colorHex: number,
  opacity = 0.72
): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize: 0.14,
    gapSize: 0.09,
    transparent: true,
    opacity,
  });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse(obj => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => {
          const anyMat = m as THREE.MeshStandardMaterial;
          anyMat.map?.dispose();
          m.dispose();
        });
      } else if (obj.material) {
        const anyMat = obj.material as THREE.MeshStandardMaterial;
        anyMat.map?.dispose();
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Sprite) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
}

function computeVisualOffsetX(params: Distribution84Params): number {
  switch (params.distribution) {
    case 'thin_ring':
      return -params.probeDistance * 0.28 * SCENE_SCALE;
    case 'arc_center':
      return 0.35;
    case 'finite_line_bisector':
      return -params.probeDistance * 0.42 * SCENE_SCALE;
    case 'finite_line_collinear':
      return ((params.length - params.probeDistance) * 0.26 - 0.52) * SCENE_SCALE;
    case 'infinite_wire':
      return -params.probeDistance * 0.42 * SCENE_SCALE;
  }
}

function toSceneVec(v: Vec3, offsetX: number): THREE.Vector3 {
  return new THREE.Vector3(v.x * SCENE_SCALE + offsetX, v.y * SCENE_SCALE, v.z * SCENE_SCALE);
}

export const Distributions84Viewport: React.FC<Distributions84ViewportProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<Distributions84ViewportProps>(props);
  const rebuildRef = useRef<(() => void) | null>(null);
  const cameraSyncRef = useRef<((mode: '3d' | '2d') => void) | null>(null);

  useEffect(() => {
    propsRef.current = props;
    rebuildRef.current?.();
  }, [
    props.params,
    props.evaluation,
    props.showSymmetryTwin,
    props.showDiffVectors,
    props.showFieldGrid,
    props.viewMode,
  ]);

  useEffect(() => {
    cameraSyncRef.current?.(props.viewMode);
  }, [props.viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 800;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const glRendererStr = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(glRendererStr);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1.25 : 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.022);

    // PMREM studio lighting environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Key, fill, and rim lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.35);
    keyLight.position.set(5.5, 8.0, 7.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-6.0, 4.0, -5.0);
    scene.add(rimLight);

    // Cameras
    const perspCam = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    perspCam.position.set(1.6, 3.1, 10.6);

    const frustumH = 7.4;
    const aspect = width / height;
    const orthoCam = new THREE.OrthographicCamera(
      (-frustumH * aspect) / 2,
      (frustumH * aspect) / 2,
      frustumH / 2,
      -frustumH / 2,
      0.1,
      60
    );
    orthoCam.position.set(0, 0.15, 14);
    orthoCam.lookAt(0, 0.15, 0);

    let activeCam: THREE.Camera = propsRef.current.viewMode === '2d' ? orthoCam : perspCam;

    const controls = new OrbitControls(perspCam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5.5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.target.set(0, 0.05, 0);
    controls.update();

    // Static Lab Stage Floor & Coordinate Grid
    const stageGroup = new THREE.Group();
    const floorGeom = new THREE.PlaneGeometry(24, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070d1d,
      roughness: 0.78,
      metalness: 0.18,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.45;
    stageGroup.add(floor);

    const gridHelper = new THREE.GridHelper(18, 24, 0x1e3a5f, 0x0f1d35);
    gridHelper.position.y = -2.44;
    stageGroup.add(gridHelper);
    scene.add(stageGroup);

    // Dynamic physics scene group
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    let renderScheduled = false;
    let rafId = 0;

    const renderNow = () => {
      renderScheduled = false;
      if (activeCam === perspCam) {
        controls.update();
      }
      renderer.render(scene, activeCam);
    };

    const requestRender = () => {
      if (!renderScheduled) {
        renderScheduled = true;
        rafId = window.requestAnimationFrame(renderNow);
      }
    };

    controls.addEventListener('change', requestRender);

    const rebuildDynamicScene = () => {
      while (dynamicGroup.children.length > 0) {
        const child = dynamicGroup.children[0];
        dynamicGroup.remove(child);
        disposeObjectTree(child);
      }

      const {
        params,
        evaluation,
        showSymmetryTwin,
        showDiffVectors,
        showFieldGrid,
        viewMode,
      } = propsRef.current;

      const offsetX = computeVisualOffsetX(params);
      const isPositive = params.chargeMicro > 0.01;
      const isNegative = params.chargeMicro < -0.01;
      const chargeColor = isPositive
        ? POSITIVE_RED
        : isNegative
        ? NEGATIVE_BLUE
        : NEUTRAL_SLATE;
      const chargeEmissive = isPositive
        ? POSITIVE_EMISSIVE
        : isNegative
        ? NEGATIVE_EMISSIVE
        : 0x1e293b;
      const chargeAccentHex = isPositive ? '#f87171' : isNegative ? '#60a5fa' : '#94a3b8';

      // Subtle local Cartesian reference axes passing through distribution origin
      const originScene = toSceneVec({ x: 0, y: 0, z: 0 }, offsetX);
      const axisMat = new THREE.LineBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.55,
      });
      // X-axis
      dynamicGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(originScene.x - 3.6, 0, 0),
            new THREE.Vector3(originScene.x + 3.6, 0, 0),
          ]),
          axisMat
        )
      );
      // Y-axis
      dynamicGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(originScene.x, -2.3, 0),
            new THREE.Vector3(originScene.x, 2.3, 0),
          ]),
          axisMat
        )
      );
      if (viewMode === '3d') {
        dynamicGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(originScene.x, 0, -2.2),
              new THREE.Vector3(originScene.x, 0, 2.2),
            ]),
            axisMat
          )
        );
      }

      const bodyMat = new THREE.MeshStandardMaterial({
        color: chargeColor,
        emissive: chargeEmissive,
        emissiveIntensity: 0.7,
        roughness: 0.28,
        metalness: 0.22,
        transparent: true,
        opacity: 0.84,
      });

      const standMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.65,
        roughness: 0.35,
      });

      const R = Math.max(0.2, params.radius) * SCENE_SCALE;
      const L = Math.max(0.4, params.length) * SCENE_SCALE;

      // 1. Continuous Charge Distribution Body Geometry
      if (params.distribution === 'thin_ring') {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(R, 0.085, 20, 64), bodyMat);
        torus.rotation.y = Math.PI / 2;
        torus.position.set(offsetX, 0, 0);
        dynamicGroup.add(torus);

        // Insulating ring support stem to lab bench
        const stemH = Math.max(0.2, 2.45 - R - 0.08);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, stemH, 14), standMat);
        stem.position.set(offsetX, -2.45 + stemH * 0.5, 0);
        dynamicGroup.add(stem);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.1, 20), standMat);
        base.position.set(offsetX, -2.4, 0);
        dynamicGroup.add(base);

        // Radius guide line from ring center to top
        dynamicGroup.add(
          createDashedSegment(
            new THREE.Vector3(offsetX, 0, 0),
            new THREE.Vector3(offsetX, R, 0),
            0x64748b,
            0.55
          )
        );
      } else if (params.distribution === 'arc_center') {
        const alphaRad = (Math.max(15, Math.min(360, params.arcAngleDeg)) * Math.PI) / 180;
        const curvePts: THREE.Vector3[] = [];
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const theta = -alphaRad / 2 + (i / steps) * alphaRad;
          curvePts.push(
            new THREE.Vector3(offsetX - R * Math.cos(theta), R * Math.sin(theta), 0)
          );
        }
        const arcCurve = new THREE.CatmullRomCurve3(curvePts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 64, 0.085, 14, false), bodyMat);
        dynamicGroup.add(tube);

        // Dashed radius guides to arc endpoints & center of curvature
        const pTop = curvePts[curvePts.length - 1];
        const pBot = curvePts[0];
        dynamicGroup.add(createDashedSegment(originScene, pTop, 0x64748b, 0.55));
        dynamicGroup.add(createDashedSegment(originScene, pBot, 0x64748b, 0.55));

        // Subtle inner angle indicator arc (radius 0.45)
        const innerPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) {
          const theta = -alphaRad / 2 + (i / 24) * alphaRad;
          innerPts.push(
            new THREE.Vector3(offsetX - 0.45 * Math.cos(theta), 0.45 * Math.sin(theta), 0)
          );
        }
        const angleArcLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(innerPts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 })
        );
        dynamicGroup.add(angleArcLine);
      } else if (params.distribution === 'finite_line_bisector') {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, L, 20), bodyMat);
        rod.position.set(offsetX, 0, 0);
        dynamicGroup.add(rod);

        // End caps
        const capGeo = new THREE.SphereGeometry(0.098, 16, 12);
        const topCap = new THREE.Mesh(capGeo, bodyMat);
        topCap.position.set(offsetX, L * 0.5, 0);
        const botCap = new THREE.Mesh(capGeo, bodyMat);
        botCap.position.set(offsetX, -L * 0.5, 0);
        dynamicGroup.add(topCap, botCap);

        // Base support
        const stemH = Math.max(0.15, 2.45 - L * 0.5 - 0.08);
        if (stemH > 0.16) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, stemH, 12), standMat);
          stem.position.set(offsetX, -2.45 + stemH * 0.5, 0);
          dynamicGroup.add(stem);
        }
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.1, 20), standMat);
        base.position.set(offsetX, -2.4, 0);
        dynamicGroup.add(base);
      } else if (params.distribution === 'finite_line_collinear') {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, L, 20), bodyMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.set(offsetX - L * 0.5, 0, 0);
        dynamicGroup.add(rod);

        const capGeo = new THREE.SphereGeometry(0.098, 16, 12);
        const leftCap = new THREE.Mesh(capGeo, bodyMat);
        leftCap.position.set(offsetX - L, 0, 0);
        const rightCap = new THREE.Mesh(capGeo, bodyMat);
        rightCap.position.set(offsetX, 0, 0);
        dynamicGroup.add(leftCap, rightCap);

        // Twin insulating stands beneath rod
        [-L * 0.82, -L * 0.18].forEach(lx => {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.35, 12), standMat);
          stem.position.set(offsetX + lx, -1.27, 0);
          dynamicGroup.add(stem);
        });
      } else {
        // infinite_wire: long vertical charged cylinder with ±∞ visual continuation
        const wireVisualLen = 4.55;
        const cylRad = Math.max(0.11, R * 0.85);
        const cyl = new THREE.Mesh(
          new THREE.CylinderGeometry(cylRad, cylRad, wireVisualLen, 24),
          bodyMat
        );
        cyl.position.set(offsetX, 0, 0);
        dynamicGroup.add(cyl);

        // Translucent dashed infinity extension markers top & bottom
        dynamicGroup.add(
          createDashedSegment(
            new THREE.Vector3(offsetX, wireVisualLen * 0.5, 0),
            new THREE.Vector3(offsetX, wireVisualLen * 0.5 + 0.65, 0),
            chargeColor,
            0.85
          )
        );
        dynamicGroup.add(
          createDashedSegment(
            new THREE.Vector3(offsetX, -wireVisualLen * 0.5, 0),
            new THREE.Vector3(offsetX, -wireVisualLen * 0.5 - 0.65, 0),
            chargeColor,
            0.85
          )
        );

        const infTop = makeMiniTagSprite('+∞', chargeAccentHex);
        infTop.position.set(offsetX + 0.46, 2.22, 0);
        const infBot = makeMiniTagSprite('−∞', chargeAccentHex);
        infBot.position.set(offsetX + 0.46, -2.18, 0);
        dynamicGroup.add(infTop, infBot);
      }

      // 2. Discrete N Riemann Segments (visible finite beads on the charge body)
      const segRadius = Math.max(0.055, Math.min(0.11, 1.35 / Math.sqrt(evaluation.elements.length)));
      const segGeo = new THREE.SphereGeometry(segRadius, 12, 10);
      const segMat = new THREE.MeshStandardMaterial({
        color: isPositive ? 0xfca5a5 : isNegative ? 0x93c5fd : 0xcbd5e1,
        emissive: chargeColor,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      });

      const dqIdx = evaluation.symmetry.dqElement.index;
      const twinIdx = evaluation.symmetry.twinElement?.index ?? -1;

      for (const el of evaluation.elements) {
        // For infinite wire, only render beads within visible vertical viewport span
        const pScene = toSceneVec(el.position, offsetX);
        if (params.distribution === 'infinite_wire' && Math.abs(pScene.y) > 2.25) {
          continue;
        }
        if (el.index === dqIdx || (showSymmetryTwin && el.index === twinIdx)) {
          continue;
        }
        const bead = new THREE.Mesh(segGeo, segMat);
        bead.position.copy(pScene);
        dynamicGroup.add(bead);
      }

      // 3. Highlighted Differential Element dq (Amber) and Symmetry Twin dq' (Cyan)
      const probeScene = toSceneVec(evaluation.probePos, offsetX);

      // Clamp highlighted dq/twin visual y for infinite wire so student always sees them in viewport
      const clampElementScenePos = (pos: Vec3): THREE.Vector3 => {
        const s = toSceneVec(pos, offsetX);
        if (params.distribution === 'infinite_wire') {
          s.y = Math.max(-2.05, Math.min(2.05, s.y));
        }
        return s;
      };

      const dqPos = clampElementScenePos(evaluation.symmetry.dqElement.position);
      const dqSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 20, 16),
        new THREE.MeshStandardMaterial({
          color: DQ_AMBER,
          emissive: DQ_AMBER,
          emissiveIntensity: 0.75,
          roughness: 0.2,
        })
      );
      dqSphere.position.copy(dqPos);
      dynamicGroup.add(dqSphere);

      const dqHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 12),
        new THREE.MeshBasicMaterial({
          color: DQ_AMBER,
          transparent: true,
          opacity: 0.26,
          wireframe: true,
        })
      );
      dqHalo.position.copy(dqPos);
      dynamicGroup.add(dqHalo);

      const dqTag = makeMiniTagSprite('dq', '#fbbf24');
      dqTag.position.copy(dqPos).add(new THREE.Vector3(-0.32, 0.34, 0));
      dynamicGroup.add(dqTag);

      // Dashed position ray r from dq -> P
      dynamicGroup.add(createDashedSegment(dqPos, probeScene, DQ_AMBER, 0.85));

      let twinPos: THREE.Vector3 | null = null;
      if (showSymmetryTwin && evaluation.symmetry.hasSymmetryTwin && evaluation.symmetry.twinElement) {
        twinPos = clampElementScenePos(evaluation.symmetry.twinElement.position);
        const twinSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 20, 16),
          new THREE.MeshStandardMaterial({
            color: TWIN_CYAN,
            emissive: TWIN_CYAN,
            emissiveIntensity: 0.7,
            roughness: 0.2,
          })
        );
        twinSphere.position.copy(twinPos);
        dynamicGroup.add(twinSphere);

        const twinTag = makeMiniTagSprite("dq'", '#22d3ee');
        twinTag.position.copy(twinPos).add(new THREE.Vector3(-0.32, -0.34, 0));
        dynamicGroup.add(twinTag);

        dynamicGroup.add(createDashedSegment(twinPos, probeScene, TWIN_CYAN, 0.8));
      }

      // 4. Precision Field Probe P
      const probeCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 24, 20),
        new THREE.MeshStandardMaterial({
          color: PROBE_GOLD,
          emissive: 0xd97706,
          emissiveIntensity: 0.4,
          metalness: 0.75,
          roughness: 0.2,
        })
      );
      probeCore.position.copy(probeScene);
      dynamicGroup.add(probeCore);

      const probeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.022, 12, 32),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.85,
          roughness: 0.2,
        })
      );
      probeRing.position.copy(probeScene);
      probeRing.rotation.x = Math.PI / 2;
      dynamicGroup.add(probeRing);

      const probeLabel =
        params.distribution === 'arc_center'
          ? 'P (Center)'
          : params.distribution === 'infinite_wire'
          ? `P (r=${params.probeDistance.toFixed(1)}m)`
          : params.distribution === 'finite_line_collinear'
          ? `P (a=${params.probeDistance.toFixed(1)}m)`
          : `P (x=${params.probeDistance.toFixed(1)}m)`;
      const probeTag = makeMiniTagSprite(probeLabel, '#fde68a');
      probeTag.position.copy(probeScene).add(new THREE.Vector3(0, -0.48, 0));
      dynamicGroup.add(probeTag);

      // 5. Differential Field Arrows dE, dE' and Canceling Perpendicular Components dE⊥, dE'⊥
      if (showDiffVectors && Math.abs(params.chargeMicro) > 0.01) {
        const dE = evaluation.symmetry.dqElement.dE;
        const dEMag = Math.hypot(dE.x, dE.y, dE.z);
        const arrowScale = dEMag > 1e-6 ? 1.25 / dEMag : 0;

        if (dEMag > 1e-6) {
          const dEVec = new THREE.Vector3(dE.x, dE.y, dE.z);
          dynamicGroup.add(
            createStyledArrow(
              probeScene,
              dEVec.clone().normalize(),
              1.25,
              DQ_AMBER,
              0.028,
              0.075,
              0.2
            )
          );

          // Perpendicular canceling component dE⊥
          const perp = evaluation.symmetry.dEPerp;
          const perpMag = Math.hypot(perp.x, perp.y, perp.z);
          if (perpMag * arrowScale > 0.14) {
            const perpVec = new THREE.Vector3(perp.x, perp.y, perp.z);
            dynamicGroup.add(
              createStyledArrow(
                probeScene,
                perpVec.clone().normalize(),
                perpMag * arrowScale,
                PERP_ROSE,
                0.022,
                0.062,
                0.16,
                0.92
              )
            );
          }
        }

        if (showSymmetryTwin && evaluation.symmetry.hasSymmetryTwin && evaluation.symmetry.twinElement) {
          const tE = evaluation.symmetry.twinElement.dE;
          const tEMag = Math.hypot(tE.x, tE.y, tE.z);
          if (tEMag > 1e-6) {
            const tEVec = new THREE.Vector3(tE.x, tE.y, tE.z);
            dynamicGroup.add(
              createStyledArrow(
                probeScene,
                tEVec.clone().normalize(),
                1.25,
                TWIN_CYAN,
                0.028,
                0.075,
                0.2
              )
            );

            const tPerp = evaluation.symmetry.twinEPerp;
            const tPerpMag = Math.hypot(tPerp.x, tPerp.y, tPerp.z);
            if (tPerpMag * arrowScale > 0.14) {
              const tPerpVec = new THREE.Vector3(tPerp.x, tPerp.y, tPerp.z);
              dynamicGroup.add(
                createStyledArrow(
                  probeScene,
                  tPerpVec.clone().normalize(),
                  tPerpMag * arrowScale,
                  PERP_VIOLET,
                  0.022,
                  0.062,
                  0.16,
                  0.92
                )
              );
            }
          }
        }
      }

      // 6. Net Integrated Electric Field Vector E_net (Emerald) + Floating Readout Badge
      const exactE = evaluation.exactE;
      const exactMag = evaluation.exactMag;
      const netDir = new THREE.Vector3(exactE.x, exactE.y, exactE.z);
      if (exactMag > 0.02) {
        const netLen = Math.max(0.75, Math.min(2.15, 0.55 + Math.log10(1 + exactMag) * 0.88));
        const unitNet = netDir.clone().normalize();
        dynamicGroup.add(
          createStyledArrow(
            probeScene,
            unitNet,
            netLen,
            ENET_EMERALD,
            0.052,
            0.13,
            0.32
          )
        );

        const signedEx = `${exactE.x >= 0 ? '+' : ''}${exactE.x.toFixed(1)} kN/C`;
        const eBadge = makeBadgeSprite('E_net (Exact ∫)', signedEx, '#34d399', 1.78, 0.46);
        const rawBadgeX = probeScene.x + unitNet.x * (netLen * 0.45);
        const clampedBadgeX = Math.max(-1.65, Math.min(1.28, rawBadgeX));
        eBadge.position.set(clampedBadgeX, probeScene.y + 0.78, probeScene.z);
        dynamicGroup.add(eBadge);
      } else {
        const zeroBadge = makeBadgeSprite(
          'E_net (Symmetry)',
          '0.00 kN/C (Cancels)',
          '#34d399',
          1.9,
          0.46
        );
        zeroBadge.position.set(
          Math.max(-1.65, Math.min(1.28, probeScene.x)),
          probeScene.y + 0.78,
          probeScene.z
        );
        dynamicGroup.add(zeroBadge);
      }

      // Distribution charge badge positioned cleanly above the charge body
      const chargeSignText =
        params.distribution === 'infinite_wire'
          ? `λ = ${params.chargeMicro >= 0 ? '+' : ''}${params.chargeMicro.toFixed(1)} μC/m`
          : `Q = ${params.chargeMicro >= 0 ? '+' : ''}${params.chargeMicro.toFixed(1)} μC`;
      const bodyTitle =
        params.distribution === 'thin_ring'
          ? 'THIN RING'
          : params.distribution === 'arc_center'
          ? `ARC (α=${params.arcAngleDeg.toFixed(0)}°)`
          : params.distribution === 'finite_line_bisector'
          ? 'FINITE ROD'
          : params.distribution === 'finite_line_collinear'
          ? 'COLLINEAR ROD'
          : 'INFINITE WIRE';
      const bodyBadge = makeBadgeSprite(bodyTitle, chargeSignText, chargeAccentHex, 1.74, 0.46);
      if (params.distribution === 'finite_line_collinear') {
        bodyBadge.position.set(offsetX - L * 0.5, 0.8, 0);
      } else if (params.distribution === 'arc_center') {
        bodyBadge.position.set(offsetX - R * 0.72, Math.min(2.2, R + 0.55), 0);
      } else if (params.distribution === 'infinite_wire') {
        bodyBadge.position.set(offsetX - 0.15, 2.82, 0);
      } else {
        bodyBadge.position.set(
          offsetX,
          Math.min(2.35, (params.distribution === 'thin_ring' ? R : L * 0.5) + 0.55),
          0
        );
      }
      dynamicGroup.add(bodyBadge);

      // 7. Optional Surrounding 3D E-Field Vector Grid (computed directly from Riemann elements)
      if (showFieldGrid && Math.abs(params.chargeMicro) > 0.05) {
        const xs = [-2.4, -1.2, 0, 1.2, 2.4];
        const ys = [-1.5, 0, 1.5];
        const zs = viewMode === '2d' ? [0] : [-1.2, 1.2];

        for (const gx of xs) {
          for (const gy of ys) {
            for (const gz of zs) {
              // Convert grid point to physical coordinates
              const physPos: Vec3 = {
                x: (gx - offsetX) / SCENE_SCALE,
                y: gy / SCENE_SCALE,
                z: gz / SCENE_SCALE,
              };
              let ex = 0;
              let ey = 0;
              let ez = 0;
              let tooClose = false;
              for (const el of evaluation.elements) {
                const dx = physPos.x - el.position.x;
                const dy = physPos.y - el.position.y;
                const dz = physPos.z - el.position.z;
                const r2 = dx * dx + dy * dy + dz * dz;
                if (r2 < 0.24) {
                  tooClose = true;
                  break;
                }
                const invR3 = el.dqMicro / (r2 * Math.sqrt(r2));
                ex += dx * invR3;
                ey += dy * invR3;
                ez += dz * invR3;
              }
              if (tooClose) continue;
              const mag = Math.hypot(ex, ey, ez);
              if (mag < 0.05) continue;
              const dir = new THREE.Vector3(ex / mag, ey / mag, ez / mag);
              const arrowLen = Math.max(0.24, Math.min(0.46, 0.2 + Math.log10(1 + mag) * 0.18));
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(gx, gy, gz),
                  dir,
                  arrowLen,
                  GRID_SKY,
                  0.015,
                  0.044,
                  0.12,
                  0.52
                )
              );
            }
          }
        }
      }

      requestRender();
    };

    const syncCameraMode = (mode: '3d' | '2d') => {
      if (mode === '2d') {
        activeCam = orthoCam;
        controls.enabled = false;
      } else {
        activeCam = perspCam;
        controls.enabled = true;
      }
      requestRender();
    };

    rebuildRef.current = rebuildDynamicScene;
    cameraSyncRef.current = syncCameraMode;

    rebuildDynamicScene();
    syncCameraMode(propsRef.current.viewMode);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 800;
      const asp = w / h;
      perspCam.aspect = asp;
      perspCam.updateProjectionMatrix();

      orthoCam.left = (-frustumH * asp) / 2;
      orthoCam.right = (frustumH * asp) / 2;
      orthoCam.top = frustumH / 2;
      orthoCam.bottom = -frustumH / 2;
      orthoCam.updateProjectionMatrix();

      renderer.setSize(w, h);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeObjectTree(dynamicGroup);
      disposeObjectTree(stageGroup);
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      rebuildRef.current = null;
      cameraSyncRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="distributions-84-canvas"
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};
