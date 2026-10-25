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
  showMeterOverlays?: boolean;
}

export interface CircuitMeterReading {
  id: string;
  type: 'voltmeter' | 'ammeter';
  value: number;
  formatted: string;
  label: string;
}

export interface CircuitWorkbenchTelemetry {
  supplyEmf: number;
  totalCurrent: number;
  activeComponents: number;
  wireCount: number;
  kclMaxResidual: number;
  kvlVerified: boolean;
  probeVoltage?: number;
  meterReadings?: CircuitMeterReading[];
}

interface CircuitWorkbenchProps {
  controlsState: CircuitWorkbenchControls;
  onSelectComponent: (comp: CircuitComponentData | null) => void;
  selectedComponentId: string | null;
  onUpdateTelemetry: (data: CircuitWorkbenchTelemetry) => void;
  onOscilloscopeSample?: (v: number, i: number) => void;
  onToast?: (msg: string) => void;
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

// Get the two active connection terminals for any component type
export function getComponentTerminals(type: ComponentType): [string, string] {
  switch (type) {
    case 'switch':
      return ['hinge', 'contact'];
    case 'ammeter':
      return ['in', 'out'];
    case 'voltmeter':
    case 'battery':
      return ['pos', 'neg'];
    case 'lead_pin':
    case 'ground':
      return ['term', 'term'];
    default:
      return ['term1', 'term2'];
  }
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
  onToast,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef(controlsState);
  useEffect(() => {
    controlsRef.current = controlsState;
  }, [controlsState]);
  const lastTelemetryTimeRef = useRef(0);

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orthoCamera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    components: CircuitComponentData[];
    componentMeshes: Map<string, THREE.Group>;
    meterScreens: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture }>;
    meterBillboards: Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; sprite: THREE.Sprite }>;
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
    snapHighlightIndicator: THREE.Group;
    snapCandidate: { wire: CircuitWireData; point: THREE.Vector3 } | null;
    wireStartTerminal: { compId: string; termId: string } | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    tablePlane: THREE.Plane;
    isDragging: boolean;
    dragOffset: THREE.Vector3;
    draggedCompId: string | null;
  } | null>(null);

  // Digital Meter Casing LCD Texture (High resolution 512x256)
  const createMeterTexture = (type: 'voltmeter' | 'ammeter') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = type === 'voltmeter' ? '#10b981' : '#38bdf8';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.fillText(type === 'voltmeter' ? 'DIGITAL VOLTMETER' : 'DIGITAL AMMETER', 24, 60);
    ctx.font = 'bold 80px "JetBrains Mono", monospace';
    ctx.fillText('0.00 ' + (type === 'voltmeter' ? 'V' : 'A'), 24, 180);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { canvas, ctx, texture };
  };

  // High-Clarity Camera-Facing Billboard Sprite for Meters
  // Eliminates all angle glitching, z-fighting, and perspective distortion
  const createMeterBillboard = (type: 'voltmeter' | 'ammeter', compId: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;

    renderMeterBillboardCanvas(ctx, type, compId, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.name = 'meterBillboardSprite';
    sprite.scale.set(3.2, 1.25, 1.0);
    sprite.position.set(0, 2.35, 0); // floats stably above instrument
    sprite.renderOrder = 999;
    return { canvas, ctx, texture, sprite };
  };

  const renderMeterBillboardCanvas = (
    ctx: CanvasRenderingContext2D,
    type: 'voltmeter' | 'ammeter',
    id: string,
    val: number
  ) => {
    ctx.clearRect(0, 0, 512, 200);

    const isVolt = type === 'voltmeter';
    const mainColor = isVolt ? '#10b981' : '#38bdf8';
    const borderColor = isVolt ? 'rgba(16, 185, 129, 0.85)' : 'rgba(56, 189, 248, 0.85)';
    const glowColor = isVolt ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.25)';

    // Rounded Glassmorphic Card Background
    ctx.fillStyle = 'rgba(6, 10, 24, 0.95)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 184, 20);
    ctx.fill();

    // Outer Glow Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Header Badge Pill
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.roundRect(24, 20, 290, 36, 10);
    ctx.fill();

    ctx.fillStyle = mainColor;
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(isVolt ? `DIGITAL VOLTMETER · ${id}` : `DIGITAL AMMETER · ${id}`, 36, 45);

    // Indicator Dot
    ctx.beginPath();
    ctx.arc(460, 38, 8, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // Huge Crisp Digital 7-Segment/Monospace Readout
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    const unit = isVolt ? 'V' : 'A';
    const numDigits = isVolt ? 2 : 3;
    const sign = val >= 0 ? '+' : '';
    const valStr = `${sign}${val.toFixed(numDigits)} ${unit}`;
    ctx.fillText(valStr, 32, 125);

    // Subtitle label
    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(isVolt ? 'Potential Difference (V+ - V-)' : 'Branch DC Loop Current', 36, 165);
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
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.25, roughness: 0.28 })
      );
      socket.position.y = 0.25;
      group.add(socket);

      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0xfffbeb,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.52,
          roughness: 0.1,
        })
      );
      glass.name = 'bulbGlass';
      glass.position.set(0, 1.35, 0);
      group.add(glass);

      const filament = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
      );
      filament.name = 'filament';
      filament.rotation.z = Math.PI / 2;
      filament.position.set(0, 1.25, 0);
      group.add(filament);

      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.0, side: THREE.BackSide })
      );
      corona.name = 'corona';
      corona.position.set(0, 1.35, 0);
      group.add(corona);

      const outerHalo = new THREE.Mesh(
        new THREE.SphereGeometry(1.18, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.0, side: THREE.BackSide })
      );
      outerHalo.name = 'outerHalo';
      outerHalo.position.set(0, 1.35, 0);
      group.add(outerHalo);

      const pLight = new THREE.PointLight(0xfde047, 0, 18, 1.0);
      pLight.name = 'pointLight';
      pLight.position.set(0, 1.45, 0);
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

      // Bezel ring - raised and crisp
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(1.86, 0.96, 0.12),
        new THREE.MeshStandardMaterial({ color: isVolt ? 0x059669 : 0x0284c7, metalness: 0.85, roughness: 0.2 })
      );
      bezel.rotation.x = -Math.PI / 3.6;
      bezel.position.set(0, 1.05, 0.08);
      group.add(bezel);

      // Physical LCD screen on casing with anti-z-fighting offset
      const meterTex = createMeterTexture(comp.type);
      if (threeRef.current) {
        threeRef.current.meterScreens.set(comp.id, meterTex);
      }

      const screenMat = new THREE.MeshBasicMaterial({
        map: meterTex.texture,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.82), screenMat);
      screen.name = 'meterScreen';
      screen.rotation.x = -Math.PI / 3.6;
      screen.position.set(0, 1.07, 0.16); // physically elevated in front of bezel to prevent flickering
      group.add(screen);

      // Camera-Facing 3D Floating Billboard Sprite
      // ALWAYS faces the camera directly at ANY angle (360° rotation and top-down views)
      const billboard = createMeterBillboard(comp.type, comp.id);
      billboard.sprite.visible = controlsRef.current.showMeterOverlays !== false;
      if (threeRef.current) {
        threeRef.current.meterBillboards.set(comp.id, billboard);
      }
      group.add(billboard.sprite);

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

  // Automatically sort out optimal terminals when user selects two elements to connect
  function resolveAutoTerminals(
    fromComp: CircuitComponentData,
    toComp: CircuitComponentData,
    existingWires: CircuitWireData[]
  ): { fromTermId: string; toTermId: string } {
    const [f1, f2] = getComponentTerminals(fromComp.type);
    const [t1, t2] = getComponentTerminals(toComp.type);
    const fromTerms = f1 === f2 ? [f1] : [f1, f2];
    const toTerms = t1 === t2 ? [t1] : [t1, t2];

    const getDegree = (compId: string, termId: string) =>
      existingWires.filter(
        w =>
          (w.fromCompId === compId && w.fromTermId === termId) ||
          (w.toCompId === compId && w.toTermId === termId)
      ).length;

    const directWires = existingWires.filter(
      w =>
        (w.fromCompId === fromComp.id && w.toCompId === toComp.id) ||
        (w.fromCompId === toComp.id && w.toCompId === fromComp.id)
    );

    let bestFrom = fromTerms[0];
    let bestTo = toTerms[0];
    let bestScore = Infinity;

    for (const ft of fromTerms) {
      for (const tt of toTerms) {
        const degF = getDegree(fromComp.id, ft);
        const degT = getDegree(toComp.id, tt);
        const pF = getTerminalWorldPos(fromComp, ft);
        const pT = getTerminalWorldPos(toComp, tt);
        const dist = pF.distanceTo(pT);

        const exactPairExists = directWires.some(
          w =>
            (w.fromCompId === fromComp.id &&
              w.fromTermId === ft &&
              w.toCompId === toComp.id &&
              w.toTermId === tt) ||
            (w.fromCompId === toComp.id &&
              w.fromTermId === tt &&
              w.toCompId === fromComp.id &&
              w.toTermId === ft)
        );

        const ftUsedBetweenPair = directWires.some(
          w =>
            (w.fromCompId === fromComp.id && w.fromTermId === ft) ||
            (w.toCompId === fromComp.id && w.toTermId === ft)
        );
        const ttUsedBetweenPair = directWires.some(
          w =>
            (w.fromCompId === toComp.id && w.fromTermId === tt) ||
            (w.toCompId === toComp.id && w.toTermId === tt)
        );

        let score = dist + degF * 60 + degT * 60;
        if (ftUsedBetweenPair) score += 600;
        if (ttUsedBetweenPair) score += 600;
        if (exactPairExists) score += 10000;

        if (score < bestScore) {
          bestScore = score;
          bestFrom = ft;
          bestTo = tt;
        }
      }
    }

    return { fromTermId: bestFrom, toTermId: bestTo };
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
    const yFloor = 0.12;
    const corner1 = new THREE.Vector3(p1.x, yFloor, p1.z);
    const corner2 = new THREE.Vector3(p2.x, yFloor, p2.z);

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
    state.meterBillboards.clear();

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

  // Helper to auto-connect any component to the nearest wire in the circuit
  const autoConnectComponentToCircuit = (compId: string): boolean => {
    const state = threeRef.current;
    if (!state) return false;

    const comp = state.components.find(c => c.id === compId);
    if (!comp) return false;

    // Find nearest wire that isn't connected to this component
    let bestWire: CircuitWireData | null = null;
    let minDistance = 999;
    let bestSnapPoint = new THREE.Vector3(comp.x, 0.15, comp.z);

    state.wires.forEach(w => {
      if (w.fromCompId === comp.id || w.toCompId === comp.id) return;
      const fromC = state.components.find(c => c.id === w.fromCompId);
      const toC = state.components.find(c => c.id === w.toCompId);
      if (!fromC || !toC) return;

      const p1 = getTerminalWorldPos(fromC, w.fromTermId);
      const p2 = getTerminalWorldPos(toC, w.toTermId);
      const vx = p2.x - p1.x;
      const vz = p2.z - p1.z;
      const lenSq = vx * vx + vz * vz;
      if (lenSq < 0.1) return;

      let t = ((comp.x - p1.x) * vx + (comp.z - p1.z) * vz) / lenSq;
      t = Math.max(0.1, Math.min(0.9, t));
      const projX = p1.x + t * vx;
      const projZ = p1.z + t * vz;
      const dist = Math.hypot(comp.x - projX, comp.z - projZ);

      if (dist < minDistance) {
        minDistance = dist;
        bestWire = w;
        bestSnapPoint.set(projX, 0.15, projZ);
      }
    });

    if (bestWire) {
      const snapWire = bestWire as CircuitWireData;
      const [t1, t2] = getComponentTerminals(comp.type);

      // Remove old wire
      const oldWData = state.wireMeshes.get(snapWire.id);
      if (oldWData) {
        state.scene.remove(oldWData.tube);
        state.scene.remove(oldWData.arrowGroup);
        oldWData.tube.geometry.dispose();
        state.wireMeshes.delete(snapWire.id);
      }
      state.wires = state.wires.filter(w => w.id !== snapWire.id);

      // Connect two new wires
      const newW1: CircuitWireData = {
        id: `wire_${wireCounter++}`,
        fromCompId: snapWire.fromCompId,
        fromTermId: snapWire.fromTermId,
        toCompId: comp.id,
        toTermId: t1,
        current: 0,
        routingStyle: controlsState.wireRouting || 'orthogonal',
      };

      const newW2: CircuitWireData = {
        id: `wire_${wireCounter++}`,
        fromCompId: comp.id,
        fromTermId: t2,
        toCompId: snapWire.toCompId,
        toTermId: snapWire.toTermId,
        current: 0,
        routingStyle: controlsState.wireRouting || 'orthogonal',
      };

      state.wires.push(newW1, newW2);
      createWireMesh(newW1);
      createWireMesh(newW2);

      if (onToast) {
        onToast(`Auto-connected ${comp.type.toUpperCase()} into branch and rerouted wires!`);
      }
      return true;
    }
    return false;
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 22);

    const frustumSize = 24;
    const aspect = width / height;
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 6;
    controls.maxDistance = 75;

    // Bright Multi-Source Laboratory Workbench Illumination
    const ambient = new THREE.AmbientLight(0xffffff, 1.75);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 1.35);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(14, 28, 14);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.45);
    fillLight.position.set(-14, 22, -12);
    scene.add(fillLight);

    const overheadBenchLight = new THREE.PointLight(0xf8fafc, 2.0, 65, 0.7);
    overheadBenchLight.position.set(0, 16, 2);
    scene.add(overheadBenchLight);

    // Well-lit Lab Tabletop with crisp coordinate grid
    const tableGroup = new THREE.Group();
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.8, 22),
      new THREE.MeshStandardMaterial({ color: 0x293b56, roughness: 0.65, metalness: 0.08 })
    );
    tableTop.position.y = -0.4;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const lineMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.32 });
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

    // Auto-Connect Snap Highlight Indicator Group
    const snapHighlightIndicator = new THREE.Group();
    const snapRingInner = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.6, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    snapRingInner.rotation.x = -Math.PI / 2;
    snapHighlightIndicator.add(snapRingInner);

    const snapRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    snapRingOuter.rotation.x = -Math.PI / 2;
    snapHighlightIndicator.add(snapRingOuter);

    snapHighlightIndicator.position.y = 0.2;
    snapHighlightIndicator.visible = false;
    scene.add(snapHighlightIndicator);

    threeRef.current = {
      scene,
      camera,
      orthoCamera,
      renderer,
      controls,
      components: [],
      componentMeshes: new Map(),
      meterScreens: new Map(),
      meterBillboards: new Map(),
      wires: [],
      wireMeshes: new Map(),
      selectionIndicator,
      terminalHighlightRing,
      snapHighlightIndicator,
      snapCandidate: null,
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

      // Pulse the snap indicator if active
      if (state.snapHighlightIndicator.visible) {
        const pulse = 1.0 + 0.15 * Math.sin(now * 0.008);
        state.snapHighlightIndicator.scale.set(pulse, 1.0, pulse);
      }

      // Collect live meter readings for UI telemetry
      const currentMeterReadings: CircuitMeterReading[] = [];

      // Update component visuals based on MNA results
      state.components.forEach(c => {
        const grp = state.componentMeshes.get(c.id);
        if (!grp) return;

        if (c.type === 'bulb') {
          const power = c.power || 0;
          const glow = power > 0.005 ? Math.min(Math.pow(power / 4.2, 0.62) * 1.6, 3.2) : 0;
          const bulbGlass = grp.getObjectByName('bulbGlass') as THREE.Mesh;
          const filament = grp.getObjectByName('filament') as THREE.Mesh;
          const corona = grp.getObjectByName('corona') as THREE.Mesh;
          const outerHalo = grp.getObjectByName('outerHalo') as THREE.Mesh;
          const pLight = grp.getObjectByName('pointLight') as THREE.PointLight;

          if (bulbGlass) {
            const gMat = bulbGlass.material as THREE.MeshStandardMaterial;
            gMat.emissiveIntensity = glow > 0 ? 0.35 + glow * 1.45 : 0.08;
            gMat.opacity = glow > 0 ? Math.min(0.55 + glow * 0.22, 0.92) : 0.48;
          }
          if (filament) {
            (filament.material as THREE.MeshStandardMaterial).emissiveIntensity = glow > 0 ? 1.2 + glow * 4.5 : 0.15;
          }
          if (corona) {
            (corona.material as THREE.MeshBasicMaterial).opacity = Math.min(glow * 0.68, 0.85);
            const s = 1.0 + Math.min(glow * 0.16, 0.35);
            corona.scale.set(s, s, s);
          }
          if (outerHalo) {
            (outerHalo.material as THREE.MeshBasicMaterial).opacity = Math.min(glow * 0.32, 0.48);
            const hs = 1.0 + Math.min(glow * 0.2, 0.45);
            outerHalo.scale.set(hs, hs, hs);
          }
          if (pLight) {
            pLight.intensity = glow * 4.8;
          }
        } else if (c.type === 'switch') {
          const blade = grp.getObjectByName('blade') as THREE.Group;
          if (blade) {
            const targetAngle = c.closed ? 0 : Math.PI / 4.2;
            blade.rotation.z = THREE.MathUtils.lerp(blade.rotation.z, targetAngle, 0.25);
          }
        } else if (c.type === 'voltmeter' || c.type === 'ammeter') {
          const isVolt = c.type === 'voltmeter';
          const val = c.measuredValue ?? 0;
          const unit = isVolt ? 'V' : 'A';
          const digits = isVolt ? 2 : 3;
          const formatted = `${val >= 0 ? '+' : ''}${val.toFixed(digits)} ${unit}`;

          currentMeterReadings.push({
            id: c.id,
            type: c.type,
            value: val,
            formatted,
            label: isVolt ? `Voltmeter (${c.id})` : `Ammeter (${c.id})`,
          });

          // 1. Dynamic LCD display update on physical meter casing
          const screenData = state.meterScreens.get(c.id);
          if (screenData) {
            const ctx = screenData.ctx;
            ctx.fillStyle = '#060a14';
            ctx.fillRect(0, 0, 512, 256);

            ctx.fillStyle = isVolt ? '#10b981' : '#38bdf8';
            ctx.font = 'bold 36px "JetBrains Mono", monospace';
            ctx.fillText(isVolt ? `DIGITAL VOLTMETER · ${c.id}` : `DIGITAL AMMETER · ${c.id}`, 24, 60);

            ctx.font = 'bold 80px "JetBrains Mono", monospace';
            ctx.fillText(formatted, 24, 180);
            screenData.texture.needsUpdate = true;
          }

          // 2. Camera-Facing Floating Billboard Sprite update
          // Crystal-clear at ANY angle, can be toggled on/off in workbench controls
          const billboardData = state.meterBillboards.get(c.id);
          if (billboardData) {
            const isVisible = liveControls.showMeterOverlays !== false;
            billboardData.sprite.visible = isVisible;
            if (isVisible) {
              renderMeterBillboardCanvas(billboardData.ctx, c.type, c.id, val);
              billboardData.texture.needsUpdate = true;
            }
          }
        }
      });

      // Emit Live Telemetry to parent application every ~120ms
      if (onUpdateTelemetry && now - lastTelemetryTimeRef.current > 120) {
        lastTelemetryTimeRef.current = now;
        const batt = state.components.find(c => c.type === 'battery');
        onUpdateTelemetry({
          supplyEmf: batt?.value ?? 0,
          totalCurrent: mnaResult.totalSupplyCurrent,
          activeComponents: state.components.length,
          wireCount: state.wires.length,
          kclMaxResidual: mnaResult.kclMaxResidual,
          kvlVerified: mnaResult.kvlVerified,
          meterReadings: currentMeterReadings,
        });
      }

      // Update Carrier Drift Arrows along wires
      const liveControls = controlsRef.current;
      const isConventional = liveControls.flowConvention === 'conventional';
      const colorHex = isConventional ? 0xf59e0b : 0x38bdf8;
      const emissiveHex = isConventional ? 0xd97706 : 0x0284c7;
      const baseSpeed = mnaResult.totalSupplyCurrent * 0.4 * liveControls.driftSpeed;

      state.wireMeshes.forEach((wData, wireId) => {
        const wire = state.wires.find(w => w.id === wireId);
        wData.arrowGroup.visible = liveControls.showArrows;
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

      const activeCamera = liveControls.viewMode === '3d' ? state.camera : state.orthoCamera;
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

    // 2. Wire Tool — Select any two circuit elements to automatically connect their terminals
    if (controlsState.activeTool === 'wire') {
      let clickedCompId: string | null = null;
      const allCompMeshes: THREE.Object3D[] = [];
      state.componentMeshes.forEach(grp => {
        grp.children.forEach(child => {
          if (child.name !== 'meterBillboardSprite') {
            allCompMeshes.push(child);
          }
        });
      });

      const wireHits = state.raycaster.intersectObjects(allCompMeshes, true);
      if (wireHits.length > 0) {
        let rootGrp: THREE.Object3D | null = wireHits[0].object;
        while (rootGrp && rootGrp.parent && rootGrp.parent !== state.scene) {
          rootGrp = rootGrp.parent;
        }
        for (const [cId, grp] of state.componentMeshes.entries()) {
          if (grp === rootGrp) {
            clickedCompId = cId;
            break;
          }
        }
      }

      if (clickedCompId) {
        const clickedComp = state.components.find(c => c.id === clickedCompId);
        if (!state.wireStartTerminal) {
          state.wireStartTerminal = { compId: clickedCompId, termId: 'auto' };
          state.terminalHighlightRing.visible = true;
          state.terminalHighlightRing.scale.set(2.2, 2.2, 2.2);
          if (clickedComp) {
            state.terminalHighlightRing.position.set(clickedComp.x, 0.25, clickedComp.z);
            onSelectComponent(clickedComp);
            if (onToast) {
              onToast(
                `Selected ${clickedComp.type.toUpperCase()} (${clickedComp.id}) — click a second element to auto-connect!`
              );
            }
          }
        } else {
          if (state.wireStartTerminal.compId !== clickedCompId) {
            const fromComp = state.components.find(c => c.id === state.wireStartTerminal!.compId);
            const toComp = clickedComp;
            if (fromComp && toComp) {
              const { fromTermId, toTermId } = resolveAutoTerminals(fromComp, toComp, state.wires);
              const newWire: CircuitWireData = {
                id: `wire_${wireCounter++}`,
                fromCompId: fromComp.id,
                fromTermId,
                toCompId: toComp.id,
                toTermId,
                current: 0,
                routingStyle: controlsState.wireRouting || 'orthogonal',
              };
              state.wires.push(newWire);
              createWireMesh(newWire);
              onSelectComponent(toComp);
              if (onToast) {
                onToast(
                  `Connected ${fromComp.type.toUpperCase()} (${fromTermId}) → ${toComp.type.toUpperCase()} (${toTermId})`
                );
              }
            }
          } else {
            if (onToast) {
              onToast('Cancelled wire selection');
            }
          }
          state.wireStartTerminal = null;
          state.terminalHighlightRing.visible = false;
          state.terminalHighlightRing.scale.set(1, 1, 1);
        }
        return;
      } else {
        if (state.wireStartTerminal) {
          state.wireStartTerminal = null;
          state.terminalHighlightRing.visible = false;
          state.terminalHighlightRing.scale.set(1, 1, 1);
        }
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
    state.componentMeshes.forEach(grp => {
      // Exclude billboard sprite from drag raycast to prevent blocking component clicks
      grp.children.forEach(child => {
        if (child.name !== 'meterBillboardSprite') {
          allMeshes.push(child);
        }
      });
    });

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

    // Element hover highlight in wire mode
    if (controlsState.activeTool === 'wire' && !state.wireStartTerminal) {
      let hoveredCompId: string | null = null;
      const allCompMeshes: THREE.Object3D[] = [];
      state.componentMeshes.forEach(grp => {
        grp.children.forEach(child => {
          if (child.name !== 'meterBillboardSprite') {
            allCompMeshes.push(child);
          }
        });
      });

      const hits = state.raycaster.intersectObjects(allCompMeshes, true);
      if (hits.length > 0) {
        let rootGrp: THREE.Object3D | null = hits[0].object;
        while (rootGrp && rootGrp.parent && rootGrp.parent !== state.scene) {
          rootGrp = rootGrp.parent;
        }
        for (const [cId, grp] of state.componentMeshes.entries()) {
          if (grp === rootGrp) {
            hoveredCompId = cId;
            break;
          }
        }
      }

      if (hoveredCompId) {
        const c = state.components.find(comp => comp.id === hoveredCompId);
        if (c) {
          state.terminalHighlightRing.visible = true;
          state.terminalHighlightRing.scale.set(2.2, 2.2, 2.2);
          state.terminalHighlightRing.position.set(c.x, 0.25, c.z);
        }
      } else {
        state.terminalHighlightRing.visible = false;
        state.terminalHighlightRing.scale.set(1, 1, 1);
      }
    }

    // Dragging & Auto-Connect Detection
    if (state.isDragging && state.draggedCompId && hitTable) {
      const comp = state.components.find(c => c.id === state.draggedCompId);
      if (comp && !comp.pinned) {
        comp.x = Math.max(-14, Math.min(14, hitPt.x + state.dragOffset.x));
        comp.z = Math.max(-9, Math.min(9, hitPt.z + state.dragOffset.z));

        const grp = state.componentMeshes.get(comp.id);
        if (grp) grp.position.set(comp.x, 0, comp.z);

        // Update wires already attached to this component
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

        // AUTO-CONNECT DETECTION:
        // Detect closest unattached wire segment on the circuit board
        let bestSnap: { wire: CircuitWireData; point: THREE.Vector3 } | null = null;
        let minDistance = 2.4; // snap threshold in units

        state.wires.forEach(w => {
          if (w.fromCompId === comp.id || w.toCompId === comp.id) return;

          const fromC = state.components.find(c => c.id === w.fromCompId);
          const toC = state.components.find(c => c.id === w.toCompId);
          if (!fromC || !toC) return;

          const p1 = getTerminalWorldPos(fromC, w.fromTermId);
          const p2 = getTerminalWorldPos(toC, w.toTermId);

          const vx = p2.x - p1.x;
          const vz = p2.z - p1.z;
          const lenSq = vx * vx + vz * vz;
          if (lenSq < 0.1) return;

          // Project dragged component position onto wire line segment
          let t = ((comp.x - p1.x) * vx + (comp.z - p1.z) * vz) / lenSq;
          t = Math.max(0.12, Math.min(0.88, t));

          const projX = p1.x + t * vx;
          const projZ = p1.z + t * vz;
          const dist = Math.hypot(comp.x - projX, comp.z - projZ);

          if (dist < minDistance) {
            minDistance = dist;
            bestSnap = {
              wire: w,
              point: new THREE.Vector3(projX, 0.2, projZ),
            };
          }
        });

        state.snapCandidate = bestSnap;
        if (bestSnap) {
          state.snapHighlightIndicator.visible = true;
          state.snapHighlightIndicator.position.copy((bestSnap as { wire: CircuitWireData; point: THREE.Vector3 }).point);
        } else {
          state.snapHighlightIndicator.visible = false;
        }

        updateSelectionIndicator();
      }
    }
  };

  const handlePointerUp = () => {
    const state = threeRef.current;
    if (!state) return;

    if (state.isDragging && state.draggedCompId) {
      const comp = state.components.find(c => c.id === state.draggedCompId);
      if (comp && !comp.pinned) {
        // 1. AUTO-CONNECT: Splice component directly into circuit branch
        if (state.snapCandidate) {
          const snapWire = state.snapCandidate.wire;
          const [t1, t2] = getComponentTerminals(comp.type);

          // Remove the spliced wire
          const oldWData = state.wireMeshes.get(snapWire.id);
          if (oldWData) {
            state.scene.remove(oldWData.tube);
            state.scene.remove(oldWData.arrowGroup);
            oldWData.tube.geometry.dispose();
            state.wireMeshes.delete(snapWire.id);
          }
          state.wires = state.wires.filter(w => w.id !== snapWire.id);

          // Place component at the snap position with grid quantization
          comp.x = Math.round(state.snapCandidate.point.x / 1.5) * 1.5;
          comp.z = Math.round(state.snapCandidate.point.z / 1.5) * 1.5;
          const grp = state.componentMeshes.get(comp.id);
          if (grp) grp.position.set(comp.x, 0, comp.z);

          // Insert two connecting wires
          const newW1: CircuitWireData = {
            id: `wire_${wireCounter++}`,
            fromCompId: snapWire.fromCompId,
            fromTermId: snapWire.fromTermId,
            toCompId: comp.id,
            toTermId: t1,
            current: 0,
            routingStyle: controlsState.wireRouting || 'orthogonal',
          };

          const newW2: CircuitWireData = {
            id: `wire_${wireCounter++}`,
            fromCompId: comp.id,
            fromTermId: t2,
            toCompId: snapWire.toCompId,
            toTermId: snapWire.toTermId,
            current: 0,
            routingStyle: controlsState.wireRouting || 'orthogonal',
          };

          state.wires.push(newW1, newW2);
          createWireMesh(newW1);
          createWireMesh(newW2);

          if (onToast) {
            onToast(`Auto-connected ${comp.type.toUpperCase()} into circuit & adjusted wire routing!`);
          }
        } else {
          // Standard snapping to breadboard grid
          comp.x = Math.round(comp.x / 1.5) * 1.5;
          comp.z = Math.round(comp.z / 1.5) * 1.5;
          const grp = state.componentMeshes.get(comp.id);
          if (grp) grp.position.set(comp.x, 0, comp.z);
        }

        // Re-adjust all attached wires
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

    state.snapCandidate = null;
    state.snapHighlightIndicator.visible = false;
    state.controls.enabled = true;
    state.isDragging = false;
    state.draggedCompId = null;
  };

  // Expose methods to parent window
  useEffect(() => {
    (window as any).__circuitWorkbench = {
      loadPreset: loadPresetCircuit,
      addComponent: (type: ComponentType, autoConnect: boolean = false) => {
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

        if (autoConnect) {
          autoConnectComponentToCircuit(newComp.id);
        }
      },
      autoConnectSelectedComponent: (compId: string) => {
        return autoConnectComponentToCircuit(compId);
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
        const comp = state.components.find(c => c.id === id);
        const attachedWires = state.wires.filter(w => w.fromCompId === id || w.toCompId === id);

        if (comp && attachedWires.length >= 2) {
          const [t1] = getComponentTerminals(comp.type);
          const side1Endpoints: Array<{ compId: string; termId: string }> = [];
          const side2Endpoints: Array<{ compId: string; termId: string }> = [];

          attachedWires.forEach(w => {
            if (w.fromCompId === id && w.toCompId !== id) {
              if (w.fromTermId === t1) {
                side1Endpoints.push({ compId: w.toCompId, termId: w.toTermId });
              } else {
                side2Endpoints.push({ compId: w.toCompId, termId: w.toTermId });
              }
            } else if (w.toCompId === id && w.fromCompId !== id) {
              if (w.toTermId === t1) {
                side1Endpoints.push({ compId: w.fromCompId, termId: w.fromTermId });
              } else {
                side2Endpoints.push({ compId: w.fromCompId, termId: w.fromTermId });
              }
            }
          });

          // Remove old wires attached to deleted component and remove component
          state.wires = state.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
          state.components = state.components.filter(c => c.id !== id);

          const addBridgeWire = (
            epA: { compId: string; termId: string },
            epB: { compId: string; termId: string }
          ) => {
            if (epA.compId === epB.compId && epA.termId === epB.termId) return;
            const exists = state.wires.some(
              w =>
                (w.fromCompId === epA.compId &&
                  w.fromTermId === epA.termId &&
                  w.toCompId === epB.compId &&
                  w.toTermId === epB.termId) ||
                (w.fromCompId === epB.compId &&
                  w.fromTermId === epB.termId &&
                  w.toCompId === epA.compId &&
                  w.toTermId === epA.termId)
            );
            if (!exists) {
              state.wires.push({
                id: `wire_${wireCounter++}`,
                fromCompId: epA.compId,
                fromTermId: epA.termId,
                toCompId: epB.compId,
                toTermId: epB.termId,
                current: 0,
                routingStyle: controlsState.wireRouting || 'orthogonal',
              });
            }
          };

          if (side1Endpoints.length > 0 && side2Endpoints.length > 0) {
            // Bridge primary terminals across the removed component with a replacement wire
            addBridgeWire(side1Endpoints[0], side2Endpoints[0]);
            for (let i = 1; i < side1Endpoints.length; i++) {
              addBridgeWire(side1Endpoints[0], side1Endpoints[i]);
            }
            for (let j = 1; j < side2Endpoints.length; j++) {
              addBridgeWire(side2Endpoints[0], side2Endpoints[j]);
            }
          } else {
            const allEndpoints = [...side1Endpoints, ...side2Endpoints];
            for (let i = 1; i < allEndpoints.length; i++) {
              addBridgeWire(allEndpoints[0], allEndpoints[i]);
            }
          }

          rebuildCircuitScene();
          onSelectComponent(null);
          if (onToast) {
            onToast(
              `Deleted ${comp.type.toUpperCase()} and automatically replaced it with a wire!`
            );
          }
          return;
        }

        state.wires = state.wires.filter(w => w.fromCompId !== id && w.toCompId !== id);
        state.components = state.components.filter(c => c.id !== id);
        rebuildCircuitScene();
        onSelectComponent(null);
        if (onToast && comp) {
          onToast(`Deleted ${comp.type.toUpperCase()}`);
        }
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
  }, [onSelectComponent, controlsState, onToast]);

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
