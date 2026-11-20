export const COULOMB_K_84 = 8.9875517923e9; // N·m²/C² (1 / 4πε₀)
export const MICRO_TO_C = 1e-6;

export type Distribution84Type =
  | 'thin_ring'
  | 'arc_center'
  | 'finite_line_bisector'
  | 'finite_line_collinear'
  | 'infinite_wire';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Distribution84Params {
  distribution: Distribution84Type;
  /** Total charge Q in microcoulombs (μC) for finite bodies, or linear charge density λ in μC/m for infinite wire */
  chargeMicro: number;
  /** Radius R in meters (Ring, Arc, or Wire cylinder radius) */
  radius: number;
  /** Rod length L in meters (Finite Line bisector/collinear, or visualized span for infinite wire) */
  length: number;
  /** Arc total opening angle in degrees (30..360, default 180 semicircle) */
  arcAngleDeg: number;
  /** Probe coordinate: x for ring/bisector, gap distance a for collinear, radial distance r for infinite wire */
  probeDistance: number;
  /** Number of discrete Riemann segments N (4..64) */
  segmentsN: number;
  /** Normalized sweep parameter 0..1 selecting the highlighted differential element dq */
  dqSweep: number;
}

export interface ChargeElement84 {
  index: number;
  position: Vec3;
  dqMicro: number; // μC
  rVec: Vec3; // from dq to P
  rMag: number;
  dE: Vec3; // kN/C
}

export interface SymmetryDecomposition {
  hasSymmetryTwin: boolean;
  dqElement: ChargeElement84;
  twinElement: ChargeElement84 | null;
  /** Parallel (reinforcing) component of dE along primary field axis */
  dEParallel: Vec3;
  /** Perpendicular (canceling) component of dE */
  dEPerp: Vec3;
  twinEParallel: Vec3;
  twinEPerp: Vec3;
  cancellationResidual: number; // |dEPerp + twinEPerp| (should be ~0)
  symmetryExplanation: string;
}

export interface Distribution84Evaluation {
  distribution: Distribution84Type;
  probePos: Vec3;
  elements: ChargeElement84[];
  /** Discrete Riemann superposition sum (kN/C) */
  riemannE: Vec3;
  riemannMag: number;
  /** Exact analytical calculus integral (kN/C) */
  exactE: Vec3;
  exactMag: number;
  /** Point-charge comparison k|Q|/r² at equivalent distance (kN/C) */
  pointChargeRefMag: number;
  /** Percent difference between N-segment Riemann sum and exact integral */
  riemannErrorPercent: number;
  /** Linear charge density λ in μC/m */
  lambdaMicroPerM: number;
  /** Effective total charge Q in μC */
  effectiveQMicro: number;
  symmetry: SymmetryDecomposition;
  /** Ratio E_exact / E_pointCharge */
  ratioToPointCharge: number;
  ekBadges: string[];
  headline: string;
}

export interface ProfileGraphPoint {
  param: number;
  exactVal: number;
  riemannVal: number;
  pointRefVal: number;
}

export interface ProfileGraphLayout {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  paramMin: number;
  paramMax: number;
  yMin: number;
  yMax: number;
  zeroY: number;
  exactPath: string;
  riemannPath: string;
  pointRefPath: string;
  markerX: number;
  markerY: number;
  specialMarker?: { x: number; y: number; label: string };
}

export interface DerivationStep {
  stepNumber: number;
  title: string;
  symbolic: string;
  liveSubstitution: string;
  ekRef: string;
}

export interface Distribution84Claim {
  id: string;
  ekRef: string;
  skill: '3.C' | '2.A';
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  justification: string;
}

export interface DistributionComparisonRecord {
  id: string;
  label: string;
  distribution: Distribution84Type;
  probeDistance: number;
  exactMagKN: number;
  riemannMagKN: number;
  errorPct: number;
  ratioToPoint: number;
  notes: string;
}

export function createDefaultDistribution84Params(
  distribution: Distribution84Type = 'thin_ring'
): Distribution84Params {
  switch (distribution) {
    case 'thin_ring':
      return {
        distribution: 'thin_ring',
        chargeMicro: 6.0,
        radius: 1.5,
        length: 3.0,
        arcAngleDeg: 180,
        probeDistance: 1.2,
        segmentsN: 24,
        dqSweep: 0.15,
      };
    case 'arc_center':
      return {
        distribution: 'arc_center',
        chargeMicro: 6.0,
        radius: 1.8,
        length: 3.0,
        arcAngleDeg: 180,
        probeDistance: 0,
        segmentsN: 24,
        dqSweep: 0.2,
      };
    case 'finite_line_bisector':
      return {
        distribution: 'finite_line_bisector',
        chargeMicro: 6.0,
        radius: 1.5,
        length: 3.2,
        arcAngleDeg: 180,
        probeDistance: 1.6,
        segmentsN: 24,
        dqSweep: 0.2,
      };
    case 'finite_line_collinear':
      return {
        distribution: 'finite_line_collinear',
        chargeMicro: 6.0,
        radius: 1.5,
        length: 2.6,
        arcAngleDeg: 180,
        probeDistance: 1.1,
        segmentsN: 24,
        dqSweep: 0.3,
      };
    case 'infinite_wire':
      return {
        distribution: 'infinite_wire',
        chargeMicro: 3.0, // interpreted as λ = 3.0 μC/m
        radius: 0.22,
        length: 14.0, // long visual span approximating infinite wire
        arcAngleDeg: 180,
        probeDistance: 1.6,
        segmentsN: 36,
        dqSweep: 0.28,
      };
  }
}

function vMag(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/**
 * Evaluates dE (in kN/C) at probePos from a point charge element dqMicro (in μC) at elemPos.
 * Note: k * (1 μC) / (1 m²) = 8.98755e9 * 1e-6 = 8987.55 N/C = 8.98755 kN/C.
 */
function computeElementFieldKN(elemPos: Vec3, probePos: Vec3, dqMicro: number): {
  rVec: Vec3;
  rMag: number;
  dE: Vec3;
} {
  const rx = probePos.x - elemPos.x;
  const ry = probePos.y - elemPos.y;
  const rz = probePos.z - elemPos.z;
  const r2 = rx * rx + ry * ry + rz * rz;
  const rMag = Math.sqrt(Math.max(1e-6, r2));
  const r3 = rMag * rMag * rMag;
  // Convert N/C to kN/C by dividing by 1e3 -> factor = COULOMB_K_84 * 1e-9
  const factor = (COULOMB_K_84 * MICRO_TO_C * 1e-3 * dqMicro) / r3;
  return {
    rVec: { x: rx, y: ry, z: rz },
    rMag,
    dE: { x: factor * rx, y: factor * ry, z: factor * rz },
  };
}

/**
 * Exact closed-form calculus integral for all 5 AP Physics C Topic 8.4 Boundary Statement distributions.
 * Returns electric field vector in kN/C.
 */
export function evaluateExactCalculusFieldKN(params: Distribution84Params): {
  exactE: Vec3;
  probePos: Vec3;
  lambdaMicroPerM: number;
  effectiveQMicro: number;
  pointChargeRefMag: number;
} {
  const kKN = COULOMB_K_84 * MICRO_TO_C * 1e-3; // 8.98755179 kN·m²/(C_micro)
  const Q = params.chargeMicro;
  const R = Math.max(0.2, params.radius);
  const L = Math.max(0.4, params.length);

  switch (params.distribution) {
    case 'thin_ring': {
      // Ring in y-z plane centered at origin; probe on x-axis at (x, 0, 0)
      const x = params.probeDistance;
      const denom = Math.pow(x * x + R * R, 1.5);
      const ex = (kKN * Q * x) / denom;
      const rEff = Math.max(0.25, Math.abs(x));
      const pointRef = Math.abs((kKN * Q) / (rEff * rEff));
      return {
        exactE: { x: ex, y: 0, z: 0 },
        probePos: { x, y: 0, z: 0 },
        lambdaMicroPerM: Q / (2 * Math.PI * R),
        effectiveQMicro: Q,
        pointChargeRefMag: pointRef,
      };
    }

    case 'arc_center': {
      // Circular arc of radius R in x-y plane centered at origin, spanning angle α symmetrically around -x axis.
      // Points on arc: (-R cos θ, R sin θ, 0) for θ ∈ [-α/2, +α/2].
      // Probe at center of curvature (0, 0, 0). For Q > 0, E points along +x.
      const alphaRad = (Math.max(15, Math.min(360, params.arcAngleDeg)) * Math.PI) / 180;
      const halfAlpha = alphaRad / 2;
      const arcLen = R * alphaRad;
      const lambda = Q / arcLen;
      // E_x = (2 k λ / R) * sin(α/2) = (k Q / R²) * sin(α/2) / (α/2)
      const rawEx = ((2 * kKN * lambda) / R) * Math.sin(halfAlpha);
      const ex = Math.abs(rawEx) < 1e-9 ? 0 : rawEx;
      const pointRef = Math.abs((kKN * Q) / (R * R));
      return {
        exactE: { x: ex, y: 0, z: 0 },
        probePos: { x: 0, y: 0, z: 0 },
        lambdaMicroPerM: lambda,
        effectiveQMicro: Q,
        pointChargeRefMag: pointRef,
      };
    }

    case 'finite_line_bisector': {
      // Line charge along y-axis from -L/2 to +L/2; probe at (x, 0, 0), x > 0
      const x = Math.max(0.35, Math.abs(params.probeDistance));
      const lambda = Q / L;
      const ex = (kKN * Q) / (x * Math.sqrt(x * x + (L / 2) * (L / 2)));
      const pointRef = Math.abs((kKN * Q) / (x * x));
      return {
        exactE: { x: ex, y: 0, z: 0 },
        probePos: { x, y: 0, z: 0 },
        lambdaMicroPerM: lambda,
        effectiveQMicro: Q,
        pointChargeRefMag: pointRef,
      };
    }

    case 'finite_line_collinear': {
      // Line charge along x-axis from -L to 0; probe collinear at x = a > 0
      const a = Math.max(0.35, Math.abs(params.probeDistance));
      const lambda = Q / L;
      const ex = (kKN * Q) / (a * (a + L));
      // Compare against a point charge Q placed at the rod's center (-L/2), distance r_cm = a + L/2
      const rCenter = a + L / 2;
      const pointRef = Math.abs((kKN * Q) / (rCenter * rCenter));
      return {
        exactE: { x: ex, y: 0, z: 0 },
        probePos: { x: a, y: 0, z: 0 },
        lambdaMicroPerM: lambda,
        effectiveQMicro: Q,
        pointChargeRefMag: pointRef,
      };
    }

    case 'infinite_wire': {
      // Infinite wire/cylinder along y-axis with uniform linear charge density λ = chargeMicro (μC/m)
      // Probe at radial distance r > R_c along +x axis
      const lambda = params.chargeMicro;
      const r = Math.max(R + 0.25, Math.abs(params.probeDistance));
      const ex = (2 * kKN * lambda) / r;
      // Reference: point charge of Q_ref = λ * 1m at distance r (to contrast 1/r vs 1/r²)
      const pointRef = Math.abs((kKN * lambda * 2) / (r * r));
      return {
        exactE: { x: ex, y: 0, z: 0 },
        probePos: { x: r, y: 0, z: 0 },
        lambdaMicroPerM: lambda,
        effectiveQMicro: lambda * L,
        pointChargeRefMag: pointRef,
      };
    }
  }
}

/**
 * Full pure evaluator combining discrete N-segment Riemann superposition, exact calculus integral,
 * and EK 8.4.A.2 symmetry pair cancellation analysis.
 */
export function evaluateDistribution84(params: Distribution84Params): Distribution84Evaluation {
  const N = Math.max(4, Math.min(96, Math.round(params.segmentsN)));
  const R = Math.max(0.2, params.radius);
  const L = Math.max(0.4, params.length);
  const exact = evaluateExactCalculusFieldKN(params);
  const probePos = exact.probePos;

  const elements: ChargeElement84[] = [];

  if (params.distribution === 'thin_ring') {
    const dq = params.chargeMicro / N;
    for (let i = 0; i < N; i++) {
      const phi = ((i + 0.5) / N) * Math.PI * 2;
      const pos: Vec3 = { x: 0, y: R * Math.cos(phi), z: R * Math.sin(phi) };
      const { rVec, rMag, dE } = computeElementFieldKN(pos, probePos, dq);
      elements.push({ index: i, position: pos, dqMicro: dq, rVec, rMag, dE });
    }
  } else if (params.distribution === 'arc_center') {
    const alphaRad = (Math.max(15, Math.min(360, params.arcAngleDeg)) * Math.PI) / 180;
    const dq = params.chargeMicro / N;
    for (let i = 0; i < N; i++) {
      const theta = -alphaRad / 2 + ((i + 0.5) / N) * alphaRad;
      const pos: Vec3 = { x: -R * Math.cos(theta), y: R * Math.sin(theta), z: 0 };
      const { rVec, rMag, dE } = computeElementFieldKN(pos, probePos, dq);
      elements.push({ index: i, position: pos, dqMicro: dq, rVec, rMag, dE });
    }
  } else if (params.distribution === 'finite_line_bisector') {
    const dq = params.chargeMicro / N;
    for (let i = 0; i < N; i++) {
      const y = -L / 2 + ((i + 0.5) / N) * L;
      const pos: Vec3 = { x: 0, y, z: 0 };
      const { rVec, rMag, dE } = computeElementFieldKN(pos, probePos, dq);
      elements.push({ index: i, position: pos, dqMicro: dq, rVec, rMag, dE });
    }
  } else if (params.distribution === 'finite_line_collinear') {
    const dq = params.chargeMicro / N;
    for (let i = 0; i < N; i++) {
      const x = -L + ((i + 0.5) / N) * L;
      const pos: Vec3 = { x, y: 0, z: 0 };
      const { rVec, rMag, dE } = computeElementFieldKN(pos, probePos, dq);
      elements.push({ index: i, position: pos, dqMicro: dq, rVec, rMag, dE });
    }
  } else {
    // infinite_wire approximated over truncated length L (default 14m) with linear charge density λ = chargeMicro
    const dq = (params.chargeMicro * L) / N;
    for (let i = 0; i < N; i++) {
      const y = -L / 2 + ((i + 0.5) / N) * L;
      const pos: Vec3 = { x: 0, y, z: 0 };
      const { rVec, rMag, dE } = computeElementFieldKN(pos, probePos, dq);
      elements.push({ index: i, position: pos, dqMicro: dq, rVec, rMag, dE });
    }
  }

  // Sum discrete Riemann elements
  const riemannE: Vec3 = { x: 0, y: 0, z: 0 };
  for (const el of elements) {
    riemannE.x += el.dE.x;
    riemannE.y += el.dE.y;
    riemannE.z += el.dE.z;
  }
  if (Math.abs(riemannE.x) < 1e-9) riemannE.x = 0;
  if (Math.abs(riemannE.y) < 1e-9) riemannE.y = 0;
  if (Math.abs(riemannE.z) < 1e-9) riemannE.z = 0;

  const riemannMag = vMag(riemannE);
  const exactMag = vMag(exact.exactE);
  const riemannErrorPercent =
    exactMag > 1e-6
      ? Number(((Math.abs(riemannMag - exactMag) / exactMag) * 100).toFixed(3))
      : Number((riemannMag * 100).toFixed(3));

  // Highlighted differential element dq and its exact symmetry twin dq' (EK 8.4.A.2)
  const clampedSweep = Math.max(0, Math.min(0.9999, params.dqSweep));
  const dqIdx = Math.floor(clampedSweep * N);
  const dqElement = elements[dqIdx];

  let twinElement: ChargeElement84 | null = null;
  let hasSymmetryTwin = false;
  let symmetryExplanation = '';

  if (params.distribution === 'thin_ring') {
    hasSymmetryTwin = true;
    const twinIdx = (dqIdx + Math.floor(N / 2)) % N;
    twinElement = elements[twinIdx];
    symmetryExplanation =
      'Diametrically opposite ring elements dq(φ) and dq(φ + π) produce equal and opposite perpendicular fields (dE_y + dE′_y = 0, dE_z + dE′_z = 0), leaving only axial dE_x.';
  } else if (params.distribution === 'arc_center') {
    hasSymmetryTwin = true;
    const twinIdx = N - 1 - dqIdx;
    twinElement = elements[twinIdx];
    symmetryExplanation =
      'Symmetric arc elements at +θ and −θ cancel their vertical components (dE_y + dE′_y = 0) and double along the symmetry bisector (+x). At α = 360°, horizontal components also cancel completely (E = 0).';
  } else if (params.distribution === 'finite_line_bisector') {
    hasSymmetryTwin = true;
    const twinIdx = N - 1 - dqIdx;
    twinElement = elements[twinIdx];
    symmetryExplanation =
      'Mirror elements at +y and −y along the finite rod have equal distances r = √(x² + y²), so vertical components cancel identically (dE_y + dE′_y = 0) and only dE_x survives.';
  } else if (params.distribution === 'infinite_wire') {
    hasSymmetryTwin = true;
    const twinIdx = N - 1 - dqIdx;
    twinElement = elements[twinIdx];
    symmetryExplanation =
      'Because the wire extends symmetrically to ±∞, every charge element at +y is paired with an identical element at −y whose axial component cancels dE_y, yielding a purely radial field E = 2kλ/r.';
  } else {
    hasSymmetryTwin = false;
    twinElement = null;
    symmetryExplanation =
      'At a collinear point along the rod’s axis, every differential element dq produces dE strictly along the x-axis (no perpendicular component exists), so scalar integration ∫ k dq / (a − x′)² applies directly.';
  }

  const dEParallel: Vec3 = { x: dqElement.dE.x, y: 0, z: 0 };
  const dEPerp: Vec3 = { x: 0, y: dqElement.dE.y, z: dqElement.dE.z };
  const twinEParallel: Vec3 = twinElement
    ? { x: twinElement.dE.x, y: 0, z: 0 }
    : { x: 0, y: 0, z: 0 };
  const twinEPerp: Vec3 = twinElement
    ? { x: 0, y: twinElement.dE.y, z: twinElement.dE.z }
    : { x: 0, y: 0, z: 0 };

  const cancellationResidual = twinElement
    ? vMag({
        x: 0,
        y: dEPerp.y + twinEPerp.y,
        z: dEPerp.z + twinEPerp.z,
      })
    : 0;

  const ratioToPointCharge =
    exact.pointChargeRefMag > 1e-6
      ? Number((exactMag / exact.pointChargeRefMag).toFixed(3))
      : 0;

  const headlineMap: Record<Distribution84Type, string> = {
    thin_ring: 'Thin Ring of Charge — Axial Field Peaks at x = ±R/√2 and Vanishes at Center',
    arc_center: 'Circular Arc at Center — Symmetry Cancels dE_y, Leaving E = (2kλ/R) sin(α/2)',
    finite_line_bisector: 'Finite Line (Bisector) — Bridges Infinite Wire (1/x) and Point Charge (1/x²)',
    finite_line_collinear: 'Finite Line (Collinear) — Direct 1D Calculus Integration E = kQ / [a(a + L)]',
    infinite_wire: 'Infinite Charged Wire / Cylinder — Radial Symmetry Gives E = λ / (2πε₀r) = 2kλ/r',
  };

  return {
    distribution: params.distribution,
    probePos,
    elements,
    riemannE,
    riemannMag,
    exactE: exact.exactE,
    exactMag,
    pointChargeRefMag: exact.pointChargeRefMag,
    riemannErrorPercent,
    lambdaMicroPerM: exact.lambdaMicroPerM,
    effectiveQMicro: exact.effectiveQMicro,
    symmetry: {
      hasSymmetryTwin,
      dqElement,
      twinElement,
      dEParallel,
      dEPerp,
      twinEParallel,
      twinEPerp,
      cancellationResidual,
      symmetryExplanation,
    },
    ratioToPointCharge,
    ekBadges: ['LO 8.4.A', '8.4.A.1 ∫(dq/r²)r̂', '8.4.A.2 Symmetry'],
    headline: headlineMap[params.distribution],
  };
}

/**
 * Generates Skill 1.C qualitative & quantitative E-field graph layout (SVG paths strictly bounded).
 */
export function computeDistributionGraphLayout(
  params: Distribution84Params,
  width = 320,
  height = 166
): ProfileGraphLayout {
  const padL = 34;
  const padR = 14;
  const padT = 18;
  const padB = 26;
  const plotW = Math.max(80, width - padL - padR);
  const plotH = Math.max(50, height - padT - padB);

  const samples: ProfileGraphPoint[] = [];
  let paramMin = 0;
  let paramMax = 4;
  let xLabel = 'x (m)';
  const yLabel = 'E_x (kN/C)';
  let currentParam = params.probeDistance;

  if (params.distribution === 'thin_ring') {
    paramMin = -3.5;
    paramMax = 3.5;
    xLabel = 'Axial position x (m)';
    currentParam = Math.max(paramMin, Math.min(paramMax, params.probeDistance));
    for (let i = 0; i <= 48; i++) {
      const x = paramMin + (i / 48) * (paramMax - paramMin);
      const ev = evaluateDistribution84({ ...params, probeDistance: x });
      // Signed point charge ref (clamped near origin)
      const safeX = Math.abs(x) < 0.75 ? (x >= 0 ? 0.75 : -0.75) : x;
      const kKN = COULOMB_K_84 * MICRO_TO_C * 1e-3;
      const ptSigned = Math.sign(x || 1) * ((kKN * params.chargeMicro) / (safeX * safeX));
      samples.push({
        param: x,
        exactVal: ev.exactE.x,
        riemannVal: ev.riemannE.x,
        pointRefVal: ptSigned,
      });
    }
  } else if (params.distribution === 'arc_center') {
    paramMin = 30;
    paramMax = 360;
    xLabel = 'Arc opening angle α (°)';
    currentParam = params.arcAngleDeg;
    for (let i = 0; i <= 44; i++) {
      const deg = paramMin + (i / 44) * (paramMax - paramMin);
      const ev = evaluateDistribution84({ ...params, arcAngleDeg: deg });
      samples.push({
        param: deg,
        exactVal: ev.exactE.x,
        riemannVal: ev.riemannE.x,
        pointRefVal: Math.sign(params.chargeMicro || 1) * ev.pointChargeRefMag,
      });
    }
  } else if (params.distribution === 'finite_line_bisector') {
    paramMin = 0.5;
    paramMax = 4.0;
    xLabel = 'Bisector distance x (m)';
    currentParam = Math.max(paramMin, Math.min(paramMax, params.probeDistance));
    for (let i = 0; i <= 42; i++) {
      const x = paramMin + (i / 42) * (paramMax - paramMin);
      const ev = evaluateDistribution84({ ...params, probeDistance: x });
      samples.push({
        param: x,
        exactVal: ev.exactE.x,
        riemannVal: ev.riemannE.x,
        pointRefVal: Math.sign(params.chargeMicro || 1) * ev.pointChargeRefMag,
      });
    }
  } else if (params.distribution === 'finite_line_collinear') {
    paramMin = 0.5;
    paramMax = 3.8;
    xLabel = 'End gap distance a (m)';
    currentParam = Math.max(paramMin, Math.min(paramMax, params.probeDistance));
    for (let i = 0; i <= 42; i++) {
      const a = paramMin + (i / 42) * (paramMax - paramMin);
      const ev = evaluateDistribution84({ ...params, probeDistance: a });
      samples.push({
        param: a,
        exactVal: ev.exactE.x,
        riemannVal: ev.riemannE.x,
        pointRefVal: Math.sign(params.chargeMicro || 1) * ev.pointChargeRefMag,
      });
    }
  } else {
    paramMin = Math.max(0.55, params.radius + 0.3);
    paramMax = 4.0;
    xLabel = 'Radial distance r (m)';
    currentParam = Math.max(paramMin, Math.min(paramMax, params.probeDistance));
    for (let i = 0; i <= 42; i++) {
      const r = paramMin + (i / 42) * (paramMax - paramMin);
      const ev = evaluateDistribution84({ ...params, probeDistance: r });
      samples.push({
        param: r,
        exactVal: ev.exactE.x,
        riemannVal: ev.riemannE.x,
        pointRefVal: Math.sign(params.chargeMicro || 1) * ev.pointChargeRefMag,
      });
    }
  }

  // Compute robust y-range anchored on exact & riemann curves (clip pointRef if singular)
  const coreVals = samples.flatMap(s => [s.exactVal, s.riemannVal]);
  const maxCoreAbs = Math.max(5, ...coreVals.map(v => Math.abs(v)));
  const isSymmetricY = params.distribution === 'thin_ring';
  const rawMin = isSymmetricY ? -maxCoreAbs * 1.15 : Math.min(0, ...coreVals) * 1.15;
  const rawMax = isSymmetricY ? maxCoreAbs * 1.15 : Math.max(0, ...coreVals) * 1.15;
  const yMin = rawMin === rawMax ? -10 : rawMin;
  const yMax = rawMin === rawMax ? 10 : rawMax;

  const mapX = (p: number) =>
    padL + ((Math.max(paramMin, Math.min(paramMax, p)) - paramMin) / (paramMax - paramMin)) * plotW;
  const mapY = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v));
    return padT + (1 - (clamped - yMin) / (yMax - yMin)) * plotH;
  };

  const buildPath = (getter: (s: ProfileGraphPoint) => number) =>
    samples
      .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(s.param).toFixed(1)} ${mapY(getter(s)).toFixed(1)}`)
      .join(' ');

  const currentEval = evaluateDistribution84(params);
  const markerX = mapX(currentParam);
  const markerY = mapY(currentEval.exactE.x);

  let specialMarker: { x: number; y: number; label: string } | undefined;
  if (params.distribution === 'thin_ring') {
    const xPeak = params.radius / Math.SQRT2;
    const peakEval = evaluateExactCalculusFieldKN({ ...params, probeDistance: xPeak });
    specialMarker = {
      x: mapX(xPeak),
      y: mapY(peakEval.exactE.x),
      label: `Peak R/√2`,
    };
  } else if (params.distribution === 'arc_center') {
    const semiEval = evaluateExactCalculusFieldKN({ ...params, arcAngleDeg: 180 });
    specialMarker = {
      x: mapX(180),
      y: mapY(semiEval.exactE.x),
      label: '180° Semi',
    };
  }

  return {
    width,
    height,
    xLabel,
    yLabel,
    paramMin,
    paramMax,
    yMin,
    yMax,
    zeroY: mapY(0),
    exactPath: buildPath(s => s.exactVal),
    riemannPath: buildPath(s => s.riemannVal),
    pointRefPath: buildPath(s => s.pointRefVal),
    markerX,
    markerY,
    specialMarker,
  };
}

/**
 * Returns structured AP Physics C Skill 2.A symbolic derivation steps with live numerical values.
 */
export function getDerivationSteps84(
  params: Distribution84Params,
  ev: Distribution84Evaluation
): DerivationStep[] {
  const Q = params.chargeMicro;
  const R = params.radius;
  const L = params.length;

  switch (params.distribution) {
    case 'thin_ring':
      return [
        {
          stepNumber: 1,
          title: 'Define Differential Charge Element',
          symbolic: 'dq = λ ds = (Q / 2πR) R dφ = (Q / 2π) dφ',
          liveSubstitution: `λ = ${ev.lambdaMicroPerM.toFixed(2)} μC/m, Q = ${Q.toFixed(1)} μC, R = ${R.toFixed(2)} m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 2,
          title: 'Distance & Axial Projection',
          symbolic: 'r = √(x² + R²),   cos θ = x / √(x² + R²)',
          liveSubstitution: `At x = ${params.probeDistance.toFixed(2)} m: r = ${Math.hypot(params.probeDistance, R).toFixed(2)} m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 3,
          title: 'Apply Azimuthal Symmetry',
          symbolic: '∫ dE_y = 0,  ∫ dE_z = 0  (opposite elements cancel)',
          liveSubstitution: `Twin cancellation residual: ${ev.symmetry.cancellationResidual.toFixed(4)} kN/C`,
          ekRef: '8.4.A.2',
        },
        {
          stepNumber: 4,
          title: 'Integrate Over Full Ring (0 → 2π)',
          symbolic: 'E_x = (1/4πε₀) ∫ (dq / r²) cos θ = k Q x / (x² + R²)^(3/2)',
          liveSubstitution: `Exact E_x = ${ev.exactE.x.toFixed(2)} kN/C (N=${params.segmentsN} sum: ${ev.riemannE.x.toFixed(2)} kN/C)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 5,
          title: 'Extrema & Far-Field Limit',
          symbolic: 'dE_x/dx = 0 ⇒ x_max = ±R/√2;  |x| ≫ R ⇒ E_x → kQ/x²',
          liveSubstitution: `Peak location: x = ±${(R / Math.SQRT2).toFixed(2)} m; Ratio E/E_pt = ${ev.ratioToPointCharge.toFixed(2)}`,
          ekRef: '1.C / 2.A',
        },
      ];

    case 'arc_center':
      return [
        {
          stepNumber: 1,
          title: 'Define Arc Element dq',
          symbolic: 'dq = λ ds = λ R dθ,   λ = Q / (R α)',
          liveSubstitution: `α = ${params.arcAngleDeg.toFixed(0)}°, R = ${R.toFixed(2)} m ⇒ λ = ${ev.lambdaMicroPerM.toFixed(2)} μC/m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 2,
          title: 'Constant Distance to Center',
          symbolic: 'r = R (constant for all dq),   dE = (k λ R dθ) / R² = (k λ / R) dθ',
          liveSubstitution: `Every segment sits at r = ${R.toFixed(2)} m from center P(0,0,0).`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 3,
          title: 'Apply Mirror Symmetry Across x-Axis',
          symbolic: 'dE_y(θ) + dE_y(−θ) = 0  ⇒  E_y = 0,  dE_x = dE cos θ',
          liveSubstitution: `Symmetric pair cancel residual: ${ev.symmetry.cancellationResidual.toFixed(4)} kN/C`,
          ekRef: '8.4.A.2',
        },
        {
          stepNumber: 4,
          title: 'Integrate Over [−α/2, +α/2]',
          symbolic: 'E_x = (k λ / R) ∫ cos θ dθ = (2 k λ / R) sin(α/2)',
          liveSubstitution: `Exact E_x = ${ev.exactE.x.toFixed(2)} kN/C (N=${params.segmentsN} sum: ${ev.riemannE.x.toFixed(2)} kN/C)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 5,
          title: 'Special Angles (Semi vs Full Circle)',
          symbolic: 'α = π ⇒ E = 2kλ/R = 2kQ/(πR²);   α = 2π ⇒ sin(π) = 0 ⇒ E = 0',
          liveSubstitution: `Current E / E_point(R) = ${ev.ratioToPointCharge.toFixed(3)}`,
          ekRef: '8.4.A.2',
        },
      ];

    case 'finite_line_bisector':
      return [
        {
          stepNumber: 1,
          title: 'Define Linear Element dq',
          symbolic: 'dq = λ dy = (Q / L) dy,   y ∈ [−L/2, +L/2]',
          liveSubstitution: `L = ${L.toFixed(2)} m, Q = ${Q.toFixed(1)} μC ⇒ λ = ${ev.lambdaMicroPerM.toFixed(2)} μC/m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 2,
          title: 'Distance & Bisector Projection',
          symbolic: 'r = √(x² + y²),   cos θ = x / √(x² + y²)',
          liveSubstitution: `Bisector probe x = ${params.probeDistance.toFixed(2)} m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 3,
          title: 'Apply Top–Bottom Symmetry',
          symbolic: 'dE_y(+y) + dE_y(−y) = 0  ⇒  E_y = 0',
          liveSubstitution: `Symmetric pair cancel residual: ${ev.symmetry.cancellationResidual.toFixed(4)} kN/C`,
          ekRef: '8.4.A.2',
        },
        {
          stepNumber: 4,
          title: 'Evaluate Calculus Integral',
          symbolic: 'E_x = k λ x ∫ dy / (x² + y²)^(3/2) = k Q / [x √(x² + (L/2)²)]',
          liveSubstitution: `Exact E_x = ${ev.exactE.x.toFixed(2)} kN/C (N=${params.segmentsN} sum: ${ev.riemannE.x.toFixed(2)} kN/C)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 5,
          title: 'Limiting Behaviors (L ≫ x vs x ≫ L)',
          symbolic: 'L ≫ x ⇒ E_x → 2kλ/x (Infinite Wire);  x ≫ L ⇒ E_x → kQ/x² (Point)',
          liveSubstitution: `Ratio E / E_point = ${ev.ratioToPointCharge.toFixed(3)}`,
          ekRef: '2.C / 2.A',
        },
      ];

    case 'finite_line_collinear':
      return [
        {
          stepNumber: 1,
          title: 'Define Linear Element dq Along Axis',
          symbolic: 'dq = λ dx′ = (Q / L) dx′,   x′ ∈ [−L, 0]',
          liveSubstitution: `L = ${L.toFixed(2)} m, Q = ${Q.toFixed(1)} μC ⇒ λ = ${ev.lambdaMicroPerM.toFixed(2)} μC/m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 2,
          title: 'Collinear Separation Distance',
          symbolic: 'r = a − x′ (strictly along +x̂, so dE_y = dE_z = 0)',
          liveSubstitution: `Probe gap a = ${params.probeDistance.toFixed(2)} m from near end`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 3,
          title: 'Direct 1D Superposition Integral',
          symbolic: 'E_x = k λ ∫_{−L}^{0} dx′ / (a − x′)² = k λ [1/(a − x′)]_{−L}^{0}',
          liveSubstitution: `Near end contributes strongly (1/a²), far end weakly (1/(a+L)²)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 4,
          title: 'Closed-Form Result',
          symbolic: 'E_x = k λ (1/a − 1/(a + L)) = k Q / [a (a + L)]',
          liveSubstitution: `Exact E_x = ${ev.exactE.x.toFixed(2)} kN/C (N=${params.segmentsN} sum: ${ev.riemannE.x.toFixed(2)} kN/C)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 5,
          title: 'Far-Field Point Charge Recovery',
          symbolic: 'For a ≫ L:  a(a + L) ≈ a²  ⇒  E_x → k Q / a²',
          liveSubstitution: `Ratio E / E_point(center) = ${ev.ratioToPointCharge.toFixed(3)}`,
          ekRef: '2.C / 2.A',
        },
      ];

    case 'infinite_wire':
      return [
        {
          stepNumber: 1,
          title: 'Uniform Linear Charge Density',
          symbolic: 'dq = λ dy,   y ∈ (−∞, +∞)',
          liveSubstitution: `λ = ${params.chargeMicro.toFixed(2)} μC/m, cylinder radius R_c = ${R.toFixed(2)} m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 2,
          title: 'Radial Distance & Angle Substitution',
          symbolic: 'y = r tan θ,  dy = r sec²θ dθ,  √(r² + y²) = r sec θ',
          liveSubstitution: `Radial probe distance r = ${params.probeDistance.toFixed(2)} m`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 3,
          title: 'Infinite Translational Symmetry',
          symbolic: 'Every +y element pairs with −y ⇒ E_y = 0, purely radial E_r',
          liveSubstitution: `Twin cancellation residual: ${ev.symmetry.cancellationResidual.toFixed(4)} kN/C`,
          ekRef: '8.4.A.2',
        },
        {
          stepNumber: 4,
          title: 'Evaluate Improper Integral (−π/2 → +π/2)',
          symbolic: 'E_r = (k λ / r) ∫_{−π/2}^{π/2} cos θ dθ = 2 k λ / r = λ / (2πε₀ r)',
          liveSubstitution: `Exact E_r = ${ev.exactE.x.toFixed(2)} kN/C (Finite L=${L.toFixed(0)}m sum: ${ev.riemannE.x.toFixed(2)} kN/C)`,
          ekRef: '8.4.A.1',
        },
        {
          stepNumber: 5,
          title: '1/r Scaling vs Point Charge 1/r²',
          symbolic: 'Doubling r halves E (E ∝ 1/r), slower decay than point charge (1/r²)',
          liveSubstitution: `At 2r = ${(params.probeDistance * 2).toFixed(2)} m: E drops to ${(ev.exactE.x / 2).toFixed(2)} kN/C`,
          ekRef: '1.C / 2.C',
        },
      ];
  }
}

export const TOPIC_8_4_CLAIMS: Distribution84Claim[] = [
  {
    id: 'claim-ring-max',
    ekRef: '8.4.A.1 / 1.C',
    skill: '3.C',
    prompt:
      'For a uniformly charged thin ring of radius R, where along the central axis is the electric field magnitude |E_x| greatest?',
    options: [
      { id: 'a', text: 'At the exact center of the ring (x = 0).' },
      { id: 'b', text: 'At x = ±R / √2 (approx. ±0.707 R) from the center.' },
      { id: 'c', text: 'At x = ±R where cos θ = 1/√2.' },
    ],
    correctOptionId: 'b',
    justification:
      'At x = 0, radial symmetry forces E = 0. Setting d/dx [kQx/(x²+R²)^(3/2)] = 0 gives R² − 2x² = 0 ⇒ x = ±R/√2, directly visible on the 1.C E(x) profile peak.',
  },
  {
    id: 'claim-arc-full-circle',
    ekRef: '8.4.A.2',
    skill: '3.C',
    prompt:
      'A uniform charge density λ is bent into a circular arc of radius R. What happens to the electric field at the center when the arc angle increases from 180° (semicircle) to 360° (complete ring)?',
    options: [
      { id: 'a', text: 'It doubles because twice as much total charge is present.' },
      { id: 'b', text: 'It drops to zero because every element dq now has a diametrically opposite canceling twin.' },
      { id: 'c', text: 'It stays constant at 2kλ/R because R did not change.' },
    ],
    correctOptionId: 'b',
    justification:
      'From E = (2kλ/R) sin(α/2), increasing α from π to 2π changes sin(α/2) from 1 to sin(π) = 0. By EK 8.4.A.2 symmetry, opposite elements on the closed ring cancel completely.',
  },
  {
    id: 'claim-collinear-vs-point',
    ekRef: '8.4.A.1 / 2.C',
    skill: '3.C',
    prompt:
      'A rod of length L and positive charge Q lies on the x-axis from −L to 0. Compare |E| at collinear point x = a with a point charge Q placed at the rod’s midpoint (−L/2).',
    options: [
      { id: 'a', text: 'The rod produces a LARGER field because a(a + L) < (a + L/2)².' },
      { id: 'b', text: 'The rod produces a SMALLER field because charge is spread out.' },
      { id: 'c', text: 'Both produce the exact same electric field at every distance a > 0.' },
    ],
    correctOptionId: 'a',
    justification:
      'Because 1/r² grows faster for closer segments than it shrinks for farther segments, (a + L/2)² − a(a + L) = L²/4 > 0 ⇒ kQ/[a(a+L)] > kQ/(a+L/2)².',
  },
  {
    id: 'claim-wire-scaling',
    ekRef: '8.4.A.1 / 8.4.A.2',
    skill: '2.A',
    prompt:
      'At distance r from an infinitely long uniform wire of linear charge density λ, the field is E₀. What is the field at distance 2r?',
    options: [
      { id: 'a', text: 'E₀ / 4 (inverse-square decay).' },
      { id: 'b', text: 'E₀ / 2 (inverse-first-power 1/r decay).' },
      { id: 'c', text: 'E₀ / √2.' },
    ],
    correctOptionId: 'b',
    justification:
      'Integrating dq = λ dy from −∞ to +∞ gives E = λ/(2πε₀r) = 2kλ/r. Because E ∝ 1/r, doubling radial distance r halves the field to E₀/2.',
  },
];
