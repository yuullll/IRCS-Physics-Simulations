'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Flux85Evaluation,
  Flux85Params,
  evaluateNonuniformFieldX,
} from '@/lib/physics/electric-flux-8-5';

const FLUX_POS_EMERALD = 0x10b981;
const FLUX_NEG_ROSE = 0xf43f5e;
const FLUX_ZERO_SLATE = 0x64748b;
const FIELD_SKY = 0x38bdf8;
const NORMAL_AMBER = 0xfbbf24;
const PROJ_CYAN = 0x22d3ee;
const POSITIVE_RED = 0xef4444;
const NEGATIVE_BLUE = 0x3b82f6;

export interface Flux85ViewportProps {
  params: Flux85Params;
  evaluation: Flux85Evaluation;
  viewMode: '3d' | '2d';
  showNormals: boolean;
  showProjection: boolean;
  showFieldLines: boolean;
}

function makeBadgeSprite(
  title: string,
  valueText: string,
  accentHex: string,
  scaleX = 1.92,
  scaleY = 0.48
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(8, 14, 30, 0.94)';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(6, 8, canvas.width - 12, canvas.height - 16, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(title, canvas.width / 2, 41);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(valueText, canvas.width / 2, 84);

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
  canvas.width = Math.max(120, textW + 46);
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
  const scaleW = (canvas.width / 160) * 0.66;
  sprite.scale.set(scaleW, 0.27, 1);
  sprite.renderOrder = 26;
  return sprite;
}

function createStyledArrow(
  origin: THREE.Vector3,
  dirUnit: THREE.Vector3,
  length: number,
  colorHex: number,
  shaftRadius = 0.032,
  headRadius = 0.088,
  headLength = 0.22,
  opacity = 1
): THREE.Group {
  const group = new THREE.Group();
  if (length < 0.06 || dirUnit.lengthSq() < 1e-8) return group;

  const actualHeadLen = Math.min(headLength, length * 0.45);
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
    new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 12),
    mat
  );
  shaft.position.y = shaftLen * 0.5;
  group.add(shaft);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(headRadius, actualHeadLen, 14),
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
    dashSize: 0.12,
    gapSize: 0.08,
    transparent: true,
    opacity,
  });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse(obj => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
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

function signToColorHex(sign: 'positive' | 'negative' | 'zero'): number {
  if (sign === 'positive') return FLUX_POS_EMERALD;
  if (sign === 'negative') return FLUX_NEG_ROSE;
  return FLUX_ZERO_SLATE;
}

function signToCssHex(sign: 'positive' | 'negative' | 'zero'): string {
  if (sign === 'positive') return '#34d399';
  if (sign === 'negative') return '#fb7185';
  return '#cbd5e1';
}

export const Flux85Viewport: React.FC<Flux85ViewportProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<Flux85ViewportProps>(props);
  const rebuildRef = useRef<(() => void) | null>(null);
  const cameraSyncRef = useRef<((mode: '3d' | '2d') => void) | null>(null);

  useEffect(() => {
    propsRef.current = props;
    rebuildRef.current?.();
  }, [
    props.params,
    props.evaluation,
    props.showNormals,
    props.showProjection,
    props.showFieldLines,
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

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.02);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.35);
    keyLight.position.set(5.5, 8.0, 7.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.72);
    rimLight.position.set(-6.0, 4.0, -5.0);
    scene.add(rimLight);

    // Cameras framed cleanly for open center window between w-80 & w-[356px] docks
    const perspCam = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    perspCam.position.set(1.5, 2.7, 10.6);

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
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5.5;
    controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI * 0.78;
    controls.target.set(0, 0.1, 0);
    controls.update();

    // Lab Bench Stage Floor & Grid
    const stageGroup = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 18),
      new THREE.MeshStandardMaterial({
        color: 0x070d1d,
        roughness: 0.78,
        metalness: 0.18,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    stageGroup.add(floor);

    const gridHelper = new THREE.GridHelper(18, 24, 0x1e3a5f, 0x0f1d35);
    gridHelper.position.y = -2.33;
    stageGroup.add(gridHelper);
    scene.add(stageGroup);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 45);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = window.requestAnimationFrame(() => {
        renderDirty = false;
        if (activeCam === perspCam) {
          controls.update();
        }
        renderer.render(scene, activeCam);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    controls.addEventListener('change', requestRender);

    const rebuildScene = () => {
      while (dynamicGroup.children.length > 0) {
        const child = dynamicGroup.children[0];
        dynamicGroup.remove(child);
        disposeObjectTree(child);
      }

      const {
        params,
        evaluation,
        showNormals,
        showProjection,
        showFieldLines,
        viewMode,
      } = propsRef.current;

      const signHex = signToColorHex(evaluation.fluxSign);
      const signCss = signToCssHex(evaluation.fluxSign);
      const frameMetalMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.8,
        roughness: 0.24,
      });
      const standMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.65,
        roughness: 0.38,
      });

      // =====================================================================
      // SCENARIO 1: UNIFORM FIELD + TILTED OPEN SURFACE (Φ = E·A = EA cos θ)
      // =====================================================================
      if (params.scenario === 'uniform_open') {
        const thetaRad = (params.angleDeg * Math.PI) / 180;
        const side = Math.sqrt(Math.max(0.5, params.areaM2)) * 1.18;
        const radius = Math.sqrt(Math.max(0.5, params.areaM2) / Math.PI) * 1.25;

        // Pedestal mount beneath surface pivot
        const pivotY = 0.05;
        const stemH = 2.35 + pivotY - (params.openShape === 'circle' ? radius : side * 0.5) - 0.14;
        if (stemH > 0.15) {
          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.055, stemH, 14),
            standMat
          );
          stem.position.set(0, -2.35 + stemH * 0.5, 0);
          dynamicGroup.add(stem);
        }
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.5, 0.1, 24),
          standMat
        );
        base.position.set(0, -2.3, 0);
        dynamicGroup.add(base);

        // Tilted Surface Group (at theta=0, surface lies in y-z plane with normal +x)
        const surfGroup = new THREE.Group();
        surfGroup.position.set(0, pivotY, 0);
        surfGroup.rotation.z = thetaRad;

        const membraneMat = new THREE.MeshStandardMaterial({
          color: signHex,
          emissive: signHex,
          emissiveIntensity: evaluation.fluxSign === 'zero' ? 0.15 : 0.45,
          roughness: 0.25,
          metalness: 0.15,
          transparent: true,
          opacity: evaluation.fluxSign === 'zero' ? 0.28 : 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        if (params.openShape === 'circle') {
          const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), membraneMat);
          disk.rotation.y = Math.PI / 2;
          surfGroup.add(disk);

          const hoop = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.048, 16, 56),
            frameMetalMat
          );
          hoop.rotation.y = Math.PI / 2;
          surfGroup.add(hoop);
        } else {
          const pane = new THREE.Mesh(new THREE.PlaneGeometry(side, side), membraneMat);
          pane.rotation.y = Math.PI / 2;
          surfGroup.add(pane);

          // 4 metallic frame rails
          const barThick = 0.055;
          const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(barThick, barThick, side + barThick),
            frameMetalMat
          );
          topBar.position.set(0, side * 0.5, 0);
          const botBar = topBar.clone();
          botBar.position.set(0, -side * 0.5, 0);
          const frontBar = new THREE.Mesh(
            new THREE.BoxGeometry(barThick, side + barThick, barThick),
            frameMetalMat
          );
          frontBar.position.set(0, 0, side * 0.5);
          const backBar = frontBar.clone();
          backBar.position.set(0, 0, -side * 0.5);
          surfGroup.add(topBar, botBar, frontBar, backBar);
        }

        // Front-side indicator rim glow so student knows which side carries +A normal
        const centerHub = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 12),
          new THREE.MeshStandardMaterial({
            color: NORMAL_AMBER,
            emissive: NORMAL_AMBER,
            emissiveIntensity: 0.5,
            metalness: 0.6,
            roughness: 0.25,
          })
        );
        surfGroup.add(centerHub);
        dynamicGroup.add(surfGroup);

        // Uniform Electric Field Lines (along +x)
        if (showFieldLines) {
          const ys = [-1.05, -0.35, 0.35, 1.05];
          const zs = viewMode === '2d' ? [0] : [-0.75, 0, 0.75];
          const arrowLen = Math.max(0.8, Math.min(1.65, 0.65 + params.fieldStrength * 0.085));

          for (const fy of ys) {
            for (const fz of zs) {
              // Skip central axis so E & A vectors remain crystal clear
              if (Math.abs(fy) < 0.1 && Math.abs(fz) < 0.1) continue;
              const startX = -2.25;
              const endX = 2.25;
              dynamicGroup.add(
                createDashedSegment(
                  new THREE.Vector3(startX, fy + pivotY, fz),
                  new THREE.Vector3(endX, fy + pivotY, fz),
                  FIELD_SKY,
                  0.32
                )
              );
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(-1.95, fy + pivotY, fz),
                  new THREE.Vector3(1, 0, 0),
                  arrowLen * 0.68,
                  FIELD_SKY,
                  0.018,
                  0.052,
                  0.14,
                  0.78
                )
              );
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(0.85, fy + pivotY, fz),
                  new THREE.Vector3(1, 0, 0),
                  arrowLen * 0.68,
                  evaluation.fluxSign === 'zero' ? FIELD_SKY : signHex,
                  0.018,
                  0.052,
                  0.14,
                  0.78
                )
              );
            }
          }
        }

        // Primary Center Vectors: E (Sky) & Area Normal A (Amber) + Angle Arc θ
        const centerPt = new THREE.Vector3(0, pivotY, 0);
        const eVecLen = Math.max(1.15, Math.min(1.85, 0.9 + params.fieldStrength * 0.085));
        dynamicGroup.add(
          createStyledArrow(
            centerPt,
            new THREE.Vector3(1, 0, 0),
            eVecLen,
            FIELD_SKY,
            0.044,
            0.11,
            0.26
          )
        );
        const eTag = makeMiniTagSprite('E', '#38bdf8');
        eTag.position.set(eVecLen + 0.28, pivotY - 0.22, 0);
        dynamicGroup.add(eTag);

        if (showNormals) {
          const nDir = new THREE.Vector3(Math.cos(thetaRad), Math.sin(thetaRad), 0);
          const aVecLen = 1.6;
          dynamicGroup.add(
            createStyledArrow(centerPt, nDir, aVecLen, NORMAL_AMBER, 0.046, 0.115, 0.28)
          );
          const aTag = makeMiniTagSprite('A (Normal)', '#fbbf24');
          aTag.position.set(
            nDir.x * (aVecLen + 0.32),
            pivotY + nDir.y * (aVecLen + 0.32) + (Math.abs(nDir.y) < 0.2 ? 0.32 : 0),
            0
          );
          dynamicGroup.add(aTag);

          // Angle arc θ between +x (E) and nDir (A)
          if (params.angleDeg > 4) {
            const arcPts: THREE.Vector3[] = [];
            const arcR = 0.72;
            const steps = 28;
            for (let i = 0; i <= steps; i++) {
              const ang = (i / steps) * thetaRad;
              arcPts.push(
                new THREE.Vector3(arcR * Math.cos(ang), pivotY + arcR * Math.sin(ang), 0.02)
              );
            }
            const arcLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(arcPts),
              new THREE.LineBasicMaterial({ color: 0xfde68a })
            );
            dynamicGroup.add(arcLine);

            const midAng = thetaRad * 0.5;
            const thetaTag = makeMiniTagSprite(`θ=${params.angleDeg.toFixed(0)}°`, '#fde68a');
            thetaTag.position.set(
              (arcR + 0.42) * Math.cos(midAng),
              pivotY + (arcR + 0.42) * Math.sin(midAng),
              0.04
            );
            dynamicGroup.add(thetaTag);
          }
        }

        // Toggleable Projected Effective Cross-Section A_⊥ = A |cos θ| on right side
        if (showProjection && Math.abs(Math.cos(thetaRad)) > 0.04) {
          const projX = 1.85;
          const projHeight = (params.openShape === 'circle' ? radius * 2 : side) * Math.abs(Math.cos(thetaRad));
          const projWidth = params.openShape === 'circle' ? radius * 2 : side;

          const projMat = new THREE.MeshBasicMaterial({
            color: PROJ_CYAN,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          let projMesh: THREE.Mesh;
          if (params.openShape === 'circle') {
            const g = new THREE.CircleGeometry(radius, 40);
            g.scale(1, Math.abs(Math.cos(thetaRad)), 1);
            projMesh = new THREE.Mesh(g, projMat);
          } else {
            projMesh = new THREE.Mesh(new THREE.PlaneGeometry(projWidth, projHeight), projMat);
          }
          projMesh.rotation.y = Math.PI / 2;
          projMesh.position.set(projX, pivotY, 0);
          dynamicGroup.add(projMesh);

          const projTag = makeMiniTagSprite(
            `A⊥=${evaluation.projectedAreaM2.toFixed(2)}m²`,
            '#22d3ee'
          );
          projTag.position.set(projX, pivotY - projHeight * 0.5 - 0.36, 0);
          dynamicGroup.add(projTag);
        }

        const fluxValText =
          evaluation.fluxSign === 'zero'
            ? '0.00 kN·m²/C (Zero)'
            : `${evaluation.exactFlux >= 0 ? '+' : ''}${evaluation.exactFlux.toFixed(2)} kN·m²/C`;
        const topBadge = makeBadgeSprite('ELECTRIC FLUX  Φ = E·A', fluxValText, signCss);
        topBadge.position.set(0, 2.38, 0);
        dynamicGroup.add(topBadge);
      }

      // =====================================================================
      // SCENARIO 2: NONUNIFORM FIELD SURFACE INTEGRAL (Φ = ∫ E · dA)
      // =====================================================================
      else if (params.scenario === 'nonuniform_integral') {
        const H = Math.sqrt(Math.max(1.0, params.areaM2));
        const visualH = 2.6;
        const scale = visualH / H;
        const N = Math.max(2, Math.min(12, Math.round(params.gridN)));
        const cellVisual = visualH / N;

        // Compute max local |E| for color mapping
        let maxLocalE = 1;
        for (const p of evaluation.patches) {
          maxLocalE = Math.max(maxLocalE, Math.abs(p.eVec.x));
        }

        const hiIdx = evaluation.highlightedPatch?.index ?? -1;

        for (const patch of evaluation.patches) {
          const isHi = patch.index === hiIdx;
          const intensity = Math.min(1, Math.abs(patch.eVec.x) / maxLocalE);
          const patchColor = isHi
            ? NORMAL_AMBER
            : patch.eVec.x >= 0
            ? new THREE.Color().setHSL(0.46 + (1 - intensity) * 0.1, 0.78, 0.25 + intensity * 0.32).getHex()
            : FLUX_NEG_ROSE;

          const tile = new THREE.Mesh(
            new THREE.PlaneGeometry(cellVisual * 0.92, cellVisual * 0.92),
            new THREE.MeshStandardMaterial({
              color: patchColor,
              emissive: patchColor,
              emissiveIntensity: isHi ? 0.75 : 0.25 + intensity * 0.35,
              roughness: 0.35,
              transparent: true,
              opacity: isHi ? 0.92 : 0.65,
              side: THREE.DoubleSide,
            })
          );
          tile.rotation.y = Math.PI / 2;
          tile.position.set(-0.2, patch.center.y * scale, patch.center.z * scale);
          dynamicGroup.add(tile);
        }

        // Outer metallic frame
        const outerFrame = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, visualH, visualH)),
          new THREE.LineBasicMaterial({ color: 0x94a3b8 })
        );
        outerFrame.position.set(-0.2, 0, 0);
        dynamicGroup.add(outerFrame);

        // Varying E(y) arrows along vertical rows so student sees the spatial field gradient
        if (showFieldLines) {
          const rows = 5;
          for (let r = 0; r < rows; r++) {
            const frac = (r + 0.5) / rows;
            const yPhys = frac * H;
            const yScene = (frac - 0.5) * visualH;
            const eVal = evaluateNonuniformFieldX(yPhys, H, params);
            const arrowLen = Math.max(0.28, (Math.abs(eVal) / maxLocalE) * 1.9);
            const dir = new THREE.Vector3(eVal >= 0 ? 1 : -1, 0, 0);
            dynamicGroup.add(
              createStyledArrow(
                new THREE.Vector3(-0.2, yScene, 0),
                dir,
                arrowLen,
                FIELD_SKY,
                0.026,
                0.072,
                0.18,
                0.85
              )
            );
          }
        }

        // Highlighted differential patch dA normal vector & tag
        if (evaluation.highlightedPatch) {
          const hp = evaluation.highlightedPatch;
          const hpPos = new THREE.Vector3(-0.2, hp.center.y * scale, hp.center.z * scale);
          if (showNormals) {
            dynamicGroup.add(
              createStyledArrow(
                hpPos,
                new THREE.Vector3(1, 0, 0),
                1.05,
                NORMAL_AMBER,
                0.036,
                0.092,
                0.22
              )
            );
          }
          const patchTag = makeMiniTagSprite(
            `dA #${hp.index + 1}: dΦ=${hp.dFlux.toFixed(2)}`,
            '#fbbf24'
          );
          patchTag.position.set(hpPos.x + 1.15, hpPos.y + 0.36, hpPos.z);
          dynamicGroup.add(patchTag);
        }

        const topBadge = makeBadgeSprite(
          `SURFACE INTEGRAL  ∫ E·dA (${N}×${N})`,
          `+${evaluation.exactFlux.toFixed(2)} kN·m²/C`,
          '#34d399'
        );
        topBadge.position.set(0.2, 2.38, 0);
        dynamicGroup.add(topBadge);
      }

      // =====================================================================
      // SCENARIO 3: CLOSED CUBE (OUTWARD NORMALS & NET FLUX)
      // =====================================================================
      else if (params.scenario === 'closed_cube') {
        const sVis = Math.max(1.2, Math.min(2.35, params.cubeSide * 1.05));
        const half = sVis * 0.5;
        const yawRad = (params.angleDeg * Math.PI) / 180;

        const cubeGroup = new THREE.Group();
        cubeGroup.rotation.y = yawRad;

        // Render each of the 6 faces tinted according to its flux sign
        const faceTransforms: { id: string; pos: [number, number, number]; rot: [number, number, number] }[] = [
          { id: 'right', pos: [half, 0, 0], rot: [0, Math.PI / 2, 0] },
          { id: 'left', pos: [-half, 0, 0], rot: [0, -Math.PI / 2, 0] },
          { id: 'front', pos: [0, 0, half], rot: [0, 0, 0] },
          { id: 'back', pos: [0, 0, -half], rot: [0, Math.PI, 0] },
          { id: 'top', pos: [0, half, 0], rot: [-Math.PI / 2, 0, 0] },
          { id: 'bottom', pos: [0, -half, 0], rot: [Math.PI / 2, 0, 0] },
        ];

        for (const ft of faceTransforms) {
          const faceData = evaluation.faces.find(f => f.id === ft.id);
          const fSign = faceData?.sign ?? 'zero';
          const fColor = signToColorHex(fSign);
          const faceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(sVis, sVis),
            new THREE.MeshStandardMaterial({
              color: fColor,
              emissive: fColor,
              emissiveIntensity: fSign === 'zero' ? 0.08 : 0.42,
              transparent: true,
              opacity: fSign === 'zero' ? 0.14 : 0.32,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          faceMesh.position.set(...ft.pos);
          faceMesh.rotation.set(...ft.rot);
          cubeGroup.add(faceMesh);
        }

        // Crisp wireframe edges
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(sVis, sVis, sVis)),
          new THREE.LineBasicMaterial({ color: 0x7dd3fc })
        );
        cubeGroup.add(edges);
        dynamicGroup.add(cubeGroup);

        // Outward Normal Arrows on all 6 faces (in world coords using exact rotated normals)
        if (showNormals) {
          for (const face of evaluation.faces) {
            const nVec = new THREE.Vector3(
              face.outwardNormal.x,
              face.outwardNormal.y,
              face.outwardNormal.z
            );
            const faceCenter = nVec.clone().multiplyScalar(half);
            const arrowCol =
              face.sign === 'positive'
                ? FLUX_POS_EMERALD
                : face.sign === 'negative'
                ? FLUX_NEG_ROSE
                : NORMAL_AMBER;
            dynamicGroup.add(
              createStyledArrow(faceCenter, nVec, 0.85, arrowCol, 0.03, 0.08, 0.2)
            );
            if (face.id === 'right' || face.id === 'left' || face.id === 'top') {
              const fTag = makeMiniTagSprite(
                `${face.fluxKNm2C >= 0 ? '+' : ''}${face.fluxKNm2C.toFixed(1)}`,
                signToCssHex(face.sign)
              );
              if (face.id === 'top') {
                fTag.position.set(faceCenter.x + 0.56, faceCenter.y + 0.58, faceCenter.z);
              } else {
                fTag.position.copy(faceCenter).add(nVec.clone().multiplyScalar(1.08));
              }
              dynamicGroup.add(fTag);
            }
          }
        }

        // Ambient Electric Field Arrows (uniform vs linear gradient growing along +x)
        if (showFieldLines) {
          const xs = [-2.1, 0, 1.55];
          const ys = [-0.75, 0.75];
          const zs = viewMode === '2d' ? [0] : [-0.65, 0.65];
          for (const fx of xs) {
            const localE =
              params.cubeFieldMode === 'linear_x'
                ? params.fieldStrength + params.gradientBeta * (fx * 0.65)
                : params.fieldStrength;
            const len = Math.max(0.35, Math.min(1.25, 0.3 + Math.abs(localE) * 0.085));
            const dir = new THREE.Vector3(localE >= 0 ? 1 : -1, 0, 0);
            for (const fy of ys) {
              for (const fz of zs) {
                dynamicGroup.add(
                  createStyledArrow(
                    new THREE.Vector3(fx, fy, fz),
                    dir,
                    len,
                    FIELD_SKY,
                    0.017,
                    0.048,
                    0.13,
                    0.72
                  )
                );
              }
            }
          }
        }

        const netText =
          evaluation.fluxSign === 'zero'
            ? '0.00 kN·m²/C (Cancels)'
            : `${evaluation.exactFlux >= 0 ? '+' : ''}${evaluation.exactFlux.toFixed(2)} kN·m²/C`;
        const topBadge = makeBadgeSprite('CLOSED CUBE  ∮ E·dA', netText, signCss);
        topBadge.position.set(0, 2.38, 0);
        dynamicGroup.add(topBadge);
      }

      // =====================================================================
      // SCENARIO 4: CLOSED CURVED SURFACE (SPHERE / CYLINDER)
      // =====================================================================
      else {
        const rVis = Math.max(0.75, Math.min(1.75, params.curvedRadius * 0.85));
        const lVis = Math.max(1.4, Math.min(2.8, params.curvedLength * 0.9));
        const isRadial = params.curvedFieldMode === 'radial_source';
        const srcColor = params.radialPolarity > 0 ? POSITIVE_RED : NEGATIVE_BLUE;

        if (params.curvedType === 'sphere') {
          if (isRadial) {
            // Translucent closed Gaussian sphere
            const sph = new THREE.Mesh(
              new THREE.SphereGeometry(rVis, 36, 24),
              new THREE.MeshStandardMaterial({
                color: signHex,
                emissive: signHex,
                emissiveIntensity: 0.25,
                transparent: true,
                opacity: 0.22,
                roughness: 0.2,
                depthWrite: false,
                side: THREE.DoubleSide,
              })
            );
            dynamicGroup.add(sph);

            const wire = new THREE.Mesh(
              new THREE.SphereGeometry(rVis * 1.003, 18, 12),
              new THREE.MeshBasicMaterial({
                color: 0x7dd3fc,
                wireframe: true,
                transparent: true,
                opacity: 0.25,
              })
            );
            dynamicGroup.add(wire);

            // Centered radial source sphere (+ Red / - Blue)
            const core = new THREE.Mesh(
              new THREE.SphereGeometry(0.24, 24, 20),
              new THREE.MeshStandardMaterial({
                color: srcColor,
                emissive: srcColor,
                emissiveIntensity: 0.65,
                roughness: 0.25,
              })
            );
            dynamicGroup.add(core);

            const srcTag = makeMiniTagSprite(
              params.radialPolarity > 0 ? '+Source' : '−Source',
              params.radialPolarity > 0 ? '#f87171' : '#60a5fa'
            );
            srcTag.position.set(0, -0.45, 0);
            dynamicGroup.add(srcTag);

            // Radial outward normals dA and E(R) arrows on sphere surface (scaling inversely with R²)
            const sampleDirs: THREE.Vector3[] = [
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(-1, 0, 0),
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(0, -1, 0),
              new THREE.Vector3(0.707, 0.707, 0),
              new THREE.Vector3(-0.707, 0.707, 0),
              new THREE.Vector3(0.707, -0.707, 0),
              new THREE.Vector3(-0.707, -0.707, 0),
            ];
            if (viewMode === '3d') {
              sampleDirs.push(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1));
            }
            const eSurfLen = Math.max(
              0.38,
              Math.min(1.15, (0.95 / (params.curvedRadius * params.curvedRadius)) * (params.fieldStrength / 4))
            );
            for (const dir of sampleDirs) {
              const surfPt = dir.clone().multiplyScalar(rVis);
              if (showNormals) {
                dynamicGroup.add(
                  createStyledArrow(surfPt, dir, 0.52, NORMAL_AMBER, 0.024, 0.062, 0.16)
                );
              }
              if (showFieldLines) {
                const eDir = params.radialPolarity > 0 ? dir : dir.clone().negate();
                const startPt =
                  params.radialPolarity > 0
                    ? surfPt.clone().add(dir.clone().multiplyScalar(0.06))
                    : surfPt.clone().add(dir.clone().multiplyScalar(eSurfLen + 0.08));
                dynamicGroup.add(
                  createStyledArrow(startPt, eDir, eSurfLen, FIELD_SKY, 0.02, 0.056, 0.15, 0.9)
                );
              }
            }
          } else {
            // Sphere in Uniform Field: Left Hemisphere Rose (Entering), Right Hemisphere Emerald (Exiting)
            const rightHemi = new THREE.Mesh(
              new THREE.SphereGeometry(rVis, 32, 20, -Math.PI / 2, Math.PI),
              new THREE.MeshStandardMaterial({
                color: FLUX_POS_EMERALD,
                emissive: FLUX_POS_EMERALD,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.28,
                depthWrite: false,
                side: THREE.DoubleSide,
              })
            );
            const leftHemi = new THREE.Mesh(
              new THREE.SphereGeometry(rVis, 32, 20, Math.PI / 2, Math.PI),
              new THREE.MeshStandardMaterial({
                color: FLUX_NEG_ROSE,
                emissive: FLUX_NEG_ROSE,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.28,
                depthWrite: false,
                side: THREE.DoubleSide,
              })
            );
            dynamicGroup.add(rightHemi, leftHemi);

            const wire = new THREE.Mesh(
              new THREE.SphereGeometry(rVis * 1.003, 18, 12),
              new THREE.MeshBasicMaterial({
                color: 0x7dd3fc,
                wireframe: true,
                transparent: true,
                opacity: 0.22,
              })
            );
            dynamicGroup.add(wire);

            if (showNormals) {
              [
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, -1, 0),
                new THREE.Vector3(0.707, 0.707, 0),
                new THREE.Vector3(-0.707, 0.707, 0),
              ].forEach(dir => {
                dynamicGroup.add(
                  createStyledArrow(
                    dir.clone().multiplyScalar(rVis),
                    dir,
                    0.55,
                    NORMAL_AMBER,
                    0.024,
                    0.062,
                    0.15
                  )
                );
              });
            }

            if (showFieldLines) {
              [-0.85, 0, 0.85].forEach(fy => {
                dynamicGroup.add(
                  createStyledArrow(
                    new THREE.Vector3(-2.3, fy, 0),
                    new THREE.Vector3(1, 0, 0),
                    0.85,
                    FIELD_SKY,
                    0.02,
                    0.055,
                    0.15,
                    0.82
                  )
                );
                dynamicGroup.add(
                  createStyledArrow(
                    new THREE.Vector3(1.5, fy, 0),
                    new THREE.Vector3(1, 0, 0),
                    0.85,
                    FIELD_SKY,
                    0.02,
                    0.055,
                    0.15,
                    0.82
                  )
                );
              });
            }
          }
        } else {
          // Closed Horizontal Cylinder along X-axis
          const cylWall = new THREE.Mesh(
            new THREE.CylinderGeometry(rVis, rVis, lVis, 32, 1, true),
            new THREE.MeshStandardMaterial({
              color: isRadial ? signHex : FLUX_ZERO_SLATE,
              emissive: isRadial ? signHex : FLUX_ZERO_SLATE,
              emissiveIntensity: isRadial ? 0.32 : 0.12,
              transparent: true,
              opacity: 0.26,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          cylWall.rotation.z = Math.PI / 2;
          dynamicGroup.add(cylWall);

          // Left & Right End Caps
          const capGeo = new THREE.CircleGeometry(rVis, 32);
          const rightCap = new THREE.Mesh(
            capGeo,
            new THREE.MeshStandardMaterial({
              color: isRadial ? FLUX_ZERO_SLATE : FLUX_POS_EMERALD,
              emissive: isRadial ? FLUX_ZERO_SLATE : FLUX_POS_EMERALD,
              emissiveIntensity: isRadial ? 0.1 : 0.38,
              transparent: true,
              opacity: isRadial ? 0.16 : 0.36,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          rightCap.rotation.y = Math.PI / 2;
          rightCap.position.x = lVis * 0.5;

          const leftCap = new THREE.Mesh(
            capGeo,
            new THREE.MeshStandardMaterial({
              color: isRadial ? FLUX_ZERO_SLATE : FLUX_NEG_ROSE,
              emissive: isRadial ? FLUX_ZERO_SLATE : FLUX_NEG_ROSE,
              emissiveIntensity: isRadial ? 0.1 : 0.38,
              transparent: true,
              opacity: isRadial ? 0.16 : 0.36,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          );
          leftCap.rotation.y = -Math.PI / 2;
          leftCap.position.x = -lVis * 0.5;
          dynamicGroup.add(rightCap, leftCap);

          // Rim rings
          const rimGeo = new THREE.TorusGeometry(rVis, 0.025, 12, 40);
          const rimMat = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, metalness: 0.5, roughness: 0.3 });
          const rimR = new THREE.Mesh(rimGeo, rimMat);
          rimR.rotation.y = Math.PI / 2;
          rimR.position.x = lVis * 0.5;
          const rimL = rimR.clone();
          rimL.position.x = -lVis * 0.5;
          dynamicGroup.add(rimR, rimL);

          if (isRadial) {
            // Centered glowing line source along cylinder axis
            const wireRod = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.08, lVis + 0.9, 16),
              new THREE.MeshStandardMaterial({
                color: srcColor,
                emissive: srcColor,
                emissiveIntensity: 0.7,
                roughness: 0.25,
              })
            );
            wireRod.rotation.z = Math.PI / 2;
            dynamicGroup.add(wireRod);

            const radialLen = Math.max(0.38, Math.min(1.0, 0.85 / params.curvedRadius));
            [-0.75, 0, 0.75].forEach(cx => {
              [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)].forEach(dir => {
                const pt = new THREE.Vector3(cx, dir.y * rVis, 0);
                if (showNormals) {
                  dynamicGroup.add(
                    createStyledArrow(pt, dir, 0.5, NORMAL_AMBER, 0.022, 0.058, 0.15)
                  );
                }
                if (showFieldLines) {
                  const eDir = params.radialPolarity > 0 ? dir : dir.clone().negate();
                  const startPt =
                    params.radialPolarity > 0
                      ? pt.clone().add(dir.clone().multiplyScalar(0.06))
                      : pt.clone().add(dir.clone().multiplyScalar(radialLen + 0.08));
                  dynamicGroup.add(
                    createStyledArrow(startPt, eDir, radialLen, FIELD_SKY, 0.02, 0.055, 0.15, 0.88)
                  );
                }
              });
            });
          } else {
            if (showNormals) {
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(lVis * 0.5, 0, 0),
                  new THREE.Vector3(1, 0, 0),
                  0.75,
                  FLUX_POS_EMERALD,
                  0.03,
                  0.08,
                  0.2
                )
              );
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(-lVis * 0.5, 0, 0),
                  new THREE.Vector3(-1, 0, 0),
                  0.75,
                  FLUX_NEG_ROSE,
                  0.03,
                  0.08,
                  0.2
                )
              );
              dynamicGroup.add(
                createStyledArrow(
                  new THREE.Vector3(0, rVis, 0),
                  new THREE.Vector3(0, 1, 0),
                  0.65,
                  NORMAL_AMBER,
                  0.026,
                  0.07,
                  0.17
                )
              );
            }
            if (showFieldLines) {
              [-0.5, 0.5].forEach(fy => {
                dynamicGroup.add(
                  createStyledArrow(
                    new THREE.Vector3(-lVis * 0.5 - 1.1, fy, 0),
                    new THREE.Vector3(1, 0, 0),
                    0.85,
                    FIELD_SKY,
                    0.02,
                    0.055,
                    0.15,
                    0.82
                  )
                );
                dynamicGroup.add(
                  createStyledArrow(
                    new THREE.Vector3(lVis * 0.5 + 0.25, fy, 0),
                    new THREE.Vector3(1, 0, 0),
                    0.85,
                    FIELD_SKY,
                    0.02,
                    0.055,
                    0.15,
                    0.82
                  )
                );
              });
            }
          }
        }

        const shapeLabel = params.curvedType === 'sphere' ? 'CLOSED SPHERE' : 'CLOSED CYLINDER';
        const fluxStr =
          evaluation.fluxSign === 'zero'
            ? '0.00 kN·m²/C (Cancels)'
            : `${evaluation.exactFlux >= 0 ? '+' : ''}${evaluation.exactFlux.toFixed(1)} kN·m²/C`;
        const topBadge = makeBadgeSprite(`${shapeLabel}  ∮ E·dA`, fluxStr, signCss);
        topBadge.position.set(0, 2.38, 0);
        dynamicGroup.add(topBadge);
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

    rebuildRef.current = rebuildScene;
    cameraSyncRef.current = syncCameraMode;

    rebuildScene();
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
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeObjectTree(dynamicGroup);
      disposeObjectTree(stageGroup);
      envTex.dispose();
      renderer.dispose();
      rebuildRef.current = null;
      cameraSyncRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="flux-85-canvas"
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
};
