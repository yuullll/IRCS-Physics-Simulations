'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Newton24Evaluation,
  Newton24Mode,
  Newton24Params,
} from '@/lib/physics/newton-first-law-2-4';

export interface Newton24ViewportProps {
  params: Newton24Params;
  evaluation: Newton24Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const ROSE_MAIN = 0xf43f5e;
const AMBER_GOLD = 0xf59e0b;
const SLATE_BENCH = 0x1e293b;
const CHROME_METAL = 0xcbd5e1;

function makeLabelSprite(
  text: string,
  colorHex: string,
  bgHex = 'rgba(4, 13, 10, 0.93)',
  worldHeight = 0.27
): THREE.Sprite {
  const fontSpec = '700 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  const probeCanvas = document.createElement('canvas');
  const probeCtx = probeCanvas.getContext('2d')!;
  probeCtx.font = fontSpec;
  const textW = probeCtx.measureText(text).width;

  const padX = 34;
  const canvasW = Math.max(150, Math.ceil(textW + padX * 2));
  const canvasH = 72;

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
    metalness: 0.18,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, shaftLen, 14), mat);
  shaft.position.y = shaftLen / 2;

  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.45, headLen, 16), mat);
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

function makeForceDialTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#0c1824';
  ctx.fillRect(0, 0, size, size);

  // Concentric calibration rings
  for (const r of [60, 120, 180, 224]) {
    ctx.strokeStyle = r === 224 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(16, 185, 129, 0.22)';
    ctx.lineWidth = r === 224 ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Crosshairs
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 224, cy);
  ctx.lineTo(cx + 224, cy);
  ctx.moveTo(cx, cy - 224);
  ctx.lineTo(cx, cy + 224);
  ctx.stroke();

  // 15-degree tick marks and cardinal angle labels
  ctx.font = '700 18px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (-deg * Math.PI) / 180;
    const isMajor = deg % 45 === 0;
    const r0 = isMajor ? 198 : 210;
    const r1 = 224;
    ctx.strokeStyle = isMajor ? '#34d399' : 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = isMajor ? 2.6 : 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r0, cy + Math.sin(rad) * r0);
    ctx.lineTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
    ctx.stroke();

    if (deg % 90 === 0) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`${deg}°`, cx + Math.cos(rad) * 176, cy + Math.sin(rad) * 176);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function makeAirTableGridTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#09161e';
  ctx.fillRect(0, 0, size, size);

  const step = size / 8;
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 8; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Primary X / Y axis lines near lower-left origin
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.72)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, size - step * 1.5);
  ctx.lineTo(size, size - step * 1.5);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(244, 63, 94, 0.72)';
  ctx.beginPath();
  ctx.moveTo(step * 1.5, 0);
  ctx.lineTo(step * 1.5, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Composite 6-part hover glider (anodized chassis, matte deck, brushed rails, thruster pods, COM jewel, contact skirt).
 */
function createHoverGlider(width: number, height: number, depth: number, accentHex: number): THREE.Group {
  const g = new THREE.Group();

  // 1. Air-cushion skirt (matte charcoal)
  const skirt = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.04, 0.11, depth * 1.04),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.1 })
  );
  skirt.position.y = 0.055;
  g.add(skirt);

  // 2. Primary anodized chassis
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.38, metalness: 0.42 })
  );
  hull.position.y = 0.11 + height / 2;
  g.add(hull);

  // 3. Matte instrument top deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, 0.06, depth * 0.78),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.78, metalness: 0.12 })
  );
  deck.position.y = 0.11 + height + 0.03;
  g.add(deck);

  // 4. Brushed chrome side rails
  const railMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.85 });
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, width * 0.92, 10), railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.11 + height * 0.65, s * (depth / 2 + 0.02));
    g.add(rail);
  }

  // 5. Left & right thruster nozzles
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 });
  for (const s of [-1, 1]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 14), nozzleMat);
    nozzle.rotation.z = (s * Math.PI) / 2;
    nozzle.position.set(s * (width / 2 + 0.06), 0.11 + height * 0.5, 0);
    g.add(nozzle);
  }

  // 6. Gold COM marker jewel
  const jewel = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 14),
    new THREE.MeshStandardMaterial({
      color: AMBER_GOLD,
      emissive: AMBER_GOLD,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.85,
    })
  );
  jewel.position.set(0, 0.11 + height * 0.52, depth / 2 + 0.06);
  g.add(jewel);

  return g;
}

/**
 * Composite 5-part 2D air-table puck with 4 directional thruster nozzles.
 */
function createAirTablePuck(radius: number, height: number): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.15 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, roughness: 0.35, metalness: 0.45 });
  const rimMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.85 });
  const coreMat = new THREE.MeshStandardMaterial({
    color: AMBER_GOLD,
    emissive: AMBER_GOLD,
    emissiveIntensity: 0.3,
    roughness: 0.22,
    metalness: 0.85,
  });

  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.08, 0.06, 28), baseMat);
  cushion.position.y = 0.03;
  g.add(cushion);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), bodyMat);
  disc.position.y = 0.06 + height / 2;
  g.add(disc);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.82, 0.025, 10, 28), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06 + height + 0.01;
  g.add(rim);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), coreMat);
  core.position.y = 0.06 + height + 0.05;
  g.add(core);

  // 4 orthogonal micro-nozzles
  for (const ang of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.1, 10), rimMat);
    noz.rotation.z = Math.PI / 2;
    noz.rotation.y = ang;
    noz.position.set(Math.cos(ang) * (radius + 0.03), 0.06 + height / 2, -Math.sin(ang) * (radius + 0.03));
    g.add(noz);
  }
  return g;
}

/**
 * Composite 8-part cutaway railcar with overhead frame, wheels, axles, glass floor, and end bulkheads.
 */
function createCutawayRailcar(carLen: number, carHeight: number, carDepth: number): THREE.Group {
  const g = new THREE.Group();
  const deckY = 0.42;

  // 1. Main steel chassis deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(carLen, 0.18, carDepth),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.4 })
  );
  deck.position.y = deckY;
  g.add(deck);

  // 2. Smooth low-friction glass tabletop strip inside car
  const glassFloor = new THREE.Mesh(
    new THREE.BoxGeometry(carLen * 0.9, 0.04, carDepth * 0.78),
    new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.42,
    })
  );
  glassFloor.position.y = deckY + 0.11;
  g.add(glassFloor);

  // 3. Roof bar & structural frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.62 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(carLen, 0.14, carDepth), frameMat);
  roof.position.y = deckY + carHeight;
  g.add(roof);

  // 4. Four corner vertical pillars
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, carHeight, 0.14), frameMat);
      pillar.position.set(sx * (carLen / 2 - 0.08), deckY + carHeight / 2, sz * (carDepth / 2 - 0.08));
      g.add(pillar);
    }
  }

  // 5. Rear translucent back window wall (so front stays open cutaway)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(carLen - 0.18, carHeight - 0.16, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55,
    })
  );
  backWall.position.set(0, deckY + carHeight / 2, -carDepth / 2 + 0.05);
  g.add(backWall);

  // 6. Emerald accent trim stripes on roof & deck
  const trimMat = new THREE.MeshStandardMaterial({
    color: EMERALD_MAIN,
    emissive: EMERALD_MAIN,
    emissiveIntensity: 0.2,
    roughness: 0.35,
    metalness: 0.5,
  });
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(carLen + 0.04, 0.05, carDepth + 0.04), trimMat);
  roofTrim.position.y = deckY + carHeight + 0.08;
  g.add(roofTrim);

  // 7. Four flanged steel wheels + axles
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.5, metalness: 0.65 });
  const hubMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.22, metalness: 0.88 });
  for (const wx of [-carLen * 0.34, carLen * 0.34]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, carDepth * 0.92, 10), hubMat);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(wx, 0.2, 0);
    g.add(axle);
    for (const wz of [-carDepth * 0.42, carDepth * 0.42]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 20), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.2, wz);
      g.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 14), hubMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.2, wz);
      g.add(hub);
    }
  }

  return g;
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

export const Newton24Viewport: React.FC<Newton24ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const applyCameraRef = useRef<((mode: Newton24Mode, vm: '3d' | '2d', eqPreset: string) => void) | null>(null);
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
    scene.fog = new THREE.FogExp2(0x040d0a, 0.022);

    const perspCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    const frustumSize = 9.4;
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
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    maxAnisoRef.current = renderer.capabilities.getMaxAnisotropy();

    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Warm key + cool hemisphere fill + rim light
    const hemi = new THREE.HemisphereLight(0xbbe8ff, 0x091a14, 0.78);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.55);
    keyLight.position.set(7, 13, 9);
    keyLight.castShadow = !isSoftwareGl;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-8, 6, -7);
    scene.add(rimLight);

    // Subtle ground floor reference grid
    const grid = new THREE.GridHelper(32, 32, 0x10b981, 0x0b2a20);
    grid.position.y = -2.35;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.34;
    scene.add(grid);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    sceneGroupRef.current = dynamicGroup;

    const controls = new OrbitControls(perspCamera as THREE.Camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 26;
    controls.minDistance = 4;

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

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

    const applyCamera = (mode: Newton24Mode, vm: '3d' | '2d', eqPreset: string) => {
      const isTopDownMode =
        (mode === 'equilibrium' && eqPreset === 'force_table') || mode === 'axis_independence';

      if (vm === '2d') {
        activeCamera = orthoCamera;
        controls.object = orthoCamera;
        controls.enableRotate = false;
        if (isTopDownMode) {
          orthoCamera.position.set(0, 12, 0.01);
          controls.target.set(0, 0, 0);
        } else {
          orthoCamera.position.set(0, 0.4, 12);
          controls.target.set(0, 0.2, 0);
        }
        orthoCamera.zoom =
          mode === 'axis_independence'
            ? 0.82
            : mode === 'equilibrium' && eqPreset === 'force_table'
            ? 0.84
            : mode === 'inertial_frame'
            ? 0.92
            : 0.98;
        orthoCamera.updateProjectionMatrix();
      } else {
        activeCamera = perspCamera;
        controls.object = perspCamera;
        controls.enableRotate = true;
        if (mode === 'equilibrium' && eqPreset === 'force_table') {
          perspCamera.position.set(0, 8.9, 9.2);
          controls.target.set(0, -0.15, 0.25);
        } else if (mode === 'equilibrium' && eqPreset === 'hanging_sign') {
          perspCamera.position.set(0.0, 0.9, 13.0);
          controls.target.set(0, 0.05, 0);
        } else if (mode === 'axis_independence') {
          perspCamera.position.set(0.0, 9.2, 8.6);
          controls.target.set(0, -0.1, 0.15);
        } else if (mode === 'constant_v') {
          perspCamera.position.set(0.4, 2.5, 11.4);
          controls.target.set(0, 0.15, 0);
        } else {
          // inertial_frame
          perspCamera.position.set(0.0, 2.4, 12.2);
          controls.target.set(0, 0.35, 0);
        }
        perspCamera.updateProjectionMatrix();
      }
      controls.update();
      requestRender();
    };
    applyCameraRef.current = applyCamera;
    // Reset camera key so StrictMode remount always initializes the fresh camera
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

  // Sync camera when mode, preset, or 3D/2D view changes
  useEffect(() => {
    const camKey = `${params.mode}:${params.eqPreset}:${viewMode}`;
    if (prevCameraKeyRef.current !== camKey) {
      prevCameraKeyRef.current = camKey;
      applyCameraRef.current?.(params.mode, viewMode, params.eqPreset);
    }
  }, [params.mode, params.eqPreset, viewMode]);

  // Rebuild dynamic physics scene whenever parameters/evaluation update
  useEffect(() => {
    const root = sceneGroupRef.current;
    if (!root) return;
    disposeGroup(root);

    const maxAniso = maxAnisoRef.current;

    if (params.mode === 'equilibrium') {
      if (params.eqPreset === 'force_table') {
        // -------------------------------------------------------------------
        // MODE 1A: 3D PRECISION FORCE TABLE (EK 2.4.A.1 & 2.4.A.2)
        // -------------------------------------------------------------------
        const tableY = -0.35;
        const tableR = 2.95;

        // Pedestal column & base foot
        const pedMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.35 });
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 1.9, 20), pedMat);
        column.position.y = tableY - 1.05;
        root.add(column);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.22, 24), pedMat);
        foot.position.y = tableY - 1.92;
        root.add(foot);

        // Main circular table disc with procedural degree-dial top
        const rimMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(tableR + 0.14, tableR + 0.18, 0.26, 48),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.48, metalness: 0.55 })
        );
        rimMesh.position.y = tableY - 0.13;
        root.add(rimMesh);

        const dialTex = makeForceDialTexture(maxAniso);
        const dialTop = new THREE.Mesh(
          new THREE.CylinderGeometry(tableR, tableR, 0.04, 48),
          new THREE.MeshStandardMaterial({ map: dialTex, color: 0xffffff, roughness: 0.65, metalness: 0.12 })
        );
        dialTop.position.y = tableY + 0.02;
        root.add(dialTop);

        // Central equilibrium offset visual (if unbalanced, ring pulls slightly in direction of F_net)
        const offsetScale = evaluation.isEquilibrium ? 0 : Math.min(0.42, evaluation.fNetMag * 0.018);
        const netDirX = evaluation.fNetMag > 1e-4 ? evaluation.fNetX / evaluation.fNetMag : 0;
        const netDirZ = evaluation.fNetMag > 1e-4 ? -evaluation.fNetY / evaluation.fNetMag : 0;
        const ringX = netDirX * offsetScale;
        const ringZ = netDirZ * offsetScale;
        const ringY = tableY + 0.16;

        // Center calibration pin
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16),
          new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.88 })
        );
        pin.position.set(0, tableY + 0.19, 0);
        root.add(pin);

        // Brass equilibrium ring
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.052, 16, 32),
          new THREE.MeshStandardMaterial({
            color: evaluation.isEquilibrium ? EMERALD_MAIN : AMBER_GOLD,
            emissive: evaluation.isEquilibrium ? EMERALD_MAIN : AMBER_GOLD,
            emissiveIntensity: 0.3,
            roughness: 0.25,
            metalness: 0.82,
          })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(ringX, ringY, ringZ);
        root.add(ring);

        // Render the 3 rim pulleys, cords, force arrows & labels
        const forceScale = 0.088;
        const clampMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.26, metalness: 0.85 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.72 });

        for (const f of evaluation.forces) {
          const rad = (f.angleDeg * Math.PI) / 180;
          const dx = Math.cos(rad);
          const dz = -Math.sin(rad);
          const colorNum = parseInt(f.color.replace('#', ''), 16);

          // Rim pulley clamp at table edge
          const rimX = dx * (tableR + 0.14);
          const rimZ = dz * (tableR + 0.14);
          const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), clampMat);
          clamp.position.set(rimX, tableY + 0.08, rimZ);
          clamp.rotation.y = rad;
          root.add(clamp);

          const pulleyWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), wheelMat);
          pulleyWheel.position.set(dx * (tableR + 0.26), tableY + 0.16, dz * (tableR + 0.26));
          pulleyWheel.rotation.x = Math.PI / 2;
          pulleyWheel.rotation.z = -rad;
          root.add(pulleyWheel);

          // Taut string from ring to pulley
          const cordPts = [new THREE.Vector3(ringX, ringY, ringZ), new THREE.Vector3(rimX, ringY, rimZ)];
          const cordGeo = new THREE.BufferGeometry().setFromPoints(cordPts);
          const cordLine = new THREE.Line(
            cordGeo,
            new THREE.LineBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.75 })
          );
          root.add(cordLine);

          // 3D Force arrow radiating outward from ring
          const arrowLen = Math.max(0.45, Math.min(2.65, f.mag * forceScale));
          const arrowStart = new THREE.Vector3(ringX + dx * 0.28, ringY + 0.04, ringZ + dz * 0.28);
          root.add(createForceArrow3D(arrowStart, new THREE.Vector3(dx, 0, dz), arrowLen, colorNum, 0.052));

          // Crisp sprite label beyond rim
          const labelDist = tableR + 0.72;
          const lbl = makeLabelSprite(`${f.label}: ${f.mag.toFixed(1)} N (${f.angleDeg.toFixed(0)}°)`, f.color, 'rgba(4,13,10,0.92)', 0.25);
          lbl.position.set(dx * labelDist, ringY + 0.3, dz * labelDist);
          root.add(lbl);
        }

        // Optional Tip-to-Tail ghost polygon hovering above table
        if (params.showTipToTail) {
          let tx = 0;
          let tz = 0;
          const polyY = ringY + 0.65;
          const polyScale = 0.052;
          for (const f of evaluation.forces) {
            const nx = tx + f.fx * polyScale;
            const nz = tz - f.fy * polyScale;
            const segGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(tx, polyY, tz),
              new THREE.Vector3(nx, polyY, nz),
            ]);
            const segLine = new THREE.Line(
              segGeo,
              new THREE.LineBasicMaterial({ color: parseInt(f.color.replace('#', ''), 16) })
            );
            root.add(segLine);
            tx = nx;
            tz = nz;
          }
        }

        // Bold crimson Net Force arrow when unbalanced
        if (!evaluation.isEquilibrium) {
          const netLen = Math.max(0.55, Math.min(2.5, evaluation.fNetMag * forceScale));
          root.add(
            createForceArrow3D(
              new THREE.Vector3(ringX, ringY + 0.28, ringZ),
              new THREE.Vector3(netDirX, 0, netDirZ),
              netLen,
              ROSE_MAIN,
              0.068
            )
          );
          const netLbl = makeLabelSprite(
            `ΣF = ${evaluation.fNetMag.toFixed(1)} N (Unbalanced)`,
            '#fb7185',
            'rgba(30, 8, 16, 0.94)',
            0.29
          );
          netLbl.position.set(netDirX * (netLen + 0.7), ringY + 0.78, netDirZ * (netLen + 0.7));
          root.add(netLbl);
        } else {
          const eqLbl = makeLabelSprite(
            'EQUILIBRIUM: ΣF = 0.0 N',
            '#34d399',
            'rgba(4, 24, 16, 0.95)',
            0.27
          );
          eqLbl.position.set(0, ringY + 1.05, -0.35);
          root.add(eqLbl);
        }
      } else {
        // -------------------------------------------------------------------
        // MODE 1B: HANGING SIGN STATIC EQUILIBRIUM (SKILL 2.B UNKNOWN TENSIONS)
        // -------------------------------------------------------------------
        const beamY = 2.45;
        const knotY = 0.25;
        const dy = beamY - knotY;

        // Overhead steel I-beam
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(7.8, 0.28, 0.55),
          new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.45, metalness: 0.65 })
        );
        beam.position.set(0, beamY + 0.14, 0);
        root.add(beam);

        const th1 = (params.leftCableAngleDeg * Math.PI) / 180;
        const th2 = (params.rightCableAngleDeg * Math.PI) / 180;
        const leftAnchorX = -Math.min(3.4, dy / Math.tan(th1));
        const rightAnchorX = Math.min(3.4, dy / Math.tan(th2));

        // Left & right ceiling anchor shackles
        const shackleMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.22, metalness: 0.88 });
        for (const ax of [leftAnchorX, rightAnchorX]) {
          const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.032, 10, 18), shackleMat);
          shackle.position.set(ax, beamY - 0.04, 0);
          root.add(shackle);
        }

        // Steel tension cables (cylinders aligned from knot to anchors)
        const addCable = (x1: number, y1: number, x2: number, y2: number, hex: number) => {
          const p1 = new THREE.Vector3(x1, y1, 0);
          const p2 = new THREE.Vector3(x2, y2, 0);
          const diff = p2.clone().sub(p1);
          const len = diff.length();
          const cyl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, len, 12),
            new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.6 })
          );
          cyl.position.copy(p1).addScaledVector(diff, 0.5);
          cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
          root.add(cyl);
        };
        addCable(0, knotY, leftAnchorX, beamY - 0.04, 0x94a3b8);
        addCable(0, knotY, rightAnchorX, beamY - 0.04, 0x94a3b8);

        // Central junction ring
        const knot = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.04, 12, 24),
          new THREE.MeshStandardMaterial({ color: AMBER_GOLD, roughness: 0.24, metalness: 0.85 })
        );
        knot.position.set(0, knotY, 0);
        root.add(knot);

        // Short vertical stem + composite framed lab sign mass
        addCable(0, knotY - 0.14, 0, knotY - 0.65, CHROME_METAL);

        const signGroup = new THREE.Group();
        const signFrame = new THREE.Mesh(
          new THREE.BoxGeometry(2.15, 0.96, 0.24),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.55 })
        );
        const signFace = new THREE.Mesh(
          new THREE.BoxGeometry(1.94, 0.76, 0.27),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42, metalness: 0.28 })
        );
        const signTrim = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.07, 0.28),
          new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.85 })
        );
        signTrim.position.y = 0.48;
        signGroup.add(signFrame, signFace, signTrim);
        signGroup.position.set(0, knotY - 1.13, 0);
        root.add(signGroup);

        // Tension & gravity force arrows
        const arrowScale = 0.036;
        const t1Dir = new THREE.Vector3(-Math.cos(th1), Math.sin(th1), 0);
        const t2Dir = new THREE.Vector3(Math.cos(th2), Math.sin(th2), 0);
        const t1Len = Math.max(0.75, Math.min(2.35, evaluation.signTensionLeftN * arrowScale));
        const t2Len = Math.max(0.75, Math.min(2.35, evaluation.signTensionRightN * arrowScale));
        const fgLen = Math.max(0.75, Math.min(2.2, params.signMassKg * 9.81 * arrowScale));

        root.add(createForceArrow3D(new THREE.Vector3(0, knotY, 0.16), t1Dir, t1Len, EMERALD_MAIN, 0.052));
        root.add(createForceArrow3D(new THREE.Vector3(0, knotY, 0.16), t2Dir, t2Len, SKY_MAIN, 0.052));
        root.add(createForceArrow3D(new THREE.Vector3(0, knotY - 1.13, 0.2), new THREE.Vector3(0, -1, 0), fgLen, AMBER_GOLD, 0.052));

        // Labels cleanly separated inside center viewport safe zone
        const t1Lbl = makeLabelSprite(`T_1 = ${evaluation.signTensionLeftN.toFixed(1)} N (${params.leftCableAngleDeg}°)`, '#34d399', 'rgba(4,13,10,0.93)', 0.25);
        t1Lbl.position.set(Math.max(-2.15, leftAnchorX * 0.55 - 0.35), knotY + 0.9, 0.25);
        root.add(t1Lbl);

        const t2Lbl = makeLabelSprite(`T_2 = ${evaluation.signTensionRightN.toFixed(1)} N (${params.rightCableAngleDeg}°)`, '#38bdf8', 'rgba(4,13,10,0.93)', 0.25);
        t2Lbl.position.set(Math.min(2.15, rightAnchorX * 0.55 + 0.35), knotY + 0.9, 0.25);
        root.add(t2Lbl);

        const fgLbl = makeLabelSprite(`F_g = ${(params.signMassKg * 9.81).toFixed(1)} N (m = ${params.signMassKg.toFixed(1)} kg)`, '#fbbf24', 'rgba(4,13,10,0.93)', 0.25);
        fgLbl.position.set(0, knotY - 1.5 - fgLen * 0.85, 0.2);
        root.add(fgLbl);

        const eqTag = makeLabelSprite('STATIC EQUILIBRIUM: ΣF_x = 0, ΣF_y = 0', '#34d399', 'rgba(4,24,16,0.95)', 0.24);
        eqTag.position.set(0, beamY - 0.52, 0.18);
        root.add(eqTag);
      }
    } else if (params.mode === 'constant_v') {
      // ---------------------------------------------------------------------
      // MODE 2: AIR-TRACK CONSTANT VELOCITY & INERTIA LAB (EK 2.4.A.3)
      // ---------------------------------------------------------------------
      const trackY = -0.65;
      const trackLen = 10.6;

      // Air-track bench + legs + chrome rails
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(trackLen, 0.36, 1.55),
        new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.6, metalness: 0.42 })
      );
      bench.position.set(0, trackY - 0.18, 0);
      root.add(bench);

      const railMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.22, metalness: 0.85 });
      for (const rz of [-0.52, 0.52]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.06, 0.08), railMat);
        rail.position.set(0, trackY + 0.03, rz);
        root.add(rail);
      }
      for (const lx of [-4.2, 4.2]) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 1.45, 1.15),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.78, metalness: 0.25 })
        );
        leg.position.set(lx, trackY - 1.02, 0);
        root.add(leg);
      }

      // Periodic wrapped glider position along track so continuous cruise never flies off-screen
      const rawDisp = evaluation.posX * 0.42;
      const halfSpan = 3.5;
      const wrappedX = ((((rawDisp + halfSpan) % (halfSpan * 2)) + halfSpan * 2) % (halfSpan * 2)) - halfSpan;

      const glider = createHoverGlider(1.45, 0.72, 0.96, EMERALD_MAIN);
      glider.position.set(wrappedX, trackY + 0.06, 0);
      root.add(glider);

      // Glowing thruster plumes proportional to F_thrust & F_oppose
      if (params.thrustForceN > 0.5) {
        const plumeLen = 0.25 + params.thrustForceN * 0.018;
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, plumeLen, 14),
          new THREE.MeshStandardMaterial({
            color: 0x34d399,
            emissive: 0x10b981,
            emissiveIntensity: 0.85,
            transparent: true,
            opacity: 0.78,
          })
        );
        plume.rotation.z = Math.PI / 2;
        plume.position.set(wrappedX - 0.86 - plumeLen / 2, trackY + 0.52, 0);
        root.add(plume);
      }
      if (params.opposeForceN > 0.5) {
        const plumeLen = 0.25 + params.opposeForceN * 0.018;
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, plumeLen, 14),
          new THREE.MeshStandardMaterial({
            color: 0xfb7185,
            emissive: 0xf43f5e,
            emissiveIntensity: 0.85,
            transparent: true,
            opacity: 0.78,
          })
        );
        plume.rotation.z = -Math.PI / 2;
        plume.position.set(wrappedX + 0.86 + plumeLen / 2, trackY + 0.52, 0);
        root.add(plume);
      }

      const midY = trackY + 0.56;
      const fScale = 0.048;

      if (params.thrustForceN > 0.5) {
        const len = Math.max(0.45, Math.min(2.1, params.thrustForceN * fScale));
        root.add(createForceArrow3D(new THREE.Vector3(wrappedX + 0.76, midY, 0.25), new THREE.Vector3(1, 0, 0), len, EMERALD_MAIN, 0.048));
        const tLbl = makeLabelSprite(`F_thrust +${params.thrustForceN.toFixed(0)} N`, '#34d399', 'rgba(4,13,10,0.92)', 0.26);
        tLbl.position.set(wrappedX + 0.95 + len * 0.55, midY + 0.44, 0.25);
        root.add(tLbl);
      }
      if (params.opposeForceN > 0.5) {
        const len = Math.max(0.45, Math.min(2.1, params.opposeForceN * fScale));
        root.add(createForceArrow3D(new THREE.Vector3(wrappedX - 0.76, midY, 0.25), new THREE.Vector3(-1, 0, 0), len, ROSE_MAIN, 0.048));
        const oLbl = makeLabelSprite(`F_oppose -${params.opposeForceN.toFixed(0)} N`, '#fb7185', 'rgba(4,13,10,0.92)', 0.26);
        oLbl.position.set(wrappedX - 0.95 - len * 0.55, midY + 0.44, 0.25);
        root.add(oLbl);
      }

      // Live velocity arrow cleanly above glider
      if (Math.abs(evaluation.vxNow) > 0.08) {
        const vDir = evaluation.vxNow >= 0 ? 1 : -1;
        const vLen = Math.max(0.5, Math.min(2.3, Math.abs(evaluation.vxNow) * 0.26));
        root.add(
          createForceArrow3D(
            new THREE.Vector3(wrappedX, trackY + 1.48, 0),
            new THREE.Vector3(vDir, 0, 0),
            vLen,
            SKY_MAIN,
            0.045
          )
        );
      }
      const vBadge = makeLabelSprite(
        evaluation.isVxConstant
          ? `v_x = ${evaluation.vxNow >= 0 ? '+' : ''}${evaluation.vxNow.toFixed(1)} m/s (CONSTANT)`
          : `v_x = ${evaluation.vxNow >= 0 ? '+' : ''}${evaluation.vxNow.toFixed(1)} m/s (a_x = ${evaluation.accelX >= 0 ? '+' : ''}${evaluation.accelX.toFixed(1)} m/s²)`,
        evaluation.isVxConstant ? '#38bdf8' : '#fbbf24',
        'rgba(4,13,10,0.93)',
        0.28
      );
      vBadge.position.set(wrappedX, trackY + 1.98, 0);
      root.add(vBadge);

      const netBanner = makeLabelSprite(
        evaluation.isVxConstant
          ? 'ΣF_x = 0.0 N  ⇒  ZERO ACCELERATION (EK 2.4.A.3)'
          : `ΣF_x = ${evaluation.fNetX >= 0 ? '+' : ''}${evaluation.fNetX.toFixed(1)} N  ⇒  VELOCITY CHANGING`,
        evaluation.isVxConstant ? '#34d399' : '#fb7185',
        evaluation.isVxConstant ? 'rgba(4,24,16,0.94)' : 'rgba(30,8,16,0.94)',
        0.27
      );
      netBanner.position.set(0, trackY - 1.12, 0.2);
      root.add(netBanner);
    } else if (params.mode === 'axis_independence') {
      // ---------------------------------------------------------------------
      // MODE 3: 2D AIR-TABLE BALANCED VS UNBALANCED AXES (EK 2.4.A.4)
      // ---------------------------------------------------------------------
      const tableY = -0.35;
      const tableW = 6.8;
      const tableD = 5.4;

      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tableW + 0.34, 0.28, tableD + 0.34),
        new THREE.MeshStandardMaterial({ color: SLATE_BENCH, roughness: 0.48, metalness: 0.55 })
      );
      frameMesh.position.set(0, tableY - 0.14, 0);
      root.add(frameMesh);

      const gridTex = makeAirTableGridTexture(maxAniso);
      const topMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tableW, 0.04, tableD),
        new THREE.MeshStandardMaterial({ map: gridTex, color: 0xffffff, roughness: 0.62, metalness: 0.12 })
      );
      topMesh.position.set(0, tableY + 0.02, 0);
      root.add(topMesh);

      // Map physics (x, y) onto air-table plane (origin near bottom-left)
      const originX = -2.35;
      const originZ = 1.75;
      const mapScale = 0.34;
      const toTableX = (px: number) => Math.max(-tableW / 2 + 0.45, Math.min(tableW / 2 - 0.45, originX + px * mapScale));
      const toTableZ = (py: number) => Math.max(-tableD / 2 + 0.45, Math.min(tableD / 2 - 0.45, originZ - py * mapScale));

      // Strobe trajectory line + dots (showing uniform Δx alongside growing Δy!)
      if (params.showStrobeDots && evaluation.strobePoints.length > 1) {
        const linePts = evaluation.strobePoints.map(
          pt => new THREE.Vector3(toTableX(pt.x), tableY + 0.08, toTableZ(pt.y))
        );
        const pathLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(linePts),
          new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 })
        );
        root.add(pathLine);

        const dotMat = new THREE.MeshStandardMaterial({
          color: AMBER_GOLD,
          emissive: AMBER_GOLD,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        });
        for (const pt of evaluation.strobePoints) {
          const sx = toTableX(pt.x);
          const sz = toTableZ(pt.y);
          const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14), dotMat);
          dot.position.set(sx, tableY + 0.06, sz);
          root.add(dot);

          // Vertical guide drop to X-axis so student clearly sees uniform Δx intervals
          const dropLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(sx, tableY + 0.06, sz),
              new THREE.Vector3(sx, tableY + 0.06, originZ),
            ]),
            new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 })
          );
          root.add(dropLine);
        }
      }

      const puckX = toTableX(evaluation.posX);
      const puckZ = toTableZ(evaluation.posY);
      const puck = createAirTablePuck(0.36, 0.24);
      puck.position.set(puckX, tableY + 0.05, puckZ);
      root.add(puck);

      // Component force arrows on puck
      const fScale = 0.048;
      const pMidY = tableY + 0.24;
      if (params.fxPlusN > 0.5) {
        root.add(createForceArrow3D(new THREE.Vector3(puckX + 0.36, pMidY, puckZ), new THREE.Vector3(1, 0, 0), Math.min(1.4, params.fxPlusN * fScale), EMERALD_MAIN, 0.036));
      }
      if (params.fxMinusN > 0.5) {
        root.add(createForceArrow3D(new THREE.Vector3(puckX - 0.36, pMidY, puckZ), new THREE.Vector3(-1, 0, 0), Math.min(1.4, params.fxMinusN * fScale), 0x34d399, 0.036));
      }
      if (params.fyPlusN > 0.5) {
        root.add(createForceArrow3D(new THREE.Vector3(puckX, pMidY, puckZ - 0.36), new THREE.Vector3(0, 0, -1), Math.min(1.4, params.fyPlusN * fScale), ROSE_MAIN, 0.036));
      }
      if (params.fyMinusN > 0.5) {
        root.add(createForceArrow3D(new THREE.Vector3(puckX, pMidY, puckZ + 0.36), new THREE.Vector3(0, 0, 1), Math.min(1.4, params.fyMinusN * fScale), SKY_MAIN, 0.036));
      }

      // Live component velocity indicators floating cleanly above puck
      if (Math.abs(evaluation.vxNow) > 0.1) {
        root.add(
          createForceArrow3D(
            new THREE.Vector3(puckX, pMidY + 0.32, puckZ),
            new THREE.Vector3(Math.sign(evaluation.vxNow), 0, 0),
            Math.max(0.45, Math.min(1.6, Math.abs(evaluation.vxNow) * 0.24)),
            EMERALD_MAIN,
            0.038
          )
        );
      }
      if (Math.abs(evaluation.vyNow) > 0.1) {
        root.add(
          createForceArrow3D(
            new THREE.Vector3(puckX, pMidY + 0.32, puckZ),
            new THREE.Vector3(0, 0, -Math.sign(evaluation.vyNow)),
            Math.max(0.45, Math.min(1.6, Math.abs(evaluation.vyNow) * 0.24)),
            ROSE_MAIN,
            0.038
          )
        );
      }

      // Axis summary badges pinned cleanly along table borders with HUD breathing room
      const xBadge = makeLabelSprite(
        evaluation.isVxConstant
          ? `X BALANCED (ΣF_x=0) ⇒ v_x=${evaluation.vxNow.toFixed(1)} m/s CONST`
          : `X UNBALANCED (ΣF_x=${evaluation.fNetX.toFixed(0)} N) ⇒ a_x=${evaluation.accelX.toFixed(1)} m/s²`,
        '#34d399',
        'rgba(4, 13, 10, 0.94)',
        0.24
      );
      xBadge.position.set(0.0, tableY + 0.28, tableD / 2 + 0.48);
      root.add(xBadge);

      const yBadge = makeLabelSprite(
        evaluation.isVyConstant
          ? `Y BALANCED (ΣF_y=0) ⇒ v_y=${evaluation.vyNow.toFixed(1)} m/s CONST`
          : `Y UNBALANCED (ΣF_y=${evaluation.fNetY >= 0 ? '+' : ''}${evaluation.fNetY.toFixed(0)} N) ⇒ v_y=${evaluation.vyNow.toFixed(1)} m/s`,
        evaluation.isVyConstant ? '#38bdf8' : '#fb7185',
        'rgba(4, 13, 10, 0.94)',
        0.24
      );
      yBadge.position.set(0.0, tableY + 0.28, -tableD / 2 - 0.44);
      root.add(yBadge);
    } else {
      // ---------------------------------------------------------------------
      // MODE 4: INERTIAL VS NON-INERTIAL RAILCAR FRAME LAB (EK 2.4.A.5)
      // ---------------------------------------------------------------------
      const railY = -1.25;
      const carLen = 5.4;
      const carH = 2.45;
      const carD = 1.95;

      // Parallel steel train tracks + wooden/concrete sleepers
      const railMat = new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.24, metalness: 0.85 });
      for (const rz of [-0.82, 0.82]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.09, 0.1), railMat);
        rail.position.set(0, railY, rz);
        root.add(rail);
      }

      // Compute camera-relative shifts:
      // In 'railcar' observer frame: railcar stays centered at X = 0 while sleepers/posts scroll backward!
      // In 'earth' observer frame: sleepers/posts stay fixed while railcar moves rightward (wrapped cleanly)
      const observingCar = params.observerFrame === 'railcar';
      const carWorldShift = observingCar ? 0 : (((evaluation.railcarPosX * 0.28 + 2.2) % 4.4) - 2.2);
      const sleeperScroll = observingCar ? -((evaluation.railcarPosX * 0.45) % 1.2) : 0;

      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82, metalness: 0.15 });
      for (let i = -8; i <= 8; i++) {
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 2.35), sleeperMat);
        sleeper.position.set(i * 1.2 + sleeperScroll, railY - 0.08, 0);
        root.add(sleeper);
      }

      // Distant background trackside distance posts so observer clearly senses car motion
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.35 });
      for (let i = -4; i <= 4; i++) {
        const px = i * 3.0 + (observingCar ? -((evaluation.railcarPosX * 0.45) % 3.0) : 0);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), postMat);
        post.position.set(px, railY + 1.2, -1.85);
        root.add(post);
      }

      // Railcar group
      const carGroup = createCutawayRailcar(carLen, carH, carD);
      carGroup.position.set(carWorldShift, railY + 0.05, 0);
      root.add(carGroup);

      // Frictionless puck inside railcar:
      // Moves relative to railcar floor by puckCarX = -0.5 * a_car * t^2 (clamped inside car walls)
      const localPuckX = Math.max(-carLen * 0.38, Math.min(carLen * 0.38, evaluation.puckCarX * 0.42));
      const puckWorldX = carWorldShift + localPuckX;
      const floorTopY = railY + 0.6;
      const puck = createAirTablePuck(0.32, 0.2);
      puck.position.set(puckWorldX, floorTopY, 0.15);
      root.add(puck);

      // Vertical balanced forces on puck (F_N up, F_g down — ZERO real horizontal force!)
      root.add(createForceArrow3D(new THREE.Vector3(puckWorldX, floorTopY + 0.25, 0.22), new THREE.Vector3(0, 1, 0), 0.72, SKY_MAIN, 0.036));
      root.add(createForceArrow3D(new THREE.Vector3(puckWorldX, floorTopY + 0.1, 0.22), new THREE.Vector3(0, -1, 0), 0.72, AMBER_GOLD, 0.036));

      // Hanging Plumb-Bob Pendulum attached to railcar ceiling center
      const pivotX = carWorldShift + 1.25;
      const pivotY = railY + 0.47 + carH - 0.08;
      const stringLen = 1.38;
      const tiltRad = (evaluation.plumbTiltDeg * Math.PI) / 180;
      const bobX = pivotX - Math.sin(tiltRad) * stringLen;
      const bobY = pivotY - Math.cos(tiltRad) * stringLen;

      // Dashed vertical reference line from pivot
      const refPts = [new THREE.Vector3(pivotX, pivotY, 0), new THREE.Vector3(pivotX, pivotY - stringLen - 0.15, 0)];
      const refLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(refPts),
        new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.09, gapSize: 0.07 })
      );
      refLine.computeLineDistances();
      root.add(refLine);

      // Plumb string
      const strDiff = new THREE.Vector3(bobX - pivotX, bobY - pivotY, 0);
      const strMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, stringLen, 10),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
      );
      strMesh.position.set((pivotX + bobX) / 2, (pivotY + bobY) / 2, 0);
      strMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strDiff.clone().normalize());
      root.add(strMesh);

      // Brass plumb-bob sphere
      const bob = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 16),
        new THREE.MeshStandardMaterial({
          color: evaluation.isFrameInertial ? EMERALD_MAIN : ROSE_MAIN,
          emissive: evaluation.isFrameInertial ? EMERALD_MAIN : ROSE_MAIN,
          emissiveIntensity: 0.28,
          roughness: 0.25,
          metalness: 0.78,
        })
      );
      bob.position.set(bobX, bobY, 0);
      root.add(bob);

      // Car acceleration arrow above roof when a_car != 0
      if (Math.abs(params.railcarAccelMs2) > 0.05) {
        const aDir = Math.sign(params.railcarAccelMs2);
        const aLen = Math.max(0.65, Math.min(2.0, Math.abs(params.railcarAccelMs2) * 0.34));
        root.add(
          createForceArrow3D(
            new THREE.Vector3(carWorldShift, railY + carH + 0.85, 0),
            new THREE.Vector3(aDir, 0, 0),
            aLen,
            ROSE_MAIN,
            0.05
          )
        );
      }

      // Crisp 3D annotations
      const frameTitle = makeLabelSprite(
        observingCar
          ? evaluation.isFrameInertial
            ? 'RAILCAR FRAME: INERTIAL (a_car = 0, 1st Law VERIFIED)'
            : `RAILCAR FRAME: NON-INERTIAL (a_puck/car = ${evaluation.puckCarAx.toFixed(1)} m/s² with ΣF_x = 0!)`
          : `EARTH FRAME (INERTIAL): Car a = ${params.railcarAccelMs2 >= 0 ? '+' : ''}${params.railcarAccelMs2.toFixed(1)} m/s² · Puck v = ${params.railcarV0Ms.toFixed(1)} m/s CONST`,
        !observingCar || evaluation.isFrameInertial ? '#34d399' : '#fb7185',
        !observingCar || evaluation.isFrameInertial ? 'rgba(4,24,16,0.95)' : 'rgba(30,8,16,0.95)',
        0.27
      );
      frameTitle.position.set(0, railY + carH + 1.38, 0.1);
      root.add(frameTitle);

      const puckLbl = makeLabelSprite(
        'Puck: ΣF_real,x = 0 N',
        '#38bdf8',
        'rgba(4,13,10,0.92)',
        0.24
      );
      puckLbl.position.set(puckWorldX, floorTopY + 1.15, 0.3);
      root.add(puckLbl);

      const bobLbl = makeLabelSprite(
        `Plumb θ = ${evaluation.plumbTiltDeg.toFixed(1)}°`,
        evaluation.isFrameInertial ? '#34d399' : '#fbbf24',
        'rgba(4,13,10,0.92)',
        0.24
      );
      bobLbl.position.set(bobX + 0.72, bobY - 0.35, 0.25);
      root.add(bobLbl);
    }

    requestRenderRef.current?.();
  }, [params, evaluation]);

  return (
    <div
      ref={mountRef}
      data-testid="newton24-viewport"
      className="w-full h-full relative"
    />
  );
};
