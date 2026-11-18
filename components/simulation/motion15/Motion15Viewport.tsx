'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Motion15Params,
  Motion15ScenarioId,
  Vec3,
  evaluateMotion15State,
  sampleMotion15Series,
} from '@/lib/physics/motion-2d-3d-1-5';

export interface Motion15ViewportProps {
  scenario: Motion15ScenarioId;
  maxTime: number;
  params: Motion15Params;
  simTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  viewMode: '3d' | '2d';
  showTotalVel: boolean;
  showComponentVel: boolean;
  showAccel: boolean;
  showProjections: boolean;
  showTrails: boolean;
  onAdvanceTime: (nextTime: number) => void;
}

const _tmpDir = new THREE.Vector3();
const _tmpOrigin = new THREE.Vector3();
const _tmpUp = new THREE.Vector3(0, 1, 0);
const _tmpQuat = new THREE.Quaternion();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

interface VectorArrowMesh {
  group: THREE.Group;
  shaft: THREE.Mesh;
  head: THREE.Mesh;
}

function createVectorArrow(colorHex: number): VectorArrowMesh {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.15,
  });
  const shaftGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 14);
  shaftGeo.translate(0, 0.5, 0);
  const headGeo = new THREE.ConeGeometry(0.21, 0.5, 16);
  headGeo.translate(0, 0.25, 0);

  const shaft = new THREE.Mesh(shaftGeo, mat);
  const head = new THREE.Mesh(headGeo, mat);
  shaft.castShadow = true;
  head.castShadow = true;
  group.add(shaft, head);
  return { group, shaft, head };
}

function updateVectorArrow(
  arrow: VectorArrowMesh,
  origin: THREE.Vector3,
  vx: number,
  vy: number,
  vz: number,
  scaleFactor: number,
  visible: boolean
) {
  _tmpDir.set(vx, vy, vz).multiplyScalar(scaleFactor);
  const len = _tmpDir.length();
  if (!visible || len < 0.08) {
    arrow.group.visible = false;
    return;
  }
  arrow.group.visible = true;
  arrow.group.position.copy(origin);
  _tmpDir.divideScalar(len);
  _tmpQuat.setFromUnitVectors(_tmpUp, _tmpDir);
  arrow.group.quaternion.copy(_tmpQuat);

  const headLen = Math.min(0.54, len * 0.35);
  const shaftLen = Math.max(0.05, len - headLen);
  arrow.shaft.scale.set(1, shaftLen, 1);
  arrow.head.position.set(0, shaftLen, 0);
  arrow.head.scale.set(1, headLen / 0.5, 1);
}

function createTubeFromPoints(
  points: THREE.Vector3[],
  radius: number,
  colorHex: number,
  opacity: number
): THREE.Mesh | null {
  if (points.length < 2) return null;
  const deduped: THREE.Vector3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceToSquared(deduped[deduped.length - 1]) > 1e-6) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(deduped);
  const geo = new THREE.TubeGeometry(curve, Math.max(14, deduped.length), radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.25,
    roughness: 0.45,
    metalness: 0.1,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geo, mat);
}

function createSoftShadowDisc(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 28);
  geo.rotateX(-Math.PI / 2);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function buildCompositeProjectileGroup(primaryColor: number, ringColor: number): THREE.Group {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 24, 24),
    new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.25,
      metalness: 0.48,
    })
  );
  core.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.045, 10, 28),
    new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    })
  );
  ring.rotation.x = Math.PI / 2;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.2, 0.22, 14),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.78,
    })
  );
  cap.position.y = 0.48;

  grp.add(core, ring, cap);
  return grp;
}

export const Motion15Viewport: React.FC<Motion15ViewportProps> = (props) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef(props);

  useEffect(() => {
    latestPropsRef.current = props;
  });

  const sceneSyncRef = useRef<{
    rebuildDynamicWorld: () => void;
    snapCameraToPreset: () => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 800;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b09);
    scene.fog = new THREE.FogExp2(0x040b09, 0.0085);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 320);
    camera.position.set(16, 12, 28);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 6;
    controls.maxDistance = 95;
    controls.target.set(8, 5, 0);

    let cameraTransitionActive = false;
    controls.addEventListener('start', () => {
      cameraTransitionActive = false;
    });

    // Balanced warm key + cool fill lighting rig
    const hemiLight = new THREE.HemisphereLight(0x9be7ff, 0x091812, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(18, 30, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -36;
    keyLight.shadow.camera.right = 36;
    keyLight.shadow.camera.top = 36;
    keyLight.shadow.camera.bottom = -36;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.78);
    rimLight.position.set(-18, 12, -16);
    scene.add(rimLight);

    // Ground Floor Plane + Metric Grid
    const baseFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({
        color: 0x05110d,
        roughness: 0.92,
        metalness: 0.06,
      })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.04;
    baseFloor.receiveShadow = true;
    scene.add(baseFloor);

    const groundGrid = new THREE.GridHelper(120, 60, 0x10b981, 0x0c2b21);
    groundGrid.position.y = 0.01;
    scene.add(groundGrid);

    // Coordinate Axes Origin
    const originAxes = new THREE.AxesHelper(3.5);
    originAxes.position.set(0, 0.04, 0);
    scene.add(originAxes);

    // Vertical Y-axis Elevation Mast at x=0, z=-1.5 (with tick collars)
    const mastGroup = new THREE.Group();
    const mastPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 26, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.65 })
    );
    mastPole.position.set(0, 13, -1.6);
    mastGroup.add(mastPole);
    const tickGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12);
    const tickMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.3,
    });
    for (let h = 2; h <= 24; h += 2) {
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(0, h, -1.6);
      mastGroup.add(tick);
    }
    scene.add(mastGroup);

    // X-axis Measurement Track Rail (for orthogonal X shadow)
    const xRail = new THREE.Mesh(
      new THREE.BoxGeometry(80, 0.08, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.45 })
    );
    xRail.position.set(30, 0.03, 0);
    scene.add(xRail);

    // Dynamic Environment Group (Launch tower / 3D chamber walls)
    const scenarioPropsGroup = new THREE.Group();
    scene.add(scenarioPropsGroup);

    // Trajectory Tubes Group
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    // Primary Body B, Reference Drop Body A, Scaled Ghost Body
    const primaryBodyGroup = buildCompositeProjectileGroup(0x34d399, 0x38bdf8);
    scene.add(primaryBodyGroup);
    const primaryFloorShadow = createSoftShadowDisc(1.1);
    primaryFloorShadow.position.y = 0.025;
    scene.add(primaryFloorShadow);

    const dropRefGroup = buildCompositeProjectileGroup(0xfbbf24, 0xfef08a);
    scene.add(dropRefGroup);
    const dropRefShadow = createSoftShadowDisc(1.0);
    dropRefShadow.position.y = 0.025;
    scene.add(dropRefShadow);

    const scaledGhostGroup = buildCompositeProjectileGroup(0xa855f7, 0xe879f9);
    scaledGhostGroup.traverse(n => {
      if (n instanceof THREE.Mesh && n.material instanceof THREE.MeshStandardMaterial) {
        n.material.transparent = true;
        n.material.opacity = 0.65;
      }
    });
    scene.add(scaledGhostGroup);

    // Horizontal Iso-Elevation Sync Bar connecting Body A & Body B (proves y_A(t) = y_B(t) visually)
    const syncBarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
    syncBarGeo.rotateZ(Math.PI / 2);
    const syncBarMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.55,
    });
    const syncBarMesh = new THREE.Mesh(syncBarGeo, syncBarMat);
    scene.add(syncBarMesh);

    // Orthogonal Projection Shadow Markers (1.5.A.1 Component Separation)
    const xProjDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.12, 18),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.5,
      })
    );
    const yProjCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.07, 10, 22),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x34d399,
        emissiveIntensity: 0.6,
      })
    );
    yProjCollar.rotation.x = Math.PI / 2;

    const zProjNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.55,
      })
    );
    scene.add(xProjDisc, yProjCollar, zProjNode);

    // Projection laser lines from particle to orthogonal axes
    const projLineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
    });
    const projXLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const projYLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const projXLine = new THREE.Line(projXLineGeo, projLineMat);
    const projYLine = new THREE.Line(projYLineGeo, projLineMat);
    scene.add(projXLine, projYLine);

    // 3D Vector Arrows attached at Primary Body
    const arrowVTotal = createVectorArrow(0x34d399); // Emerald: v
    const arrowVX = createVectorArrow(0x38bdf8);     // Sky: v_x
    const arrowVY = createVectorArrow(0xa78bfa);     // Violet: v_y
    const arrowVZ = createVectorArrow(0xfbbf24);     // Amber: v_z (3D Helix)
    const arrowAccel = createVectorArrow(0xfb7185);  // Coral: a
    scene.add(
      arrowVTotal.group,
      arrowVX.group,
      arrowVY.group,
      arrowVZ.group,
      arrowAccel.group
    );

    function clearGroupMeshes(grp: THREE.Group) {
      while (grp.children.length > 0) {
        const ch = grp.children[0];
        grp.remove(ch);
        ch.traverse(node => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
            else node.material.dispose();
          }
        });
      }
    }

    function buildScenarioEnvironment(sc: Motion15ScenarioId, params: Motion15Params) {
      clearGroupMeshes(scenarioPropsGroup);

      if (sc === 'qualitative_3d') {
        // 3D Magnetic/Kinematics Chamber Ring + Subtle Orthogonal Projection Backplanes
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(params.helixRadius, 0.06, 12, 48),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.45 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.06;
        scenarioPropsGroup.add(ring);

        const wallMat = new THREE.MeshStandardMaterial({
          color: 0x071a15,
          roughness: 0.85,
          metalness: 0.1,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
        });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 22), wallMat);
        backWall.position.set(0, 11, -11);
        const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 22), wallMat);
        sideWall.rotation.y = Math.PI / 2;
        sideWall.position.set(-11, 11, 0);
        scenarioPropsGroup.add(backWall, sideWall);
        return;
      }

      // Composite Elevated Release Tower / Stand when h0 > 0.3
      const h = Math.max(0.25, params.h0);
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.5,
        metalness: 0.55,
      });
      const deckMat = new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        roughness: 0.35,
        metalness: 0.4,
      });

      if (params.h0 > 0.35) {
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, h, 12), towerMat);
        leg1.position.set(-0.6, h / 2, -0.7);
        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, h, 12), towerMat);
        leg2.position.set(-0.6, h / 2, 0.7);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.24, 2.2), deckMat);
        deck.position.set(-0.35, h - 0.12, 0);
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.06, 10, 20),
          new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, h + 0.04, sc === 'drop_vs_launch' ? 0.55 : 0);
        scenarioPropsGroup.add(leg1, leg2, deck, collar);
      } else {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.18, 20), deckMat);
        pad.position.set(0, 0.09, 0);
        scenarioPropsGroup.add(pad);
      }
    }

    function rebuildDynamicWorld() {
      const p = latestPropsRef.current;
      buildScenarioEnvironment(p.scenario, p.params);
      clearGroupMeshes(trailGroup);

      if (p.showTrails) {
        const samples = sampleMotion15Series(p.scenario, p.params, p.maxTime, 84);
        const primPts = samples.map(
          s => new THREE.Vector3(s.primary.r.x, s.primary.r.y + 0.46, s.primary.r.z)
        );
        const primTube = createTubeFromPoints(primPts, 0.085, 0x34d399, 0.85);
        if (primTube) trailGroup.add(primTube);

        if (p.scenario === 'drop_vs_launch') {
          const refPts = samples
            .filter(s => s.referenceDrop !== null)
            .map(
              s =>
                new THREE.Vector3(
                  s.referenceDrop!.r.x,
                  s.referenceDrop!.r.y + 0.46,
                  -1.35
                )
            );
          const refTube = createTubeFromPoints(refPts, 0.075, 0xfbbf24, 0.8);
          if (refTube) trailGroup.add(refTube);
        }

        if (p.scenario === 'projectile_2d' && p.params.scaleFactor > 1) {
          const scaledPts = samples
            .filter(s => s.scaledComparison !== null)
            .map(
              s =>
                new THREE.Vector3(
                  s.scaledComparison!.r.x,
                  s.scaledComparison!.r.y + 0.46,
                  s.scaledComparison!.r.z
                )
            );
          const scaledTube = createTubeFromPoints(scaledPts, 0.06, 0xa855f7, 0.55);
          if (scaledTube) trailGroup.add(scaledTube);
        }

        if (p.scenario === 'qualitative_3d') {
          // 3D Orthogonal wall shadow traces (XY back wall, XZ floor)
          const xzFloorPts = samples.map(
            s => new THREE.Vector3(s.primary.r.x, 0.08, s.primary.r.z)
          );
          const xyBackPts = samples.map(
            s => new THREE.Vector3(s.primary.r.x, s.primary.r.y + 0.46, -10.8)
          );
          const xzTube = createTubeFromPoints(xzFloorPts, 0.055, 0xfbbf24, 0.6);
          const xyTube = createTubeFromPoints(xyBackPts, 0.055, 0x38bdf8, 0.6);
          if (xzTube) trailGroup.add(xzTube);
          if (xyTube) trailGroup.add(xyTube);
        }
      }

      applyImmediateKinematics();
      requestRender();
    }

    function applyImmediateKinematics() {
      const p = latestPropsRef.current;
      const st = evaluateMotion15State(p.scenario, p.simTime, p.params);
      const pr = st.primary.r;

      const zOffsetPrimary = p.scenario === 'drop_vs_launch' ? 0.55 : pr.z;
      primaryBodyGroup.position.set(pr.x, pr.y + 0.46, zOffsetPrimary);
      primaryFloorShadow.position.set(pr.x, 0.025, zOffsetPrimary);

      // Body A (Reference Drop in drop_vs_launch)
      if (p.scenario === 'drop_vs_launch' && st.referenceDrop) {
        dropRefGroup.visible = true;
        dropRefShadow.visible = true;
        dropRefGroup.position.set(
          st.referenceDrop.r.x,
          st.referenceDrop.r.y + 0.46,
          -1.35
        );
        dropRefShadow.position.set(st.referenceDrop.r.x, 0.025, -1.35);

        // Iso-elevation horizontal bar linking Body A and Body B when airborne at same y
        const dy = Math.abs(pr.y - st.referenceDrop.r.y);
        if (dy < 0.15 && Math.abs(pr.x - st.referenceDrop.r.x) > 0.15) {
          syncBarMesh.visible = true;
          const dx = pr.x - st.referenceDrop.r.x;
          const dz = zOffsetPrimary - -1.35;
          const dist = Math.hypot(dx, dz);
          syncBarMesh.scale.set(dist, 1, 1);
          syncBarMesh.position.set(
            (pr.x + st.referenceDrop.r.x) * 0.5,
            pr.y + 0.46,
            (zOffsetPrimary + -1.35) * 0.5
          );
          syncBarMesh.rotation.y = -Math.atan2(dz, dx);
        } else {
          syncBarMesh.visible = false;
        }
      } else {
        dropRefGroup.visible = false;
        dropRefShadow.visible = false;
        syncBarMesh.visible = false;
      }

      // Scaled Ghost Body in projectile_2d (Skill 2.D)
      if (p.scenario === 'projectile_2d' && st.scaledComparison) {
        scaledGhostGroup.visible = true;
        scaledGhostGroup.position.set(
          st.scaledComparison.r.x,
          st.scaledComparison.r.y + 0.46,
          st.scaledComparison.r.z
        );
      } else {
        scaledGhostGroup.visible = false;
      }

      // Orthogonal Axis Projections (EK 1.5.A.1)
      if (p.showProjections) {
        xProjDisc.visible = true;
        yProjCollar.visible = true;
        projXLine.visible = true;
        projYLine.visible = true;

        xProjDisc.position.set(pr.x, 0.08, 0);
        yProjCollar.position.set(0, pr.y + 0.46, -1.6);

        const xAttr = projXLineGeo.attributes.position as THREE.BufferAttribute;
        xAttr.setXYZ(0, pr.x, pr.y + 0.46, zOffsetPrimary);
        xAttr.setXYZ(1, pr.x, 0.08, 0);
        xAttr.needsUpdate = true;

        const yAttr = projYLineGeo.attributes.position as THREE.BufferAttribute;
        yAttr.setXYZ(0, pr.x, pr.y + 0.46, zOffsetPrimary);
        yAttr.setXYZ(1, 0, pr.y + 0.46, -1.6);
        yAttr.needsUpdate = true;

        if (p.scenario === 'qualitative_3d') {
          zProjNode.visible = true;
          zProjNode.position.set(pr.x, 0.28, pr.z);
        } else {
          zProjNode.visible = false;
        }
      } else {
        xProjDisc.visible = false;
        yProjCollar.visible = false;
        zProjNode.visible = false;
        projXLine.visible = false;
        projYLine.visible = false;
      }

      // Vector Arrows at Body B
      _tmpOrigin.copy(primaryBodyGroup.position);
      const vScale = 0.28;
      const aScale = 0.36;
      const pv = st.primary.v;
      const pa = st.primary.a;

      updateVectorArrow(arrowVTotal, _tmpOrigin, pv.x, pv.y, pv.z, vScale, p.showTotalVel);
      updateVectorArrow(arrowVX, _tmpOrigin, pv.x, 0, 0, vScale, p.showComponentVel);
      updateVectorArrow(arrowVY, _tmpOrigin, 0, pv.y, 0, vScale, p.showComponentVel);
      updateVectorArrow(
        arrowVZ,
        _tmpOrigin,
        0,
        0,
        pv.z,
        vScale,
        p.showComponentVel && p.scenario === 'qualitative_3d'
      );
      updateVectorArrow(arrowAccel, _tmpOrigin, pa.x, pa.y, pa.z, aScale, p.showAccel);
    }

    function snapCameraToPreset() {
      const p = latestPropsRef.current;
      cameraTransitionActive = true;
      if (p.scenario === 'qualitative_3d') {
        if (p.viewMode === '2d') {
          _targetCamPos.set(0, 26, 0.01);
          _targetLook.set(0, 3, 0);
        } else {
          _targetCamPos.set(14, 13, 18);
          _targetLook.set(0, 4.5, 0);
        }
      } else if (p.scenario === 'projectile_2d') {
        if (p.viewMode === '2d') {
          _targetCamPos.set(22, 7.5, 48);
          _targetLook.set(22, 7.5, 0);
        } else {
          _targetCamPos.set(21, 14, 44);
          _targetLook.set(19, 6.2, 0);
        }
      } else if (p.viewMode === '2d') {
        _targetCamPos.set(9, 6.5, 34);
        _targetLook.set(9, 6.5, 0);
      } else {
        _targetCamPos.set(15, 12, 27);
        _targetLook.set(7, 5.2, 0);
      }
      requestRender();
    }

    // Frame pacing & coalesced rendering
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastTickMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepAndRender() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.min(0.1, Math.max(0.001, (now - lastTickMs) / 1000));
      lastTickMs = now;

      const p = latestPropsRef.current;

      if (p.isPlaying) {
        let nextT = p.simTime + rawDt * p.playbackSpeed;
        if (nextT > p.maxTime) nextT = 0;
        p.onAdvanceTime(nextT);
      }

      if (cameraTransitionActive) {
        const dampLambda = isSoftwareGl ? 12 : 7;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, dampLambda, rawDt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, dampLambda, rawDt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, dampLambda, rawDt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, dampLambda, rawDt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, dampLambda, rawDt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, dampLambda, rawDt);
        if (camera.position.distanceToSquared(_targetCamPos) < 0.01) {
          camera.position.copy(_targetCamPos);
          controls.target.copy(_targetLook);
          cameraTransitionActive = false;
        }
      }

      applyImmediateKinematics();
      controls.update();
      renderer.render(scene, camera);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        stepAndRender();
        const done = () => {
          if (disposed) return;
          renderBusy = false;
          if (renderDirty || latestPropsRef.current.isPlaying || cameraTransitionActive) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('change', () => requestRender());

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 800;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    sceneSyncRef.current = {
      rebuildDynamicWorld,
      snapCameraToPreset,
      requestRender,
    };

    rebuildDynamicWorld();
    snapCameraToPreset();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      clearGroupMeshes(scenarioPropsGroup);
      clearGroupMeshes(trailGroup);
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    sceneSyncRef.current?.rebuildDynamicWorld();
  }, [props.scenario, props.params, props.showTrails, props.maxTime]);

  useEffect(() => {
    sceneSyncRef.current?.snapCameraToPreset();
  }, [props.viewMode, props.scenario]);

  useEffect(() => {
    sceneSyncRef.current?.requestRender();
  }, [
    props.simTime,
    props.isPlaying,
    props.showTotalVel,
    props.showComponentVel,
    props.showAccel,
    props.showProjections,
  ]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="motion15-canvas"
      className="absolute inset-0 w-full h-full"
      aria-label="Interactive 2D and 3D Motion Viewport"
    />
  );
};
