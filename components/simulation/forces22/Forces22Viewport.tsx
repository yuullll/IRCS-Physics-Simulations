'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BuilderAuditResult,
  Forces22Evaluation,
  Forces22Params,
  ForceVector22,
  getBuilderScenario,
} from '@/lib/physics/forces-fbd-2-2';

export interface Forces22ViewportProps {
  params: Forces22Params;
  evaluation: Forces22Evaluation;
  viewMode: '3d' | '2d';
  builderAudit: BuilderAuditResult | null;
}

const BG_DARK = 0x040b09;
const EMERALD_MAIN = 0x10b981;
const AMBER_GRAV = 0xf59e0b;
const SKY_NORMAL = 0x38bdf8;
const ROSE_FRIC = 0xfb7185;
const VIOLET_CONTACT = 0xa78bfa;
const SLATE_FRAME = 0x475569;

const DEG2RAD = Math.PI / 180;

function makeMiniTagSprite(
  text: string,
  borderHex: string,
  textHex = '#f8fafc',
  heightWorld = 0.22
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontPx = 24;
  if (ctx) {
    ctx.font = `700 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  }
  const measured = ctx ? ctx.measureText(text).width : text.length * 14;
  const padX = 16;
  const w = Math.max(88, Math.ceil(measured + padX * 2));
  const h = 42;
  canvas.width = w;
  canvas.height = h;
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(4, 15, 11, 0.93)';
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 3;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(r, 2);
    ctx.lineTo(w - r, 2);
    ctx.quadraticCurveTo(w - 2, 2, w - 2, r);
    ctx.lineTo(w - 2, h - r);
    ctx.quadraticCurveTo(w - 2, h - 2, w - r, h - 2);
    ctx.lineTo(r, h - 2);
    ctx.quadraticCurveTo(2, h - 2, 2, h - r);
    ctx.lineTo(2, r);
    ctx.quadraticCurveTo(2, 2, r, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = textHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 1);
  }

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
  sprite.scale.set((w / h) * heightWorld, heightWorld, 1);
  sprite.renderOrder = 25;
  return sprite;
}

function createStyledArrow(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.032,
  headRadius = 0.082,
  headLength = 0.21
): THREE.Group {
  const grp = new THREE.Group();
  const safeLen = Math.max(0.18, length);
  const actualHeadLen = Math.min(headLength, safeLen * 0.44);
  const shaftLen = Math.max(0.05, safeLen - actualHeadLen);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.42,
    roughness: 0.26,
    metalness: 0.2,
  });
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 12),
    mat
  );
  shaft.position.y = shaftLen * 0.5;
  grp.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(headRadius, actualHeadLen, 14), mat);
  head.position.y = shaftLen + actualHeadLen * 0.5;
  grp.add(head);

  grp.position.copy(origin);
  const unitDir = dir.clone().normalize();
  if (unitDir.lengthSq() > 0.001) {
    grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDir);
  }
  return grp;
}

function createDashedPolyline(
  pts: THREE.Vector3[],
  colorHex: number,
  opacity = 0.85,
  dashSize = 0.13,
  gapSize = 0.08
): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize,
    gapSize,
    transparent: true,
    opacity,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
}

/** Composite 5-part laboratory dynamics sled/block (primary anodized body, brass weight plate, machined trim, rubber feet) */
function createCompositeLabBlock(
  width: number,
  height: number,
  depth: number,
  accentHex: number,
  ghosted = false
): THREE.Group {
  const grp = new THREE.Group();
  const opacity = ghosted ? 0.2 : 1.0;

  // 1. Primary beveled anodized chassis
  const bodyMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: ghosted ? 0.06 : 0.14,
    roughness: 0.52,
    metalness: 0.22,
    transparent: ghosted,
    opacity,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.78, depth), bodyMat);
  body.position.y = height * 0.04;
  grp.add(body);

  // 2. Brushed aluminum top instrumentation plate (high metalness contrast)
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.2,
    metalness: 0.85,
    transparent: ghosted,
    opacity,
  });
  const topPlate = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.84, height * 0.14, depth * 0.84),
    plateMat
  );
  topPlate.position.y = height * 0.45;
  grp.add(topPlate);

  // 3. Matte dark rubber contact base pads (2 pads)
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
    metalness: 0.05,
    transparent: ghosted,
    opacity,
  });
  for (const sx of [-width * 0.32, width * 0.32]) {
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.24, height * 0.14, depth * 0.9),
      padMat
    );
    pad.position.set(sx, -height * 0.42, 0);
    grp.add(pad);
  }

  // 4. Brass center lifting stud
  const stud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.075, height * 0.16, 14),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.88,
      transparent: ghosted,
      opacity,
    })
  );
  stud.position.y = height * 0.56;
  grp.add(stud);

  // 5. Crisp perimeter wireframe rim for clean readability
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height * 0.78, depth)),
    new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: ghosted ? 0.22 : 0.4,
    })
  );
  edges.position.y = height * 0.04;
  grp.add(edges);

  return grp;
}

/** Prominent AP Physics Center-of-Mass Dot (EK 2.2.B.3) */
function createComDot(scale = 1.0): THREE.Group {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.11 * scale, 20, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: AMBER_GRAV,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.2,
    })
  );
  grp.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.175 * scale, 0.02 * scale, 10, 28),
    new THREE.MeshStandardMaterial({
      color: AMBER_GRAV,
      emissive: AMBER_GRAV,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.5,
    })
  );
  grp.add(ring);
  return grp;
}

/** Render all AP FBD force vectors originating from a COM dot with side-by-side parallel offsets */
function renderForceArrowsAtDot(
  parent: THREE.Group,
  comOrigin: THREE.Vector3,
  forces: ForceVector22[],
  flaggedIds: Set<string>,
  maxVisualLen = 1.65,
  minVisualLen = 0.65
) {
  const maxMag = Math.max(10, ...forces.map(f => f.magnitudeN));

  forces.forEach(f => {
    const rad = f.angleDeg * DEG2RAD;
    const dir = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0).normalize();
    // Perpendicular unit vector in XY plane for AP side-by-side collinear arrows
    const perp = new THREE.Vector3(-dir.y, dir.x, 0);
    const sideOffsetWorld = f.collinearSlotOffset * 0.24;
    const startPos = comOrigin.clone().addScaledVector(perp, sideOffsetWorld);
    startPos.z = comOrigin.z + 0.06;

    const len = minVisualLen + Math.min(1, f.magnitudeN / maxMag) * (maxVisualLen - minVisualLen);
    const isFlagged = flaggedIds.has(f.id);
    const hexNum = isFlagged
      ? 0xf43f5e
      : parseInt(f.colorHex.replace('#', ''), 16);

    parent.add(
      createStyledArrow(
        startPos,
        dir,
        len,
        hexNum,
        isFlagged ? 0.044 : 0.034,
        isFlagged ? 0.1 : 0.088,
        0.22
      )
    );

    // Compact label placed cleanly past arrowhead tip with extra lateral fan-out for side-by-side pairs
    const labelText =
      f.magnitudeN > 0.1 && !f.agent.startsWith('INVALID') && !f.agent.startsWith('External Environment')
        ? `${f.symbol} (${f.magnitudeN.toFixed(0)}N)`
        : isFlagged
        ? `✕ ${f.symbol}`
        : f.symbol;

    const tag = makeMiniTagSprite(
      labelText,
      isFlagged ? '#ef4444' : f.colorHex,
      isFlagged ? '#fecaca' : '#f8fafc',
      0.21
    );
    const extraPerp = f.collinearGroupSize > 1 ? f.collinearSlotOffset * 0.44 : 0;
    const tipPos = startPos
      .clone()
      .addScaledVector(dir, len + 0.28)
      .addScaledVector(perp, extraPerp);
    tipPos.z = comOrigin.z + 0.24;
    tag.position.copy(tipPos);
    parent.add(tag);
  });
}

/** Rotated coordinate axes triad centered at COM dot (EK 2.2.B.4) */
function renderCoordinateAxes(
  parent: THREE.Group,
  origin: THREE.Vector3,
  axisAngleDeg: number,
  axisLen = 1.95
) {
  const rad = axisAngleDeg * DEG2RAD;
  const ux = new THREE.Vector3(Math.cos(rad), Math.sin(rad), 0);
  const uy = new THREE.Vector3(-Math.sin(rad), Math.cos(rad), 0);

  const zPlane = origin.z - 0.04;
  const c = new THREE.Vector3(origin.x, origin.y, zPlane);

  parent.add(
    createDashedPolyline(
      [c.clone().addScaledVector(ux, -axisLen * 0.85), c.clone().addScaledVector(ux, axisLen)],
      EMERALD_MAIN,
      0.7,
      0.14,
      0.08
    )
  );
  parent.add(
    createDashedPolyline(
      [c.clone().addScaledVector(uy, -axisLen * 0.72), c.clone().addScaledVector(uy, axisLen * 0.9)],
      SKY_NORMAL,
      0.7,
      0.14,
      0.08
    )
  );

  const xTag = makeMiniTagSprite(
    Math.abs(axisAngleDeg) > 0.5 ? "+x'" : '+x',
    '#10b981',
    '#6ee7b7',
    0.19
  );
  xTag.position.copy(c.clone().addScaledVector(ux, axisLen + 0.25));
  xTag.position.z = origin.z + 0.16;
  parent.add(xTag);

  const yTag = makeMiniTagSprite(
    Math.abs(axisAngleDeg) > 0.5 ? "+y'" : '+y',
    '#38bdf8',
    '#bae6fd',
    0.19
  );
  yTag.position.copy(c.clone().addScaledVector(uy, axisLen * 0.9 + 0.24));
  yTag.position.z = origin.z + 0.16;
  parent.add(yTag);
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse(child => {
    if ((child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material;
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
}

export const Forces22Viewport: React.FC<Forces22ViewportProps> = ({
  params,
  evaluation,
  viewMode,
  builderAudit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ params, evaluation, viewMode, builderAudit });

  const rebuildRef = useRef<() => void>(() => {});
  const setCameraViewRef = useRef<(vm: '3d' | '2d', m: Forces22Params['mode']) => void>(() => {});

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
    scene.background = new THREE.Color(BG_DARK);
    scene.fog = new THREE.FogExp2(BG_DARK, 0.024);

    const perspCamera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    const frustumSize = 6.2;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    let activeCamera: THREE.Camera =
      propsRef.current.viewMode === '2d' ? orthoCamera : perspCamera;

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
    container.appendChild(renderer.domElement);

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
    }

    // Warm/cool 3-point laboratory studio rig (extra fill on software GL without PMREM)
    const hemi = new THREE.HemisphereLight(0xa7f3d0, 0x05140f, isSoftwareGl ? 1.25 : 0.85);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, isSoftwareGl ? 1.85 : 1.5);
    keyLight.position.set(5.5, 8.5, 6.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, isSoftwareGl ? 0.85 : 0.65);
    rimLight.position.set(-6.0, 4.0, -5.0);
    scene.add(rimLight);

    // Subtle grounded laboratory bench floor plane
    const floorGroup = new THREE.Group();
    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({
        color: 0x05110d,
        roughness: 0.92,
        metalness: 0.08,
      })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -2.25;
    floorGroup.add(floorPlane);

    const grid = new THREE.GridHelper(28, 28, 0x10b981, 0x0c241b);
    grid.position.y = -2.23;
    const gridMats = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.25;
    });
    floorGroup.add(grid);
    scene.add(floorGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.2;
    controls.maxDistance = 16;

    let frameId = 0;
    let disposed = false;
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
        if (activeCamera === perspCamera) {
          suppressControlChange = true;
          controls.update();
          suppressControlChange = false;
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

    const onControlsChange = () => {
      if (!suppressControlChange) requestRender();
    };
    controls.addEventListener('change', onControlsChange);

    const setCameraView = (
      vm: '3d' | '2d',
      simMode: Forces22Params['mode'],
      triggerRender = true
    ) => {
      if (vm === '2d') {
        activeCamera = orthoCamera;
        controls.enabled = false;
        floorGroup.visible = false;
        orthoCamera.position.set(0, 0.1, 12);
        orthoCamera.lookAt(0, 0.1, 0);
      } else {
        activeCamera = perspCamera;
        controls.enabled = true;
        floorGroup.visible = true;
        if (simMode === 'incline_axes') {
          perspCamera.position.set(1.15, 1.85, 9.65);
          controls.target.set(0, 0.05, 0);
        } else if (simMode === 'collinear_sidebyside') {
          perspCamera.position.set(1.0, 1.75, 9.2);
          controls.target.set(0, 0.05, 0);
        } else if (simMode === 'interaction_system') {
          perspCamera.position.set(0.85, 1.85, 9.6);
          controls.target.set(0.1, -0.1, 0);
        } else {
          perspCamera.position.set(0.8, 1.55, 9.2);
          controls.target.set(0, 0.05, 0);
        }
        suppressControlChange = true;
        controls.update();
        suppressControlChange = false;
      }
      if (triggerRender) requestRender();
    };
    setCameraViewRef.current = (vm, m) => setCameraView(vm, m, true);

    const rebuildScene = () => {
      while (dynamicGroup.children.length > 0) {
        const ch = dynamicGroup.children[0];
        dynamicGroup.remove(ch);
        disposeObject3D(ch);
      }

      const { params: p, evaluation: ev, builderAudit: audit } = propsRef.current;

      // =====================================================================
      // MODE 1: INCLINED PLANE & COORDINATE AXES (EK 2.2.B.1–2.2.B.4)
      // =====================================================================
      if (p.mode === 'incline_axes') {
        const thetaRad = p.inclineAngleDeg * DEG2RAD;
        const rampLen = 4.5;
        const rampBaseW = rampLen * Math.cos(thetaRad);
        const rampH = rampLen * Math.sin(thetaRad);

        // Ramp coordinate anchor (centered neatly in viewport)
        const rampGroup = new THREE.Group();
        const midX = 0;
        const midY = -0.35;

        // 1. Extruded triangular machined ramp wedge (when not in pure Dot Only mode)
        if (!p.showFbdDotOnly) {
          const shape = new THREE.Shape();
          shape.moveTo(-rampBaseW * 0.5, -rampH * 0.5);
          shape.lineTo(rampBaseW * 0.5, -rampH * 0.5);
          shape.lineTo(-rampBaseW * 0.5, rampH * 0.5);
          shape.closePath();

          const wedgeGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 1.15,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.025,
            bevelSegments: 2,
          });
          wedgeGeo.translate(0, 0, -0.575);
          const wedge = new THREE.Mesh(
            wedgeGeo,
            new THREE.MeshStandardMaterial({
              color: 0x0b261e,
              roughness: 0.68,
              metalness: 0.28,
            })
          );
          wedge.position.set(midX, midY, 0);
          rampGroup.add(wedge);

          // Brushed aluminum top sliding rail strip along hypotenuse
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(rampLen + 0.06, 0.06, 1.2),
            new THREE.MeshStandardMaterial({
              color: 0x94a3b8,
              roughness: 0.24,
              metalness: 0.85,
            })
          );
          rail.position.set(midX, midY + 0.02, 0);
          rail.rotation.z = -thetaRad;
          rampGroup.add(rail);

          // Protractor angle tag near right base corner
          const angleTag = makeMiniTagSprite(`θ = ${p.inclineAngleDeg}°`, '#10b981', '#6ee7b7', 0.2);
          angleTag.position.set(rampBaseW * 0.36, midY - rampH * 0.5 + 0.22, 0.65);
          rampGroup.add(angleTag);
        }
        dynamicGroup.add(rampGroup);

        // Compute block position on the ramp surface (with smooth slide offset)
        const slideS = ev.motionDisplacementM;
        const surfX = midX + slideS * Math.cos(thetaRad);
        const surfY = midY - slideS * Math.sin(thetaRad);
        const normX = Math.sin(thetaRad);
        const normY = Math.cos(thetaRad);
        const blockH = 0.56;
        const comPos = new THREE.Vector3(
          surfX + normX * (blockH * 0.52 + 0.05),
          surfY + normY * (blockH * 0.52 + 0.05),
          0
        );

        // Composite lab sled/block resting flush on ramp
        const block = createCompositeLabBlock(0.92, blockH, 0.72, EMERALD_MAIN, p.showFbdDotOnly);
        block.position.copy(comPos);
        block.rotation.z = -thetaRad;
        dynamicGroup.add(block);

        // Optional tow cable pulling up-ramp
        if (!p.showFbdDotOnly && p.tensionUpN > 0.2) {
          const upDir = new THREE.Vector3(-Math.cos(thetaRad), Math.sin(thetaRad), 0);
          const cableEnd = comPos.clone().addScaledVector(upDir, 1.75);
          dynamicGroup.add(createDashedPolyline([comPos, cableEnd], EMERALD_MAIN, 0.85, 0.08, 0.04));
        }

        // Bring FBD plane cleanly in front of the ramp front face (z = +0.66) so F_g is never occluded
        const fbdZ = 0.66;
        const fbdOrigin = new THREE.Vector3(comPos.x, comPos.y, fbdZ);

        // Subtle brass pin linking block center to front FBD plane
        const pin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, fbdZ, 10),
          new THREE.MeshStandardMaterial({ color: AMBER_GRAV, roughness: 0.3, metalness: 0.7 })
        );
        pin.rotation.x = Math.PI / 2;
        pin.position.set(comPos.x, comPos.y, fbdZ * 0.5);
        dynamicGroup.add(pin);

        // Rotated Coordinate Axes (2.2.B.4)
        renderCoordinateAxes(dynamicGroup, fbdOrigin, ev.axisAngleDeg, 1.95);

        // Center-of-mass dot (2.2.B.3)
        const dot = createComDot(1.0);
        dot.position.copy(fbdOrigin);
        dynamicGroup.add(dot);

        // Pure AP Free-Body Diagram force vectors originating on COM dot
        renderForceArrowsAtDot(
          dynamicGroup,
          fbdOrigin,
          ev.forces,
          new Set<string>(),
          1.55,
          0.62
        );

        // Optional OFF-EXAM Scratchpad Gravity Components (dashed violet projections)
        if (p.showScratchpadComponents) {
          const fgForce = ev.forces.find(f => f.id === 'fg');
          if (fgForce) {
            const maxMag = Math.max(10, ...ev.forces.map(f => f.magnitudeN));
            const fgLen = 0.62 + Math.min(1, fgForce.magnitudeN / maxMag) * (1.55 - 0.62);
            const sinLen = fgLen * Math.sin(thetaRad);
            const cosLen = fgLen * Math.cos(thetaRad);
            const downRamp = new THREE.Vector3(Math.cos(thetaRad), -Math.sin(thetaRad), 0);
            const intoRamp = new THREE.Vector3(-Math.sin(thetaRad), -Math.cos(thetaRad), 0);
            const orig = new THREE.Vector3(comPos.x, comPos.y, fbdZ + 0.04);
            const pPar = orig.clone().addScaledVector(downRamp, sinLen);
            const pPerp = orig.clone().addScaledVector(intoRamp, cosLen);
            const fgTip = orig.clone().add(new THREE.Vector3(0, -fgLen, 0));

            dynamicGroup.add(createDashedPolyline([orig, pPar], VIOLET_CONTACT, 0.95, 0.08, 0.05));
            dynamicGroup.add(createDashedPolyline([orig, pPerp], VIOLET_CONTACT, 0.95, 0.08, 0.05));
            dynamicGroup.add(createDashedPolyline([pPar, fgTip], VIOLET_CONTACT, 0.55, 0.06, 0.06));
            dynamicGroup.add(createDashedPolyline([pPerp, fgTip], VIOLET_CONTACT, 0.55, 0.06, 0.06));

            const compTag = makeMiniTagSprite(
              'Scratchpad: mg sinθ / cosθ',
              '#a78bfa',
              '#ddd6fe',
              0.19
            );
            compTag.position.set(pPerp.x - 0.6, pPerp.y - 0.16, fbdZ + 0.22);
            dynamicGroup.add(compTag);
          }
        }

        // Separate off-dot acceleration arrow in upper-left open sky (never overlapping docks or +y')
        if (ev.accelMagMps2 > 0.08) {
          const aRad = ev.accelAngleDeg * DEG2RAD;
          const aDir = new THREE.Vector3(Math.cos(aRad), Math.sin(aRad), 0);
          const aOrigin = new THREE.Vector3(-1.55, 1.55, fbdZ);
          dynamicGroup.add(createStyledArrow(aOrigin, aDir, 0.72, 0xfbbf24, 0.026, 0.07, 0.18));
          const aTag = makeMiniTagSprite(
            `a = ${ev.accelMagMps2.toFixed(1)} m/s² (off-dot)`,
            '#f59e0b',
            '#fde68a',
            0.19
          );
          aTag.position.set(aOrigin.x + 0.25, aOrigin.y + 0.34, fbdZ + 0.14);
          dynamicGroup.add(aTag);
        }
      }

      // =====================================================================
      // MODE 2: PARALLEL & STACKED FORCES (AP BOUNDARY STATEMENT SIDE-BY-SIDE)
      // =====================================================================
      else if (p.mode === 'collinear_sidebyside') {
        const disp = ev.motionDisplacementM;
        const comPos = new THREE.Vector3(
          p.collinearPreset === 'twin_pull_right' ? disp : 0,
          p.collinearPreset === 'double_cable_hoist' ? disp * 0.6 : 0,
          0
        );

        // Context apparatus (bench or hoist gantry)
        if (!p.showFbdDotOnly) {
          if (p.collinearPreset === 'double_cable_hoist') {
            // Overhead gantry beam + 2 parallel hoist cables
            const beam = new THREE.Mesh(
              new THREE.BoxGeometry(3.4, 0.18, 0.6),
              new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 })
            );
            beam.position.set(0, 2.05, 0);
            dynamicGroup.add(beam);

            for (const cx of [-0.26, 0.26]) {
              const cable = new THREE.Mesh(
                new THREE.CylinderGeometry(0.022, 0.022, Math.max(0.4, 2.05 - (comPos.y + 0.36)), 10),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 })
              );
              cable.position.set(comPos.x + cx, (2.05 + comPos.y + 0.36) * 0.5, 0);
              dynamicGroup.add(cable);
            }
          } else {
            // Flat brushed slate laboratory bench
            const bench = new THREE.Mesh(
              new THREE.BoxGeometry(5.2, 0.16, 1.35),
              new THREE.MeshStandardMaterial({ color: 0x0b261e, roughness: 0.65, metalness: 0.3 })
            );
            bench.position.set(0, -0.44, 0);
            dynamicGroup.add(bench);

            const railTop = new THREE.Mesh(
              new THREE.BoxGeometry(5.2, 0.04, 1.38),
              new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.26, metalness: 0.82 })
            );
            railTop.position.set(0, -0.35, 0);
            dynamicGroup.add(railTop);

            if (p.collinearPreset === 'downward_push') {
              // Mechanical lab press piston contacting top of block
              const pistonHead = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.12, 18),
                new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.65 })
              );
              pistonHead.position.set(comPos.x, 0.44, 0);
              const pistonRod = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 0.95, 14),
                new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.9 })
              );
              pistonRod.position.set(comPos.x, 0.95, 0);
              dynamicGroup.add(pistonHead, pistonRod);
            } else if (p.collinearPreset === 'twin_pull_right') {
              // Two parallel braided ropes pulling right
              for (const cy of [-0.14, 0.14]) {
                const rope = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.022, 0.022, 1.8, 10),
                  new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.45, metalness: 0.2 })
                );
                rope.rotation.z = Math.PI / 2;
                rope.position.set(comPos.x + 1.38, comPos.y + cy, 0);
                dynamicGroup.add(rope);
              }
            }
          }
        }

        const crate = createCompositeLabBlock(1.05, 0.68, 0.82, EMERALD_MAIN, p.showFbdDotOnly);
        crate.position.copy(comPos);
        dynamicGroup.add(crate);

        renderCoordinateAxes(dynamicGroup, comPos, 0, 2.0);

        const dot = createComDot(1.0);
        dot.position.set(comPos.x, comPos.y, 0.44);
        dynamicGroup.add(dot);

        // Render side-by-side collinear arrows (lateral slot spacing = 0.24 world units!)
        renderForceArrowsAtDot(
          dynamicGroup,
          new THREE.Vector3(comPos.x, comPos.y, 0.44),
          ev.forces,
          new Set<string>(),
          1.6,
          0.68
        );
      }

      // =====================================================================
      // MODE 3: INTERACTIONS & SYSTEM BOUNDARY (EK 2.2.A.1.i–ii & 2.2.A.2)
      // =====================================================================
      else if (p.mode === 'interaction_system') {
        const shiftX = ev.motionDisplacementM;
        const wA = 0.82 + Math.cbrt(p.massAKg) * 0.22;
        const wB = 0.72 + Math.cbrt(p.massBKg) * 0.22;
        const hBlock = 0.68;

        // Place touching blocks centered around origin + motion shift
        const totalW = wA + wB;
        const xA = shiftX - totalW * 0.5 + wA * 0.5;
        const xB = xA + wA * 0.5 + wB * 0.5 + 0.01;
        const yBlock = 0.02;

        // Smooth laboratory track
        if (!p.showFbdDotOnly) {
          const track = new THREE.Mesh(
            new THREE.BoxGeometry(5.8, 0.16, 1.4),
            new THREE.MeshStandardMaterial({ color: 0x0b261e, roughness: 0.65, metalness: 0.28 })
          );
          track.position.set(0, -0.44, 0);
          dynamicGroup.add(track);

          const trackSurface = new THREE.Mesh(
            new THREE.BoxGeometry(5.8, 0.04, 1.44),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.24, metalness: 0.82 })
          );
          trackSurface.position.set(0, -0.35, 0);
          dynamicGroup.add(trackSurface);

          // External actuator piston pushing left face of Block A
          const actShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.9, 12),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.88 })
          );
          actShaft.rotation.z = Math.PI / 2;
          actShaft.position.set(xA - wA * 0.5 - 0.52, yBlock, 0);
          const actPad = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.42, 0.48),
            new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, roughness: 0.35, metalness: 0.5 })
          );
          actPad.position.set(xA - wA * 0.5 - 0.05, yBlock, 0);
          dynamicGroup.add(actShaft, actPad);
        }

        const isAGhosted = p.showFbdDotOnly || p.systemSelection === 'block_b';
        const isBGhosted = p.showFbdDotOnly || p.systemSelection === 'block_a';

        const blockA = createCompositeLabBlock(wA, hBlock, 0.78, EMERALD_MAIN, isAGhosted);
        blockA.position.set(xA, yBlock, 0);
        dynamicGroup.add(blockA);

        const blockB = createCompositeLabBlock(wB, hBlock, 0.78, ROSE_FRIC, isBGhosted);
        blockB.position.set(xB, yBlock, 0);
        dynamicGroup.add(blockB);

        // Block identity labels offset cleanly to outer edges (never crossed by downward F_g)
        const tagA = makeMiniTagSprite(`A (${p.massAKg.toFixed(1)}kg)`, '#34d399', '#d1fae5', 0.19);
        tagA.position.set(xA - wA * 0.52, -0.78, 0.5);
        const tagB = makeMiniTagSprite(`B (${p.massBKg.toFixed(1)}kg)`, '#fb7185', '#ffe4e6', 0.19);
        tagB.position.set(xB + wB * 0.42, -0.78, 0.5);
        dynamicGroup.add(tagA, tagB);

        // Dashed System Boundary Enclosure Box (EK 2.2.A.1.ii / 2.2.B.2)
        const minBx =
          p.systemSelection === 'block_b' ? xB - wB * 0.5 - 0.12 : xA - wA * 0.5 - 0.12;
        const maxBx =
          p.systemSelection === 'block_a' ? xA + wA * 0.5 + 0.12 : xB + wB * 0.5 + 0.12;
        const minBy = yBlock - hBlock * 0.5 - 0.12;
        const maxBy = yBlock + hBlock * 0.5 + 0.16;

        const boundaryPts = [
          new THREE.Vector3(minBx, minBy, 0.52),
          new THREE.Vector3(maxBx, minBy, 0.52),
          new THREE.Vector3(maxBx, maxBy, 0.52),
          new THREE.Vector3(minBx, maxBy, 0.52),
          new THREE.Vector3(minBx, minBy, 0.52),
        ];
        dynamicGroup.add(
          createDashedPolyline(
            boundaryPts,
            p.systemSelection === 'whole_ab' ? EMERALD_MAIN : VIOLET_CONTACT,
            0.9,
            0.13,
            0.07
          )
        );

        // Choose COM dot location for the selected system (in front of track front face z=0.72)
        const comX =
          p.systemSelection === 'block_a'
            ? xA
            : p.systemSelection === 'block_b'
            ? xB
            : (p.massAKg * xA + p.massBKg * xB) / (p.massAKg + p.massBKg);
        const comOrigin = new THREE.Vector3(comX, yBlock, 0.74);

        const dot = createComDot(1.0);
        dot.position.copy(comOrigin);
        dynamicGroup.add(dot);

        // Render external FBD forces for the chosen system
        renderForceArrowsAtDot(dynamicGroup, comOrigin, ev.forces, new Set<string>(), 1.5, 0.65);

        // Microscopic interatomic electric force visualization (EK 2.2.A.2) offset cleanly right of F_g,A
        if (p.showMicroContact) {
          const seamX = (xA + wA * 0.5 + xB - wB * 0.5) * 0.5;
          const microX = seamX + 1.35;
          const microY = -1.36;

          // Dashed leader callout from the A-B touching interface to the magnifying lens
          dynamicGroup.add(
            createDashedPolyline(
              [new THREE.Vector3(seamX, yBlock - 0.12, 0.56), new THREE.Vector3(microX - 0.45, microY + 0.35, 0.56)],
              SKY_NORMAL,
              0.75,
              0.08,
              0.05
            )
          );

          const lensRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.52, 0.024, 10, 32),
            new THREE.MeshStandardMaterial({
              color: SKY_NORMAL,
              emissive: SKY_NORMAL,
              emissiveIntensity: 0.5,
            })
          );
          lensRing.position.set(microX, microY, 0.52);
          dynamicGroup.add(lensRing);

          // Two opposing atomic rows with interatomic electric repulsion springs
          const atomGeo = new THREE.SphereGeometry(0.055, 12, 10);
          const matA = new THREE.MeshStandardMaterial({ color: EMERALD_MAIN, emissive: EMERALD_MAIN, emissiveIntensity: 0.45 });
          const matB = new THREE.MeshStandardMaterial({ color: ROSE_FRIC, emissive: ROSE_FRIC, emissiveIntensity: 0.45 });
          for (const dy of [-0.21, 0, 0.21]) {
            const aAtom = new THREE.Mesh(atomGeo, matA);
            aAtom.position.set(microX - 0.18, microY + dy, 0.54);
            const bAtom = new THREE.Mesh(atomGeo, matB);
            bAtom.position.set(microX + 0.18, microY + dy, 0.54);
            dynamicGroup.add(aAtom, bAtom);
            dynamicGroup.add(
              createDashedPolyline(
                [new THREE.Vector3(microX - 0.11, microY + dy, 0.54), new THREE.Vector3(microX + 0.11, microY + dy, 0.54)],
                SKY_NORMAL,
                0.95,
                0.045,
                0.03
              )
            );
          }

          const microTag = makeMiniTagSprite(
            'Interatomic Electric Repulsion (2.2.A.2)',
            '#38bdf8',
            '#bae6fd',
            0.18
          );
          microTag.position.set(microX, microY - 0.72, 0.62);
          dynamicGroup.add(microTag);
        }
      }

      // =====================================================================
      // MODE 4: AP FBD BUILDER & AUDIT (1.A, 2.C, 3.B, 3.C)
      // =====================================================================
      else {
        const spec = getBuilderScenario(p.builderScenario);
        const comPos = new THREE.Vector3(0, 0.05, 0);

        // Subtle physical context silhouette so student knows the exact physical setup
        if (!p.showFbdDotOnly) {
          if (spec.surfaceType === 'incline') {
            const rad = spec.inclineDeg * DEG2RAD;
            const rampRail = new THREE.Mesh(
              new THREE.BoxGeometry(4.2, 0.07, 1.0),
              new THREE.MeshStandardMaterial({
                color: SLATE_FRAME,
                roughness: 0.5,
                metalness: 0.5,
                transparent: true,
                opacity: 0.55,
              })
            );
            rampRail.position.set(0, -0.35, -0.1);
            rampRail.rotation.z = -rad;
            dynamicGroup.add(rampRail);
          } else if (spec.surfaceType === 'wall') {
            const wall = new THREE.Mesh(
              new THREE.BoxGeometry(0.18, 3.2, 1.1),
              new THREE.MeshStandardMaterial({
                color: SLATE_FRAME,
                roughness: 0.7,
                metalness: 0.25,
                transparent: true,
                opacity: 0.65,
              })
            );
            wall.position.set(0.62, 0.05, -0.05);
            dynamicGroup.add(wall);
          } else if (spec.surfaceType === 'floor') {
            const fl = new THREE.Mesh(
              new THREE.BoxGeometry(4.4, 0.1, 1.1),
              new THREE.MeshStandardMaterial({
                color: SLATE_FRAME,
                roughness: 0.65,
                metalness: 0.35,
                transparent: true,
                opacity: 0.55,
              })
            );
            fl.position.set(0, -0.36, -0.05);
            dynamicGroup.add(fl);
          } else {
            // Elevator double cables ghost
            for (const cx of [-0.22, 0.22]) {
              const cab = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, 1.7, 10),
                new THREE.MeshStandardMaterial({ color: 0x64748b, transparent: true, opacity: 0.55 })
              );
              cab.position.set(cx, 1.25, -0.05);
              dynamicGroup.add(cab);
            }
          }
        }

        // Translucent object silhouette around the prominent COM dot
        const ghostBlock = createCompositeLabBlock(0.86, 0.62, 0.7, EMERALD_MAIN, true);
        ghostBlock.position.copy(comPos);
        if (spec.inclineDeg > 0) ghostBlock.rotation.z = -spec.inclineDeg * DEG2RAD;
        dynamicGroup.add(ghostBlock);

        renderCoordinateAxes(dynamicGroup, comPos, ev.axisAngleDeg, 2.0);

        const dot = createComDot(1.15);
        dot.position.set(comPos.x, comPos.y, 0.42);
        dynamicGroup.add(dot);

        // Identify flagged illegal vectors if audit was run
        const flaggedIds = new Set<string>();
        if (audit) {
          const illegalSyms = new Set(audit.illegalSelections.map(i => i.symbol));
          ev.forces.forEach(f => {
            if (illegalSyms.has(f.symbol)) flaggedIds.add(f.id);
          });
        }

        renderForceArrowsAtDot(
          dynamicGroup,
          new THREE.Vector3(comPos.x, comPos.y, 0.42),
          ev.forces,
          flaggedIds,
          1.62,
          0.72
        );
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
    propsRef.current = { params, evaluation, viewMode, builderAudit };
    rebuildRef.current();
  }, [params, evaluation, viewMode, builderAudit]);

  useEffect(() => {
    setCameraViewRef.current(viewMode, params.mode);
  }, [viewMode, params.mode]);

  return (
    <div
      ref={containerRef}
      data-testid="forces22-viewport"
      className="w-full h-full relative"
      aria-label="Interactive 3D Forces and Free-Body Diagrams Viewport"
    />
  );
};

export default Forces22Viewport;
