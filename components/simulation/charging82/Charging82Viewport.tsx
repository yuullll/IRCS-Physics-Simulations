'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Charging82Params,
  Charging82State,
  TRIBO_PAIRS,
} from '@/lib/physics/charge-conservation-8-2';

const POSITIVE_RED = 0xef4444;
const NEGATIVE_BLUE = 0x3b82f6;
const ELECTRON_CYAN = 0x38bdf8;
const NEUTRAL_SLATE = 0x64748b;
const COPPER_GOLD = 0xd97706;
const EARTH_GREEN = 0x10b981;

export interface Charging82ViewportProps {
  params: Charging82Params;
  simState: Charging82State;
  viewMode: '3d' | '2d';
  showCarriers: boolean;
  showFlowArrows: boolean;
  showFieldLines: boolean;
  rubAnimPhase: number; // 0..2pi oscillation during active rub animation
}

function makeTextSprite(
  title: string,
  valueText: string,
  accentHex: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded dark panel
  const r = 18;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.92)';
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
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, canvas.width / 2, 43);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 34px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(valueText, canvas.width / 2, 86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.9, 0.52, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function updateTextSprite(
  sprite: THREE.Sprite,
  title: string,
  valueText: string,
  accentHex: string
) {
  const mat = sprite.material as THREE.SpriteMaterial;
  const tex = mat.map;
  if (!tex || !tex.image) return;
  const canvas = tex.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = 18;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.92)';
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
  ctx.font = 'bold 34px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(valueText, canvas.width / 2, 86);

  tex.needsUpdate = true;
}

function formatChargeBadge(q: number): { text: string; hex: string } {
  const clean = Math.abs(q) < 0.02 ? 0 : q;
  if (clean > 0) return { text: `+${clean.toFixed(1)} q₀`, hex: '#f87171' };
  if (clean < 0) return { text: `${clean.toFixed(1)} q₀`, hex: '#60a5fa' };
  return { text: '0.0 q₀ (Neutral)', hex: '#cbd5e1' };
}

function buildInsulatingStand(stemHeight: number): THREE.Group {
  const g = new THREE.Group();
  // Weighted dark slate base
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.45,
    roughness: 0.4,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.16, 28), baseMat);
  base.position.y = 0.08;
  g.add(base);

  // Machined brass/anodized collar
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.75,
    roughness: 0.25,
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.14, 20), collarMat);
  collar.position.y = 0.22;
  g.add(collar);

  // Borosilicate glass insulating stem
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.12,
    metalness: 0.05,
    transmission: 0.55,
    transparent: true,
    opacity: 0.72,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.095, stemHeight, 20),
    glassMat
  );
  stem.position.y = 0.28 + stemHeight / 2;
  g.add(stem);

  // Top rubber insulator ring
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.1,
  });
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 12, 24), ringMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 0.28 + stemHeight;
  g.add(topRing);

  return g;
}

function createChargeGlyphTexture(sign: '+' | '−'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);

  ctx.beginPath();
  ctx.arc(48, 48, 38, 0, Math.PI * 2);
  ctx.fillStyle = sign === '+' ? '#ef4444' : '#3b82f6';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = sign === '+' ? '#fecaca' : '#bfdbfe';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign, 48, sign === '+' ? 50 : 47);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Charging82Viewport: React.FC<Charging82ViewportProps> = ({
  params,
  simState,
  viewMode,
  showCarriers,
  showFlowArrows,
  showFieldLines,
  rubAnimPhase,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({
    params,
    simState,
    viewMode,
    showCarriers,
    showFlowArrows,
    showFieldLines,
    rubAnimPhase,
  });

  const requestRenderRef = useRef<(() => void) | null>(null);

  // Sync latest props into ref and trigger redraw whenever reactive props change
  useEffect(() => {
    propsRef.current = {
      params,
      simState,
      viewMode,
      showCarriers,
      showFlowArrows,
      showFieldLines,
      rubAnimPhase,
    };
    requestRenderRef.current?.();
  }, [params, simState, viewMode, showCarriers, showFlowArrows, showFieldLines, rubAnimPhase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 640;

    // Detect software WebGL renderer (SwiftShader/llvmpipe) to pace frames gently
    let isSoftwareGl = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const str = dbg
          ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
          : String(gl.getParameter(gl.RENDERER));
        isSoftwareGl = /SwiftShader|llvmpipe|Software|ANGLE.*SwiftShader/i.test(str);
      }
    } catch {
      isSoftwareGl = false;
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050811, 1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);

    // PMREM metallic environment for realistic brushed conductor spheres
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Cameras (Perspective for 3D, Orthographic for 2D schematic view)
    // Positioned so the full horizontal bench apparatus fits cleanly inside the open center viewport between side docks
    const perspCam = new THREE.PerspectiveCamera(36, width / height, 0.1, 140);
    perspCam.position.set(0.0, 4.15, 13.6);

    const frustumH = 8.4;
    const aspect = width / height;
    const orthoCam = new THREE.OrthographicCamera(
      (-frustumH * aspect) / 2,
      (frustumH * aspect) / 2,
      frustumH / 2,
      -frustumH / 2,
      0.1,
      120
    );
    orthoCam.position.set(0, 2.05, 14);
    orthoCam.lookAt(0, 2.05, 0);

    const controls = new OrbitControls(perspCam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.95, 0);
    controls.minDistance = 5.5;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    // Lighting rig: warm key + cool rim + soft hemisphere fill
    scene.add(new THREE.HemisphereLight(0xbfe4ff, 0x0b1224, 0.9));
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.55);
    keyLight.position.set(5, 9, 7);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-7, 5, -5);
    scene.add(rimLight);

    // =========================================================================
    // LABORATORY BENCHTOP & PRECISION RAIL BASE
    // =========================================================================
    const benchGroup = new THREE.Group();
    const benchTop = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 0.24, 5.2),
      new THREE.MeshStandardMaterial({
        color: 0x0a1326,
        metalness: 0.35,
        roughness: 0.65,
      })
    );
    benchTop.position.set(0, -0.12, 0);
    benchGroup.add(benchTop);

    // Anodized bevel trim around bench
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(11.72, 0.08, 5.32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.65,
        roughness: 0.35,
      })
    );
    trim.position.set(0, -0.02, 0);
    benchGroup.add(trim);

    // Precision grid overlay on lab bench
    const grid = new THREE.GridHelper(11, 22, 0x1e3a5f, 0x111f38);
    grid.position.set(0, 0.005, 0);
    grid.scale.set(1, 1, 0.45);
    benchGroup.add(grid);

    // Optical bench alignment rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(9.4, 0.06, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.8,
        roughness: 0.25,
      })
    );
    rail.position.set(0, 0.03, 0);
    benchGroup.add(rail);
    scene.add(benchGroup);

    // Shared charge sprite textures
    const plusTex = createChargeGlyphTexture('+');
    const minusTex = createChargeGlyphTexture('−');

    const createCarrierPool = (count: number, sign: '+' | '−', scale = 0.24) => {
      const group = new THREE.Group();
      const sprites: THREE.Sprite[] = [];
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({
          map: sign === '+' ? plusTex : minusTex,
          transparent: true,
          depthTest: false,
        });
        const sp = new THREE.Sprite(mat);
        sp.scale.set(scale, scale, 1);
        sp.renderOrder = 12;
        sp.visible = false;
        group.add(sp);
        sprites.push(sp);
      }
      return { group, sprites };
    };

    // =========================================================================
    // SCENARIO 1: FRICTION / TRIBOELECTRIC GROUP
    // =========================================================================
    const frictionGroup = new THREE.Group();
    scene.add(frictionGroup);

    // Left insulating rod on dual V-cradle supports (compactly framed in center viewport)
    const rodCradleL = buildInsulatingStand(1.3);
    rodCradleL.position.set(-2.3, 0, 0);
    frictionGroup.add(rodCradleL);

    const rodCradleR = buildInsulatingStand(1.3);
    rodCradleR.position.set(-0.2, 0, 0);
    frictionGroup.add(rodCradleR);

    const triboRodMat = new THREE.MeshPhysicalMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    });
    const triboRodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 3.0, 28),
      triboRodMat
    );
    triboRodMesh.rotation.z = Math.PI / 2;
    triboRodMesh.position.set(-1.25, 1.92, 0);
    frictionGroup.add(triboRodMesh);

    // Rod end caps
    const capGeo = new THREE.SphereGeometry(0.3, 20, 16);
    const rodCapL = new THREE.Mesh(capGeo, triboRodMat);
    rodCapL.position.set(-2.75, 1.92, 0);
    frictionGroup.add(rodCapL);
    const rodCapR = new THREE.Mesh(capGeo, triboRodMat);
    rodCapR.position.set(0.25, 1.92, 0);
    frictionGroup.add(rodCapR);

    // Draped cloth / fur pad assembly (moves across rod during rubbing!)
    const clothGroup = new THREE.Group();
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
    });
    const clothPad = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.0, 0.92), clothMat);
    clothGroup.add(clothPad);
    // Sewn edge trim on cloth
    const clothRim = new THREE.Mesh(
      new THREE.BoxGeometry(1.61, 0.1, 0.98),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
    );
    clothRim.position.y = -0.48;
    clothGroup.add(clothRim);
    clothGroup.position.set(1.75, 1.92, 0);
    frictionGroup.add(clothGroup);

    const clothStand = buildInsulatingStand(1.1);
    clothStand.position.set(1.75, 0, 0);
    frictionGroup.add(clothStand);

    const frictionRodPos = createCarrierPool(12, '+', 0.22);
    const frictionRodNeg = createCarrierPool(18, '−', 0.22);
    const frictionClothPos = createCarrierPool(12, '+', 0.22);
    const frictionClothNeg = createCarrierPool(18, '−', 0.22);
    frictionGroup.add(
      frictionRodPos.group,
      frictionRodNeg.group,
      frictionClothPos.group,
      frictionClothNeg.group
    );

    const frictionRodBadge = makeTextSprite('Glass Rod', '0.0 q₀', '#cbd5e1');
    frictionRodBadge.position.set(-1.25, 3.02, 0);
    frictionGroup.add(frictionRodBadge);

    const frictionClothBadge = makeTextSprite('Silk Cloth', '0.0 q₀', '#cbd5e1');
    frictionClothBadge.position.set(1.75, 3.02, 0);
    frictionGroup.add(frictionClothBadge);

    // =========================================================================
    // SCENARIO 2: CONDUCTION / CONTACT GROUP
    // =========================================================================
    const conductionGroup = new THREE.Group();
    scene.add(conductionGroup);

    const condAssemblyA = new THREE.Group();
    const condStandA = buildInsulatingStand(1.35);
    condAssemblyA.add(condStandA);
    const condMatA = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.18,
      transparent: true,
      opacity: 0.68,
    });
    const condSphereA = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24), condMatA);
    condSphereA.position.y = 2.45;
    condAssemblyA.add(condSphereA);
    const condHaloA = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.04, 14, 48),
      new THREE.MeshBasicMaterial({ color: NEUTRAL_SLATE })
    );
    condHaloA.rotation.x = Math.PI / 2;
    condHaloA.position.y = 2.45;
    condAssemblyA.add(condHaloA);
    conductionGroup.add(condAssemblyA);

    const condAssemblyB = new THREE.Group();
    const condStandB = buildInsulatingStand(1.35);
    condAssemblyB.add(condStandB);
    const condMatB = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.18,
      transparent: true,
      opacity: 0.68,
    });
    const condSphereB = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24), condMatB);
    condSphereB.position.y = 2.45;
    condAssemblyB.add(condSphereB);
    const condHaloB = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.04, 14, 48),
      new THREE.MeshBasicMaterial({ color: NEUTRAL_SLATE })
    );
    condHaloB.rotation.x = Math.PI / 2;
    condHaloB.position.y = 2.45;
    condAssemblyB.add(condHaloB);
    conductionGroup.add(condAssemblyB);

    const condPosA = createCarrierPool(12, '+', 0.23);
    const condNegA = createCarrierPool(20, '−', 0.23);
    const condPosB = createCarrierPool(12, '+', 0.23);
    const condNegB = createCarrierPool(20, '−', 0.23);
    conductionGroup.add(condPosA.group, condNegA.group, condPosB.group, condNegB.group);

    const condBadgeA = makeTextSprite('Sphere A', '+6.0 q₀', '#f87171');
    const condBadgeB = makeTextSprite('Sphere B', '-2.0 q₀', '#60a5fa');
    conductionGroup.add(condBadgeA, condBadgeB);

    // =========================================================================
    // SCENARIO 3: INDUCTION & POLARIZATION GROUP
    // =========================================================================
    const inductionGroup = new THREE.Group();
    scene.add(inductionGroup);

    // External Inducing Rod carriage (left side)
    const indRodGroup = new THREE.Group();
    const indRodStand = buildInsulatingStand(1.55);
    indRodStand.position.set(-1.1, 0, 0);
    indRodGroup.add(indRodStand);
    const indRodMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.3,
      roughness: 0.35,
    });
    const indRodCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.6, 24), indRodMat);
    indRodCyl.rotation.z = Math.PI / 2;
    indRodCyl.position.set(-0.2, 2.25, 0);
    indRodGroup.add(indRodCyl);
    const indRodTipMat = new THREE.MeshStandardMaterial({
      color: NEGATIVE_BLUE,
      emissive: NEGATIVE_BLUE,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const indRodTip = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), indRodTipMat);
    indRodTip.position.set(1.1, 2.25, 0);
    indRodGroup.add(indRodTip);
    const indRodCarriers = createCarrierPool(8, '−', 0.22);
    const indRodCarriersPos = createCarrierPool(8, '+', 0.22);
    indRodGroup.add(indRodCarriers.group, indRodCarriersPos.group);
    inductionGroup.add(indRodGroup);

    const indRodBadge = makeTextSprite('Inducing Rod', '-6.0 q₀', '#60a5fa');
    inductionGroup.add(indRodBadge);

    // Pair of Neutral Conducting Spheres A & B
    const indPairGroup = new THREE.Group();
    const indSphereAWrap = new THREE.Group();
    indSphereAWrap.add(buildInsulatingStand(1.35));
    const indSphereAMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.85,
        roughness: 0.18,
        transparent: true,
        opacity: 0.65,
      })
    );
    indSphereAMesh.position.y = 2.25;
    indSphereAWrap.add(indSphereAMesh);
    const indHaloA = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.04, 14, 48),
      new THREE.MeshBasicMaterial({ color: NEUTRAL_SLATE })
    );
    indHaloA.rotation.x = Math.PI / 2;
    indHaloA.position.y = 2.25;
    indSphereAWrap.add(indHaloA);
    indPairGroup.add(indSphereAWrap);

    const indSphereBWrap = new THREE.Group();
    indSphereBWrap.add(buildInsulatingStand(1.35));
    const indSphereBMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.85,
        roughness: 0.18,
        transparent: true,
        opacity: 0.65,
      })
    );
    indSphereBMesh.position.y = 2.25;
    indSphereBWrap.add(indSphereBMesh);
    const indHaloB = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.04, 14, 48),
      new THREE.MeshBasicMaterial({ color: NEUTRAL_SLATE })
    );
    indHaloB.rotation.x = Math.PI / 2;
    indHaloB.position.y = 2.25;
    indSphereBWrap.add(indHaloB);
    indPairGroup.add(indSphereBWrap);

    const indPosA = createCarrierPool(12, '+', 0.22);
    const indNegA = createCarrierPool(20, '−', 0.22);
    const indPosB = createCarrierPool(12, '+', 0.22);
    const indNegB = createCarrierPool(20, '−', 0.22);
    indPairGroup.add(indPosA.group, indNegA.group, indPosB.group, indNegB.group);

    const indBadgeA = makeTextSprite('Near Sphere A', '0.0 q₀', '#cbd5e1');
    const indBadgeB = makeTextSprite('Far Sphere B', '0.0 q₀', '#cbd5e1');
    indPairGroup.add(indBadgeA, indBadgeB);
    inductionGroup.add(indPairGroup);

    // Neutral Insulator / Dielectric Block with 12 Bound Atomic Dipoles
    const insulatorGroup = new THREE.Group();
    const insStand = buildInsulatingStand(1.1);
    insStand.position.set(1.2, 0, 0);
    insulatorGroup.add(insStand);

    const insBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.85, 1.35),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        roughness: 0.2,
        metalness: 0.05,
        transparent: true,
        opacity: 0.22,
      })
    );
    insBox.position.set(1.2, 2.25, 0);
    insulatorGroup.add(insBox);

    const insWireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2.62, 1.87, 1.37)),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    insWireframe.position.copy(insBox.position);
    insulatorGroup.add(insWireframe);

    // 12 bound dipole atoms (4 cols x 3 rows)
    const dipoleAtoms: {
      capsule: THREE.Mesh;
      plusSp: THREE.Sprite;
      minusSp: THREE.Sprite;
      basePos: THREE.Vector3;
    }[] = [];
    const capsuleGeo = new THREE.CapsuleGeometry(0.14, 0.22, 8, 12);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const bx = 1.2 + (c - 1.5) * 0.58;
        const by = 2.25 + (r - 1) * 0.54;
        const bz = ((r + c) % 2 === 0 ? 0.16 : -0.16);
        const basePos = new THREE.Vector3(bx, by, bz);

        const cap = new THREE.Mesh(
          capsuleGeo,
          new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.35,
            roughness: 0.3,
          })
        );
        cap.rotation.z = Math.PI / 2;
        cap.position.copy(basePos);
        insulatorGroup.add(cap);

        const plusSp = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: plusTex, transparent: true, depthTest: false })
        );
        plusSp.scale.set(0.21, 0.21, 1);
        plusSp.renderOrder = 14;
        insulatorGroup.add(plusSp);

        const minusSp = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: minusTex, transparent: true, depthTest: false })
        );
        minusSp.scale.set(0.21, 0.21, 1);
        minusSp.renderOrder = 14;
        insulatorGroup.add(minusSp);

        dipoleAtoms.push({ capsule: cap, plusSp, minusSp, basePos });
      }
    }

    const insBadge = makeTextSprite('Neutral Insulator', '0.0 q₀ (Polarized)', '#cbd5e1');
    insBadge.position.set(1.2, 3.62, 0);
    insulatorGroup.add(insBadge);
    inductionGroup.add(insulatorGroup);

    // =========================================================================
    // SCENARIO 4: GROUNDING & INDUCTION WITH EARTH GROUP
    // =========================================================================
    const groundingGroup = new THREE.Group();
    scene.add(groundingGroup);

    // Left Inducing Rod for induction_ground mode
    const grRodGroup = new THREE.Group();
    const grRodStand = buildInsulatingStand(1.55);
    grRodStand.position.set(-1.1, 0, 0);
    grRodGroup.add(grRodStand);
    const grRodCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 2.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.35, roughness: 0.35 })
    );
    grRodCyl.rotation.z = Math.PI / 2;
    grRodCyl.position.set(-0.2, 2.25, 0);
    grRodGroup.add(grRodCyl);
    const grRodTipMat = new THREE.MeshStandardMaterial({
      color: NEGATIVE_BLUE,
      emissive: NEGATIVE_BLUE,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const grRodTip = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), grRodTipMat);
    grRodTip.position.set(1.0, 2.25, 0);
    grRodGroup.add(grRodTip);
    const grRodNeg = createCarrierPool(8, '−', 0.22);
    const grRodPos = createCarrierPool(8, '+', 0.22);
    grRodGroup.add(grRodNeg.group, grRodPos.group);
    groundingGroup.add(grRodGroup);

    const grRodBadge = makeTextSprite('Inducing Rod', '-6.0 q₀', '#60a5fa');
    groundingGroup.add(grRodBadge);

    // Center Conducting Sphere on stand
    const grSphereWrap = new THREE.Group();
    grSphereWrap.add(buildInsulatingStand(1.35));
    const grSphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 32, 24),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.85,
        roughness: 0.18,
        transparent: true,
        opacity: 0.65,
      })
    );
    grSphereMesh.position.y = 2.25;
    grSphereWrap.add(grSphereMesh);
    const grHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.045, 14, 48),
      new THREE.MeshBasicMaterial({ color: NEUTRAL_SLATE })
    );
    grHalo.rotation.x = Math.PI / 2;
    grHalo.position.y = 2.25;
    grSphereWrap.add(grHalo);
    grSphereWrap.position.set(0.0, 0, 0);
    groundingGroup.add(grSphereWrap);

    const grPos = createCarrierPool(12, '+', 0.22);
    const grNeg = createCarrierPool(20, '−', 0.22);
    groundingGroup.add(grPos.group, grNeg.group);

    const grSphereBadge = makeTextSprite('Conducting Sphere', '+6.0 q₀', '#f87171');
    grSphereBadge.position.set(0.0, 3.65, 0);
    groundingGroup.add(grSphereBadge);

    // Right Copper Ground Knife-Switch + Wire + 3D Earth Busbar Pedestal
    const copperMat = new THREE.MeshStandardMaterial({
      color: COPPER_GOLD,
      metalness: 0.85,
      roughness: 0.25,
    });
    const earthMat = new THREE.MeshStandardMaterial({
      color: EARTH_GREEN,
      metalness: 0.4,
      roughness: 0.35,
      emissive: 0x064e3b,
      emissiveIntensity: 0.35,
    });

    // Wire segment from sphere right edge (0.84, 2.25) to knife-switch hinge (1.62, 2.25)
    const wireToSwitch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.82, 14), copperMat);
    wireToSwitch.rotation.z = Math.PI / 2;
    wireToSwitch.position.set(1.23, 2.25, 0);
    groundingGroup.add(wireToSwitch);

    // Knife-switch pivot group at (1.62, 2.25, 0)
    const knifeBladePivot = new THREE.Group();
    knifeBladePivot.position.set(1.62, 2.25, 0);
    const knifeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.1), copperMat);
    knifeBlade.position.set(0.43, 0, 0);
    knifeBladePivot.add(knifeBlade);
    const knifeHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.26, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 })
    );
    knifeHandle.rotation.z = Math.PI / 2;
    knifeHandle.position.set(0.88, 0.06, 0);
    knifeBladePivot.add(knifeHandle);
    groundingGroup.add(knifeBladePivot);

    // Switch jaw contact & vertical copper busbar down to Earth symbol
    const switchJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.22), copperMat);
    switchJaw.position.set(2.48, 2.25, 0);
    groundingGroup.add(switchJaw);

    const vertGroundWire = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 1.35, 14), copperMat);
    vertGroundWire.position.set(2.48, 1.54, 0);
    groundingGroup.add(vertGroundWire);

    // 3D Earth Ground Symbol Pedestal (⏚)
    const earthPedestal = new THREE.Group();
    earthPedestal.position.set(2.48, 0.82, 0);
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.45), earthMat);
    bar1.position.y = 0;
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.45), earthMat);
    bar2.position.y = -0.24;
    const bar3 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.45), earthMat);
    bar3.position.y = -0.48;
    const earthBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.82, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.35, roughness: 0.5 })
    );
    earthBase.position.y = -0.75;
    earthPedestal.add(bar1, bar2, bar3, earthBase);
    groundingGroup.add(earthPedestal);

    const grEarthBadge = makeTextSprite('Earth Reservoir', 'ΔQ = 0.0 q₀', '#34d399');
    grEarthBadge.position.set(2.48, 3.25, 0);
    groundingGroup.add(grEarthBadge);

    // =========================================================================
    // SHARED ANIMATED ELECTRON FLOW STREAM & E-FIELD POLARIZATION ARROWS
    // =========================================================================
    const flowStreamGroup = new THREE.Group();
    scene.add(flowStreamGroup);
    const flowParticles: THREE.Sprite[] = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: minusTex, transparent: true, depthTest: false })
      );
      sp.scale.set(0.24, 0.24, 1);
      sp.renderOrder = 18;
      sp.visible = false;
      flowStreamGroup.add(sp);
      flowParticles.push(sp);
    }

    const fieldArrowGroup = new THREE.Group();
    scene.add(fieldArrowGroup);
    const fieldArrows: THREE.ArrowHelper[] = [];
    for (let i = 0; i < 5; i++) {
      const arr = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 2, 0),
        1.1,
        ELECTRON_CYAN,
        0.24,
        0.14
      );
      arr.visible = false;
      fieldArrowGroup.add(arr);
      fieldArrows.push(arr);
    }

    // Helper: position discrete carriers inside a sphere with polarization offset
    const layoutSphereCarriers = (
      pool: { sprites: THREE.Sprite[] },
      count: number,
      center: THREE.Vector3,
      radius: number,
      xBias: number, // -1..+1 shift along X
      seedOffset: number,
      visible: boolean
    ) => {
      const clamped = Math.max(0, Math.min(pool.sprites.length, Math.round(count)));
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < pool.sprites.length; i++) {
        const sp = pool.sprites[i];
        if (!visible || i >= clamped) {
          sp.visible = false;
          continue;
        }
        sp.visible = true;
        const yNorm = 1 - ((i + 0.5) / Math.max(1, clamped)) * 2;
        const rAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = golden * (i + seedOffset);
        const rad = radius * 0.62;
        const lx = Math.cos(theta) * rAtY * rad + xBias * radius * 0.34;
        const ly = yNorm * rad * 0.85;
        const lz = Math.sin(theta) * rAtY * rad * 0.6;
        sp.position.set(center.x + lx, center.y + ly, center.z + lz);
      }
    };

    const layoutBoxCarriers = (
      pool: { sprites: THREE.Sprite[] },
      count: number,
      center: THREE.Vector3,
      halfW: number,
      halfH: number,
      zOff: number,
      visible: boolean
    ) => {
      const clamped = Math.max(0, Math.min(pool.sprites.length, Math.round(count)));
      const cols = Math.max(2, Math.ceil(Math.sqrt(clamped * 1.8)));
      const rows = Math.max(1, Math.ceil(clamped / cols));
      for (let i = 0; i < pool.sprites.length; i++) {
        const sp = pool.sprites[i];
        if (!visible || i >= clamped) {
          sp.visible = false;
          continue;
        }
        sp.visible = true;
        const r = Math.floor(i / cols);
        const c = i % cols;
        const fx = cols > 1 ? c / (cols - 1) - 0.5 : 0;
        const fy = rows > 1 ? r / (rows - 1) - 0.5 : 0;
        sp.position.set(
          center.x + fx * halfW * 1.6,
          center.y + fy * halfH * 1.35,
          center.z + zOff
        );
      }
    };

    // Scene state updater driven from current React props + animation time
    const updateSceneGeometry = (elapsedSec: number) => {
      const {
        params: p,
        simState: st,
        showCarriers: carriersOn,
        showFlowArrows: flowOn,
        showFieldLines: fieldOn,
        rubAnimPhase: rubPhase,
      } = propsRef.current;

      frictionGroup.visible = p.scenario === 'friction_tribo';
      conductionGroup.visible = p.scenario === 'conduction_contact';
      inductionGroup.visible = p.scenario === 'induction_polarization';
      groundingGroup.visible = p.scenario === 'grounding_earth';

      // Reset shared flow & field helpers
      flowParticles.forEach(fp => {
        fp.visible = false;
      });
      fieldArrows.forEach(fa => {
        fa.visible = false;
      });

      const showElectronStreamAlongPath = (points: THREE.Vector3[]) => {
        if (!flowOn || points.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(points);
        for (let i = 0; i < flowParticles.length; i++) {
          const u = ((elapsedSec * 0.55 + i / flowParticles.length) % 1 + 1) % 1;
          const pt = curve.getPoint(u);
          flowParticles[i].position.copy(pt);
          flowParticles[i].visible = true;
        }
      };

      // =====================================================================
      // SCENARIO 1: FRICTION / TRIBOELECTRIC
      // =====================================================================
      if (p.scenario === 'friction_tribo') {
        const meta = TRIBO_PAIRS[p.triboPair];
        triboRodMat.color.set(meta.rodColor);
        clothMat.color.set(meta.clothColor);

        // Cloth moves onto the rod when rubbing, or rests cleanly beside it
        const rubOsc = rubPhase > 0 ? Math.sin(rubPhase) * 0.8 : 0;
        const clothX = rubPhase > 0 ? -0.9 + rubOsc : 1.75 - p.rubProgress * 0.4;
        const clothY = rubPhase > 0 ? 2.15 : 1.92;
        clothGroup.position.set(clothX, clothY, rubPhase > 0 ? 0.25 : 0);
        clothStand.position.set(1.75, 0, 0);
        clothStand.visible = rubPhase === 0;

        const rodObj = st.objects.find(o => o.id === 'rod')!;
        const clothObj = st.objects.find(o => o.id === 'cloth')!;

        layoutBoxCarriers(
          frictionRodPos,
          rodObj.protons,
          new THREE.Vector3(-1.25, 1.92, 0),
          1.15,
          0.16,
          0.34,
          carriersOn
        );
        layoutBoxCarriers(
          frictionRodNeg,
          rodObj.electrons,
          new THREE.Vector3(-1.25, 1.92, 0),
          1.15,
          0.18,
          -0.34,
          carriersOn
        );

        layoutBoxCarriers(
          frictionClothPos,
          clothObj.protons,
          new THREE.Vector3(clothX, clothY, 0),
          0.56,
          0.32,
          0.5,
          carriersOn
        );
        layoutBoxCarriers(
          frictionClothNeg,
          clothObj.electrons,
          new THREE.Vector3(clothX, clothY, 0),
          0.56,
          0.32,
          -0.5,
          carriersOn
        );

        const rBadge = formatChargeBadge(rodObj.netCharge);
        const cBadge = formatChargeBadge(clothObj.netCharge);
        updateTextSprite(frictionRodBadge, meta.rodName, rBadge.text, rBadge.hex);
        updateTextSprite(frictionClothBadge, meta.clothName, cBadge.text, cBadge.hex);
        frictionClothBadge.position.set(clothX, 3.05, 0);

        if (st.flow.active) {
          const fromRod = st.flow.fromId === 'rod';
          const p0 = new THREE.Vector3(fromRod ? 0.15 : clothX - 0.58, 2.08, 0.25);
          const pMid = new THREE.Vector3((0.15 + clothX - 0.58) * 0.5, 2.65, 0.35);
          const p1 = new THREE.Vector3(fromRod ? clothX - 0.58 : 0.15, 2.08, 0.25);
          showElectronStreamAlongPath([p0, pMid, p1]);
        }
      }

      // =====================================================================
      // SCENARIO 2: CONDUCTION / CONTACT
      // =====================================================================
      if (p.scenario === 'conduction_contact') {
        const sA = st.objects.find(o => o.id === 'sphereA')!;
        const sB = st.objects.find(o => o.id === 'sphereB')!;
        const rA = 0.68 * p.radiusA;
        const rB = 0.68 * p.radiusB;

        condSphereA.scale.setScalar(rA / 0.85);
        condHaloA.scale.setScalar(rA / 0.85);
        condSphereB.scale.setScalar(rB / 0.85);
        condHaloB.scale.setScalar(rB / 0.85);

        const gap = p.contactPhase === 'touching' ? 0 : 1.5;
        const xA = -(rA + gap * 0.5);
        const xB = rB + gap * 0.5;
        condAssemblyA.position.set(xA, 0, 0);
        condAssemblyB.position.set(xB, 0, 0);

        const colorA = sA.netCharge > 0.05 ? POSITIVE_RED : sA.netCharge < -0.05 ? NEGATIVE_BLUE : NEUTRAL_SLATE;
        const colorB = sB.netCharge > 0.05 ? POSITIVE_RED : sB.netCharge < -0.05 ? NEGATIVE_BLUE : NEUTRAL_SLATE;
        (condHaloA.material as THREE.MeshBasicMaterial).color.setHex(colorA);
        (condHaloB.material as THREE.MeshBasicMaterial).color.setHex(colorB);

        layoutSphereCarriers(condPosA, sA.protons, new THREE.Vector3(xA, 2.45, 0), rA, 0, 1, carriersOn);
        layoutSphereCarriers(condNegA, sA.electrons, new THREE.Vector3(xA, 2.45, 0), rA, 0, 7, carriersOn);
        layoutSphereCarriers(condPosB, sB.protons, new THREE.Vector3(xB, 2.45, 0), rB, 0, 3, carriersOn);
        layoutSphereCarriers(condNegB, sB.electrons, new THREE.Vector3(xB, 2.45, 0), rB, 0, 11, carriersOn);

        const bA = formatChargeBadge(sA.netCharge);
        const bB = formatChargeBadge(sB.netCharge);
        updateTextSprite(condBadgeA, `Sphere A (R=${p.radiusA.toFixed(1)})`, bA.text, bA.hex);
        updateTextSprite(condBadgeB, `Sphere B (R=${p.radiusB.toFixed(1)})`, bB.text, bB.hex);
        const topBadgeY = 2.45 + Math.max(rA, rB) + 0.65;
        condBadgeA.position.set(Math.min(xA, -1.15), topBadgeY, 0);
        condBadgeB.position.set(Math.max(xB, 1.15), topBadgeY, 0);

        if (p.contactPhase === 'touching' && st.flow.active) {
          const fromB = st.flow.fromId === 'sphereB';
          showElectronStreamAlongPath([
            new THREE.Vector3(fromB ? xB : xA, 2.45, 0.45),
            new THREE.Vector3((xA + xB) * 0.5, 2.85, 0.55),
            new THREE.Vector3(fromB ? xA : xB, 2.45, 0.45),
          ]);
        }
      }

      // =====================================================================
      // SCENARIO 3: INDUCTION & POLARIZATION
      // =====================================================================
      if (p.scenario === 'induction_polarization') {
        // Keep inducing rod fully visible inside center safe zone even at 0% proximity
        const rodX = -3.35 + p.rodProximity * 1.1;
        indRodGroup.position.set(rodX, 0, 0);

        const rodPosSign = p.rodCharge > 0;
        const rodZero = p.rodCharge === 0;
        const tipColor = rodZero ? NEUTRAL_SLATE : rodPosSign ? POSITIVE_RED : NEGATIVE_BLUE;
        indRodTipMat.color.setHex(tipColor);
        indRodTipMat.emissive.setHex(tipColor);

        const rodCount = Math.min(8, Math.abs(p.rodCharge));
        for (let i = 0; i < 8; i++) {
          const xLocal = 0.05 + (i / 7) * 1.0;
          const yLocal = 2.25 + (i % 2 === 0 ? 0.14 : -0.14);
          indRodCarriersPos.sprites[i].visible = carriersOn && rodPosSign && i < rodCount;
          indRodCarriersPos.sprites[i].position.set(xLocal, yLocal, 0.28);
          indRodCarriers.sprites[i].visible = carriersOn && !rodPosSign && !rodZero && i < rodCount;
          indRodCarriers.sprites[i].position.set(xLocal, yLocal, 0.28);
        }

        const rBadge = formatChargeBadge(p.rodCharge);
        updateTextSprite(indRodBadge, 'Inducing Rod', rBadge.text, rBadge.hex);
        indRodBadge.position.set(Math.max(-2.45, rodX + 0.55), 3.32, 0);

        const isPair = p.inductionTarget === 'conductor_pair';
        indPairGroup.visible = isPair;
        insulatorGroup.visible = !isPair;

        // Subtle electric field arrows from/to rod tip
        if (fieldOn && Math.abs(p.rodCharge) > 0 && p.rodProximity > 0.15) {
          const tipWorldX = rodX + 1.18;
          const dirX = p.rodCharge > 0 ? 1 : -1;
          for (let i = 0; i < 3; i++) {
            const fy = 1.75 + i * 0.5;
            const fa = fieldArrows[i];
            fa.visible = true;
            fa.setDirection(new THREE.Vector3(dirX, 0, 0));
            fa.position.set(dirX > 0 ? tipWorldX + 0.08 : tipWorldX + 0.8, fy, 0.15);
            fa.setLength(0.68, 0.2, 0.12);
            fa.setColor(p.rodCharge > 0 ? POSITIVE_RED : NEGATIVE_BLUE);
          }
        }

        if (isPair) {
          const sA = st.objects.find(o => o.id === 'sphereA')!;
          const sB = st.objects.find(o => o.id === 'sphereB')!;
          const xA = 0.05;
          const xB = p.spheresSeparated ? 2.35 : 1.72;
          indSphereAWrap.position.set(xA, 0, 0);
          indSphereBWrap.position.set(xB, 0, 0);

          const cA = sA.netCharge > 0.05 ? POSITIVE_RED : sA.netCharge < -0.05 ? NEGATIVE_BLUE : NEUTRAL_SLATE;
          const cB = sB.netCharge > 0.05 ? POSITIVE_RED : sB.netCharge < -0.05 ? NEGATIVE_BLUE : NEUTRAL_SLATE;
          (indHaloA.material as THREE.MeshBasicMaterial).color.setHex(cA);
          (indHaloB.material as THREE.MeshBasicMaterial).color.setHex(cB);

          const eShift = -sA.polarization;
          layoutSphereCarriers(indPosA, sA.protons, new THREE.Vector3(xA, 2.25, 0), 0.84, 0, 2, carriersOn);
          layoutSphereCarriers(indNegA, sA.electrons, new THREE.Vector3(xA, 2.25, 0), 0.84, eShift, 9, carriersOn);
          layoutSphereCarriers(indPosB, sB.protons, new THREE.Vector3(xB, 2.25, 0), 0.84, 0, 4, carriersOn);
          layoutSphereCarriers(indNegB, sB.electrons, new THREE.Vector3(xB, 2.25, 0), 0.84, eShift, 13, carriersOn);

          const bA = formatChargeBadge(sA.netCharge);
          const bB = formatChargeBadge(sB.netCharge);
          updateTextSprite(indBadgeA, 'Near Sphere A', bA.text, bA.hex);
          updateTextSprite(indBadgeB, 'Far Sphere B', bB.text, bB.hex);
          indBadgeA.position.set(xA, 3.68, 0);
          indBadgeB.position.set(xB, 3.68, 0);

          if (!p.spheresSeparated && st.flow.active) {
            const toA = st.flow.toId === 'sphereA';
            showElectronStreamAlongPath([
              new THREE.Vector3(toA ? xB : xA, 2.25, 0.55),
              new THREE.Vector3((xA + xB) * 0.5, 2.6, 0.65),
              new THREE.Vector3(toA ? xA : xB, 2.25, 0.55),
            ]);
          }
        } else {
          // Neutral insulator bound atomic dipoles (always keep + and - legible even when unpolarized)
          const ins = st.objects.find(o => o.id === 'insulator')!;
          const pol = ins.polarization; // -1..+1
          const absPol = Math.abs(pol);
          for (const atom of dipoleAtoms) {
            const stretch = 1 + absPol * 0.52;
            atom.capsule.scale.set(1, stretch, 1);
            atom.plusSp.visible = carriersOn;
            atom.minusSp.visible = carriersOn;
            // When pol is 0, give a tiny vertical offset so both + and - are visible; when polarized, align horizontally!
            const dx = absPol > 0.04 ? Math.sign(pol) * (0.09 + absPol * 0.1) : 0.06;
            const dy = absPol > 0.04 ? 0 : 0.05;
            atom.plusSp.position.set(atom.basePos.x + dx, atom.basePos.y + dy, atom.basePos.z + 0.16);
            atom.minusSp.position.set(atom.basePos.x - dx, atom.basePos.y - dy, atom.basePos.z + 0.16);
          }
          const pct = Math.round(st.inducedDipoleStrength * 100);
          updateTextSprite(
            insBadge,
            'Neutral Insulator',
            pct > 5 ? `0.0 q₀ (${pct}% Dipoles)` : '0.0 q₀ (Neutral)',
            '#38bdf8'
          );
        }
      }

      // =====================================================================
      // SCENARIO 4: GROUNDING & INDUCTION WITH EARTH
      // =====================================================================
      if (p.scenario === 'grounding_earth') {
        const isIndGround = p.groundingMode === 'induction_ground';
        grRodGroup.visible = isIndGround;
        grRodBadge.visible = isIndGround;

        if (isIndGround) {
          const rodX = -3.35 + p.groundRodProximity * 1.1;
          grRodGroup.position.set(rodX, 0, 0);
          const rodPosSign = p.groundRodCharge > 0;
          const rodZero = p.groundRodCharge === 0;
          const tipColor = rodZero ? NEUTRAL_SLATE : rodPosSign ? POSITIVE_RED : NEGATIVE_BLUE;
          grRodTipMat.color.setHex(tipColor);
          grRodTipMat.emissive.setHex(tipColor);

          const rodCount = Math.min(8, Math.abs(p.groundRodCharge));
          for (let i = 0; i < 8; i++) {
            const xLocal = 0.0 + (i / 7) * 0.95;
            const yLocal = 2.25 + (i % 2 === 0 ? 0.14 : -0.14);
            grRodPos.sprites[i].visible = carriersOn && rodPosSign && i < rodCount;
            grRodPos.sprites[i].position.set(xLocal, yLocal, 0.28);
            grRodNeg.sprites[i].visible = carriersOn && !rodPosSign && !rodZero && i < rodCount;
            grRodNeg.sprites[i].position.set(xLocal, yLocal, 0.28);
          }

          const rBadge = formatChargeBadge(p.groundRodCharge);
          updateTextSprite(grRodBadge, 'Inducing Rod', rBadge.text, rBadge.hex);
          grRodBadge.position.set(Math.max(-2.45, rodX + 0.5), 3.32, 0);

          if (fieldOn && Math.abs(p.groundRodCharge) > 0 && p.groundRodProximity > 0.15) {
            const tipWorldX = rodX + 1.08;
            const dirX = p.groundRodCharge > 0 ? 1 : -1;
            for (let i = 0; i < 3; i++) {
              const fy = 1.75 + i * 0.5;
              const fa = fieldArrows[i];
              fa.visible = true;
              fa.setDirection(new THREE.Vector3(dirX, 0, 0));
              fa.position.set(dirX > 0 ? tipWorldX + 0.08 : tipWorldX + 0.78, fy, 0.15);
              fa.setLength(0.65, 0.2, 0.12);
              fa.setColor(p.groundRodCharge > 0 ? POSITIVE_RED : NEGATIVE_BLUE);
            }
          }
        }

        // Knife switch angle: 0 rad when closed (grounded), +0.78 rad (45°) when open
        knifeBladePivot.rotation.z = p.isGrounded ? 0 : 0.78;

        const spObj = st.objects.find(o => o.id === 'sphere')!;
        const eaObj = st.objects.find(o => o.id === 'earth')!;

        const haloCol =
          spObj.netCharge > 0.05
            ? POSITIVE_RED
            : spObj.netCharge < -0.05
            ? NEGATIVE_BLUE
            : NEUTRAL_SLATE;
        (grHalo.material as THREE.MeshBasicMaterial).color.setHex(haloCol);

        const eShift = -spObj.polarization;
        layoutSphereCarriers(grPos, spObj.protons, new THREE.Vector3(0.0, 2.25, 0), 0.84, 0, 2, carriersOn);
        layoutSphereCarriers(grNeg, spObj.electrons, new THREE.Vector3(0.0, 2.25, 0), 0.84, eShift, 8, carriersOn);

        const sBadge = formatChargeBadge(spObj.netCharge);
        updateTextSprite(grSphereBadge, 'Conducting Sphere', sBadge.text, sBadge.hex);

        const eClean = Math.abs(eaObj.netCharge) < 0.02 ? 0 : eaObj.netCharge;
        const eSign = eClean > 0 ? `+${eClean.toFixed(1)}` : eClean.toFixed(1);
        updateTextSprite(
          grEarthBadge,
          p.isGrounded ? 'Earth (CONNECTED)' : 'Earth (OPEN)',
          `ΔQ = ${eSign} q₀`,
          p.isGrounded ? '#34d399' : '#94a3b8'
        );

        // Animate electrons along the copper ground wire when grounded and transferring
        if (p.isGrounded && st.flow.active) {
          const fromEarth = st.flow.fromId === 'earth';
          const pathPts = [
            new THREE.Vector3(0.86, 2.25, 0.22),
            new THREE.Vector3(1.65, 2.25, 0.22),
            new THREE.Vector3(2.48, 2.25, 0.22),
            new THREE.Vector3(2.48, 0.95, 0.22),
          ];
          showElectronStreamAlongPath(fromEarth ? [...pathPts].reverse() : pathPts);
        }
      }
    };

    // Paced animation loop (render-on-demand when static, gentle continuous animation during electron flow)
    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let dirty = true;
    const startMs = performance.now();

    const drawFrame = () => {
      if (disposed) return;
      const elapsedSec = (performance.now() - startMs) * 0.001;
      updateSceneGeometry(elapsedSec);
      const activeCam = propsRef.current.viewMode === '2d' ? orthoCam : perspCam;
      if (propsRef.current.viewMode === '3d') {
        controls.update();
      }
      renderer.render(scene, activeCam);
    };

    const scheduleNext = () => {
      if (disposed) return;
      const shouldAnimate =
        propsRef.current.simState.flow.active ||
        propsRef.current.rubAnimPhase > 0 ||
        dirty;
      dirty = false;

      if (shouldAnimate) {
        if (isSoftwareGl) {
          timerId = window.setTimeout(() => {
            rafId = requestAnimationFrame(loop);
          }, 95);
        } else {
          rafId = requestAnimationFrame(loop);
        }
      }
    };

    const loop = () => {
      if (disposed) return;
      drawFrame();
      scheduleNext();
    };

    const requestRender = () => {
      if (disposed) return;
      dirty = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      rafId = requestAnimationFrame(loop);
    };
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 640;
      perspCam.aspect = w / h;
      perspCam.updateProjectionMatrix();
      const asp = w / h;
      orthoCam.left = (-frustumH * asp) / 2;
      orthoCam.right = (frustumH * asp) / 2;
      orthoCam.top = frustumH / 2;
      orthoCam.bottom = -frustumH / 2;
      orthoCam.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    // Initial render
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      envTex.dispose();
      pmrem.dispose();
      plusTex.dispose();
      minusTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#050811] cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Conservation of Electric Charge Laboratory"
    />
  );
};
