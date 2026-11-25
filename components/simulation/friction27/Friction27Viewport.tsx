'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BlockOrientation,
  FRICTION_MATERIALS,
  Friction27Evaluation,
  Friction27Mode,
  Friction27Params,
  FrictionMaterialSpec,
} from '@/lib/physics/friction-2-7';

export interface Friction27ViewportProps {
  params: Friction27Params;
  evaluation: Friction27Evaluation;
  viewMode: '3d' | '2d';
}

const EMERALD_MAIN = 0x10b981;
const SKY_MAIN = 0x38bdf8;
const AMBER_GOLD = 0xf59e0b;
const ROSE_MAIN = 0xf43f5e;
const VIOLET_MAIN = 0xa855f7;
const CHROME_METAL = 0xcbd5e1;

// ---------------------------------------------------------------------------
// Procedural Canvas Textures & Crisp 3D Label Sprites (Zero External 404s)
// ---------------------------------------------------------------------------

function makeSurfaceTexture(mat: FrictionMaterialSpec, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const base = new THREE.Color(mat.trackColorHex);
  const acc = new THREE.Color(mat.trackAccentHex);

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  if (mat.id === 'wood_wood') {
    for (let y = 0; y < 256; y += 6) {
      ctx.strokeStyle = y % 12 === 0 ? `#${acc.getHexString()}` : 'rgba(255,220,180,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) {
        ctx.lineTo(x, y + Math.sin((x + y) * 0.05) * 2.5);
      }
      ctx.stroke();
    }
  } else if (mat.id === 'rubber_asphalt') {
    for (let i = 0; i < 650; i++) {
      const x = (i * 73) % 256;
      const y = (i * 139) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(226,232,240,0.15)' : 'rgba(15,23,42,0.45)';
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  } else if (mat.id === 'steel_steel') {
    for (let y = 0; y < 256; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(226,232,240,0.12)' : 'rgba(15,23,42,0.12)';
      ctx.fillRect(0, y, 256, 1.5);
    }
  } else if (mat.id === 'teflon_steel') {
    ctx.strokeStyle = 'rgba(226,232,240,0.2)';
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
  } else {
    // waxed_snow
    for (let i = 0; i < 400; i++) {
      const x = (i * 97) % 256;
      const y = (i * 53) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(186,230,253,0.22)';
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle metric ruler ticks along edges
  ctx.fillStyle = 'rgba(226,232,240,0.45)';
  for (let x = 0; x < 256; x += 32) {
    ctx.fillRect(x, 0, 2, 10);
    ctx.fillRect(x, 246, 2, 10);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAniso;
  return tex;
}

function makeLabelSprite(
  text: string,
  color = '#ecfdf5',
  bg = 'rgba(4,14,11,0.94)',
  worldHeight = 0.22
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
  const safeLen = Math.max(0.2, length);
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
 * Composite 6-part procedural laboratory friction block (bottom-center grounded at y = 0).
 * Switches physically between 'wide' (flat 1.5 x 0.55 x 0.9) and 'narrow' (upright 0.55 x 1.35 x 0.85)
 * so students literally see the 3x area change while friction remains identical (2.7.A.1.ii).
 */
function buildCompositeFrictionBlock(
  massKg: number,
  orientation: BlockOrientation,
  blockColorHex: number,
  accentHex = AMBER_GOLD
): { group: THREE.Group; width: number; height: number; depth: number } {
  const group = new THREE.Group();
  const isWide = orientation === 'wide';
  const w = isWide ? 1.48 : 0.56;
  const h = isWide ? 0.58 : 1.24;
  const d = isWide ? 0.92 : 0.84;

  // 1. Contact Friction Pad (high-roughness bottom shoe seated flush at y = 0)
  const padH = 0.07;
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.98, padH, d * 0.98),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.05 })
  );
  pad.position.y = padH / 2;
  pad.castShadow = true;
  group.add(pad);

  // 2. Primary Body Core (matte wood / polymer / metal)
  const bodyH = h - padH;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, bodyH, d),
    new THREE.MeshStandardMaterial({ color: blockColorHex, roughness: 0.62, metalness: 0.18 })
  );
  body.position.y = padH + bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 3. Machined Aluminum Corner Rail Trim (contrasting low roughness)
  const trimMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.24,
    metalness: 0.84,
  });
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.045, d + 0.03), trimMat);
  topTrim.position.y = h - 0.025;
  group.add(topTrim);

  // 4. Stacked Brass Slotted Weight Discs on top (visual mass indicator)
  const plateCount = Math.max(1, Math.min(4, Math.round(massKg / 3)));
  const plateMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.28,
    metalness: 0.82,
  });
  const plateR = Math.min(w * 0.34, d * 0.34);
  for (let i = 0; i < plateCount; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(plateR, plateR, 0.075, 20), plateMat);
    disc.position.y = h + 0.038 + i * 0.082;
    group.add(disc);
  }

  // 5. Center Brass Lifting Knob
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 14), trimMat);
  knob.position.y = h + plateCount * 0.082 + 0.05;
  group.add(knob);

  // 6. Front Pull Eyelet Hook on +X face
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 10, 20), trimMat);
  hook.position.set(w / 2 + 0.06, h * 0.48, 0);
  group.add(hook);

  return { group, width: w, height: h + plateCount * 0.082, depth: d };
}

/**
 * Composite 4-part Spring Scale / Force Dynamometer attached to the pull eyelet at angle φ
 */
function buildSpringScaleRig(forceN: number, maxRefN: number): THREE.Group {
  const g = new THREE.Group();
  const bodyLen = 1.05;
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: CHROME_METAL,
    roughness: 0.2,
    metalness: 0.88,
  });

  // Pull rod connecting block hook to scale barrel
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10), chromeMat);
  rod.rotation.z = Math.PI / 2;
  rod.position.x = 0.21;
  g.add(rod);

  // Scale housing barrel
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, 0.26, 0.24), housingMat);
  barrel.position.x = 0.42 + bodyLen / 2;
  g.add(barrel);

  // Illuminated tension bar inside barrel proportional to F_app
  const fillFrac = Math.max(0.06, Math.min(1.0, forceN / Math.max(15, maxRefN * 1.4)));
  const gaugeBar = new THREE.Mesh(
    new THREE.BoxGeometry(bodyLen * 0.84 * fillFrac, 0.1, 0.26),
    new THREE.MeshBasicMaterial({ color: SKY_MAIN })
  );
  gaugeBar.position.x = 0.42 + 0.08 + (bodyLen * 0.84 * fillFrac) / 2;
  g.add(gaugeBar);

  // Pull handle ring at right end
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 10, 20), chromeMat);
  handle.position.x = 0.42 + bodyLen + 0.11;
  g.add(handle);

  return g;
}

/**
 * Composite Bench Track with steel frame, textured surface strip, and end-stops (top surface at y = 0)
 */
function buildFrictionTrackBench(
  length: number,
  depth: number,
  matSpec: FrictionMaterialSpec,
  maxAniso: number
): THREE.Group {
  const g = new THREE.Group();
  const tex = makeSurfaceTexture(matSpec, maxAniso);

  // Top friction deck (top face flush at y = 0)
  const deckH = 0.14;
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(length, deckH, depth),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex,
      roughness: matSpec.id === 'teflon_steel' ? 0.25 : 0.72,
      metalness: matSpec.id === 'steel_steel' ? 0.65 : 0.12,
    })
  );
  deck.position.y = -deckH / 2;
  deck.receiveShadow = true;
  g.add(deck);

  // Structural aluminum chassis beam below deck
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.48,
    metalness: 0.65,
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(length + 0.16, 0.22, depth + 0.1), chassisMat);
  beam.position.y = -deckH - 0.11;
  g.add(beam);

  // Support legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.75 });
  for (const lx of [-length * 0.42, length * 0.42]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, depth * 0.82), legMat);
    leg.position.set(lx, -deckH - 0.58, 0);
    g.add(leg);
  }

  // Right rubber bumper stop
  const stop = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.24, depth * 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.15 })
  );
  stop.position.set(length / 2 - 0.06, 0.12, 0);
  g.add(stop);

  return g;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material;
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

export const Friction27Viewport: React.FC<Friction27ViewportProps> = ({
  params,
  evaluation,
  viewMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({ params, evaluation, viewMode });

  const rebuildSceneRef = useRef<(() => void) | null>(null);
  const applyCameraPresetRef = useRef<((mode: Friction27Mode, vMode: '3d' | '2d') => void) | null>(
    null
  );

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
    scene.fog = new THREE.FogExp2(0x040d0a, 0.017);

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

    // Studio Environment Reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    // Warm Key + Cool Fill + Rim Lighting
    const hemiLight = new THREE.HemisphereLight(0xbbe8ff, 0x0b1f1a, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.85);
    keyLight.position.set(7, 11, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    rimLight.position.set(-8, 5, -6);
    scene.add(rimLight);

    // Subtle dark laboratory floor grid
    const grid = new THREE.GridHelper(32, 32, 0x10b981, 0x0c241d);
    grid.position.y = -2.25;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.25;
    });
    scene.add(grid);

    // Cameras
    const perspCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    const aspect = width / height;
    const orthoHalfH = 4.6;
    const orthoCamera = new THREE.OrthographicCamera(
      -orthoHalfH * aspect,
      orthoHalfH * aspect,
      orthoHalfH,
      -orthoHalfH,
      0.1,
      140
    );

    let activeCamera: THREE.Camera =
      stateRef.current.viewMode === '2d' ? orthoCamera : perspCamera;

    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.5;
    controls.maxDistance = 26;

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    // Coalesced on-demand renderer with SwiftShader-safe clientWaitSync pacing
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
            frameId = window.setTimeout(cb, 28);
          }
        };
        frameId = window.setTimeout(poll, 8);
      } else {
        frameId = window.setTimeout(cb, 32);
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

    const applyCameraPreset = (mode: Friction27Mode, vMode: '3d' | '2d') => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const asp = w / Math.max(1, h);

      const target = new THREE.Vector3(0, 0.2, 0);
      const pos3d = new THREE.Vector3(0.4, 2.5, 11.4);
      let orthoH = 4.6;

      if (mode === 'horizontal_pull') {
        target.set(0.0, 0.2, 0);
        pos3d.set(0.25, 2.45, 12.8);
        orthoH = 5.0;
      } else if (mode === 'incline_ramp') {
        target.set(0.0, 0.3, 0);
        pos3d.set(0.2, 2.05, 13.0);
        orthoH = 5.1;
      } else if (mode === 'stacked_blocks') {
        target.set(0.0, 0.25, 0);
        pos3d.set(0.2, 2.3, 13.0);
        orthoH = 5.0;
      } else {
        // area_surface_compare: elevated perspective clearly separating both parallel lanes
        target.set(0.0, 0.05, 0);
        pos3d.set(0.15, 5.4, 14.2);
        orthoH = 5.4;
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
      const matSpec = FRICTION_MATERIALS[p.materialId];

      // =====================================================================
      // MODE 1: HORIZONTAL / ANGLED PULL & BREAKAWAY (2.7.A & 2.7.B)
      // =====================================================================
      if (p.mode === 'horizontal_pull') {
        const h = ev.horizontal;
        const trackLen = 7.2;
        const bench = buildFrictionTrackBench(trackLen, 1.65, matSpec, maxAniso);
        bench.position.set(0, -0.7, 0);
        dynamicGroup.add(bench);

        // Animated block X position along bench (kept comfortably inside viewport safe zone)
        const slideOffset = Math.min(2.35, h.displacementM * 0.35);
        const blockX = -1.85 + slideOffset;
        const liftY = h.isLiftedOff ? 0.35 : 0;

        const blockBuilt = buildCompositeFrictionBlock(
          p.massKg,
          p.orientation,
          matSpec.blockColorHex
        );
        blockBuilt.group.position.set(blockX, -0.7 + liftY, 0);
        dynamicGroup.add(blockBuilt.group);

        // Attached Spring-Scale Dynamometer angled at pullAngleDeg
        const phiRad = (p.pullAngleDeg * Math.PI) / 180;
        const appDir = new THREE.Vector3(Math.cos(phiRad), Math.sin(phiRad), 0);
        const hookOrigin = new THREE.Vector3(
          blockX + blockBuilt.width / 2 + 0.06,
          -0.7 + liftY + (p.orientation === 'wide' ? 0.28 : 0.6),
          0
        );
        const scaleRig = buildSpringScaleRig(h.effectiveAppliedForceN, h.maxStaticFrictionN);
        scaleRig.position.copy(hookOrigin);
        scaleRig.rotation.z = phiRad;
        dynamicGroup.add(scaleRig);

        // Force Vector Scaling
        const fScale = 1.65 / Math.max(25, h.weightN);
        const blockCenter = new THREE.Vector3(blockX, -0.7 + liftY + blockBuilt.height * 0.48, 0.35);

        // 1. Applied Force F_app (Sky Blue extending cleanly from spring-scale handle ring)
        if (h.effectiveAppliedForceN > 0.4) {
          const appLen = Math.max(0.45, Math.min(1.65, h.effectiveAppliedForceN * fScale * 0.85));
          const scaleHandleOrigin = hookOrigin.clone().addScaledVector(appDir, 1.64);
          dynamicGroup.add(createVectorArrow3D(scaleHandleOrigin, appDir, appLen, SKY_MAIN, 0.048));
          const appMid = hookOrigin.clone().addScaledVector(appDir, 1.25 + appLen * 0.35);
          const appLbl = makeLabelSprite(
            `F_app = ${h.effectiveAppliedForceN.toFixed(1)} N (${p.pullAngleDeg >= 0 ? '+' : ''}${p.pullAngleDeg}°)`,
            '#7dd3fc',
            'rgba(6,18,30,0.95)',
            0.2
          );
          appLbl.position.set(Math.min(2.15, appMid.x), Math.max(-0.05, appMid.y + 0.42), 0.32);
          dynamicGroup.add(appLbl);
        }

        // 2. Normal Force F_N (Emerald upward)
        if (h.normalForceN > 0.2) {
          const fnLen = Math.max(0.4, Math.min(2.0, h.normalForceN * fScale));
          const fnStart = new THREE.Vector3(blockX, -0.7 + liftY + blockBuilt.height + 0.05, 0.1);
          dynamicGroup.add(createVectorArrow3D(fnStart, new THREE.Vector3(0, 1, 0), fnLen, EMERALD_MAIN, 0.048));
          const fnLbl = makeLabelSprite(
            `F_N = ${h.normalForceN.toFixed(1)} N`,
            '#6ee7b7',
            'rgba(4,18,12,0.95)',
            0.2
          );
          fnLbl.position.set(blockX, fnStart.y + fnLen + 0.28, 0.25);
          dynamicGroup.add(fnLbl);
        }

        // 3. Gravitational Weight F_g (Amber downward)
        const fgLen = Math.max(0.45, Math.min(1.9, h.weightN * fScale));
        const fgStart = new THREE.Vector3(blockX, -0.7 + liftY, 0.2);
        dynamicGroup.add(createVectorArrow3D(fgStart, new THREE.Vector3(0, -1, 0), fgLen, AMBER_GOLD, 0.048));
        const fgLbl = makeLabelSprite(
          `F_g = ${h.weightN.toFixed(1)} N`,
          '#fcd34d',
          'rgba(22,15,4,0.95)',
          0.2
        );
        fgLbl.position.set(blockX - 0.1, fgStart.y - fgLen - 0.25, 0.25);
        dynamicGroup.add(fgLbl);

        // 4. Friction Force F_f,s or F_f,k (Rose for static, Violet for kinetic)
        if (h.actualFrictionN > 0.2) {
          const ffLen = Math.max(0.4, Math.min(2.0, h.actualFrictionN * fScale));
          const ffOrigin = new THREE.Vector3(blockX - blockBuilt.width / 2, -0.63 + liftY, 0.25);
          const isKin = h.regime === 'kinetic';
          const ffColor = isKin ? VIOLET_MAIN : ROSE_MAIN;
          dynamicGroup.add(createVectorArrow3D(ffOrigin, new THREE.Vector3(-1, 0, 0), ffLen, ffColor, 0.05));
          const ffLbl = makeLabelSprite(
            `${isKin ? 'F_f,k' : 'F_f,s'} = ${h.actualFrictionN.toFixed(1)} N`,
            isKin ? '#d8b4fe' : '#fda4af',
            'rgba(26,7,18,0.95)',
            0.2
          );
          ffLbl.position.set(Math.max(-2.75, ffOrigin.x - ffLen * 0.65), ffOrigin.y + 0.52, 0.3);
          dynamicGroup.add(ffLbl);
        }

        // 5. Acceleration Vector when sliding (centered above arrow shaft to prevent right-dock clipping)
        if (h.accelMs2 > 0.05) {
          const aLen = Math.max(0.48, Math.min(1.45, h.accelMs2 * 0.22));
          const aStart = new THREE.Vector3(blockX + 0.35, blockCenter.y + 0.85, 0.25);
          dynamicGroup.add(createVectorArrow3D(aStart, new THREE.Vector3(1, 0, 0), aLen, 0xfb7185, 0.036));
          const aLbl = makeLabelSprite(
            `a = ${h.accelMs2.toFixed(2)} m/s²`,
            '#fda4af',
            'rgba(28,8,14,0.94)',
            0.19
          );
          aLbl.position.set(Math.min(1.9, aStart.x + aLen * 0.55), aStart.y + 0.34, 0.25);
          dynamicGroup.add(aLbl);
        }

        // Bottom contact-area & pressure comparison banner
        const areaInfo = makeLabelSprite(
          `${matSpec.shortName} · ${p.orientation === 'wide' ? 'Wide Face (A)' : 'Narrow Edge (A/3)'} · P = ${(h.contactPressurePa / 1000).toFixed(2)} kPa`,
          '#e2e8f0',
          'rgba(8,18,22,0.94)',
          0.19
        );
        areaInfo.position.set(0.35, -1.85, 0.25);
        dynamicGroup.add(areaInfo);
      }

      // =====================================================================
      // MODE 2: INCLINED PLANE CRITICAL ANGLE & UPHILL REVERSAL
      // =====================================================================
      else if (p.mode === 'incline_ramp') {
        const inc = ev.incline;
        const thetaRad = (p.inclineAngleDeg * Math.PI) / 180;
        const critRad = (Math.min(60, inc.criticalAngleDeg) * Math.PI) / 180;

        // Hinge pivot at left-bottom (-2.55, -1.45, 0)
        const hinge = new THREE.Vector3(-2.55, -1.45, 0);
        const rampLen = 5.4;

        // Horizontal base rail on ground
        const baseRail = new THREE.Mesh(
          new THREE.BoxGeometry(5.8, 0.16, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.7 })
        );
        baseRail.position.set(hinge.x + 2.75, hinge.y - 0.08, 0);
        dynamicGroup.add(baseRail);

        // Hinge barrel pin
        const hingePin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 1.56, 18),
          new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.25, metalness: 0.85 })
        );
        hingePin.rotation.x = Math.PI / 2;
        hingePin.position.copy(hinge);
        dynamicGroup.add(hingePin);

        // Protractor Arc showing current angle θ and critical angle θ_c = arctan(μ_s)
        const arcR = 1.65;
        if (thetaRad > 0.02) {
          const arcGeo = new THREE.RingGeometry(arcR - 0.06, arcR, 32, 1, 0, thetaRad);
          const arcMesh = new THREE.Mesh(
            arcGeo,
            new THREE.MeshBasicMaterial({
              color: inc.isAboveCritical ? ROSE_MAIN : EMERALD_MAIN,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
            })
          );
          arcMesh.position.set(hinge.x, hinge.y, 0.72);
          dynamicGroup.add(arcMesh);
        }

        // Critical angle dashed indicator ray at θ_c
        const critDir = new THREE.Vector3(Math.cos(critRad), Math.sin(critRad), 0);
        const critLinePts = [
          new THREE.Vector3(hinge.x, hinge.y, 0.74),
          new THREE.Vector3(
            hinge.x + critDir.x * 2.35,
            hinge.y + critDir.y * 2.35,
            0.74
          ),
        ];
        const critLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(critLinePts),
          new THREE.LineDashedMaterial({ color: AMBER_GOLD, dashSize: 0.14, gapSize: 0.09 })
        );
        critLine.computeLineDistances();
        dynamicGroup.add(critLine);

        const critLbl = makeLabelSprite(
          `θ_c = arctan(μ_s) = ${inc.criticalAngleDeg.toFixed(1)}°`,
          '#fcd34d',
          'rgba(22,15,4,0.94)',
          0.19
        );
        critLbl.position.set(hinge.x + 4.35, hinge.y - 0.55, 0.35);
        dynamicGroup.add(critLbl);

        // Telescoping support strut under ramp
        const strutAnchorX = hinge.x + 3.9 * Math.cos(thetaRad);
        const strutTopY = hinge.y + 3.9 * Math.sin(thetaRad);
        const strutH = Math.max(0.15, strutTopY - hinge.y);
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.095, strutH, 14),
          new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.3, metalness: 0.82 })
        );
        strut.position.set(strutAnchorX, hinge.y + strutH / 2, 0);
        dynamicGroup.add(strut);

        // Tilted Ramp Deck Group pivoted at hinge
        const rampGroup = new THREE.Group();
        rampGroup.position.copy(hinge);
        rampGroup.rotation.z = thetaRad;

        const tex = makeSurfaceTexture(matSpec, maxAniso);
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(rampLen, 0.14, 1.38),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: tex,
            roughness: 0.68,
            metalness: 0.15,
          })
        );
        deck.position.set(rampLen / 2, -0.07, 0);
        deck.receiveShadow = true;
        rampGroup.add(deck);

        // Block sliding along ramp coordinate s (centered around s = 2.75)
        const sPos = Math.max(0.85, Math.min(rampLen - 0.85, 2.75 + inc.displacementM * 0.42));
        const blk = buildCompositeFrictionBlock(p.inclineMassKg, 'wide', matSpec.blockColorHex);
        blk.group.position.set(sPos, 0, 0);
        rampGroup.add(blk.group);
        dynamicGroup.add(rampGroup);

        // World coordinates of block center for crisp world-space FBD arrows
        const cosT = Math.cos(thetaRad);
        const sinT = Math.sin(thetaRad);
        const alongUp = new THREE.Vector3(cosT, sinT, 0);
        const perpOut = new THREE.Vector3(-sinT, cosT, 0);
        const blkWorldBase = new THREE.Vector3(
          hinge.x + sPos * cosT,
          hinge.y + sPos * sinT,
          0.2
        );
        const blkWorldCenter = blkWorldBase.clone().addScaledVector(perpOut, 0.35);

        const fScale = 1.6 / Math.max(25, inc.weightN);

        // 1. Normal Force F_N (perpendicular away from ramp, Emerald)
        const fnLen = Math.max(0.42, inc.normalForceN * fScale);
        dynamicGroup.add(createVectorArrow3D(blkWorldCenter, perpOut, fnLen, EMERALD_MAIN, 0.046));
        const fnLbl = makeLabelSprite(
          `F_N = ${inc.normalForceN.toFixed(1)} N`,
          '#6ee7b7',
          'rgba(4,18,12,0.95)',
          0.2
        );
        fnLbl.position.copy(blkWorldCenter).addScaledVector(perpOut, fnLen + 0.35);
        dynamicGroup.add(fnLbl);

        // 2. Friction Force F_f along ramp (+ uphill, - downhill)
        if (Math.abs(inc.signedFrictionN) > 0.2) {
          const fDir = inc.signedFrictionN >= 0 ? alongUp : alongUp.clone().negate();
          const ffLen = Math.max(0.45, Math.abs(inc.signedFrictionN) * fScale);
          const isKin = inc.regime === 'kinetic_uphill' || inc.regime === 'kinetic_downhill';
          const ffCol = isKin ? VIOLET_MAIN : ROSE_MAIN;
          dynamicGroup.add(createVectorArrow3D(blkWorldBase, fDir, ffLen, ffCol, 0.048));
          const ffLbl = makeLabelSprite(
            `${isKin ? 'F_f,k' : 'F_f,s'} = ${Math.abs(inc.signedFrictionN).toFixed(1)} N`,
            isKin ? '#d8b4fe' : '#fda4af',
            'rgba(24,7,18,0.95)',
            0.2
          );
          ffLbl.position
            .copy(blkWorldBase)
            .addScaledVector(fDir, ffLen + 0.55)
            .addScaledVector(perpOut, 0.78);
          dynamicGroup.add(ffLbl);
        }

        // 3. Downhill Weight Component mg sinθ (Sky dashed/solid arrow) & Full Weight mg (Amber straight down)
        const fgLen = Math.max(0.5, inc.weightN * fScale);
        dynamicGroup.add(
          createVectorArrow3D(blkWorldCenter, new THREE.Vector3(0, -1, 0), fgLen, AMBER_GOLD, 0.046)
        );
        const fgLbl = makeLabelSprite(
          `mg = ${inc.weightN.toFixed(1)} N`,
          '#fcd34d',
          'rgba(22,15,4,0.95)',
          0.19
        );
        fgLbl.position.set(blkWorldCenter.x + 0.72, blkWorldCenter.y - fgLen * 0.78, 0.25);
        dynamicGroup.add(fgLbl);

        if (inc.fgParallelN > 0.3) {
          const parLen = Math.max(0.35, inc.fgParallelN * fScale);
          dynamicGroup.add(
            createVectorArrow3D(blkWorldCenter, alongUp.clone().negate(), parLen, SKY_MAIN, 0.036)
          );
        }

        // Current angle badge
        const angLbl = makeLabelSprite(
          `θ = ${p.inclineAngleDeg.toFixed(0)}° (${inc.isAboveCritical ? 'SLIPS > θ_c' : 'HOLDS ≤ θ_c'})`,
          inc.isAboveCritical ? '#fda4af' : '#6ee7b7',
          'rgba(6,16,14,0.95)',
          0.2
        );
        angLbl.position.set(hinge.x + 0.55, hinge.y - 0.55, 0.3);
        dynamicGroup.add(angLbl);
      }

      // =====================================================================
      // MODE 3: TWO-BLOCK STACK (RELATIVE MOTION & NEWTON'S 3RD LAW)
      // =====================================================================
      else if (p.mode === 'stacked_blocks') {
        const st = ev.stacked;
        const floorMatSpec =
          p.floorMuK > 0.01 ? FRICTION_MATERIALS.steel_steel : FRICTION_MATERIALS.teflon_steel;
        const bench = buildFrictionTrackBench(7.4, 1.7, floorMatSpec, maxAniso);
        bench.position.set(0, -0.85, 0);
        dynamicGroup.add(bench);

        // Animated displacements clamped neatly inside track width
        const botShift = Math.min(1.9, st.bottomDisplacementM * 0.3);
        const relShift = Math.max(-0.85, st.topRelativeOffsetM * 0.3);
        const botX = -1.35 + botShift;
        const topX = botX + relShift;

        // Lower Sled (m1) — wide low-profile composite aluminum/slate sled
        const sledH = 0.52;
        const sledW = 2.45;
        const sledGroup = new THREE.Group();
        const sledBody = new THREE.Mesh(
          new THREE.BoxGeometry(sledW, sledH, 1.12),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.68 })
        );
        sledBody.position.y = sledH / 2;
        sledBody.castShadow = true;
        sledGroup.add(sledBody);

        // High-friction textured grip strip on top of sled
        const gripStrip = new THREE.Mesh(
          new THREE.BoxGeometry(sledW - 0.12, 0.05, 1.02),
          new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.85, metalness: 0.1 })
        );
        gripStrip.position.y = sledH + 0.025;
        sledGroup.add(gripStrip);

        // Front pull eyelet on sled
        const sledHook = new THREE.Mesh(
          new THREE.TorusGeometry(0.09, 0.025, 10, 18),
          new THREE.MeshStandardMaterial({ color: CHROME_METAL, roughness: 0.2, metalness: 0.88 })
        );
        sledHook.position.set(sledW / 2 + 0.07, sledH / 2, 0);
        sledGroup.add(sledHook);

        sledGroup.position.set(botX, -0.85, 0);
        dynamicGroup.add(sledGroup);

        // Upper Block (m2) seated on sled grip strip
        const topBlk = buildCompositeFrictionBlock(p.topMassKg, 'wide', matSpec.blockColorHex);
        topBlk.group.scale.setScalar(0.74);
        topBlk.group.position.set(topX, -0.85 + sledH + 0.05, 0);
        dynamicGroup.add(topBlk.group);

        const fScale = 1.65 / Math.max(30, st.slipThresholdPullN);

        // 1. Pull force F_pull on Bottom Sled (Sky Blue -> right)
        if (p.stackPullForceN > 0.5) {
          const pullLen = Math.max(0.45, Math.min(1.9, p.stackPullForceN * fScale));
          const pullOrigin = new THREE.Vector3(botX + sledW / 2 + 0.1, -0.85 + sledH / 2, 0.25);
          dynamicGroup.add(
            createVectorArrow3D(pullOrigin, new THREE.Vector3(1, 0, 0), pullLen, SKY_MAIN, 0.05)
          );
          const pullLbl = makeLabelSprite(
            `F_pull = ${p.stackPullForceN.toFixed(0)} N`,
            '#7dd3fc',
            'rgba(6,18,30,0.95)',
            0.2
          );
          pullLbl.position.set(Math.min(2.35, pullOrigin.x + pullLen * 0.65), pullOrigin.y + 0.44, 0.3);
          dynamicGroup.add(pullLbl);
        }

        // 2. Interface Action-Reaction Friction Pair (2.7.A.1.i & 2.7.B.2)
        if (st.frictionOnTopN > 0.2) {
          const ffLen = Math.max(0.48, Math.min(1.85, st.frictionOnTopN * fScale * 1.6));
          const isSlip = st.isSlipping;

          // FORWARD friction on TOP block (Emerald = static forward push, Violet = kinetic forward push)
          const topArrowOrig = new THREE.Vector3(topX, -0.85 + sledH + 0.22, 0.48);
          dynamicGroup.add(
            createVectorArrow3D(
              topArrowOrig,
              new THREE.Vector3(1, 0, 0),
              ffLen,
              isSlip ? VIOLET_MAIN : EMERALD_MAIN,
              0.048
            )
          );
          const topFfLbl = makeLabelSprite(
            `On Top m₂: +${st.frictionOnTopN.toFixed(1)} N (${isSlip ? 'Kinetic →' : 'Static →'})`,
            isSlip ? '#d8b4fe' : '#6ee7b7',
            'rgba(4,18,14,0.95)',
            0.2
          );
          topFfLbl.position.set(topX + 0.55, -0.85 + sledH + 1.15, 0.35);
          dynamicGroup.add(topFfLbl);

          // BACKWARD reaction friction on BOTTOM sled (Rose -> left, Newton's 3rd Law pair!)
          const botArrowOrig = new THREE.Vector3(topX, -0.85 + sledH - 0.08, 0.56);
          dynamicGroup.add(
            createVectorArrow3D(botArrowOrig, new THREE.Vector3(-1, 0, 0), ffLen, ROSE_MAIN, 0.044)
          );
          const botFfLbl = makeLabelSprite(
            `On Sled m₁: -${st.frictionOnTopN.toFixed(1)} N (3rd Law ←)`,
            '#fda4af',
            'rgba(28,8,14,0.95)',
            0.19
          );
          botFfLbl.position.set(Math.max(-2.15, topX - 0.85), -0.85 + sledH - 0.62, 0.35);
          dynamicGroup.add(botFfLbl);
        }

        // Mass & acceleration summary sprite
        const stackSummary = makeLabelSprite(
          `m₁=${p.bottomMassKg}kg (a₁=${st.accelBottomMs2.toFixed(2)}) · m₂=${p.topMassKg}kg (a₂=${st.accelTopMs2.toFixed(2)}) · F_slip=${st.slipThresholdPullN.toFixed(1)}N`,
          '#fcd34d',
          'rgba(20,14,4,0.95)',
          0.19
        );
        stackSummary.position.set(0, -1.9, 0.3);
        dynamicGroup.add(stackSummary);
      }

      // =====================================================================
      // MODE 4: SIDE-BY-SIDE AREA INDEPENDENCE & MATERIAL COMPARISON LAB
      // =====================================================================
      else {
        const cmp = ev.compare;
        const laneLen = 6.6;
        const zA = -1.75;
        const zB = 1.65;

        // Lane A (Back/Upper lane): Wide Face (Area A)
        const benchA = buildFrictionTrackBench(laneLen, 1.35, cmp.laneA.material, maxAniso);
        benchA.position.set(0, -0.35, zA);
        dynamicGroup.add(benchA);

        const xA = -1.95 + Math.min(2.8, cmp.laneA.displacementM * 0.36);
        const blkA = buildCompositeFrictionBlock(
          p.compareMassKg,
          'wide',
          cmp.laneA.material.blockColorHex,
          EMERALD_MAIN
        );
        blkA.group.scale.setScalar(0.86);
        blkA.group.position.set(xA, -0.35, zA);
        dynamicGroup.add(blkA.group);

        const lblA = makeLabelSprite(
          `Lane A · Wide Face (A) · ${cmp.laneA.material.shortName} · F_f=${cmp.laneA.actualFrictionN.toFixed(1)}N`,
          '#6ee7b7',
          'rgba(4,18,12,0.95)',
          0.2
        );
        lblA.position.set(0.1, 1.25, zA);
        dynamicGroup.add(lblA);

        // Lane B (Front/Lower lane): Narrow Edge (Area A/3, 3× Pressure!)
        const benchB = buildFrictionTrackBench(laneLen, 1.35, cmp.laneB.material, maxAniso);
        benchB.position.set(0, -0.55, zB);
        dynamicGroup.add(benchB);

        const xB = -1.95 + Math.min(2.8, cmp.laneB.displacementM * 0.36);
        const blkB = buildCompositeFrictionBlock(
          p.compareMassKg,
          'narrow',
          cmp.laneB.material.blockColorHex,
          AMBER_GOLD
        );
        blkB.group.scale.setScalar(0.86);
        blkB.group.position.set(xB, -0.55, zB);
        dynamicGroup.add(blkB.group);

        const lblB = makeLabelSprite(
          `Lane B · Narrow Edge (A/3, 3× P) · ${cmp.laneB.material.shortName} · F_f=${cmp.laneB.actualFrictionN.toFixed(1)}N`,
          '#fcd34d',
          'rgba(22,15,4,0.95)',
          0.2
        );
        lblB.position.set(0.1, 1.15, zB + 0.1);
        dynamicGroup.add(lblB);

        // Identical Pull Force Arrows on both blocks
        const fLen = Math.max(0.45, Math.min(1.55, p.comparePullForceN * 0.034));
        dynamicGroup.add(
          createVectorArrow3D(
            new THREE.Vector3(xA + 0.65, -0.05, zA),
            new THREE.Vector3(1, 0, 0),
            fLen,
            SKY_MAIN,
            0.042
          )
        );
        dynamicGroup.add(
          createVectorArrow3D(
            new THREE.Vector3(xB + 0.28, -0.1, zB),
            new THREE.Vector3(1, 0, 0),
            fLen,
            SKY_MAIN,
            0.042
          )
        );

        // Friction Arrows on both blocks
        if (cmp.laneA.actualFrictionN > 0.2) {
          dynamicGroup.add(
            createVectorArrow3D(
              new THREE.Vector3(xA - 0.65, -0.2, zA),
              new THREE.Vector3(-1, 0, 0),
              Math.max(0.35, Math.min(1.35, cmp.laneA.actualFrictionN * 0.04)),
              ROSE_MAIN,
              0.042
            )
          );
        }
        if (cmp.laneB.actualFrictionN > 0.2) {
          dynamicGroup.add(
            createVectorArrow3D(
              new THREE.Vector3(xB - 0.28, -0.4, zB),
              new THREE.Vector3(-1, 0, 0),
              Math.max(0.35, Math.min(1.35, cmp.laneB.actualFrictionN * 0.04)),
              ROSE_MAIN,
              0.042
            )
          );
        }

        // Bottom verdict banner
        const cmpBanner = makeLabelSprite(
          cmp.sameMaterial
            ? `SAME MATERIAL: 3.0× Pressure on Lane B, yet EXACT TIE (ΔF_f = 0.0 N, a = ${cmp.laneA.accelMs2.toFixed(2)} m/s²)`
            : `DIFFERENT MATERIALS: ΔF_f = ${cmp.frictionDifferenceN.toFixed(1)} N · a_A=${cmp.laneA.accelMs2.toFixed(2)} vs a_B=${cmp.laneB.accelMs2.toFixed(2)} m/s²`,
          cmp.sameMaterial ? '#6ee7b7' : '#7dd3fc',
          'rgba(5,16,18,0.95)',
          0.19
        );
        cmpBanner.position.set(0, -2.05, 1.4);
        dynamicGroup.add(cmpBanner);
      }

      requestRender();
    };

    rebuildSceneRef.current = rebuildScene;

    applyCameraPreset(stateRef.current.params.mode, stateRef.current.viewMode);
    rebuildScene();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      applyCameraPreset(stateRef.current.params.mode, stateRef.current.viewMode);
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
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync latest state outside render and rebuild dynamic 3D objects
  useEffect(() => {
    stateRef.current = { params, evaluation, viewMode };
    rebuildSceneRef.current?.();
  }, [params, evaluation, viewMode]);

  // Reset camera framing when switching mode or 3D/2D view
  useEffect(() => {
    applyCameraPresetRef.current?.(params.mode, viewMode);
  }, [params.mode, viewMode]);

  return (
    <div
      ref={containerRef}
      data-testid="friction27-viewport"
      data-mode={params.mode}
      data-view={viewMode}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};

export default Friction27Viewport;
