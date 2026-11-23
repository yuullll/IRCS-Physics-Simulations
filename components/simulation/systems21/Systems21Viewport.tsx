'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Systems21Evaluation,
  Systems21Params,
  evaluateRodLambda,
} from '@/lib/physics/systems-com-2-1';

export interface Systems21ViewportProps {
  params: Systems21Params;
  evaluation: Systems21Evaluation;
  viewMode: '3d' | '2d';
  showSymmetryGuides: boolean;
  showSingleObjectModel: boolean;
  showTrailsAndVectors: boolean;
}

const COM_AMBER = 0xf59e0b;
const EMERALD_MAIN = 0x10b981;
const SKY_PART = 0x38bdf8;
const ROSE_PART = 0xf43f5e;
const SLATE_FRAME = 0x94a3b8;

function makeMiniTagSprite(text: string, borderHex: string, textHex = '#f8fafc'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d')!;
  const font = 'bold 23px ui-monospace, SFMono-Regular, Menlo, monospace';
  measureCtx.font = font;
  const measuredW = measureCtx.measureText(text).width;
  const w = Math.max(110, Math.min(400, Math.ceil(measuredW + 34)));
  const h = 54;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(5, 16, 13, 0.94)';
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.roundRect(5, 5, w - 10, h - 10, 11);
  ctx.fill();
  ctx.stroke();

  ctx.font = font;
  ctx.fillStyle = textHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  const heightWorld = 0.23;
  sprite.scale.set((w / h) * heightWorld, heightWorld, 1);
  sprite.renderOrder = 25;
  return sprite;
}

function createStyledArrow(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.028,
  headRadius = 0.075,
  headLength = 0.19
): THREE.Group {
  const group = new THREE.Group();
  const safeLen = Math.max(0.14, length);
  const clampedHead = Math.min(headLength, safeLen * 0.45);
  const shaftLen = Math.max(0.02, safeLen - clampedHead);

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.42,
    roughness: 0.28,
    metalness: 0.25,
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 10),
    mat
  );
  shaft.position.y = shaftLen * 0.5;
  group.add(shaft);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(headRadius, clampedHead, 12),
    mat
  );
  head.position.y = shaftLen + clampedHead * 0.5;
  group.add(head);

  const unit = dir.clone().normalize();
  if (unit.lengthSq() > 0.0001) {
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
  }
  group.position.copy(origin);
  return group;
}

/** Composite 4-part calibrated laboratory mass weight (Primary cylinder, beveled base, brass collar, top knob) */
function createCompositeLabMass(
  radius: number,
  colorHex: number,
  isHighlighted = false
): THREE.Group {
  const grp = new THREE.Group();
  const h = radius * 1.45;

  // 1. Matte beveled base plinth
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.06, radius * 1.14, h * 0.18, 22),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.35,
    })
  );
  base.position.y = -h * 0.42;
  grp.add(base);

  // 2. Primary colored machined body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius, h * 0.76, 24),
    new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: isHighlighted ? 0.42 : 0.24,
      roughness: 0.3,
      metalness: 0.42,
    })
  );
  grp.add(body);

  // 3. Machined brushed metallic rim collar
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.99, radius * 0.075, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.88,
    })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = h * 0.36;
  grp.add(collar);

  // 4. Calibrated top lifting knob
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.28, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.22,
      metalness: 0.78,
    })
  );
  knob.position.y = h * 0.52;
  grp.add(knob);

  return grp;
}

/** Composite 3-part glowing amber Center-of-Mass crosshair beacon */
function createComBeacon(scale = 1.0, showPointMassShell = false): THREE.Group {
  const grp = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.14 * scale, 20, 16),
    new THREE.MeshStandardMaterial({
      color: COM_AMBER,
      emissive: COM_AMBER,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.35,
    })
  );
  grp.add(core);

  const ringXY = new THREE.Mesh(
    new THREE.TorusGeometry(0.24 * scale, 0.022 * scale, 10, 32),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: COM_AMBER,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.7,
    })
  );
  grp.add(ringXY);

  const barMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
  const barX = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale, 0.025 * scale, 0.025 * scale), barMat);
  const barY = new THREE.Mesh(new THREE.BoxGeometry(0.025 * scale, 0.62 * scale, 0.025 * scale), barMat);
  grp.add(barX, barY);

  if (showPointMassShell) {
    // 2.1.B.4 / 2.1.A.2 Single-object equivalent mass aura
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.46 * scale, 24, 18),
      new THREE.MeshStandardMaterial({
        color: COM_AMBER,
        emissive: COM_AMBER,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    grp.add(shell);
  }

  return grp;
}

function createDashedPolyline(
  pts: THREE.Vector3[],
  colorHex: number,
  opacity = 0.8,
  dashSize = 0.14,
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

function createHelicalSpring(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  coils = 9,
  radius = 0.14
): THREE.Mesh {
  const dir = p2.clone().sub(p1);
  const len = Math.max(0.3, dir.length());
  const pts: THREE.Vector3[] = [];
  const totalSamples = coils * 10;
  for (let i = 0; i <= totalSamples; i++) {
    const u = i / totalSamples;
    const angle = u * coils * Math.PI * 2;
    const taper = Math.min(1, u * 10, (1 - u) * 10);
    pts.push(
      new THREE.Vector3(
        u * len,
        Math.cos(angle) * radius * taper,
        Math.sin(angle) * radius * taper
      )
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, totalSamples, 0.024, 8, false);
  const mesh = new THREE.Mesh(
    tube,
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.88,
    })
  );
  mesh.position.copy(p1);
  return mesh;
}

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse(child => {
    const anyChild = child as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (anyChild.geometry) anyChild.geometry.dispose();
    if (anyChild.material) {
      const mats = Array.isArray(anyChild.material)
        ? anyChild.material
        : [anyChild.material];
      for (const m of mats) {
        const mapMat = m as unknown as { map?: THREE.Texture };
        if (mapMat.map) mapMat.map.dispose();
        m.dispose();
      }
    }
  });
}

export const Systems21Viewport: React.FC<Systems21ViewportProps> = props => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<Systems21ViewportProps>(props);
  const rebuildRef = useRef<(() => void) | null>(null);
  const setCameraViewRef = useRef<((mode: '3d' | '2d', simMode: Systems21Params['mode']) => void) | null>(null);

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 800;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b09);
    scene.fog = new THREE.FogExp2(0x040b09, 0.026);

    const perspCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    perspCamera.position.set(2.4, 3.3, 7.6);

    const frustumSize = 7.4;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    orthoCamera.position.set(0, 0.05, 12);
    orthoCamera.lookAt(0, 0.05, 0);

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

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Warm key + cool Hemisphere fill + subtle emerald rim
    const hemi = new THREE.HemisphereLight(0xa7f3d0, 0x05110d, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4d8, 1.38);
    keyLight.position.set(6, 9, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 0.65);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    // Laboratory reference bench floor & subtle grid
    const floorGroup = new THREE.Group();
    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(38, 38),
      new THREE.MeshStandardMaterial({
        color: 0x06120e,
        roughness: 0.92,
        metalness: 0.06,
      })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -2.28;
    floorGroup.add(floorPlane);

    const gridHelper = new THREE.GridHelper(32, 32, 0x164e3d, 0x0b241c);
    gridHelper.position.y = -2.25;
    floorGroup.add(gridHelper);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(2, 10, 8, 0.78)');
    grad.addColorStop(1, 'rgba(2, 10, 8, 0.0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 32),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.22;
    floorGroup.add(contactShadow);
    scene.add(floorGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.target.set(0, 0.05, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.6;
    controls.maxDistance = 17;
    controls.update();

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
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
        if (activeCamera === perspCamera) controls.update();
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

    const setCameraView = (mode: '3d' | '2d', simMode: Systems21Params['mode']) => {
      if (mode === '2d') {
        activeCamera = orthoCamera;
        controls.enabled = false;
        floorGroup.visible = false;
        if (simMode === 'system_dynamics') {
          orthoCamera.position.set(0, 0.45, 12);
          orthoCamera.lookAt(0, 0.45, 0);
        } else {
          orthoCamera.position.set(0, 0.05, 12);
          orthoCamera.lookAt(0, 0.05, 0);
        }
      } else {
        activeCamera = perspCamera;
        controls.enabled = true;
        floorGroup.visible = true;
        if (simMode === 'discrete_com') {
          perspCamera.position.set(2.1, 2.7, 8.2);
          controls.target.set(0, -0.05, 0);
        } else if (simMode === 'continuous_rod') {
          perspCamera.position.set(0.35, 2.35, 8.6);
          controls.target.set(0, -0.05, 0);
        } else if (simMode === 'composite_2d') {
          perspCamera.position.set(2.2, 2.1, 7.2);
          controls.target.set(0, 0.0, 0);
        } else {
          perspCamera.position.set(0.45, 1.9, 10.2);
          controls.target.set(0, 0.35, 0);
        }
        controls.update();
      }
      requestRender();
    };
    setCameraViewRef.current = setCameraView;

    const rebuildScene = () => {
      while (dynamicGroup.children.length > 0) {
        const ch = dynamicGroup.children[0];
        dynamicGroup.remove(ch);
        disposeObject3D(ch);
      }

      const {
        params,
        evaluation,
        showSymmetryGuides,
        showSingleObjectModel,
        showTrailsAndVectors,
      } = propsRef.current;

      // =====================================================================
      // MODE 1: DISCRETE POINT MASSES & SYMMETRY
      // =====================================================================
      if (params.mode === 'discrete_com') {
        // Laboratory coordinate frame board in XY plane
        const board = new THREE.Mesh(
          new THREE.BoxGeometry(5.6, 4.0, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0x091c16,
            roughness: 0.84,
            metalness: 0.14,
          })
        );
        board.position.z = -0.22;
        dynamicGroup.add(board);

        const boardEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(5.6, 4.0, 0.08)),
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.35 })
        );
        boardEdges.position.z = -0.22;
        dynamicGroup.add(boardEdges);

        // X and Y coordinate axes on board
        dynamicGroup.add(
          createDashedPolyline(
            [new THREE.Vector3(-2.6, 0, -0.16), new THREE.Vector3(2.6, 0, -0.16)],
            0x34d399,
            0.45,
            0.12,
            0.08
          )
        );
        dynamicGroup.add(
          createDashedPolyline(
            [new THREE.Vector3(0, -1.85, -0.16), new THREE.Vector3(0, 1.85, -0.16)],
            0x34d399,
            0.45,
            0.12,
            0.08
          )
        );

        const comPos = new THREE.Vector3(evaluation.xComM, evaluation.yComM, 0.02);

        // Mass nodes & light structural truss connecting to COM
        params.masses.forEach((m, idx) => {
          const hexNum =
            idx === 0 ? EMERALD_MAIN : idx === 1 ? SKY_PART : ROSE_PART;
          const r = 0.18 + Math.cbrt(Math.max(0.5, m.massKg)) * 0.12;
          const pos = new THREE.Vector3(m.xM, m.yM, 0.02);

          if (!showSingleObjectModel) {
            const weightMesh = createCompositeLabMass(r, hexNum);
            weightMesh.rotation.x = Math.PI / 2;
            weightMesh.position.copy(pos);
            dynamicGroup.add(weightMesh);

            const tag = makeMiniTagSprite(
              `${m.label}=${m.massKg.toFixed(1)}kg`,
              m.colorHex
            );
            tag.position.set(m.xM, m.yM + r + 0.28, 0.18);
            dynamicGroup.add(tag);

            // Dashed lever arm connecting constituent mass to COM
            if (showTrailsAndVectors) {
              dynamicGroup.add(
                createDashedPolyline([pos, comPos], hexNum, 0.6, 0.1, 0.07)
              );
            }
          } else {
            // Ghosted constituent outlines when Single-Object COM Model is toggled on
            const ghost = new THREE.Mesh(
              new THREE.SphereGeometry(r * 0.9, 16, 12),
              new THREE.MeshBasicMaterial({
                color: hexNum,
                wireframe: true,
                transparent: true,
                opacity: 0.35,
              })
            );
            ghost.position.copy(pos);
            dynamicGroup.add(ghost);
          }
        });

        // Symmetry line highlight (2.1.B.1)
        if (showSymmetryGuides && evaluation.isOnSymmetryAxis) {
          if (Math.abs(evaluation.xComM) < 0.05) {
            dynamicGroup.add(
              createDashedPolyline(
                [new THREE.Vector3(0, -1.95, 0.06), new THREE.Vector3(0, 1.95, 0.06)],
                COM_AMBER,
                0.85,
                0.15,
                0.08
              )
            );
          }
          if (Math.abs(evaluation.yComM) < 0.05) {
            dynamicGroup.add(
              createDashedPolyline(
                [new THREE.Vector3(-2.65, 0, 0.06), new THREE.Vector3(2.65, 0, 0.06)],
                COM_AMBER,
                0.85,
                0.15,
                0.08
              )
            );
          }
        }

        // Center-of-mass beacon
        const comBeacon = createComBeacon(1.05, showSingleObjectModel);
        comBeacon.position.copy(comPos);
        dynamicGroup.add(comBeacon);

        const comTag = makeMiniTagSprite(
          showSingleObjectModel
            ? `M=${evaluation.totalMassKg.toFixed(1)}kg at COM`
            : `COM (${evaluation.xComM.toFixed(2)}, ${evaluation.yComM.toFixed(2)})`,
          '#f59e0b',
          '#fde68a'
        );
        comTag.position.set(
          Math.max(-1.85, Math.min(1.85, evaluation.xComM)),
          evaluation.yComM - 0.52,
          0.25
        );
        dynamicGroup.add(comTag);
      }

      // =====================================================================
      // MODE 2: CONTINUOUS NONUNIFORM ROD (∫ r dm / ∫ dm)
      // =====================================================================
      else if (params.mode === 'continuous_rod') {
        const L = params.rodLengthM;
        const visLen = 3.6;
        const scaleX = visLen / L;
        const xStart = -visLen * 0.5;

        // Compute max lambda for smooth density color & radius modulation
        let maxLam = 0.5;
        for (const s of evaluation.rodSlices) {
          if (s.lambdaKgPerM > maxLam) maxLam = s.lambdaKgPerM;
        }

        // Render N differential slices dm = λ(x) dx
        const colLow = new THREE.Color(0x065f46);
        const colHigh = new THREE.Color(0xf43f5e);
        const midSliceIdx = Math.floor(evaluation.rodSlices.length * 0.62);

        evaluation.rodSlices.forEach((s, idx) => {
          const frac = Math.min(1, s.lambdaKgPerM / maxLam);
          const sliceColor = colLow.clone().lerp(colHigh, frac);
          const sliceLenVis = Math.max(0.03, s.dxM * scaleX - 0.012);
          const sliceRadius = 0.16 + frac * 0.22;
          const xVis = xStart + s.xCenterM * scaleX;
          const isFocusDm = idx === midSliceIdx;

          const sliceMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(sliceRadius, sliceRadius, sliceLenVis, 20),
            new THREE.MeshStandardMaterial({
              color: isFocusDm ? SKY_PART : sliceColor,
              emissive: isFocusDm ? SKY_PART : sliceColor,
              emissiveIntensity: isFocusDm ? 0.55 : 0.22,
              roughness: 0.32,
              metalness: 0.45,
              transparent: showSingleObjectModel,
              opacity: showSingleObjectModel ? 0.28 : 1.0,
            })
          );
          sliceMesh.rotation.z = Math.PI / 2;
          sliceMesh.position.set(xVis, 0.15, 0);
          dynamicGroup.add(sliceMesh);

          if (isFocusDm && showTrailsAndVectors) {
            const dmTag = makeMiniTagSprite(
              `dm = λdx (${s.dmKg.toFixed(2)}kg)`,
              '#38bdf8',
              '#e0f2fe'
            );
            dmTag.position.set(xVis, 0.15 + sliceRadius + 0.42, 0.15);
            dynamicGroup.add(dmTag);
          }
        });

        // End caps showing x = 0 and x = L
        const endCapMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.2,
          metalness: 0.85,
        });
        for (const [ex, lbl] of [
          [xStart, 'x=0'],
          [xStart + visLen, `x=${L.toFixed(1)}m`],
        ] as [number, string][]) {
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), endCapMat);
          cap.rotation.z = Math.PI / 2;
          cap.position.set(ex, 0.15, 0);
          dynamicGroup.add(cap);
          const lblTag = makeMiniTagSprite(lbl, '#64748b');
          lblTag.position.set(ex, -0.58, 0);
          dynamicGroup.add(lblTag);
        }

        // Uniform midpoint L/2 reference marker
        if (showSymmetryGuides) {
          dynamicGroup.add(
            createDashedPolyline(
              [new THREE.Vector3(0, -0.75, 0), new THREE.Vector3(0, 1.05, 0)],
              SLATE_FRAME,
              0.65,
              0.1,
              0.08
            )
          );
          const midTag = makeMiniTagSprite('L/2', '#94a3b8');
          midTag.position.set(0, 1.18, 0);
          dynamicGroup.add(midTag);
        }

        // Triangular laboratory fulcrum knife-edge positioned exactly under x_cm
        const comXVis = xStart + evaluation.xComM * scaleX;
        const lamCom = evaluateRodLambda(
          evaluation.xComM,
          L,
          params.rodProfile,
          params.baseDensityKgPerM,
          params.gradientCoeff
        );
        const rAtCom = 0.16 + Math.min(1, lamCom / maxLam) * 0.22;

        const fulcrum = new THREE.Mesh(
          new THREE.ConeGeometry(0.32, 0.72, 3),
          new THREE.MeshStandardMaterial({
            color: COM_AMBER,
            emissive: COM_AMBER,
            emissiveIntensity: 0.32,
            roughness: 0.3,
            metalness: 0.6,
          })
        );
        fulcrum.position.set(comXVis, 0.15 - rAtCom - 0.36, 0);
        dynamicGroup.add(fulcrum);

        const comBeacon = createComBeacon(0.95, showSingleObjectModel);
        comBeacon.position.set(comXVis, 0.15, 0.06);
        dynamicGroup.add(comBeacon);

        const comTag = makeMiniTagSprite(
          `Balance x_cm=${evaluation.xComM.toFixed(2)}m`,
          '#f59e0b',
          '#fde68a'
        );
        comTag.position.set(comXVis, -1.12, 0.15);
        dynamicGroup.add(comTag);
      }

      // =====================================================================
      // MODE 3: 2D COMPOSITE PLATE & CUTOUT LAMINA
      // =====================================================================
      else if (params.mode === 'composite_2d') {
        const S = params.plateSizeM;
        const scale = 2.8 / Math.max(1.2, S);
        const visS = S * scale;
        const half = visS * 0.5;
        const depth = 0.22;

        const plateMat = new THREE.MeshStandardMaterial({
          color: 0x0d9488,
          emissive: 0x064e3b,
          emissiveIntensity: 0.28,
          roughness: 0.34,
          metalness: 0.45,
          transparent: showSingleObjectModel,
          opacity: showSingleObjectModel ? 0.25 : 0.94,
        });

        let plateGeo: THREE.ExtrudeGeometry;
        if (params.plateGeometry === 'disk_hole') {
          const R = half;
          const rHole = R * 0.45;
          const holeX = params.holeOffsetFrac * (R - rHole - 0.05 * scale);
          const shape = new THREE.Shape();
          shape.absarc(0, 0, R, 0, Math.PI * 2, false);
          const holePath = new THREE.Path();
          holePath.absarc(holeX, 0, rHole, 0, Math.PI * 2, true);
          shape.holes.push(holePath);
          plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2,
            curveSegments: 36,
          });
          // Mark cutout center
          if (showTrailsAndVectors) {
            const holeRing = new THREE.Mesh(
              new THREE.TorusGeometry(rHole, 0.024, 8, 32),
              new THREE.MeshBasicMaterial({ color: ROSE_PART })
            );
            holeRing.position.set(holeX, 0, depth * 0.5 + 0.04);
            dynamicGroup.add(holeRing);
            const hTag = makeMiniTagSprite('Cutout (−m)', '#fb7185');
            hTag.position.set(holeX, -rHole - 0.34, 0.22);
            dynamicGroup.add(hTag);
          }
        } else if (params.plateGeometry === 'l_bracket') {
          const t = visS * 0.35;
          const shape = new THREE.Shape();
          shape.moveTo(-half, -half);
          shape.lineTo(half, -half);
          shape.lineTo(half, -half + t);
          shape.lineTo(-half + t, -half + t);
          shape.lineTo(-half + t, half);
          shape.lineTo(-half, half);
          shape.closePath();
          plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2,
          });
        } else if (params.plateGeometry === 't_beam') {
          const topH = visS * 0.28;
          const stemW = visS * 0.28;
          const shape = new THREE.Shape();
          shape.moveTo(-stemW * 0.5, -half);
          shape.lineTo(stemW * 0.5, -half);
          shape.lineTo(stemW * 0.5, half - topH);
          shape.lineTo(half, half - topH);
          shape.lineTo(half, half);
          shape.lineTo(-half, half);
          shape.lineTo(-half, half - topH);
          shape.lineTo(-stemW * 0.5, half - topH);
          shape.closePath();
          plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2,
          });
        } else {
          const shape = new THREE.Shape();
          shape.moveTo(-half, -half);
          shape.lineTo(half, -half);
          shape.lineTo(-half, half);
          shape.closePath();
          plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
            bevelSegments: 2,
          });
        }
        plateGeo.translate(0, 0, -depth * 0.5);
        const plateMesh = new THREE.Mesh(plateGeo, plateMat);
        dynamicGroup.add(plateMesh);

        // Symmetry axis line (EK 2.1.B.1)
        if (showSymmetryGuides) {
          let pA = new THREE.Vector3(-1.95, 0, 0.16);
          let pB = new THREE.Vector3(1.95, 0, 0.16);
          if (params.plateGeometry === 't_beam') {
            pA = new THREE.Vector3(0, -1.85, 0.16);
            pB = new THREE.Vector3(0, 1.85, 0.16);
          } else if (
            params.plateGeometry === 'l_bracket' ||
            params.plateGeometry === 'right_triangle'
          ) {
            pA = new THREE.Vector3(-1.65, -1.65, 0.16);
            pB = new THREE.Vector3(1.65, 1.65, 0.16);
          }
          dynamicGroup.add(createDashedPolyline([pA, pB], 0x34d399, 0.8, 0.14, 0.08));
        }

        // Sub-part centroids
        if (showTrailsAndVectors) {
          evaluation.plateParts.forEach(pt => {
            if (pt.isCutout) return;
            const dot = new THREE.Mesh(
              new THREE.SphereGeometry(0.08, 12, 10),
              new THREE.MeshBasicMaterial({ color: SKY_PART })
            );
            dot.position.set(pt.xM * scale, pt.yM * scale, depth * 0.5 + 0.06);
            dynamicGroup.add(dot);
          });
        }

        // Center-of-mass beacon
        const comPos = new THREE.Vector3(
          evaluation.xComM * scale,
          evaluation.yComM * scale,
          depth * 0.5 + 0.12
        );
        const comBeacon = createComBeacon(1.0, showSingleObjectModel);
        comBeacon.position.copy(comPos);
        dynamicGroup.add(comBeacon);

        const comTag = makeMiniTagSprite(
          `COM (${evaluation.xComM.toFixed(2)}, ${evaluation.yComM.toFixed(2)})`,
          '#f59e0b',
          '#fde68a'
        );
        comTag.position.set(comPos.x, comPos.y + 0.52, 0.34);
        dynamicGroup.add(comTag);
      }

      // =====================================================================
      // MODE 4: DYNAMIC MULTI-OBJECT SYSTEM (LO 2.1.A & EK 2.1.B.4)
      // =====================================================================
      else if (evaluation.dynamics) {
        const dyn = evaluation.dynamics;
        const p1Pos = new THREE.Vector3(dyn.part1.x, dyn.part1.y, 0);
        const p2Pos = new THREE.Vector3(dyn.part2.x, dyn.part2.y, 0);
        const comPos = new THREE.Vector3(dyn.comX, dyn.comY, 0.06);

        // Frictionless rail for spring_carts scenario
        if (params.dynamicsScenario === 'spring_carts') {
          const track = new THREE.Mesh(
            new THREE.BoxGeometry(7.2, 0.14, 0.8),
            new THREE.MeshStandardMaterial({
              color: 0x0f2922,
              roughness: 0.6,
              metalness: 0.45,
            })
          );
          track.position.set(0, -0.42, 0);
          dynamicGroup.add(track);
        }

        // Trajectories (smooth amber COM path vs constituent paths)
        if (showTrailsAndVectors) {
          const comPts = dyn.comTrail.map(p => new THREE.Vector3(p.x, p.y, 0.05));
          dynamicGroup.add(createDashedPolyline(comPts, COM_AMBER, 0.95, 0.15, 0.07));

          if (!showSingleObjectModel) {
            const p1Pts = dyn.part1Trail.map(p => new THREE.Vector3(p.x, p.y, -0.02));
            const p2Pts = dyn.part2Trail.map(p => new THREE.Vector3(p.x, p.y, -0.02));
            dynamicGroup.add(createDashedPolyline(p1Pts, EMERALD_MAIN, 0.55, 0.09, 0.09));
            dynamicGroup.add(createDashedPolyline(p2Pts, ROSE_PART, 0.55, 0.09, 0.09));
          }
        }

        // Internal coupling (rigid baton rod or helical spring)
        if (!showSingleObjectModel) {
          if (params.dynamicsScenario === 'tossed_baton') {
            const rodVec = p2Pos.clone().sub(p1Pos);
            const rodLen = Math.max(0.1, rodVec.length());
            const rod = new THREE.Mesh(
              new THREE.CylinderGeometry(0.05, 0.05, rodLen, 12),
              new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                roughness: 0.28,
                metalness: 0.78,
              })
            );
            rod.position.copy(p1Pos).addScaledVector(rodVec, 0.5);
            rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rodVec.normalize());
            dynamicGroup.add(rod);
          } else if (params.dynamicsScenario === 'spring_carts') {
            dynamicGroup.add(createHelicalSpring(p1Pos, p2Pos, 9, 0.14));
            // External pulling force arrow on Cart 2
            if (Math.abs(params.externalForceN) > 0.1) {
              const fDir = new THREE.Vector3(Math.sign(params.externalForceN), 0, 0);
              const fLen = 0.45 + Math.min(0.9, Math.abs(params.externalForceN) * 0.08);
              dynamicGroup.add(
                createStyledArrow(
                  p2Pos.clone().add(new THREE.Vector3(0.32 * Math.sign(params.externalForceN), 0, 0)),
                  fDir,
                  fLen,
                  SKY_PART
                )
              );
              const fTag = makeMiniTagSprite(
                `F_ext=${params.externalForceN.toFixed(1)}N`,
                '#38bdf8'
              );
              fTag.position.set(p2Pos.x + 0.78 * Math.sign(params.externalForceN), 0.48, 0.1);
              dynamicGroup.add(fTag);
            }
          }

          // Constituent bodies
          const r1 = 0.24;
          const r2 = 0.24 * Math.cbrt(Math.max(0.4, params.massRatio));
          const m1Mesh = createCompositeLabMass(r1, EMERALD_MAIN, params.systemBoundary === 'part_only');
          m1Mesh.position.copy(p1Pos);
          dynamicGroup.add(m1Mesh);

          const m2Mesh = createCompositeLabMass(r2, ROSE_PART, false);
          m2Mesh.position.copy(p2Pos);
          dynamicGroup.add(m2Mesh);

          // Push constituent labels radially outward from COM to eliminate overlap during spin
          const rad1 = new THREE.Vector3(p1Pos.x - comPos.x, p1Pos.y - comPos.y, 0);
          if (rad1.lengthSq() < 0.01) rad1.set(0, -1, 0);
          else rad1.normalize();
          const rad2 = new THREE.Vector3(p2Pos.x - comPos.x, p2Pos.y - comPos.y, 0);
          if (rad2.lengthSq() < 0.01) rad2.set(0, 1, 0);
          else rad2.normalize();

          const tag1 = makeMiniTagSprite(`${dyn.part1.label} (${dyn.part1.massKg.toFixed(1)}kg)`, '#34d399');
          tag1.position.set(
            p1Pos.x + rad1.x * (r1 + 0.46),
            p1Pos.y + rad1.y * (r1 + 0.42) - 0.08,
            0.14
          );
          dynamicGroup.add(tag1);

          const tag2 = makeMiniTagSprite(`${dyn.part2.label} (${dyn.part2.massKg.toFixed(1)}kg)`, '#fb7185');
          tag2.position.set(
            p2Pos.x + rad2.x * (r2 + 0.46),
            p2Pos.y + rad2.y * (r2 + 0.42) + 0.08,
            0.14
          );
          dynamicGroup.add(tag2);
        }

        // System Boundary enclosure box (LO 2.1.A.3 / 2.1.A.5)
        if (showSymmetryGuides) {
          const boundMinX =
            params.systemBoundary === 'whole_system'
              ? Math.min(p1Pos.x, p2Pos.x) - 0.48
              : p1Pos.x - 0.46;
          const boundMaxX =
            params.systemBoundary === 'whole_system'
              ? Math.max(p1Pos.x, p2Pos.x) + 0.48
              : p1Pos.x + 0.46;
          const boundMinY =
            params.systemBoundary === 'whole_system'
              ? Math.min(p1Pos.y, p2Pos.y) - 0.48
              : p1Pos.y - 0.46;
          const boundMaxY =
            params.systemBoundary === 'whole_system'
              ? Math.max(p1Pos.y, p2Pos.y) + 0.48
              : p1Pos.y + 0.46;

          const bPts = [
            new THREE.Vector3(boundMinX, boundMinY, 0.08),
            new THREE.Vector3(boundMaxX, boundMinY, 0.08),
            new THREE.Vector3(boundMaxX, boundMaxY, 0.08),
            new THREE.Vector3(boundMinX, boundMaxY, 0.08),
            new THREE.Vector3(boundMinX, boundMinY, 0.08),
          ];
          dynamicGroup.add(
            createDashedPolyline(
              bPts,
              params.systemBoundary === 'whole_system' ? EMERALD_MAIN : SKY_PART,
              0.85,
              0.12,
              0.08
            )
          );
        }

        // Glowing Center-of-Mass beacon + velocity vector
        const comBeacon = createComBeacon(1.0, showSingleObjectModel);
        comBeacon.position.copy(comPos);
        dynamicGroup.add(comBeacon);

        if (showTrailsAndVectors) {
          const vVec = new THREE.Vector3(dyn.comVx, dyn.comVy, 0);
          const vMag = vVec.length();
          if (vMag > 0.15) {
            dynamicGroup.add(
              createStyledArrow(
                comPos,
                vVec.normalize(),
                Math.min(1.15, 0.35 + vMag * 0.08),
                COM_AMBER,
                0.024,
                0.068,
                0.17
              )
            );
          }
        }

        const comTag = makeMiniTagSprite('System COM', '#f59e0b', '#fde68a');
        const hasUpperMass =
          (p1Pos.y > comPos.y + 0.15 && Math.abs(p1Pos.x - comPos.x) < 0.65) ||
          (p2Pos.y > comPos.y + 0.15 && Math.abs(p2Pos.x - comPos.x) < 0.65);
        comTag.position.set(
          comPos.x + (hasUpperMass ? 0.85 : 0),
          comPos.y + (hasUpperMass ? 0.18 : 0.56),
          0.22
        );
        dynamicGroup.add(comTag);
      }

      requestRender();
    };

    rebuildRef.current = rebuildScene;
    rebuildScene();
    setCameraView(propsRef.current.viewMode, propsRef.current.params.mode);

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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      disposeObject3D(dynamicGroup);
      disposeObject3D(floorGroup);
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [
    props.params,
    props.evaluation,
    props.viewMode,
    props.showSymmetryGuides,
    props.showSingleObjectModel,
    props.showTrailsAndVectors,
  ]);

  useEffect(() => {
    setCameraViewRef.current?.(props.viewMode, props.params.mode);
  }, [props.viewMode, props.params.mode]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      data-testid="systems-21-canvas"
      aria-label="Interactive 3D Systems and Center of Mass Viewport"
    />
  );
};

export default Systems21Viewport;
