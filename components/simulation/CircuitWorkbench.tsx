'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CircuitComponentData,
  CircuitWireData,
  ComponentType,
  solveCircuitMNA,
} from '@/lib/physics/mna-solver';

export interface CircuitWorkbenchControls {
  flowConvention: 'conventional' | 'electron';
  showArrows: boolean;
  driftSpeed: number;
  activeTool: 'select' | 'wire' | 'cut' | 'multimeter_probe';
  viewMode: '3d' | 'top';
  wireRouting?: 'orthogonal' | 'curved';
}

interface CircuitWorkbenchProps {
  controlsState: CircuitWorkbenchControls;
  onSelectComponent: (comp: CircuitComponentData | null) => void;
  selectedComponentId: string | null;
  onUpdateTelemetry: (data: {
    supplyEmf: number;
    totalCurrent: number;
    activeComponents: number;
    wireCount: number;
    kclMaxResidual: number;
    kvlVerified: boolean;
    probeVoltage?: number;
  }) => void;
  onOscilloscopeSample?: (v: number, i: number) => void;
}

let compCounter = 1;
let wireCounter = 1;

// Pure Terminal Post visual creator
function createTerminalPost(pos: THREE.Vector3, name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.26, 16),
    new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 })
  );
  group.add(base);

  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 })
  );
  screw.position.y = 0.2;
  group.add(screw);

  group.position.copy(pos);
  return group;
}

// Pure Preset circuit data definitions
function getPresetCircuitData(preset: string): {
  components: CircuitComponentData[];
  wires: CircuitWireData[];
} {
  const components: CircuitComponentData[] = [];
  const wires: CircuitWireData[] = [];

  if (preset === 'blank') {
    return { components, wires };
  }

  if (preset === 'parallel') {
    components.push(
      { id: 'batt_1', type: 'battery', x: -6.0, z: 0, rotationY: -Math.PI / 2, value: 9.0 },
      { id: 'sw_1', type: 'switch', x: -2.0, z: -3.0, rotationY: 0, value: 1, closed: true },
      { id: 'bulb_1', type: 'bulb', x: 2.0, z: 0, rotationY: -Math.PI / 2, value: 12.0 },
      { id: 'bulb_2', type: 'bulb', x: 6.0, z: 0, rotationY: -Math.PI / 2, value: 12.0 },
      { id: 'amet_1', type: 'ammeter', x: -2.0, z: 3.0, rotationY: Math.PI, value: 0.001 }
    );
    wires.push(
      { id: 'w1', fromCompId: 'batt_1', fromTermId: 'pos', toCompId: 'sw_1', toTermId: 'hinge', current: 0 },
      { id: 'w2', fromCompId: 'sw_1', fromTermId: 'contact', toCompId: 'bulb_1', toTermId: 'term1', current: 0 },
      { id: 'w3', fromCompId: 'bulb_1', fromTermId: 'term1', toCompId: 'bulb_2', toTermId: 'term1', current: 0 },
      { id: 'w4', fromCompId: 'bulb_2', fromTermId: 'term2', toCompId: 'bulb_1', toTermId: 'term2', current: 0 },
      { id: 'w5', fromCompId: 'bulb_1', fromTermId: 'term2', toCompId: 'amet_1', toTermId: 'in', current: 0 },
      { id: 'w6', fromCompId: 'amet_1', fromTermId: 'out', toCompId: 'batt_1', toTermId: 'neg', current: 0 }
    );
  } else if (preset === 'series') {
    components.push(
      { id: 'batt_1', type: 'battery', x: -6.0, z: 0, rotationY: -Math.PI / 2, value: 9.0 },
      { id: 'sw_1', type: 'switch', x: -2.0, z: -3.0, rotationY: 0, value: 1, closed: true },
      { id: 'res_1', type: 'resistor', x: 3.0, z: -3.0, rotationY: 0, value: 15.0 },
      { id: 'bulb_1', type: 'bulb', x: 6.0, z: 0, rotationY: -Math.PI / 2, value: 10.0 },
      { id: 'vmet_1', type: 'voltmeter', x: 3.0, z: 1.5, rotationY: 0, value: 1e7 }
    );
    wires.push(
      { id: 'w1', fromCompId: 'batt_1', fromTermId: 'pos', toCompId: 'sw_1', toTermId: 'hinge', current: 0 },
      { id: 'w2', fromCompId: 'sw_1', fromTermId: 'contact', toCompId: 'res_1', toTermId: 'term1', current: 0 },
      { id: 'w3', fromCompId: 'res_1', fromTermId: 'term2', toCompId: 'bulb_1', toTermId: 'term1', current: 0 },
      { id: 'w4', fromCompId: 'bulb_1', fromTermId: 'term2', toCompId: 'batt_1', toTermId: 'neg', current: 0 },
      // Voltmeter measuring across resistor
      { id: 'w5', fromCompId: 'res_1', fromTermId: 'term1', toCompId: 'vmet_1', toTermId: 'pos', current: 0 },
      { id: 'w6', fromCompId: 'res_1', fromTermId: 'term2', toCompId: 'vmet_1', toTermId: 'neg', current: 0 }
    );
  } else if (preset === 'rc') {
    components.push(
      { id: 'batt_1', type: 'battery', x: -6.0, z: 0, rotationY: -Math.PI / 2, value: 12.0 },
      { id: 'sw_1', type: 'switch', x: -2.0, z: -3.0, rotationY: 0, value: 1, closed: true },
      { id: 'res_1', type: 'resistor', x: 3.0, z: -3.0, rotationY: 0, value: 20.0 },
      { id: 'cap_1', type: 'capacitor', x: 6.0, z: 0, rotationY: -Math.PI / 2, value: 470 },
      { id: 'vmet_1', type: 'voltmeter', x: 6.0, z: 3.5, rotationY: 0, value: 1e7 }
    );
    wires.push(
      { id: 'w1', fromCompId: 'batt_1', fromTermId: 'pos', toCompId: 'sw_1', toTermId: 'hinge', current: 0 },
      { id: 'w2', fromCompId: 'sw_1', fromTermId: 'contact', toCompId: 'res_1', toTermId: 'term1', current: 0 },
      { id: 'w3', fromCompId: 'res_1', fromTermId: 'term2', toCompId: 'cap_1', toTermId: 'term1', current: 0 },
      { id: 'w4', fromCompId: 'cap_1', fromTermId: 'term2', toCompId: 'batt_1', toTermId: 'neg', current: 0 },
      { id: 'w5', fromCompId: 'cap_1', fromTermId: 'term1', toCompId: 'vmet_1', toTermId: 'pos', current: 0 },
      { id: 'w6', fromCompId: 'cap_1', fromTermId: 'term2', toCompId: 'vmet_1', toTermId: 'neg', current: 0 }
    );
  } else if (preset === 'wheatstone') {
    components.push(
      { id: 'batt_1', type: 'battery', x: -7.5, z: 0, rotationY: -Math.PI / 2, value: 10.0 },
      { id: 'r1', type: 'resistor', x: -3.0, z: -3.0, rotationY: 0, value: 10.0 },
      { id: 'r2', type: 'resistor', x: 3.0, z: -3.0, rotationY: 0, value: 10.0 },
      { id: 'r3', type: 'resistor', x: -3.0, z: 3.0, rotationY: 0, value: 20.0 },
      { id: 'r4', type: 'resistor', x: 3.0, z: 3.0, rotationY: 0, value: 20.0 },
      { id: 'vmet_1', type: 'voltmeter', x: 0, z: 0, rotationY: 0, value: 1e7 }
    );
    wires.push(
      { id: 'w1', fromCompId: 'batt_1', fromTermId: 'pos', toCompId: 'r1', toTermId: 'term1', current: 0 },
      { id: 'w2', fromCompId: 'batt_1', fromTermId: 'pos', toCompId: 'r3', toTermId: 'term1', current: 0 },
      { id: 'w3', fromCompId: 'r1', fromTermId: 'term2', toCompId: 'r2', toTermId: 'term1', current: 0 },
      { id: 'w4', fromCompId: 'r3', fromTermId: 'term2', toCompId: 'r4', toTermId: 'term1', current: 0 },
      { id: 'w5', fromCompId: 'r1', fromTermId: 'term2', toCompId: 'vmet_1', toTermId: 'pos', current: 0 },
      { id: 'w6', fromCompId: 'r3', fromTermId: 'term2', toCompId: 'vmet_1', toTermId: 'neg', current: 0 },
      { id: 'w7', fromCompId: 'r2', fromTermId: 'term2', toCompId: 'batt_1', toTermId: 'neg', current: 0 },
      { id: 'w8', fromCompId: 'r4', fromTermId: 'term2', toCompId: 'batt_1', toTermId: 'neg', current: 0 }
    );
  }

  return { components, wires };
}

export const CircuitWorkbench: React.FC<CircuitWorkbenchProps> = ({
  controlsState,
  onSelectComponent,
  selectedComponentId,
  onUpdateTelemetry,
  onOscilloscopeSample,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    components: CircuitComponentData[];
    componentMeshes: Map<string, THREE.Group>;
    meterScreens: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture }>;
    wires: CircuitWireData[];
    wireMeshes: Map<
      string,
      {
        tube: THREE.Mesh;
        arrowGroup: THREE.Group;
        arrows: Array<{ mesh: THREE.Mesh; bead: THREE.Mesh; u: number }>;
        curve: THREE.CatmullRomCurve3;
      }
    >;
    selectionIndicator: THREE.Group;
    terminalHighlightRing: THREE.Mesh;
    wireStartTerminal: { compId: string; termId: string } | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    tablePlane: THREE.Plane;
    isDragging: boolean;
    dragOffset: THREE.Vector3;
    draggedCompId: string | null;
  } | null>(null);

  // Digital Meter Screen Canvas Generator
  const createMeterTexture = (type: 'voltmeter' | 'ammeter') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = type === 'voltmeter' ? '#10b981' : '#38bdf8';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(type === 'voltmeter' ? 'DIGITAL VOLTMETER' : 'DIGITAL AMMETER', 16, 32);
    ctx.font = 'bold 44px "JetBrains Mono", monospace';
    ctx.fillText('0.00 ' + (type === 'voltmeter' ? 'V' : 'A'), 16, 92);
    const texture = new THREE.CanvasTexture(canvas);
    return { canvas, ctx, texture };
  };

  // Component 3D Mesh Builders
  const buildComponentMesh = (comp: CircuitComponentData): THREE.Group => {
    const group = new THREE.Group();

    if (comp.type === 'battery') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.6, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.35, roughness: 0.3 })
      );
      body.position.y = 0.8;
      body.castShadow = true;
      group.add(body);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(2.44, 0.2, 1.44),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.75, roughness: 0.25 })
      );
      crown.position.y = 1.7;
      group.add(crown);

      // Terminal collars
      const posCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      posCollar.position.set(-0.7, 1.85, 0);
      group.add(posCollar);

      const negCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6 })
      );
      negCollar.position.set(0.7, 1.85, 0);
      group.add(negCollar);

      group.add(createTerminalPost(new THREE.Vector3(-0.7, 1.95, 0), 'pos'));
      group.add(createTerminalPost(new THREE.Vector3(0.7, 1.95, 0), 'neg'));
    } else if (comp.type === 'bulb') {
      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.78, 0.5, 24),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.15, roughness: 0.35 })
      );
      socket.position.y = 0.25;
      group.add(socket);

      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0xfff7ed,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.0,
          transparent: true,
          opacity: 0.45,
          roughness: 0.15,
        })
      );
      glass.position.set(0, 1.35, 0);
      group.add(glass);

      const filament = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.36, 12),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.0 })
      );
      filament.name = 'filament';
      filament.rotation.z = Math.PI / 2;
      filament.position.set(0, 1.25, 0);
      group.add(filament);

      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.0, side: THREE.BackSide })
      );
      corona.name = 'corona';
      corona.position.set(0, 1.35, 0);
      group.add(corona);

      const pLight = new THREE.PointLight(0xfbbf24, 0, 10, 1.2);
      pLight.name = 'pointLight';
      pLight.position.set(0, 1.35, 0);
      group.add(pLight);

      group.add(createTerminalPost(new THREE.Vector3(-0.8, 0.25, 0), 'term1'));
      group.add(createTerminalPost(new THREE.Vector3(0.8, 0.25, 0), 'term2'));
    } else if (comp.type === 'resistor') {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24),
        new THREE.MeshStandardMaterial({ color: 0xddb892, roughness: 0.35 })
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.55;
      group.add(body);

      const bandColors = [0x78350f, 0x16a34a, 0x09090b, 0xf59e0b];
      [-0.45, -0.15, 0.15, 0.45].forEach((offset, idx) => {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.12, 24),
          new THREE.MeshStandardMaterial({ color: bandColors[idx] })
        );
        band.rotation.z = Math.PI / 2;
        band.position.set(offset, 0.55, 0);
        group.add(band);
      });

      group.add(createTerminalPost(new THREE.Vector3(-1.25, 0.25, 0), 'term1'));
      group.add(createTerminalPost(new THREE.Vector3(1.25, 0.25, 0), 'term2'));
    } else if (comp.type === 'switch') {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.22, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 })
      );
      base.position.y = 0.11;
      group.add(base);

      // Knife switch blade assembly (rotates UPWARDS into +Y when open)
      const bladeAssembly = new THREE.Group();
      bladeAssembly.name = 'blade';
      bladeAssembly.position.set(-0.7, 0.35, 0);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 })
      );
      blade.position.x = 0.7;
      bladeAssembly.add(blade);

      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.45, 12),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      handle.position.set(1.3, 0.22, 0);
      bladeAssembly.add(handle);
      group.add(bladeAssembly);

      group.add(createTerminalPost(new THREE.Vector3(-0.9, 0.25, 0), 'hinge'));
      group.add(createTerminalPost(new THREE.Vector3(0.9, 0.25, 0), 'contact'));
    } else if (comp.type === 'capacitor') {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 1.4, 24),
        new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.45, roughness: 0.3 })
      );
      can.position.y = 0.7;
      group.add(can);

      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.505, 0.505, 0.08, 24),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
      );
      top.position.y = 1.38;
      group.add(top);

      group.add(createTerminalPost(new THREE.Vector3(-0.7, 0.25, 0), 'term1'));
      group.add(createTerminalPost(new THREE.Vector3(0.7, 0.25, 0), 'term2'));
    } else if (comp.type === 'inductor') {
      const coilGroup = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.35, 0.08, 12, 24),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 })
        );
        ring.position.x = (i - 2.5) * 0.22;
        ring.position.y = 0.55;
        coilGroup.add(ring);
      }
      group.add(coilGroup);

      group.add(createTerminalPost(new THREE.Vector3(-1.0, 0.25, 0), 'term1'));
      group.add(createTerminalPost(new THREE.Vector3(1.0, 0.25, 0), 'term2'));
    } else if (comp.type === 'voltmeter' || comp.type === 'ammeter') {
      const isVolt = comp.type === 'voltmeter';
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.15, 1.6),
        new THREE.MeshStandardMaterial({ color: isVolt ? 0x0f172a : 0x0b132b, roughness: 0.25, metalness: 0.3 })
      );
      body.position.y = 0.58;
      body.castShadow = true;
      group.add(body);

      // Bezel ring
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(1.82, 0.92, 0.08),
        new THREE.MeshStandardMaterial({ color: isVolt ? 0x10b981 : 0x0284c7, metalness: 0.8, roughness: 0.2 })
      );
      bezel.rotation.x = -Math.PI / 3.6;
      bezel.position.set(0, 1.05, 0.08);
      group.add(bezel);

      // Digital screen with live canvas texture
      const meterTex = createMeterTexture(comp.type);
      if (threeRef.current) {
        threeRef.current.meterScreens.set(comp.id, meterTex);
      }

      const screenMat = new THREE.MeshBasicMaterial({ map: meterTex.texture });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.8), screenMat);
      screen.name = 'meterScreen';
      screen.rotation.x = -Math.PI / 3.6;
      screen.position.set(0, 1.06, 0.13);
      group.add(screen);

      // Color-coded terminal posts
      const posCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      posCollar.position.set(-0.75, 0.35, 0.6);
      group.add(posCollar);

      const negCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      negCollar.position.set(0.75, 0.35, 0.6);
      group.add(negCollar);

      group.add(createTerminalPost(new THREE.Vector3(-0.75, 0.45, 0.6), isVolt ? 'pos' : 'in'));
      group.add(createTerminalPost(new THREE.Vector3(0.75, 0.45, 0.6), isVolt ? 'neg' : 'out'));
    } else if (comp.type === 'lead_pin' || comp.type === 'ground') {
      const isGnd = comp.type === 'ground';
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: isGnd ? 0x10b981 : 0x334155, metalness: 0.6 })
      );
      base.position.y = 0.06;
      group.add(base);

      group.add(createTerminalPost(new THREE.Vector3(0, 0.1, 0), 'term'));
    }

    group.position.set(comp.x, 0, comp.z);
    group.rotation.y = comp.rotationY;
    return group;
  };

  function getTerminalWorldPos(comp: CircuitComponentData, termId: string): THREE.Vector3 {
    const state = threeRef.current;
    if (!state) return new THREE.Vector3(comp.x, 0.5, comp.z);
    const grp = state.componentMeshes.get(comp.id);
    if (!grp) return new THREE.Vector3(comp.x, 0.5, comp.z);

    const termMesh = grp.getObjectByName(termId);
    if (termMesh) {
      const worldPos = new THREE.Vector3();
      termMesh.getWorldPosition(worldPos);
      worldPos.y += 0.25;
      return worldPos;
    }
    return new THREE.Vector3(comp.x, 0.5, comp.z);
  }

  // Generates clean wire geometry: Orthogonal Textbook 90° Routing or Catenary Cable
  function makeWireCurve(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    style: 'orthogonal' | 'curved' = 'orthogonal'
  ): THREE.CatmullRomCurve3 {
    if (style === 'curved') {
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y = Math.min(Math.max(p1.y, p2.y) + Math.min(dist * 0.25, 1.8), 3.2);
      return new THREE.CatmullRomCurve3([p1.clone(), mid, p2.clone()], false, 'catmullrom', 0.5);
    }

    // Textbook Orthogonal Manhattan Routing:
    // Drop to breadboard surface (y ~ 0.12), travel along right angles, rise to terminal
    const yFloor = 0.12;
    const corner1 = new THREE.Vector3(p1.x, yFloor, p1.z);
    const corner2 = new THREE.Vector3(p2.x, yFloor, p2.z);

    // Pick orthogonal intermediate elbow
    const elbow =
      Math.abs(p1.x - p2.x) > Math.abs(p1.z - p2.z)
        ? new THREE.Vector3(p2.x, yFloor, p1.z)
        : new THREE.Vector3(p1.x, yFloor, p2.z);

    const pts = [p1.clone(), corner1, elbow, corner2, p2.clone()];
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
  }

  const createWireMesh = (wire: CircuitWireData) => {
    const state = threeRef.current;
    if (!state) return;

    const fromComp = state.components.find(c => c.id === wire.fromCompId);
    const toComp = state.components.find(c => c.id === wire.toCompId);
    if (!fromComp || !toComp) return;

    const p1 = getTerminalWorldPos(fromComp, wire.fromTermId);
    const p2 = getTerminalWorldPos(toComp, wire.toTermId);
    const curve = makeWireCurve(p1, p2, controlsState.wireRouting || 'orthogonal');

    const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.075, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.35,
      roughness: 0.25,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.castShadow = true;
    state.scene.add(tube);

    const arrowGroup = new THREE.Group();
    const arrowConeGeo = new THREE.ConeGeometry(0.14, 0.35, 12);
    const beadGeo = new THREE.SphereGeometry(0.09, 12, 12);

    const arrows: Array<{ mesh: THREE.Mesh; bead: THREE.Mesh; u: number }> = [];
    [0.2, 0.5, 0.8].forEach(u => {
      const cone = new THREE.Mesh(
        arrowConeGeo,
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.75 })
      );
      arrowGroup.add(cone);
      const bead = new THREE.Mesh(
        beadGeo,
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.9 })
      );
      arrowGroup.add(bead);
      arrows.push({ mesh: cone, bead, u });
    });
    state.scene.add(arrowGroup);

    state.wireMeshes.set(wire.id, {
      tube,
      arrowGroup,
      arrows,
      curve,
    });
  };

  const updateSelectionIndicator = () => {
    const state = threeRef.current;
    if (!state) return;

    if (!selectedComponentId) {
      state.selectionIndicator.visible = false;
      return;
    }

    const comp = state.components.find(c => c.id === selectedComponentId);
    if (!comp) {
      state.selectionIndicator.visible = false;
      return;
    }

    state.selectionIndicator.visible = true;
    state.selectionIndicator.position.set(comp.x, 0.05, comp.z);
  };

  const rebuildCircuitScene = () => {
    const state = threeRef.current;
    if (!state) return;

    state.componentMeshes.forEach(grp => state.scene.remove(grp));
    state.componentMeshes.clear();
    state.meterScreens.clear();

    state.wireMeshes.forEach(w => {
      state.scene.remove(w.tube);
      state.scene.remove(w.arrowGroup);
      w.tube.geometry.dispose();
    });
    state.wireMeshes.clear();

    state.components.forEach(c => {
      const grp = buildComponentMesh(c);
      state.scene.add(grp);
      state.componentMeshes.set(c.id, grp);
    });

    state.wires.forEach(w => {
      createWireMesh(w);
    });

    updateSelectionIndicator();
  };

  const loadPresetCircuit = (preset: string) => {
    const state = threeRef.current;
    if (!state) return;
    const data = getPresetCircuitData(preset);
    state.components = [...data.components];
    state.wires = [...data.wires];
    rebuildCircuitScene();
    onSelectComponent(null);
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18);

    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 18, 22);

    const frustumSize = 32;
    const orthoCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    orthoCamera.position.set(0, 40, 0);
    orthoCamera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 6;
    controls.maxDistance = 75;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(14, 26, 14);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.4);
    fillLight.position.set(-14, 18, -14);
    scene.add(fillLight);

    // Lab Tabletop with textbook coordinate grid
    const tableGroup = new THREE.Group();
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95, metalness: 0.05 })
    );
    tableTop.position.y = -0.4;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2 });
    const points: THREE.Vector3[] = [];
    for (let x = -15; x <= 15; x += 1.5) {
      points.push(new THREE.Vector3(x, 0.01, -10));
      points.push(new THREE.Vector3(x, 0.01, 10));
    }
    for (let z = -10; z <= 10; z += 1.5) {
      points.push(new THREE.Vector3(-15, 0.01, z));
      points.push(new THREE.Vector3(15, 0.01, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    tableGroup.add(new THREE.LineSegments(geom, lineMat));
    scene.add(tableGroup);

    // Selection Indicator Box
    const selectionIndicator = new THREE.Group();
    const selRing = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.55, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    selRing.rotation.x = -Math.PI / 2;
    selRing.position.y = 0.02;
    selectionIndicator.add(selRing);
    selectionIndicator.visible = false;
    scene.add(selectionIndicator);

    // Snap Terminal Highlight Ring (for wiring tool)
    const terminalHighlightRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 24),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    terminalHighlightRing.rotation.x = -Math.PI / 2;
    terminalHighlightRing.position.y = 0.35;
    terminalHighlightRing.visible = false;
    scene.add(terminalHighlightRing);

    threeRef.current = {
      scene,
      camera,
      orthoCamera,
      renderer,
      controls,
      components: [],
      componentMeshes: new Map(),
      meterScreens: new Map(),
      wires: [],
      wireMeshes: new Map(),
      selectionIndicator,
      terminalHighlightRing,
      wireStartTerminal: null,
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
      tablePlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      isDragging: false,
      dragOffset: new THREE.Vector3(),
      draggedCompId: null,
    };

    // Load initial Parallel Preset
    const initialData = getPresetCircuitData('parallel');
    threeRef.current.components = [...initialData.components];
    threeRef.current.wires = [...initialData.wires];
    rebuildCircuitScene();

    const handleResize = () => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const asp = w / h;

      camera.aspect = asp;
      camera.updateProjectionMatrix();

      orthoCamera.left = (-frustumSize * asp) / 2;
      orthoCamera.right = (frustumSize * asp) / 2;
      orthoCamera.top = frustumSize / 2;
      orthoCamera.bottom = -frustumSize / 2;
      orthoCamera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render & Physics Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = threeRef.current;
      if (!state) return;

      state.controls.update();

      // Solve MNA Circuit System
      const mnaResult = solveCircuitMNA(state.components, state.wires, dt);

      // Update component visuals based on MNA results
      state.components.forEach(c => {
        const grp = state.componentMeshes.get(c.id);
        if (!grp) return;

        if (c.type === 'bulb') {
          const power = c.power || 0;
          const glow = Math.min(power / 8.0, 2.0);
          const filament = grp.getObjectByName('filament') as THREE.Mesh;
          const corona = grp.getObjectByName('corona') as THREE.Mesh;
          const pLight = grp.getObjectByName('pointLight') as THREE.PointLight;

          if (filament) {
            (filament.material as THREE.MeshStandardMaterial).emissiveIntensity = glow * 2.8;
          }
          if (corona) {
            (corona.material as THREE.MeshBasicMaterial).opacity = Math.min(glow * 0.45, 0.5);
          }
          if (pLight) {
            pLight.intensity = glow * 2.5;
          }
        } else if (c.type === 'switch') {
          const blade = grp.getObjectByName('blade') as THREE.Group;
          if (blade) {
            // FIX: Opens UPWARDS (+Y direction) into the air above the breadboard plane!
            const targetAngle = c.closed ? 0 : Math.PI / 4.2;
            blade.rotation.z = THREE.MathUtils.lerp(blade.rotation.z, targetAngle, 0.25);
          }
        } else if (c.type === 'voltmeter' || c.type === 'ammeter') {
          // Dynamic LCD display text update on meter body
          const screenData = state.meterScreens.get(c.id);
          if (screenData) {
            const isVolt = c.type === 'voltmeter';
            const val = c.measuredValue ?? 0;
            const ctx = screenData.ctx;
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, 256, 128);

            ctx.fillStyle = isVolt ? '#10b981' : '#38bdf8';
            ctx.font = 'bold 22px "JetBrains Mono", monospace';
            ctx.fillText(isVolt ? 'DIGITAL VOLTMETER' : 'DIGITAL AMMETER', 16, 32);

            ctx.font = 'bold 44px "JetBrains Mono", monospace';
            const unit = isVolt ? 'V' : 'A';
            const displayStr = `${val >= 0 ? '+' : ''}${val.toFixed(2)} ${unit}`;
            ctx.fillText(displayStr, 16, 92);
            screenData.texture.needsUpdate = true;
          }
        }
      });

      // Update Carrier Drift Arrows along wires
      const isConventional = controlsState.flowConvention === 'conventional';
      const colorHex = isConventional ? 0xf59e0b : 0x38bdf8;
      const emissiveHex = isConventional ? 0xd97706 : 0x0284c7;
      const baseSpeed = mnaResult.totalSupplyCurrent * 0.4 * controlsState.driftSpeed;

      state.wireMeshes.forEach((wData, wireId) => {
        const wire = state.wires.find(w => w.id === wireId);
        wData.arrowGroup.visible = controlsState.showArrows;
        if (!wData.arrowGroup.visible || !wire) return;

        let dir = wire.current >= 0 ? 1 : -1;
        if (!isConventional) dir = -dir;

        const hasCurrent = Math.abs(wire.current) > 0.001;

        wData.arrows.forEach(arr => {
          if (hasCurrent) {
            arr.u = (arr.u + dir * baseSpeed * dt + 1.0) % 1.0;
          }
          const pt = wData.curve.getPointAt(arr.u);
          const tangent = wData.curve.getTangentAt(arr.u).normalize();
          if (dir < 0) tangent.negate();

          arr.mesh.position.copy(pt);
          (arr.mesh.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
          (arr.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(emissiveHex);
          (arr.mesh.material as THREE.MeshStandardMaterial).opacity = hasCurrent ? 1.0 : 0.25;

          const upAxis = new THREE.Vector3(0, 1, 0);
          arr.mesh.quaternion.setFromUnitVectors(upAxis, tangent);

          if (arr.bead) {
            arr.bead.position.copy(pt);
            (arr.bead.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
          }
        });
      });

      // Sample Oscilloscope data
      if (onOscilloscopeSample) {
        const sampleVolt = state.components.find(c => c.type === 'battery')?.value ?? 9.0;
        onOscilloscopeSample(sampleVolt, mnaResult.totalSupplyCurrent);
      }

      // Rotate selection indicator
      if (state.selectionIndicator.visible) {
        state.selectionIndicator.children[0].rotation.z += 0.015;
      }

      const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
      renderer.render(state.scene, activeCamera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Camera switch on viewMode change
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    if (controlsState.viewMode === 'top') {
      state.orthoCamera.position.set(0, 42, 0);
      state.orthoCamera.lookAt(0, 0, 0);
      state.controls.object = state.orthoCamera;
      state.controls.enableRotate = false;
    } else {
      state.controls.object = state.camera;
      state.controls.enableRotate = true;
    }
    state.controls.update();
  }, [controlsState.viewMode]);

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
    state.raycaster.setFromCamera(state.mouse, activeCamera);

    const hitPt = new THREE.Vector3();
    const hitTable = state.raycaster.ray.intersectPlane(state.tablePlane, hitPt);

    // 1. Wire Cutter Tool
    if (controlsState.activeTool === 'cut') {
      const wireTubes: THREE.Object3D[] = [];
      state.wireMeshes.forEach(wm => wireTubes.push(wm.tube));

      const hits = state.raycaster.intersectObjects(wireTubes);
      if (hits.length > 0) {
        for (const [wId, wm] of state.wireMeshes.entries()) {
          if (wm.tube === hits[0].object) {
            state.scene.remove(wm.tube);
            state.scene.remove(wm.arrowGroup);
            wm.tube.geometry.dispose();
            state.wireMeshes.delete(wId);
            state.wires = state.wires.filter(w => w.id !== wId);
            break;
          }
        }
      }
      return;
    }

    // 2. Wire Tool
    if (controlsState.activeTool === 'wire') {
      let clickedTerm: { compId: string; termId: string } | null = null;
      for (const [cId, grp] of state.componentMeshes.entries()) {
        const hits = state.raycaster.intersectObjects(grp.children, true);
        if (hits.length > 0) {
          let hitObj: THREE.Object3D | null = hits[0].object;
          while (hitObj && hitObj.parent && hitObj.parent !== grp) {
            if (hitObj.name) {
              clickedTerm = { compId: cId, termId: hitObj.name };
              break;
            }
            hitObj = hitObj.parent;
          }
          if (clickedTerm) break;
        }
      }

      if (clickedTerm) {
        if (!state.wireStartTerminal) {
          state.wireStartTerminal = clickedTerm;
          state.terminalHighlightRing.visible = true;
          const fromC = state.components.find(c => c.id === clickedTerm!.compId);
          if (fromC) {
            const p = getTerminalWorldPos(fromC, clickedTerm.termId);
            state.terminalHighlightRing.position.set(p.x, 0.35, p.z);
          }
        } else {
          if (
            state.wireStartTerminal.compId !== clickedTerm.compId ||
            state.wireStartTerminal.termId !== clickedTerm.termId
          ) {
            const newWire: CircuitWireData = {
              id: `wire_${wireCounter++}`,
              fromCompId: state.wireStartTerminal.compId,
              fromTermId: state.wireStartTerminal.termId,
              toCompId: clickedTerm.compId,
              toTermId: clickedTerm.termId,
              current: 0,
              routingStyle: controlsState.wireRouting || 'orthogonal',
            };
            state.wires.push(newWire);
            createWireMesh(newWire);
          }
          state.wireStartTerminal = null;
          state.terminalHighlightRing.visible = false;
        }
        return;
      }
    }

    // 3. Switch Click Toggle
    const switches = state.components.filter(c => c.type === 'switch');
    for (const sw of switches) {
      const grp = state.componentMeshes.get(sw.id);
      if (grp) {
        const blade = grp.getObjectByName('blade');
        if (blade) {
          const hits = state.raycaster.intersectObjects(blade.children, true);
          if (hits.length > 0) {
            sw.closed = !sw.closed;
            onSelectComponent(sw);
            return;
          }
        }
      }
    }

    // 4. Component Drag & Select
    const allMeshes: THREE.Object3D[] = [];
    state.componentMeshes.forEach(grp => allMeshes.push(...grp.children));

    const hits = state.raycaster.intersectObjects(allMeshes, true);
    if (hits.length > 0) {
      let rootGrp: THREE.Object3D | null = hits[0].object;
      while (rootGrp && rootGrp.parent && rootGrp.parent !== state.scene) {
        rootGrp = rootGrp.parent;
      }

      for (const [id, grp] of state.componentMeshes.entries()) {
        if (grp === rootGrp) {
          const found = state.components.find(c => c.id === id);
          if (found) {
            state.controls.enabled = false;
            state.isDragging = true;
            state.draggedCompId = id;
            if (hitTable) {
              state.dragOffset.set(found.x - hitPt.x, 0, found.z - hitPt.z);
            }
            onSelectComponent(found);
            updateSelectionIndicator();
          }
          break;
        }
      }
    } else {
      onSelectComponent(null);
      updateSelectionIndicator();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = threeRef.current;
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = controlsState.viewMode === '3d' ? state.camera : state.orthoCamera;
    state.raycaster.setFromCamera(state.mouse, activeCamera);

    const hitPt = new THREE.Vector3();
    const hitTable = state.raycaster.ray.intersectPlane(state.tablePlane, hitPt);

    // Terminal hover highlight in wire mode
    if (controlsState.activeTool === 'wire' && !state.wireStartTerminal) {
      let hoveredTerm: { compId: string; termId: string } | null = null;
      for (const [cId, grp] of state.componentMeshes.entries()) {
        const hits = state.raycaster.intersectObjects(grp.children, true);
        if (hits.length > 0) {
          let hitObj: THREE.Object3D | null = hits[0].object;
          while (hitObj && hitObj.parent && hitObj.parent !== grp) {
            if (hitObj.name) {
              hoveredTerm = { compId: cId, termId: hitObj.name };
              break;
            }
            hitObj = hitObj.parent;
          }
          if (hoveredTerm) break;
        }
      }

      if (hoveredTerm) {
        const c = state.components.find(comp => comp.id === hoveredTerm!.compId);
        if (c) {
          const p = getTerminalWorldPos(c, hoveredTerm.termId);
          state.terminalHighlightRing.visible = true;
          state.terminalHighlightRing.position.set(p.x, 0.35, p.z);
        }
      } else {
        state.terminalHighlightRing.visible = false;
      }
    }

    if (state.isDragging && state.draggedCompId && hitTable) {
      const comp = state.components.find(c => c.id === state.draggedCompId);
      if (comp && !comp.pinned) {
        comp.x = Math.max(-14, Math.min(14, hitPt.x + state.dragOffset.x));
        comp.z = Math.max(-9, Math.min(9, hitPt.z + state.dragOffset.z));

        const grp = state.componentMeshes.get(comp.id);
        if (grp) grp.position.set(comp.x, 0, comp.z);

        state.wires.forEach(w => {
          if (w.fromCompId === comp.id || w.toCompId === comp.id) {
            const wData = state.wireMeshes.get(w.id);
            const fromC = state.components.find(c => c.id === w.fromCompId);
            const toC = state.components.find(c => c.id === w.toCompId);
            if (wData && fromC && toC) {
              const p1 = getTerminalWorldPos(fromC, w.fromTermId);
              const p2 = getTerminalWorldPos(toC, w.toTermId);
              wData.curve = makeWireCurve(p1, p2, controlsState.wireRouting || 'orthogonal');
              wData.tube.geometry.dispose();
              wData.tube.geometry = new THREE.TubeGeometry(wData.curve, 48, 0.075, 10, false);
            }
          }
        });

        updateSelectionIndicator();
      }
    }
  };

  const handlePointerUp = () => {
    const state = threeRef.current;
    if (!state) return;

    // Optional snapping to breadboard grid on release for neat textbook alignment
    if (state.isDragging && state.draggedCompId) {
      const comp = state.components.find(c => c.id === state.draggedCompId);
      if (comp && !comp.pinned) {
        comp.x = Math.round(comp.x / 1.5) * 1.5;
        comp.z = Math.round(comp.z / 1.5) * 1.5;
        const grp = state.componentMeshes.get(comp.id);
        if (grp) grp.position.set(comp.x, 0, comp.z);

        state.wires.forEach(w => {
          if (w.fromCompId === comp.id || w.toCompId === comp.id) {
            const wData = state.wireMeshes.get(w.id);
            const fromC = state.components.find(c => c.id === w.fromCompId);
            const toC = state.components.find(c => c.id === w.toCompId);
            if (wData && fromC && toC) {
              const p1 = getTerminalWorldPos(fromC, w.fromTermId);
              const p2 = getTerminalWorldPos(toC, w.toTermId);
              wData.curve = makeWireCurve(p1, p2, controlsState.wireRouting || 'orthogonal');
              wData.tube.geometry.dispose();
              wData.tube.geometry = new THREE.TubeGeometry(wData.curve, 48, 0.075, 10, false);
            }
          }
        });
        updateSelectionIndicator();
      }
    }

    state.controls.enabled = true;
    state.isDragging = false;
    state.draggedCompId = null;
  };

  // Expose methods to parent window
  useEffect(() => {
    (window as any).__circuitWorkbench = {
      loadPreset: loadPresetCircuit,
      addComponent: (type: ComponentType) => {
        const state = threeRef.current;
        if (!state) return;

        let val = 10;
        if (type === 'battery') val = 9.0;
        if (type === 'bulb') val = 12.0;
        if (type === 'capacitor') val = 470;
        if (type === 'inductor') val = 15;
        if (type === 'voltmeter') val = 1e7;
        if (type === 'ammeter') val = 0.001;

        const count = state.components.length;
        const newComp: CircuitComponentData = {
          id: `${type}_${compCounter++}`,
          type,
          x: ((count % 5) - 2) * 3.0,
          z: (Math.floor(count / 5) - 1) * 3.0,
          rotationY: 0,
          value: val,
          closed: true,
        };

        state.components.push(newComp);
        rebuildCircuitScene();
        onSelectComponent(newComp);
      },
      updateSelectedComponent: (updated: CircuitComponentData) => {
        const state = threeRef.current;
        if (!state) return;
        const idx = state.components.findIndex(c => c.id === updated.id);
        if (idx !== -1) {
          state.components[idx] = { ...updated };
          rebuildCircuitScene();
        }
      },
      rotateSelectedComponent: (id: string) => {
        const state = threeRef.current;
        if (!state) return;
        const comp = state.components.find(c => c.id === id);
        if (comp) {
          comp.rotationY = (comp.rotationY + Math.PI / 2) % (Math.PI * 2);
          const grp = state.componentMeshes.get(comp.id);
          if (grp) grp.rotation.y = comp.rotationY;

          state.wires.forEach(w => {
            if (w.fromCompId === comp.id || w.toCompId === comp.id) {
              const wData = state.wireMeshes.get(w.id);
              const fromC = state.components.find(c => c.id === w.fromCompId);
              const toC = state.components.find(c => c.id === w.toCompId);
              if (wData && fromC && toC) {
                const p1 = getTerminalWorldPos(fromC, w.fromTermId);
                const p2 = getTerminalWorldPos(toC, w.toTermId);
                wData.curve = makeWireCurve(p1, p2, controlsState.wireRouting || 'orthogonal');
                wData.tube.geometry.dispose();
                wData.tube.geometry = new THREE.TubeGeometry(wData.curve, 48, 0.075, 10, false);
              }
            }
          });
          onSelectComponent({ ...comp });
        }
      },
      deleteSelectedComponent: (id: string) => {
        const state = threeRef.current;
        if (!state) return;
        state.wires = state.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
        state.components = state.components.filter(c => c.id !== id);
        rebuildCircuitScene();
        onSelectComponent(null);
      },
      clearWires: () => {
        const state = threeRef.current;
        if (!state) return;
        state.wireMeshes.forEach(wm => {
          state.scene.remove(wm.tube);
          state.scene.remove(wm.arrowGroup);
          wm.tube.geometry.dispose();
        });
        state.wireMeshes.clear();
        state.wires = [];
      },
      clearAll: () => {
        const state = threeRef.current;
        if (!state) return;
        state.wires = [];
        state.components = [];
        rebuildCircuitScene();
        onSelectComponent(null);
      },
      alignToGrid: () => {
        const state = threeRef.current;
        if (!state) return;
        state.components.forEach(c => {
          c.x = Math.round(c.x / 1.5) * 1.5;
          c.z = Math.round(c.z / 1.5) * 1.5;
        });
        rebuildCircuitScene();
      },
      getSnapshot: () => {
        const state = threeRef.current;
        return {
          components: state ? state.components.map(c => ({ ...c })) : [],
          wires: state ? state.wires.map(w => ({ ...w })) : [],
          controlsState,
        };
      },
      restoreSnapshot: (circuitData: any, cameraState?: any) => {
        const state = threeRef.current;
        if (!state) return;
        if (circuitData?.components) {
          state.components = circuitData.components.map((c: any) => ({ ...c }));
          state.wires = circuitData.wires ? circuitData.wires.map((w: any) => ({ ...w })) : [];
          rebuildCircuitScene();
        }
        if (cameraState && state.camera) {
          state.camera.position.set(cameraState.x, cameraState.y, cameraState.z);
          state.controls.target.set(cameraState.targetX, cameraState.targetY, cameraState.targetZ);
          state.controls.update();
        }
      },
      getCameraState: () => {
        const state = threeRef.current;
        if (!state) return undefined;
        return {
          x: state.camera.position.x,
          y: state.camera.position.y,
          z: state.camera.position.z,
          targetX: state.controls.target.x,
          targetY: state.controls.target.y,
          targetZ: state.controls.target.z,
        };
      },
    };
  }, [onSelectComponent, controlsState]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`w-full h-full block ${
          controlsState.activeTool === 'cut'
            ? 'cursor-crosshair'
            : controlsState.activeTool === 'wire'
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />
    </div>
  );
};
