'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Newton23Evaluation,
  Newton23Mode,
  Newton23Params,
} from '@/lib/physics/newton-third-law-2-3';

export interface Newton23ViewportProps {
  params: Newton23Params;
  evaluation: Newton23Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const ROSE_PAIR = 0xf43f5e;
const AMBER_GOLD = 0xf59e0b;
const SLATE_BENCH = 0x1e293b;
const CHROME_METAL = 0xcbd5e1;

function makeLabelSprite(
  text: string,
  colorHex: string,
  bgHex = 'rgba(4, 13, 10, 0.92)',
  worldHeight = 0.28
): THREE.Sprite {
  const fontSpec = '700 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  const probeCanvas = document.createElement('canvas');
  const probeCtx = probeCanvas.getContext('2d')!;
  probeCtx.font = fontSpec;
  const textW = probeCtx.measureText(text).width;

  const padX = 36;
  const canvasW = Math.max(160, Math.ceil(textW + padX * 2));
  const canvasH = 74;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = bgHex;
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvasW - 12, canvasH - 12, 16);
  ctx.fill();
  ctx.stroke();

  ctx.font = fontSpec;
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasW / 2, canvasH / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const worldWidth = worldHeight * (canvasW / canvasH);
  sprite.scale.set(worldWidth, worldHeight, 1);
  sprite.renderOrder = 30;
  return sprite;
}

function createForceArrow3D(
  origin: THREE.Vector3,
  dirVec: THREE.Vector3,
  length: number,
  colorHex: number,
  radius = 0.044
): THREE.Group {
  const group = new THREE.Group();
  const safeLen = Math.max(0.28, length);
  const headLen = Math.min(0.28, safeLen * 0.34);
  const shaftLen = Math.max(0.08, safeLen - headLen);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.28,
    roughness: 0.32,
    metalness: 0.15,
  });

  const shaftGeo = new THREE.CylinderGeometry(radius, radius, shaftLen, 14);
  const shaft = new THREE.Mesh(shaftGeo, mat);
  shaft.position.y = shaftLen / 2;

  const headGeo = new THREE.ConeGeometry(radius * 2.5, headLen, 16);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = shaftLen + headLen / 2;

  const inner = new THREE.Group();
  inner.add(shaft, head);

  const dir = dirVec.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  inner.quaternion.copy(quat);
  group.position.copy(origin);
  group.add(inner);
  return group;
}

/**
 * Multi-part composite lab cart / block (6+ parts, varied PBR roughness/metalness, bottom-center pivot).
 */
function createCompositeCart(
  width: number,
  height: number,
  depth: number,
  primaryHex: number,
  withWheels = true
): THREE.Group {
  const g = new THREE.Group();
  const wheelR = withWheels ? 0.12 : 0;
  const bodyBottom = wheelR * 1.45;

  // 1. Primary anodized chassis body
  const chassisMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    roughness: 0.42,
    metalness: 0.38,
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), chassisMat);
  chassis.position.y = bodyBottom + height / 2;
  g.add(chassis);

  // 2. Machined dark slate top plate
  const topPlateMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.72,
    metalness: 0.15,
  });
  const topPlate = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.86, 0.055, depth * 0.84),
    topPlateMat
  );
  topPlate.position.y = bodyBottom + height + 0.028;
  g.add(topPlate);

  // 3. Brushed chrome side rails
  const railMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.2,
    metalness: 0.82,
  });
  for (const zSign of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.94, 0.055, 0.045),
      railMat
    );
    rail.position.set(0, bodyBottom + height * 0.78, zSign * (depth / 2 + 0.012));
    g.add(rail);
  }

  // 4. Rubberized contact bumpers on left & right faces
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.88,
    metalness: 0.05,
  });
  for (const xSign of [-1, 1]) {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, height * 0.65, depth * 0.78),
      bumperMat
    );
    bumper.position.set(xSign * (width / 2 + 0.022), bodyBottom + height * 0.5, 0);
    g.add(bumper);
  }

  // 5. Brass Center-of-Mass reference stud on front face
  const studMat = new THREE.MeshStandardMaterial({
    color: AMBER_GOLD,
    emissive: AMBER_GOLD,
    emissiveIntensity: 0.22,
    roughness: 0.25,
    metalness: 0.75,
  });
  const stud = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), studMat);
  stud.position.set(0, bodyBottom + height * 0.5, depth / 2 + 0.05);
  g.add(stud);

  // 6. Optional Precision Low-Friction Wheels + Axles
  if (withWheels) {
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.85,
    });
    const wx = width * 0.32;
    const wz = depth * 0.48;
    for (const sx of [-1, 1]) {
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, depth + 0.12, 10),
        hubMat
      );
      axle.rotation.x = Math.PI / 2;
      axle.position.set(sx * wx, wheelR, 0);
      g.add(axle);

      for (const sz of [-1, 1]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelR, wheelR, 0.07, 16),
          tireMat
        );
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(sx * wx, wheelR, sz * wz);
        g.add(wheel);

        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelR * 0.48, wheelR * 0.48, 0.085, 12),
          hubMat
        );
        hub.rotation.x = Math.PI / 2;
        hub.position.set(sx * wx, wheelR, sz * wz);
        g.add(hub);
      }
    }
  }

  return g;
}

/**
 * Multi-part lab air-track bench with aluminum rails, graduated ticks, and end stops.
 */
function createAirTrackBench(length: number, yTop: number): THREE.Group {
  const g = new THREE.Group();
  const baseH = 0.26;

  // Main anodized rail beam
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(length, baseH, 1.35),
    new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.62, metalness: 0.35 })
  );
  beam.position.y = yTop - baseH / 2;
  g.add(beam);

  // Polished steel guide rails
  const guideMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.24,
    metalness: 0.82,
  });
  for (const zOff of [-0.52, 0.52]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length - 0.1, 0.035, 0.06), guideMat);
    rail.position.set(0, yTop + 0.017, zOff);
    g.add(rail);
  }

  // End bumper brackets & legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78, metalness: 0.2 });
  for (const xSign of [-1, 1]) {
    const endStop = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.34, 1.38),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.5 })
    );
    endStop.position.set(xSign * (length / 2 + 0.05), yTop + 0.06, 0);
    g.add(endStop);

    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 1.1), legMat);
    leg.position.set(xSign * (length * 0.38), yTop - baseH - 0.45, 0);
    g.add(leg);
  }

  // Center graduated tick marks
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.45 });
  for (let x = -Math.floor(length / 2) + 1; x <= Math.floor(length / 2) - 1; x += 1) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.008, 0.42), tickMat);
    tick.position.set(x, yTop + 0.012, 0);
    g.add(tick);
  }

  return g;
}

/**
 * Procedural 3D helical spring connecting x1 to x2 at height y.
 */
function createHelicalSpring(x1: number, x2: number, y: number, coils = 8, radius = 0.14): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const steps = coils * 16;
  const span = Math.max(0.25, x2 - x1);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = x1 + u * span;
    const angle = u * coils * Math.PI * 2;
    const taper = Math.min(1, u * 10, (1 - u) * 10);
    pts.push(new THREE.Vector3(x, y + Math.sin(angle) * radius * taper, Math.cos(angle) * radius * taper));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, steps, 0.026, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 0.2,
    roughness: 0.25,
    metalness: 0.78,
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * Multi-part precision spoked pulley wheel (grooved rim + 6 spokes + brass hub + optional heavy rim).
 */
function createSpokedPulley(radius: number, isIdeal: boolean, angleRad: number): THREE.Group {
  const g = new THREE.Group();
  const wheel = new THREE.Group();

  // Outer grooved torus rim
  const rimMat = new THREE.MeshStandardMaterial({
    color: isIdeal ? 0x38bdf8 : 0xf59e0b,
    roughness: isIdeal ? 0.26 : 0.42,
    metalness: isIdeal ? 0.75 : 0.65,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, isIdeal ? 0.065 : 0.11, 14, 36), rimMat);
  wheel.add(rim);

  // Inner flange discs
  const flangeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.5,
  });
  for (const zOff of [-0.075, 0.075]) {
    const flange = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.76, radius + 0.06, 32),
      new THREE.MeshStandardMaterial({
        color: isIdeal ? 0x64748b : 0xd97706,
        roughness: 0.35,
        metalness: 0.72,
        side: THREE.DoubleSide,
      })
    );
    flange.position.z = zOff;
    wheel.add(flange);
  }

  // 6 spokes (make rotation unmistakable during motion)
  const spokeMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.22,
    metalness: 0.85,
  });
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.85, 0.05, 0.045), spokeMat);
    spoke.rotation.z = (i * Math.PI) / 6;
    wheel.add(spoke);
  }

  // Marker dot on one spoke to make angular displacement visually obvious
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.058, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.35 })
  );
  marker.position.set(radius * 0.68, 0, 0.055);
  wheel.add(marker);

  // Center axle hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 18), flangeMat);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  wheel.rotation.z = -angleRad;
  g.add(wheel);

  // Brass axle pin (stationary)
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.36, 14),
    new THREE.MeshStandardMaterial({
      color: isIdeal ? AMBER_GOLD : ROSE_PAIR,
      roughness: 0.22,
      metalness: 0.82,
    })
  );
  pin.rotation.x = Math.PI / 2;
  g.add(pin);

  return g;
}

/**
 * Maps local tension fraction [0..1] to an informative heat color (sky-emerald -> gold -> crimson).
 */
function tensionHeatColor(frac: number, uniform: boolean): number {
  if (uniform) return EMERALD_MAIN;
  const t = Math.max(0, Math.min(1, frac));
  const c = new THREE.Color();
  if (t < 0.5) {
    c.lerpColors(new THREE.Color(0x38bdf8), new THREE.Color(0xf59e0b), t * 2);
  } else {
    c.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xf43f5e), (t - 0.5) * 2);
  }
  return c.getHex();
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const sm = m as THREE.SpriteMaterial;
        if (sm.map) sm.map.dispose();
        m.dispose();
      });
    }
  });
}

export const Newton23Viewport: React.FC<Newton23ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ params, evaluation, viewMode });
  const rebuildRef = useRef<() => void>(() => {});
  const setCameraViewRef = useRef<(vm: '3d' | '2d', m: Newton23Mode) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 800;
    const aspect = width / height;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d0a);
    scene.fog = new THREE.FogExp2(0x040d0a, 0.022);

    const perspCamera = new THREE.PerspectiveCamera(40, aspect, 0.1, 120);
    const frustumSize = 9.4;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      120
    );
    let activeCamera: THREE.Camera = perspCamera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
    }

    // Balanced warm key + cool hemisphere studio rig
    const hemi = new THREE.HemisphereLight(0xbce8ff, 0x0b1f18, 1.05);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.55);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-7, 5, -6);
    scene.add(rimLight);

    // Subtle grounded laboratory floor grid
    const floorGroup = new THREE.Group();
    const grid = new THREE.GridHelper(24, 24, 0x10b981, 0x0d261e);
    grid.position.y = -2.25;
    floorGroup.add(grid);
    scene.add(floorGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const controls = new OrbitControls(perspCamera as THREE.Camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4;
    controls.maxDistance = 24;

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let suppressControlChange = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 28);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, activeCamera);
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const onControlsChange = () => {
      if (!suppressControlChange) requestRender();
    };
    controls.addEventListener('change', onControlsChange);

    const setCameraView = (vm: '3d' | '2d', mode: Newton23Mode, triggerRender = true) => {
      suppressControlChange = true;
      const target = new THREE.Vector3(0, 0.05, 0);
      if (mode === 'string_tension') target.set(0, 0.15, 0);
      if (mode === 'ideal_pulley') target.set(0, 0.25, 0);

      if (vm === '2d') {
        activeCamera = orthoCamera;
        orthoCamera.position.set(target.x, target.y, 14);
        orthoCamera.lookAt(target);
        controls.object = orthoCamera;
        controls.enableRotate = false;
      } else {
        activeCamera = perspCamera;
        if (mode === 'action_reaction') {
          perspCamera.position.set(0.25, 2.05, 11.4);
        } else if (mode === 'internal_com') {
          perspCamera.position.set(0.0, 2.35, 11.6);
        } else if (mode === 'string_tension') {
          perspCamera.position.set(0.45, 1.1, 10.9);
        } else {
          perspCamera.position.set(0.35, 1.35, 11.2);
        }
        perspCamera.lookAt(target);
        controls.object = perspCamera;
        controls.enableRotate = true;
      }
      controls.target.copy(target);
      controls.update();
      suppressControlChange = false;
      if (triggerRender) requestRender();
    };
    setCameraViewRef.current = setCameraView;

    const rebuildScene = () => {
      while (dynamicGroup.children.length > 0) {
        const ch = dynamicGroup.children[0];
        dynamicGroup.remove(ch);
        disposeObject3D(ch);
      }

      const { params: p, evaluation: ev } = propsRef.current;

      // =====================================================================
      // MODE 1: PAIRED ACTION-REACTION FORCES (2.3.A.1)
      // =====================================================================
      if (p.mode === 'action_reaction') {
        if (p.arPreset === 'book_earth') {
          // Oak/slate lab table positioned cleanly in upper-middle frame
          const tableY = 0.72;
          const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.16, 1.8),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 })
          );
          tableTop.position.set(0, tableY, 0);
          dynamicGroup.add(tableTop);

          const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 });
          for (const sx of [-1.42, 1.42]) {
            for (const sz of [-0.65, 0.65]) {
              const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.0, 10), legMat);
              leg.position.set(sx, tableY - 0.58, sz);
              dynamicGroup.add(leg);
            }
          }

          // Composite hardcover textbook resting on table
          const bookG = new THREE.Group();
          const coverMat = new THREE.MeshStandardMaterial({
            color: EMERALD_MAIN,
            roughness: 0.48,
            metalness: 0.18,
          });
          const pagesMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85, metalness: 0.0 });
          const coverBot = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.05, 1.0), coverMat);
          const pages = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.26, 0.94), pagesMat);
          pages.position.y = 0.15;
          const coverTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.05, 1.0), coverMat);
          coverTop.position.y = 0.3;
          const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 1.0), coverMat);
          spine.position.set(-0.67, 0.15, 0);
          bookG.add(coverBot, pages, coverTop, spine);
          bookG.position.set(0, tableY + 0.11, 0);
          dynamicGroup.add(bookG);

          // Planet Earth curved dome cleanly above bottom legend
          const earthCenter = new THREE.Vector3(0, -1.92, 0);
          const earthGroup = new THREE.Group();
          const ocean = new THREE.Mesh(
            new THREE.SphereGeometry(0.95, 32, 24),
            new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.55, metalness: 0.12 })
          );
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.96, 0.026, 8, 48),
            new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.6 })
          );
          band.rotation.x = Math.PI / 2.2;
          const coreDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 14, 14),
            new THREE.MeshStandardMaterial({ color: AMBER_GOLD, emissive: AMBER_GOLD, emissiveIntensity: 0.4 })
          );
          coreDot.position.set(0, 0.35, 0.92);
          earthGroup.add(ocean, band, coreDot);
          earthGroup.position.copy(earthCenter);
          dynamicGroup.add(earthGroup);

          const bookCom = new THREE.Vector3(0, tableY + 0.28, 0.62);
          const earthAnchor = new THREE.Vector3(0, -1.58, 0.72);
          const weightMag = ev.pairMagAonB;

          // F_Table on Book (upward sky blue — NOT 3rd-law pair to gravity!)
          dynamicGroup.add(createForceArrow3D(bookCom, new THREE.Vector3(0, 1, 0), 1.15, SKY_MAIN));
          const lblFn = makeLabelSprite(`F_Table on Bk +${weightMag.toFixed(1)} N`, '#7dd3fc', undefined, 0.27);
          lblFn.position.set(0.0, bookCom.y + 1.38, 0.72);
          dynamicGroup.add(lblFn);

          // True 3rd Law Gravity Pair (Rose Red) with clear vertical separation
          dynamicGroup.add(createForceArrow3D(bookCom, new THREE.Vector3(0, -1, 0), 1.15, ROSE_PAIR));
          const lblFgBook = makeLabelSprite(`F_Earth on Bk -${weightMag.toFixed(1)} N`, '#fda4af', undefined, 0.27);
          lblFgBook.position.set(-1.68, bookCom.y - 0.58, 0.72);
          dynamicGroup.add(lblFgBook);

          dynamicGroup.add(createForceArrow3D(earthAnchor, new THREE.Vector3(0, 1, 0), 1.15, ROSE_PAIR));
          const lblFgEarth = makeLabelSprite(`F_Bk on Earth +${weightMag.toFixed(1)} N`, '#fda4af', undefined, 0.27);
          lblFgEarth.position.set(1.68, earthAnchor.y + 0.62, 0.78);
          dynamicGroup.add(lblFgEarth);

          if (p.highlightThirdLawPair) {
            const linkPts = [
              new THREE.Vector3(-0.22, bookCom.y - 0.72, 0.7),
              new THREE.Vector3(-0.78, -0.35, 0.76),
              new THREE.Vector3(-0.22, earthAnchor.y + 0.72, 0.76),
            ];
            const linkCurve = new THREE.CatmullRomCurve3(linkPts);
            const linkGeo = new THREE.BufferGeometry().setFromPoints(linkCurve.getPoints(28));
            const linkLine = new THREE.Line(
              linkGeo,
              new THREE.LineDashedMaterial({ color: ROSE_PAIR, dashSize: 0.12, gapSize: 0.08 })
            );
            linkLine.computeLineDistances();
            dynamicGroup.add(linkLine);
          }

          const earthLbl = makeLabelSprite('PLANET EARTH (Gravity Partner)', '#7dd3fc', undefined, 0.25);
          earthLbl.position.set(0, -2.08, 1.05);
          dynamicGroup.add(earthLbl);
        } else {
          // Contact Push or Ice Push-Off on Air-Track Bench
          const trackY = -0.82;
          dynamicGroup.add(createAirTrackBench(7.6, trackY));

          const scaleA = 0.78 + Math.min(0.36, p.massA * 0.032);
          const scaleB = 0.78 + Math.min(0.36, p.massB * 0.032);
          const wA = 0.92 * scaleA;
          const hA = 0.64 * scaleA;
          const wB = 0.92 * scaleB;
          const hB = 0.64 * scaleB;

          const cartA = createCompositeCart(wA, hA, 0.78, EMERALD_MAIN, true);
          const cartB = createCompositeCart(wB, hB, 0.78, SKY_MAIN, true);

          // Keep contact flush in contact_push, separated in ice_pushoff
          let xA = ev.posA_x;
          let xB = ev.posB_x;
          if (p.arPreset === 'contact_push') {
            const mid = 0.5 * (ev.posA_x + ev.posB_x) - 0.1;
            xA = mid - wA / 2 - 0.04;
            xB = mid + wB / 2 + 0.04;
          }
          cartA.position.set(xA, trackY + 0.02, 0);
          cartB.position.set(xB, trackY + 0.02, 0);
          dynamicGroup.add(cartA, cartB);

          const comA = new THREE.Vector3(xA, trackY + 0.18 + hA * 0.52, 0.54);
          const comB = new THREE.Vector3(xB, trackY + 0.18 + hB * 0.52, 0.54);
          const maxF = Math.max(20, p.appliedForceN, ev.pairMagAonB);

          // External Push on A (only in contact_push)
          if (p.arPreset === 'contact_push' && p.appliedForceN > 0.5) {
            const lenPush = 0.55 + (p.appliedForceN / maxF) * 0.95;
            dynamicGroup.add(
              createForceArrow3D(
                new THREE.Vector3(xA - wA / 2 - lenPush - 0.08, comA.y, 0.54),
                new THREE.Vector3(1, 0, 0),
                lenPush,
                EMERALD_MAIN
              )
            );
            const lblPush = makeLabelSprite(`F_push ${p.appliedForceN.toFixed(0)} N`, '#34d399', undefined, 0.25);
            lblPush.position.set(xA - wA / 2 - lenPush * 0.55, comA.y - 0.34, 0.62);
            dynamicGroup.add(lblPush);
          }

          // Third-Law Pair Arrows (Equal length, opposite direction, acting on A & B!)
          const pairLen = 0.5 + (ev.pairMagAonB / maxF) * 0.95;
          if (ev.pairMagAonB > 0.1) {
            const originBonA = new THREE.Vector3(comA.x, comA.y + 0.55, 0.62);
            const originAonB = new THREE.Vector3(comB.x, comB.y + 0.55, 0.62);
            dynamicGroup.add(createForceArrow3D(originBonA, new THREE.Vector3(-1, 0, 0), pairLen, ROSE_PAIR, 0.048));
            dynamicGroup.add(createForceArrow3D(originAonB, new THREE.Vector3(1, 0, 0), pairLen, ROSE_PAIR, 0.048));

            const lblBonA = makeLabelSprite(
              `F_B on A (-${ev.pairMagBonA.toFixed(1)} N)`,
              '#fda4af',
              undefined,
              0.27
            );
            lblBonA.position.set(originBonA.x - pairLen * 0.72, originBonA.y + 0.36, 0.7);
            dynamicGroup.add(lblBonA);

            const lblAonB = makeLabelSprite(
              `F_A on B (+${ev.pairMagAonB.toFixed(1)} N)`,
              '#fda4af',
              undefined,
              0.27
            );
            lblAonB.position.set(originAonB.x + pairLen * 0.72, originAonB.y + 0.36, 0.7);
            dynamicGroup.add(lblAonB);

            if (p.highlightThirdLawPair) {
              const arcCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(originBonA.x - pairLen * 0.2, originBonA.y + 0.14, 0.68),
                new THREE.Vector3(0.5 * (originBonA.x + originAonB.x), Math.max(originBonA.y, originAonB.y) + 1.02, 0.68),
                new THREE.Vector3(originAonB.x + pairLen * 0.2, originAonB.y + 0.14, 0.68),
              ]);
              const arcLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(arcCurve.getPoints(32)),
                new THREE.LineDashedMaterial({ color: ROSE_PAIR, dashSize: 0.14, gapSize: 0.08 })
              );
              arcLine.computeLineDistances();
              dynamicGroup.add(arcLine);

              const pairBadge = makeLabelSprite(
                '3RD LAW PAIR: |F_A on B| = |F_B on A|',
                '#fb7185',
                'rgba(36, 8, 16, 0.94)',
                0.28
              );
              pairBadge.position.set(
                0.5 * (originBonA.x + originAonB.x),
                Math.max(originBonA.y, originAonB.y) + 1.24,
                0.72
              );
              dynamicGroup.add(pairBadge);
            }
          }

          // Well-separated mass & acceleration tags below the track
          const tagA = makeLabelSprite(
            `A: ${p.massA.toFixed(1)} kg · a=${ev.accelA_x.toFixed(1)} m/s²`,
            '#34d399',
            undefined,
            0.25
          );
          tagA.position.set(Math.min(xA - 0.55, -1.25), trackY - 0.58, 0.85);
          dynamicGroup.add(tagA);

          const tagB = makeLabelSprite(
            `B: ${p.massB.toFixed(1)} kg · a=${ev.accelB_x.toFixed(1)} m/s²`,
            '#7dd3fc',
            undefined,
            0.25
          );
          tagB.position.set(Math.max(xB + 0.55, 1.25), trackY - 0.58, 0.85);
          dynamicGroup.add(tagB);

          if (p.arPreset === 'ice_pushoff') {
            const comX = (p.massA * xA + p.massB * xB) / (p.massA + p.massB);
            const comDiamond = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.16, 0),
              new THREE.MeshStandardMaterial({
                color: AMBER_GOLD,
                emissive: AMBER_GOLD,
                emissiveIntensity: 0.45,
                roughness: 0.25,
                metalness: 0.7,
              })
            );
            comDiamond.position.set(comX, trackY + 0.35, 0.65);
            dynamicGroup.add(comDiamond);

            const comLbl = makeLabelSprite('System COM (a_cm = 0)', '#fbbf24', undefined, 0.25);
            comLbl.position.set(comX, trackY - 1.02, 0.85);
            dynamicGroup.add(comLbl);
          }
        }
      }

      // =====================================================================
      // MODE 2: INTERNAL FORCES & SYSTEM COM (2.3.A.2)
      // =====================================================================
      else if (p.mode === 'internal_com') {
        const trackY = -0.85;
        dynamicGroup.add(createAirTrackBench(9.0, trackY));

        const scaleA = 0.82 + Math.min(0.36, p.massA * 0.032);
        const scaleB = 0.82 + Math.min(0.36, p.massB * 0.032);
        const wA = 0.9 * scaleA;
        const hA = 0.66 * scaleA;
        const wB = 0.9 * scaleB;
        const hB = 0.66 * scaleB;

        const cartA = createCompositeCart(wA, hA, 0.8, EMERALD_MAIN, true);
        const cartB = createCompositeCart(wB, hB, 0.8, SKY_MAIN, true);
        cartA.position.set(ev.posA_x, trackY + 0.02, 0);
        cartB.position.set(ev.posB_x, trackY + 0.02, 0);
        dynamicGroup.add(cartA, cartB);

        // Dynamic 3D helical internal spring between inner bumper faces of Cart A and Cart B
        const springY = trackY + 0.2 + Math.min(hA, hB) * 0.48;
        const springLeft = ev.posA_x + wA / 2 + 0.03;
        const springRight = ev.posB_x - wB / 2 - 0.03;
        if (springRight > springLeft + 0.15) {
          dynamicGroup.add(createHelicalSpring(springLeft, springRight, springY, 8, 0.14));
        }

        // Translucent System Boundary {A + B} enclosure
        if (p.showSystemBoundary) {
          const boxMinX = ev.posA_x - wA / 2 - 0.35;
          const boxMaxX = ev.posB_x + wB / 2 + 0.35;
          const boxW = boxMaxX - boxMinX;
          const boxH = Math.max(hA, hB) + 0.95;
          const boxCenterX = 0.5 * (boxMinX + boxMaxX);
          const boxCenterY = trackY + boxH / 2 + 0.06;

          const hullGeo = new THREE.BoxGeometry(boxW, boxH, 1.38);
          const hullMat = new THREE.MeshBasicMaterial({
            color: EMERALD_MAIN,
            transparent: true,
            opacity: 0.09,
            depthWrite: false,
          });
          const hull = new THREE.Mesh(hullGeo, hullMat);
          hull.position.set(boxCenterX, boxCenterY, 0);
          dynamicGroup.add(hull);

          const edges = new THREE.EdgesGeometry(hullGeo);
          const frame = new THREE.LineSegments(
            edges,
            new THREE.LineDashedMaterial({ color: EMERALD_MAIN, dashSize: 0.18, gapSize: 0.1 })
          );
          frame.computeLineDistances();
          frame.position.copy(hull.position);
          dynamicGroup.add(frame);

          const sysLbl = makeLabelSprite(
            'SYSTEM {A + B}: Internal Pair Cancels (ΣF_int = 0)',
            '#34d399',
            'rgba(4, 24, 16, 0.94)',
            0.27
          );
          sysLbl.position.set(boxCenterX, boxCenterY + boxH / 2 + 0.32, 0.55);
          dynamicGroup.add(sysLbl);
        }

        // Prominent Golden System Center-of-Mass (COM) marker + vertical laser drop line
        const comY = trackY + 1.5;
        const comMarker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          new THREE.MeshStandardMaterial({
            color: AMBER_GOLD,
            emissive: AMBER_GOLD,
            emissiveIntensity: 0.5,
            roughness: 0.2,
            metalness: 0.7,
          })
        );
        comMarker.position.set(ev.posCom_x, comY, 0.58);
        dynamicGroup.add(comMarker);

        const plumbGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ev.posCom_x, trackY + 0.05, 0.58),
          new THREE.Vector3(ev.posCom_x, comY - 0.18, 0.58),
        ]);
        const plumbLine = new THREE.Line(
          plumbGeo,
          new THREE.LineDashedMaterial({ color: AMBER_GOLD, dashSize: 0.1, gapSize: 0.08 })
        );
        plumbLine.computeLineDistances();
        dynamicGroup.add(plumbLine);

        const comTag = makeLabelSprite(
          `COM: a_cm = ${ev.accelCom_x.toFixed(2)} m/s²`,
          '#fbbf24',
          undefined,
          0.26
        );
        comTag.position.set(ev.posCom_x, trackY - 0.58, 0.85);
        dynamicGroup.add(comTag);

        // Internal spring arrows on Cart A & Cart B
        const fAonBVec = ev.forcesB.find(f => f.id === 'int-a-on-b');
        const fIntVal = fAonBVec ? fAonBVec.fx : 0;
        if (Math.abs(fIntVal) > 0.8) {
          const dirSign = Math.sign(fIntVal);
          const lenInt = 0.45 + (Math.abs(fIntVal) / Math.max(25, p.internalForceAmpN)) * 0.85;
          dynamicGroup.add(
            createForceArrow3D(
              new THREE.Vector3(ev.posA_x, springY + 0.42, 0.62),
              new THREE.Vector3(-dirSign, 0, 0),
              lenInt,
              ROSE_PAIR,
              0.044
            )
          );
          dynamicGroup.add(
            createForceArrow3D(
              new THREE.Vector3(ev.posB_x, springY + 0.42, 0.62),
              new THREE.Vector3(dirSign, 0, 0),
              lenInt,
              ROSE_PAIR,
              0.044
            )
          );
        }

        // External Thruster Arrow if F_ext != 0
        if (Math.abs(p.externalForceN) > 0.5) {
          const extLen = 0.55 + (Math.abs(p.externalForceN) / 40) * 0.95;
          const dirExt = Math.sign(p.externalForceN);
          dynamicGroup.add(
            createForceArrow3D(
              new THREE.Vector3(ev.posA_x - wA / 2 - extLen - 0.12, springY, 0.62),
              new THREE.Vector3(dirExt, 0, 0),
              extLen,
              EMERALD_MAIN,
              0.048
            )
          );
          const extLbl = makeLabelSprite(`F_ext ${p.externalForceN.toFixed(0)} N`, '#34d399', undefined, 0.25);
          extLbl.position.set(ev.posA_x - wA / 2 - extLen * 0.55, springY - 0.36, 0.68);
          dynamicGroup.add(extLbl);
        }
      }

      // =====================================================================
      // MODE 3: MICRO-SEGMENT STRING TENSION (2.3.A.3, 2.3.A.3.i–iii)
      // =====================================================================
      else if (p.mode === 'string_tension') {
        const segs = ev.segments;
        const nSeg = segs.length;
        const probeIdx = Math.max(0, Math.min(nSeg - 1, p.probeSegmentIndex));
        const tMin = ev.tensionBottomN;
        const tMax = Math.max(tMin + 0.01, ev.tensionTopN);
        const isVert = p.stringOrientation === 'vertical_hanging';

        if (isVert) {
          const ceilingY = 2.25;
          const gantry = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.2, 0.85),
            new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.55, metalness: 0.45 })
          );
          gantry.position.set(0, ceilingY, 0);
          dynamicGroup.add(gantry);

          const hook = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.03, 10, 20),
            new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.25, metalness: 0.85 })
          );
          hook.position.set(0, ceilingY - 0.15, 0);
          dynamicGroup.add(hook);

          const ropeBotY = -0.95;
          const ropeTopY = ceilingY - 0.2;
          const segH = (ropeTopY - ropeBotY) / nSeg;
          const radius = ev.isTensionUniform ? 0.068 : 0.115;

          for (let i = 0; i < nSeg; i++) {
            const seg = segs[i];
            const yCenter = ropeBotY + (i + 0.5) * segH;
            const frac = (seg.tMidN - tMin) / (tMax - tMin);
            const hex = tensionHeatColor(frac, ev.isTensionUniform);
            const isProbe = i === probeIdx;

            const segMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(radius, radius, segH * 0.84, 18),
              new THREE.MeshStandardMaterial({
                color: hex,
                emissive: hex,
                emissiveIntensity: isProbe ? 0.48 : 0.15,
                roughness: 0.32,
                metalness: 0.35,
              })
            );
            segMesh.position.set(0, yCenter, 0);
            dynamicGroup.add(segMesh);

            const coupler = new THREE.Mesh(
              new THREE.TorusGeometry(radius * 0.95, 0.022, 8, 16),
              new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.85 })
            );
            coupler.rotation.x = Math.PI / 2;
            coupler.position.set(0, ropeBotY + i * segH, 0);
            dynamicGroup.add(coupler);

            if (isProbe) {
              const collar = new THREE.Mesh(
                new THREE.TorusGeometry(radius + 0.12, 0.028, 10, 24),
                new THREE.MeshStandardMaterial({
                  color: AMBER_GOLD,
                  emissive: AMBER_GOLD,
                  emissiveIntensity: 0.5,
                })
              );
              collar.rotation.x = Math.PI / 2;
              collar.position.set(0, yCenter, 0);
              dynamicGroup.add(collar);

              const arrowX = 0.48;
              const upLen = 0.5 + (seg.tUpperN / Math.max(20, ev.tensionTopN)) * 0.5;
              const dnLen = 0.5 + (seg.tLowerN / Math.max(20, ev.tensionTopN)) * 0.5;
              dynamicGroup.add(
                createForceArrow3D(
                  new THREE.Vector3(arrowX, yCenter + 0.05, 0.25),
                  new THREE.Vector3(0, 1, 0),
                  upLen,
                  EMERALD_MAIN,
                  0.036
                )
              );
              dynamicGroup.add(
                createForceArrow3D(
                  new THREE.Vector3(arrowX, yCenter - 0.05, 0.25),
                  new THREE.Vector3(0, -1, 0),
                  dnLen,
                  SKY_MAIN,
                  0.036
                )
              );

              const upLbl = makeLabelSprite(`T_above ${seg.tUpperN.toFixed(1)} N`, '#34d399', undefined, 0.26);
              upLbl.position.set(arrowX + 1.25, yCenter + upLen * 0.72, 0.35);
              dynamicGroup.add(upLbl);

              const dnLbl = makeLabelSprite(`T_below ${seg.tLowerN.toFixed(1)} N`, '#7dd3fc', undefined, 0.26);
              dnLbl.position.set(arrowX + 1.25, yCenter - dnLen * 0.72, 0.35);
              dynamicGroup.add(dnLbl);

              const segLbl = makeLabelSprite(`Seg #${i + 1} (dm)`, '#fbbf24', undefined, 0.25);
              segLbl.position.set(-1.15, yCenter, 0.35);
              dynamicGroup.add(segLbl);
            }
          }

          const loadScale = 0.82 + Math.min(0.36, p.loadMassKg * 0.03);
          const loadBlock = createCompositeCart(
            0.9 * loadScale,
            0.72 * loadScale,
            0.8 * loadScale,
            SKY_MAIN,
            false
          );
          loadBlock.position.set(0, ropeBotY - 0.72 * loadScale, 0);
          dynamicGroup.add(loadBlock);

          const loadLbl = makeLabelSprite(`Load: ${p.loadMassKg.toFixed(1)} kg`, '#7dd3fc', undefined, 0.26);
          loadLbl.position.set(0, ropeBotY - 0.72 * loadScale - 0.32, 0.6);
          dynamicGroup.add(loadLbl);

          const topTag = makeLabelSprite(`T_top = ${ev.tensionTopN.toFixed(1)} N`, '#fda4af', undefined, 0.26);
          topTag.position.set(-1.35, ropeTopY - 0.08, 0.45);
          dynamicGroup.add(topTag);

          const botTag = makeLabelSprite(`T_bot = ${ev.tensionBottomN.toFixed(1)} N`, '#7dd3fc', undefined, 0.26);
          botTag.position.set(-1.35, ropeBotY + 0.14, 0.45);
          dynamicGroup.add(botTag);
        } else {
          const trackY = -0.75;
          dynamicGroup.add(createAirTrackBench(7.8, trackY));

          const blockX = -2.05;
          const loadBlock = createCompositeCart(0.95, 0.7, 0.8, SKY_MAIN, true);
          loadBlock.position.set(blockX, trackY + 0.02, 0);
          dynamicGroup.add(loadBlock);

          const ropeY = trackY + 0.5;
          const ropeLeftX = blockX + 0.5;
          const ropeRightX = 1.65;
          const segW = (ropeRightX - ropeLeftX) / nSeg;
          const radius = ev.isTensionUniform ? 0.068 : 0.115;

          for (let i = 0; i < nSeg; i++) {
            const seg = segs[i];
            const xCenter = ropeLeftX + (i + 0.5) * segW;
            const frac = (seg.tMidN - tMin) / (tMax - tMin);
            const hex = tensionHeatColor(frac, ev.isTensionUniform);
            const isProbe = i === probeIdx;

            const segMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(radius, radius, segW * 0.84, 16),
              new THREE.MeshStandardMaterial({
                color: hex,
                emissive: hex,
                emissiveIntensity: isProbe ? 0.5 : 0.16,
                roughness: 0.32,
                metalness: 0.35,
              })
            );
            segMesh.rotation.z = Math.PI / 2;
            segMesh.position.set(xCenter, ropeY, 0);
            dynamicGroup.add(segMesh);

            if (isProbe) {
              const collar = new THREE.Mesh(
                new THREE.TorusGeometry(radius + 0.12, 0.028, 10, 24),
                new THREE.MeshStandardMaterial({ color: AMBER_GOLD, emissive: AMBER_GOLD, emissiveIntensity: 0.5 })
              );
              collar.rotation.y = Math.PI / 2;
              collar.position.set(xCenter, ropeY, 0);
              dynamicGroup.add(collar);

              const arrowY = ropeY + 0.58;
              dynamicGroup.add(
                createForceArrow3D(
                  new THREE.Vector3(xCenter + 0.05, arrowY, 0.35),
                  new THREE.Vector3(1, 0, 0),
                  0.78,
                  EMERALD_MAIN,
                  0.036
                )
              );
              dynamicGroup.add(
                createForceArrow3D(
                  new THREE.Vector3(xCenter - 0.05, arrowY, 0.35),
                  new THREE.Vector3(-1, 0, 0),
                  0.78,
                  SKY_MAIN,
                  0.036
                )
              );

              const fLbl = makeLabelSprite(`T_front ${seg.tUpperN.toFixed(1)} N`, '#34d399', undefined, 0.26);
              fLbl.position.set(xCenter + 1.05, arrowY + 0.36, 0.45);
              dynamicGroup.add(fLbl);

              const rLbl = makeLabelSprite(`T_rear ${seg.tLowerN.toFixed(1)} N`, '#7dd3fc', undefined, 0.26);
              rLbl.position.set(xCenter - 1.05, arrowY + 0.36, 0.45);
              dynamicGroup.add(rLbl);
            }
          }

          dynamicGroup.add(
            createForceArrow3D(
              new THREE.Vector3(ropeRightX + 0.08, ropeY, 0.25),
              new THREE.Vector3(1, 0, 0),
              1.1,
              ROSE_PAIR,
              0.046
            )
          );
          const pullLbl = makeLabelSprite(`F_pull ${p.horizontalPullN.toFixed(0)} N`, '#fda4af', undefined, 0.26);
          pullLbl.position.set(ropeRightX + 0.65, ropeY - 0.42, 0.45);
          dynamicGroup.add(pullLbl);

          const blkLbl = makeLabelSprite(`Block ${p.loadMassKg.toFixed(1)} kg · a=${ev.ropeAccelMs2.toFixed(1)} m/s²`, '#7dd3fc', undefined, 0.25);
          blkLbl.position.set(blockX + 0.35, trackY - 0.58, 0.6);
          dynamicGroup.add(blkLbl);
        }
      }

      // =====================================================================
      // MODE 4: IDEAL VS NON-IDEAL PULLEY (2.3.A.3.iv)
      // =====================================================================
      else if (p.mode === 'ideal_pulley') {
        const pulleyR = 0.64;
        const disp = ev.pulleyDispM;

        if (p.pulleyPreset === 'atwood') {
          const pulleyPos = new THREE.Vector3(0, 1.55, 0);

          const beam = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.2, 0.85),
            new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.6, metalness: 0.4 })
          );
          beam.position.set(0, pulleyPos.y + 0.88, 0);
          dynamicGroup.add(beam);

          const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.82, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.65 })
          );
          bracket.position.set(0, pulleyPos.y + 0.42, 0);
          dynamicGroup.add(bracket);

          const wheel = createSpokedPulley(pulleyR, p.isIdealPulley, ev.pulleyAngleRad);
          wheel.position.copy(pulleyPos);
          dynamicGroup.add(wheel);

          const yA = -0.55 + disp;
          const yB = -0.55 - disp;
          const sA = 0.76 + Math.min(0.28, p.pulleyMassA * 0.028);
          const sB = 0.76 + Math.min(0.28, p.pulleyMassB * 0.028);

          const blockA = createCompositeCart(0.82 * sA, 0.7 * sA, 0.72 * sA, EMERALD_MAIN, false);
          blockA.position.set(-pulleyR, yA - 0.7 * sA, 0);
          const blockB = createCompositeCart(0.82 * sB, 0.7 * sB, 0.72 * sB, SKY_MAIN, false);
          blockB.position.set(pulleyR, yB - 0.7 * sB, 0);
          dynamicGroup.add(blockA, blockB);

          const cordMatA = new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, roughness: 0.4 });
          const cordMatB = new THREE.MeshStandardMaterial({
            color: p.isIdealPulley ? EMERALD_MAIN : ROSE_PAIR,
            roughness: 0.4,
          });
          const lenA = Math.max(0.2, pulleyPos.y - yA);
          const cordA = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, lenA, 10), cordMatA);
          cordA.position.set(-pulleyR, yA + lenA / 2, 0);
          dynamicGroup.add(cordA);

          const lenB = Math.max(0.2, pulleyPos.y - yB);
          const cordB = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, lenB, 10), cordMatB);
          cordB.position.set(pulleyR, yB + lenB / 2, 0);
          dynamicGroup.add(cordB);

          const maxT = Math.max(25, ev.pulleyTensionAN, ev.pulleyTensionBN);
          const tLenA = 0.5 + (ev.pulleyTensionAN / maxT) * 0.85;
          const tLenB = 0.5 + (ev.pulleyTensionBN / maxT) * 0.85;
          dynamicGroup.add(
            createForceArrow3D(new THREE.Vector3(-pulleyR - 0.22, yA + 0.08, 0.45), new THREE.Vector3(0, 1, 0), tLenA, EMERALD_MAIN, 0.04)
          );
          dynamicGroup.add(
            createForceArrow3D(new THREE.Vector3(pulleyR + 0.22, yB + 0.08, 0.45), new THREE.Vector3(0, 1, 0), tLenB, p.isIdealPulley ? EMERALD_MAIN : ROSE_PAIR, 0.04)
          );

          const lblTa = makeLabelSprite(`T_A = ${ev.pulleyTensionAN.toFixed(1)} N`, '#34d399', undefined, 0.26);
          lblTa.position.set(-pulleyR - 1.25, yA + 0.58, 0.55);
          dynamicGroup.add(lblTa);

          const lblTb = makeLabelSprite(
            `T_B = ${ev.pulleyTensionBN.toFixed(1)} N`,
            p.isIdealPulley ? '#34d399' : '#fda4af',
            undefined,
            0.26
          );
          lblTb.position.set(pulleyR + 1.25, yB + 0.58, 0.55);
          dynamicGroup.add(lblTb);

          const lblA = makeLabelSprite(`m_A = ${p.pulleyMassA.toFixed(1)} kg`, '#34d399', undefined, 0.24);
          lblA.position.set(-pulleyR - 0.2, yA - 0.7 * sA - 0.3, 0.55);
          dynamicGroup.add(lblA);

          const lblB = makeLabelSprite(`m_B = ${p.pulleyMassB.toFixed(1)} kg`, '#7dd3fc', undefined, 0.24);
          lblB.position.set(pulleyR + 0.2, yB - 0.7 * sB - 0.3, 0.55);
          dynamicGroup.add(lblB);

          const axleLbl = makeLabelSprite(
            p.isIdealPulley ? 'IDEAL PULLEY: T_A = T_B' : `REAL PULLEY: ΔT = ${ev.pulleyTensionDiffN.toFixed(1)} N`,
            p.isIdealPulley ? '#38bdf8' : '#fbbf24',
            undefined,
            0.26
          );
          axleLbl.position.set(0, pulleyPos.y + 1.18, 0.55);
          dynamicGroup.add(axleLbl);
        } else {
          const tableY = 0.45;
          const tableRightX = 0.95;
          const tableW = 4.0;
          const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(tableW, 0.22, 1.35),
            new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.6, metalness: 0.35 })
          );
          tableTop.position.set(tableRightX - tableW / 2, tableY - 0.11, 0);
          dynamicGroup.add(tableTop);

          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 2.3, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, metalness: 0.2 })
          );
          leg.position.set(tableRightX - 0.55, tableY - 1.36, 0);
          dynamicGroup.add(leg);

          const pulleyPos = new THREE.Vector3(tableRightX + 0.42, tableY + 0.14, 0);
          const wheel = createSpokedPulley(0.46, p.isIdealPulley, ev.pulleyAngleRad);
          wheel.position.copy(pulleyPos);
          dynamicGroup.add(wheel);

          const xA = -1.45 + disp;
          const yB = tableY - 0.9 - disp;
          const cartA = createCompositeCart(0.88, 0.64, 0.76, EMERALD_MAIN, true);
          cartA.position.set(xA, tableY + 0.01, 0);
          const blockB = createCompositeCart(0.74, 0.68, 0.72, SKY_MAIN, false);
          blockB.position.set(pulleyPos.x + 0.46, yB - 0.68, 0);
          dynamicGroup.add(cartA, blockB);

          const cordY = pulleyPos.y + 0.46;
          const hLen = Math.max(0.2, pulleyPos.x - (xA + 0.44));
          const hCord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.026, hLen, 10),
            new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, roughness: 0.4 })
          );
          hCord.rotation.z = Math.PI / 2;
          hCord.position.set(xA + 0.44 + hLen / 2, cordY, 0);
          dynamicGroup.add(hCord);

          const vLen = Math.max(0.2, pulleyPos.y - yB);
          const vCord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.026, vLen, 10),
            new THREE.MeshStandardMaterial({
              color: p.isIdealPulley ? EMERALD_MAIN : ROSE_PAIR,
              roughness: 0.4,
            })
          );
          vCord.position.set(pulleyPos.x + 0.46, yB + vLen / 2, 0);
          dynamicGroup.add(vCord);

          dynamicGroup.add(
            createForceArrow3D(new THREE.Vector3(xA + 0.46, cordY + 0.2, 0.42), new THREE.Vector3(1, 0, 0), 0.88, EMERALD_MAIN, 0.038)
          );
          dynamicGroup.add(
            createForceArrow3D(
              new THREE.Vector3(pulleyPos.x + 0.68, yB + 0.05, 0.42),
              new THREE.Vector3(0, 1, 0),
              0.88,
              p.isIdealPulley ? EMERALD_MAIN : ROSE_PAIR,
              0.038
            )
          );

          const lblTa = makeLabelSprite(`T_A = ${ev.pulleyTensionAN.toFixed(1)} N`, '#34d399', undefined, 0.25);
          lblTa.position.set(xA + 0.85, cordY + 0.56, 0.5);
          dynamicGroup.add(lblTa);

          const lblTb = makeLabelSprite(
            `T_B = ${ev.pulleyTensionBN.toFixed(1)} N`,
            p.isIdealPulley ? '#34d399' : '#fda4af',
            undefined,
            0.25
          );
          lblTb.position.set(pulleyPos.x + 1.55, yB + 0.52, 0.5);
          dynamicGroup.add(lblTb);

          const badge = makeLabelSprite(
            p.isIdealPulley ? 'IDEAL PULLEY: Redirects T_A = T_B' : `REAL PULLEY: T_B > T_A (ΔT = ${ev.pulleyTensionDiffN.toFixed(1)} N)`,
            p.isIdealPulley ? '#38bdf8' : '#fbbf24',
            undefined,
            0.26
          );
          badge.position.set(0.15, tableY + 1.48, 0.55);
          dynamicGroup.add(badge);
        }
      }

      requestRender();
    };

    rebuildRef.current = rebuildScene;
    setCameraView(propsRef.current.viewMode, propsRef.current.params.mode, false);
    rebuildScene();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 800;
      const asp = w / h;
      perspCamera.aspect = asp;
      perspCamera.updateProjectionMatrix();
      orthoCamera.left = (-frustumSize * asp) / 2;
      orthoCamera.right = (frustumSize * asp) / 2;
      orthoCamera.top = frustumSize / 2;
      orthoCamera.bottom = -frustumSize / 2;
      orthoCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      disposeObject3D(dynamicGroup);
      disposeObject3D(floorGroup);
      if (envTex) envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    propsRef.current = { params, evaluation, viewMode };
    rebuildRef.current();
  }, [params, evaluation, viewMode]);

  useEffect(() => {
    setCameraViewRef.current(viewMode, params.mode);
  }, [viewMode, params.mode]);

  return (
    <div
      ref={containerRef}
      data-testid="newton23-viewport"
      className="w-full h-full relative"
      aria-label="Interactive 3D Newton's Third Law Simulation Viewport"
    />
  );
};

export default Newton23Viewport;
