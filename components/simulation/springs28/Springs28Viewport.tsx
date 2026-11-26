'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Springs28Evaluation,
  Springs28Mode,
  Springs28Params,
} from '@/lib/physics/springs-2-8';

export interface Springs28ViewportProps {
  params: Springs28Params;
  evaluation: Springs28Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const AMBER_GOLD = 0xf59e0b;
const ROSE_MAIN = 0xf43f5e;
const VIOLET_MAIN = 0xa855f7;
const CHROME_METAL = 0xcbd5e1;

const SPRING_PALETTE = [SKY_MAIN, VIOLET_MAIN, AMBER_GOLD];
const SPRING_HEX_LABELS = ['#38bdf8', '#c084fc', '#fbbf24'];

// ---------------------------------------------------------------------------
// Procedural Canvas Textures, Helical 3D Coil Builder & Label Sprites
// ---------------------------------------------------------------------------

function makeBrushedMetalTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#18242b';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle brushed machining lines
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(226,232,240,0.09)' : 'rgba(15,23,42,0.16)';
    ctx.fillRect(0, y, 256, 1.5);
  }

  // Metric millimeter/centimeter ruler ticks along top and bottom borders
  ctx.fillStyle = 'rgba(16,185,129,0.55)';
  for (let x = 0; x < 256; x += 16) {
    const h = x % 64 === 0 ? 14 : 8;
    ctx.fillRect(x, 0, 2, h);
    ctx.fillRect(x, 256 - h, 2, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  tex.anisotropy = maxAniso;
  return tex;
}

function makeBenchSlateTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#081210';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(16,185,129,0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 5);
  tex.anisotropy = maxAniso;
  return tex;
}

function makeLabelSprite(
  text: string,
  color = '#ecfdf5',
  bg = 'rgba(4,14,11,0.94)',
  worldHeight = 0.25
): THREE.Sprite {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const fontSize = 36;
  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const padX = 22;
  const textW = Math.ceil(ctx.measureText(text).width);
  c.width = Math.max(120, textW + padX * 2);
  c.height = 60;

  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = bg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 4);
  ctx.lineTo(c.width - r, 4);
  ctx.quadraticCurveTo(c.width - 4, 4, c.width - 4, r);
  ctx.lineTo(c.width - 4, c.height - r);
  ctx.quadraticCurveTo(c.width - 4, c.height - 4, c.width - r, c.height - 4);
  ctx.lineTo(r, c.height - 4);
  ctx.quadraticCurveTo(4, c.height - 4, 4, c.height - r);
  ctx.lineTo(4, r);
  ctx.quadraticCurveTo(4, 4, r, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 1);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = c.width / c.height;
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  sprite.renderOrder = 30;
  return sprite;
}

function createVectorArrow3D(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  radius = 0.044
): THREE.Group {
  const g = new THREE.Group();
  const safeLen = Math.max(0.22, length);
  const nDir = dir.clone().normalize();
  const headLen = Math.min(0.32, safeLen * 0.36);
  const shaftLen = Math.max(0.06, safeLen - headLen);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.35,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, shaftLen, 12), mat);
  shaft.position.y = shaftLen / 2;
  g.add(shaft);

  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.55, headLen, 14), mat);
  cone.position.y = shaftLen + headLen / 2;
  g.add(cone);

  g.position.copy(origin);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nDir);
  g.quaternion.copy(quat);
  return g;
}

/**
 * Generates a realistic 3D helical spring mesh between `start` and `end`.
 * Coils stretch and compress physically as endpoints move; wire thickness reflects spring stiffness k.
 */
function buildHelicalSpring3D(
  start: THREE.Vector3,
  end: THREE.Vector3,
  opts: {
    coils?: number;
    coilRadius?: number;
    wireRadius?: number;
    colorHex: number;
    emissiveHex?: number;
    tubularSegments?: number;
  }
): THREE.Group {
  const group = new THREE.Group();
  const axis = new THREE.Vector3().subVectors(end, start);
  const totalLen = Math.max(0.28, axis.length());
  const dir = axis.clone().normalize();

  // Build orthonormal frame (u, v) perpendicular to dir
  const refUp = Math.abs(dir.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(dir, refUp).normalize();
  const v = new THREE.Vector3().crossVectors(dir, u).normalize();

  const coils = opts.coils ?? 9;
  const coilRadius = opts.coilRadius ?? 0.22;
  const wireRadius = opts.wireRadius ?? 0.036;
  const leadLen = Math.min(0.14, totalLen * 0.14);
  const activeLen = Math.max(0.1, totalLen - 2 * leadLen);
  const samples = Math.max(48, coils * 10);

  const pts: THREE.Vector3[] = [];
  pts.push(start.clone());
  pts.push(start.clone().addScaledVector(dir, leadLen * 0.6));

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const angle = t * coils * Math.PI * 2;
    // Smooth taper into/out of end leads so coils meet the center hook cleanly
    const envelope = Math.sin(Math.min(1, t * 8) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - t) * 8) * (Math.PI / 2));
    const r = coilRadius * envelope;
    const pos = start
      .clone()
      .addScaledVector(dir, leadLen + t * activeLen)
      .addScaledVector(u, Math.cos(angle) * r)
      .addScaledVector(v, Math.sin(angle) * r);
    pts.push(pos);
  }

  pts.push(end.clone().addScaledVector(dir, -leadLen * 0.6));
  pts.push(end.clone());

  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeGeo = new THREE.TubeGeometry(
    curve,
    opts.tubularSegments ?? Math.min(140, coils * 14),
    wireRadius,
    8,
    false
  );
  const mat = new THREE.MeshStandardMaterial({
    color: opts.colorHex,
    emissive: opts.emissiveHex ?? opts.colorHex,
    emissiveIntensity: 0.12,
    roughness: 0.24,
    metalness: 0.82,
  });
  const mesh = new THREE.Mesh(tubeGeo, mat);
  mesh.castShadow = true;
  group.add(mesh);

  // Small machined end-eyelets at start and end
  const ringMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.22,
    metalness: 0.88,
  });
  const startCap = new THREE.Mesh(new THREE.SphereGeometry(wireRadius * 1.45, 10, 10), ringMat);
  startCap.position.copy(start);
  group.add(startCap);

  const endCap = new THREE.Mesh(new THREE.SphereGeometry(wireRadius * 1.45, 10, 10), ringMat);
  endCap.position.copy(end);
  group.add(endCap);

  return group;
}

/**
 * Composite 6-part laboratory air-track glider cart (bottom grounded at y = 0).
 */
function buildCompositeGliderCart(
  massKg: number,
  bodyColorHex = 0x1e3a5f,
  accentHex = AMBER_GOLD,
  scale = 1.0
): { group: THREE.Group; halfWidth: number; height: number } {
  const group = new THREE.Group();
  const w = 1.24 * scale;
  const h = 0.56 * scale;
  const d = 0.84 * scale;

  // 1. Low-friction glide base runners seated flush at y = 0
  const runnerMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.55,
  });
  const runner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.08 * scale, d * 0.96), runnerMat);
  runner.position.y = 0.04 * scale;
  runner.castShadow = true;
  group.add(runner);

  // 2. Anodized main carriage block
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h - 0.08 * scale, d),
    new THREE.MeshStandardMaterial({ color: bodyColorHex, roughness: 0.42, metalness: 0.38 })
  );
  body.position.y = 0.08 * scale + (h - 0.08 * scale) / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 3. Machined chrome top lip & side rail trim
  const trimMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.22,
    metalness: 0.86,
  });
  const topLip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04 * scale, 0.045 * scale, d + 0.04 * scale), trimMat);
  topLip.position.y = h - 0.02 * scale;
  group.add(topLip);

  // 4. Stacked brass calibration mass discs (visual mass indicator)
  const plateCount = Math.max(1, Math.min(4, Math.round(massKg / 1.8)));
  const brassMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.26,
    metalness: 0.84,
  });
  for (let i = 0; i < plateCount; i++) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * scale, 0.28 * scale, 0.072 * scale, 20),
      brassMat
    );
    disc.position.y = h + (0.036 + i * 0.078) * scale;
    disc.castShadow = true;
    group.add(disc);
  }

  // 5. Center pin knob
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.14 * scale, 12),
    trimMat
  );
  pin.position.y = h + (plateCount * 0.078 + 0.05) * scale;
  group.add(pin);

  // 6. Left & right clevis hooks for spring attachment
  const leftHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.08 * scale, 0.022 * scale, 8, 16),
    trimMat
  );
  leftHook.position.set(-w / 2 - 0.05 * scale, h * 0.56, 0);
  group.add(leftHook);

  const rightHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.08 * scale, 0.022 * scale, 8, 16),
    trimMat
  );
  rightHook.position.set(w / 2 + 0.05 * scale, h * 0.56, 0);
  group.add(rightHook);

  return { group, halfWidth: w / 2, height: h + (plateCount * 0.078 + 0.12) * scale };
}

/**
 * Composite vertical slotted brass hanging mass hanger (top eyelet at y = 0, hangs down to -totalH).
 */
function buildHangingMassHanger(massKg: number): { group: THREE.Group; totalH: number } {
  const group = new THREE.Group();
  const chromeMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.22,
    metalness: 0.88,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: AMBER_GOLD,
    roughness: 0.26,
    metalness: 0.84,
  });
  const darkCollarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.45,
  });

  // Top suspension eyelet at y = 0
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 10, 18), chromeMat);
  group.add(eye);

  // Stem shaft
  const discCount = Math.max(1, Math.min(5, Math.round(massKg / 1.5)));
  const stemH = 0.24 + discCount * 0.13;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, stemH, 12), chromeMat);
  stem.position.y = -0.08 - stemH / 2;
  group.add(stem);

  // Top retainer collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.08, 20), darkCollarMat);
  collar.position.y = -0.22;
  group.add(collar);

  // Slotted brass weight discs
  const baseRadius = 0.34 + Math.min(0.14, massKg * 0.016);
  for (let i = 0; i < discCount; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius, baseRadius, 0.11, 24), brassMat);
    disc.position.y = -0.32 - i * 0.13;
    disc.castShadow = true;
    group.add(disc);
  }

  // Bottom machined base flange
  const baseY = -0.32 - discCount * 0.13 + 0.02;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseRadius * 1.05, baseRadius * 0.96, 0.08, 24), chromeMat);
  base.position.y = baseY;
  group.add(base);

  return { group, totalH: Math.abs(baseY) + 0.06 };
}

function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) std.map.dispose();
        m.dispose();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Main 3D / 2D Interactive Laboratory Viewport
// ---------------------------------------------------------------------------

export const Springs28Viewport: React.FC<Springs28ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    params: Springs28Params;
    evaluation: Springs28Evaluation;
    viewMode: '3d' | '2d';
  }>({ params, evaluation, viewMode });
  const rebuildRef = useRef<(() => void) | null>(null);
  const applyCameraRef = useRef<((mode: Springs28Mode, vm: '3d' | '2d') => void) | null>(null);
  const lastCameraKeyRef = useRef<string>('');

  // React Compiler clean ref syncing via useEffect
  useEffect(() => {
    stateRef.current = { params, evaluation, viewMode };
    const camKey = `${params.mode}|${viewMode}`;
    if (camKey !== lastCameraKeyRef.current) {
      lastCameraKeyRef.current = camKey;
      applyCameraRef.current?.(params.mode, viewMode);
    }
    rebuildRef.current?.();
  }, [params, evaluation, viewMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d0a);
    scene.fog = new THREE.FogExp2(0x040d0a, 0.022);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Detect software WebGL (SwiftShader / llvmpipe) to pace renders cleanly
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const glRendererStr = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software/i.test(glRendererStr);

    // Studio IBL environment for rich metallic reflections on helical springs & brass weights
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Three-point studio lab lighting
    const hemi = new THREE.HemisphereLight(0xd1fae5, 0x061410, 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.55);
    keyLight.position.set(5.5, 10.5, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    const dShadow = 8;
    keyLight.shadow.camera.left = -dShadow;
    keyLight.shadow.camera.right = dShadow;
    keyLight.shadow.camera.top = dShadow;
    keyLight.shadow.camera.bottom = -dShadow;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 0.72);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxDistance = 24;
    controls.minDistance = 4.5;

    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const railTex = makeBrushedMetalTexture(maxAniso);
    const slateTex = makeBenchSlateTexture(maxAniso);

    const dynamicRoot = new THREE.Group();
    scene.add(dynamicRoot);

    // Coalesced on-demand renderer with WebGL2 fence pacing for software WebGL
    let renderPending = false;
    let disposed = false;
    const gl2 = gl instanceof WebGL2RenderingContext ? gl : null;

    const drawNow = () => {
      if (disposed) return;
      renderPending = false;
      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl && gl2) {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl2.flush();
          let polls = 0;
          const waitSync = () => {
            if (disposed) {
              gl2.deleteSync(sync);
              return;
            }
            const status = gl2.clientWaitSync(sync, 0, 0);
            polls++;
            if (status === gl2.ALREADY_SIGNALED || status === gl2.CONDITION_SATISFIED || polls >= 18) {
              gl2.deleteSync(sync);
            } else {
              window.setTimeout(waitSync, 4);
            }
          };
          waitSync();
        }
      }
    };

    const requestRender = () => {
      if (disposed || renderPending) return;
      renderPending = true;
      window.requestAnimationFrame(drawNow);
    };

    controls.addEventListener('change', requestRender);

    const applyCamera = (mode: Springs28Mode, vm: '3d' | '2d') => {
      camera.up.set(0, 1, 0);
      controls.enableRotate = vm === '3d';

      if (mode === 'hookes_restoring') {
        if (vm === '2d') {
          camera.position.set(0.0, 0.72, 11.8);
          controls.target.set(0.0, 0.55, 0.0);
        } else {
          camera.position.set(0.35, 3.25, 11.4);
          controls.target.set(-0.1, 0.55, 0.0);
        }
      } else if (mode === 'vertical_equilibrium') {
        if (vm === '2d') {
          camera.position.set(0.0, 0.35, 11.4);
          controls.target.set(0.0, 0.35, 0.0);
        } else {
          camera.position.set(2.1, 1.35, 11.2);
          controls.target.set(0.0, 0.35, 0.0);
        }
      } else {
        // series_springs or parallel_springs dual-lane comparison bench
        if (vm === '2d') {
          // Clean top-down 2D schematic view with generous margin from left & right docks
          camera.up.set(0, 0, -1);
          camera.position.set(-0.25, 14.8, 0.01);
          controls.target.set(-0.25, 0.0, 0.0);
        } else {
          camera.position.set(0.45, 5.95, 14.3);
          controls.target.set(-0.25, 0.2, 0.15);
        }
      }
      camera.lookAt(controls.target);
      controls.update();
      requestRender();
    };
    applyCameraRef.current = applyCamera;

    // -----------------------------------------------------------------------
    // Dynamic Scene Builder for All 4 Topic 2.8 Laboratory Modes
    // -----------------------------------------------------------------------
    const rebuildScene = () => {
      while (dynamicRoot.children.length > 0) {
        const child = dynamicRoot.children[0];
        dynamicRoot.remove(child);
        disposeObject3D(child);
      }

      const { params: p, evaluation: ev } = stateRef.current;

      const steelMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.32,
        metalness: 0.82,
      });
      const darkBaseMat = new THREE.MeshStandardMaterial({
        map: slateTex,
        roughness: 0.85,
        metalness: 0.08,
      });
      const railMat = new THREE.MeshStandardMaterial({
        map: railTex,
        roughness: 0.36,
        metalness: 0.62,
      });
      const chromeMat = new THREE.MeshStandardMaterial({
        color: CHROME_METAL,
        roughness: 0.22,
        metalness: 0.88,
      });

      // =====================================================================
      // MODE 1: HORIZONTAL HOOKE'S LAW & RESTORING FORCE (2.8.A.1–3)
      // =====================================================================
      if (p.mode === 'hookes_restoring') {
        const h = ev.hookes;

        // Ground lab tabletop
        const table = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.24, 5.2), darkBaseMat);
        table.position.set(0, -0.58, 0);
        table.receiveShadow = true;
        dynamicRoot.add(table);

        // Air-track rail bed (top surface at y = 0, centered cleanly inside middle window)
        const track = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.34, 1.32), railMat);
        track.position.set(0.0, -0.17, 0);
        track.receiveShadow = true;
        dynamicRoot.add(track);

        // Support pedestals
        for (const px of [-3.1, 0, 3.1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 1.45), steelMat);
          leg.position.set(px, -0.39, 0);
          dynamicRoot.add(leg);
        }

        // Fixed Steel Anchor Wall at x = -3.15 (100% clear of left controls dock)
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.55, 1.52), steelMat);
        wall.position.set(-3.15, 0.64, 0);
        wall.castShadow = true;
        dynamicRoot.add(wall);

        const wallMount = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 16), chromeMat);
        wallMount.rotation.z = Math.PI / 2;
        wallMount.position.set(-2.93, 0.34, 0);
        dynamicRoot.add(wallMount);

        // Equilibrium reference line at x = 0.25 (2.8.A.3)
        const eqX = 0.25;
        const eqStrip = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 0.02, 1.62),
          new THREE.MeshStandardMaterial({
            color: EMERALD_MAIN,
            emissive: EMERALD_MAIN,
            emissiveIntensity: 0.75,
          })
        );
        eqStrip.position.set(eqX, 0.012, 0);
        dynamicRoot.add(eqStrip);

        // Vertical dashed equilibrium indicator plane
        for (let i = 0; i < 6; i++) {
          const dash = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.14, 0.03),
            new THREE.MeshStandardMaterial({
              color: EMERALD_MAIN,
              emissive: EMERALD_MAIN,
              emissiveIntensity: 0.65,
            })
          );
          dash.position.set(eqX, 0.18 + i * 0.28, -0.68);
          dynamicRoot.add(dash);
        }

        const eqLabel = makeLabelSprite('x₀ = 0 (Equilibrium)', '#6ee7b7', 'rgba(4,14,11,0.92)', 0.24);
        eqLabel.position.set(eqX, -0.58, 1.05);
        dynamicRoot.add(eqLabel);

        // Cart position mapped cleanly to world coordinates (1 m -> 2.85 units; clamped safely)
        const worldScale = 2.85;
        const dxWorld = Math.max(-1.65, Math.min(1.65, h.displacementM * worldScale));
        const cartX = eqX + dxWorld;

        const cartColor =
          p.springBehavior === 'ideal'
            ? 0x1e3a5f
            : p.springBehavior === 'nonideal_hardening'
              ? 0x78350f
              : 0x164e63;
        const { group: cart, halfWidth, height: cartH } = buildCompositeGliderCart(
          p.hookeMassKg,
          cartColor,
          AMBER_GOLD,
          1.0
        );
        cart.position.set(cartX, 0, 0);
        dynamicRoot.add(cart);

        // Dynamic 3D Helical Spring from wall clevis to cart left eyelet
        const springStart = new THREE.Vector3(-2.85, 0.34, 0);
        const springEnd = new THREE.Vector3(cartX - halfWidth - 0.05, 0.34, 0);
        const wireRadius = 0.026 + (p.hookeKNm / 120) * 0.024;
        const springColor =
          p.springBehavior === 'ideal'
            ? 0x94e2c6
            : p.springBehavior === 'nonideal_hardening'
              ? 0xf59e0b
              : 0x38bdf8;
        const helix = buildHelicalSpring3D(springStart, springEnd, {
          coils: 11,
          coilRadius: 0.22,
          wireRadius,
          colorHex: springColor,
        });
        dynamicRoot.add(helix);

        // Spring stiffness label above spring midpoint
        const springMidX = (springStart.x + springEnd.x) / 2;
        const springTag =
          p.springBehavior === 'ideal'
            ? `Ideal k = ${p.hookeKNm} N/m`
            : p.springBehavior === 'nonideal_hardening'
              ? `Hardening k = ${p.hookeKNm} N/m`
              : `Softening k = ${p.hookeKNm} N/m`;
        const kLabel = makeLabelSprite(
          springTag,
          p.springBehavior === 'ideal' ? '#a7f3d0' : '#fcd34d',
          'rgba(4,14,11,0.92)',
          0.23
        );
        kLabel.position.set(springMidX, 0.92, -0.1);
        dynamicRoot.add(kLabel);

        // Displacement Vector Δx along front edge of track (sky-blue)
        if (Math.abs(dxWorld) > 0.14) {
          const dxDir = new THREE.Vector3(Math.sign(dxWorld), 0, 0);
          const dxArrow = createVectorArrow3D(
            new THREE.Vector3(eqX, 0.08, 0.85),
            dxDir,
            Math.abs(dxWorld),
            SKY_MAIN,
            0.036
          );
          dynamicRoot.add(dxArrow);

          const dxSprite = makeLabelSprite(
            `Δx = ${h.displacementM >= 0 ? '+' : ''}${h.displacementM.toFixed(2)} m`,
            '#7dd3fc',
            'rgba(4,14,11,0.94)',
            0.23
          );
          dxSprite.position.set(eqX + dxWorld / 2, 0.34, 0.95);
          dynamicRoot.add(dxSprite);
        }

        // Restoring Spring Force Vector F_s = -kΔx (ALWAYS pointing toward x = 0!)
        if (Math.abs(h.springForceN) > 0.25) {
          const fsSign = Math.sign(h.springForceN);
          const fsLen = Math.min(2.6, Math.max(0.55, Math.abs(h.springForceN) * 0.075));
          const fsColor = p.springBehavior === 'ideal' ? EMERALD_MAIN : AMBER_GOLD;
          const fsArrow = createVectorArrow3D(
            new THREE.Vector3(cartX, cartH + 0.36, 0),
            new THREE.Vector3(fsSign, 0, 0),
            fsLen,
            fsColor,
            0.05
          );
          dynamicRoot.add(fsArrow);

          const fsSprite = makeLabelSprite(
            `F_s = ${h.springForceN >= 0 ? '+' : ''}${h.springForceN.toFixed(1)} N`,
            p.springBehavior === 'ideal' ? '#34d399' : '#fbbf24',
            'rgba(4,14,11,0.95)',
            0.26
          );
          fsSprite.position.set(cartX + fsSign * (fsLen * 0.55), cartH + 0.72, 0);
          dynamicRoot.add(fsSprite);
        } else {
          const eqZero = makeLabelSprite('F_s = 0 N (At Equilibrium)', '#6ee7b7', 'rgba(4,14,11,0.94)', 0.25);
          eqZero.position.set(cartX, cartH + 0.58, 0);
          dynamicRoot.add(eqZero);
        }
      }

      // =====================================================================
      // MODE 2: VERTICAL HANGING SPRING & EQUILIBRIUM SHIFT (2.8.A.1–3)
      // =====================================================================
      else if (p.mode === 'vertical_equilibrium') {
        const v = ev.vertical;

        // Tabletop & Cast-Iron Retort Stand (shifted slightly left for clean right-side FBD zone)
        const xSpring = -0.35;
        const xMast = -2.15;
        const table = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.24, 4.4), darkBaseMat);
        table.position.set(0, -2.55, 0);
        table.receiveShadow = true;
        dynamicRoot.add(table);

        const standBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.8), steelMat);
        standBase.position.set(-1.0, -2.35, 0);
        standBase.castShadow = true;
        dynamicRoot.add(standBase);

        // Vertical chrome mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 5.25, 16), chromeMat);
        mast.position.set(xMast, 0.28, 0);
        dynamicRoot.add(mast);

        // Horizontal cantilever boom at y = 2.75
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.25, 16), chromeMat);
        boom.rotation.z = Math.PI / 2;
        boom.position.set((xMast + xSpring) / 2, 2.75, 0);
        dynamicRoot.add(boom);

        const clampBoss = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), steelMat);
        clampBoss.position.set(xMast, 2.75, 0);
        dynamicRoot.add(clampBoss);

        const topHook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 16), chromeMat);
        topHook.position.set(xSpring, 2.62, 0);
        dynamicRoot.add(topHook);

        // Vertical graduated metric ruler post
        const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.4, 0.08), railMat);
        ruler.position.set(xSpring - 1.05, 0.2, -0.2);
        dynamicRoot.add(ruler);

        // Map physical stretches cleanly into vertical scene coordinates
        const yTop = 2.58;
        const yRelaxed = 1.43;
        const vertScale = 1.65;
        const eqShiftWorld = Math.min(1.85, Math.max(0.22, v.equilibriumStretchM * vertScale));
        const yEq = yRelaxed - eqShiftWorld;
        const etaWorld = Math.max(-0.85, Math.min(0.85, v.currentOffsetFromEqM * vertScale));
        const massEyeY = Math.max(-1.05, Math.min(2.05, yEq + etaWorld));

        // Horizontal dashed reference lines: y_relaxed (sky) & y_eq (emerald)
        const relaxedBar = new THREE.Mesh(
          new THREE.BoxGeometry(2.15, 0.025, 0.025),
          new THREE.MeshStandardMaterial({ color: SKY_MAIN, emissive: SKY_MAIN, emissiveIntensity: 0.6 })
        );
        relaxedBar.position.set(xSpring - 0.1, yRelaxed, -0.28);
        dynamicRoot.add(relaxedBar);

        const eqBar = new THREE.Mesh(
          new THREE.BoxGeometry(2.35, 0.032, 0.032),
          new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, emissive: EMERALD_MAIN, emissiveIntensity: 0.8 })
        );
        eqBar.position.set(xSpring, yEq, -0.24);
        dynamicRoot.add(eqBar);

        const relaxedSprite = makeLabelSprite('y_relaxed (0)', '#7dd3fc', 'rgba(4,14,11,0.92)', 0.22);
        relaxedSprite.position.set(xMast + 0.05, yRelaxed + 0.16, 0.12);
        dynamicRoot.add(relaxedSprite);

        const eqSprite = makeLabelSprite(
          `y_eq (-${v.equilibriumStretchM.toFixed(2)} m)`,
          '#34d399',
          'rgba(4,14,11,0.94)',
          0.22
        );
        eqSprite.position.set(xMast + 0.05, yEq - 0.14, 0.12);
        dynamicRoot.add(eqSprite);

        // Vertical Helical Spring (thicker amber-bronze coil if nonideal spring mass > 0)
        const springColor = v.isIdealMassless ? 0x94e2c6 : AMBER_GOLD;
        const wireR = 0.026 + (p.verticalKNm / 120) * 0.02 + (v.springMassKg / 1.5) * 0.018;
        const vHelix = buildHelicalSpring3D(
          new THREE.Vector3(xSpring, yTop, 0),
          new THREE.Vector3(xSpring, massEyeY, 0),
          {
            coils: 11,
            coilRadius: 0.22,
            wireRadius: wireR,
            colorHex: springColor,
          }
        );
        dynamicRoot.add(vHelix);

        // Hanging slotted brass mass hanger
        const { group: hanger, totalH } = buildHangingMassHanger(p.verticalMassKg);
        hanger.position.set(xSpring, massEyeY, 0);
        dynamicRoot.add(hanger);

        const massCenterY = massEyeY - totalH * 0.55;

        // Upward Spring Force F_s (emerald) at x = xSpring + 0.72
        const fsLen = Math.min(1.55, Math.max(0.38, Math.abs(v.springForceUpN) * 0.04));
        const fsDir = new THREE.Vector3(0, v.springForceUpN >= 0 ? 1 : -1, 0);
        const fsArrow = createVectorArrow3D(
          new THREE.Vector3(xSpring + 0.72, massCenterY, 0),
          fsDir,
          fsLen,
          EMERALD_MAIN,
          0.042
        );
        dynamicRoot.add(fsArrow);

        const fsLbl = makeLabelSprite(
          `F_s = ${v.springForceUpN.toFixed(1)} N`,
          '#34d399',
          'rgba(4,14,11,0.94)',
          0.22
        );
        fsLbl.position.set(
          xSpring + 0.92,
          massCenterY + (v.springForceUpN >= 0 ? fsLen + 0.24 : -fsLen - 0.24),
          0
        );
        dynamicRoot.add(fsLbl);

        // Downward Weight F_g = mg (amber)
        const fgLen = Math.min(1.45, Math.max(0.38, v.weightN * 0.04));
        const fgArrow = createVectorArrow3D(
          new THREE.Vector3(xSpring + 0.72, massCenterY, 0),
          new THREE.Vector3(0, -1, 0),
          fgLen,
          AMBER_GOLD,
          0.042
        );
        dynamicRoot.add(fgArrow);

        const fgLbl = makeLabelSprite(
          `F_g = ${v.weightN.toFixed(1)} N`,
          '#fbbf24',
          'rgba(4,14,11,0.94)',
          0.22
        );
        fgLbl.position.set(xSpring + 0.95, massCenterY - fgLen - 0.22, 0);
        dynamicRoot.add(fgLbl);

        // Net Restoring Force F_net = -k η (rose) cleanly separated to the right, well inside viewport!
        if (Math.abs(v.netForceUpN) > 0.2) {
          const netSign = Math.sign(v.netForceUpN);
          const netLen = Math.min(1.25, Math.max(0.38, Math.abs(v.netForceUpN) * 0.05));
          const netX = xSpring + 2.05;
          const netArrow = createVectorArrow3D(
            new THREE.Vector3(netX, massCenterY, 0),
            new THREE.Vector3(0, netSign, 0),
            netLen,
            ROSE_MAIN,
            0.048
          );
          dynamicRoot.add(netArrow);

          const netLbl = makeLabelSprite(
            `F_net = ${v.netForceUpN >= 0 ? '+' : ''}${v.netForceUpN.toFixed(1)} N`,
            '#fda4af',
            'rgba(4,14,11,0.95)',
            0.22
          );
          netLbl.position.set(netX, massCenterY + netSign * (netLen + 0.24), 0);
          dynamicRoot.add(netLbl);
        } else {
          const balLbl = makeLabelSprite('F_net = 0 (at y_eq)', '#6ee7b7', 'rgba(4,14,11,0.94)', 0.22);
          balLbl.position.set(xSpring + 1.85, yEq, 0);
          dynamicRoot.add(balLbl);
        }
      }

      // =====================================================================
      // MODE 3: SERIES SPRING COMBINATION VS. EQUIVALENT SPRING (2.8.B.1.i–ii)
      // =====================================================================
      else if (p.mode === 'series_springs') {
        const s = ev.series;
        const count = s.springs.length;
        const zBack = -1.75;
        const zFront = 1.65;

        // Dual-lane laboratory tabletop (sized to stay 100% clear of both side docks)
        const table = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.24, 6.8), darkBaseMat);
        table.position.set(-0.25, -0.45, 0);
        table.receiveShadow = true;
        dynamicRoot.add(table);

        // Two brushed metal lanes
        for (const zLane of [zBack, zFront]) {
          const lane = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.26, 1.55), railMat);
          lane.position.set(-0.25, -0.2, zLane);
          lane.receiveShadow = true;
          dynamicRoot.add(lane);

          // Anchor wall for each lane (100% clear of left dock)
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 1.45), steelMat);
          wall.position.set(-4.15, 0.45, zLane);
          wall.castShadow = true;
          dynamicRoot.add(wall);
        }

        const anchorX = -3.96;
        const restTotalSpan = 2.65;
        const cartHalfW = 0.56;
        const xEqAnchor = anchorX + restTotalSpan + cartHalfW;
        const stretchScale = Math.min(2.2, 2.35 / Math.max(0.6, Math.abs(s.staticStretchM) + 0.1));
        const totalWorldStretch = Math.max(-0.75, Math.min(2.45, s.currentStretchM * stretchScale));
        const cartX = xEqAnchor + totalWorldStretch;

        // Equilibrium start line across both lanes
        const startLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.02, 5.0),
          new THREE.MeshStandardMaterial({ color: SKY_MAIN, emissive: SKY_MAIN, emissiveIntensity: 0.55 })
        );
        startLine.position.set(xEqAnchor, -0.055, -0.05);
        dynamicRoot.add(startLine);

        // Glowing Emerald Synchronization Alignment Laser Bar connecting both carriages across Z!
        const alignBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.03, zFront - zBack),
          new THREE.MeshStandardMaterial({
            color: EMERALD_MAIN,
            emissive: EMERALD_MAIN,
            emissiveIntensity: 0.85,
          })
        );
        alignBar.position.set(cartX, 0.04, (zFront + zBack) / 2);
        dynamicRoot.add(alignBar);

        // --- BACK LANE: ACTUAL SERIES CHAIN (2 or 3 springs end-to-end) ---
        const restPerSpring = restTotalSpan / count;
        let curX = anchorX;
        s.springs.forEach((sp, idx) => {
          const segLen = Math.max(0.45, restPerSpring + sp.stretchM * stretchScale);
          const nextX = idx === count - 1 ? cartX - cartHalfW : curX + segLen;
          const wireR = 0.024 + (sp.kNm / 120) * 0.022;
          const coilMesh = buildHelicalSpring3D(
            new THREE.Vector3(curX, 0.32, zBack),
            new THREE.Vector3(nextX, 0.32, zBack),
            {
              coils: count === 3 ? 6 : 8,
              coilRadius: 0.2,
              wireRadius: wireR,
              colorHex: SPRING_PALETTE[idx % SPRING_PALETTE.length],
            }
          );
          dynamicRoot.add(coilMesh);

          if (idx < count - 1) {
            const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 14), chromeMat);
            coupler.rotation.z = Math.PI / 2;
            coupler.position.set(nextX, 0.32, zBack);
            dynamicRoot.add(coupler);
          }

          const midX = (curX + nextX) / 2;
          const badge = makeLabelSprite(
            `${sp.label}=${sp.kNm} · Δx=${sp.stretchM.toFixed(2)}m`,
            SPRING_HEX_LABELS[idx % SPRING_HEX_LABELS.length],
            'rgba(4,14,11,0.92)',
            0.22
          );
          badge.position.set(midX, 0.84 + (idx % 2) * 0.3, zBack);
          dynamicRoot.add(badge);

          curX = nextX;
        });

        const backCart = buildCompositeGliderCart(p.comboMassKg, 0x1e3a5f, AMBER_GOLD, 0.9);
        backCart.group.position.set(cartX, -0.07, zBack);
        dynamicRoot.add(backCart.group);

        // --- FRONT LANE: SINGLE EQUIVALENT SPRING k_eq,series ---
        const eqCoil = buildHelicalSpring3D(
          new THREE.Vector3(anchorX, 0.32, zFront),
          new THREE.Vector3(cartX - cartHalfW, 0.32, zFront),
          {
            coils: 12,
            coilRadius: 0.22,
            wireRadius: 0.024 + (s.kEqNm / 120) * 0.022,
            colorHex: EMERALD_MAIN,
          }
        );
        dynamicRoot.add(eqCoil);

        const frontCart = buildCompositeGliderCart(p.comboMassKg, 0x064e3b, EMERALD_MAIN, 0.9);
        frontCart.group.position.set(cartX, -0.07, zFront);
        dynamicRoot.add(frontCart.group);

        // Applied Pull Force arrows + clean non-clipping badge above front pull arrow
        if (s.currentTotalForceN > 0.25) {
          const pullLen = Math.min(1.45, Math.max(0.5, s.currentTotalForceN * 0.04));
          for (const zLane of [zBack, zFront]) {
            const arr = createVectorArrow3D(
              new THREE.Vector3(cartX + cartHalfW + 0.08, 0.32, zLane),
              new THREE.Vector3(1, 0, 0),
              pullLen,
              AMBER_GOLD,
              0.042
            );
            dynamicRoot.add(arr);
          }
          const pullLbl = makeLabelSprite(
            `F = ${s.currentTotalForceN.toFixed(1)} N`,
            '#fbbf24',
            'rgba(4,14,11,0.94)',
            0.23
          );
          pullLbl.position.set(cartX + cartHalfW + pullLen * 0.55, 0.78, zFront);
          dynamicRoot.add(pullLbl);
        }

        // Well-separated Lane Header Badges (top-back & bottom-front)
        const backHeader = makeLabelSprite(
          `SERIES CHAIN (${count} Springs · Same F, Δx Adds)`,
          '#e2e8f0',
          'rgba(4,14,11,0.94)',
          0.25
        );
        backHeader.position.set(-0.8, 1.55, zBack - 0.72);
        dynamicRoot.add(backHeader);

        const frontHeader = makeLabelSprite(
          `EQUIVALENT: k_eq = ${s.kEqNm.toFixed(1)} N/m < min(${s.minKNm}) · Δx = ${s.currentStretchM.toFixed(2)} m`,
          '#34d399',
          'rgba(4,14,11,0.95)',
          0.25
        );
        frontHeader.position.set(-0.55, 0.24, zFront + 1.15);
        dynamicRoot.add(frontHeader);
      }

      // =====================================================================
      // MODE 4: PARALLEL SPRING COMBINATION VS. EQUIVALENT SPRING (2.8.B.1.iii)
      // =====================================================================
      else {
        const par = ev.parallel;
        const count = par.springs.length;
        const zBack = -1.75;
        const zFront = 1.75;

        const table = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.24, 7.2), darkBaseMat);
        table.position.set(-0.25, -0.45, 0);
        table.receiveShadow = true;
        dynamicRoot.add(table);

        const backLane = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.26, 2.2), railMat);
        backLane.position.set(-0.25, -0.2, zBack);
        backLane.receiveShadow = true;
        dynamicRoot.add(backLane);

        const frontLane = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.26, 1.55), railMat);
        frontLane.position.set(-0.25, -0.2, zFront);
        frontLane.receiveShadow = true;
        dynamicRoot.add(frontLane);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 2.1), steelMat);
        backWall.position.set(-4.15, 0.45, zBack);
        backWall.castShadow = true;
        dynamicRoot.add(backWall);

        const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 1.45), steelMat);
        frontWall.position.set(-4.15, 0.45, zFront);
        frontWall.castShadow = true;
        dynamicRoot.add(frontWall);

        const anchorX = -3.96;
        const restSpan = 2.6;
        const yokeHalfThick = 0.14;
        const cartHalfW = 0.56;
        const xEqAnchor = anchorX + restSpan + cartHalfW;
        const stretchScale = Math.min(4.2, 2.4 / Math.max(0.35, Math.abs(par.staticStretchM) + 0.1));
        const totalWorldStretch = Math.max(-0.75, Math.min(2.45, par.currentStretchM * stretchScale));
        const cartX = xEqAnchor + totalWorldStretch;

        // Equilibrium start line
        const startLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.02, 5.5),
          new THREE.MeshStandardMaterial({ color: SKY_MAIN, emissive: SKY_MAIN, emissiveIntensity: 0.55 })
        );
        startLine.position.set(xEqAnchor, -0.055, 0);
        dynamicRoot.add(startLine);

        // Glowing Emerald Alignment Bar proving identical Δx across lanes
        const alignBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.03, zFront - zBack),
          new THREE.MeshStandardMaterial({
            color: EMERALD_MAIN,
            emissive: EMERALD_MAIN,
            emissiveIntensity: 0.85,
          })
        );
        alignBar.position.set(cartX, 0.04, 0);
        dynamicRoot.add(alignBar);

        // --- BACK LANE: PARALLEL SPRINGS SIDE-BY-SIDE + RIGID SPREADER YOKE ---
        const zOffsets = count === 3 ? [-0.62, 0.0, 0.62] : [-0.46, 0.46];
        const yokeX = cartX - cartHalfW - yokeHalfThick;
        const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, count === 3 ? 1.72 : 1.38), chromeMat);
        yoke.position.set(yokeX, 0.32, zBack);
        yoke.castShadow = true;
        dynamicRoot.add(yoke);

        par.springs.forEach((sp, idx) => {
          const zSp = zBack + zOffsets[idx];
          const wireR = 0.024 + (sp.kNm / 120) * 0.024;
          const coil = buildHelicalSpring3D(
            new THREE.Vector3(anchorX, 0.32, zSp),
            new THREE.Vector3(yokeX - 0.1, 0.32, zSp),
            {
              coils: 10,
              coilRadius: 0.17,
              wireRadius: wireR,
              colorHex: SPRING_PALETTE[idx % SPRING_PALETTE.length],
            }
          );
          dynamicRoot.add(coil);

          // Staggered X & Y positions so 2 or 3 parallel force labels NEVER overlap in 3D or 2D!
          const frac = count === 3 ? [0.22, 0.52, 0.82][idx] : [0.3, 0.72][idx];
          const labelX = anchorX + (yokeX - anchorX) * frac;
          const labelY = count === 3 ? [0.95, 1.32, 0.68][idx] : [1.05, 0.72][idx];
          const badge = makeLabelSprite(
            `${sp.label}:${sp.forceN.toFixed(1)}N`,
            SPRING_HEX_LABELS[idx % SPRING_HEX_LABELS.length],
            'rgba(4,14,11,0.93)',
            0.22
          );
          badge.position.set(labelX, labelY, zSp);
          dynamicRoot.add(badge);
        });

        const backCart = buildCompositeGliderCart(p.comboMassKg, 0x1e3a5f, AMBER_GOLD, 0.9);
        backCart.group.position.set(cartX, -0.07, zBack);
        dynamicRoot.add(backCart.group);

        // --- FRONT LANE: SINGLE STIFF EQUIVALENT SPRING k_eq,parallel = Σk_i ---
        const eqCoil = buildHelicalSpring3D(
          new THREE.Vector3(anchorX, 0.32, zFront),
          new THREE.Vector3(cartX - cartHalfW, 0.32, zFront),
          {
            coils: 11,
            coilRadius: 0.24,
            wireRadius: Math.min(0.062, 0.032 + (par.kEqNm / 240) * 0.028),
            colorHex: EMERALD_MAIN,
          }
        );
        dynamicRoot.add(eqCoil);

        const frontCart = buildCompositeGliderCart(p.comboMassKg, 0x064e3b, EMERALD_MAIN, 0.9);
        frontCart.group.position.set(cartX, -0.07, zFront);
        dynamicRoot.add(frontCart.group);

        // Applied Pull Force arrows + clean badge positioned above front arrow (never colliding!)
        if (par.currentTotalForceN > 0.25) {
          const pullLen = Math.min(1.45, Math.max(0.5, par.currentTotalForceN * 0.04));
          for (const zLane of [zBack, zFront]) {
            const arr = createVectorArrow3D(
              new THREE.Vector3(cartX + cartHalfW + 0.08, 0.32, zLane),
              new THREE.Vector3(1, 0, 0),
              pullLen,
              AMBER_GOLD,
              0.042
            );
            dynamicRoot.add(arr);
          }
          const pullLbl = makeLabelSprite(
            `F = ${par.currentTotalForceN.toFixed(1)} N`,
            '#fbbf24',
            'rgba(4,14,11,0.94)',
            0.23
          );
          pullLbl.position.set(cartX + cartHalfW + pullLen * 0.55, 0.78, zFront);
          dynamicRoot.add(pullLbl);
        }

        const backHeader = makeLabelSprite(
          `PARALLEL ARRAY (${count} Springs · Same Δx, Forces Add)`,
          '#e2e8f0',
          'rgba(4,14,11,0.94)',
          0.25
        );
        backHeader.position.set(-0.7, 1.78, zBack - 0.85);
        dynamicRoot.add(backHeader);

        const frontHeader = makeLabelSprite(
          `EQUIVALENT: k_eq = ${par.kEqNm.toFixed(0)} N/m = Σk_i · Δx = ${par.currentStretchM.toFixed(2)} m`,
          '#34d399',
          'rgba(4,14,11,0.95)',
          0.25
        );
        frontHeader.position.set(-0.55, 0.24, zFront + 1.18);
        dynamicRoot.add(frontHeader);
      }

      requestRender();
    };

    rebuildRef.current = rebuildScene;
    lastCameraKeyRef.current = `${stateRef.current.params.mode}|${stateRef.current.viewMode}`;
    applyCamera(stateRef.current.params.mode, stateRef.current.viewMode);
    rebuildScene();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeObject3D(dynamicRoot);
      railTex.dispose();
      slateTex.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};

export default Springs28Viewport;
