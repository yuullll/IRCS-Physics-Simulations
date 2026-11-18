'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ObserverFrameId,
  RelativeMotionParams,
  RelativeScenarioId,
  Vec3,
  evaluateRelativeState,
  sampleRelativeTrajectories,
} from '@/lib/physics/relative-motion-1-4';

export interface RelativeMotion14ViewportProps {
  scenario: RelativeScenarioId;
  preferred2DPlane: 'xy' | 'xz';
  maxTime: number;
  params: RelativeMotionParams;
  simTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  observerFrame: ObserverFrameId;
  viewMode: '3d' | '2d';
  showVPE: boolean;
  showVPM: boolean;
  showVME: boolean;
  showAccel: boolean;
  showTrails: boolean;
  onAdvanceTime: (nextTime: number) => void;
}

// Pre-allocated math helpers outside render loop
const _tmpDir = new THREE.Vector3();
const _tmpOrigin = new THREE.Vector3();
const _tmpUp = new THREE.Vector3(0, 1, 0);
const _tmpQuat = new THREE.Quaternion();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _earthPos = new THREE.Vector3();
const _platPos = new THREE.Vector3();
const _objPos = new THREE.Vector3();

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
    roughness: 0.32,
    metalness: 0.15,
  });
  const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 14);
  shaftGeo.translate(0, 0.5, 0);
  const headGeo = new THREE.ConeGeometry(0.22, 0.52, 16);
  headGeo.translate(0, 0.26, 0);

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
  vec: Vec3,
  scaleFactor: number,
  visible: boolean
) {
  _tmpDir.set(vec.x, vec.y, -vec.z).multiplyScalar(scaleFactor);
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

  const headLen = Math.min(0.56, len * 0.36);
  const shaftLen = Math.max(0.05, len - headLen);
  arrow.shaft.scale.set(1, shaftLen, 1);
  arrow.head.position.set(0, shaftLen, 0);
  arrow.head.scale.set(1, headLen / 0.52, 1);
}

function createTubeFromPoints(
  points: THREE.Vector3[],
  radius: number,
  colorHex: number,
  opacity: number
): THREE.Mesh | null {
  if (points.length < 2) return null;
  // Filter duplicate adjacent points to prevent CatmullRom NaN
  const deduped: THREE.Vector3[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceToSquared(deduped[deduped.length - 1]) > 1e-6) {
      deduped.push(points[i]);
    }
  }
  if (deduped.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(deduped);
  const geo = new THREE.TubeGeometry(curve, Math.max(12, deduped.length), radius, 8, false);
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
    grad.addColorStop(0, 'rgba(0,0,0,0.62)');
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

export const RelativeMotion14Viewport: React.FC<RelativeMotion14ViewportProps> = (props) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const latestPropsRef = useRef(props);

  useEffect(() => {
    latestPropsRef.current = props;
  });

  // Track structural rebuild keys (scenario / params / observerFrame / showTrails)
  const sceneSyncRef = useRef<{
    rebuildDynamicWorld: () => void;
    snapCameraToPreset: () => void;
    requestRender: () => void;
  } | null>(null);

  // Mount Three.js WebGL scene ONCE
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
    scene.fog = new THREE.FogExp2(0x040b09, 0.011);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 300);
    camera.position.set(16, 13, 24);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 6;
    controls.maxDistance = 85;
    controls.target.set(0, 1.5, 0);

    let cameraTransitionActive = false;
    controls.addEventListener('start', () => {
      cameraTransitionActive = false;
    });

    // Studio Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x9be7ff, 0x091812, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(18, 28, 16);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -28;
    keyLight.shadow.camera.right = 28;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-16, 10, -18);
    scene.add(rimLight);

    // Subtle deep ground base (always beneath everything)
    const baseFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({
        color: 0x05110d,
        roughness: 0.92,
        metalness: 0.05,
      })
    );
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = -0.04;
    baseFloor.receiveShadow = true;
    scene.add(baseFloor);

    // -------------------------------------------------------------------------
    // EARTH FRAME E WORLD GROUP (moves by offset in Platform/Object frames)
    // -------------------------------------------------------------------------
    const earthWorldGroup = new THREE.Group();
    scene.add(earthWorldGroup);

    const earthGrid = new THREE.GridHelper(120, 60, 0x10b981, 0x0c2b21);
    earthGrid.position.y = 0.01;
    earthWorldGroup.add(earthGrid);

    // Trackside / Ground milepost pylons (composite 3-part geometry for unmistakable motion)
    const pylonGroup = new THREE.Group();
    earthWorldGroup.add(pylonGroup);

    const pylonBaseGeo = new THREE.BoxGeometry(0.7, 0.25, 0.7);
    const pylonColGeo = new THREE.CylinderGeometry(0.11, 0.14, 1.8, 10);
    const pylonCapGeo = new THREE.OctahedronGeometry(0.22, 0);
    const pylonBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.75,
      metalness: 0.3,
    });
    const pylonColMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.45,
      metalness: 0.55,
    });
    const pylonBeaconMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    });

    for (let x = -40; x <= 40; x += 8) {
      for (const zSign of [-1, 1]) {
        const pylon = new THREE.Group();
        const base = new THREE.Mesh(pylonBaseGeo, pylonBaseMat);
        base.position.y = 0.125;
        const col = new THREE.Mesh(pylonColGeo, pylonColMat);
        col.position.y = 1.15;
        const cap = new THREE.Mesh(pylonCapGeo, pylonBeaconMat);
        cap.position.y = 2.2;
        pylon.add(base, col, cap);
        pylon.position.set(x, 0, zSign * 14.5);
        pylonGroup.add(pylon);
      }
    }

    // Scenario-specific Earth environment container (river banks/water vs rail/highway strip)
    const earthBackdropGroup = new THREE.Group();
    earthWorldGroup.add(earthBackdropGroup);

    // -------------------------------------------------------------------------
    // PLATFORM FRAME M GROUP (Composite multi-part cart / water frame / wind cage)
    // -------------------------------------------------------------------------
    const platformGroup = new THREE.Group();
    scene.add(platformGroup);
    const platformShadow = createSoftShadowDisc(2.2);
    platformShadow.position.y = 0.025;
    platformGroup.add(platformShadow);
    const platformVisualGroup = new THREE.Group();
    platformGroup.add(platformVisualGroup);

    // -------------------------------------------------------------------------
    // MOVING OBJECT P GROUP (Composite ball / boat / car / quadrotor)
    // -------------------------------------------------------------------------
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    const objectShadow = createSoftShadowDisc(1.25);
    objectShadow.position.y = 0.03;
    scene.add(objectShadow);
    const objectVisualGroup = new THREE.Group();
    objectGroup.add(objectVisualGroup);

    // -------------------------------------------------------------------------
    // OBSERVER ORIGIN FRAME AXES & DYNAMIC TRAJECTORY GROUP
    // -------------------------------------------------------------------------
    const observerAxes = new THREE.AxesHelper(3.4);
    observerAxes.position.y = 0.06;
    scene.add(observerAxes);

    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    // 3D Vector Arrows attached in real time
    const arrowVME = createVectorArrow(0xfbbf24); // Amber: v_M/E
    const arrowVPM = createVectorArrow(0x38bdf8); // Sky:   v_P/M
    const arrowVPE = createVectorArrow(0x34d399); // Emerald: v_P/E
    const arrowAccel = createVectorArrow(0xfb7185); // Coral: a_P
    scene.add(arrowVME.group, arrowVPM.group, arrowVPE.group, arrowAccel.group);

    // Helper: Clear group cleanly disposing dynamic geometries/materials
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

    function buildPlatformModel(sc: RelativeScenarioId) {
      clearGroupMeshes(platformVisualGroup);

      // Local coordinate deck ring on M (cyan perimeter)
      const deckRing = new THREE.Mesh(
        new THREE.RingGeometry(2.3, 2.48, 36),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
        })
      );
      deckRing.rotation.x = -Math.PI / 2;
      deckRing.position.y = 0.04;
      platformVisualGroup.add(deckRing);

      if (sc === 'train_toss' || sc === 'highway_overtake') {
        // 7-part composite flatbed cart / cruiser frame M
        const chassis = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.52, 2.2),
          new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.42,
            metalness: 0.45,
          })
        );
        chassis.position.y = 0.65;
        chassis.castShadow = true;

        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 0.14, 1.95),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.78,
            metalness: 0.2,
          })
        );
        deck.position.y = 0.96;

        const cab = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.65, 1.6),
          new THREE.MeshStandardMaterial({
            color: 0xd97706,
            roughness: 0.3,
            metalness: 0.55,
          })
        );
        cab.position.set(1.25, 1.32, 0);
        cab.castShadow = true;

        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.36, 1.35),
          new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            roughness: 0.12,
            metalness: 0.85,
          })
        );
        visor.position.set(1.75, 1.38, 0);

        const launcherBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.34, 0.45, 16),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.35,
            metalness: 0.6,
          })
        );
        launcherBase.position.set(sc === 'train_toss' ? 0 : -0.6, 1.24, 0);

        const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 18);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.85,
          metalness: 0.15,
        });
        for (const wx of [-1.35, 1.35]) {
          for (const wz of [-1.05, 1.05]) {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(wx, 0.38, wz);
            w.castShadow = true;
            platformVisualGroup.add(w);
          }
        }
        platformVisualGroup.add(chassis, deck, cab, visor, launcherBase);
      } else if (sc === 'river_crossing') {
        // Drifting Water Parcel Reference Frame M (4 corner floats + grid raft)
        const floatGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.45, 14);
        const floatMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.35,
          metalness: 0.35,
        });
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.5,
          metalness: 0.4,
        });
        const barH = new THREE.BoxGeometry(3.2, 0.08, 0.08);
        const barV = new THREE.BoxGeometry(0.08, 0.08, 3.2);
        const b1 = new THREE.Mesh(barH, frameMat);
        b1.position.set(0, 0.2, 1.5);
        const b2 = new THREE.Mesh(barH, frameMat);
        b2.position.set(0, 0.2, -1.5);
        const b3 = new THREE.Mesh(barV, frameMat);
        b3.position.set(1.5, 0.2, 0);
        const b4 = new THREE.Mesh(barV, frameMat);
        b4.position.set(-1.5, 0.2, 0);
        platformVisualGroup.add(b1, b2, b3, b4);
        for (const fx of [-1.5, 1.5]) {
          for (const fz of [-1.5, 1.5]) {
            const fl = new THREE.Mesh(floatGeo, floatMat);
            fl.position.set(fx, 0.22, fz);
            platformVisualGroup.add(fl);
          }
        }
      } else {
        // Crosswind Air-Mass Anemometer Platform M (corner masts + ring)
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 10);
        const poleMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.4,
          metalness: 0.6,
        });
        const cupMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.25,
          metalness: 0.5,
        });
        for (const px of [-1.8, 1.8]) {
          for (const pz of [-1.8, 1.8]) {
            const p = new THREE.Mesh(poleGeo, poleMat);
            p.position.set(px, 0.9, pz);
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), cupMat);
            cap.position.set(px, 1.85, pz);
            platformVisualGroup.add(p, cap);
          }
        }
      }
    }

    function buildObjectModel(sc: RelativeScenarioId) {
      clearGroupMeshes(objectVisualGroup);

      if (sc === 'train_toss') {
        // 3-part ballistic projectile ball with glowing equator band
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 24, 24),
          new THREE.MeshStandardMaterial({
            color: 0x34d399,
            roughness: 0.22,
            metalness: 0.45,
          })
        );
        sphere.position.y = 1.45;
        sphere.castShadow = true;

        const equator = new THREE.Mesh(
          new THREE.TorusGeometry(0.43, 0.04, 10, 28),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.5,
            roughness: 0.2,
          })
        );
        equator.rotation.x = Math.PI / 2;
        equator.position.y = 1.45;

        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 14, 14),
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfef08a,
            emissiveIntensity: 0.35,
          })
        );
        cap.position.y = 1.85;
        objectVisualGroup.add(sphere, equator, cap);
      } else if (sc === 'river_crossing') {
        // 5-part composite research boat P pointing forward along heading
        const hullShape = new THREE.Shape();
        hullShape.moveTo(-0.7, -1.2);
        hullShape.lineTo(0.7, -1.2);
        hullShape.lineTo(0.85, 0.5);
        hullShape.lineTo(0, 1.55);
        hullShape.lineTo(-0.85, 0.5);
        hullShape.closePath();

        const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
          depth: 0.45,
          bevelEnabled: true,
          bevelThickness: 0.08,
          bevelSize: 0.08,
          bevelSegments: 2,
        });
        hullGeo.rotateX(Math.PI / 2);
        hullGeo.rotateY(Math.PI); // Bow points along -Z_scene (across-river +Z_math)

        const hull = new THREE.Mesh(
          hullGeo,
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            roughness: 0.38,
            metalness: 0.35,
          })
        );
        hull.position.y = 0.52;
        hull.castShadow = true;

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.45, 0.95),
          new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.25,
            metalness: 0.15,
          })
        );
        cabin.position.set(0, 0.72, 0.15);

        const windshield = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.26, 0.2),
          new THREE.MeshStandardMaterial({
            color: 0x0284c7,
            roughness: 0.12,
            metalness: 0.85,
          })
        );
        windshield.position.set(0, 0.76, -0.32);

        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.45, 10),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.6,
          })
        );
        beacon.position.set(0, 1.12, 0.2);
        objectVisualGroup.add(hull, cabin, windshield, beacon);
      } else if (sc === 'highway_overtake') {
        // 6-part composite Test Car P
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.55, 1.55),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            roughness: 0.32,
            metalness: 0.55,
          })
        );
        body.position.y = 0.55;
        body.castShadow = true;

        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(1.65, 0.45, 1.3),
          new THREE.MeshStandardMaterial({
            color: 0x047857,
            roughness: 0.25,
            metalness: 0.4,
          })
        );
        roof.position.set(-0.1, 1.0, 0);

        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(1.72, 0.3, 1.18),
          new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            roughness: 0.1,
            metalness: 0.88,
          })
        );
        glass.position.set(-0.08, 0.98, 0);

        const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.85,
        });
        for (const wx of [-1.0, 1.0]) {
          for (const wz of [-0.78, 0.78]) {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(wx, 0.32, wz);
            objectVisualGroup.add(w);
          }
        }
        objectVisualGroup.add(body, roof, glass);
      } else {
        // 7-part composite Quadrotor Drone P
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.45, 0.32, 8),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            roughness: 0.3,
            metalness: 0.6,
          })
        );
        hub.position.y = 1.1;
        hub.castShadow = true;

        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.15,
            metalness: 0.85,
          })
        );
        dome.position.y = 1.24;

        const armGeo = new THREE.BoxGeometry(2.3, 0.09, 0.14);
        const armMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.6,
          metalness: 0.45,
        });
        const a1 = new THREE.Mesh(armGeo, armMat);
        a1.position.y = 1.1;
        a1.rotation.y = Math.PI / 4;
        const a2 = new THREE.Mesh(armGeo, armMat);
        a2.position.y = 1.1;
        a2.rotation.y = -Math.PI / 4;

        const rotorMat = new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x10b981,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.8,
        });
        const rotorGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16);
        for (const [rx, rz] of [
          [0.82, 0.82],
          [-0.82, 0.82],
          [0.82, -0.82],
          [-0.82, -0.82],
        ]) {
          const rot = new THREE.Mesh(rotorGeo, rotorMat);
          rot.position.set(rx, 1.2, rz);
          objectVisualGroup.add(rot);
        }
        objectVisualGroup.add(hub, dome, a1, a2);
      }
    }

    function buildEarthBackdrop(sc: RelativeScenarioId) {
      clearGroupMeshes(earthBackdropGroup);
      if (sc === 'river_crossing') {
        // 24 m River water band from z = -12 to z = +12 + north/south embankments
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(110, 24),
          new THREE.MeshStandardMaterial({
            color: 0x0c4a6e,
            roughness: 0.18,
            metalness: 0.45,
            transparent: true,
            opacity: 0.88,
          })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.02;

        const bankMat = new THREE.MeshStandardMaterial({
          color: 0x064e3b,
          roughness: 0.88,
          metalness: 0.05,
        });
        const southBank = new THREE.Mesh(new THREE.BoxGeometry(110, 0.45, 8), bankMat);
        southBank.position.set(0, 0.18, 16);
        const northBank = new THREE.Mesh(new THREE.BoxGeometry(110, 0.45, 8), bankMat);
        northBank.position.set(0, 0.18, -16);

        // Crisp 24 m channel shoreline markers at z = ±12
        const shoreEdgeGeo = new THREE.BoxGeometry(110, 0.12, 0.32);
        const shoreEdgeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
        const southEdge = new THREE.Mesh(shoreEdgeGeo, shoreEdgeMat);
        southEdge.position.set(0, 0.38, 12.0);
        const northEdge = new THREE.Mesh(shoreEdgeGeo, shoreEdgeMat);
        northEdge.position.set(0, 0.38, -12.0);

        // Current flow chevrons/stripes on river
        const stripeGeo = new THREE.BoxGeometry(2.6, 0.02, 0.16);
        const stripeMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
        });
        for (let sx = -36; sx <= 36; sx += 9) {
          for (const sz of [-6, 0, 6]) {
            const st = new THREE.Mesh(stripeGeo, stripeMat);
            st.position.set(sx, 0.04, sz);
            earthBackdropGroup.add(st);
          }
        }
        earthBackdropGroup.add(water, southBank, northBank, southEdge, northEdge);
      } else if (sc === 'train_toss' || sc === 'highway_overtake') {
        // Dual lane / rail strip along X
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(116, 7.6),
          new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.86,
            metalness: 0.1,
          })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.015;
        earthBackdropGroup.add(road);

        const railMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.35,
          metalness: 0.75,
        });
        for (const rz of [-1.2, 1.2]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(116, 0.06, 0.14), railMat);
          rail.position.set(0, 0.04, rz);
          earthBackdropGroup.add(rail);
        }
      }
    }

    function rebuildDynamicWorld() {
      const p = latestPropsRef.current;
      buildEarthBackdrop(p.scenario);
      buildPlatformModel(p.scenario);
      buildObjectModel(p.scenario);

      // Rebuild Trajectory Tubes in the currently selected Observer Frame
      clearGroupMeshes(trailGroup);
      if (p.showTrails) {
        const samples = sampleRelativeTrajectories(
          p.scenario,
          p.params,
          p.observerFrame,
          p.simTime,
          80
        );
        const yOff = p.scenario === 'train_toss' ? 1.45 : 0.65;
        const obsPts = samples.map(
          s => new THREE.Vector3(s.posInObserver.x, s.posInObserver.y + yOff, -s.posInObserver.z)
        );
        const primaryColor = p.observerFrame === 'platform' ? 0x38bdf8 : 0x34d399;
        const tube = createTubeFromPoints(obsPts, 0.075, primaryColor, 0.72);
        if (tube) trailGroup.add(tube);

        // When riding Frame M, also show faint ghost Earth-frame trajectory anchored relative to Earth
        if (p.observerFrame === 'platform') {
          const stNow = evaluateRelativeState(p.scenario, p.simTime, p.params);
          const ghostPts = samples.map(
            s =>
              new THREE.Vector3(
                s.rPE.x - stNow.rME.x,
                s.rPE.y + yOff,
                -(s.rPE.z - stNow.rME.z)
              )
          );
          const ghostTube = createTubeFromPoints(ghostPts, 0.045, 0x10b981, 0.35);
          if (ghostTube) trailGroup.add(ghostTube);
        }
      }

      applyImmediateKinematics();
      requestRender();
    }

    function applyImmediateKinematics() {
      const p = latestPropsRef.current;
      const st = evaluateRelativeState(p.scenario, p.simTime, p.params);

      // Shift world so selected observer frame origin stays cleanly centered (+Z_math -> -Z_scene)
      if (p.observerFrame === 'earth') {
        _earthPos.set(0, 0, 0);
        _platPos.set(st.rME.x, st.rME.y, -st.rME.z);
        _objPos.set(st.rPE.x, st.rPE.y, -st.rPE.z);
      } else if (p.observerFrame === 'platform') {
        _earthPos.set(-st.rME.x, -st.rME.y, st.rME.z);
        _platPos.set(0, 0, 0);
        _objPos.set(st.rPM.x, st.rPM.y, -st.rPM.z);
      } else {
        // Object P frame: P sits at (0, 0, 0)
        _earthPos.set(-st.rPE.x, -st.rPE.y, st.rPE.z);
        _platPos.set(st.rME.x - st.rPE.x, st.rME.y - st.rPE.y, -(st.rME.z - st.rPE.z));
        _objPos.set(0, 0, 0);
      }

      earthWorldGroup.position.copy(_earthPos);
      platformGroup.position.copy(_platPos);
      // Offset Z slightly in highway overtake so Observer Car M and Test Car P run in parallel lanes
      if (p.scenario === 'highway_overtake') {
        platformGroup.position.z = 2.2;
        objectGroup.position.set(_objPos.x, _objPos.y, _objPos.z - 2.2);
        objectShadow.position.set(_objPos.x, 0.03, _objPos.z - 2.2);
      } else {
        objectGroup.position.copy(_objPos);
        objectShadow.position.set(_objPos.x, 0.03, _objPos.z);
      }

      // Orient Boat along heading relative to water in river_crossing (-Z_scene is 0° across-river)
      if (p.scenario === 'river_crossing') {
        objectVisualGroup.rotation.y = -(p.params.boatHeadingDeg * Math.PI) / 180;
      } else {
        objectVisualGroup.rotation.y = 0;
      }

      const arrowHeight = p.scenario === 'train_toss' ? 1.45 : 1.38;
      _tmpOrigin.set(
        objectGroup.position.x,
        objectGroup.position.y + arrowHeight,
        objectGroup.position.z
      );

      const vecScale = 0.62;
      // Tip-to-tail or co-located vector arrows attached cleanly above Object P
      updateVectorArrow(arrowVPE, _tmpOrigin, st.vPE, vecScale, p.showVPE);
      updateVectorArrow(arrowVPM, _tmpOrigin, st.vPM, vecScale, p.showVPM);
      // Show v_M/E originating from Platform M beacon
      const platOrigin = _tmpOrigin.clone().copy(platformGroup.position);
      platOrigin.y += 1.85;
      updateVectorArrow(arrowVME, platOrigin, st.vME, vecScale, p.showVME);
      updateVectorArrow(arrowAccel, _tmpOrigin, st.aPE, 0.45, p.showAccel);
    }

    function snapCameraToPreset() {
      const p = latestPropsRef.current;
      cameraTransitionActive = true;
      if (p.viewMode === '2d') {
        if (p.preferred2DPlane === 'xy') {
          _targetCamPos.set(0, 4.5, 30);
          _targetLook.set(0, 4.5, 0);
        } else {
          _targetCamPos.set(0, 44, 0.01);
          _targetLook.set(0, 0, 0);
        }
      } else {
        _targetCamPos.set(16, 13, 24);
        _targetLook.set(0, 1.5, 0);
      }
      requestRender();
    }

    // Frame pacing & on-demand coalescing (software-WebGL safe)
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

      // Advance simulation time smoothly when playing
      if (p.isPlaying) {
        let nextT = p.simTime + rawDt * p.playbackSpeed;
        if (nextT > p.maxTime) nextT = 0;
        p.onAdvanceTime(nextT);
      }

      // Smooth exponential camera preset damping
      if (cameraTransitionActive) {
        const dampLambda = isSoftwareGl ? 12 : 7;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCamPos.x,
          dampLambda,
          rawDt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCamPos.y,
          dampLambda,
          rawDt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCamPos.z,
          dampLambda,
          rawDt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _targetLook.x,
          dampLambda,
          rawDt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _targetLook.y,
          dampLambda,
          rawDt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _targetLook.z,
          dampLambda,
          rawDt
        );
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
      clearGroupMeshes(earthBackdropGroup);
      clearGroupMeshes(platformVisualGroup);
      clearGroupMeshes(objectVisualGroup);
      clearGroupMeshes(trailGroup);
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync structural changes (scenario, params, observerFrame, trails)
  useEffect(() => {
    sceneSyncRef.current?.rebuildDynamicWorld();
  }, [props.scenario, props.params, props.observerFrame, props.showTrails]);

  // Sync camera preset changes
  useEffect(() => {
    sceneSyncRef.current?.snapCameraToPreset();
  }, [props.viewMode, props.preferred2DPlane]);

  // Sync playback & scrubbing renders
  useEffect(() => {
    sceneSyncRef.current?.requestRender();
  }, [
    props.simTime,
    props.isPlaying,
    props.showVPE,
    props.showVPM,
    props.showVME,
    props.showAccel,
  ]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="relative14-canvas"
      className="absolute inset-0 w-full h-full"
      aria-label="Interactive 3D Reference Frames and Relative Motion Viewport"
    />
  );
};
