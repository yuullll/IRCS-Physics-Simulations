'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Gauss86Evaluation,
  Gauss86Params,
} from '@/lib/physics/gauss-law-8-6';

export interface Gauss86ViewportProps {
  params: Gauss86Params;
  evaluation: Gauss86Evaluation;
  viewMode: '3d' | '2d';
  showNormals: boolean;
  showFieldVectors: boolean;
  showChargeBody: boolean;
}

const FIELD_SKY = 0x38bdf8;
const NORMAL_AMBER = 0xf59e0b;
const GAUSS_EMERALD = 0x10b981;
const POS_CHARGE_ROSE = 0xf43f5e;
const NEG_CHARGE_CYAN = 0x0ea5e9;
const NEUTRAL_SLATE = 0x94a3b8;

function signToCssHex(sign: 'positive' | 'negative' | 'zero'): string {
  if (sign === 'positive') return '#34d399';
  if (sign === 'negative') return '#fb7185';
  return '#cbd5e1';
}

function signToThreeHex(sign: 'positive' | 'negative' | 'zero'): number {
  if (sign === 'positive') return GAUSS_EMERALD;
  if (sign === 'negative') return POS_CHARGE_ROSE;
  return NEUTRAL_SLATE;
}

function makeMiniTagSprite(text: string, borderHex: string, textHex = '#f8fafc'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d')!;
  const font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  measureCtx.font = font;
  const measuredW = measureCtx.measureText(text).width;
  const w = Math.max(120, Math.min(440, Math.ceil(measuredW + 38)));
  const h = 58;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(6, 12, 26, 0.94)';
  ctx.strokeStyle = borderHex;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(5, 5, w - 10, h - 10, 12);
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
  const heightWorld = 0.24;
  sprite.scale.set((w / h) * heightWorld, heightWorld, 1);
  sprite.renderOrder = 24;
  return sprite;
}

function createStyledArrow(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.028,
  headRadius = 0.078,
  headLength = 0.2,
  opacity = 1.0
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
    metalness: 0.22,
    transparent: opacity < 1,
    opacity,
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

function createDashedLine(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  colorHex: number,
  opacity = 0.55
): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineDashedMaterial({
    color: colorHex,
    dashSize: 0.12,
    gapSize: 0.08,
    transparent: true,
    opacity,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  return line;
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

function createCompositeChargeCore(
  radius: number,
  isPositive: boolean,
  isNeutral = false
): THREE.Group {
  const grp = new THREE.Group();
  const baseCol = isNeutral ? 0x64748b : isPositive ? POS_CHARGE_ROSE : NEG_CHARGE_CYAN;

  // Primary silhouette sphere
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 18),
    new THREE.MeshStandardMaterial({
      color: baseCol,
      emissive: baseCol,
      emissiveIntensity: isNeutral ? 0.12 : 0.55,
      roughness: 0.22,
      metalness: 0.3,
    })
  );
  grp.add(core);

  // Secondary equatorial metallic collar
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.24, radius * 0.09, 10, 28),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.85,
    })
  );
  ring.rotation.x = Math.PI / 2;
  grp.add(ring);

  // Accent translucent halo shell
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.42, 18, 14),
    new THREE.MeshStandardMaterial({
      color: baseCol,
      emissive: baseCol,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      roughness: 0.4,
    })
  );
  grp.add(halo);
  return grp;
}

export const Gauss86Viewport: React.FC<Gauss86ViewportProps> = props => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<Gauss86ViewportProps>(props);
  const rebuildRef = useRef<(() => void) | null>(null);
  const setCameraViewRef = useRef<((mode: '3d' | '2d', sym: Gauss86Params['symmetry']) => void) | null>(null);

  useEffect(() => {
    propsRef.current = props;
  });

  // Single mount lifecycle for WebGLRenderer, Scene, RoomEnvironment, and Controls
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
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.032);

    const perspCamera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    perspCamera.position.set(3.4, 2.55, 7.65);

    const frustumSize = 7.6;
    const aspect = width / height;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    orthoCamera.position.set(0, 0.1, 12);
    orthoCamera.lookAt(0, 0.1, 0);

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

    // Warm key + cool Hemisphere fill + sky rim
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff3d6, 1.35);
    keyLight.position.set(6, 9, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    // Laboratory reference floor grid & soft radial contact shadow disc
    const floorGroup = new THREE.Group();
    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 36),
      new THREE.MeshStandardMaterial({
        color: 0x070d1c,
        roughness: 0.92,
        metalness: 0.08,
      })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = -2.28;
    floorGroup.add(floorPlane);

    const gridHelper = new THREE.GridHelper(32, 32, 0x1e3a5f, 0x101c33);
    gridHelper.position.y = -2.25;
    floorGroup.add(gridHelper);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(2, 6, 16, 0.75)');
    grad.addColorStop(1, 'rgba(2, 6, 16, 0.0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.35, 32),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.23;
    floorGroup.add(contactShadow);
    scene.add(floorGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const controls = new OrbitControls(perspCamera, renderer.domElement);
    controls.target.set(0, 0.15, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.2;
    controls.maxDistance = 16;
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

    const setCameraView = (mode: '3d' | '2d', sym: Gauss86Params['symmetry']) => {
      if (mode === '2d') {
        activeCamera = orthoCamera;
        controls.enabled = false;
        floorGroup.visible = false;
        orthoCamera.position.set(0, 0.05, 12);
        orthoCamera.lookAt(0, 0.05, 0);
      } else {
        activeCamera = perspCamera;
        controls.enabled = true;
        floorGroup.visible = true;
        if (sym === 'planar') {
          perspCamera.position.set(4.3, 2.4, 7.0);
        } else if (sym === 'cylindrical') {
          perspCamera.position.set(3.6, 2.65, 7.4);
        } else {
          perspCamera.position.set(3.4, 2.55, 7.65);
        }
        controls.target.set(0, 0.05, 0);
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
        viewMode,
        showNormals,
        showFieldVectors,
        showChargeBody,
      } = propsRef.current;

      const isPos = params.chargeMagnitudeMicro >= 0;
      const isZeroQ = Math.abs(params.chargeMagnitudeMicro) < 0.05;
      const chargeCol = isZeroQ ? NEUTRAL_SLATE : isPos ? POS_CHARGE_ROSE : NEG_CHARGE_CYAN;
      const gaussCol = signToThreeHex(evaluation.fluxSign);
      const gaussCss = signToCssHex(evaluation.fluxSign);
      const fieldSignDir = isPos ? 1 : -1;

      // =====================================================================
      // MODE 1: POINT CHARGE & GAUSSIAN SIZE INVARIANCE
      // =====================================================================
      if (params.symmetry === 'point_invariance') {
        const rVis = Math.max(0.65, Math.min(1.95, 0.45 + params.gaussianRadiusM * 0.62));
        const offsetX = params.interiorOffsetFrac * rVis * 0.72;

        // Translucent 3D Gaussian sphere + crisp wireframe latitude/longitude
        const gSphere = new THREE.Mesh(
          new THREE.SphereGeometry(rVis, 28, 20),
          new THREE.MeshStandardMaterial({
            color: gaussCol,
            emissive: gaussCol,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.17,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        dynamicGroup.add(gSphere);

        const gWire = new THREE.Mesh(
          new THREE.SphereGeometry(rVis * 1.003, 18, 12),
          new THREE.MeshBasicMaterial({
            color: gaussCol,
            wireframe: true,
            transparent: true,
            opacity: 0.34,
          })
        );
        dynamicGroup.add(gWire);

        // Interior point charge composite core
        if (showChargeBody) {
          const core = createCompositeChargeCore(0.24, isPos, isZeroQ);
          core.position.set(offsetX, 0, 0);
          dynamicGroup.add(core);
          const qTag = makeMiniTagSprite(
            `q_enc=${params.chargeMagnitudeMicro >= 0 ? '+' : ''}${params.chargeMagnitudeMicro.toFixed(1)}μC`,
            isZeroQ ? '#94a3b8' : isPos ? '#fb7185' : '#38bdf8'
          );
          qTag.position.set(offsetX, -0.52, 0);
          dynamicGroup.add(qTag);
        }

        // Radial field E and outward area normals dA around the Gaussian sphere
        const dirs =
          viewMode === '2d'
            ? [0, 45, 90, 135, 180, 225, 270, 315].map(
                d => new THREE.Vector3(Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180), 0)
              )
            : [
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, -1, 0),
                new THREE.Vector3(0.707, 0.707, 0),
                new THREE.Vector3(-0.707, 0.707, 0),
                new THREE.Vector3(0.707, -0.707, 0),
                new THREE.Vector3(-0.707, -0.707, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, -1),
              ];

        const eLen = Math.max(0.32, Math.min(1.08, 0.95 / Math.max(0.6, params.gaussianRadiusM * 0.75)));
        for (const d of dirs) {
          const surfacePt = d.clone().multiplyScalar(rVis);
          if (showNormals) {
            dynamicGroup.add(
              createStyledArrow(surfacePt, d, 0.56, NORMAL_AMBER, 0.024, 0.066, 0.16)
            );
          }
          if (showFieldVectors && !isZeroQ) {
            const chargePos = new THREE.Vector3(offsetX, 0, 0);
            const fromCharge = surfacePt.clone().sub(chargePos);
            const localDist = Math.max(0.45, fromCharge.length());
            const eDir = fromCharge.normalize().multiplyScalar(fieldSignDir);
            const localLen = Math.max(0.28, Math.min(1.15, (eLen * rVis * rVis) / (localDist * localDist)));
            const startPt =
              fieldSignDir > 0
                ? surfacePt.clone().add(eDir.clone().multiplyScalar(0.05))
                : surfacePt.clone().sub(eDir.clone().multiplyScalar(localLen + 0.05));
            dynamicGroup.add(
              createStyledArrow(startPt, eDir, localLen, FIELD_SKY, 0.02, 0.056, 0.14)
            );
          }
        }

        // Optional external charge outside the Gaussian sphere
        if (Math.abs(params.externalChargeMicro) > 0.05) {
          const extX = rVis + 1.05;
          const extPos = params.externalChargeMicro > 0;
          const extCore = createCompositeChargeCore(0.21, extPos, false);
          extCore.position.set(extX, 0.35, 0);
          dynamicGroup.add(extCore);

          const extTag = makeMiniTagSprite(
            `q_ext=${params.externalChargeMicro > 0 ? '+' : ''}${params.externalChargeMicro.toFixed(1)}μC (ΔΦ=0)`,
            '#94a3b8'
          );
          extTag.position.set(extX, -0.25, 0);
          dynamicGroup.add(extTag);

          // Show 3 piercing dashed field rays entering one side and exiting the other (net 0)
          for (const dy of [-0.45, 0.0, 0.45]) {
            const rayStart = new THREE.Vector3(extX, 0.35, 0);
            const rayTarget = new THREE.Vector3(-rVis - 0.65, dy, 0);
            dynamicGroup.add(createDashedLine(rayStart, rayTarget, 0x94a3b8, 0.55));
          }
        }
      }

      // =====================================================================
      // MODE 2: SPHERICAL SYMMETRY & VOLUME DENSITY ρ(r)
      // =====================================================================
      else if (params.symmetry === 'spherical') {
        const scale = 1.05;
        const RVis = Math.max(0.55, Math.min(1.55, params.bodyRadiusM * scale));
        const rVis = Math.max(0.25, Math.min(2.1, params.gaussianRadiusM * scale));

        // Charge distribution body of radius R
        if (showChargeBody) {
          if (params.sphericalProfile === 'conducting_shell') {
            const shellOuter = new THREE.Mesh(
              new THREE.SphereGeometry(RVis, 28, 20),
              new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                emissive: chargeCol,
                emissiveIntensity: 0.22,
                metalness: 0.8,
                roughness: 0.25,
                transparent: true,
                opacity: 0.34,
                depthWrite: false,
                side: THREE.DoubleSide,
              })
            );
            dynamicGroup.add(shellOuter);
            const rimRing = new THREE.Mesh(
              new THREE.TorusGeometry(RVis, 0.032, 10, 48),
              new THREE.MeshStandardMaterial({
                color: chargeCol,
                emissive: chargeCol,
                emissiveIntensity: 0.65,
                roughness: 0.2,
                metalness: 0.5,
              })
            );
            dynamicGroup.add(rimRing);
          } else {
            // Layered radial shells to visually depict uniform vs linear (outer dense) vs inverse (core dense)
            const shellFracs = [0.35, 0.65, 1.0];
            shellFracs.forEach((f, idx) => {
              const opac =
                params.sphericalProfile === 'uniform_solid'
                  ? 0.14
                  : params.sphericalProfile === 'linear_rho'
                  ? 0.06 + idx * 0.09
                  : 0.24 - idx * 0.07;
              const sMesh = new THREE.Mesh(
                new THREE.SphereGeometry(RVis * f, 24, 18),
                new THREE.MeshStandardMaterial({
                  color: chargeCol,
                  emissive: chargeCol,
                  emissiveIntensity: 0.32,
                  transparent: true,
                  opacity: opac,
                  depthWrite: false,
                  side: THREE.DoubleSide,
                })
              );
              dynamicGroup.add(sMesh);
            });
            const bodyRim = new THREE.Mesh(
              new THREE.TorusGeometry(RVis, 0.022, 8, 48),
              new THREE.MeshBasicMaterial({ color: chargeCol, transparent: true, opacity: 0.68 })
            );
            dynamicGroup.add(bodyRim);
          }

          const rBodyTag = makeMiniTagSprite(`R=${params.bodyRadiusM.toFixed(2)}m`, isPos ? '#fb7185' : '#38bdf8');
          rBodyTag.position.set(-RVis * 0.92 - 0.35, -RVis * 0.72, 0);
          dynamicGroup.add(rBodyTag);
        }

        // Gaussian sphere of radius r
        const gMesh = new THREE.Mesh(
          new THREE.SphereGeometry(rVis, 28, 20),
          new THREE.MeshStandardMaterial({
            color: gaussCol,
            emissive: gaussCol,
            emissiveIntensity: 0.26,
            transparent: true,
            opacity: 0.16,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        dynamicGroup.add(gMesh);

        const gWire = new THREE.Mesh(
          new THREE.SphereGeometry(rVis * 1.004, 18, 12),
          new THREE.MeshBasicMaterial({
            color: gaussCol,
            wireframe: true,
            transparent: true,
            opacity: 0.42,
          })
        );
        dynamicGroup.add(gWire);

        // Radial E & dA arrows on Gaussian sphere
        const dirs = [0, 45, 90, 135, 180, 225, 270, 315].map(
          d => new THREE.Vector3(Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180), 0)
        );
        const eArrowLen =
          evaluation.fieldMagKNPerC < 0.05
            ? 0
            : Math.max(0.28, Math.min(1.05, 0.24 + evaluation.fieldMagKNPerC * 0.0095));

        for (const d of dirs) {
          const pt = d.clone().multiplyScalar(rVis);
          if (showNormals) {
            dynamicGroup.add(createStyledArrow(pt, d, 0.48, NORMAL_AMBER, 0.022, 0.06, 0.14));
          }
          if (showFieldVectors && eArrowLen > 0) {
            const eDir = d.clone().multiplyScalar(fieldSignDir);
            const start =
              fieldSignDir > 0
                ? pt.clone().add(eDir.clone().multiplyScalar(0.06))
                : pt.clone().sub(eDir.clone().multiplyScalar(eArrowLen + 0.06));
            dynamicGroup.add(createStyledArrow(start, eDir, eArrowLen, FIELD_SKY, 0.02, 0.056, 0.14));
          }
        }

        const gaussTag = makeMiniTagSprite(
          `r=${params.gaussianRadiusM.toFixed(2)}m (${evaluation.regionStatus === 'inside' ? 'r<R' : 'r≥R'})`,
          gaussCss
        );
        gaussTag.position.set(Math.min(1.65, rVis * 0.85 + 0.42), Math.min(1.65, rVis * 0.72 + 0.28), 0);
        dynamicGroup.add(gaussTag);
      }

      // =====================================================================
      // MODE 3: CYLINDRICAL SYMMETRY (LINE / SOLID / HOLLOW)
      // =====================================================================
      else if (params.symmetry === 'cylindrical') {
        const bodyRVis =
          params.cylindricalProfile === 'line_charge'
            ? 0.09
            : Math.max(0.32, Math.min(1.15, params.bodyRadiusM * 0.85));
        const gaussRVis = Math.max(0.28, Math.min(1.6, params.gaussianRadiusM * 0.85));
        const gaussLVis = Math.max(1.5, Math.min(3.1, params.gaussianLengthM * 1.15));
        const bodyLVis = 4.6;

        // Horizontal infinite charge cylinder/line along X-axis
        if (showChargeBody) {
          const isHollow = params.cylindricalProfile === 'conducting_cylinder';
          const bodyCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(bodyRVis, bodyRVis, bodyLVis, 28, 1, isHollow),
            new THREE.MeshStandardMaterial({
              color: isHollow ? 0x94a3b8 : chargeCol,
              emissive: chargeCol,
              emissiveIntensity: params.cylindricalProfile === 'line_charge' ? 0.85 : 0.3,
              roughness: 0.28,
              metalness: isHollow ? 0.78 : 0.2,
              transparent: params.cylindricalProfile !== 'line_charge',
              opacity: isHollow ? 0.42 : 0.34,
              depthWrite: params.cylindricalProfile === 'line_charge',
              side: THREE.DoubleSide,
            })
          );
          bodyCyl.rotation.z = Math.PI / 2;
          dynamicGroup.add(bodyCyl);

          if (params.cylindricalProfile !== 'line_charge') {
            for (const xRing of [-1.8, 0, 1.8]) {
              const cRing = new THREE.Mesh(
                new THREE.TorusGeometry(bodyRVis, 0.018, 8, 32),
                new THREE.MeshBasicMaterial({ color: chargeCol, transparent: true, opacity: 0.65 })
              );
              cRing.rotation.y = Math.PI / 2;
              cRing.position.x = xRing;
              dynamicGroup.add(cRing);
            }
          }
        }

        // Closed 3D Gaussian cylinder coaxial with X-axis
        const gWall = new THREE.Mesh(
          new THREE.CylinderGeometry(gaussRVis, gaussRVis, gaussLVis, 28, 1, true),
          new THREE.MeshStandardMaterial({
            color: gaussCol,
            emissive: gaussCol,
            emissiveIntensity: 0.24,
            transparent: true,
            opacity: 0.18,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        gWall.rotation.z = Math.PI / 2;
        dynamicGroup.add(gWall);

        const gWallWire = new THREE.Mesh(
          new THREE.CylinderGeometry(gaussRVis * 1.005, gaussRVis * 1.005, gaussLVis, 16, 2, true),
          new THREE.MeshBasicMaterial({
            color: gaussCol,
            wireframe: true,
            transparent: true,
            opacity: 0.32,
          })
        );
        gWallWire.rotation.z = Math.PI / 2;
        dynamicGroup.add(gWallWire);

        // Flat end caps (neutral slate tint because E ⊥ dA ⇒ Φ_cap = 0)
        for (const sx of [-1, 1]) {
          const cap = new THREE.Mesh(
            new THREE.CircleGeometry(gaussRVis, 28),
            new THREE.MeshStandardMaterial({
              color: NEUTRAL_SLATE,
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          cap.position.x = sx * gaussLVis * 0.5;
          cap.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
          dynamicGroup.add(cap);

          const capRim = new THREE.Mesh(
            new THREE.TorusGeometry(gaussRVis, 0.025, 8, 32),
            new THREE.MeshStandardMaterial({ color: 0x7dd3fc, metalness: 0.6, roughness: 0.25 })
          );
          capRim.position.x = sx * gaussLVis * 0.5;
          capRim.rotation.y = Math.PI / 2;
          dynamicGroup.add(capRim);

          if (showNormals) {
            dynamicGroup.add(
              createStyledArrow(
                new THREE.Vector3(sx * gaussLVis * 0.5, 0, 0),
                new THREE.Vector3(sx, 0, 0),
                0.68,
                NORMAL_AMBER,
                0.026,
                0.072,
                0.18
              )
            );
          }
        }

        // Radial E & dA arrows along curved lateral wall
        const wallXOffsets = [-gaussLVis * 0.28, gaussLVis * 0.28];
        const radialAngles = viewMode === '2d' ? [90, 270] : [0, 90, 180, 270];
        const eLen =
          evaluation.fieldMagKNPerC < 0.05
            ? 0
            : Math.max(0.3, Math.min(0.95, 0.25 + evaluation.fieldMagKNPerC * 0.009));

        for (const wx of wallXOffsets) {
          for (const deg of radialAngles) {
            const rad = (deg * Math.PI) / 180;
            const nDir = new THREE.Vector3(0, Math.sin(rad), Math.cos(rad));
            const pt = new THREE.Vector3(wx, Math.sin(rad) * gaussRVis, Math.cos(rad) * gaussRVis);
            if (showNormals) {
              dynamicGroup.add(createStyledArrow(pt, nDir, 0.52, NORMAL_AMBER, 0.022, 0.06, 0.14));
            }
            if (showFieldVectors && eLen > 0) {
              const eDir = nDir.clone().multiplyScalar(fieldSignDir);
              const start =
                fieldSignDir > 0
                  ? pt.clone().add(eDir.clone().multiplyScalar(0.06))
                  : pt.clone().sub(eDir.clone().multiplyScalar(eLen + 0.06));
              dynamicGroup.add(createStyledArrow(start, eDir, eLen, FIELD_SKY, 0.02, 0.056, 0.14));
            }
          }
        }

        const capTag = makeMiniTagSprite('Caps: E ⊥ dA (Φ=0)', '#94a3b8');
        capTag.position.set(Math.min(1.85, gaussLVis * 0.5 + 0.48), -0.58, 0);
        dynamicGroup.add(capTag);

        const wallTag = makeMiniTagSprite('Wall: E ∥ dA', gaussCss);
        wallTag.position.set(0, Math.min(1.85, gaussRVis + 0.58), 0);
        dynamicGroup.add(wallTag);
      }

      // =====================================================================
      // MODE 4: PLANAR SYMMETRY (GAUSSIAN PILLBOX)
      // =====================================================================
      else {
        const isSlab = params.planarProfile === 'thick_slab';
        const isCond = params.planarProfile === 'conducting_plate';
        const slabHalfVis = isSlab
          ? Math.max(0.28, Math.min(0.95, params.bodyRadiusM * 0.85))
          : isCond
          ? 0.55
          : 0.06;
        const pillXVis = Math.max(0.35, Math.min(1.9, params.gaussianRadiusM * 0.88));
        const pillRVis = Math.max(0.42, Math.min(0.95, Math.sqrt(params.pillboxAreaM2 / Math.PI) * 0.85));

        // Planar Charge Sheet / Thick Slab / Conducting Plate in YZ-plane
        if (showChargeBody) {
          const plateW = 3.2;
          const plateH = 2.9;
          const plateMesh = new THREE.Mesh(
            new THREE.BoxGeometry(slabHalfVis * 2, plateH, plateW),
            new THREE.MeshStandardMaterial({
              color: isCond ? 0x64748b : chargeCol,
              emissive: chargeCol,
              emissiveIntensity: isCond ? 0.14 : 0.34,
              metalness: isCond ? 0.82 : 0.18,
              roughness: isCond ? 0.25 : 0.4,
              transparent: !isCond,
              opacity: isCond ? 0.92 : isSlab ? 0.34 : 0.52,
              depthWrite: isCond,
            })
          );
          if (isCond) {
            plateMesh.position.x = -slabHalfVis; // outer conducting surface sits at x = 0
          }
          dynamicGroup.add(plateMesh);

          const plateEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(slabHalfVis * 2, plateH, plateW)),
            new THREE.LineBasicMaterial({ color: isCond ? 0x94a3b8 : chargeCol })
          );
          if (isCond) plateEdges.position.x = -slabHalfVis;
          dynamicGroup.add(plateEdges);

          if (isCond) {
            // Glowing surface charge layer at x = 0
            const surfLayer = new THREE.Mesh(
              new THREE.PlaneGeometry(plateW, plateH),
              new THREE.MeshStandardMaterial({
                color: chargeCol,
                emissive: chargeCol,
                emissiveIntensity: 0.65,
                transparent: true,
                opacity: 0.38,
                side: THREE.DoubleSide,
                depthWrite: false,
              })
            );
            surfLayer.rotation.y = Math.PI / 2;
            surfLayer.position.x = 0.015;
            dynamicGroup.add(surfLayer);
          }
        }

        // Gaussian Pillbox cylinder along X-axis
        const leftX = isCond ? -0.52 : -pillXVis;
        const rightX = pillXVis;
        const pillLen = rightX - leftX;
        const pillCenterX = (leftX + rightX) * 0.5;

        const pillWall = new THREE.Mesh(
          new THREE.CylinderGeometry(pillRVis, pillRVis, pillLen, 28, 1, true),
          new THREE.MeshStandardMaterial({
            color: NEUTRAL_SLATE,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        pillWall.rotation.z = Math.PI / 2;
        pillWall.position.x = pillCenterX;
        dynamicGroup.add(pillWall);

        const pillWire = new THREE.Mesh(
          new THREE.CylinderGeometry(pillRVis * 1.005, pillRVis * 1.005, pillLen, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0x7dd3fc,
            wireframe: true,
            transparent: true,
            opacity: 0.28,
          })
        );
        pillWire.rotation.z = Math.PI / 2;
        pillWire.position.x = pillCenterX;
        dynamicGroup.add(pillWire);

        // End caps (colored by active flux sign; inner conductor cap is slate zero)
        const capSpecs = [
          { x: rightX, dir: 1, active: true },
          { x: leftX, dir: -1, active: !isCond },
        ];
        const eLen =
          evaluation.fieldMagKNPerC < 0.05
            ? 0
            : Math.max(0.45, Math.min(1.05, 0.35 + evaluation.fieldMagKNPerC * 0.003));

        for (const cs of capSpecs) {
          const capCol = cs.active ? gaussCol : NEUTRAL_SLATE;
          const capMesh = new THREE.Mesh(
            new THREE.CircleGeometry(pillRVis, 28),
            new THREE.MeshStandardMaterial({
              color: capCol,
              emissive: capCol,
              emissiveIntensity: cs.active ? 0.35 : 0.06,
              transparent: true,
              opacity: cs.active ? 0.34 : 0.18,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          capMesh.position.x = cs.x;
          capMesh.rotation.y = cs.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          dynamicGroup.add(capMesh);

          const rim = new THREE.Mesh(
            new THREE.TorusGeometry(pillRVis, 0.028, 8, 32),
            new THREE.MeshStandardMaterial({
              color: cs.active ? gaussCol : 0x64748b,
              emissive: cs.active ? gaussCol : 0x000000,
              emissiveIntensity: 0.4,
            })
          );
          rim.position.x = cs.x;
          rim.rotation.y = Math.PI / 2;
          dynamicGroup.add(rim);

          const nDir = new THREE.Vector3(cs.dir, 0, 0);
          if (showNormals) {
            dynamicGroup.add(
              createStyledArrow(new THREE.Vector3(cs.x, 0, 0), nDir, 0.65, NORMAL_AMBER, 0.028, 0.075, 0.18)
            );
          }
          if (showFieldVectors && cs.active && eLen > 0) {
            const eDir = new THREE.Vector3(cs.dir * fieldSignDir, 0, 0);
            for (const dy of [-0.32, 0.32]) {
              const basePt = new THREE.Vector3(cs.x, dy, 0);
              const start =
                fieldSignDir > 0
                  ? basePt.clone().add(eDir.clone().multiplyScalar(0.06))
                  : basePt.clone().sub(eDir.clone().multiplyScalar(eLen + 0.06));
              dynamicGroup.add(createStyledArrow(start, eDir, eLen, FIELD_SKY, 0.022, 0.06, 0.15));
            }
          }
        }

        // Top side-wall normal arrow showing E ⊥ dA ⇒ Φ_wall = 0
        if (showNormals) {
          dynamicGroup.add(
            createStyledArrow(
              new THREE.Vector3(pillCenterX, pillRVis, 0),
              new THREE.Vector3(0, 1, 0),
              0.55,
              NORMAL_AMBER,
              0.022,
              0.06,
              0.14
            )
          );
        }

        const wallTag = makeMiniTagSprite('Wall: E ⊥ dA (Φ=0)', '#94a3b8');
        wallTag.position.set(pillCenterX + 0.35, pillRVis + 0.52, 0);
        dynamicGroup.add(wallTag);

        const capTag = makeMiniTagSprite(
          isCond ? 'Air Cap: E=σ/ε₀' : 'Caps: E ∥ dA (2EA)',
          gaussCss
        );
        capTag.position.set(Math.min(1.6, rightX + 0.45), -0.78, 0);
        dynamicGroup.add(capTag);

        if (isCond) {
          const inTag = makeMiniTagSprite('Conductor: E_in=0', '#94a3b8');
          inTag.position.set(-0.92, -0.78, 0);
          dynamicGroup.add(inTag);
        }
      }

      requestRender();
    };

    rebuildRef.current = rebuildScene;
    rebuildScene();
    setCameraView(propsRef.current.viewMode, propsRef.current.params.symmetry);

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

  // Trigger scene rebuild whenever physics/display props change
  useEffect(() => {
    rebuildRef.current?.();
  }, [
    props.params,
    props.evaluation,
    props.viewMode,
    props.showNormals,
    props.showFieldVectors,
    props.showChargeBody,
  ]);

  // Adjust camera preset when viewMode or symmetry changes
  useEffect(() => {
    setCameraViewRef.current?.(props.viewMode, props.params.symmetry);
  }, [props.viewMode, props.params.symmetry]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      data-testid="gauss-86-canvas"
      aria-label="Interactive 3D Gauss's Law Gaussian Surface Viewport"
    />
  );
};

export default Gauss86Viewport;
