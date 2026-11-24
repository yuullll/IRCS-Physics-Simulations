'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Newton25Evaluation,
  Newton25Mode,
  Newton25Params,
} from '@/lib/physics/newton-second-law-2-5';

export interface Newton25ViewportProps {
  params: Newton25Params;
  evaluation: Newton25Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const AMBER_GOLD = 0xf59e0b;
const ROSE_MAIN = 0xf43f5e;
const SLATE_BENCH = 0x1e293b;
const CHROME_METAL = 0xcbd5e1;

function makeLabelSprite(
  text: string,
  color = '#ecfdf5',
  bgColor = 'rgba(4, 15, 11, 0.93)',
  worldHeight = 0.25
): THREE.Sprite {
  const fontSize = 27;
  const padX = 18;
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  const textWidth = Math.ceil(mctx.measureText(text).width);
  const w = Math.max(120, textWidth + padX * 2);
  const h = 48;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
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
  sprite.renderOrder = 22;
  return sprite;
}

function createVectorArrow3D(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.048
): THREE.Group {
  const group = new THREE.Group();
  if (length < 0.06 || dir.lengthSq() < 1e-8) return group;
  const norm = dir.clone().normalize();
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
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 14),
    mat
  );
  shaft.position.y = shaftLen / 2;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(shaftRadius * 2.3, headLen, 16),
    mat
  );
  head.position.y = shaftLen + headLen / 2;

  const holder = new THREE.Group();
  holder.add(shaft, head);
  holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
  holder.position.copy(origin);
  group.add(holder);
  return group;
}

function makeTrackRulerTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1824';
  ctx.fillRect(0, 0, c.width, c.height);

  // Subtle metallic brushed horizontal grain
  ctx.strokeStyle = 'rgba(148,163,184,0.12)';
  ctx.lineWidth = 1;
  for (let y = 12; y < c.height; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(c.width, y);
    ctx.stroke();
  }

  // Ruler graduations along front edge
  ctx.strokeStyle = 'rgba(52,211,153,0.48)';
  ctx.fillStyle = '#6ee7b7';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * c.width;
    const major = i % 2 === 0;
    ctx.lineWidth = major ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x, c.height);
    ctx.lineTo(x, c.height - (major ? 34 : 18));
    ctx.stroke();
    if (major && i > 0 && i < 20) {
      ctx.fillText(`${(i / 2 - 5).toFixed(0)}m`, x, c.height - 46);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeAirTableGridTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#09141d';
  ctx.fillRect(0, 0, size, size);

  const step = size / 8;
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 8; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Primary X / Y axes across origin
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

/**
 * Composite 6-part wheeled physics lab cart with visible stacked brass mass plates
 * scaled dynamically by cart mass (kg).
 */
function buildDynamicsCart(massKg: number, accentHex: number, length = 1.55): THREE.Group {
  const g = new THREE.Group();

  // 1. Anodized aluminum chassis block
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.34, 0.92),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.55 })
  );
  chassis.position.y = 0.32;
  g.add(chassis);

  // 2. Accent side trim rails
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.24,
    roughness: 0.28,
    metalness: 0.4,
  });
  for (const sz of [-0.47, 0.47]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length + 0.04, 0.09, 0.04), trimMat);
    rail.position.set(0, 0.34, sz);
    g.add(rail);
  }

  // 3. Top mass tray deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.84, 0.06, 0.78),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.35 })
  );
  deck.position.y = 0.52;
  g.add(deck);

  // 4. Stacked slotted brass mass plates visually representing m_sys
  const plateCount = Math.max(1, Math.min(6, Math.round(massKg * 0.65)));
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.26,
    metalness: 0.84,
  });
  for (let i = 0; i < plateCount; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(length * 0.62, 0.09, 0.58), brassMat);
    plate.position.y = 0.6 + i * 0.105;
    g.add(plate);
  }

  // 5. Four low-friction spoked wheels + steel axles
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.25 });
  const hubMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.9 });
  for (const wx of [-length * 0.33, length * 0.33]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.04, 10), hubMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(wx, 0.16, 0);
    g.add(axle);
    for (const wz of [-0.48, 0.48]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.075, 20), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.16, wz);
      g.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.09, 14), hubMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.16, wz);
      g.add(hub);
    }
  }

  // 6. Front & rear magnetic bumpers
  for (const sx of [-1, 1]) {
    const bumper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 14), hubMat);
    bumper.rotation.z = Math.PI / 2;
    bumper.position.set(sx * (length / 2 + 0.06), 0.32, 0);
    g.add(bumper);
  }

  return g;
}

/**
 * Procedural coiled helical spring mesh connecting two points along X
 */
function buildCoiledSpringMesh(xStart: number, xEnd: number, y: number, coils = 8): THREE.Mesh {
  const span = Math.max(0.25, xEnd - xStart);
  const pts: THREE.Vector3[] = [];
  const samples = coils * 12;
  const radius = Math.max(0.08, Math.min(0.14, 0.22 / Math.sqrt(Math.max(0.5, span))));
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const x = xStart + u * span;
    const theta = u * coils * Math.PI * 2;
    const env = Math.sin(u * Math.PI);
    pts.push(new THREE.Vector3(x, y + Math.sin(theta) * radius * (0.25 + 0.75 * env), Math.cos(theta) * radius * (0.25 + 0.75 * env)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, samples, 0.022, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color: SKY_MAIN, roughness: 0.28, metalness: 0.8 });
  return new THREE.Mesh(geo, mat);
}

function disposeGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      } else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      } else if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
  }
}

export const Newton25Viewport: React.FC<Newton25ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const applyCameraRef = useRef<((mode: Newton25Mode, vm: '3d' | '2d') => void) | null>(null);
  const maxAnisoRef = useRef<number>(1);
  const prevCameraKeyRef = useRef<string>('');

  // Mount Three.js renderer once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
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

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 800;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040d0a);
    scene.fog = new THREE.FogExp2(0x040d0a, 0.02);

    const perspCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    const frustumSize = 9.6;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      140
    );

    let activeCamera: THREE.Camera = perspCamera;

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
    container.appendChild(renderer.domElement);

    maxAnisoRef.current = renderer.capabilities.getMaxAnisotropy();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Warm key + cool hemisphere + emerald rim lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x062018, 0.9);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    keyLight.position.set(7, 13, 9);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x34d399, 0.55);
    rimLight.position.set(-8, 6, -7);
    scene.add(rimLight);

    // Subtle spatial ground grid
    const floorGrid = new THREE.GridHelper(32, 32, 0x10b981, 0x0b2920);
    floorGrid.position.y = -2.35;
    (floorGrid.material as THREE.Material).transparent = true;
    (floorGrid.material as THREE.Material).opacity = 0.24;
    scene.add(floorGrid);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    sceneGroupRef.current = dynamicGroup;

    const controls = new OrbitControls(activeCamera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.5;
    controls.maxDistance = 26;

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
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
    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const applyCamera = (mode: Newton25Mode, vm: '3d' | '2d') => {
      const isTopDown = mode === 'vector_2d';
      if (vm === '2d') {
        activeCamera = orthoCamera;
        controls.object = orthoCamera;
        controls.enableRotate = false;
        if (isTopDown) {
          orthoCamera.position.set(0, 12, 0.01);
          controls.target.set(0, 0, 0);
          orthoCamera.zoom = 0.82;
        } else if (mode === 'modified_atwood') {
          orthoCamera.position.set(0, 0.1, 12);
          controls.target.set(0.3, -0.2, 0);
          orthoCamera.zoom = 0.88;
        } else {
          orthoCamera.position.set(0, 0.35, 12);
          controls.target.set(0, 0.15, 0);
          orthoCamera.zoom = 0.9;
        }
        orthoCamera.updateProjectionMatrix();
      } else {
        activeCamera = perspCamera;
        controls.object = perspCamera;
        controls.enableRotate = true;
        if (mode === 'unbalanced_track') {
          perspCamera.position.set(0.4, 2.5, 12.2);
          controls.target.set(0, 0.15, 0);
        } else if (mode === 'vector_2d') {
          perspCamera.position.set(0.0, 9.4, 8.8);
          controls.target.set(0, -0.1, 0.15);
        } else if (mode === 'modified_atwood') {
          perspCamera.position.set(0.7, 2.3, 12.8);
          controls.target.set(0.25, -0.15, 0);
        } else {
          // com_system
          perspCamera.position.set(0.2, 2.6, 12.8);
          controls.target.set(0, 0.18, 0);
        }
        perspCamera.updateProjectionMatrix();
      }
      controls.update();
      requestRender();
    };
    applyCameraRef.current = applyCamera;
    // Reset camera key on mount so StrictMode double-mount always applies initial camera
    prevCameraKeyRef.current = '';

    const onResize = () => {
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
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      prevCameraKeyRef.current = '';
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('change', requestRender);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      disposeGroup(dynamicGroup);
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync camera whenever mode or 3D/2D toggles
  useEffect(() => {
    const key = `${params.mode}:${viewMode}`;
    if (prevCameraKeyRef.current !== key) {
      prevCameraKeyRef.current = key;
      applyCameraRef.current?.(params.mode, viewMode);
    }
  }, [params.mode, viewMode]);

  // Rebuild dynamic 3D physics stage
  useEffect(() => {
    const root = sceneGroupRef.current;
    if (!root) return;
    disposeGroup(root);

    const maxAniso = maxAnisoRef.current;

    if (params.mode === 'unbalanced_track') {
      // =====================================================================
      // MODE 1: UNBALANCED DYNAMICS TRACK & BRAKING LAB (EK 2.5.A.1 & 2.5.A.2)
      // =====================================================================
      const trackY = -0.68;
      const trackLen = 10.6;

      const rulerTex = makeTrackRulerTexture(maxAniso);
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(trackLen, 0.34, 1.5),
        [
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.55, metalness: 0.45 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.55, metalness: 0.45 }),
          new THREE.MeshStandardMaterial({ map: rulerTex, color: 0xffffff, roughness: 0.55, metalness: 0.2 }),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.5 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.5 }),
        ]
      );
      bench.position.y = trackY - 0.17;
      root.add(bench);

      // Chrome guide rails & support legs
      const railMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.22, metalness: 0.88 });
      for (const rz of [-0.48, 0.48]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.05, 0.06), railMat);
        rail.position.set(0, trackY + 0.025, rz);
        root.add(rail);
      }
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.35 });
      for (const lx of [-4.2, 0, 4.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.45, 14), legMat);
        leg.position.set(lx, trackY - 1.05, 0);
        root.add(leg);
      }

      // Compute visually bounded cart x on track
      const rawDisp = evaluation.posX * 0.42;
      const cartX = Math.max(-3.6, Math.min(3.6, -2.1 + rawDisp));

      // Strobe breadcrumb spheres showing widening/narrowing intervals
      const strobeMat = new THREE.MeshStandardMaterial({
        color: AMBER_GOLD,
        emissive: AMBER_GOLD,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.3,
      });
      for (const sp of evaluation.strobePoints) {
        const sx = Math.max(-4.5, Math.min(4.5, -2.1 + sp.x * 0.42));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), strobeMat);
        dot.position.set(sx, trackY + 0.09, 0.56);
        root.add(dot);
      }

      // Composite dynamics cart with brass mass stack
      const cart = buildDynamicsCart(params.cartMassKg, EMERALD_MAIN, 1.6);
      cart.position.set(cartX, trackY + 0.05, 0);
      root.add(cart);

      // Contact shadow disc beneath cart
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(cartX, trackY + 0.03, 0);
      root.add(shadow);

      // Forward & Opposing force arrows
      const fScale = 0.068;
      if (params.forwardForceN > 0.2) {
        const len = Math.max(0.45, Math.min(2.4, params.forwardForceN * fScale));
        root.add(
          createVectorArrow3D(
            new THREE.Vector3(cartX + 0.85, trackY + 0.38, 0),
            new THREE.Vector3(1, 0, 0),
            len,
            EMERALD_MAIN,
            0.05
          )
        );
        const lbl = makeLabelSprite(`F_drive = ${params.forwardForceN.toFixed(0)} N`, '#34d399', 'rgba(4,13,10,0.93)', 0.22);
        lbl.position.set(Math.min(4.0, cartX + 0.85 + len * 0.6), trackY + 0.78, 0.2);
        root.add(lbl);
      }
      if (params.resistForceN > 0.2) {
        const len = Math.max(0.45, Math.min(2.4, params.resistForceN * fScale));
        root.add(
          createVectorArrow3D(
            new THREE.Vector3(cartX - 0.85, trackY + 0.38, 0),
            new THREE.Vector3(-1, 0, 0),
            len,
            ROSE_MAIN,
            0.05
          )
        );
        const lbl = makeLabelSprite(`F_oppose = ${params.resistForceN.toFixed(0)} N`, '#fb7185', 'rgba(30,8,16,0.93)', 0.22);
        lbl.position.set(Math.max(-4.0, cartX - 0.85 - len * 0.6), trackY + 0.78, 0.2);
        root.add(lbl);
      }

      // Parallel F_net (crimson) and a_sys (amber gold) stacked cleanly above cart to prove exact co-direction
      const plateHeight = 0.65 + Math.min(6, Math.round(params.cartMassKg * 0.65)) * 0.105;
      const topY = trackY + plateHeight + 0.28;
      if (evaluation.isUnbalanced) {
        const sign = evaluation.fNetX >= 0 ? 1 : -1;
        const netLen = Math.max(0.65, Math.min(2.5, Math.abs(evaluation.fNetX) * 0.075));
        const accLen = Math.max(0.65, Math.min(2.3, Math.abs(evaluation.axSys) * 0.28));

        root.add(
          createVectorArrow3D(
            new THREE.Vector3(cartX, topY + 0.44, 0),
            new THREE.Vector3(sign, 0, 0),
            netLen,
            ROSE_MAIN,
            0.058
          )
        );
        root.add(
          createVectorArrow3D(
            new THREE.Vector3(cartX, topY + 0.08, 0),
            new THREE.Vector3(sign, 0, 0),
            accLen,
            AMBER_GOLD,
            0.052
          )
        );

        const netTag = makeLabelSprite(
          `ΣF = ${evaluation.fNetX >= 0 ? '+' : ''}${evaluation.fNetX.toFixed(1)} N  ||  a_sys = ${evaluation.axSys >= 0 ? '+' : ''}${evaluation.axSys.toFixed(2)} m/s²`,
          '#fbbf24',
          'rgba(24,14,4,0.94)',
          0.25
        );
        netTag.position.set(Math.max(-2.6, Math.min(2.6, cartX + sign * 0.4)), topY + 0.96, 0.1);
        root.add(netTag);
      } else {
        const balTag = makeLabelSprite('BALANCED: ΣF = 0 N => a_sys = 0.00 m/s²', '#34d399', 'rgba(4,24,16,0.94)', 0.25);
        balTag.position.set(Math.max(-2.5, Math.min(2.5, cartX)), topY + 0.65, 0.1);
        root.add(balTag);
      }

      // Velocity arrow v(t) below track edge so student compares direction of v vs a (especially during braking!)
      if (Math.abs(evaluation.vxNow) > 0.05) {
        const vSign = evaluation.vxNow >= 0 ? 1 : -1;
        const vLen = Math.max(0.55, Math.min(2.2, Math.abs(evaluation.vxNow) * 0.28));
        root.add(
          createVectorArrow3D(
            new THREE.Vector3(cartX, trackY - 0.55, 0.65),
            new THREE.Vector3(vSign, 0, 0),
            vLen,
            SKY_MAIN,
            0.044
          )
        );
        const vTag = makeLabelSprite(
          `v(t) = ${evaluation.vxNow >= 0 ? '+' : ''}${evaluation.vxNow.toFixed(1)} m/s · ${evaluation.motionStateLabel}`,
          '#38bdf8',
          'rgba(4,16,28,0.94)',
          0.23
        );
        vTag.position.set(Math.max(-2.2, Math.min(2.2, cartX)), trackY - 0.96, 0.65);
        root.add(vTag);
      }
    } else if (params.mode === 'vector_2d') {
      // =====================================================================
      // MODE 2: 2D VECTOR DYNAMICS & DIRECTION ALIGNMENT (EK 2.5.A.1 & 2.5.A.2)
      // =====================================================================
      const tableY = -0.35;
      const tableSize = 6.2;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(tableSize + 0.3, 0.28, tableSize + 0.3),
        new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.52 })
      );
      frame.position.y = tableY - 0.14;
      root.add(frame);

      const gridTex = makeAirTableGridTexture(maxAniso);
      const surface = new THREE.Mesh(
        new THREE.BoxGeometry(tableSize, 0.04, tableSize),
        new THREE.MeshStandardMaterial({ map: gridTex, color: 0xffffff, roughness: 0.62, metalness: 0.12 })
      );
      surface.position.y = tableY + 0.02;
      root.add(surface);

      // Origin & scaled trajectory mapping
      const originX = -1.35;
      const originZ = 1.05;
      const posScale = 0.34;
      const clampBoard = (v: number) => Math.max(-tableSize * 0.44, Math.min(tableSize * 0.44, v));

      const puckX = clampBoard(originX + evaluation.posX * posScale);
      const puckZ = clampBoard(originZ - evaluation.posY * posScale);
      const puckY = tableY + 0.18;

      // Trajectory strobe trail + line
      const trailPts: THREE.Vector3[] = [];
      const strobeMat = new THREE.MeshStandardMaterial({
        color: AMBER_GOLD,
        emissive: AMBER_GOLD,
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.3,
      });
      for (const sp of evaluation.strobePoints) {
        const sx = clampBoard(originX + sp.x * posScale);
        const sz = clampBoard(originZ - sp.y * posScale);
        trailPts.push(new THREE.Vector3(sx, tableY + 0.09, sz));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), strobeMat);
        dot.position.set(sx, tableY + 0.1, sz);
        root.add(dot);
      }
      if (trailPts.length >= 2) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(trailPts),
          new THREE.LineBasicMaterial({ color: SKY_MAIN, transparent: true, opacity: 0.72 })
        );
        root.add(line);
      }

      // Composite 4-part hover puck
      const puckGroup = new THREE.Group();
      const puckBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.4, 0.16, 28),
        new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.26, metalness: 0.85 })
      );
      const puckRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.045, 12, 28),
        new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, emissive: EMERALD_MAIN, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.4 })
      );
      puckRing.rotation.x = Math.PI / 2;
      puckRing.position.y = 0.05;
      const puckCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.24, 0.08, 20),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55, metalness: 0.5 })
      );
      puckCap.position.y = 0.11;
      const puckLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshStandardMaterial({ color: AMBER_GOLD, emissive: AMBER_GOLD, emissiveIntensity: 0.55 })
      );
      puckLed.position.y = 0.17;
      puckGroup.add(puckBase, puckRing, puckCap, puckLed);
      puckGroup.position.set(puckX, puckY, puckZ);
      root.add(puckGroup);

      // Force vectors F_1, F_2 from puck
      const fScale = 0.085;
      for (const f of evaluation.forces) {
        if (f.mag < 0.2) continue;
        const rad = (f.angleDeg * Math.PI) / 180;
        const dx = Math.cos(rad);
        const dz = -Math.sin(rad);
        const len = Math.max(0.45, Math.min(2.2, f.mag * fScale));
        const col = parseInt(f.color.replace('#', ''), 16);
        root.add(createVectorArrow3D(new THREE.Vector3(puckX, puckY + 0.08, puckZ), new THREE.Vector3(dx, 0, dz), len, col, 0.042));
      }

      // Co-directional F_net (crimson) & a_sys (amber gold) offset vertically by 0.22 so both are razor-clear
      if (evaluation.isUnbalanced) {
        const rad = (evaluation.fNetAngleDeg * Math.PI) / 180;
        const dx = Math.cos(rad);
        const dz = -Math.sin(rad);
        const netLen = Math.max(0.65, Math.min(2.4, evaluation.fNetMag * 0.082));
        const accLen = Math.max(0.55, Math.min(2.0, evaluation.aMagSys * 0.22));
        root.add(createVectorArrow3D(new THREE.Vector3(puckX, puckY + 0.22, puckZ), new THREE.Vector3(dx, 0, dz), netLen, ROSE_MAIN, 0.056));
        root.add(createVectorArrow3D(new THREE.Vector3(puckX, puckY + 0.44, puckZ), new THREE.Vector3(dx, 0, dz), accLen, AMBER_GOLD, 0.048));
      }

      // Tangent velocity arrow v(t) (sky blue)
      if (evaluation.speedNow > 0.15) {
        const vLen = Math.max(0.5, Math.min(1.8, evaluation.speedNow * 0.22));
        const vDir = new THREE.Vector3(evaluation.vxNow, 0, -evaluation.vyNow).normalize();
        root.add(createVectorArrow3D(new THREE.Vector3(puckX, puckY + 0.02, puckZ), vDir, vLen, SKY_MAIN, 0.038));
      }

      // Clean board-edge badges (kept well inside 2D orthographic safe area)
      const topBadge = makeLabelSprite(
        `F_net = ${evaluation.fNetMag.toFixed(1)} N @ ${evaluation.fNetAngleDeg.toFixed(0)}°  ||  a_sys = ${evaluation.aMagSys.toFixed(2)} m/s² @ ${evaluation.aAngleDeg.toFixed(0)}°`,
        '#fbbf24',
        'rgba(24,14,4,0.94)',
        0.22
      );
      topBadge.position.set(0, tableY + 0.35, -tableSize / 2 - 0.36);
      root.add(topBadge);

      const botBadge = makeLabelSprite(
        `m = ${params.puckMassKg.toFixed(1)} kg · v(t) = (${evaluation.vxNow.toFixed(1)}, ${evaluation.vyNow.toFixed(1)}) m/s`,
        '#38bdf8',
        'rgba(4,16,28,0.94)',
        0.21
      );
      botBadge.position.set(0, tableY + 0.35, tableSize / 2 + 0.38);
      root.add(botBadge);
    } else if (params.mode === 'modified_atwood') {
      // =====================================================================
      // MODE 3: MODIFIED ATWOOD MACHINE (EK 2.5.A.2 + SKILLS 1.B, 2.D, 3.A)
      // =====================================================================
      const benchY = 0.55;
      const benchLen = 6.6;
      const pulleyX = 2.65;
      const pulleyY = benchY + 0.38;

      // Elevated steel lab table
      const rulerTex = makeTrackRulerTexture(maxAniso);
      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(benchLen, 0.28, 1.6),
        [
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.48 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.48 }),
          new THREE.MeshStandardMaterial({ map: rulerTex, color: 0xffffff, roughness: 0.55, metalness: 0.2 }),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.48 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.48 }),
        ]
      );
      tableTop.position.set(-0.9, benchY - 0.14, 0);
      root.add(tableTop);

      // Table legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.4 });
      for (const lx of [-3.8, 1.9]) {
        for (const lz of [-0.6, 0.6]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.85, 12), legMat);
          leg.position.set(lx, benchY - 1.56, lz);
          root.add(leg);
        }
      }

      // Rim-mounted low-friction pulley bracket & spoked wheel
      const bracketMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.25, metalness: 0.85 });
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.24), bracketMat);
      arm.position.set(pulleyX - 0.22, benchY + 0.12, 0);
      arm.rotation.z = 0.45;
      root.add(arm);

      const pulleyR = 0.34;
      const pulleyWheel = new THREE.Mesh(
        new THREE.TorusGeometry(pulleyR, 0.055, 14, 28),
        new THREE.MeshStandardMaterial({ color: AMBER_GOLD, roughness: 0.3, metalness: 0.82 })
      );
      pulleyWheel.position.set(pulleyX, pulleyY, 0);
      root.add(pulleyWheel);
      const pulleyHub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 16), bracketMat);
      pulleyHub.rotation.x = Math.PI / 2;
      pulleyHub.position.set(pulleyX, pulleyY, 0);
      root.add(pulleyHub);

      // Dynamic positions of cart m1 and hanger m2
      const m2 = Math.max(0.2, Math.min(params.lockTotalMass ? params.totalSystemMassKg - 0.4 : 4.0, params.hang2MassKg));
      const m1 = params.lockTotalMass ? Math.max(0.4, params.totalSystemMassKg - m2) : params.cart1MassKg;
      const travel = Math.min(2.15, evaluation.atwoodDropDistM * 0.48);
      const cartX = -2.4 + travel;
      const hangerX = pulleyX + pulleyR;
      const hangerY = pulleyY - 1.0 - travel * 0.72;

      // Wheeled cart m1 with mass stack proportional to m1
      const cart = buildDynamicsCart(m1, EMERALD_MAIN, 1.55);
      cart.position.set(cartX, benchY, 0);
      root.add(cart);

      // Hanging mass hanger m2 (stem + stacked brass slotted discs)
      const hangerGroup = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.65, 12), bracketMat);
      stem.position.y = 0.2;
      const hangerBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.08, 22),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 })
      );
      hangerBase.position.y = -0.14;
      hangerGroup.add(stem, hangerBase);

      const discCount = Math.max(1, Math.min(6, Math.round(m2 * 1.6)));
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
      for (let i = 0; i < discCount; i++) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.085, 22), brassMat);
        disc.position.y = -0.04 + i * 0.098;
        hangerGroup.add(disc);
      }
      hangerGroup.position.set(hangerX, hangerY, 0);
      root.add(hangerGroup);

      // Taut massless string over pulley
      const stringPts = [
        new THREE.Vector3(cartX + 0.82, pulleyY + pulleyR, 0),
        new THREE.Vector3(pulleyX, pulleyY + pulleyR, 0),
        new THREE.Vector3(pulleyX + pulleyR * 0.72, pulleyY + pulleyR * 0.72, 0),
        new THREE.Vector3(hangerX, pulleyY, 0),
        new THREE.Vector3(hangerX, hangerY + 0.5, 0),
      ];
      const stringLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(stringPts),
        new THREE.LineBasicMaterial({ color: 0xe2e8f0 })
      );
      root.add(stringLine);

      // Optional Dashed Emerald System Boundary around Cart + String + Hanger
      if (params.showSystemBoundary) {
        const bPts = [
          new THREE.Vector3(cartX - 1.15, benchY + 1.45, 0.5),
          new THREE.Vector3(hangerX + 0.75, benchY + 1.45, 0.5),
          new THREE.Vector3(hangerX + 0.75, hangerY - 0.55, 0.5),
          new THREE.Vector3(hangerX - 0.75, hangerY - 0.55, 0.5),
          new THREE.Vector3(hangerX - 0.75, benchY - 0.05, 0.5),
          new THREE.Vector3(cartX - 1.15, benchY - 0.05, 0.5),
          new THREE.Vector3(cartX - 1.15, benchY + 1.45, 0.5),
        ];
        const boundaryGeo = new THREE.BufferGeometry().setFromPoints(bPts);
        const boundaryLine = new THREE.Line(
          boundaryGeo,
          new THREE.LineDashedMaterial({ color: EMERALD_MAIN, dashSize: 0.24, gapSize: 0.14 })
        );
        boundaryLine.computeLineDistances();
        root.add(boundaryLine);
      }

      // Key force & acceleration vectors
      const tLen = Math.max(0.55, Math.min(1.85, evaluation.atwoodTensionN * 0.075));
      const fgLen = Math.max(0.65, Math.min(2.15, evaluation.atwoodHangingWeightN * 0.075));
      const aLen = Math.max(0.55, Math.min(1.8, evaluation.axSys * 0.26));

      // Internal tension T on cart (+x) and on hanger (+y)
      root.add(createVectorArrow3D(new THREE.Vector3(cartX + 0.85, benchY + 0.55, 0.15), new THREE.Vector3(1, 0, 0), tLen, SKY_MAIN, 0.044));
      root.add(createVectorArrow3D(new THREE.Vector3(hangerX, hangerY + 0.52, 0.15), new THREE.Vector3(0, 1, 0), tLen * 0.75, SKY_MAIN, 0.042));
      // External driving gravity m2 g downward on hanger
      root.add(createVectorArrow3D(new THREE.Vector3(hangerX, hangerY - 0.22, 0.15), new THREE.Vector3(0, -1, 0), fgLen, ROSE_MAIN, 0.054));
      // System acceleration arrow above cart
      root.add(createVectorArrow3D(new THREE.Vector3(cartX, benchY + 1.2, 0.15), new THREE.Vector3(1, 0, 0), aLen, AMBER_GOLD, 0.05));

      // Clean non-overlapping labels
      const cartLbl = makeLabelSprite(`m_1 = ${m1.toFixed(1)} kg · a_sys = ${evaluation.axSys.toFixed(2)} m/s²`, '#34d399', 'rgba(4,13,10,0.93)', 0.23);
      cartLbl.position.set(Math.max(-2.6, Math.min(0.6, cartX)), benchY + 1.78, 0.2);
      root.add(cartLbl);

      const tLbl = makeLabelSprite(`T = ${evaluation.atwoodTensionN.toFixed(1)} N (Internal)`, '#38bdf8', 'rgba(4,16,28,0.93)', 0.21);
      tLbl.position.set(Math.min(1.6, cartX + 1.55), benchY + 1.02, 0.25);
      root.add(tLbl);

      const fgLbl = makeLabelSprite(`m_2 g = ${evaluation.atwoodHangingWeightN.toFixed(1)} N (m_2=${m2.toFixed(1)} kg)`, '#fb7185', 'rgba(30,8,16,0.93)', 0.22);
      fgLbl.position.set(hangerX - 1.55, hangerY - 0.65, 0.25);
      root.add(fgLbl);
    } else {
      // =====================================================================
      // MODE 4: MULTI-OBJECT SYSTEM COM & INTERNAL VS EXTERNAL FORCES (2.5.A.3)
      // =====================================================================
      const trackY = -0.72;
      const trackLen = 11.2;

      const rulerTex = makeTrackRulerTexture(maxAniso);
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(trackLen, 0.34, 1.55),
        [
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.55, metalness: 0.45 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.55, metalness: 0.45 }),
          new THREE.MeshStandardMaterial({ map: rulerTex, color: 0xffffff, roughness: 0.55, metalness: 0.2 }),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.3 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.5 }),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.5, metalness: 0.5 }),
        ]
      );
      bench.position.y = trackY - 0.17;
      root.add(bench);

      const railMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.22, metalness: 0.88 });
      for (const rz of [-0.48, 0.48]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.05, 0.06), railMat);
        rail.position.set(0, trackY + 0.025, rz);
        root.add(rail);
      }

      // Map world coordinates smoothly onto the 11m track
      const xScale = 0.52;
      const baseShift = -1.6;
      const clampX = (v: number) => Math.max(-4.5, Math.min(4.5, v));

      const xCmVis = clampX(baseShift + evaluation.xCmNow * xScale);
      const xAVis = clampX(baseShift + evaluation.xANow * xScale);
      const xBVis = clampX(baseShift + evaluation.xBNow * xScale);

      // Cart A (emerald) & Cart B (sky blue)
      const cartA = buildDynamicsCart(params.massAKg, EMERALD_MAIN, 1.25);
      cartA.position.set(xAVis, trackY + 0.05, 0);
      root.add(cartA);

      const cartB = buildDynamicsCart(params.massBKg, SKY_MAIN, 1.25);
      cartB.position.set(xBVis, trackY + 0.05, 0);
      root.add(cartB);

      // Coiled internal spring between Cart A and Cart B
      const springStart = xAVis + 0.68;
      const springEnd = xBVis - 0.68;
      if (springEnd > springStart + 0.12) {
        root.add(buildCoiledSpringMesh(springStart, springEnd, trackY + 0.37, 8));
      }

      // Glowing golden System Center-of-Mass (COM) marker & plumb mast
      const comMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 1.85, 10),
        new THREE.MeshStandardMaterial({ color: AMBER_GOLD, emissive: AMBER_GOLD, emissiveIntensity: 0.35 })
      );
      comMast.position.set(xCmVis, trackY + 0.96, 0.42);
      root.add(comMast);

      const comOrb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 1),
        new THREE.MeshStandardMaterial({
          color: AMBER_GOLD,
          emissive: AMBER_GOLD,
          emissiveIntensity: 0.55,
          roughness: 0.2,
          metalness: 0.7,
        })
      );
      comOrb.position.set(xCmVis, trackY + 1.92, 0.42);
      root.add(comOrb);

      // COM equal-Δt strobe trail on front rail (shows strictly uniform spacing when F_ext = 0!)
      const strobeMat = new THREE.MeshStandardMaterial({
        color: AMBER_GOLD,
        emissive: AMBER_GOLD,
        emissiveIntensity: 0.45,
      });
      for (const sp of evaluation.strobePoints) {
        const sx = clampX(baseShift + sp.x * xScale);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), strobeMat);
        dot.position.set(sx, trackY + 0.1, 0.58);
        root.add(dot);
      }

      // Velocity arrows on Cart A, Cart B, and COM
      if (Math.abs(evaluation.vANow) > 0.1) {
        const dirA = evaluation.vANow >= 0 ? 1 : -1;
        root.add(createVectorArrow3D(new THREE.Vector3(xAVis, trackY - 0.52, 0.6), new THREE.Vector3(dirA, 0, 0), Math.min(1.5, Math.abs(evaluation.vANow) * 0.25), EMERALD_MAIN, 0.036));
      }
      if (Math.abs(evaluation.vBNow) > 0.1) {
        const dirB = evaluation.vBNow >= 0 ? 1 : -1;
        root.add(createVectorArrow3D(new THREE.Vector3(xBVis, trackY - 0.52, 0.6), new THREE.Vector3(dirB, 0, 0), Math.min(1.5, Math.abs(evaluation.vBNow) * 0.25), SKY_MAIN, 0.036));
      }
      if (Math.abs(evaluation.vCmNow) > 0.1) {
        const dirC = evaluation.vCmNow >= 0 ? 1 : -1;
        root.add(createVectorArrow3D(new THREE.Vector3(xCmVis, trackY + 1.92, 0.42), new THREE.Vector3(dirC, 0, 0), Math.min(1.9, Math.abs(evaluation.vCmNow) * 0.34), AMBER_GOLD, 0.048));
      }

      // External force arrow ΣF_ext if nonzero
      if (Math.abs(params.externalForceN) > 0.2) {
        const extDir = params.externalForceN > 0 ? 1 : -1;
        const extLen = Math.max(0.65, Math.min(2.2, Math.abs(params.externalForceN) * 0.13));
        root.add(createVectorArrow3D(new THREE.Vector3(xCmVis, trackY + 2.32, 0.42), new THREE.Vector3(extDir, 0, 0), extLen, ROSE_MAIN, 0.056));
      }

      // Clear labels
      const comLbl = makeLabelSprite(
        Math.abs(params.externalForceN) < 0.1
          ? `SYSTEM COM: ΣF_ext = 0 => v_cm = ${evaluation.vCmNow.toFixed(1)} m/s CONST`
          : `SYSTEM COM: ΣF_ext = ${params.externalForceN > 0 ? '+' : ''}${params.externalForceN.toFixed(0)} N => a_cm = ${evaluation.aCmNow.toFixed(2)} m/s²`,
        Math.abs(params.externalForceN) < 0.1 ? '#fbbf24' : '#fb7185',
        'rgba(18,12,4,0.95)',
        0.24
      );
      comLbl.position.set(Math.max(-2.1, Math.min(2.1, xCmVis)), trackY + 2.68, 0.42);
      root.add(comLbl);

      const aLbl = makeLabelSprite(`Cart A (${params.massAKg.toFixed(1)}kg): v=${evaluation.vANow.toFixed(1)}`, '#34d399', 'rgba(4,13,10,0.93)', 0.2);
      aLbl.position.set(Math.max(-3.8, Math.min(3.5, xAVis)), trackY - 0.92, 0.6);
      root.add(aLbl);

      const bLbl = makeLabelSprite(`Cart B (${params.massBKg.toFixed(1)}kg): v=${evaluation.vBNow.toFixed(1)}`, '#38bdf8', 'rgba(4,16,28,0.93)', 0.2);
      bLbl.position.set(Math.max(-3.5, Math.min(3.8, xBVis)), trackY - 0.92, 0.6);
      root.add(bLbl);
    }

    requestRenderRef.current?.();
  }, [params, evaluation]);

  return (
    <div
      ref={mountRef}
      data-testid="newton25-viewport"
      className="w-full h-full relative"
    />
  );
};
