/**
 * Pure Physics Engine & Pedagogical Builders for AP Physics C: Mechanics
 * Topic 3.1: Translational Kinetic Energy (CED Page 67)
 *
 * Learning Objective 3.1.A:
 *   Describe the translational kinetic energy of an object in terms of the object's mass and velocity.
 * Essential Knowledge:
 *   3.1.A.1: An object's translational kinetic energy is given by K = (1/2) m v^2.
 *   3.1.A.2: Translational kinetic energy is a scalar quantity.
 *   3.1.A.3: Different observers may measure different values of the translational kinetic energy
 *            of an object, depending on the observer's frame of reference.
 * Suggested Skills: 1.C, 2.C, 3.B, 3.C
 */

export type Kinetic31Mode =
  | 'scaling_track'
  | 'scalar_arena'
  | 'observer_frames'
  | 'scenario_compare';

export type ObserverViewFrame = 'earth' | 'observer_b';
export type ArenaMotionPattern = 'linear' | 'circular' | 'rebound';
export type Kinetic31ChartKind = 'primary' | 'secondary' | 'tertiary';

export interface Kinetic31Params {
  mode: Kinetic31Mode;

  // Mode 1: Mass & Speed Scaling Track (3.1.A.1)
  massKg: number;
  speedMs: number;
  refMassKg: number;
  refSpeedMs: number;
  trackPosM: number;

  // Mode 2: 2D Scalar Direction-Invariance Arena (3.1.A.2)
  arenaMassKg: number;
  arenaSpeedMs: number;
  headingDeg: number;
  arenaPattern: ArenaMotionPattern;
  showTwoPuckSystem: boolean;
  arenaPosX: number;
  arenaPosY: number;
  arenaOrbitRad: number;

  // Mode 3: Reference Frames Lab (3.1.A.3)
  frameMassKg: number;
  vObjectEarthMs: number;
  vObserverEarthMs: number;
  activeViewFrame: ObserverViewFrame;
  frameSimTimeS: number;

  // Mode 4: Dual Scenario Comparison (Skill 2.C)
  massAKg: number;
  velAMs: number;
  massBKg: number;
  velBMs: number;
  comparePosA: number;
  comparePosB: number;

  // Visual Overlays
  showVectors: boolean;
  showComponents: boolean;
  showEnergyTowers: boolean;
}

export const DEFAULT_KINETIC_31_PARAMS: Kinetic31Params = {
  mode: 'scaling_track',

  massKg: 2.0,
  speedMs: 5.0,
  refMassKg: 2.0,
  refSpeedMs: 5.0,
  trackPosM: -3.0,

  arenaMassKg: 2.0,
  arenaSpeedMs: 6.0,
  headingDeg: 35,
  arenaPattern: 'linear',
  showTwoPuckSystem: false,
  arenaPosX: 0,
  arenaPosY: 0,
  arenaOrbitRad: 0.6,

  frameMassKg: 2.0,
  vObjectEarthMs: 8.0,
  vObserverEarthMs: 3.0,
  activeViewFrame: 'earth',
  frameSimTimeS: 0,

  massAKg: 1.0,
  velAMs: 8.0,
  massBKg: 4.0,
  velBMs: 2.0,
  comparePosA: -2.0,
  comparePosB: -2.0,

  showVectors: true,
  showComponents: true,
  showEnergyTowers: true,
};

export function clamp(val: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, val));
}

/**
 * EK 3.1.A.1: Translational kinetic energy K = 1/2 m v^2.
 * Uses |v|^2 so kinetic energy is always >= 0 regardless of velocity sign.
 */
export function computeKineticEnergy(massKg: number, speedOrVelMs: number): number {
  const m = Math.max(0, massKg);
  return 0.5 * m * speedOrVelMs * speedOrVelMs;
}

export interface ScalingTrackSolution {
  massKg: number;
  speedMs: number;
  kineticJ: number;
  refMassKg: number;
  refSpeedMs: number;
  refKineticJ: number;
  massRatio: number;
  speedRatio: number;
  speedRatioSquared: number;
  energyRatio: number;
  momentumKgMs: number;
  refMomentumKgMs: number;
  momentumRatio: number;
}

export function solveScalingTrack(
  massKg: number,
  speedMs: number,
  refMassKg: number,
  refSpeedMs: number,
): ScalingTrackSolution {
  const m = Math.max(0.1, massKg);
  const v = Math.abs(speedMs);
  const m0 = Math.max(0.1, refMassKg);
  const v0 = Math.max(0.1, Math.abs(refSpeedMs));

  const kineticJ = computeKineticEnergy(m, v);
  const refKineticJ = computeKineticEnergy(m0, v0);
  const massRatio = m / m0;
  const speedRatio = v / v0;
  const speedRatioSquared = speedRatio * speedRatio;
  const energyRatio = refKineticJ > 1e-9 ? kineticJ / refKineticJ : 0;

  const momentumKgMs = m * v;
  const refMomentumKgMs = m0 * v0;
  const momentumRatio = refMomentumKgMs > 1e-9 ? momentumKgMs / refMomentumKgMs : 0;

  return {
    massKg: m,
    speedMs: v,
    kineticJ,
    refMassKg: m0,
    refSpeedMs: v0,
    refKineticJ,
    massRatio,
    speedRatio,
    speedRatioSquared,
    energyRatio,
    momentumKgMs,
    refMomentumKgMs,
    momentumRatio,
  };
}

export interface ScalarArenaSolution {
  massKg: number;
  speedMs: number;
  headingDeg: number;
  headingRad: number;
  vxMs: number;
  vyMs: number;
  kineticJ: number;
  kxJ: number;
  kyJ: number;
  pxKgMs: number;
  pyKgMs: number;
  pMagKgMs: number;
  showTwoPuckSystem: boolean;
  sysTotalKineticJ: number;
  sysNetPx: number;
  sysNetPy: number;
  sysNetPMag: number;
}

export function solveScalarArena(
  massKg: number,
  speedMs: number,
  headingDeg: number,
  showTwoPuckSystem: boolean,
): ScalarArenaSolution {
  const m = Math.max(0.1, massKg);
  const v = Math.max(0, speedMs);
  const normDeg = ((headingDeg % 360) + 360) % 360;
  const rad = (normDeg * Math.PI) / 180;

  const vxMs = v * Math.cos(rad);
  const vyMs = v * Math.sin(rad);
  const kineticJ = computeKineticEnergy(m, v);
  const kxJ = computeKineticEnergy(m, vxMs);
  const kyJ = computeKineticEnergy(m, vyMs);
  const pxKgMs = m * vxMs;
  const pyKgMs = m * vyMs;
  const pMagKgMs = m * v;

  // Two identical pucks moving in opposite directions: p1 + p2 = 0, but K_sys = K1 + K2 = 2*K1
  const sysTotalKineticJ = showTwoPuckSystem ? 2 * kineticJ : kineticJ;
  const sysNetPx = showTwoPuckSystem ? 0 : pxKgMs;
  const sysNetPy = showTwoPuckSystem ? 0 : pyKgMs;
  const sysNetPMag = showTwoPuckSystem ? 0 : pMagKgMs;

  return {
    massKg: m,
    speedMs: v,
    headingDeg: normDeg,
    headingRad: rad,
    vxMs,
    vyMs,
    kineticJ,
    kxJ,
    kyJ,
    pxKgMs,
    pyKgMs,
    pMagKgMs,
    showTwoPuckSystem,
    sysTotalKineticJ,
    sysNetPx,
    sysNetPy,
    sysNetPMag,
  };
}

export interface ObserverFramesSolution {
  massKg: number;
  vObjRelEarthMs: number;
  vObsRelEarthMs: number;
  vObjRelObserverMs: number;
  vObjRelSelfMs: number;
  kEarthJ: number;
  kObserverJ: number;
  kSelfJ: number;
  kRatioObserverToEarth: number | null;
  isCoMoving: boolean;
  isOppositeDirection: boolean;
}

export function solveObserverFrames(
  massKg: number,
  vObjectEarthMs: number,
  vObserverEarthMs: number,
): ObserverFramesSolution {
  const m = Math.max(0.1, massKg);
  const vObjRelEarthMs = vObjectEarthMs;
  const vObsRelEarthMs = vObserverEarthMs;
  const vObjRelObserverMs = vObjRelEarthMs - vObsRelEarthMs;
  const vObjRelSelfMs = 0;

  const kEarthJ = computeKineticEnergy(m, vObjRelEarthMs);
  const kObserverJ = computeKineticEnergy(m, vObjRelObserverMs);
  const kSelfJ = 0;

  const kRatioObserverToEarth = kEarthJ > 1e-9 ? kObserverJ / kEarthJ : null;
  const isCoMoving = Math.abs(vObjRelObserverMs) < 0.05;
  const isOppositeDirection =
    Math.abs(vObjRelEarthMs) > 0.1 &&
    Math.abs(vObsRelEarthMs) > 0.1 &&
    vObjRelEarthMs * vObsRelEarthMs < 0;

  return {
    massKg: m,
    vObjRelEarthMs,
    vObsRelEarthMs,
    vObjRelObserverMs,
    vObjRelSelfMs,
    kEarthJ,
    kObserverJ,
    kSelfJ,
    kRatioObserverToEarth,
    isCoMoving,
    isOppositeDirection,
  };
}

export interface ScenarioCompareSolution {
  massAKg: number;
  velAMs: number;
  speedAMs: number;
  kAJ: number;
  pAKgMs: number;
  pMagA: number;
  massBKg: number;
  velBMs: number;
  speedBMs: number;
  kBJ: number;
  pBKgMs: number;
  pMagB: number;
  kRatioBtoA: number | null;
  mRatioBtoA: number;
  speedRatioBtoA: number | null;
  speedRatioSqBtoA: number | null;
  pMagRatioBtoA: number | null;
  winnerLabel: 'A' | 'B' | 'Equal';
  equalMomentumNote: boolean;
  oppositeDirSameSpeed: boolean;
}

export function solveScenarioCompare(
  massAKg: number,
  velAMs: number,
  massBKg: number,
  velBMs: number,
): ScenarioCompareSolution {
  const mA = Math.max(0.1, massAKg);
  const mB = Math.max(0.1, massBKg);
  const speedAMs = Math.abs(velAMs);
  const speedBMs = Math.abs(velBMs);

  const kAJ = computeKineticEnergy(mA, velAMs);
  const kBJ = computeKineticEnergy(mB, velBMs);
  const pAKgMs = mA * velAMs;
  const pBKgMs = mB * velBMs;
  const pMagA = Math.abs(pAKgMs);
  const pMagB = Math.abs(pBKgMs);

  const kRatioBtoA = kAJ > 1e-9 ? kBJ / kAJ : null;
  const mRatioBtoA = mB / mA;
  const speedRatioBtoA = speedAMs > 1e-9 ? speedBMs / speedAMs : null;
  const speedRatioSqBtoA =
    speedRatioBtoA !== null ? speedRatioBtoA * speedRatioBtoA : null;
  const pMagRatioBtoA = pMagA > 1e-9 ? pMagB / pMagA : null;

  const winnerLabel: 'A' | 'B' | 'Equal' =
    Math.abs(kAJ - kBJ) < 0.05 ? 'Equal' : kAJ > kBJ ? 'A' : 'B';

  const equalMomentumNote =
    pMagA > 0.2 && pMagB > 0.2 && Math.abs(pMagA - pMagB) / Math.max(pMagA, pMagB) < 0.03;
  const oppositeDirSameSpeed =
    speedAMs > 0.2 &&
    velAMs * velBMs < 0 &&
    Math.abs(speedAMs - speedBMs) < 0.15;

  return {
    massAKg: mA,
    velAMs,
    speedAMs,
    kAJ,
    pAKgMs,
    pMagA,
    massBKg: mB,
    velBMs,
    speedBMs,
    kBJ,
    pBKgMs,
    pMagB,
    kRatioBtoA,
    mRatioBtoA,
    speedRatioBtoA,
    speedRatioSqBtoA,
    pMagRatioBtoA,
    winnerLabel,
    equalMomentumNote,
    oppositeDirSameSpeed,
  };
}

export interface Kinetic31Evaluation {
  scaling: ScalingTrackSolution;
  arena: ScalarArenaSolution;
  frames: ObserverFramesSolution;
  compare: ScenarioCompareSolution;
  keyInsight: string;
}

export function evaluateKinetic31(params: Kinetic31Params): Kinetic31Evaluation {
  const scaling = solveScalingTrack(
    params.massKg,
    params.speedMs,
    params.refMassKg,
    params.refSpeedMs,
  );
  const arena = solveScalarArena(
    params.arenaMassKg,
    params.arenaSpeedMs,
    params.headingDeg,
    params.showTwoPuckSystem,
  );
  const frames = solveObserverFrames(
    params.frameMassKg,
    params.vObjectEarthMs,
    params.vObserverEarthMs,
  );
  const compare = solveScenarioCompare(
    params.massAKg,
    params.velAMs,
    params.massBKg,
    params.velBMs,
  );

  let keyInsight = '';
  if (params.mode === 'scaling_track') {
    keyInsight = `EK 3.1.A.1: K = ½mv² = ${scaling.kineticJ.toFixed(1)} J (${scaling.energyRatio.toFixed(2)}× ref K₀). Changing m scales K by ${scaling.massRatio.toFixed(2)}×, while changing v scales K quadratically by (v/v₀)² = ${scaling.speedRatioSquared.toFixed(2)}×.`;
  } else if (params.mode === 'scalar_arena') {
    keyInsight = arena.showTwoPuckSystem
      ? `EK 3.1.A.2 Scalar Proof: Two opposite pucks have net momentum p_sys = 0 kg·m/s, yet scalar kinetic energies add positively: K_sys = K₁ + K₂ = ${arena.sysTotalKineticJ.toFixed(1)} J!`
      : `EK 3.1.A.2 Scalar Invariance: At θ = ${arena.headingDeg.toFixed(0)}°, vector components v_x=${arena.vxMs.toFixed(2)} and v_y=${arena.vyMs.toFixed(2)} m/s change sign/split, but K = K_x + K_y = ${arena.kineticJ.toFixed(1)} J remains invariant.`;
  } else if (params.mode === 'observer_frames') {
    keyInsight = frames.isCoMoving
      ? `EK 3.1.A.3 Co-Moving Observer: Observer O matches Object P's velocity (v_P/O = 0 m/s), so O measures K_P/O = 0 J while Earth measures K_P/E = ${frames.kEarthJ.toFixed(1)} J.`
      : `EK 3.1.A.3 Frame Dependence: Earth measures v_P/E = ${frames.vObjRelEarthMs.toFixed(1)} m/s (K_P/E = ${frames.kEarthJ.toFixed(1)} J), whereas Observer O measures v_P/O = ${frames.vObjRelObserverMs.toFixed(1)} m/s (K_P/O = ${frames.kObserverJ.toFixed(1)} J).`;
  } else {
    if (compare.equalMomentumNote) {
      keyInsight = `Skill 2.C Equal-Momentum Comparison: |p_A| ≈ |p_B| ≈ ${compare.pMagA.toFixed(1)} kg·m/s, yet K = p²/(2m) gives the lighter cart (${compare.massAKg < compare.massBKg ? 'A' : 'B'}) strictly larger kinetic energy!`;
    } else if (compare.oppositeDirSameSpeed) {
      keyInsight = `Skill 2.C + EK 3.1.A.2: Opposite velocity directions (+${compare.speedAMs.toFixed(1)} vs -${compare.speedBMs.toFixed(1)} m/s) square to the same v²; only mass decides K_A (${compare.kAJ.toFixed(1)} J) vs K_B (${compare.kBJ.toFixed(1)} J).`;
    } else {
      keyInsight = `Skill 2.C Comparison: K_A = ${compare.kAJ.toFixed(1)} J vs K_B = ${compare.kBJ.toFixed(1)} J (${compare.kRatioBtoA !== null ? `K_B/K_A = ${compare.kRatioBtoA.toFixed(2)}×` : 'K_A = 0'}). Speed enters quadratically while mass enters linearly.`;
    }
  }

  return { scaling, arena, frames, compare, keyInsight };
}

/* ========================================================================== */
/* CHART & GRAPH BUILDERS (SUGGESTED SKILL 1.C)                               */
/* ========================================================================== */

export interface ChartDataPoint {
  x: number;
  y: number;
}

export interface ChartRefLine {
  axis: 'x' | 'y';
  value: number;
  label: string;
  color: string;
}

export interface KineticChartData {
  title: string;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  curveA: ChartDataPoint[];
  curveB?: ChartDataPoint[];
  curveALabel: string;
  curveBLabel?: string;
  currentPoint: ChartDataPoint;
  secondaryPoint?: ChartDataPoint;
  refLines: ChartRefLine[];
  qualitativeTakeaway: string;
}

export interface KineticTrialPoint {
  id: string;
  mode: Kinetic31Mode;
  label: string;
  xPrimary: number;
  yPrimary: number;
  xSecondary: number;
  ySecondary: number;
  xTertiary: number;
  yTertiary: number;
}

export const INITIAL_KINETIC_TRIALS_31: KineticTrialPoint[] = [
  {
    id: 'init-scale-1',
    mode: 'scaling_track',
    label: 'm=2kg, v=5m/s',
    xPrimary: 5,
    yPrimary: 25,
    xSecondary: 25,
    ySecondary: 25,
    xTertiary: 2,
    yTertiary: 25,
  },
  {
    id: 'init-scale-2',
    mode: 'scaling_track',
    label: 'm=2kg, v=10m/s',
    xPrimary: 10,
    yPrimary: 100,
    xSecondary: 100,
    ySecondary: 100,
    xTertiary: 2,
    yTertiary: 100,
  },
];

export function getChartTabLabels31(
  mode: Kinetic31Mode,
): Array<{ id: Kinetic31ChartKind; label: string }> {
  if (mode === 'scaling_track') {
    return [
      { id: 'primary', label: 'K vs v' },
      { id: 'secondary', label: 'K vs v²' },
      { id: 'tertiary', label: 'K vs m' },
    ];
  }
  if (mode === 'scalar_arena') {
    return [
      { id: 'primary', label: 'K vs θ' },
      { id: 'secondary', label: 'vₓ, vᵧ vs θ' },
      { id: 'tertiary', label: 'Kₓ, Kᵧ vs θ' },
    ];
  }
  if (mode === 'observer_frames') {
    return [
      { id: 'primary', label: 'K_P/O vs v_O' },
      { id: 'secondary', label: 'v_P/O vs v_O' },
      { id: 'tertiary', label: 'K vs v_rel²' },
    ];
  }
  return [
    { id: 'primary', label: 'K(v) A vs B' },
    { id: 'secondary', label: 'K vs p' },
    { id: 'tertiary', label: 'K(m) A vs B' },
  ];
}

export function buildKineticChartData31(
  params: Kinetic31Params,
  evaluation: Kinetic31Evaluation,
  kind: Kinetic31ChartKind,
): KineticChartData {
  if (params.mode === 'scaling_track') {
    const s = evaluation.scaling;
    if (kind === 'primary') {
      const yMax = Math.max(120, computeKineticEnergy(s.massKg, 15) * 1.08);
      const curveA: ChartDataPoint[] = [];
      const curveB: ChartDataPoint[] = [];
      for (let i = 0; i <= 40; i++) {
        const v = (i / 40) * 15;
        curveA.push({ x: v, y: computeKineticEnergy(s.massKg, v) });
        curveB.push({ x: v, y: computeKineticEnergy(s.refMassKg, v) });
      }
      return {
        title: 'Translational Kinetic Energy vs Speed K(v)',
        xLabel: 'Speed v (m/s)',
        yLabel: 'Kinetic Energy K (J)',
        xMin: 0,
        xMax: 15,
        yMin: 0,
        yMax,
        curveA,
        curveB,
        curveALabel: `Current (m=${s.massKg.toFixed(1)} kg)`,
        curveBLabel: `Ref (m₀=${s.refMassKg.toFixed(1)} kg)`,
        currentPoint: { x: s.speedMs, y: s.kineticJ },
        secondaryPoint: { x: s.refSpeedMs, y: s.refKineticJ },
        refLines: [
          { axis: 'x', value: s.refSpeedMs, label: `v₀=${s.refSpeedMs.toFixed(1)}`, color: '#f59e0b' },
        ],
        qualitativeTakeaway:
          'K(v) = ½mv² is a concave-up parabola through the origin (0,0) with slope dK/dv = mv. Doubling v quadruples K.',
      };
    }
    if (kind === 'secondary') {
      const v2Max = 225;
      const yMax = Math.max(120, computeKineticEnergy(s.massKg, 15) * 1.08);
      const curveA: ChartDataPoint[] = [
        { x: 0, y: 0 },
        { x: v2Max, y: 0.5 * s.massKg * v2Max },
      ];
      return {
        title: 'Linearized Graph: K vs v² (Slope = ½m)',
        xLabel: 'Speed Squared v² (m²/s²)',
        yLabel: 'Kinetic Energy K (J)',
        xMin: 0,
        xMax: v2Max,
        yMin: 0,
        yMax,
        curveA,
        curveALabel: `Slope = ½m = ${(0.5 * s.massKg).toFixed(2)} kg`,
        currentPoint: { x: s.speedMs * s.speedMs, y: s.kineticJ },
        secondaryPoint: { x: s.refSpeedMs * s.refSpeedMs, y: s.refKineticJ },
        refLines: [],
        qualitativeTakeaway:
          'Plotting K against v² produces a straight line through the origin whose constant slope equals ½m (Skill 1.C / AP lab linearization).',
      };
    }
    // tertiary: K vs m
    const yMax = Math.max(120, computeKineticEnergy(10, s.speedMs) * 1.08);
    const curveA: ChartDataPoint[] = [
      { x: 0, y: 0 },
      { x: 10, y: computeKineticEnergy(10, s.speedMs) },
    ];
    return {
      title: 'Kinetic Energy vs Mass K(m) at Fixed Speed',
      xLabel: 'Mass m (kg)',
      yLabel: 'Kinetic Energy K (J)',
      xMin: 0,
      xMax: 10,
      yMin: 0,
      yMax,
      curveA,
      curveALabel: `Slope = ½v² = ${(0.5 * s.speedMs * s.speedMs).toFixed(1)} J/kg`,
      currentPoint: { x: s.massKg, y: s.kineticJ },
      secondaryPoint: { x: s.refMassKg, y: s.refKineticJ },
      refLines: [],
      qualitativeTakeaway:
        'At fixed speed v, K(m) is directly proportional to mass (a straight line through the origin with slope ½v²).',
    };
  }

  if (params.mode === 'scalar_arena') {
    const a = evaluation.arena;
    if (kind === 'primary') {
      const yMax = Math.max(40, a.kineticJ * 1.45);
      const curveA: ChartDataPoint[] = [
        { x: 0, y: a.kineticJ },
        { x: 360, y: a.kineticJ },
      ];
      return {
        title: 'Scalar Invariance: K vs Heading Angle θ',
        xLabel: 'Velocity Angle θ (deg)',
        yLabel: 'Kinetic Energy K (J)',
        xMin: 0,
        xMax: 360,
        yMin: 0,
        yMax,
        curveA,
        curveALabel: `K = ${a.kineticJ.toFixed(1)} J (constant)`,
        currentPoint: { x: a.headingDeg, y: a.kineticJ },
        refLines: [
          { axis: 'y', value: a.kineticJ, label: `K=${a.kineticJ.toFixed(1)}J`, color: '#34d399' },
        ],
        qualitativeTakeaway:
          'EK 3.1.A.2: Because kinetic energy depends only on speed squared (v² = v_x² + v_y²), K(θ) is a flat horizontal line—never negative, never zero unless v = 0.',
      };
    }
    if (kind === 'secondary') {
      const vBound = Math.max(4, a.speedMs * 1.25);
      const curveA: ChartDataPoint[] = [];
      const curveB: ChartDataPoint[] = [];
      for (let deg = 0; deg <= 360; deg += 9) {
        const rad = (deg * Math.PI) / 180;
        curveA.push({ x: deg, y: a.speedMs * Math.cos(rad) });
        curveB.push({ x: deg, y: a.speedMs * Math.sin(rad) });
      }
      return {
        title: 'Velocity Components v_x(θ) & v_y(θ) Change Sign',
        xLabel: 'Velocity Angle θ (deg)',
        yLabel: 'Velocity Component (m/s)',
        xMin: 0,
        xMax: 360,
        yMin: -vBound,
        yMax: vBound,
        curveA,
        curveB,
        curveALabel: 'v_x = v cosθ',
        curveBLabel: 'v_y = v sinθ',
        currentPoint: { x: a.headingDeg, y: a.vxMs },
        secondaryPoint: { x: a.headingDeg, y: a.vyMs },
        refLines: [{ axis: 'y', value: 0, label: '0 m/s', color: '#64748b' }],
        qualitativeTakeaway:
          'Vector velocity components oscillate smoothly between +v and -v as heading θ rotates, unlike scalar K which remains positive.',
      };
    }
    // tertiary: K_x, K_y vs theta
    const yMax = Math.max(20, a.kineticJ * 1.2);
    const curveA: ChartDataPoint[] = [];
    const curveB: ChartDataPoint[] = [];
    for (let deg = 0; deg <= 360; deg += 9) {
      const rad = (deg * Math.PI) / 180;
      const vx = a.speedMs * Math.cos(rad);
      const vy = a.speedMs * Math.sin(rad);
      curveA.push({ x: deg, y: computeKineticEnergy(a.massKg, vx) });
      curveB.push({ x: deg, y: computeKineticEnergy(a.massKg, vy) });
    }
    return {
      title: 'Component Contributions K_x + K_y = K',
      xLabel: 'Velocity Angle θ (deg)',
      yLabel: 'Component Energy (J)',
      xMin: 0,
      xMax: 360,
      yMin: 0,
      yMax,
      curveA,
      curveB,
      curveALabel: 'K_x = ½mv_x²',
      curveBLabel: 'K_y = ½mv_y²',
      currentPoint: { x: a.headingDeg, y: a.kxJ },
      secondaryPoint: { x: a.headingDeg, y: a.kyJ },
      refLines: [
        { axis: 'y', value: a.kineticJ, label: `K_tot=${a.kineticJ.toFixed(1)}J`, color: '#34d399' },
      ],
      qualitativeTakeaway:
        'Using K_x = ½mv_x² and K_y = ½mv_y², energy trades smoothly between axes via cos²θ + sin²θ = 1 so K_x + K_y = K everywhere.',
    };
  }

  if (params.mode === 'observer_frames') {
    const f = evaluation.frames;
    if (kind === 'primary') {
      const maxRel = Math.max(
        Math.abs(12 - f.vObjRelEarthMs),
        Math.abs(-12 - f.vObjRelEarthMs),
        12,
      );
      const yMax = Math.max(80, computeKineticEnergy(f.massKg, maxRel) * 1.05);
      const curveA: ChartDataPoint[] = [];
      for (let i = 0; i <= 48; i++) {
        const vObs = -12 + (i / 48) * 24;
        curveA.push({
          x: vObs,
          y: computeKineticEnergy(f.massKg, f.vObjRelEarthMs - vObs),
        });
      }
      return {
        title: 'Observer-Measured Kinetic Energy K_P/O vs v_O/E',
        xLabel: 'Observer Velocity v_O/E (m/s)',
        yLabel: 'Measured K_P/O (J)',
        xMin: -12,
        xMax: 12,
        yMin: 0,
        yMax,
        curveA,
        curveALabel: 'K_P/O = ½m(v_P/E − v_O/E)²',
        currentPoint: { x: f.vObsRelEarthMs, y: f.kObserverJ },
        secondaryPoint: { x: 0, y: f.kEarthJ },
        refLines: [
          {
            axis: 'x',
            value: f.vObjRelEarthMs,
            label: `Co-moving v_O=${f.vObjRelEarthMs.toFixed(1)}`,
            color: '#f59e0b',
          },
          {
            axis: 'x',
            value: 0,
            label: 'Earth E',
            color: '#38bdf8',
          },
        ],
        qualitativeTakeaway:
          'EK 3.1.A.3: The parabola vertex touches K_P/O = 0 at v_O/E = v_P/E (co-moving observer) and grows quadratically as relative speed increases.',
      };
    }
    if (kind === 'secondary') {
      const curveA: ChartDataPoint[] = [
        { x: -12, y: f.vObjRelEarthMs - -12 },
        { x: 12, y: f.vObjRelEarthMs - 12 },
      ];
      return {
        title: 'Galilean Relative Velocity v_P/O = v_P/E − v_O/E',
        xLabel: 'Observer Velocity v_O/E (m/s)',
        yLabel: 'Relative Velocity v_P/O (m/s)',
        xMin: -12,
        xMax: 12,
        yMin: -24,
        yMax: 24,
        curveA,
        curveALabel: 'v_P/O (slope = -1)',
        currentPoint: { x: f.vObsRelEarthMs, y: f.vObjRelObserverMs },
        secondaryPoint: { x: 0, y: f.vObjRelEarthMs },
        refLines: [
          { axis: 'y', value: 0, label: 'v_P/O = 0', color: '#f59e0b' },
        ],
        qualitativeTakeaway:
          'Relative velocity varies linearly with slope -1 as observer speed increases, crossing zero when the observer matches the object.',
      };
    }
    // tertiary: K vs v_rel^2
    const maxRelSq = 24 * 24;
    const yMax = Math.max(100, computeKineticEnergy(f.massKg, 24) * 1.05);
    const curveA: ChartDataPoint[] = [
      { x: 0, y: 0 },
      { x: maxRelSq, y: computeKineticEnergy(f.massKg, 24) },
    ];
    return {
      title: 'Frame Linearization: K_P/O vs |v_P/O|²',
      xLabel: 'Relative Speed Squared |v_P/O|² (m²/s²)',
      yLabel: 'Measured Kinetic Energy (J)',
      xMin: 0,
      xMax: maxRelSq,
      yMin: 0,
      yMax,
      curveA,
      curveALabel: 'Slope = ½m',
      currentPoint: {
        x: f.vObjRelObserverMs * f.vObjRelObserverMs,
        y: f.kObserverJ,
      },
      secondaryPoint: {
        x: f.vObjRelEarthMs * f.vObjRelEarthMs,
        y: f.kEarthJ,
      },
      refLines: [],
      qualitativeTakeaway:
        'Both Earth E (amber) and Observer O (emerald) lie on the same K = ½m v_rel² line—their K differs only because v_rel differs.',
    };
  }

  // scenario_compare
  const c = evaluation.compare;
  if (kind === 'primary') {
    const yMax = Math.max(
      100,
      computeKineticEnergy(c.massAKg, 15),
      computeKineticEnergy(c.massBKg, 15),
    );
    const curveA: ChartDataPoint[] = [];
    const curveB: ChartDataPoint[] = [];
    for (let i = 0; i <= 48; i++) {
      const v = -15 + (i / 48) * 30;
      curveA.push({ x: v, y: computeKineticEnergy(c.massAKg, v) });
      curveB.push({ x: v, y: computeKineticEnergy(c.massBKg, v) });
    }
    return {
      title: 'Symmetric K(v) Parabolas: Cart A vs Cart B',
      xLabel: 'Velocity v (m/s)',
      yLabel: 'Kinetic Energy K (J)',
      xMin: -15,
      xMax: 15,
      yMin: 0,
      yMax: yMax * 1.05,
      curveA,
      curveB,
      curveALabel: `Cart A (m=${c.massAKg.toFixed(1)}kg)`,
      curveBLabel: `Cart B (m=${c.massBKg.toFixed(1)}kg)`,
      currentPoint: { x: c.velAMs, y: c.kAJ },
      secondaryPoint: { x: c.velBMs, y: c.kBJ },
      refLines: [{ axis: 'x', value: 0, label: 'v=0', color: '#64748b' }],
      qualitativeTakeaway:
        'Both K(v) parabolas are symmetric about v = 0 (showing K ≥ 0 for both +v and -v); the larger mass has the steeper parabola.',
    };
  }
  if (kind === 'secondary') {
    const pMax = Math.max(40, c.pMagA * 1.3, c.pMagB * 1.3);
    const yMax = Math.max(
      80,
      (pMax * pMax) / (2 * c.massAKg),
      (pMax * pMax) / (2 * c.massBKg),
      c.kAJ * 1.2,
      c.kBJ * 1.2,
    );
    const curveA: ChartDataPoint[] = [];
    const curveB: ChartDataPoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const p = (i / 40) * pMax;
      curveA.push({ x: p, y: (p * p) / (2 * c.massAKg) });
      curveB.push({ x: p, y: (p * p) / (2 * c.massBKg) });
    }
    return {
      title: 'Equal Momentum Comparison: K = p² / (2m)',
      xLabel: 'Momentum Magnitude |p| (kg·m/s)',
      yLabel: 'Kinetic Energy K (J)',
      xMin: 0,
      xMax: pMax,
      yMin: 0,
      yMax: Math.min(yMax * 1.05, 1600),
      curveA,
      curveB,
      curveALabel: `Cart A (1/2m_A)`,
      curveBLabel: `Cart B (1/2m_B)`,
      currentPoint: { x: c.pMagA, y: c.kAJ },
      secondaryPoint: { x: c.pMagB, y: c.kBJ },
      refLines: [],
      qualitativeTakeaway:
        'At fixed momentum p, K = p²/(2m) is inversely proportional to mass—so the lighter object carries higher kinetic energy!',
    };
  }
  // tertiary: K vs m at v_A and v_B
  const yMax = Math.max(
    80,
    computeKineticEnergy(10, c.speedAMs),
    computeKineticEnergy(10, c.speedBMs),
  );
  const curveA: ChartDataPoint[] = [
    { x: 0, y: 0 },
    { x: 10, y: computeKineticEnergy(10, c.speedAMs) },
  ];
  const curveB: ChartDataPoint[] = [
    { x: 0, y: 0 },
    { x: 10, y: computeKineticEnergy(10, c.speedBMs) },
  ];
  return {
    title: 'K vs Mass Lines at v_A and v_B',
    xLabel: 'Mass m (kg)',
    yLabel: 'Kinetic Energy K (J)',
    xMin: 0,
    xMax: 10,
    yMin: 0,
    yMax: yMax * 1.05,
    curveA,
    curveB,
    curveALabel: `|v_A|=${c.speedAMs.toFixed(1)} m/s`,
    curveBLabel: `|v_B|=${c.speedBMs.toFixed(1)} m/s`,
    currentPoint: { x: c.massAKg, y: c.kAJ },
    secondaryPoint: { x: c.massBKg, y: c.kBJ },
    refLines: [],
    qualitativeTakeaway:
      'Because slope = ½v², a higher speed produces a quadratically steeper K(m) line than a lower speed.',
  };
}

/* ========================================================================== */
/* COMPARISON TABLE BUILDER (SKILL 2.C)                                       */
/* ========================================================================== */

export interface ComparisonRow31 {
  quantity: string;
  colALabel: string;
  colAValue: string;
  colBLabel: string;
  colBValue: string;
  relation: string;
}

export function buildComparisonRows31(
  params: Kinetic31Params,
  evaluation: Kinetic31Evaluation,
): ComparisonRow31[] {
  if (params.mode === 'scaling_track') {
    const s = evaluation.scaling;
    return [
      {
        quantity: 'Mass m',
        colALabel: 'Current',
        colAValue: `${s.massKg.toFixed(2)} kg`,
        colBLabel: 'Ref',
        colBValue: `${s.refMassKg.toFixed(2)} kg`,
        relation: `${s.massRatio.toFixed(2)}×`,
      },
      {
        quantity: 'Speed v',
        colALabel: 'Current',
        colAValue: `${s.speedMs.toFixed(2)} m/s`,
        colBLabel: 'Ref',
        colBValue: `${s.refSpeedMs.toFixed(2)} m/s`,
        relation: `${s.speedRatio.toFixed(2)}×`,
      },
      {
        quantity: 'v² Factor',
        colALabel: 'Current',
        colAValue: `${(s.speedMs * s.speedMs).toFixed(1)}`,
        colBLabel: 'Ref',
        colBValue: `${(s.refSpeedMs * s.refSpeedMs).toFixed(1)}`,
        relation: `${s.speedRatioSquared.toFixed(2)}×`,
      },
      {
        quantity: 'Kinetic Energy K',
        colALabel: 'Current',
        colAValue: `${s.kineticJ.toFixed(1)} J`,
        colBLabel: 'Ref',
        colBValue: `${s.refKineticJ.toFixed(1)} J`,
        relation: `${s.energyRatio.toFixed(2)}×`,
      },
    ];
  }

  if (params.mode === 'scalar_arena') {
    const a = evaluation.arena;
    return [
      {
        quantity: 'x-Contribution',
        colALabel: 'v_x',
        colAValue: `${a.vxMs.toFixed(2)} m/s`,
        colBLabel: 'K_x',
        colBValue: `${a.kxJ.toFixed(1)} J`,
        relation: `${((a.kxJ / Math.max(1e-6, a.kineticJ)) * 100).toFixed(0)}% of K`,
      },
      {
        quantity: 'y-Contribution',
        colALabel: 'v_y',
        colAValue: `${a.vyMs.toFixed(2)} m/s`,
        colBLabel: 'K_y',
        colBValue: `${a.kyJ.toFixed(1)} J`,
        relation: `${((a.kyJ / Math.max(1e-6, a.kineticJ)) * 100).toFixed(0)}% of K`,
      },
      {
        quantity: 'Single Puck',
        colALabel: '|p|',
        colAValue: `${a.pMagKgMs.toFixed(1)} kg·m/s`,
        colBLabel: 'K',
        colBValue: `${a.kineticJ.toFixed(1)} J`,
        relation: 'K = K_x + K_y',
      },
      {
        quantity: a.showTwoPuckSystem ? '2-Puck System' : 'Heading Invariance',
        colALabel: '|p_sys|',
        colAValue: `${a.sysNetPMag.toFixed(1)} kg·m/s`,
        colBLabel: 'K_sys',
        colBValue: `${a.sysTotalKineticJ.toFixed(1)} J`,
        relation: a.showTwoPuckSystem ? 'p_net=0, K>0' : `θ=${a.headingDeg.toFixed(0)}°`,
      },
    ];
  }

  if (params.mode === 'observer_frames') {
    const f = evaluation.frames;
    return [
      {
        quantity: 'Relative Velocity',
        colALabel: 'Earth E',
        colAValue: `${f.vObjRelEarthMs.toFixed(1)} m/s`,
        colBLabel: 'Observer O',
        colBValue: `${f.vObjRelObserverMs.toFixed(1)} m/s`,
        relation: `Δv = ${(-f.vObsRelEarthMs).toFixed(1)}`,
      },
      {
        quantity: 'Relative Speed |v|',
        colALabel: 'Earth E',
        colAValue: `${Math.abs(f.vObjRelEarthMs).toFixed(1)} m/s`,
        colBLabel: 'Observer O',
        colBValue: `${Math.abs(f.vObjRelObserverMs).toFixed(1)} m/s`,
        relation: 'Frame-dependent',
      },
      {
        quantity: 'Kinetic Energy K',
        colALabel: 'K_P/E',
        colAValue: `${f.kEarthJ.toFixed(1)} J`,
        colBLabel: 'K_P/O',
        colBValue: `${f.kObserverJ.toFixed(1)} J`,
        relation:
          f.kRatioObserverToEarth !== null
            ? `${f.kRatioObserverToEarth.toFixed(2)}×`
            : 'Ref = 0 J',
      },
      {
        quantity: "Object's Own Frame",
        colALabel: 'v_P/P',
        colAValue: '0.0 m/s',
        colBLabel: 'K_P/P',
        colBValue: '0.0 J',
        relation: 'Always 0 in self frame',
      },
    ];
  }

  const c = evaluation.compare;
  return [
    {
      quantity: 'Mass m',
      colALabel: 'Cart A',
      colAValue: `${c.massAKg.toFixed(2)} kg`,
      colBLabel: 'Cart B',
      colBValue: `${c.massBKg.toFixed(2)} kg`,
      relation: `B/A = ${c.mRatioBtoA.toFixed(2)}×`,
    },
    {
      quantity: 'Velocity v',
      colALabel: 'Cart A',
      colAValue: `${c.velAMs.toFixed(1)} m/s`,
      colBLabel: 'Cart B',
      colBValue: `${c.velBMs.toFixed(1)} m/s`,
      relation:
        c.speedRatioBtoA !== null
          ? `|v_B|/|v_A| = ${c.speedRatioBtoA.toFixed(2)}×`
          : 'v_A = 0',
    },
    {
      quantity: 'Momentum |p|',
      colALabel: 'Cart A',
      colAValue: `${c.pMagA.toFixed(1)} kg·m/s`,
      colBLabel: 'Cart B',
      colBValue: `${c.pMagB.toFixed(1)} kg·m/s`,
      relation:
        c.pMagRatioBtoA !== null
          ? `B/A = ${c.pMagRatioBtoA.toFixed(2)}×`
          : 'p_A = 0',
    },
    {
      quantity: 'Kinetic Energy K',
      colALabel: 'Cart A',
      colAValue: `${c.kAJ.toFixed(1)} J`,
      colBLabel: 'Cart B',
      colBValue: `${c.kBJ.toFixed(1)} J`,
      relation:
        c.kRatioBtoA !== null
          ? `B/A = ${c.kRatioBtoA.toFixed(2)}×`
          : 'K_A = 0',
    },
  ];
}

/* ========================================================================== */
/* MODEL APPLICATION & DERIVATION STEPS (SUGGESTED SKILL 3.B)                 */
/* ========================================================================== */

export interface DerivationStep31 {
  step: number;
  title: string;
  equation: string;
  note: string;
}

export function buildDerivationSteps31(
  params: Kinetic31Params,
  evaluation: Kinetic31Evaluation,
): DerivationStep31[] {
  if (params.mode === 'scaling_track') {
    const s = evaluation.scaling;
    return [
      {
        step: 1,
        title: 'Define Translational Kinetic Energy (3.1.A.1)',
        equation: 'K = ½ m v²',
        note: 'Applies to an object of mass m moving with translational speed v (in Joules, 1 J = 1 kg·m²/s²).',
      },
      {
        step: 2,
        title: 'Substitute Current Mass & Speed',
        equation: `K = ½ (${s.massKg.toFixed(2)} kg)(${s.speedMs.toFixed(2)} m/s)² = ${s.kineticJ.toFixed(2)} J`,
        note: `Reference baseline K₀ = ½(${s.refMassKg.toFixed(2)})(${s.refSpeedMs.toFixed(2)})² = ${s.refKineticJ.toFixed(2)} J.`,
      },
      {
        step: 3,
        title: 'Factor Scaling Ratio K / K₀',
        equation: `K / K₀ = (m/m₀)(v/v₀)² = (${s.massRatio.toFixed(2)})(${s.speedRatio.toFixed(2)})² = ${s.energyRatio.toFixed(2)}`,
        note: 'Mass enters linearly (exponent 1) while speed enters quadratically (exponent 2).',
      },
      {
        step: 4,
        title: 'Connect to Momentum p = mv',
        equation: `K = p² / (2m) = (${s.momentumKgMs.toFixed(1)})² / (2·${s.massKg.toFixed(1)}) = ${s.kineticJ.toFixed(2)} J`,
        note: 'Useful when comparing objects that share equal momentum or impulse.',
      },
    ];
  }

  if (params.mode === 'scalar_arena') {
    const a = evaluation.arena;
    return [
      {
        step: 1,
        title: 'Scalar Property (3.1.A.2)',
        equation: 'K = ½ m |v|² = ½ m (v·v) ≥ 0',
        note: 'Kinetic energy is a scalar quantity—it has magnitude and units (J) but no direction.',
      },
      {
        step: 2,
        title: 'Decompose into Orthogonal Components',
        equation: `v_x = ${a.vxMs.toFixed(2)} m/s,  v_y = ${a.vyMs.toFixed(2)} m/s`,
        note: `At heading θ = ${a.headingDeg.toFixed(0)}°, v_x² + v_y² = v²(${Math.cos(a.headingRad).toFixed(2)}² + ${Math.sin(a.headingRad).toFixed(2)}²) = ${(a.speedMs * a.speedMs).toFixed(2)} m²/s².`,
      },
      {
        step: 3,
        title: 'Sum Positive Component Energies',
        equation: `K = K_x + K_y = ${a.kxJ.toFixed(2)} J + ${a.kyJ.toFixed(2)} J = ${a.kineticJ.toFixed(2)} J`,
        note: 'Squaring eliminates negative signs on velocity components, guaranteeing K ≥ 0.',
      },
      {
        step: 4,
        title: 'Multi-Object System Sum',
        equation: a.showTwoPuckSystem
          ? `p_sys = p₁ + p₂ = 0,  K_sys = K₁ + K₂ = ${a.sysTotalKineticJ.toFixed(2)} J`
          : `Toggle "2-Puck Opposite System" to verify Σp = 0 while ΣK > 0`,
        note: 'Unlike vector momentum, kinetic energies of moving objects never cancel one another.',
      },
    ];
  }

  if (params.mode === 'observer_frames') {
    const f = evaluation.frames;
    return [
      {
        step: 1,
        title: 'Galilean Relative Velocity',
        equation: `v_P/O = v_P/E − v_O/E = ${f.vObjRelEarthMs.toFixed(1)} − (${f.vObsRelEarthMs.toFixed(1)}) = ${f.vObjRelObserverMs.toFixed(1)} m/s`,
        note: 'Different inertial observers measure different velocities of the same object P.',
      },
      {
        step: 2,
        title: 'Kinetic Energy in Earth Frame E (3.1.A.3)',
        equation: `K_P/E = ½ m v_P/E² = ½(${f.massKg.toFixed(1)})(${f.vObjRelEarthMs.toFixed(1)})² = ${f.kEarthJ.toFixed(2)} J`,
        note: 'Measured relative to the stationary ground station E.',
      },
      {
        step: 3,
        title: 'Kinetic Energy in Observer Frame O (3.1.A.3)',
        equation: `K_P/O = ½ m v_P/O² = ½(${f.massKg.toFixed(1)})(${f.vObjRelObserverMs.toFixed(1)})² = ${f.kObserverJ.toFixed(2)} J`,
        note: f.isCoMoving
          ? 'Because O moves with P (v_O/E = v_P/E), O measures zero kinetic energy!'
          : 'Kinetic energy is NOT frame-invariant—always specify the reference frame.',
      },
      {
        step: 4,
        title: 'Frame-Dependence Ratio',
        equation:
          f.kRatioObserverToEarth !== null
            ? `K_P/O / K_P/E = (v_P/O / v_P/E)² = ${f.kRatioObserverToEarth.toFixed(2)}`
            : 'K_P/E = 0 J while K_P/O > 0 J whenever v_O/E ≠ 0',
        note: 'Even an object at rest on Earth has nonzero K to a passing observer.',
      },
    ];
  }

  const c = evaluation.compare;
  return [
    {
      step: 1,
      title: 'Apply K = ½ m v² to Each Scenario',
      equation: `K_A = ½(${c.massAKg.toFixed(1)})(${c.velAMs.toFixed(1)})² = ${c.kAJ.toFixed(1)} J  |  K_B = ½(${c.massBKg.toFixed(1)})(${c.velBMs.toFixed(1)})² = ${c.kBJ.toFixed(1)} J`,
      note: 'Negative velocity signs vanish upon squaring: (-v)² = (+v)².',
    },
    {
      step: 2,
      title: 'Compute Direct Energy Ratio (Skill 2.C)',
      equation:
        c.kRatioBtoA !== null
          ? `K_B / K_A = (m_B/m_A)(v_B/v_A)² = (${c.mRatioBtoA.toFixed(2)})(${(c.speedRatioSqBtoA ?? 0).toFixed(2)}) = ${c.kRatioBtoA.toFixed(2)}`
          : `K_A = 0 J, K_B = ${c.kBJ.toFixed(1)} J`,
      note: 'Express ratios symbolically before plugging in numbers to avoid arithmetic slips.',
    },
    {
      step: 3,
      title: 'Compare Equal-Momentum Cases via K = p²/(2m)',
      equation: `p_A = ${c.pAKgMs.toFixed(1)} kg·m/s,  p_B = ${c.pBKgMs.toFixed(1)} kg·m/s`,
      note: 'If |p_A| = |p_B|, then K_B / K_A = m_A / m_B (lighter object has more kinetic energy).',
    },
    {
      step: 4,
      title: 'Determine Dominant Factor (3.1.A.1)',
      equation:
        c.winnerLabel === 'Equal'
          ? 'K_A = K_B (Equal translational kinetic energy)'
          : `Cart ${c.winnerLabel} has greater K by ${Math.abs(c.kAJ - c.kBJ).toFixed(1)} J`,
      note: 'Velocity differences usually dominate mass differences because v is squared.',
    },
  ];
}

/* ========================================================================== */
/* INTERACTIVE ASSESSMENT BANKS (SKILLS 1.C, 2.C, 3.B, 3.C)                   */
/* ========================================================================== */

export interface SketchChallenge31 {
  id: string;
  ek: string;
  prompt: string;
  options: Array<{
    label: string;
    shape: 'parabola_origin' | 'line_origin' | 'flat_const' | 'shifted_parabola' | 'inv_curve';
  }>;
  correctIndex: number;
  explanation: string;
}

export const SKETCH_CHALLENGES_31: SketchChallenge31[] = [
  {
    id: 'sk-1',
    ek: '3.1.A.1 / 1.C',
    prompt: 'Which qualitative graph represents kinetic energy K as a function of speed v for a constant-mass cart?',
    options: [
      { label: 'Linear through origin', shape: 'line_origin' },
      { label: 'Upward parabola from (0,0)', shape: 'parabola_origin' },
      { label: 'Horizontal flat line', shape: 'flat_const' },
      { label: 'Decreasing 1/v curve', shape: 'inv_curve' },
    ],
    correctIndex: 1,
    explanation: 'K = ½mv² is quadratic in v: K = 0 at v = 0 and curves upward with increasing slope dK/dv = mv.',
  },
  {
    id: 'sk-2',
    ek: '3.1.A.1 / 1.C',
    prompt: 'A student plots measured K on the vertical axis versus v² on the horizontal axis. What shape appears?',
    options: [
      { label: 'Straight line from (0,0)', shape: 'line_origin' },
      { label: 'Upward parabola', shape: 'parabola_origin' },
      { label: 'Horizontal line', shape: 'flat_const' },
      { label: 'Shifted U-curve', shape: 'shifted_parabola' },
    ],
    correctIndex: 0,
    explanation: 'Treating v² as the x-variable makes K = (½m)(v²) linear with y-intercept 0 and constant slope ½m.',
  },
  {
    id: 'sk-3',
    ek: '3.1.A.2 / 1.C',
    prompt: 'A puck slides at constant speed v₀ around a circle as heading θ sweeps 0° to 360°. How does K(θ) look?',
    options: [
      { label: 'Sinusoidal wave', shape: 'shifted_parabola' },
      { label: 'Linear increasing', shape: 'line_origin' },
      { label: 'Constant horizontal line', shape: 'flat_const' },
      { label: 'Upward parabola', shape: 'parabola_origin' },
    ],
    correctIndex: 2,
    explanation: 'Kinetic energy is a scalar depending only on speed |v| = v₀, so changing direction θ does not change K.',
  },
  {
    id: 'sk-4',
    ek: '3.1.A.3 / 1.C',
    prompt: 'Object P moves at +v_P relative to Earth. How does K_P/O depend on observer velocity v_O?',
    options: [
      { label: 'Flat line (invariant)', shape: 'flat_const' },
      { label: 'Line crossing 0 at v_P', shape: 'line_origin' },
      { label: 'Parabola touching 0 at v_O=v_P', shape: 'shifted_parabola' },
      { label: '1/v_O curve', shape: 'inv_curve' },
    ],
    correctIndex: 2,
    explanation: 'K_P/O = ½m(v_P - v_O)² is a parabola whose minimum K = 0 occurs when the observer co-moves at v_O = v_P.',
  },
];

export interface RatioChallenge31 {
  id: string;
  ek: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const RATIO_CHALLENGES_31: RatioChallenge31[] = [
  {
    id: 'rc-1',
    ek: '3.1.A.1 / 2.C',
    prompt: 'Cart B has half the mass of Cart A (m_B = ½ m_A) and twice the speed (v_B = 2 v_A). Find K_B / K_A.',
    options: ['1/2', '1', '2', '4'],
    correctIndex: 2,
    explanation: 'K_B / K_A = (m_B/m_A)(v_B/v_A)² = (1/2)(2)² = (1/2)(4) = 2.',
  },
  {
    id: 'rc-2',
    ek: '3.1.A.1 / 2.C',
    prompt: 'Cart A (1 kg) and Cart B (4 kg) have equal momentum |p_A| = |p_B|. What is K_A / K_B?',
    options: ['1/4', '1/2', '2', '4'],
    correctIndex: 3,
    explanation: 'Using K = p²/(2m), at equal p we have K_A / K_B = m_B / m_A = 4 / 1 = 4.',
  },
  {
    id: 'rc-3',
    ek: '3.1.A.2 / 2.C',
    prompt: 'Car X moves East at 10 m/s and identical Car Y moves West at 10 m/s. Compare K_X and K_Y.',
    options: ['K_X = -K_Y', 'K_X = K_Y > 0', 'K_X = 2 K_Y', 'K_X + K_Y = 0'],
    correctIndex: 1,
    explanation: 'Kinetic energy is a scalar depending on speed squared: (-10)² = (+10)², so K_X = K_Y > 0.',
  },
  {
    id: 'rc-4',
    ek: '3.1.A.3 / 2.C',
    prompt: 'Train P moves at +v relative to Earth. Observer O moves at -v (opposite direction). What is K_P/O / K_P/E?',
    options: ['0', '1', '2', '4'],
    correctIndex: 3,
    explanation: 'v_P/O = v - (-v) = 2v. Since K scales as v_rel², K_P/O = ½m(2v)² = 4 K_P/E.',
  },
  {
    id: 'rc-5',
    ek: '3.1.A.1 / 2.C',
    prompt: 'If you want to triple a glider’s kinetic energy while keeping mass constant, by what factor must speed increase?',
    options: ['√3 (≈1.73)', '3', '6', '9'],
    correctIndex: 0,
    explanation: 'Since K ∝ v², multiplying K by 3 requires multiplying v by √3.',
  },
];

export interface ClaimBuilderChallenge31 {
  id: string;
  ek: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const CLAIM_BUILDER_31: ClaimBuilderChallenge31[] = [
  {
    id: 'cb-1',
    ek: '3.1.A.1 / 3.B',
    prompt: 'A satellite orbits Earth in a circle at constant speed v. Which claim about its translational K is correct?',
    options: [
      'K changes continuously because velocity direction changes.',
      'K is constant because speed |v| and mass m are constant.',
      'K alternates positive and negative every half orbit.',
      'K is zero because net displacement over one orbit is zero.',
    ],
    correctIndex: 1,
    explanation: 'By 3.1.A.1 & 3.1.A.2, K = ½mv² depends only on mass and speed magnitude, not direction or displacement.',
  },
  {
    id: 'cb-2',
    ek: '3.1.A.2 / 3.B',
    prompt: 'Two identical hockey pucks slide toward each other with equal speeds v. What is the system’s total kinetic energy?',
    options: [
      '0 J, because their opposite velocities cancel.',
      '½mv², because only one puck moves relative to the other.',
      'mv², because scalar energies ½mv² + ½mv² always add.',
      '-mv², because one velocity is negative.',
    ],
    correctIndex: 2,
    explanation: 'Total momentum is zero (vector cancellation), but scalar kinetic energies sum: ½mv² + ½mv² = mv².',
  },
  {
    id: 'cb-3',
    ek: '3.1.A.3 / 3.B',
    prompt: 'A coffee cup sits on a tray inside a train moving at 25 m/s relative to Earth. Which statement is valid?',
    options: [
      'Its kinetic energy is 0 J in ALL reference frames.',
      'It is 0 J in the train frame, but nonzero in the Earth frame.',
      'Its kinetic energy is the same in both frames because mass is invariant.',
      'Kinetic energy is undefined inside a moving train.',
    ],
    correctIndex: 1,
    explanation: 'By 3.1.A.3, K depends on the observer’s reference frame: v_rel = 0 to a passenger (K = 0), while v_rel = 25 m/s to Earth (K > 0).',
  },
  {
    id: 'cb-4',
    ek: '3.1.A.1 / 3.B',
    prompt: 'To stop a car moving at 2v instead of v with the same braking force, how does stopping distance change (W = ΔK)?',
    options: [
      'Halves (0.5×)',
      'Doubles (2×)',
      'Triples (3×)',
      'Quadruples (4×)',
    ],
    correctIndex: 3,
    explanation: 'Initial kinetic energy is K = ½mv² (4× larger at 2v), so constant braking force F·d = ΔK requires 4× the stopping distance.',
  },
  {
    id: 'cb-5',
    ek: '3.1.A.3 / 3.B',
    prompt: 'Drone A flies at +10 m/s East and Drone B flies at +10 m/s East alongside it. What is K_A measured by Drone B?',
    options: [
      '0 J, because v_A/B = 0 m/s.',
      'Equal to K_A measured from Earth.',
      '4× K_A measured from Earth.',
      'Negative, because B is moving.',
    ],
    correctIndex: 0,
    explanation: 'v_A/B = v_A/E - v_B/E = 10 - 10 = 0 m/s, so Drone B measures K_A/B = ½m(0)² = 0 J.',
  },
];

export interface JustificationCard31 {
  id: string;
  ek: string;
  claim: string;
  isTrue: boolean;
  justification: string;
  testPreset: Partial<Kinetic31Params>;
}

export const JUSTIFICATION_CARDS_31: JustificationCard31[] = [
  {
    id: 'jc-1',
    ek: '3.1.A.2',
    claim: 'An object moving in the negative x-direction (v = -8 m/s) has negative translational kinetic energy.',
    isTrue: false,
    justification:
      'Refuted: Kinetic energy is a scalar (3.1.A.2) proportional to v². Squaring (-8 m/s)² gives +64 m²/s², so K = +64 J ≥ 0 always.',
    testPreset: {
      mode: 'scenario_compare',
      massAKg: 2.0,
      velAMs: 8.0,
      massBKg: 2.0,
      velBMs: -8.0,
    },
  },
  {
    id: 'jc-2',
    ek: '3.1.A.1',
    claim: 'Doubling an object’s speed increases its kinetic energy by a larger factor than doubling its mass.',
    isTrue: true,
    justification:
      'Supported: By K = ½mv² (3.1.A.1), doubling m gives 2× K (linear), whereas doubling v gives 2² = 4× K (quadratic).',
    testPreset: {
      mode: 'scaling_track',
      massKg: 2.0,
      speedMs: 10.0,
      refMassKg: 2.0,
      refSpeedMs: 5.0,
    },
  },
  {
    id: 'jc-3',
    ek: '3.1.A.2',
    claim: 'A two-puck system with zero total linear momentum (p_sys = 0) must also have zero total kinetic energy.',
    isTrue: false,
    justification:
      'Refuted: Momentum is a vector (opposite velocities cancel to zero), but scalar kinetic energies are strictly non-negative and add: K_sys = K₁ + K₂ > 0.',
    testPreset: {
      mode: 'scalar_arena',
      arenaMassKg: 2.0,
      arenaSpeedMs: 6.0,
      headingDeg: 0,
      showTwoPuckSystem: true,
    },
  },
  {
    id: 'jc-4',
    ek: '3.1.A.3',
    claim: 'Two observers moving at different velocities relative to Earth can measure different kinetic energies for the exact same object.',
    isTrue: true,
    justification:
      'Supported: By 3.1.A.3, translational kinetic energy depends on the observer’s frame of reference because v_P/O = v_P/E - v_O/E.',
    testPreset: {
      mode: 'observer_frames',
      frameMassKg: 2.0,
      vObjectEarthMs: 8.0,
      vObserverEarthMs: 8.0,
      activeViewFrame: 'observer_b',
    },
  },
  {
    id: 'jc-5',
    ek: '3.1.A.1',
    claim: 'If two carts have the same momentum magnitude |p|, the heavier cart has greater kinetic energy.',
    isTrue: false,
    justification:
      'Refuted: Since K = p²/(2m), at equal momentum K is inversely proportional to mass—the lighter cart moves faster and has MORE kinetic energy.',
    testPreset: {
      mode: 'scenario_compare',
      massAKg: 1.0,
      velAMs: 8.0,
      massBKg: 4.0,
      velBMs: 2.0,
    },
  },
  {
    id: 'jc-6',
    ek: '3.1.A.2',
    claim: 'Changing an object’s direction of motion from 0° to 135° at constant speed leaves its kinetic energy unchanged.',
    isTrue: true,
    justification:
      'Supported: K = ½m(v_x² + v_y²) = ½mv²(cos²θ + sin²θ) = ½mv², which is completely independent of angle θ.',
    testPreset: {
      mode: 'scalar_arena',
      arenaMassKg: 2.0,
      arenaSpeedMs: 6.0,
      headingDeg: 135,
      arenaPattern: 'circular',
      showTwoPuckSystem: false,
    },
  },
];
