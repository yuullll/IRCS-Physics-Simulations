/**
 * Pure Physics Engine & AP Curriculum Evaluation Module for
 * AP Physics C: Mechanics — Unit 2, Topic 2.4: Newton's First Law
 *
 * Strictly aligned with Course Framework V.1 | 47:
 * - LO 2.4.A: Describe the conditions under which a system's velocity remains constant.
 * - EK 2.4.A.1: The net force on a system is the vector sum of all forces exerted on the system.
 * - EK 2.4.A.2: Translational equilibrium is the configuration of forces such that ΣF_i = 0.
 * - EK 2.4.A.3: If the net force exerted on a system is zero, the velocity of that system remains constant.
 * - EK 2.4.A.4: Forces may be balanced in one dimension but unbalanced in another; velocity changes only in the direction of the unbalanced force.
 * - EK 2.4.A.5: An inertial reference frame is one from which an observer would verify Newton's first law of motion.
 * - Suggested Skills: 1.C, 2.B, 2.C, 3.C
 */

export const GRAVITY_G = 9.81;

export type Newton24Mode =
  | 'equilibrium'
  | 'constant_v'
  | 'axis_independence'
  | 'inertial_frame';

export type EquilibriumPreset = 'force_table' | 'hanging_sign';
export type ConstantVPreset = 'at_rest' | 'constant_cruise' | 'unbalanced_thrust';
export type ObserverFrame = 'earth' | 'railcar';

export interface Newton24Params {
  mode: Newton24Mode;

  // Mode 1: Vector Sum & Translational Equilibrium (2.4.A.1, 2.4.A.2)
  eqPreset: EquilibriumPreset;
  f1MagN: number;
  f1AngleDeg: number;
  f2MagN: number;
  f2AngleDeg: number;
  f3MagN: number;
  f3AngleDeg: number;
  signMassKg: number;
  leftCableAngleDeg: number; // angle above horizontal (15..75 deg)
  rightCableAngleDeg: number; // angle above horizontal (15..75 deg)
  showTipToTail: boolean;

  // Mode 2: Constant Velocity & Inertia (2.4.A.3)
  cvPreset: ConstantVPreset;
  gliderMassKg: number;
  gliderV0Ms: number;
  thrustForceN: number;
  opposeForceN: number;

  // Mode 3: Balanced vs Unbalanced Axes (2.4.A.4)
  puckMassKg: number;
  puckVx0Ms: number;
  puckVy0Ms: number;
  fxPlusN: number;
  fxMinusN: number;
  fyPlusN: number;
  fyMinusN: number;
  showStrobeDots: boolean;

  // Mode 4: Inertial vs Non-Inertial Reference Frames (2.4.A.5)
  observerFrame: ObserverFrame;
  railcarV0Ms: number;
  railcarAccelMs2: number; // 0 => inertial frame, != 0 => non-inertial frame
  bobMassKg: number;

  // Shared animation clock
  simTimeS: number;
}

export interface ForceVector2D {
  id: string;
  label: string;
  agent: string;
  fx: number;
  fy: number;
  mag: number;
  angleDeg: number;
  color: string;
}

export interface CalcStep {
  title: string;
  formula: string;
  substitution: string;
  result: string;
}

export interface ComparisonRow24 {
  metric: string;
  colA: string;
  colB: string;
  verdict: string;
}

export interface Newton24Record {
  id: string;
  modeLabel: string;
  setupSummary: string;
  netForceLabel: string;
  motionResult: string;
  verdict: string;
}

export interface ClaimQuestion24 {
  id: string;
  ekCode: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  evidence: string;
}

export interface VectorPolygonPoint {
  x: number;
  y: number;
  label: string;
  color: string;
}

export interface GraphCurvePoint {
  t: number;
  val: number;
}

export interface SvgGraphLayout24 {
  kind: 'polygon' | 'dual_kinematics' | 'axes_overlay' | 'frame_compare';
  title: string;
  width: number;
  height: number;
  // Polygon mode (1.A / 1.C)
  polygonVectors?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    color: string;
  }[];
  netVector?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    isZero: boolean;
  };
  // Graph modes (1.C qualitative/quantitative sketches)
  xAxisLabel?: string;
  yAxisLabel?: string;
  yMin?: number;
  yMax?: number;
  tMax?: number;
  currentTimeX?: number;
  seriesA?: {
    label: string;
    color: string;
    pathD: string;
    currentX: number;
    currentY: number;
    valueText: string;
  };
  seriesB?: {
    label: string;
    color: string;
    pathD: string;
    currentX: number;
    currentY: number;
    valueText: string;
  };
  zeroLineY?: number;
  annotationText?: string;
}

export interface Newton24Evaluation {
  forces: ForceVector2D[];
  fNetX: number;
  fNetY: number;
  fNetMag: number;
  fNetAngleDeg: number;
  isEquilibrium: boolean;

  // Equilibrium unknown solver (2.B)
  equilibrantX: number;
  equilibrantY: number;
  equilibrantMag: number;
  equilibrantAngleDeg: number;
  signTensionLeftN: number;
  signTensionRightN: number;

  // Kinematics (Modes 2 & 3)
  accelX: number;
  accelY: number;
  vxNow: number;
  vyNow: number;
  speedNow: number;
  posX: number;
  posY: number;
  isVxConstant: boolean;
  isVyConstant: boolean;
  strobePoints: { t: number; x: number; y: number }[];

  // Reference Frame (Mode 4: 2.4.A.5)
  isFrameInertial: boolean;
  railcarPosX: number;
  railcarVelX: number;
  puckEarthX: number;
  puckEarthVx: number;
  puckCarX: number;
  puckCarVx: number;
  puckCarAx: number; // Apparent horizontal acceleration observed inside car (-a_car)
  plumbTiltDeg: number; // atan2(a_car, g) in degrees
  plumbTensionN: number;

  // Pedagogical outputs
  auditStatus: 'VERIFIED' | 'UNBALANCED' | 'NON-INERTIAL';
  auditBadgeText: string;
  headlineSummary: string;
  graphLayout: SvgGraphLayout24;
  calcSteps: CalcStep[];
  comparisonHeaders: [string, string];
  comparisonRows: ComparisonRow24[];
  justificationTitle: string;
  justificationBody: string;
  justificationLaw: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeAngleDeg(deg: number): number {
  let a = deg % 360;
  if (a < 0) a += 360;
  return a;
}

/**
 * Computes the exact third balancing force F_3 = -(F_1 + F_2) for translational equilibrium (2.4.A.2).
 */
export function computeEquilibrantForce(
  f1MagN: number,
  f1AngleDeg: number,
  f2MagN: number,
  f2AngleDeg: number
): { fx: number; fy: number; mag: number; angleDeg: number } {
  const f1x = f1MagN * Math.cos(f1AngleDeg * DEG_TO_RAD);
  const f1y = f1MagN * Math.sin(f1AngleDeg * DEG_TO_RAD);
  const f2x = f2MagN * Math.cos(f2AngleDeg * DEG_TO_RAD);
  const f2y = f2MagN * Math.sin(f2AngleDeg * DEG_TO_RAD);

  const fx = -(f1x + f2x);
  const fy = -(f1y + f2y);
  const mag = Math.hypot(fx, fy);
  const angleDeg = mag < 1e-6 ? 0 : normalizeAngleDeg(Math.atan2(fy, fx) * RAD_TO_DEG);
  return { fx, fy, mag, angleDeg };
}

/**
 * Solves exact static hanging-cable tensions (T_1 left, T_2 right) supporting mass m in translational equilibrium:
 *   T_2 cos(θ_2) - T_1 cos(θ_1) = 0
 *   T_1 sin(θ_1) + T_2 sin(θ_2) = m g
 */
export function solveHangingSignTensions(
  massKg: number,
  leftAngleDeg: number,
  rightAngleDeg: number
): { tLeft: number; tRight: number; weightN: number } {
  const weightN = massKg * GRAVITY_G;
  const th1 = Math.max(10, Math.min(80, leftAngleDeg)) * DEG_TO_RAD;
  const th2 = Math.max(10, Math.min(80, rightAngleDeg)) * DEG_TO_RAD;
  const denom = Math.sin(th1 + th2);
  const safeDenom = Math.max(1e-4, denom);
  const tLeft = (weightN * Math.cos(th2)) / safeDenom;
  const tRight = (weightN * Math.cos(th1)) / safeDenom;
  return { tLeft, tRight, weightN };
}

export function createDefaultNewton24Params(mode: Newton24Mode = 'equilibrium'): Newton24Params {
  // Default F1 = 24 N @ 35 deg, F2 = 20 N @ 155 deg -> exact equilibrant ~19.7 N @ 266.2 deg
  // Start slightly off-balance (F3 = 12 N @ 260 deg) so user sees F_net != 0 and can click Auto-Balance or tune sliders!
  return {
    mode,
    eqPreset: 'force_table',
    f1MagN: 24,
    f1AngleDeg: 35,
    f2MagN: 20,
    f2AngleDeg: 155,
    f3MagN: 14.0,
    f3AngleDeg: 250,
    signMassKg: 4.0,
    leftCableAngleDeg: 35,
    rightCableAngleDeg: 55,
    showTipToTail: true,

    cvPreset: 'constant_cruise',
    gliderMassKg: 4.0,
    gliderV0Ms: 3.0,
    thrustForceN: 20,
    opposeForceN: 20,

    puckMassKg: 4.0,
    puckVx0Ms: 3.0,
    puckVy0Ms: 0.0,
    fxPlusN: 15,
    fxMinusN: 15,
    fyPlusN: 16,
    fyMinusN: 4,
    showStrobeDots: true,

    observerFrame: 'railcar',
    railcarV0Ms: 4.0,
    railcarAccelMs2: 3.0,
    bobMassKg: 1.5,

    simTimeS: 0,
  };
}

export const TOPIC_24_CLAIM_QUESTIONS: ClaimQuestion24[] = [
  {
    id: 'q-24-cruise',
    ekCode: 'EK 2.4.A.2 & 2.4.A.3',
    prompt:
      'A 4.0 kg hovercraft glides east at a constant velocity of +5.0 m/s while its forward thruster exerts +20 N and drag exerts -20 N. What is the net force on the hovercraft?',
    options: [
      {
        id: 'a',
        text: '0 N — equal and opposite forces give ΣF = 0, so velocity stays constant at +5.0 m/s.',
        isCorrect: true,
      },
      {
        id: 'b',
        text: '+20 N east — a nonzero net forward force is required to sustain motion.',
        isCorrect: false,
      },
      {
        id: 'c',
        text: '40 N — the magnitudes of both forces add together along the track.',
        isCorrect: false,
      },
    ],
    evidence:
      'By EK 2.4.A.2 and 2.4.A.3, translational equilibrium (ΣF = 0) holds whenever vector forces sum to zero—both for objects at rest and for objects moving at constant nonzero velocity.',
  },
  {
    id: 'q-24-axes',
    ekCode: 'EK 2.4.A.4',
    prompt:
      'On a frictionless 2D air table, a puck starts with v_x0 = +3.0 m/s and v_y0 = 0. Forces are balanced along X (ΣF_x = 0) but unbalanced along +Y (ΣF_y = +12 N). How does the puck’s velocity evolve?',
    options: [
      {
        id: 'a',
        text: 'Both v_x and v_y increase because the total speed increases.',
        isCorrect: false,
      },
      {
        id: 'b',
        text: 'v_x remains strictly +3.0 m/s while only v_y increases along +Y.',
        isCorrect: true,
      },
      {
        id: 'c',
        text: 'v_x drops to zero as the puck turns completely along +Y.',
        isCorrect: false,
      },
    ],
    evidence:
      'By EK 2.4.A.4, forces can be balanced in one dimension (ΣF_x = 0) and unbalanced in another (ΣF_y ≠ 0). Velocity changes exclusively along the axis of the unbalanced net force.',
  },
  {
    id: 'q-24-equilibrant',
    ekCode: 'EK 2.4.A.1 & 2.4.A.2',
    prompt:
      'Two horizontal cables pull a ring with F_1 = 30 N along +X and F_2 = 40 N along +Y. What third force F_3 places the ring in translational equilibrium?',
    options: [
      {
        id: 'a',
        text: '70 N directed opposite to +X.',
        isCorrect: false,
      },
      {
        id: 'b',
        text: '50 N directed into the third quadrant (opposite to F_1 + F_2).',
        isCorrect: true,
      },
      {
        id: 'c',
        text: '50 N directed into the first quadrant (along F_1 + F_2).',
        isCorrect: false,
      },
    ],
    evidence:
      'By EK 2.4.A.1–2.4.A.2, ΣF = F_1 + F_2 + F_3 = 0 requires F_3 = -(F_1 + F_2). Since |F_1 + F_2| = √(30² + 40²) = 50 N in Q1, F_3 has magnitude 50 N pointing 180° opposite in Q3.',
  },
  {
    id: 'q-24-frame',
    ekCode: 'EK 2.4.A.5',
    prompt:
      'Inside a railcar with covered windows, a frictionless puck placed at rest on a level floor suddenly accelerates backward at -3.0 m/s² even though no horizontal object pushes or pulls it. What can an observer inside conclude?',
    options: [
      {
        id: 'a',
        text: 'The railcar is moving at a high constant velocity.',
        isCorrect: false,
      },
      {
        id: 'b',
        text: 'The railcar is a non-inertial (accelerating) reference frame because Newton’s first law fails.',
        isCorrect: true,
      },
      {
        id: 'c',
        text: 'Newton’s first law only applies to stationary laboratories on Earth.',
        isCorrect: false,
      },
    ],
    evidence:
      'By EK 2.4.A.5, an inertial frame is defined as one in which an observer verifies Newton’s first law (ΣF = 0 ⇒ v = const). Spontaneous acceleration with ΣF_real = 0 proves the railcar frame is non-inertial.',
  },
];

function buildPolygonLayout(
  forces: ForceVector2D[],
  fNetX: number,
  fNetY: number,
  fNetMag: number,
  isEquilibrium: boolean
): SvgGraphLayout24 {
  const width = 312;
  const height = 172;
  const padX = 36;
  const padY = 26;

  // Compute tip-to-tail vertices starting from (0, 0)
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let cx = 0;
  let cy = 0;
  for (const f of forces) {
    cx += f.fx;
    cy += f.fy;
    pts.push({ x: cx, y: cy });
  }

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const spanX = Math.max(20, maxX - minX);
  const spanY = Math.max(20, maxY - minY);
  const availW = width - padX * 2;
  const availH = height - padY * 2;
  const scale = Math.min(availW / spanX, availH / spanY) * 0.86;

  const midPhysX = (minX + maxX) / 2;
  const midPhysY = (minY + maxY) / 2;
  const toSvgX = (px: number) => width / 2 + (px - midPhysX) * scale;
  const toSvgY = (py: number) => height / 2 - (py - midPhysY) * scale;

  const polygonVectors = forces.map((f, i) => ({
    x1: toSvgX(pts[i].x),
    y1: toSvgY(pts[i].y),
    x2: toSvgX(pts[i + 1].x),
    y2: toSvgY(pts[i + 1].y),
    label: f.label,
    color: f.color,
  }));

  const netVector = {
    x1: toSvgX(0),
    y1: toSvgY(0),
    x2: toSvgX(fNetX),
    y2: toSvgY(fNetY),
    label: isEquilibrium ? 'ΣF = 0 N' : `ΣF = ${fNetMag.toFixed(1)} N`,
    isZero: isEquilibrium,
  };

  return {
    kind: 'polygon',
    title: 'Tip-to-Tail Vector Sum Polygon (ΣF_i)',
    width,
    height,
    polygonVectors,
    netVector,
    annotationText: isEquilibrium
      ? 'Closed polygon: head returns to tail (ΣF = 0)'
      : `Open gap: resultant ΣF = ${fNetMag.toFixed(1)} N`,
  };
}

function buildCurvePath(
  samples: { t: number; v: number }[],
  tMax: number,
  yMin: number,
  yMax: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  width: number,
  height: number
): string {
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const spanY = Math.max(1e-3, yMax - yMin);
  return samples
    .map((pt, idx) => {
      const sx = padL + (pt.t / Math.max(1e-3, tMax)) * plotW;
      const sy = padT + (1 - (pt.v - yMin) / spanY) * plotH;
      const clampedY = Math.max(padT, Math.min(height - padB, sy));
      return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${clampedY.toFixed(1)}`;
    })
    .join(' ');
}

export function evaluateNewton24(params: Newton24Params): Newton24Evaluation {
  const t = Math.max(0, params.simTimeS);

  // Default placeholders
  let forces: ForceVector2D[] = [];
  let fNetX = 0;
  let fNetY = 0;
  let eqSol = computeEquilibrantForce(
    params.f1MagN,
    params.f1AngleDeg,
    params.f2MagN,
    params.f2AngleDeg
  );
  let signSol = solveHangingSignTensions(
    params.signMassKg,
    params.leftCableAngleDeg,
    params.rightCableAngleDeg
  );

  let accelX = 0;
  let accelY = 0;
  let vxNow = 0;
  let vyNow = 0;
  let posX = 0;
  let posY = 0;
  let isVxConstant = true;
  let isVyConstant = true;
  const strobePoints: { t: number; x: number; y: number }[] = [];

  let isFrameInertial = Math.abs(params.railcarAccelMs2) < 1e-4;
  let railcarPosX = params.railcarV0Ms * t + 0.5 * params.railcarAccelMs2 * t * t;
  let railcarVelX = params.railcarV0Ms + params.railcarAccelMs2 * t;
  let puckEarthX = params.railcarV0Ms * t;
  let puckEarthVx = params.railcarV0Ms;
  let puckCarX = puckEarthX - railcarPosX; // -0.5 * a_car * t^2
  let puckCarVx = puckEarthVx - railcarVelX; // -a_car * t
  let puckCarAx = Math.abs(params.railcarAccelMs2) < 1e-6 ? 0 : -params.railcarAccelMs2;
  let plumbTiltDeg = Math.atan2(params.railcarAccelMs2, GRAVITY_G) * RAD_TO_DEG;
  let plumbTensionN = params.bobMassKg * Math.hypot(GRAVITY_G, params.railcarAccelMs2);

  let auditStatus: 'VERIFIED' | 'UNBALANCED' | 'NON-INERTIAL' = 'VERIFIED';
  let auditBadgeText = '';
  let headlineSummary = '';
  let graphLayout: SvgGraphLayout24;
  let calcSteps: CalcStep[] = [];
  let comparisonHeaders: [string, string] = ['Quantity A', 'Quantity B'];
  let comparisonRows: ComparisonRow24[] = [];
  let justificationTitle = '';
  let justificationBody = '';
  let justificationLaw = '';

  if (params.mode === 'equilibrium') {
    if (params.eqPreset === 'force_table') {
      const f1x = params.f1MagN * Math.cos(params.f1AngleDeg * DEG_TO_RAD);
      const f1y = params.f1MagN * Math.sin(params.f1AngleDeg * DEG_TO_RAD);
      const f2x = params.f2MagN * Math.cos(params.f2AngleDeg * DEG_TO_RAD);
      const f2y = params.f2MagN * Math.sin(params.f2AngleDeg * DEG_TO_RAD);
      const f3x = params.f3MagN * Math.cos(params.f3AngleDeg * DEG_TO_RAD);
      const f3y = params.f3MagN * Math.sin(params.f3AngleDeg * DEG_TO_RAD);

      forces = [
        {
          id: 'f1',
          label: 'F_1',
          agent: 'Cable 1 → Ring',
          fx: f1x,
          fy: f1y,
          mag: params.f1MagN,
          angleDeg: params.f1AngleDeg,
          color: '#10b981',
        },
        {
          id: 'f2',
          label: 'F_2',
          agent: 'Cable 2 → Ring',
          fx: f2x,
          fy: f2y,
          mag: params.f2MagN,
          angleDeg: params.f2AngleDeg,
          color: '#38bdf8',
        },
        {
          id: 'f3',
          label: 'F_3',
          agent: 'Cable 3 → Ring',
          fx: f3x,
          fy: f3y,
          mag: params.f3MagN,
          angleDeg: params.f3AngleDeg,
          color: '#f59e0b',
        },
      ];

      fNetX = f1x + f2x + f3x;
      fNetY = f1y + f2y + f3y;
      eqSol = computeEquilibrantForce(
        params.f1MagN,
        params.f1AngleDeg,
        params.f2MagN,
        params.f2AngleDeg
      );
      const fNetMag = Math.hypot(fNetX, fNetY);
      const isEq = fNetMag <= 0.35;

      auditStatus = isEq ? 'VERIFIED' : 'UNBALANCED';
      auditBadgeText = isEq
        ? `TRANSLATIONAL EQUILIBRIUM: |ΣF| = ${fNetMag.toFixed(2)} N ≈ 0 N (v = const)`
        : `UNBALANCED: |ΣF| = ${fNetMag.toFixed(1)} N ≠ 0 (Set F_3 = ${eqSol.mag.toFixed(1)} N @ ${eqSol.angleDeg.toFixed(0)}°)`;
      headlineSummary = isEq
        ? `Force Table Balanced: F_1 + F_2 + F_3 = 0 N → Ring remains in translational equilibrium (EK 2.4.A.2)`
        : `Vector Sum Nonzero: ΣF = (${fNetX.toFixed(1)}, ${fNetY.toFixed(1)}) N → |ΣF| = ${fNetMag.toFixed(1)} N`;

      graphLayout = buildPolygonLayout(forces, fNetX, fNetY, fNetMag, isEq);

      calcSteps = [
        {
          title: '1. Resolve Known Forces into X & Y Components',
          formula: 'F_ix = F_i cos(θ_i),  F_iy = F_i sin(θ_i)',
          substitution: `F_1 = (${f1x.toFixed(1)}, ${f1y.toFixed(1)}) N,  F_2 = (${f2x.toFixed(1)}, ${f2y.toFixed(1)}) N`,
          result: `F_1 + F_2 = (${(f1x + f2x).toFixed(1)}, ${(f1y + f2y).toFixed(1)}) N`,
        },
        {
          title: '2. Apply Translational Equilibrium Condition (2.4.A.2)',
          formula: 'ΣF_x = 0  and  ΣF_y = 0  ⇒  F_3,eq = -(F_1 + F_2)',
          substitution: `F_3x = ${eqSol.fx.toFixed(1)} N,  F_3y = ${eqSol.fy.toFixed(1)} N`,
          result: `|F_3,eq| = ${eqSol.mag.toFixed(2)} N at θ_eq = ${eqSol.angleDeg.toFixed(1)}°`,
        },
        {
          title: '3. Audit Current Net Force Vector (2.4.A.1)',
          formula: 'ΣF = F_1 + F_2 + F_3',
          substitution: `Current F_3 = (${f3x.toFixed(1)}, ${f3y.toFixed(1)}) N`,
          result: `ΣF = (${fNetX.toFixed(1)}, ${fNetY.toFixed(1)}) N, |ΣF| = ${fNetMag.toFixed(2)} N`,
        },
      ];

      comparisonHeaders = ['Current F_3', 'Required F_3,eq'];
      comparisonRows = [
        {
          metric: 'Magnitude |F_3|',
          colA: `${params.f3MagN.toFixed(1)} N`,
          colB: `${eqSol.mag.toFixed(1)} N`,
          verdict: Math.abs(params.f3MagN - eqSol.mag) < 0.4 ? 'Matched' : 'Adjust F_3',
        },
        {
          metric: 'Angle θ_3',
          colA: `${params.f3AngleDeg.toFixed(0)}°`,
          colB: `${eqSol.angleDeg.toFixed(1)}°`,
          verdict:
            Math.min(
              Math.abs(normalizeAngleDeg(params.f3AngleDeg) - eqSol.angleDeg),
              360 - Math.abs(normalizeAngleDeg(params.f3AngleDeg) - eqSol.angleDeg)
            ) < 2.0
              ? 'Aligned'
              : 'Rotate F_3',
        },
        {
          metric: 'Horizontal ΣF_x',
          colA: `${fNetX.toFixed(1)} N`,
          colB: '0.0 N',
          verdict: Math.abs(fNetX) < 0.35 ? 'Balanced' : 'Unbalanced',
        },
        {
          metric: 'Vertical ΣF_y',
          colA: `${fNetY.toFixed(1)} N`,
          colB: '0.0 N',
          verdict: Math.abs(fNetY) < 0.35 ? 'Balanced' : 'Unbalanced',
        },
      ];

      justificationTitle = 'Vector Superposition & Translational Equilibrium (EK 2.4.A.1–2.4.A.2)';
      justificationLaw = 'ΣF_i = 0  ⇔  ΣF_x = 0 and ΣF_y = 0';
      justificationBody = isEq
        ? `Because the tip-to-tail polygon of F_1, F_2, and F_3 closes back to the origin (|ΣF| = ${fNetMag.toFixed(2)} N), both independent component sums vanish. By Newton's first law (2.4.A.3), the ring remains at constant velocity.`
        : `Because F_3 differs from the exact equilibrant (${eqSol.mag.toFixed(1)} N at ${eqSol.angleDeg.toFixed(1)}°), the vector sum leaves a nonzero net force |ΣF| = ${fNetMag.toFixed(1)} N. The ring cannot maintain constant velocity until ΣF = 0.`;
    } else {
      // Hanging Sign Equilibrium (Static 2.B Unknown Tension Solver)
      signSol = solveHangingSignTensions(
        params.signMassKg,
        params.leftCableAngleDeg,
        params.rightCableAngleDeg
      );
      const th1 = params.leftCableAngleDeg * DEG_TO_RAD;
      const th2 = params.rightCableAngleDeg * DEG_TO_RAD;

      const t1x = -signSol.tLeft * Math.cos(th1);
      const t1y = signSol.tLeft * Math.sin(th1);
      const t2x = signSol.tRight * Math.cos(th2);
      const t2y = signSol.tRight * Math.sin(th2);

      forces = [
        {
          id: 't1',
          label: 'T_1',
          agent: `Left Cable (${params.leftCableAngleDeg.toFixed(0)}°) → Sign`,
          fx: t1x,
          fy: t1y,
          mag: signSol.tLeft,
          angleDeg: 180 - params.leftCableAngleDeg,
          color: '#10b981',
        },
        {
          id: 't2',
          label: 'T_2',
          agent: `Right Cable (${params.rightCableAngleDeg.toFixed(0)}°) → Sign`,
          fx: t2x,
          fy: t2y,
          mag: signSol.tRight,
          angleDeg: params.rightCableAngleDeg,
          color: '#38bdf8',
        },
        {
          id: 'fg',
          label: 'F_g',
          agent: 'Earth → Sign',
          fx: 0,
          fy: -signSol.weightN,
          mag: signSol.weightN,
          angleDeg: 270,
          color: '#f59e0b',
        },
      ];

      fNetX = t1x + t2x;
      fNetY = t1y + t2y - signSol.weightN;
      const fNetMag = Math.hypot(fNetX, fNetY);

      auditStatus = 'VERIFIED';
      auditBadgeText = `STATIC EQUILIBRIUM SOLVED: T_1 = ${signSol.tLeft.toFixed(1)} N, T_2 = ${signSol.tRight.toFixed(1)} N (ΣF = 0)`;
      headlineSummary = `Hanging Sign (m = ${params.signMassKg.toFixed(1)} kg): Steeper cable carries greater tension (${signSol.tRight > signSol.tLeft ? 'T_2 > T_1' : signSol.tLeft > signSol.tRight ? 'T_1 > T_2' : 'T_1 = T_2'}) while ΣF = 0`;

      graphLayout = buildPolygonLayout(forces, fNetX, fNetY, fNetMag, true);

      calcSteps = [
        {
          title: '1. Horizontal Equilibrium Equation (ΣF_x = 0)',
          formula: 'T_2 cos(θ_2) - T_1 cos(θ_1) = 0',
          substitution: `T_1 cos(${params.leftCableAngleDeg}°) = T_2 cos(${params.rightCableAngleDeg}°)`,
          result: `Horizontal pull balance: |T_1x| = |T_2x| = ${Math.abs(t1x).toFixed(1)} N`,
        },
        {
          title: '2. Vertical Equilibrium Equation (ΣF_y = 0)',
          formula: 'T_1 sin(θ_1) + T_2 sin(θ_2) = m g',
          substitution: `${t1y.toFixed(1)} N + ${t2y.toFixed(1)} N = ${signSol.weightN.toFixed(1)} N`,
          result: `Weight supported: F_g = ${signSol.weightN.toFixed(1)} N`,
        },
        {
          title: '3. Solve Coupled System for Unknown Tensions (Skill 2.B)',
          formula: 'T_1 = mg cos(θ_2)/sin(θ_1+θ_2),  T_2 = mg cos(θ_1)/sin(θ_1+θ_2)',
          substitution: `sin(${params.leftCableAngleDeg + params.rightCableAngleDeg}°) = ${Math.sin(th1 + th2).toFixed(3)}`,
          result: `T_1 = ${signSol.tLeft.toFixed(1)} N,  T_2 = ${signSol.tRight.toFixed(1)} N`,
        },
      ];

      comparisonHeaders = ['Left Cable (T_1)', 'Right Cable (T_2)'];
      comparisonRows = [
        {
          metric: 'Cable Angle θ',
          colA: `${params.leftCableAngleDeg.toFixed(0)}°`,
          colB: `${params.rightCableAngleDeg.toFixed(0)}°`,
          verdict:
            params.rightCableAngleDeg > params.leftCableAngleDeg
              ? 'Right steeper'
              : params.leftCableAngleDeg > params.rightCableAngleDeg
              ? 'Left steeper'
              : 'Symmetric',
        },
        {
          metric: 'Total Tension T',
          colA: `${signSol.tLeft.toFixed(1)} N`,
          colB: `${signSol.tRight.toFixed(1)} N`,
          verdict:
            Math.abs(signSol.tLeft - signSol.tRight) < 0.1
              ? 'Equal T_1 = T_2'
              : signSol.tRight > signSol.tLeft
              ? 'T_2 > T_1'
              : 'T_1 > T_2',
        },
        {
          metric: 'Horizontal |T_x|',
          colA: `${Math.abs(t1x).toFixed(1)} N`,
          colB: `${Math.abs(t2x).toFixed(1)} N`,
          verdict: 'Always Equal (ΣF_x=0)',
        },
        {
          metric: 'Vertical T_y',
          colA: `${t1y.toFixed(1)} N`,
          colB: `${t2y.toFixed(1)} N`,
          verdict: `Sum = ${signSol.weightN.toFixed(1)} N`,
        },
      ];

      justificationTitle = 'Why the Steeper Cable Bears Greater Tension (EK 2.4.A.2)';
      justificationLaw = 'T_1 cos(θ_1) = T_2 cos(θ_2)  ⇒  T_2 / T_1 = cos(θ_1) / cos(θ_2)';
      justificationBody = `Horizontal equilibrium forces both cables to have identical horizontal components (|T_1x| = |T_2x| = ${Math.abs(t1x).toFixed(1)} N). A steeper angle has a smaller cos(θ), so it requires a larger total tension T to deliver the same horizontal force—and consequently supports a larger share of the weight mg.`;
    }
  } else if (params.mode === 'constant_v') {
    const fn = params.gliderMassKg * GRAVITY_G;
    const fg = -fn;
    fNetX = params.thrustForceN - params.opposeForceN;
    fNetY = 0;
    accelX = fNetX / Math.max(0.5, params.gliderMassKg);
    accelY = 0;
    vxNow = params.gliderV0Ms + accelX * t;
    vyNow = 0;
    posX = params.gliderV0Ms * t + 0.5 * accelX * t * t;
    isVxConstant = Math.abs(fNetX) < 0.05;
    isVyConstant = true;

    forces = [
      {
        id: 'f_thrust',
        label: 'F_thrust',
        agent: 'Thruster → Glider',
        fx: params.thrustForceN,
        fy: 0,
        mag: params.thrustForceN,
        angleDeg: 0,
        color: '#10b981',
      },
      {
        id: 'f_oppose',
        label: 'F_oppose',
        agent: 'Drag / Brake → Glider',
        fx: -params.opposeForceN,
        fy: 0,
        mag: params.opposeForceN,
        angleDeg: 180,
        color: '#f43f5e',
      },
      {
        id: 'f_n',
        label: 'F_N',
        agent: 'Air Track → Glider',
        fx: 0,
        fy: fn,
        mag: fn,
        angleDeg: 90,
        color: '#38bdf8',
      },
      {
        id: 'f_g',
        label: 'F_g',
        agent: 'Earth → Glider',
        fx: 0,
        fy: fg,
        mag: fn,
        angleDeg: 270,
        color: '#f59e0b',
      },
    ];

    auditStatus = isVxConstant ? 'VERIFIED' : 'UNBALANCED';
    auditBadgeText = isVxConstant
      ? `NEWTON'S 1ST LAW VERIFIED: ΣF_x = 0 N ⇒ v_x = ${params.gliderV0Ms.toFixed(1)} m/s remains CONSTANT`
      : `UNBALANCED NET FORCE: ΣF_x = ${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N ⇒ a_x = ${accelX >= 0 ? '+' : ''}${accelX.toFixed(2)} m/s²`;
    headlineSummary = isVxConstant
      ? Math.abs(params.gliderV0Ms) < 0.05
        ? `At-Rest Equilibrium: ΣF = 0 N and v_0 = 0 m/s → Glider stays at rest (EK 2.4.A.3)`
        : `Constant-Velocity Cruise: ΣF = 0 N (F_thrust = F_oppose = ${params.thrustForceN.toFixed(0)} N) → v_x stays constant at ${params.gliderV0Ms.toFixed(1)} m/s!`
      : `Net Force Active (ΣF_x = ${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N): Velocity changes linearly at a_x = ${accelX >= 0 ? '+' : ''}${accelX.toFixed(2)} m/s²`;

    // Build 1.C v_x(t) & F_net(t) qualitative/quantitative graph
    const tMax = 4.0;
    const nPts = 32;
    const vSamples: { t: number; v: number }[] = [];
    const fSamples: { t: number; v: number }[] = [];
    let vMin = -6;
    let vMax = 10;
    for (let i = 0; i <= nPts; i++) {
      const ti = (i / nPts) * tMax;
      const vi = params.gliderV0Ms + accelX * ti;
      vSamples.push({ t: ti, v: vi });
      fSamples.push({ t: ti, v: fNetX * 0.25 }); // scaled onto shared grid (1 unit = 4 N)
      if (vi < vMin) vMin = Math.floor(vi - 1);
      if (vi > vMax) vMax = Math.ceil(vi + 1);
    }
    const yMin = Math.min(-8, vMin, Math.floor(fNetX * 0.25 - 1));
    const yMax = Math.max(8, vMax, Math.ceil(fNetX * 0.25 + 1));

    const width = 312;
    const height = 172;
    const padL = 34;
    const padR = 16;
    const padT = 22;
    const padB = 26;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const spanY = Math.max(1, yMax - yMin);
    const tClamped = Math.min(tMax, t);
    const curX = padL + (tClamped / tMax) * plotW;
    const curVy = padT + (1 - (vxNow - yMin) / spanY) * plotH;
    const curFy = padT + (1 - (fNetX * 0.25 - yMin) / spanY) * plotH;
    const zeroLineY = padT + (1 - (0 - yMin) / spanY) * plotH;

    graphLayout = {
      kind: 'dual_kinematics',
      title: 'Velocity v_x(t) & Net Force ΣF_x(t) Sketch (Skill 1.C)',
      width,
      height,
      xAxisLabel: 'Time t (s) [0 → 4.0 s]',
      yAxisLabel: 'v_x (m/s)',
      yMin,
      yMax,
      tMax,
      currentTimeX: curX,
      zeroLineY,
      seriesA: {
        label: 'v_x(t)',
        color: '#10b981',
        pathD: buildCurvePath(vSamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curVy)),
        valueText: `v_x=${vxNow.toFixed(1)} m/s`,
      },
      seriesB: {
        label: 'ΣF_x (÷4 N)',
        color: '#f43f5e',
        pathD: buildCurvePath(fSamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curFy)),
        valueText: `ΣF_x=${fNetX.toFixed(0)} N`,
      },
      annotationText: isVxConstant
        ? 'Slope dv_x/dt = 0 (horizontal line ⇒ constant velocity)'
        : `Slope dv_x/dt = ${accelX >= 0 ? '+' : ''}${accelX.toFixed(2)} m/s²`,
    };

    calcSteps = [
      {
        title: '1. Sum Horizontal Forces (EK 2.4.A.1)',
        formula: 'ΣF_x = F_thrust - F_oppose',
        substitution: `${params.thrustForceN.toFixed(1)} N - ${params.opposeForceN.toFixed(1)} N`,
        result: `ΣF_x = ${fNetX >= 0 ? '+' : ''}${fNetX.toFixed(1)} N`,
      },
      {
        title: '2. Determine Horizontal Acceleration',
        formula: 'a_x = ΣF_x / m',
        substitution: `${fNetX.toFixed(1)} N / ${params.gliderMassKg.toFixed(1)} kg`,
        result: `a_x = ${accelX >= 0 ? '+' : ''}${accelX.toFixed(2)} m/s²`,
      },
      {
        title: '3. Evaluate Velocity & Displacement at t',
        formula: 'v_x(t) = v_x0 + a_x t,  Δx = v_x0 t + ½ a_x t²',
        substitution: `t = ${t.toFixed(2)} s,  v_x0 = ${params.gliderV0Ms.toFixed(1)} m/s`,
        result: `v_x = ${vxNow.toFixed(2)} m/s,  Δx = ${posX.toFixed(2)} m`,
      },
    ];

    comparisonHeaders = ['At t = 0 s', `At t = ${t.toFixed(1)} s`];
    comparisonRows = [
      {
        metric: 'Net Force ΣF_x',
        colA: `${fNetX.toFixed(1)} N`,
        colB: `${fNetX.toFixed(1)} N`,
        verdict: isVxConstant ? 'Zero (Equilibrium)' : 'Unbalanced',
      },
      {
        metric: 'Velocity v_x',
        colA: `${params.gliderV0Ms.toFixed(2)} m/s`,
        colB: `${vxNow.toFixed(2)} m/s`,
        verdict: isVxConstant ? 'Strictly Constant' : `Δv = ${(vxNow - params.gliderV0Ms).toFixed(2)} m/s`,
      },
      {
        metric: 'Acceleration a_x',
        colA: `${accelX.toFixed(2)} m/s²`,
        colB: `${accelX.toFixed(2)} m/s²`,
        verdict: isVxConstant ? 'Zero' : 'Nonzero',
      },
      {
        metric: 'Vertical Balance ΣF_y',
        colA: '0.0 N',
        colB: '0.0 N',
        verdict: `F_N = F_g = ${fn.toFixed(1)} N`,
      },
    ];

    justificationTitle = 'Constant Velocity Does Not Require a Net Force (EK 2.4.A.3)';
    justificationLaw = 'ΣF = 0  ⇒  dv/dt = 0  ⇒  v(t) = v_0 = constant';
    justificationBody = isVxConstant
      ? `Even though the glider moves with v_x = ${params.gliderV0Ms.toFixed(1)} m/s (and individual forces are ${params.thrustForceN.toFixed(0)} N each), their vector sum is zero (ΣF_x = 0 N). Newton's first law guarantees zero acceleration and a completely flat v_x(t) graph.`
      : `Because F_thrust (${params.thrustForceN.toFixed(0)} N) does not equal F_oppose (${params.opposeForceN.toFixed(0)} N), a net force ΣF_x = ${fNetX.toFixed(1)} N acts on the glider, causing its velocity to change at ${accelX.toFixed(2)} m/s².`;
  } else if (params.mode === 'axis_independence') {
    fNetX = params.fxPlusN - params.fxMinusN;
    fNetY = params.fyPlusN - params.fyMinusN;
    const m = Math.max(0.5, params.puckMassKg);
    accelX = fNetX / m;
    accelY = fNetY / m;
    vxNow = params.puckVx0Ms + accelX * t;
    vyNow = params.puckVy0Ms + accelY * t;
    posX = params.puckVx0Ms * t + 0.5 * accelX * t * t;
    posY = params.puckVy0Ms * t + 0.5 * accelY * t * t;
    isVxConstant = Math.abs(fNetX) < 0.05;
    isVyConstant = Math.abs(fNetY) < 0.05;

    for (let ts = 0; ts <= 2.401; ts += 0.4) {
      strobePoints.push({
        t: ts,
        x: params.puckVx0Ms * ts + 0.5 * accelX * ts * ts,
        y: params.puckVy0Ms * ts + 0.5 * accelY * ts * ts,
      });
    }

    forces = [
      {
        id: 'fx_plus',
        label: 'F_x+',
        agent: '+X Thruster → Puck',
        fx: params.fxPlusN,
        fy: 0,
        mag: params.fxPlusN,
        angleDeg: 0,
        color: '#10b981',
      },
      {
        id: 'fx_minus',
        label: 'F_x-',
        agent: '-X Thruster → Puck',
        fx: -params.fxMinusN,
        fy: 0,
        mag: params.fxMinusN,
        angleDeg: 180,
        color: '#34d399',
      },
      {
        id: 'fy_plus',
        label: 'F_y+',
        agent: '+Y Thruster → Puck',
        fx: 0,
        fy: params.fyPlusN,
        mag: params.fyPlusN,
        angleDeg: 90,
        color: '#f43f5e',
      },
      {
        id: 'fy_minus',
        label: 'F_y-',
        agent: '-Y Thruster → Puck',
        fx: 0,
        fy: -params.fyMinusN,
        mag: params.fyMinusN,
        angleDeg: 270,
        color: '#38bdf8',
      },
    ];

    const fNetMag = Math.hypot(fNetX, fNetY);
    auditStatus = isVxConstant && isVyConstant ? 'VERIFIED' : 'UNBALANCED';
    auditBadgeText =
      isVxConstant && !isVyConstant
        ? `X BALANCED (v_x = ${params.puckVx0Ms.toFixed(1)} const) · Y UNBALANCED (a_y = ${accelY >= 0 ? '+' : ''}${accelY.toFixed(2)} m/s²)`
        : !isVxConstant && isVyConstant
        ? `Y BALANCED (v_y = ${params.puckVy0Ms.toFixed(1)} const) · X UNBALANCED (a_x = ${accelX >= 0 ? '+' : ''}${accelX.toFixed(2)} m/s²)`
        : isVxConstant && isVyConstant
        ? `BOTH AXES BALANCED (ΣF = 0): Both v_x and v_y remain constant`
        : `BOTH AXES UNBALANCED: a = (${accelX.toFixed(1)}, ${accelY.toFixed(1)}) m/s²`;

    headlineSummary =
      isVxConstant && !isVyConstant
        ? `Axis Independence (EK 2.4.A.4): ΣF_x = 0 keeps v_x = ${params.puckVx0Ms.toFixed(1)} m/s constant while ΣF_y = ${fNetY.toFixed(1)} N accelerates only v_y`
        : `2D Air Table: ΣF = (${fNetX.toFixed(1)}, ${fNetY.toFixed(1)}) N → |ΣF| = ${fNetMag.toFixed(1)} N`;

    // Build 1.C dual v_x(t) vs v_y(t) overlay graph
    const tMax = 2.4;
    const nPts = 28;
    const vxSamples: { t: number; v: number }[] = [];
    const vySamples: { t: number; v: number }[] = [];
    let yMin = -4;
    let yMax = 8;
    for (let i = 0; i <= nPts; i++) {
      const ti = (i / nPts) * tMax;
      const vxi = params.puckVx0Ms + accelX * ti;
      const vyi = params.puckVy0Ms + accelY * ti;
      vxSamples.push({ t: ti, v: vxi });
      vySamples.push({ t: ti, v: vyi });
      yMin = Math.min(yMin, Math.floor(Math.min(vxi, vyi) - 1));
      yMax = Math.max(yMax, Math.ceil(Math.max(vxi, vyi) + 1));
    }

    const width = 312;
    const height = 172;
    const padL = 34;
    const padR = 16;
    const padT = 22;
    const padB = 26;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const spanY = Math.max(1, yMax - yMin);
    const tClamped = Math.min(tMax, t);
    const curX = padL + (tClamped / tMax) * plotW;
    const curVxY = padT + (1 - (vxNow - yMin) / spanY) * plotH;
    const curVyY = padT + (1 - (vyNow - yMin) / spanY) * plotH;
    const zeroLineY = padT + (1 - (0 - yMin) / spanY) * plotH;

    graphLayout = {
      kind: 'axes_overlay',
      title: 'Component Velocities v_x(t) vs v_y(t) (EK 2.4.A.4)',
      width,
      height,
      xAxisLabel: 'Time t (s) [0 → 2.4 s]',
      yAxisLabel: 'v (m/s)',
      yMin,
      yMax,
      tMax,
      currentTimeX: curX,
      zeroLineY,
      seriesA: {
        label: 'v_x(t)',
        color: '#10b981',
        pathD: buildCurvePath(vxSamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curVxY)),
        valueText: `v_x=${vxNow.toFixed(1)} m/s`,
      },
      seriesB: {
        label: 'v_y(t)',
        color: '#f43f5e',
        pathD: buildCurvePath(vySamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curVyY)),
        valueText: `v_y=${vyNow.toFixed(1)} m/s`,
      },
      annotationText: isVxConstant
        ? 'v_x(t) stays flat while v_y(t) changes linearly'
        : 'Both axes accelerating independently',
    };

    const speed = Math.hypot(vxNow, vyNow);
    calcSteps = [
      {
        title: '1. Evaluate Net Force Along Each Orthogonal Axis',
        formula: 'ΣF_x = F_x+ - F_x-,  ΣF_y = F_y+ - F_y-',
        substitution: `ΣF_x = ${params.fxPlusN} - ${params.fxMinusN} N,  ΣF_y = ${params.fyPlusN} - ${params.fyMinusN} N`,
        result: `ΣF_x = ${fNetX.toFixed(1)} N,  ΣF_y = ${fNetY.toFixed(1)} N`,
      },
      {
        title: '2. Compute Independent Component Accelerations',
        formula: 'a_x = ΣF_x / m,  a_y = ΣF_y / m',
        substitution: `m = ${m.toFixed(1)} kg`,
        result: `a_x = ${accelX.toFixed(2)} m/s²,  a_y = ${accelY.toFixed(2)} m/s²`,
      },
      {
        title: '3. Solve Instantaneous Velocity Components & Speed',
        formula: 'v_x(t) = v_x0 + a_x t,  v_y(t) = v_y0 + a_y t,  |v| = √(v_x² + v_y²)',
        substitution: `t = ${t.toFixed(2)} s`,
        result: `v = (${vxNow.toFixed(1)}, ${vyNow.toFixed(1)}) m/s,  |v| = ${speed.toFixed(2)} m/s`,
      },
    ];

    comparisonHeaders = ['X-Dimension', 'Y-Dimension'];
    comparisonRows = [
      {
        metric: 'Net Force ΣF',
        colA: `${fNetX.toFixed(1)} N`,
        colB: `${fNetY.toFixed(1)} N`,
        verdict: isVxConstant && !isVyConstant ? 'Balanced in X only' : isVyConstant && !isVxConstant ? 'Balanced in Y only' : isVxConstant ? 'Both Balanced' : 'Both Unbalanced',
      },
      {
        metric: 'Acceleration a',
        colA: `${accelX.toFixed(2)} m/s²`,
        colB: `${accelY.toFixed(2)} m/s²`,
        verdict: isVxConstant ? 'a_x = 0 strictly' : 'a_x ≠ 0',
      },
      {
        metric: 'Velocity v(t)',
        colA: `${vxNow.toFixed(2)} m/s`,
        colB: `${vyNow.toFixed(2)} m/s`,
        verdict: isVxConstant ? 'v_x invariant' : 'v_x changing',
      },
      {
        metric: 'Strobe ΔSpacing',
        colA: isVxConstant ? 'Uniform Δx' : 'Non-uniform Δx',
        colB: isVyConstant ? 'Uniform Δy' : 'Growing Δy',
        verdict: 'EK 2.4.A.4 Proof',
      },
    ];

    justificationTitle = 'Orthogonal Balance & Unbalanced Axis Rule (EK 2.4.A.4)';
    justificationLaw = 'ΣF_x = 0 ⇒ v_x = const;  ΣF_y ≠ 0 ⇒ dv_y/dt = ΣF_y / m';
    justificationBody =
      isVxConstant && !isVyConstant
        ? `Forces cancel along X (ΣF_x = 0 N) while ΣF_y = ${fNetY.toFixed(1)} N is unbalanced along Y. Therefore, strobe dots stay evenly spaced horizontally (constant v_x = ${params.puckVx0Ms.toFixed(1)} m/s) while bending solely in the Y-direction.`
        : `Each coordinate axis obeys Newton's first law independently: a component of velocity remains constant if and only if the net force along that specific axis is zero.`;
  } else {
    // Mode 4: Inertial vs Non-Inertial Reference Frames (EK 2.4.A.5)
    isFrameInertial = Math.abs(params.railcarAccelMs2) < 1e-4;
    railcarPosX = params.railcarV0Ms * t + 0.5 * params.railcarAccelMs2 * t * t;
    railcarVelX = params.railcarV0Ms + params.railcarAccelMs2 * t;
    puckEarthX = params.railcarV0Ms * t;
    puckEarthVx = params.railcarV0Ms;
    puckCarX = puckEarthX - railcarPosX;
    puckCarVx = puckEarthVx - railcarVelX;
    puckCarAx = Math.abs(params.railcarAccelMs2) < 1e-6 ? 0 : -params.railcarAccelMs2;
    plumbTiltDeg = Math.atan2(params.railcarAccelMs2, GRAVITY_G) * RAD_TO_DEG;
    plumbTensionN = params.bobMassKg * Math.hypot(GRAVITY_G, params.railcarAccelMs2);

    const puckMass = 1.0;
    const puckFn = puckMass * GRAVITY_G;
    // Real forces on the frictionless puck are ALWAYS strictly vertical (F_N and F_g)!
    fNetX = 0;
    fNetY = 0;
    forces = [
      {
        id: 'puck_fn',
        label: 'F_N (Puck)',
        agent: 'Car Floor → Puck',
        fx: 0,
        fy: puckFn,
        mag: puckFn,
        angleDeg: 90,
        color: '#38bdf8',
      },
      {
        id: 'puck_fg',
        label: 'F_g (Puck)',
        agent: 'Earth → Puck',
        fx: 0,
        fy: -puckFn,
        mag: puckFn,
        angleDeg: 270,
        color: '#f59e0b',
      },
      {
        id: 'bob_t',
        label: 'T (Bob)',
        agent: 'Ceiling String → Bob',
        fx: params.bobMassKg * params.railcarAccelMs2,
        fy: params.bobMassKg * GRAVITY_G,
        mag: plumbTensionN,
        angleDeg: 90 - plumbTiltDeg,
        color: '#10b981',
      },
    ];

    const observingCar = params.observerFrame === 'railcar';
    const lawVerifiedInActiveFrame = !observingCar || isFrameInertial;
    auditStatus = lawVerifiedInActiveFrame ? 'VERIFIED' : 'NON-INERTIAL';
    auditBadgeText = lawVerifiedInActiveFrame
      ? isFrameInertial
        ? `INERTIAL FRAME VERIFIED: a_car = 0 ⇒ ΣF_real,x = 0 and a_puck/obs = 0`
        : `EARTH FRAME (INERTIAL): Puck maintains constant v = ${params.railcarV0Ms.toFixed(1)} m/s while car accelerates under it`
      : `NON-INERTIAL FRAME: ΣF_real,x = 0 N on puck, yet a_puck/car = ${puckCarAx.toFixed(1)} m/s² (Violates 1st Law!)`;

    headlineSummary = isFrameInertial
      ? `Inertial Railcar (v_car = ${params.railcarV0Ms.toFixed(1)} m/s, a_car = 0): Plumb bob hangs at 0° & puck obeys Newton's 1st Law (EK 2.4.A.5)`
      : `Accelerating Railcar (a_car = ${params.railcarAccelMs2 >= 0 ? '+' : ''}${params.railcarAccelMs2.toFixed(1)} m/s²): Puck accelerates at ${puckCarAx.toFixed(1)} m/s² inside car with ZERO horizontal force!`;

    // 1.C Graph: Compare v_puck/Earth(t) (always flat) vs v_puck/Car(t) (sloped when a_car != 0)
    const tMax = 2.4;
    const nPts = 28;
    const earthSamples: { t: number; v: number }[] = [];
    const carSamples: { t: number; v: number }[] = [];
    let yMin = -8;
    let yMax = 8;
    for (let i = 0; i <= nPts; i++) {
      const ti = (i / nPts) * tMax;
      const vE = params.railcarV0Ms;
      const vC = -params.railcarAccelMs2 * ti;
      earthSamples.push({ t: ti, v: vE });
      carSamples.push({ t: ti, v: vC });
      yMin = Math.min(yMin, Math.floor(Math.min(vE, vC) - 1));
      yMax = Math.max(yMax, Math.ceil(Math.max(vE, vC) + 1));
    }

    const width = 312;
    const height = 172;
    const padL = 34;
    const padR = 16;
    const padT = 22;
    const padB = 26;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const spanY = Math.max(1, yMax - yMin);
    const tClamped = Math.min(tMax, t);
    const curX = padL + (tClamped / tMax) * plotW;
    const curEy = padT + (1 - (puckEarthVx - yMin) / spanY) * plotH;
    const curCy = padT + (1 - (puckCarVx - yMin) / spanY) * plotH;
    const zeroLineY = padT + (1 - (0 - yMin) / spanY) * plotH;

    graphLayout = {
      kind: 'frame_compare',
      title: 'Observed Puck Velocity: Earth vs Railcar Frame (2.4.A.5)',
      width,
      height,
      xAxisLabel: 'Time t (s) [0 → 2.4 s]',
      yAxisLabel: 'v_puck (m/s)',
      yMin,
      yMax,
      tMax,
      currentTimeX: curX,
      zeroLineY,
      seriesA: {
        label: 'Earth v_P/E',
        color: '#10b981',
        pathD: buildCurvePath(earthSamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curEy)),
        valueText: `Earth: ${puckEarthVx.toFixed(1)} m/s`,
      },
      seriesB: {
        label: 'Car v_P/car',
        color: isFrameInertial ? '#38bdf8' : '#f43f5e',
        pathD: buildCurvePath(carSamples, tMax, yMin, yMax, padL, padR, padT, padB, width, height),
        currentX: curX,
        currentY: Math.max(padT, Math.min(height - padB, curCy)),
        valueText: `Car: ${puckCarVx.toFixed(1)} m/s`,
      },
      annotationText: isFrameInertial
        ? 'Both frames observe dv/dt = 0 ⇒ INERTIAL'
        : `Car sees a_P = ${puckCarAx.toFixed(1)} m/s² despite ΣF_x = 0`,
    };

    calcSteps = [
      {
        title: '1. Real Horizontal Net Force on Frictionless Puck',
        formula: 'ΣF_real,x = 0 N  (only vertical F_N and F_g act)',
        substitution: `F_N = F_g = ${puckFn.toFixed(1)} N,  μ = 0`,
        result: 'In Earth frame: a_puck/E = 0.00 m/s² (v_P/E = const)',
      },
      {
        title: '2. Relative Acceleration Observed Inside Railcar',
        formula: 'a_puck/car = a_puck/E - a_car/E = 0 - a_car',
        substitution: `a_car = ${params.railcarAccelMs2 >= 0 ? '+' : ''}${params.railcarAccelMs2.toFixed(1)} m/s²`,
        result: `a_puck/car = ${puckCarAx >= 0 ? '+' : ''}${puckCarAx.toFixed(2)} m/s²`,
      },
      {
        title: '3. Plumb-Bob Pendulum Tilt & String Tension (Skill 2.B)',
        formula: 'tan(θ) = a_car / g,   T = m_bob √(g² + a_car²)',
        substitution: `m_bob = ${params.bobMassKg.toFixed(1)} kg,  g = 9.81 m/s²`,
        result: `θ = ${plumbTiltDeg.toFixed(1)}°,  T = ${plumbTensionN.toFixed(1)} N`,
      },
    ];

    comparisonHeaders = ['Earth Frame (Inertial)', 'Railcar Frame'];
    comparisonRows = [
      {
        metric: 'Real Force ΣF_x (Puck)',
        colA: '0.0 N',
        colB: '0.0 N',
        verdict: 'No horizontal agent',
      },
      {
        metric: 'Observed a_puck',
        colA: '0.00 m/s²',
        colB: `${puckCarAx.toFixed(2)} m/s²`,
        verdict: isFrameInertial ? 'Both zero' : 'Differs!',
      },
      {
        metric: 'Plumb Bob Angle θ',
        colA: `${plumbTiltDeg.toFixed(1)}°`,
        colB: `${plumbTiltDeg.toFixed(1)}°`,
        verdict: isFrameInertial ? 'Vertical (0°)' : 'Tilts opposite a_car',
      },
      {
        metric: 'Newton’s 1st Law',
        colA: 'VERIFIED',
        colB: isFrameInertial ? 'VERIFIED' : 'VIOLATED',
        verdict: isFrameInertial ? 'Inertial Frame' : 'Non-Inertial Frame',
      },
    ];

    justificationTitle = 'Operational Test for an Inertial Reference Frame (EK 2.4.A.5)';
    justificationLaw = 'Inertial Frame  ⇔  (ΣF_real = 0  ⇒  a_observed = 0)';
    justificationBody = isFrameInertial
      ? `Even while cruising at v_car = ${params.railcarV0Ms.toFixed(1)} m/s, the railcar has a_car = 0. Inside the car, the frictionless puck stays at constant velocity and the plumb bob hangs strictly vertical (0°). Because an observer verifies Newton's first law, the railcar IS an inertial reference frame.`
      : `With a_car = ${params.railcarAccelMs2.toFixed(1)} m/s², the frictionless puck has ΣF_real,x = 0 N yet accelerates at ${puckCarAx.toFixed(1)} m/s² relative to the railcar floor, and the plumb bob hangs at ${plumbTiltDeg.toFixed(1)}° off vertical. Because Newton's first law fails for an observer inside the railcar, it is a non-inertial reference frame.`;
  }

  const fNetMag = Math.hypot(fNetX, fNetY);
  const fNetAngleDeg = fNetMag < 1e-6 ? 0 : normalizeAngleDeg(Math.atan2(fNetY, fNetX) * RAD_TO_DEG);
  const isEquilibrium = fNetMag <= 0.35;

  return {
    forces,
    fNetX,
    fNetY,
    fNetMag,
    fNetAngleDeg,
    isEquilibrium,

    equilibrantX: eqSol.fx,
    equilibrantY: eqSol.fy,
    equilibrantMag: eqSol.mag,
    equilibrantAngleDeg: eqSol.angleDeg,
    signTensionLeftN: signSol.tLeft,
    signTensionRightN: signSol.tRight,

    accelX,
    accelY,
    vxNow,
    vyNow,
    speedNow: Math.hypot(vxNow, vyNow),
    posX,
    posY,
    isVxConstant,
    isVyConstant,
    strobePoints,

    isFrameInertial,
    railcarPosX,
    railcarVelX,
    puckEarthX,
    puckEarthVx,
    puckCarX,
    puckCarVx,
    puckCarAx,
    plumbTiltDeg,
    plumbTensionN,

    auditStatus,
    auditBadgeText,
    headlineSummary,
    graphLayout,
    calcSteps,
    comparisonHeaders,
    comparisonRows,
    justificationTitle,
    justificationBody,
    justificationLaw,
  };
}
