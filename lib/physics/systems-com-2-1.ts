/**
 * AP Physics C: Mechanics — Topic 2.1: Systems and Center of Mass
 * Pure TypeScript physics, calculus integration, and AP Skills (1.A, 2.B, 2.C, 3.B) engine.
 *
 * Covers Learning Objectives & Essential Knowledge from Topic 2.1 CED:
 * - LO 2.1.A (2.1.A.1 – 2.1.A.6): System boundaries, constituent interactions, internal vs. external
 *   effects, macroscopic single-object model, energy/mass transfer across boundaries, substructure change.
 * - LO 2.1.B (2.1.B.1 – 2.1.B.4): Symmetry lines, discrete COM sum(m_i x_i)/sum(m_i),
 *   continuous COM integral(r dm)/integral(dm), linear mass density lambda = dm/dl,
 *   M_total = integral(rho dV), and modeling a system as a singular object at its COM.
 */

export type Systems21Mode =
  | 'discrete_com'
  | 'continuous_rod'
  | 'composite_2d'
  | 'system_dynamics';

export type DiscretePreset = 'asymmetric' | 'symmetric_mirror' | 'heavy_anchor' | 'hollow_ring';
export type RodDensityProfile = 'uniform' | 'linear' | 'quadratic' | 'piecewise';
export type PlateGeometry = 'l_bracket' | 't_beam' | 'disk_hole' | 'right_triangle';
export type DynamicsScenario = 'tossed_baton' | 'spring_carts' | 'midflight_split';
export type SystemBoundaryChoice = 'whole_system' | 'part_only';

export interface DiscreteMassItem {
  id: string;
  label: string;
  massKg: number;
  xM: number;
  yM: number;
  colorHex: string;
}

export interface Systems21Params {
  mode: Systems21Mode;
  // Mode 1: Discrete point masses
  discretePreset: DiscretePreset;
  masses: DiscreteMassItem[];
  // Mode 2: Continuous 1D nonuniform rod
  rodProfile: RodDensityProfile;
  rodLengthM: number;
  baseDensityKgPerM: number;
  gradientCoeff: number; // alpha (kg/m^2) or beta (kg/m^3) or heavy-end ratio
  riemannSlices: number;
  // Mode 3: 2D Composite lamina / plate with cutout
  plateGeometry: PlateGeometry;
  plateSizeM: number;
  surfaceDensityKgPerM2: number;
  holeOffsetFrac: number; // for disk_hole (0 = concentric symmetric, >0 shifts COM away from hole)
  // Mode 4: Dynamic multi-object system
  dynamicsScenario: DynamicsScenario;
  systemBoundary: SystemBoundaryChoice;
  timeS: number;
  massRatio: number; // m2 / m1
  internalExcitation: number; // spin rate, spring amplitude, or split impulse strength
  externalForceN: number; // external pull or gravity modifier for 2.1.A.6 substructure change
}

export interface RodSliceSample {
  index: number;
  xCenterM: number;
  dxM: number;
  lambdaKgPerM: number;
  dmKg: number;
  xDmKgM: number;
}

export interface PlateComponentPart {
  id: string;
  label: string;
  areaM2: number;
  massKg: number; // negative for cutout hole superposition
  xM: number;
  yM: number;
  isCutout?: boolean;
}

export interface DynamicsInstantState {
  tS: number;
  tMaxS: number;
  comX: number;
  comY: number;
  comVx: number;
  comVy: number;
  part1: { label: string; massKg: number; x: number; y: number; vx: number; vy: number };
  part2: { label: string; massKg: number; x: number; y: number; vx: number; vy: number };
  internalSeparationM: number;
  springStretchM: number;
  boundaryTransferNote: string;
  comTrail: { x: number; y: number }[];
  part1Trail: { x: number; y: number }[];
  part2Trail: { x: number; y: number }[];
}

export interface SolveStep {
  step: number;
  title: string;
  ekRef: string;
  formula: string;
  substitution: string;
}

export interface CompareMetricRow {
  label: string;
  scenarioA: string;
  scenarioB: string;
  deltaNote: string;
}

export interface SvgChartLayout {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  primaryPath: string;
  secondaryPath: string;
  markerX: number;
  markerY: number;
  yMaxLabel: string;
  yMinLabel: string;
  legendPrimary: string;
  legendSecondary: string;
  markerLabel: string;
}

export interface Systems21ClaimQuestion {
  id: string;
  skill: string;
  ekRef: string;
  prompt: string;
  options: { id: 'a' | 'b' | 'c'; text: string }[];
  correctId: 'a' | 'b' | 'c';
  explanation: string;
}

export interface Systems21Record {
  id: string;
  mode: Systems21Mode;
  label: string;
  totalMassKg: number;
  xComM: number;
  yComM: number;
  note: string;
}

export interface Systems21Evaluation {
  totalMassKg: number;
  xComM: number;
  yComM: number;
  isOnSymmetryAxis: boolean;
  symmetryAxisLabel: string;
  comInsideMaterial: boolean;
  // Mode 2 specifics
  rodSlices: RodSliceSample[];
  riemannMassKg: number;
  riemannXComM: number;
  riemannPercentError: number;
  lambdaAtMidKgPerM: number;
  lambdaDerivativeCheckKgPerM: number; // numerical dm/dx at x = L/2 proving 2.1.B.3.i
  uniformBaselineXComM: number;
  // Mode 3 specifics
  plateParts: PlateComponentPart[];
  // Mode 4 specifics
  dynamics: DynamicsInstantState | null;
  // Pedagogical outputs
  headlineSummary: string;
  hudTopTitle: string;
  hudTopValue: string;
  ekTakeaway: string;
  solveSteps: SolveStep[];
  compareRows: CompareMetricRow[];
  compareHeadline: string;
  chartLayout: SvgChartLayout;
}

export const GRAVITY_G = 9.8;

export function getDiscretePresetMasses(preset: DiscretePreset): DiscreteMassItem[] {
  if (preset === 'symmetric_mirror') {
    return [
      { id: 'm1', label: 'm₁', massKg: 3.0, xM: -2.0, yM: 1.0, colorHex: '#34d399' },
      { id: 'm2', label: 'm₂', massKg: 3.0, xM: 2.0, yM: 1.0, colorHex: '#38bdf8' },
      { id: 'm3', label: 'm₃', massKg: 2.0, xM: 0.0, yM: -1.4, colorHex: '#fb7185' },
    ];
  }
  if (preset === 'heavy_anchor') {
    return [
      { id: 'm1', label: 'm₁', massKg: 8.0, xM: -1.8, yM: -0.6, colorHex: '#34d399' },
      { id: 'm2', label: 'm₂', massKg: 1.5, xM: 2.2, yM: 1.2, colorHex: '#38bdf8' },
      { id: 'm3', label: 'm₃', massKg: 1.5, xM: 1.6, yM: -1.4, colorHex: '#fb7185' },
    ];
  }
  if (preset === 'hollow_ring') {
    return [
      { id: 'm1', label: 'm₁', massKg: 3.0, xM: 0.0, yM: 1.8, colorHex: '#34d399' },
      { id: 'm2', label: 'm₂', massKg: 3.0, xM: -1.56, yM: -0.9, colorHex: '#38bdf8' },
      { id: 'm3', label: 'm₃', massKg: 3.0, xM: 1.56, yM: -0.9, colorHex: '#fb7185' },
    ];
  }
  // Default: asymmetric 3-body system
  return [
    { id: 'm1', label: 'm₁', massKg: 4.0, xM: -1.6, yM: -0.8, colorHex: '#34d399' },
    { id: 'm2', label: 'm₂', massKg: 2.0, xM: 1.8, yM: 1.2, colorHex: '#38bdf8' },
    { id: 'm3', label: 'm₃', massKg: 3.0, xM: 1.2, yM: -1.1, colorHex: '#fb7185' },
  ];
}

export function createDefaultSystems21Params(
  mode: Systems21Mode = 'discrete_com'
): Systems21Params {
  return {
    mode,
    discretePreset: 'asymmetric',
    masses: getDiscretePresetMasses('asymmetric'),
    rodProfile: 'linear',
    rodLengthM: 4.0,
    baseDensityKgPerM: 1.0,
    gradientCoeff: 1.5,
    riemannSlices: 12,
    plateGeometry: 'disk_hole',
    plateSizeM: 2.4,
    surfaceDensityKgPerM2: 2.0,
    holeOffsetFrac: 0.5,
    dynamicsScenario: 'tossed_baton',
    systemBoundary: 'whole_system',
    timeS: 0.65,
    massRatio: 2.0,
    internalExcitation: 1.0,
    externalForceN: 4.0,
  };
}

/** Linear mass density lambda(x) along a rod x in [0, L] (EK 2.1.B.3.i) */
export function evaluateRodLambda(
  xM: number,
  L: number,
  profile: RodDensityProfile,
  baseLambda: number,
  coeff: number
): number {
  const x = Math.max(0, Math.min(L, xM));
  if (profile === 'uniform') {
    return Math.max(0.1, baseLambda);
  }
  if (profile === 'linear') {
    return Math.max(0.05, baseLambda + coeff * x);
  }
  if (profile === 'quadratic') {
    return Math.max(0.0, coeff * x * x);
  }
  // piecewise: left half has baseLambda, right half has baseLambda * (1 + coeff)
  return x < L * 0.5
    ? Math.max(0.1, baseLambda)
    : Math.max(0.1, baseLambda * (1 + coeff));
}

/** Cumulative mass m(x) = integral_0^x lambda(u) du (EK 2.1.B.3.i-ii) */
export function evaluateRodCumulativeMass(
  xM: number,
  L: number,
  profile: RodDensityProfile,
  baseLambda: number,
  coeff: number
): number {
  const x = Math.max(0, Math.min(L, xM));
  if (profile === 'uniform') {
    return Math.max(0.1, baseLambda) * x;
  }
  if (profile === 'linear') {
    return baseLambda * x + 0.5 * coeff * x * x;
  }
  if (profile === 'quadratic') {
    return (coeff * x * x * x) / 3;
  }
  const half = L * 0.5;
  const lam1 = Math.max(0.1, baseLambda);
  const lam2 = Math.max(0.1, baseLambda * (1 + coeff));
  if (x <= half) return lam1 * x;
  return lam1 * half + lam2 * (x - half);
}

/** Exact closed-form integral M and x_cm for nonuniform rod on [0, L] */
export function evaluateRodExactIntegrals(
  L: number,
  profile: RodDensityProfile,
  baseLambda: number,
  coeff: number
): { totalMassKg: number; firstMomentKgM: number; xComM: number } {
  if (profile === 'uniform') {
    const lam = Math.max(0.1, baseLambda);
    const M = lam * L;
    const M1 = 0.5 * lam * L * L;
    return { totalMassKg: M, firstMomentKgM: M1, xComM: 0.5 * L };
  }
  if (profile === 'linear') {
    const M = baseLambda * L + 0.5 * coeff * L * L;
    const M1 = 0.5 * baseLambda * L * L + (coeff * L * L * L) / 3;
    return { totalMassKg: M, firstMomentKgM: M1, xComM: M > 1e-9 ? M1 / M : 0.5 * L };
  }
  if (profile === 'quadratic') {
    const c = Math.max(0.1, coeff);
    const M = (c * L * L * L) / 3;
    const M1 = (c * L * L * L * L) / 4;
    return { totalMassKg: M, firstMomentKgM: M1, xComM: 0.75 * L };
  }
  // piecewise: [0, L/2] density lam1, [L/2, L] density lam2
  const half = L * 0.5;
  const lam1 = Math.max(0.1, baseLambda);
  const lam2 = Math.max(0.1, baseLambda * (1 + coeff));
  const m1 = lam1 * half;
  const m2 = lam2 * half;
  const M = m1 + m2;
  const M1 = m1 * (0.25 * L) + m2 * (0.75 * L);
  return { totalMassKg: M, firstMomentKgM: M1, xComM: M1 / M };
}

/** Evaluate 2D composite plate / cutout parts (EK 2.1.B.1 & 2.1.B.3.ii) */
export function evaluatePlateParts(
  geometry: PlateGeometry,
  sizeM: number,
  sigma: number,
  holeOffsetFrac: number
): {
  parts: PlateComponentPart[];
  totalMassKg: number;
  xComM: number;
  yComM: number;
  isOnSymmetryAxis: boolean;
  symmetryAxisLabel: string;
  comInsideMaterial: boolean;
} {
  if (geometry === 'disk_hole') {
    const R = sizeM * 0.5;
    const rHole = R * 0.45;
    const holeCenterX = holeOffsetFrac * (R - rHole - 0.05);
    const areaFull = Math.PI * R * R;
    const areaHole = Math.PI * rHole * rHole;
    const mFull = sigma * areaFull;
    const mHole = -sigma * areaHole;
    const parts: PlateComponentPart[] = [
      { id: 'full', label: 'Solid Disk (+M)', areaM2: areaFull, massKg: mFull, xM: 0, yM: 0 },
      {
        id: 'hole',
        label: 'Circular Cutout (−m)',
        areaM2: -areaHole,
        massKg: mHole,
        xM: holeCenterX,
        yM: 0,
        isCutout: true,
      },
    ];
    const totalMass = mFull + mHole;
    const xCom = (mFull * 0 + mHole * holeCenterX) / totalMass;
    const yCom = 0;
    const distToHole = Math.hypot(xCom - holeCenterX, yCom);
    const inside = distToHole >= rHole;
    return {
      parts,
      totalMassKg: totalMass,
      xComM: xCom,
      yComM: yCom,
      isOnSymmetryAxis: true,
      symmetryAxisLabel:
        Math.abs(holeCenterX) < 1e-3
          ? 'Concentric Symmetry: COM at Origin (0, 0)'
          : 'Horizontal Symmetry Axis (y = 0)',
      comInsideMaterial: inside,
    };
  }

  if (geometry === 'l_bracket') {
    // Symmetric L-bracket made of vertical leg + horizontal leg of thickness t = 0.35*S
    const S = sizeM;
    const t = S * 0.35;
    const a1 = t * S; // vertical leg: x in [-S/2, -S/2 + t], y in [-S/2, S/2]
    const x1 = -S * 0.5 + t * 0.5;
    const y1 = 0;
    const w2 = S - t; // horizontal remainder: x in [-S/2 + t, S/2], y in [-S/2, -S/2 + t]
    const a2 = w2 * t;
    const x2 = -S * 0.5 + t + w2 * 0.5;
    const y2 = -S * 0.5 + t * 0.5;
    const m1 = sigma * a1;
    const m2 = sigma * a2;
    const totalMass = m1 + m2;
    const xCom = (m1 * x1 + m2 * x2) / totalMass;
    const yCom = (m1 * y1 + m2 * y2) / totalMass;
    const inLeg1 = xCom <= -S * 0.5 + t;
    const inLeg2 = yCom <= -S * 0.5 + t;
    return {
      parts: [
        { id: 'vert', label: 'Vertical Leg', areaM2: a1, massKg: m1, xM: x1, yM: y1 },
        { id: 'horiz', label: 'Horizontal Foot', areaM2: a2, massKg: m2, xM: x2, yM: y2 },
      ],
      totalMassKg: totalMass,
      xComM: xCom,
      yComM: yCom,
      isOnSymmetryAxis: true,
      symmetryAxisLabel: 'Diagonal Symmetry Line (y = x)',
      comInsideMaterial: inLeg1 || inLeg2,
    };
  }

  if (geometry === 't_beam') {
    const S = sizeM;
    const topW = S;
    const topH = S * 0.28;
    const stemW = S * 0.28;
    const stemH = S * 0.72;
    const aTop = topW * topH;
    const yTop = S * 0.5 - topH * 0.5;
    const aStem = stemW * stemH;
    const yStem = -S * 0.5 + stemH * 0.5;
    const mTop = sigma * aTop;
    const mStem = sigma * aStem;
    const totalMass = mTop + mStem;
    const yCom = (mTop * yTop + mStem * yStem) / totalMass;
    return {
      parts: [
        { id: 'flange', label: 'Top Flange', areaM2: aTop, massKg: mTop, xM: 0, yM: yTop },
        { id: 'stem', label: 'Vertical Stem', areaM2: aStem, massKg: mStem, xM: 0, yM: yStem },
      ],
      totalMassKg: totalMass,
      xComM: 0,
      yComM: yCom,
      isOnSymmetryAxis: true,
      symmetryAxisLabel: 'Vertical Symmetry Axis (x = 0)',
      comInsideMaterial: true,
    };
  }

  // right_triangle: vertices (-S/2, -S/2), (S/2, -S/2), (-S/2, S/2) -> centroid at (-S/6, -S/6)
  const S = sizeM;
  const area = 0.5 * S * S;
  const mass = sigma * area;
  const xCom = -S / 6;
  const yCom = -S / 6;
  return {
    parts: [
      {
        id: 'tri',
        label: 'Uniform Right Triangle',
        areaM2: area,
        massKg: mass,
        xM: xCom,
        yM: yCom,
      },
    ],
    totalMassKg: mass,
    xComM: xCom,
    yComM: yCom,
    isOnSymmetryAxis: true,
    symmetryAxisLabel: 'Isosceles Bisector (y = x) · ⅓ from Legs',
    comInsideMaterial: true,
  };
}

/** Evaluate animated multi-object system at time t (LO 2.1.A & EK 2.1.B.4) */
export function evaluateSystemDynamicsAt(
  scenario: DynamicsScenario,
  tInput: number,
  massRatio: number,
  internalExcitation: number,
  externalForceN: number,
  boundary: SystemBoundaryChoice
): DynamicsInstantState {
  const m1 = 2.0;
  const m2 = Math.max(0.5, m1 * massRatio);
  const M = m1 + m2;

  if (scenario === 'tossed_baton') {
    const tMax = 1.45;
    const t = Math.max(0, Math.min(tMax, tInput));
    const x0 = -2.4;
    const y0 = -0.7;
    const vx0 = 3.3;
    const vy0 = 7.1;
    const rodLen = 1.35;
    const omega = 3.2 + internalExcitation * 3.4;
    // Distances from COM: m1 r1 = m2 r2, r1 + r2 = rodLen
    const r1 = (m2 / M) * rodLen;
    const r2 = (m1 / M) * rodLen;

    const sampleAt = (ts: number) => {
      const cx = x0 + vx0 * ts;
      const cy = y0 + vy0 * ts - 0.5 * GRAVITY_G * ts * ts;
      const cvx = vx0;
      const cvy = vy0 - GRAVITY_G * ts;
      const theta = 0.35 + omega * ts;
      const p1x = cx - r1 * Math.cos(theta);
      const p1y = cy - r1 * Math.sin(theta);
      const p2x = cx + r2 * Math.cos(theta);
      const p2y = cy + r2 * Math.sin(theta);
      const p1vx = cvx + r1 * omega * Math.sin(theta);
      const p1vy = cvy - r1 * omega * Math.cos(theta);
      const p2vx = cvx - r2 * omega * Math.sin(theta);
      const p2vy = cvy + r2 * omega * Math.cos(theta);
      return { cx, cy, cvx, cvy, p1x, p1y, p2x, p2y, p1vx, p1vy, p2vx, p2vy };
    };

    const now = sampleAt(t);
    const comTrail: { x: number; y: number }[] = [];
    const part1Trail: { x: number; y: number }[] = [];
    const part2Trail: { x: number; y: number }[] = [];
    const steps = 42;
    for (let i = 0; i <= steps; i++) {
      const s = sampleAt((i / steps) * tMax);
      comTrail.push({ x: s.cx, y: s.cy });
      part1Trail.push({ x: s.p1x, y: s.p1y });
      part2Trail.push({ x: s.p2x, y: s.p2y });
    }

    return {
      tS: t,
      tMaxS: tMax,
      comX: now.cx,
      comY: now.cy,
      comVx: now.cvx,
      comVy: now.cvy,
      part1: { label: 'm₁', massKg: m1, x: now.p1x, y: now.p1y, vx: now.p1vx, vy: now.p1vy },
      part2: { label: 'm₂', massKg: m2, x: now.p2x, y: now.p2y, vx: now.p2vx, vy: now.p2vy },
      internalSeparationM: rodLen,
      springStretchM: 0,
      boundaryTransferNote:
        boundary === 'whole_system'
          ? 'Whole Baton System: Rod tension is internal and cancels — COM follows exact parabola under gravity (2.1.A.2, 2.1.B.4).'
          : 'Single Mass m₁ Only: Rod tension crosses the system boundary, adding rotational loops & energy transfer (2.1.A.3–4).',
      comTrail,
      part1Trail,
      part2Trail,
    };
  }

  if (scenario === 'midflight_split') {
    const tMax = 1.45;
    const tSplit = 0.65;
    const t = Math.max(0, Math.min(tMax, tInput));
    const x0 = -2.4;
    const y0 = -0.7;
    const vx0 = 3.3;
    const vy0 = 7.1;
    // Internal explosion impulse along horizontal & slight vertical axis: m1 dv1 + m2 dv2 = 0
    const relSpeed = 1.4 + internalExcitation * 1.4;
    const dv1x = -(m2 / M) * relSpeed;
    const dv2x = (m1 / M) * relSpeed;
    const dv1y = (m2 / M) * (relSpeed * 0.45);
    const dv2y = -(m1 / M) * (relSpeed * 0.45);

    const sampleAt = (ts: number) => {
      const cx = x0 + vx0 * ts;
      const cy = y0 + vy0 * ts - 0.5 * GRAVITY_G * ts * ts;
      const cvx = vx0;
      const cvy = vy0 - GRAVITY_G * ts;
      const dtPost = Math.max(0, ts - tSplit);
      const p1x = cx + dv1x * dtPost;
      const p1y = cy + dv1y * dtPost;
      const p2x = cx + dv2x * dtPost;
      const p2y = cy + dv2y * dtPost;
      const p1vx = cvx + (dtPost > 0 ? dv1x : 0);
      const p1vy = cvy + (dtPost > 0 ? dv1y : 0);
      const p2vx = cvx + (dtPost > 0 ? dv2x : 0);
      const p2vy = cvy + (dtPost > 0 ? dv2y : 0);
      return { cx, cy, cvx, cvy, p1x, p1y, p2x, p2y, p1vx, p1vy, p2vx, p2vy };
    };

    const now = sampleAt(t);
    const comTrail: { x: number; y: number }[] = [];
    const part1Trail: { x: number; y: number }[] = [];
    const part2Trail: { x: number; y: number }[] = [];
    const steps = 42;
    for (let i = 0; i <= steps; i++) {
      const s = sampleAt((i / steps) * tMax);
      comTrail.push({ x: s.cx, y: s.cy });
      part1Trail.push({ x: s.p1x, y: s.p1y });
      part2Trail.push({ x: s.p2x, y: s.p2y });
    }

    return {
      tS: t,
      tMaxS: tMax,
      comX: now.cx,
      comY: now.cy,
      comVx: now.cvx,
      comVy: now.cvy,
      part1: { label: 'Fragment 1', massKg: m1, x: now.p1x, y: now.p1y, vx: now.p1vx, vy: now.p1vy },
      part2: { label: 'Fragment 2', massKg: m2, x: now.p2x, y: now.p2y, vx: now.p2vx, vy: now.p2vy },
      internalSeparationM: Math.hypot(now.p2x - now.p1x, now.p2y - now.p1y),
      springStretchM: 0,
      boundaryTransferNote:
        boundary === 'whole_system'
          ? 'Both Fragments System: Internal split impulse (t = 0.65 s) cannot alter the COM trajectory — COM continues smoothly (2.1.A.4, 2.1.B.4).'
          : 'Fragment 1 Only: The separation blast acts as an external force transferring kinetic energy & momentum across the boundary (2.1.A.3).',
      comTrail,
      part1Trail,
      part2Trail,
    };
  }

  // spring_carts: Horizontal frictionless track — 2 carts connected by an internal spring pulled by externalForceN on cart 2
  const tMax = 2.0;
  const t = Math.max(0, Math.min(tMax, tInput));
  const restLen = 1.45;
  const kSpring = 12.0;
  const mu = (m1 * m2) / M; // reduced mass
  const omega = Math.sqrt(kSpring / mu);
  const aCom = externalForceN / M;
  // Equilibrium stretch under steady external force F on m2: F_spring_eq = m1 * aCom = (m1 / M) * F
  const eqStretch = (m1 * aCom) / kSpring;
  // Substructure oscillation amplitude increases with internalExcitation and externalForceN (EK 2.1.A.6)
  const oscAmp = Math.min(0.45, 0.14 * internalExcitation + Math.abs(eqStretch));

  const sampleAt = (ts: number) => {
    const cx = -1.8 + 0.5 * aCom * ts * ts;
    const cvx = aCom * ts;
    const stretch = eqStretch + oscAmp * (1 - Math.cos(omega * ts)) * 0.5;
    const sep = Math.max(0.55, restLen + stretch);
    const sepDot = 0.5 * oscAmp * omega * Math.sin(omega * ts);
    const p1x = cx - (m2 / M) * sep;
    const p2x = cx + (m1 / M) * sep;
    const p1vx = cvx - (m2 / M) * sepDot;
    const p2vx = cvx + (m1 / M) * sepDot;
    return { cx, cy: 0, cvx, cvy: 0, p1x, p1y: 0, p2x, p2y: 0, p1vx, p1vy: 0, p2vx, p2vy: 0, sep, stretch };
  };

  const now = sampleAt(t);
  const comTrail: { x: number; y: number }[] = [];
  const part1Trail: { x: number; y: number }[] = [];
  const part2Trail: { x: number; y: number }[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const s = sampleAt((i / steps) * tMax);
    comTrail.push({ x: s.cx, y: s.cy });
    part1Trail.push({ x: s.p1x, y: s.p1y });
    part2Trail.push({ x: s.p2x, y: s.p2y });
  }

  return {
    tS: t,
    tMaxS: tMax,
    comX: now.cx,
    comY: 0,
    comVx: now.cvx,
    comVy: 0,
    part1: { label: 'Cart 1', massKg: m1, x: now.p1x, y: 0, vx: now.p1vx, vy: 0 },
    part2: { label: 'Cart 2', massKg: m2, x: now.p2x, y: 0, vx: now.p2vx, vy: 0 },
    internalSeparationM: now.sep,
    springStretchM: now.stretch,
    boundaryTransferNote:
      boundary === 'whole_system'
        ? `Whole System (Carts + Spring): Internal spring forces cancel; a_cm = F_ext / M = ${aCom.toFixed(2)} m/s² while external force stretches substructure ΔL = ${now.stretch.toFixed(2)} m (2.1.A.5–6).`
        : `Cart 1 Only: Spring tension is external to Cart 1, accelerating it independently with oscillating velocity (2.1.A.3–4).`,
    comTrail,
    part1Trail,
    part2Trail,
  };
}

function buildPolylinePath(
  xs: number[],
  ys: number[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  w: number,
  h: number
): string {
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);
  return xs
    .map((x, idx) => {
      const px = padL + ((x - xMin) / xSpan) * plotW;
      const py = padT + (1 - (ys[idx] - yMin) / ySpan) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
}

export function evaluateSystems21(params: Systems21Params): Systems21Evaluation {
  const chartW = 304;
  const chartH = 122;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 22;

  // =========================================================================
  // MODE 1: DISCRETE POINT MASSES & SYMMETRY
  // =========================================================================
  if (params.mode === 'discrete_com') {
    const ms = params.masses;
    const totalMass = ms.reduce((acc, m) => acc + m.massKg, 0);
    const sumMx = ms.reduce((acc, m) => acc + m.massKg * m.xM, 0);
    const sumMy = ms.reduce((acc, m) => acc + m.massKg * m.yM, 0);
    const xCom = totalMass > 1e-9 ? sumMx / totalMass : 0;
    const yCom = totalMass > 1e-9 ? sumMy / totalMass : 0;

    // Check vertical symmetry x=0 or horizontal symmetry y=0
    const onYAxis = Math.abs(xCom) < 0.04;
    const onXAxis = Math.abs(yCom) < 0.04;
    const isSym = onYAxis || onXAxis;
    const symLabel =
      onYAxis && onXAxis
        ? 'Dual Symmetry: COM at Origin (0, 0)'
        : onYAxis
        ? 'Vertical Symmetry Line (x_cm = 0)'
        : onXAxis
        ? 'Horizontal Symmetry Line (y_cm = 0)'
        : 'Asymmetric Distribution (shifted toward heavier mass)';

    // Check if COM is close to any point mass or lies in empty space
    const minDist = Math.min(...ms.map(m => Math.hypot(m.xM - xCom, m.yM - yCom)));
    const comInsideMaterial = minDist < 0.35;

    // Compare against equal-mass geometric centroid
    const geomX = ms.reduce((a, m) => a + m.xM, 0) / ms.length;
    const geomY = ms.reduce((a, m) => a + m.yM, 0) / ms.length;
    const shiftMag = Math.hypot(xCom - geomX, yCom - geomY);

    // 1.A Chart: Cumulative mass-weighted balance curve along X
    const xs: number[] = [];
    const momentYs: number[] = [];
    const equalYs: number[] = [];
    for (let i = 0; i <= 24; i++) {
      const xProbe = -2.5 + (i / 24) * 5.0;
      xs.push(xProbe);
      // Net torque/moment sum m_i (x_i - xProbe) vanishes identically at xProbe = xCom
      momentYs.push(ms.reduce((acc, m) => acc + m.massKg * (m.xM - xProbe), 0));
      equalYs.push(ms.reduce((acc, m) => acc + (totalMass / ms.length) * (m.xM - xProbe), 0));
    }
    const yAbsMax = Math.max(
      1,
      ...momentYs.map(Math.abs),
      ...equalYs.map(Math.abs)
    );
    const primaryPath = buildPolylinePath(
      xs,
      momentYs,
      -2.5,
      2.5,
      -yAbsMax,
      yAbsMax,
      padL,
      padR,
      padT,
      padB,
      chartW,
      chartH
    );
    const secondaryPath = buildPolylinePath(
      xs,
      equalYs,
      -2.5,
      2.5,
      -yAbsMax,
      yAbsMax,
      padL,
      padR,
      padT,
      padB,
      chartW,
      chartH
    );
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const clampedX = Math.max(-2.5, Math.min(2.5, xCom));
    const markerX = padL + ((clampedX + 2.5) / 5.0) * plotW;
    const markerY = padT + 0.5 * plotH; // zero-moment crossing!

    return {
      totalMassKg: totalMass,
      xComM: xCom,
      yComM: yCom,
      isOnSymmetryAxis: isSym,
      symmetryAxisLabel: symLabel,
      comInsideMaterial,
      rodSlices: [],
      riemannMassKg: totalMass,
      riemannXComM: xCom,
      riemannPercentError: 0,
      lambdaAtMidKgPerM: 0,
      lambdaDerivativeCheckKgPerM: 0,
      uniformBaselineXComM: geomX,
      plateParts: [],
      dynamics: null,
      headlineSummary: `Discrete System (M = ${totalMass.toFixed(1)} kg): COM at (${xCom.toFixed(2)} m, ${yCom.toFixed(2)} m) — ${comInsideMaterial ? 'near mass node' : 'lies in empty space between masses'}`,
      hudTopTitle: `DISCRETE SYSTEM · x_cm = Σm_i x_i / Σm_i  (M = ${totalMass.toFixed(1)} kg)`,
      hudTopValue: `r_cm = (${xCom >= 0 ? '+' : ''}${xCom.toFixed(2)}, ${yCom >= 0 ? '+' : ''}${yCom.toFixed(2)}) m`,
      ekTakeaway:
        'EK 2.1.B.1 & 2.1.B.2: Center of mass is the mass-weighted average position r_cm = Σm_i r_i / Σm_i. Symmetric distributions always place COM on their symmetry line, and COM need not lie inside solid matter.',
      solveSteps: [
        {
          step: 1,
          title: 'Sum Total System Mass M',
          ekRef: '2.1.B.2',
          formula: 'M = Σ m_i = m₁ + m₂ + m₃',
          substitution: `M = ${ms.map(m => m.massKg.toFixed(1)).join(' + ')} = ${totalMass.toFixed(2)} kg`,
        },
        {
          step: 2,
          title: 'Compute X-Axis Mass Moment Σ m_i x_i',
          ekRef: '2.1.B.2',
          formula: 'x_cm = (m₁x₁ + m₂x₂ + m₃x₃) / M',
          substitution: `Σ m_i x_i = ${sumMx.toFixed(2)} kg·m ⇒ x_cm = ${xCom.toFixed(3)} m`,
        },
        {
          step: 3,
          title: 'Compute Y-Axis Mass Moment Σ m_i y_i',
          ekRef: '2.1.B.2',
          formula: 'y_cm = (m₁y₁ + m₂y₂ + m₃y₃) / M',
          substitution: `Σ m_i y_i = ${sumMy.toFixed(2)} kg·m ⇒ y_cm = ${yCom.toFixed(3)} m`,
        },
        {
          step: 4,
          title: 'Check Symmetry & Point-Mass Abstraction',
          ekRef: '2.1.B.1 / 2.1.B.4',
          formula: 'r_cm = (x_cm, y_cm) represents total mass M',
          substitution: `${symLabel}`,
        },
      ],
      compareHeadline: 'Mass-Weighted COM vs. Equal-Mass Geometric Centroid (2.C)',
      compareRows: [
        {
          label: 'X-Coordinate',
          scenarioA: `${xCom.toFixed(2)} m (Actual)`,
          scenarioB: `${geomX.toFixed(2)} m (Equal m)`,
          deltaNote: `Δx = ${(xCom - geomX >= 0 ? '+' : '')}${(xCom - geomX).toFixed(2)} m`,
        },
        {
          label: 'Y-Coordinate',
          scenarioA: `${yCom.toFixed(2)} m (Actual)`,
          scenarioB: `${geomY.toFixed(2)} m (Equal m)`,
          deltaNote: `Δy = ${(yCom - geomY >= 0 ? '+' : '')}${(yCom - geomY).toFixed(2)} m`,
        },
        {
          label: 'Shift Magnitude',
          scenarioA: `${shiftMag.toFixed(2)} m`,
          scenarioB: '0.00 m',
          deltaNote: shiftMag < 0.03 ? 'Symmetry match' : 'Pulled toward heavier mass',
        },
      ],
      chartLayout: {
        width: chartW,
        height: chartH,
        xLabel: 'Pivot Probe Position x (m)',
        yLabel: 'Net Moment Σm(x_i−x)',
        primaryPath,
        secondaryPath,
        markerX,
        markerY,
        yMaxLabel: `+${yAbsMax.toFixed(0)}`,
        yMinLabel: `−${yAbsMax.toFixed(0)}`,
        legendPrimary: 'Actual Σm_i(x_i−x)',
        legendSecondary: 'Equal-Mass Baseline',
        markerLabel: 'Zero-Moment Balance x_cm',
      },
    };
  }

  // =========================================================================
  // MODE 2: CONTINUOUS NONUNIFORM ROD (INTEGRAL ∫ r dm / ∫ dm)
  // =========================================================================
  if (params.mode === 'continuous_rod') {
    const L = Math.max(1.0, params.rodLengthM);
    const N = Math.max(4, Math.min(48, Math.round(params.riemannSlices)));
    const exact = evaluateRodExactIntegrals(
      L,
      params.rodProfile,
      params.baseDensityKgPerM,
      params.gradientCoeff
    );

    const dx = L / N;
    const slices: RodSliceSample[] = [];
    let rMass = 0;
    let rMoment = 0;
    for (let i = 0; i < N; i++) {
      const xc = (i + 0.5) * dx;
      const lam = evaluateRodLambda(xc, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff);
      const dm = lam * dx;
      const xdm = xc * dm;
      rMass += dm;
      rMoment += xdm;
      slices.push({
        index: i,
        xCenterM: xc,
        dxM: dx,
        lambdaKgPerM: lam,
        dmKg: dm,
        xDmKgM: xdm,
      });
    }
    const rXCom = rMass > 1e-9 ? rMoment / rMass : 0.5 * L;
    const pctErr =
      exact.xComM > 1e-9 ? (Math.abs(rXCom - exact.xComM) / exact.xComM) * 100 : 0;

    // Verify lambda(x) = dm/dx numerically at x = 0.6*L (avoids piecewise jump at 0.5*L)
    const xProbe = 0.6 * L;
    const eps = 1e-4;
    const lambdaMid = evaluateRodLambda(xProbe, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff);
    const dmDxCheck =
      (evaluateRodCumulativeMass(xProbe + eps, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff) -
        evaluateRodCumulativeMass(xProbe - eps, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff)) /
      (2 * eps);

    const isSym = Math.abs(exact.xComM - 0.5 * L) < 0.015;

    // 1.A Chart: Linear density lambda(x) and normalized cumulative mass m(x)/M
    const xs: number[] = [];
    const lamYs: number[] = [];
    const cumYs: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * L;
      xs.push(x);
      lamYs.push(evaluateRodLambda(x, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff));
      cumYs.push(evaluateRodCumulativeMass(x, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff));
    }
    const yMax = Math.max(0.5, ...lamYs) * 1.12;
    const scaledCum = cumYs.map(c => (exact.totalMassKg > 1e-9 ? (c / exact.totalMassKg) * yMax * 0.92 : 0));
    const primaryPath = buildPolylinePath(xs, lamYs, 0, L, 0, yMax, padL, padR, padT, padB, chartW, chartH);
    const secondaryPath = buildPolylinePath(xs, scaledCum, 0, L, 0, yMax, padL, padR, padT, padB, chartW, chartH);
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const markerX = padL + (exact.xComM / L) * plotW;
    const lamAtCom = evaluateRodLambda(exact.xComM, L, params.rodProfile, params.baseDensityKgPerM, params.gradientCoeff);
    const markerY = padT + (1 - lamAtCom / yMax) * plotH;

    const lambdaFormula =
      params.rodProfile === 'uniform'
        ? `λ(x) = ${params.baseDensityKgPerM.toFixed(1)} kg/m`
        : params.rodProfile === 'linear'
        ? `λ(x) = ${params.baseDensityKgPerM.toFixed(1)} + ${params.gradientCoeff.toFixed(1)}x`
        : params.rodProfile === 'quadratic'
        ? `λ(x) = ${params.gradientCoeff.toFixed(1)}x²`
        : `λ(x) = ${params.baseDensityKgPerM.toFixed(1)} (left), ${(params.baseDensityKgPerM * (1 + params.gradientCoeff)).toFixed(1)} (right)`;

    const comRatioText =
      params.rodProfile === 'uniform'
        ? 'x_cm = L / 2 = 0.500 L'
        : params.rodProfile === 'quadratic'
        ? 'x_cm = (¼βL⁴) / (⅓βL³) = ¾ L = 0.750 L'
        : `x_cm = ${(exact.xComM / L).toFixed(3)} L`;

    return {
      totalMassKg: exact.totalMassKg,
      xComM: exact.xComM,
      yComM: 0,
      isOnSymmetryAxis: isSym,
      symmetryAxisLabel: isSym ? 'Uniform Symmetry: x_cm = L / 2' : 'Nonuniform Shift: x_cm > L / 2 toward denser end',
      comInsideMaterial: true,
      rodSlices: slices,
      riemannMassKg: rMass,
      riemannXComM: rXCom,
      riemannPercentError: pctErr,
      lambdaAtMidKgPerM: lambdaMid,
      lambdaDerivativeCheckKgPerM: dmDxCheck,
      uniformBaselineXComM: 0.5 * L,
      plateParts: [],
      dynamics: null,
      headlineSummary: `Nonuniform Rod (L = ${L.toFixed(1)} m): M = ∫λdx = ${exact.totalMassKg.toFixed(2)} kg, x_cm = ${exact.xComM.toFixed(2)} m (${((exact.xComM / L) * 100).toFixed(1)}% of L)`,
      hudTopTitle: `CONTINUOUS INTEGRAL · r_cm = ∫r dm / ∫dm  (${lambdaFormula})`,
      hudTopValue: `M = ${exact.totalMassKg.toFixed(2)} kg · x_cm = ${exact.xComM.toFixed(2)} m`,
      ekTakeaway:
        'EK 2.1.B.3 (i–ii): For a nonuniform rod with linear mass density λ(x) = dm/dx, total mass is M = ∫₀ᴸ λ(x)dx and center of mass is x_cm = (1/M)∫₀ᴸ xλ(x)dx. Increasing slices N makes the discrete sum converge to the integral.',
      solveSteps: [
        {
          step: 1,
          title: 'Define Differential Mass Element dm',
          ekRef: '2.1.B.3.i',
          formula: 'λ(x) = dm / dx  ⇒  dm = λ(x) dx',
          substitution: `${lambdaFormula}  (dm/dx check at 0.6L: ${dmDxCheck.toFixed(2)} kg/m)`,
        },
        {
          step: 2,
          title: 'Integrate Total Mass M = ∫₀ᴸ λ(x) dx',
          ekRef: '2.1.B.3.ii',
          formula: 'M_total = ∫₀ᴸ λ(x) dx',
          substitution: `M = ${exact.totalMassKg.toFixed(3)} kg  (${N}-slice sum: ${rMass.toFixed(3)} kg)`,
        },
        {
          step: 3,
          title: 'Integrate First Mass Moment ∫₀ᴸ x dm',
          ekRef: '2.1.B.3',
          formula: '∫₀ᴸ x dm = ∫₀ᴸ x λ(x) dx',
          substitution: `∫ x dm = ${exact.firstMomentKgM.toFixed(3)} kg·m`,
        },
        {
          step: 4,
          title: 'Evaluate Exact Center of Mass x_cm',
          ekRef: '2.1.B.3',
          formula: 'x_cm = (∫₀ᴸ x λ(x) dx) / M_total',
          substitution: `x_cm = ${exact.xComM.toFixed(3)} m  [${comRatioText}]`,
        },
      ],
      compareHeadline: 'Exact Calculus ∫ vs. Discrete N-Slice Sum & Uniform Rod (2.C)',
      compareRows: [
        {
          label: 'Exact ∫ vs Uniform',
          scenarioA: `${exact.xComM.toFixed(3)} m`,
          scenarioB: `${(0.5 * L).toFixed(3)} m (L/2)`,
          deltaNote: `Shift +${(exact.xComM - 0.5 * L).toFixed(3)} m`,
        },
        {
          label: `N=${N} Riemann Sum`,
          scenarioA: `${rXCom.toFixed(3)} m`,
          scenarioB: `${exact.xComM.toFixed(3)} m (Exact)`,
          deltaNote: `${pctErr.toFixed(2)}% err`,
        },
        {
          label: 'dm/dx at x=0.6L',
          scenarioA: `${dmDxCheck.toFixed(2)} kg/m`,
          scenarioB: `${lambdaMid.toFixed(2)} kg/m`,
          deltaNote: 'Exact λ = dm/dℓ',
        },
      ],
      chartLayout: {
        width: chartW,
        height: chartH,
        xLabel: `Rod Position x (0 → ${L.toFixed(1)} m)`,
        yLabel: 'λ(x) (kg/m)',
        primaryPath,
        secondaryPath,
        markerX,
        markerY,
        yMaxLabel: yMax.toFixed(1),
        yMinLabel: '0',
        legendPrimary: 'λ(x) Density',
        legendSecondary: 'Cumulative m(x)/M',
        markerLabel: `x_cm = ${exact.xComM.toFixed(2)}m`,
      },
    };
  }

  // =========================================================================
  // MODE 3: 2D COMPOSITE LAMINA & CUTOUT SUPERPOSITION
  // =========================================================================
  if (params.mode === 'composite_2d') {
    const plate = evaluatePlateParts(
      params.plateGeometry,
      params.plateSizeM,
      params.surfaceDensityKgPerM2,
      params.holeOffsetFrac
    );

    // 1.A Chart: Horizontal mass-per-strip distribution dM/dx across the plate
    const S = params.plateSizeM;
    const half = S * 0.5;
    const xs: number[] = [];
    const stripYs: number[] = [];
    const solidYs: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const x = -half + (i / 32) * S;
      xs.push(x);
      let heightActual = 0;
      let heightSolid = 0;
      if (params.plateGeometry === 'disk_hole') {
        const R = half;
        const rH = R * 0.45;
        const hx = params.holeOffsetFrac * (R - rH - 0.05);
        const outerH = Math.abs(x) <= R ? 2 * Math.sqrt(Math.max(0, R * R - x * x)) : 0;
        const holeH = Math.abs(x - hx) <= rH ? 2 * Math.sqrt(Math.max(0, rH * rH - (x - hx) * (x - hx))) : 0;
        heightSolid = outerH;
        heightActual = Math.max(0, outerH - holeH);
      } else if (params.plateGeometry === 'l_bracket') {
        const t = S * 0.35;
        heightSolid = S;
        heightActual = x <= -half + t ? S : t;
      } else if (params.plateGeometry === 't_beam') {
        const stemW = S * 0.28;
        const topH = S * 0.28;
        heightSolid = S;
        heightActual = Math.abs(x) <= stemW * 0.5 ? S : topH;
      } else {
        // right triangle
        heightSolid = S;
        heightActual = Math.max(0, S * (1 - (x + half) / S));
      }
      stripYs.push(heightActual * params.surfaceDensityKgPerM2);
      solidYs.push(heightSolid * params.surfaceDensityKgPerM2);
    }
    const yMax = Math.max(1, ...solidYs) * 1.1;
    const primaryPath = buildPolylinePath(xs, stripYs, -half, half, 0, yMax, padL, padR, padT, padB, chartW, chartH);
    const secondaryPath = buildPolylinePath(xs, solidYs, -half, half, 0, yMax, padL, padR, padT, padB, chartW, chartH);
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const markerX = padL + ((plate.xComM + half) / S) * plotW;
    const markerY = padT + 0.45 * plotH;

    return {
      totalMassKg: plate.totalMassKg,
      xComM: plate.xComM,
      yComM: plate.yComM,
      isOnSymmetryAxis: plate.isOnSymmetryAxis,
      symmetryAxisLabel: plate.symmetryAxisLabel,
      comInsideMaterial: plate.comInsideMaterial,
      rodSlices: [],
      riemannMassKg: plate.totalMassKg,
      riemannXComM: plate.xComM,
      riemannPercentError: 0,
      lambdaAtMidKgPerM: 0,
      lambdaDerivativeCheckKgPerM: 0,
      uniformBaselineXComM: 0,
      plateParts: plate.parts,
      dynamics: null,
      headlineSummary: `2D Plate (σ = ${params.surfaceDensityKgPerM2.toFixed(1)} kg/m², M = ${plate.totalMassKg.toFixed(2)} kg): COM = (${plate.xComM.toFixed(2)}, ${plate.yComM.toFixed(2)}) m — ${plate.comInsideMaterial ? 'inside solid lamina' : 'outside material in cutout/corner!'}`,
      hudTopTitle: `2D AREA INTEGRAL · M = ∬ σ dA  (${plate.symmetryAxisLabel})`,
      hudTopValue: `r_cm = (${plate.xComM >= 0 ? '+' : ''}${plate.xComM.toFixed(2)}, ${plate.yComM >= 0 ? '+' : ''}${plate.yComM.toFixed(2)}) m`,
      ekTakeaway:
        'EK 2.1.B.1 & 2.1.B.3.ii: Any axis of geometric & mass symmetry passes through the center of mass. Cutouts can be solved cleanly via negative-mass superposition, and hollow or L-shaped objects can have COM outside the solid material.',
      solveSteps: [
        {
          step: 1,
          title: 'Identify Lines of Symmetry First',
          ekRef: '2.1.B.1',
          formula: 'Symmetry axis ⇒ COM must lie along that line',
          substitution: plate.symmetryAxisLabel,
        },
        {
          step: 2,
          title: 'Integrate Sub-Region Masses M_k = ∬ σ dA',
          ekRef: '2.1.B.3.ii',
          formula: 'M_total = Σ σ A_k (cutout uses −A_hole)',
          substitution: `${plate.parts.map(p => `${p.label}: ${p.massKg >= 0 ? '+' : ''}${p.massKg.toFixed(2)} kg`).join(' · ')}`,
        },
        {
          step: 3,
          title: 'Apply Composite Center of Mass Formula',
          ekRef: '2.1.B.2 / 2.1.B.3',
          formula: 'r_cm = (Σ M_k r_k) / (Σ M_k)',
          substitution: `x_cm = ${plate.xComM.toFixed(3)} m, y_cm = ${plate.yComM.toFixed(3)} m`,
        },
        {
          step: 4,
          title: 'Verify Physical Location of COM',
          ekRef: '2.1.B.4',
          formula: 'Balance point for uniform gravitational field',
          substitution: plate.comInsideMaterial
            ? 'COM lies inside the solid plate material.'
            : 'COM lies outside the solid material (empty space!).',
        },
      ],
      compareHeadline: 'Composite / Cutout Plate vs. Full Solid Bounding Shape (2.C)',
      compareRows: [
        {
          label: 'Total Mass M',
          scenarioA: `${plate.totalMassKg.toFixed(2)} kg`,
          scenarioB: `${(params.surfaceDensityKgPerM2 * (params.plateGeometry === 'disk_hole' ? Math.PI * half * half : S * S)).toFixed(2)} kg (Full)`,
          deltaNote: plate.parts.length > 1 ? 'Subtracted / composite' : '50% of square',
        },
        {
          label: 'X-Center of Mass',
          scenarioA: `${plate.xComM.toFixed(3)} m`,
          scenarioB: '0.000 m (Full)',
          deltaNote: `Shift ${(plate.xComM >= 0 ? '+' : '')}${plate.xComM.toFixed(3)} m`,
        },
        {
          label: 'Material State',
          scenarioA: plate.comInsideMaterial ? 'Inside Solid' : 'In Empty Space',
          scenarioB: 'Inside Solid',
          deltaNote: plate.comInsideMaterial ? 'Directly supportable' : 'Requires rigid frame',
        },
      ],
      chartLayout: {
        width: chartW,
        height: chartH,
        xLabel: `Horizontal Slice x (−${half.toFixed(1)} → +${half.toFixed(1)} m)`,
        yLabel: 'dM/dx (kg/m)',
        primaryPath,
        secondaryPath,
        markerX,
        markerY,
        yMaxLabel: yMax.toFixed(1),
        yMinLabel: '0',
        legendPrimary: 'Actual Strip Mass dM/dx',
        legendSecondary: 'Full Solid Reference',
        markerLabel: `x_cm = ${plate.xComM.toFixed(2)}m`,
      },
    };
  }

  // =========================================================================
  // MODE 4: DYNAMIC MULTI-OBJECT SYSTEM (LO 2.1.A & EK 2.1.B.4)
  // =========================================================================
  const dyn = evaluateSystemDynamicsAt(
    params.dynamicsScenario,
    params.timeS,
    params.massRatio,
    params.internalExcitation,
    params.externalForceN,
    params.systemBoundary
  );
  const totalMass = dyn.part1.massKg + dyn.part2.massKg;

  // 1.A Chart: Trajectory y(x) for projectiles, or velocity/position vs time for spring carts
  let primaryPath = '';
  let secondaryPath = '';
  let markerX = padL;
  let markerY = padT + 40;
  let yMaxLabel = '3.0';
  let yMinLabel = '-1.0';
  let xLabel = 'Horizontal Position x (m)';
  let yLabel = 'Height y (m)';
  let legendPrimary = 'System COM Path';
  let legendSecondary = 'Constituent m₁ Path';

  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  if (params.dynamicsScenario === 'spring_carts') {
    xLabel = `Time t (0 → ${dyn.tMaxS.toFixed(1)} s)`;
    yLabel = 'Position x(t) (m)';
    legendPrimary = 'COM x_cm(t)';
    legendSecondary = 'Cart 1 x₁(t)';
    const ts = dyn.comTrail.map((_, i) => (i / (dyn.comTrail.length - 1)) * dyn.tMaxS);
    const comXs = dyn.comTrail.map(p => p.x);
    const p1Xs = dyn.part1Trail.map(p => p.x);
    const minVal = Math.min(...comXs, ...p1Xs) - 0.3;
    const maxVal = Math.max(...comXs, ...p1Xs) + 0.3;
    primaryPath = buildPolylinePath(ts, comXs, 0, dyn.tMaxS, minVal, maxVal, padL, padR, padT, padB, chartW, chartH);
    secondaryPath = buildPolylinePath(ts, p1Xs, 0, dyn.tMaxS, minVal, maxVal, padL, padR, padT, padB, chartW, chartH);
    markerX = padL + (dyn.tS / dyn.tMaxS) * plotW;
    markerY = padT + (1 - (dyn.comX - minVal) / Math.max(1e-6, maxVal - minVal)) * plotH;
    yMaxLabel = maxVal.toFixed(1);
    yMinLabel = minVal.toFixed(1);
  } else {
    const allX = [...dyn.comTrail.map(p => p.x), ...dyn.part1Trail.map(p => p.x)];
    const allY = [...dyn.comTrail.map(p => p.y), ...dyn.part1Trail.map(p => p.y)];
    const xMin = Math.min(...allX) - 0.2;
    const xMax = Math.max(...allX) + 0.2;
    const yMin = Math.min(...allY) - 0.2;
    const yMax = Math.max(...allY) + 0.2;
    primaryPath = buildPolylinePath(
      dyn.comTrail.map(p => p.x),
      dyn.comTrail.map(p => p.y),
      xMin,
      xMax,
      yMin,
      yMax,
      padL,
      padR,
      padT,
      padB,
      chartW,
      chartH
    );
    secondaryPath = buildPolylinePath(
      dyn.part1Trail.map(p => p.x),
      dyn.part1Trail.map(p => p.y),
      xMin,
      xMax,
      yMin,
      yMax,
      padL,
      padR,
      padT,
      padB,
      chartW,
      chartH
    );
    markerX = padL + ((dyn.comX - xMin) / Math.max(1e-6, xMax - xMin)) * plotW;
    markerY = padT + (1 - (dyn.comY - yMin) / Math.max(1e-6, yMax - yMin)) * plotH;
    yMaxLabel = yMax.toFixed(1);
    yMinLabel = yMin.toFixed(1);
  }

  const comSpeed = Math.hypot(dyn.comVx, dyn.comVy);
  const p1Speed = Math.hypot(dyn.part1.vx, dyn.part1.vy);
  const p2Speed = Math.hypot(dyn.part2.vx, dyn.part2.vy);

  return {
    totalMassKg: totalMass,
    xComM: dyn.comX,
    yComM: dyn.comY,
    isOnSymmetryAxis: Math.abs(params.massRatio - 1.0) < 0.05,
    symmetryAxisLabel:
      Math.abs(params.massRatio - 1.0) < 0.05
        ? 'Equal Masses: COM at Midpoint'
        : `Unequal Masses (m₂/m₁ = ${params.massRatio.toFixed(1)}): COM Closer to m₂`,
    comInsideMaterial: false,
    rodSlices: [],
    riemannMassKg: totalMass,
    riemannXComM: dyn.comX,
    riemannPercentError: 0,
    lambdaAtMidKgPerM: 0,
    lambdaDerivativeCheckKgPerM: 0,
    uniformBaselineXComM: 0.5 * (dyn.part1.x + dyn.part2.x),
    plateParts: [],
    dynamics: dyn,
    headlineSummary: dyn.boundaryTransferNote,
    hudTopTitle:
      params.systemBoundary === 'whole_system'
        ? `WHOLE SYSTEM MODEL (2.1.B.4) · t = ${dyn.tS.toFixed(2)} s · M = ${totalMass.toFixed(1)} kg`
        : `SUBSYSTEM BOUNDARY (${dyn.part1.label} ONLY · 2.1.A.3) · t = ${dyn.tS.toFixed(2)} s`,
    hudTopValue: `COM (${dyn.comX.toFixed(2)}, ${dyn.comY.toFixed(2)}) m · |v_cm| = ${comSpeed.toFixed(2)} m/s`,
    ekTakeaway:
      'LO 2.1.A & EK 2.1.B.4: Individual constituent objects can spin, oscillate, or fly apart (2.1.A.4), yet internal forces cancel pairwise so the macroscopic system behaves as a singular mass M located at its center of mass.',
    solveSteps: [
      {
        step: 1,
        title: 'Define System Boundary & Interactions',
        ekRef: '2.1.A.1 / 2.1.A.3',
        formula:
          params.systemBoundary === 'whole_system'
            ? 'System = {Part 1 + Part 2 + Internal Coupling}'
            : `System = {${dyn.part1.label} Only} (coupling crosses boundary)`,
        substitution:
          params.systemBoundary === 'whole_system'
            ? 'Internal forces cancel pairwise; only external forces govern COM.'
            : 'Internal coupling becomes external, transferring energy & momentum.',
      },
      {
        step: 2,
        title: 'Compute Instantaneous COM Position',
        ekRef: '2.1.B.2',
        formula: 'r_cm(t) = (m₁ r₁ + m₂ r₂) / (m₁ + m₂)',
        substitution: `r_cm(${dyn.tS.toFixed(2)}s) = (${dyn.comX.toFixed(2)}, ${dyn.comY.toFixed(2)}) m`,
      },
      {
        step: 3,
        title: 'Compute Instantaneous COM Velocity',
        ekRef: '2.1.B.4',
        formula: 'v_cm(t) = (m₁ v₁ + m₂ v₂) / (m₁ + m₂)',
        substitution: `v_cm = (${dyn.comVx.toFixed(2)}, ${dyn.comVy.toFixed(2)}) m/s  (|v_cm| = ${comSpeed.toFixed(2)} m/s)`,
      },
      {
        step: 4,
        title: 'Compare Constituent Substructure vs. Macroscopic COM',
        ekRef: '2.1.A.4 / 2.1.A.6',
        formula: 'Δr_internal = |r₂ − r₁|',
        substitution: `Separation = ${dyn.internalSeparationM.toFixed(2)} m · |v₁| = ${p1Speed.toFixed(2)}, |v₂| = ${p2Speed.toFixed(2)} m/s`,
      },
    ],
    compareHeadline: 'Macroscopic System COM vs. Individual Constituents (2.C)',
    compareRows: [
      {
        label: 'Speed at t',
        scenarioA: `${comSpeed.toFixed(2)} m/s (COM)`,
        scenarioB: `${p1Speed.toFixed(2)} m/s (${dyn.part1.label})`,
        deltaNote: `${Math.abs(p1Speed - comSpeed).toFixed(2)} m/s diff`,
      },
      {
        label: 'Part 2 Speed',
        scenarioA: `${comSpeed.toFixed(2)} m/s (COM)`,
        scenarioB: `${p2Speed.toFixed(2)} m/s (${dyn.part2.label})`,
        deltaNote: `m₂/m₁ = ${params.massRatio.toFixed(1)}`,
      },
      {
        label: 'Path Shape',
        scenarioA: params.dynamicsScenario === 'spring_carts' ? 'Smooth ½a_cm t²' : 'Exact Parabola',
        scenarioB:
          params.dynamicsScenario === 'tossed_baton'
            ? 'Looping Cycloid'
            : params.dynamicsScenario === 'midflight_split'
            ? 'Diverging Branches'
            : 'Oscillating + Drift',
        deltaNote: '2.1.A.4 & 2.1.B.4',
      },
    ],
    chartLayout: {
      width: chartW,
      height: chartH,
      xLabel,
      yLabel,
      primaryPath,
      secondaryPath,
      markerX,
      markerY,
      yMaxLabel,
      yMinLabel,
      legendPrimary,
      legendSecondary,
      markerLabel: `t = ${dyn.tS.toFixed(2)} s`,
    },
  };
}

export const TOPIC_21_CLAIM_QUESTIONS: Systems21ClaimQuestion[] = [
  {
    id: 'q1_split_com',
    skill: '3.B',
    ekRef: '2.1.A.4 / 2.1.B.4',
    prompt:
      'A firework shell launched along a parabolic arc explodes mid-flight into two unequal fragments due to internal chemical forces. Neglecting air drag, how does the center of mass of the two-fragment system move immediately after the explosion?',
    options: [
      { id: 'a', text: 'It drops straight vertically downward because momentum is lost in the explosion.' },
      { id: 'b', text: 'It continues along the exact original parabolic trajectory until a fragment hits the ground.' },
      { id: 'c', text: 'It jumps suddenly toward the lighter fragment because the lighter piece moves faster.' },
    ],
    correctId: 'b',
    explanation:
      'The explosion forces are strictly internal to the two-fragment system and cancel pairwise. Only the external gravitational force acts on the system, so the COM continues along the exact original parabola (EK 2.1.B.4).',
  },
  {
    id: 'q2_quadratic_rod',
    skill: '2.B / 3.B',
    ekRef: '2.1.B.3.i–ii',
    prompt:
      'A thin rod of length L lies along the x-axis from x = 0 to x = L with nonuniform linear mass density λ(x) = βx². Where is its center of mass located?',
    options: [
      { id: 'a', text: 'x_cm = L / 2 (midpoint of the rod).' },
      { id: 'b', text: 'x_cm = (2/3) L.' },
      { id: 'c', text: 'x_cm = (3/4) L (since ∫₀ᴸ x·βx² dx = ¼βL⁴ divided by M = ⅓βL³).' },
    ],
    correctId: 'c',
    explanation:
      'Using EK 2.1.B.3, M = ∫₀ᴸ βx² dx = (1/3)βL³ and ∫₀ᴸ x dm = ∫₀ᴸ βx³ dx = (1/4)βL⁴, so x_cm = (1/4)/(1/3) L = (3/4) L.',
  },
  {
    id: 'q3_disk_hole',
    skill: '2.C / 3.B',
    ekRef: '2.1.B.1 / 2.1.B.3.ii',
    prompt:
      'A uniform circular disk is centered at the origin (0, 0). A circular hole is cut out centered on the positive x-axis at (+d, 0). Where does the new center of mass lie?',
    options: [
      { id: 'a', text: 'On the negative x-axis (x_cm < 0, y_cm = 0), opposite the cutout along the symmetry line.' },
      { id: 'b', text: 'Still at the origin (0, 0) because the outer rim is circular.' },
      { id: 'c', text: 'On the positive x-axis (x_cm > 0, y_cm = 0), pulled toward the cutout.' },
    ],
    correctId: 'a',
    explanation:
      'By EK 2.1.B.1, the x-axis (y = 0) remains a line of symmetry, so y_cm = 0. Removing mass from +x shifts the mass-weighted average toward −x (superposing a negative mass at +d).',
  },
  {
    id: 'q4_system_boundary',
    skill: '3.B',
    ekRef: '2.1.A.3 / 2.1.A.5',
    prompt:
      'Two carts linked by a compressed spring sit on a frictionless track and are released from rest. Compare System A (both carts + spring) vs. System B (Cart 1 only). Which claim is correct?',
    options: [
      { id: 'a', text: 'Both System A and System B have constant zero center-of-mass velocity.' },
      { id: 'b', text: 'System A has zero COM displacement (spring is internal), whereas System B gains kinetic energy from an external spring force crossing its boundary.' },
      { id: 'c', text: 'System A gains external energy from the spring, while System B is completely isolated.' },
    ],
    correctId: 'b',
    explanation:
      'In System A, the spring force is internal so the total COM remains fixed (2.1.A.1, 2.1.B.4). Choosing System B (Cart 1 only) makes the spring interaction external, transferring energy and momentum across the boundary (2.1.A.3).',
  },
];
