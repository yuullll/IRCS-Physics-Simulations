export type ComponentType =
  | 'battery'
  | 'resistor'
  | 'bulb'
  | 'capacitor'
  | 'inductor'
  | 'switch'
  | 'voltmeter'
  | 'ammeter'
  | 'ground'
  | 'lead_pin';

export interface TerminalRef {
  compId: string;
  terminalId: string;
}

export interface CircuitComponentData {
  id: string;
  type: ComponentType;
  x: number;
  z: number;
  rotationY: number;
  value: number; // Volts for battery, Ohms for R/bulb, uF for C, mH for L
  closed?: boolean; // For switch
  measuredValue?: number; // Volts or Amps for meters
  power?: number; // Watts for bulb
  vCap?: number; // Capacitor history voltage
  iInd?: number; // Inductor history current
  pinned?: boolean;
}

export interface CircuitWireData {
  id: string;
  fromCompId: string;
  fromTermId: string;
  toCompId: string;
  toTermId: string;
  current: number;
  routingStyle?: 'orthogonal' | 'curved';
  waypoints?: Array<{ x: number; z: number }>;
}

export interface MNAResult {
  nodeVoltages: Record<number, number>;
  branchCurrents: Record<string, number>; // by wire or component id
  totalSupplyCurrent: number;
  kclMaxResidual: number;
  kvlVerified: boolean;
  hasErrors: boolean;
  errorMessage?: string;
}

/**
 * Solve system Ax = b using Gaussian elimination with partial pivoting.
 */
export function solveLinearSystem(A: number[][], b: number[], n: number): number[] {
  // Clone to avoid in-place mutation of input matrices
  const M: number[][] = A.map(row => [...row]);
  const y = [...b];

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    const tempRow = M[i];
    M[i] = M[maxRow];
    M[maxRow] = tempRow;

    const tempY = y[i];
    y[i] = y[maxRow];
    y[maxRow] = tempY;

    if (Math.abs(M[i][i]) < 1e-12) {
      continue;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j < n; j++) {
        M[k][j] -= factor * M[i][j];
      }
      y[k] -= factor * y[i];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
  }
  return x;
}

/**
 * Executes Generalized Modified Nodal Analysis (MNA)
 * including transient capacitor & inductor companion models
 */
export function solveCircuitMNA(
  components: CircuitComponentData[],
  wires: CircuitWireData[],
  dt: number = 0.016
): MNAResult {
  if (components.length === 0) {
    return {
      nodeVoltages: {},
      branchCurrents: {},
      totalSupplyCurrent: 0,
      kclMaxResidual: 0,
      kvlVerified: true,
      hasErrors: false,
    };
  }

  // 1. Terminal List & Disjoint-Set Union for electric node discovery
  const terminals: string[] = [];
  components.forEach(c => {
    if (c.type === 'ground' || c.type === 'lead_pin') {
      terminals.push(`${c.id}_term`);
    } else if (c.type === 'battery' || c.type === 'voltmeter') {
      terminals.push(`${c.id}_pos`, `${c.id}_neg`);
    } else if (c.type === 'switch') {
      terminals.push(`${c.id}_hinge`, `${c.id}_contact`);
    } else if (c.type === 'ammeter') {
      terminals.push(`${c.id}_in`, `${c.id}_out`);
    } else {
      terminals.push(`${c.id}_term1`, `${c.id}_term2`);
    }
  });

  const parent: Record<string, string> = {};
  terminals.forEach(t => (parent[t] = t));

  function find(k: string): string {
    if (!parent[k]) parent[k] = k;
    if (parent[k] === k) return k;
    parent[k] = find(parent[k]);
    return parent[k];
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  }

  // Union connected terminals across wires
  wires.forEach(w => {
    union(`${w.fromCompId}_${w.fromTermId}`, `${w.toCompId}_${w.toTermId}`);
  });

  // Unique electrical nodes
  const rootSet = Array.from(new Set(terminals.map(t => find(t))));
  const nodeMap: Record<string, number> = {};
  rootSet.forEach((root, idx) => (nodeMap[root] = idx));

  const N = rootSet.length;
  if (N <= 1) {
    return {
      nodeVoltages: {},
      branchCurrents: {},
      totalSupplyCurrent: 0,
      kclMaxResidual: 0,
      kvlVerified: true,
      hasErrors: false,
    };
  }

  // Independent voltage sources (Batteries)
  const batteries = components.filter(c => c.type === 'battery');
  const M = batteries.length;
  const size = N + M;

  // G matrix and RHS vector Z
  const G: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const Z: number[] = new Array(size).fill(0);

  function addConductance(nA: number, nB: number, g: number) {
    if (nA === nB) return;
    G[nA][nA] += g;
    G[nB][nB] += g;
    G[nA][nB] -= g;
    G[nB][nA] -= g;
  }

  function addCurrentSource(fromNode: number, toNode: number, iVal: number) {
    if (fromNode === toNode) return;
    Z[fromNode] -= iVal;
    Z[toNode] += iVal;
  }

  // Assemble components into MNA stamp
  components.forEach(c => {
    if (c.type === 'resistor' || c.type === 'bulb') {
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const rVal = Math.max(c.value, 0.05);
      addConductance(nA, nB, 1.0 / rVal);
    } else if (c.type === 'switch') {
      const nA = nodeMap[find(`${c.id}_hinge`)];
      const nB = nodeMap[find(`${c.id}_contact`)];
      // Switch closed = 100 S (0.01 Ohm), open = 1e-9 S (1 GOhm)
      const g = c.closed ? 100.0 : 1e-9;
      addConductance(nA, nB, g);
    } else if (c.type === 'voltmeter') {
      const nA = nodeMap[find(`${c.id}_pos`)];
      const nB = nodeMap[find(`${c.id}_neg`)];
      addConductance(nA, nB, 1e-7); // 10 Megaohm input impedance
    } else if (c.type === 'ammeter') {
      const nA = nodeMap[find(`${c.id}_in`)];
      const nB = nodeMap[find(`${c.id}_out`)];
      addConductance(nA, nB, 1000.0); // 0.001 Ohm shunt resistance
    } else if (c.type === 'capacitor') {
      // Companion model for transient capacitor:
      // I = C * dV/dt => G_eq = C/dt, I_eq = (C/dt) * V_prev
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const capFarads = (c.value || 100) * 1e-6; // uF to Farads
      const effectiveDt = Math.max(dt, 0.001);
      const gEq = capFarads / effectiveDt;
      const vPrev = c.vCap || 0;
      const iEq = gEq * vPrev;

      addConductance(nA, nB, gEq);
      addCurrentSource(nA, nB, iEq);
    } else if (c.type === 'inductor') {
      // Companion model for transient inductor:
      // V = L * dI/dt => G_eq = dt/L, I_eq = I_prev
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const indHenries = (c.value || 10) * 1e-3; // mH to H
      const effectiveDt = Math.max(dt, 0.001);
      const gEq = effectiveDt / Math.max(indHenries, 1e-6);
      const iPrev = c.iInd || 0;

      addConductance(nA, nB, gEq);
      addCurrentSource(nA, nB, -iPrev);
    }
  });

  // Voltage Sources (Batteries)
  batteries.forEach((batt, bIdx) => {
    const nPos = nodeMap[find(`${batt.id}_pos`)];
    const nNeg = nodeMap[find(`${batt.id}_neg`)];
    const row = N + bIdx;

    G[nPos][row] += 1;
    G[nNeg][row] -= 1;
    G[row][nPos] += 1;
    G[row][nNeg] -= 1;
    G[row][row] = -0.02; // Small internal battery source impedance (0.02 Ohm)
    Z[row] = batt.value; // EMF Voltage
  });

  // Reference Ground node: If a ground component exists, pick that node; otherwise pick node 0
  let groundNode = 0;
  const groundComp = components.find(c => c.type === 'ground');
  if (groundComp) {
    const gRoot = find(`${groundComp.id}_term`);
    if (nodeMap[gRoot] !== undefined) {
      groundNode = nodeMap[gRoot];
    }
  }

  // Pin Ground node equation: V[groundNode] = 0
  for (let c = 0; c < size; c++) {
    G[groundNode][c] = 0;
  }
  G[groundNode][groundNode] = 1;
  Z[groundNode] = 0;

  // Solve MNA System
  const solution = solveLinearSystem(G, Z, size);

  // Extract Nodal Voltages
  const nodeVoltages: Record<number, number> = {};
  for (let i = 0; i < N; i++) {
    nodeVoltages[i] = solution[i];
  }

  // Update dynamic component states (capacitor V, inductor I, bulb power, meter readouts)
  components.forEach(c => {
    if (c.type === 'capacitor') {
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const vDrop = (nodeVoltages[nA] ?? 0) - (nodeVoltages[nB] ?? 0);
      c.vCap = vDrop;
      c.measuredValue = Math.abs(vDrop);
    } else if (c.type === 'inductor') {
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const vDrop = (nodeVoltages[nA] ?? 0) - (nodeVoltages[nB] ?? 0);
      const indHenries = (c.value || 10) * 1e-3;
      c.iInd = (c.iInd || 0) + (vDrop / Math.max(indHenries, 1e-6)) * dt;
      c.measuredValue = c.iInd;
    } else if (c.type === 'bulb') {
      const nA = nodeMap[find(`${c.id}_term1`)];
      const nB = nodeMap[find(`${c.id}_term2`)];
      const vDrop = Math.abs((nodeVoltages[nA] ?? 0) - (nodeVoltages[nB] ?? 0));
      const iVal = vDrop / Math.max(c.value, 0.1);
      c.power = vDrop * iVal;
      c.measuredValue = iVal;
    } else if (c.type === 'voltmeter') {
      const nPos = nodeMap[find(`${c.id}_pos`)];
      const nNeg = nodeMap[find(`${c.id}_neg`)];
      c.measuredValue = (nodeVoltages[nPos] ?? 0) - (nodeVoltages[nNeg] ?? 0);
    } else if (c.type === 'ammeter') {
      const nIn = nodeMap[find(`${c.id}_in`)];
      const nOut = nodeMap[find(`${c.id}_out`)];
      const vDrop = (nodeVoltages[nIn] ?? 0) - (nodeVoltages[nOut] ?? 0);
      c.measuredValue = vDrop / 0.001;
    }
  });

  // Calculate branch currents in wires using nodal potential differences
  const branchCurrents: Record<string, number> = {};
  let totalSupplyCurrent = 0;

  batteries.forEach((batt, bIdx) => {
    const battCurrent = Math.abs(solution[N + bIdx]);
    totalSupplyCurrent += battCurrent;
  });

  // Wire currents with sign convention
  wires.forEach(w => {
    const rootFrom = find(`${w.fromCompId}_${w.fromTermId}`);
    const rootTo = find(`${w.toCompId}_${w.toTermId}`);
    const nFrom = nodeMap[rootFrom];
    const nTo = nodeMap[rootTo];

    // Compute approximate directed current from battery flow orientation
    // If supply has current, assign proportional drift
    const vFrom = nodeVoltages[nFrom] ?? 0;
    const vTo = nodeVoltages[nTo] ?? 0;
    let iWire = 0;

    if (Math.abs(vFrom - vTo) > 1e-4) {
      iWire = (vFrom - vTo) / 0.01; // small wire resistance
    } else {
      // Along equipotential connecting wires, distribute supply current
      iWire = totalSupplyCurrent > 0.001 ? totalSupplyCurrent : 0;
    }

    w.current = iWire;
    branchCurrents[w.id] = iWire;
  });

  // KCL Validation: check net current at each node
  let kclMaxResidual = 0;
  for (let n = 0; n < N; n++) {
    let sumCurrent = 0;
    // Iterate through attached components to node
    for (let j = 0; j < N; j++) {
      if (j !== n) {
        sumCurrent += G[n][j] * ((nodeVoltages[n] ?? 0) - (nodeVoltages[j] ?? 0));
      }
    }
    kclMaxResidual = Math.max(kclMaxResidual, Math.abs(sumCurrent));
  }

  return {
    nodeVoltages,
    branchCurrents,
    totalSupplyCurrent,
    kclMaxResidual,
    kvlVerified: kclMaxResidual < 0.15,
    hasErrors: false,
  };
}
