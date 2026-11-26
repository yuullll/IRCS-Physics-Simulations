/**
 * Pure Physics Engine & AP Physics C Curriculum Logic for Unit 2, Topic 2.8:
 * Spring Forces (Course Framework V.1, Pages 55–56)
 *
 * Covers:
 * - 2.8.A.1: Ideal spring (negligible mass, F proportional to Δx from relaxed length)
 *            vs. Nonideal spring (nonnegligible mass or nonlinear F(Δx)).
 * - 2.8.A.2: Hooke's Law F_s = -k Δx.
 * - 2.8.A.3: Spring force is always directed toward the equilibrium position of the object–spring system.
 * - 2.8.B.1: Equivalent spring constant k_eq of a combination of springs.
 * - 2.8.B.1.i: Series: 1/k_eq,series = Σ (1/k_i).
 * - 2.8.B.1.ii: k_eq,series is strictly smaller than the smallest constituent spring constant.
 * - 2.8.B.1.iii: Parallel: k_eq,parallel = Σ k_i.
 * - Boundary Statement: Pure series OR pure parallel combinations only (no mixed series-parallel).
 * - Suggested Skills: 1.A (Diagrams, tables & charts), 2.B (Quantitative calculation with units),
 *   2.D (Functional dependence / factor-of-change predictions), 3.C (Justify claims with evidence).
 */

export const GRAVITY_G = 9.81;

export type Springs28Mode =
  | 'hookes_restoring'
  | 'vertical_equilibrium'
  | 'series_springs'
  | 'parallel_springs';

export type SpringBehaviorType = 'ideal' | 'nonideal_hardening' | 'nonideal_softening';

export interface SpringLabTrial {
  id: string;
  displacementM: number;
  forceN: number;
  behavior: SpringBehaviorType;
  kNm: number;
}

export interface Springs28Params {
  mode: Springs28Mode;
  gMs2: number;

  // Mode 1: Hooke's Law & Restoring Force (2.8.A.1–3)
  hookeKNm: number; // 10 to 120 N/m
  hookeDisplacementM: number; // -0.60 to +0.60 m
  hookeMassKg: number; // 0.5 to 8.0 kg
  springBehavior: SpringBehaviorType;

  // Mode 2: Vertical Hanging Spring & Equilibrium Shift (2.8.A.1–3)
  verticalKNm: number; // 15 to 120 N/m
  verticalMassKg: number; // 0.5 to 8.0 kg
  verticalOffsetM: number; // -0.35 to +0.35 m from equilibrium
  verticalSpringMassKg: number; // 0 (ideal) to 1.5 kg (nonideal massive spring)

  // Modes 3 & 4: Series / Parallel Combinations (2.8.B.1.i–iii, pure series OR pure parallel)
  comboCount: 2 | 3;
  k1Nm: number; // 15 to 120 N/m
  k2Nm: number; // 15 to 120 N/m
  k3Nm: number; // 15 to 120 N/m
  comboAppliedForceN: number; // 0 to 40 N
  comboMassKg: number; // 1.0 to 6.0 kg
}

export const DEFAULT_SPRINGS28_PARAMS: Springs28Params = {
  mode: 'hookes_restoring',
  gMs2: GRAVITY_G,

  hookeKNm: 40,
  hookeDisplacementM: 0.35,
  hookeMassKg: 2.0,
  springBehavior: 'ideal',

  verticalKNm: 50,
  verticalMassKg: 2.0,
  verticalOffsetM: -0.18,
  verticalSpringMassKg: 0.0,

  comboCount: 2,
  k1Nm: 30,
  k2Nm: 60,
  k3Nm: 45,
  comboAppliedForceN: 16,
  comboMassKg: 2.0,
};

export interface HookesRestoringEval {
  kNm: number;
  behavior: SpringBehaviorType;
  displacementM: number; // current Δx at time t
  velocityMs: number;
  springForceN: number; // signed F_s (restoring toward x = 0)
  idealComparisonForceN: number; // -k * Δx for direct ideal vs. nonideal contrast
  nonlinearityPercent: number;
  accelMs2: number;
  angularFreqRadS: number;
  periodS: number;
  potentialEnergyJ: number;
  regime: 'stretched' | 'compressed' | 'equilibrium';
}

export interface VerticalEquilibriumEval {
  kNm: number;
  massKg: number;
  springMassKg: number;
  isIdealMassless: boolean;
  weightN: number;
  idealEqStretchM: number; // mg / k
  selfWeightSagM: number; // (m_s g) / (2k)
  equilibriumStretchM: number; // total downward stretch at equilibrium
  currentOffsetFromEqM: number; // η(t): + up, - down from equilibrium
  currentTotalStretchM: number; // stretch measured from relaxed length (positive downward)
  springForceUpN: number; // upward spring force on hanging mass
  netForceUpN: number; // F_s - mg (restoring toward equilibrium!)
  accelUpMs2: number;
  effectiveMassKg: number; // m + m_s / 3
  angularFreqRadS: number;
  periodS: number;
}

export interface SpringElementState {
  index: number;
  label: string;
  kNm: number;
  stretchM: number;
  forceN: number;
  stretchSharePct: number;
  forceSharePct: number;
}

export interface CombinationSpringsEval {
  arrangement: 'series' | 'parallel';
  springs: SpringElementState[];
  kEqNm: number;
  minKNm: number;
  maxKNm: number;
  sumKNm: number;
  kEqSmallerThanMin: boolean;
  kEqLargerThanMax: boolean;
  staticStretchM: number; // F_pull / k_eq
  currentStretchM: number; // animated oscillation around static stretch when playing
  currentTotalForceN: number; // restoring force magnitude at current stretch
  accelMs2: number;
  angularFreqRadS: number;
  periodS: number;
}

export interface Springs28Evaluation {
  simTimeS: number;
  hookes: HookesRestoringEval;
  vertical: VerticalEquilibriumEval;
  series: CombinationSpringsEval;
  parallel: CombinationSpringsEval;
  statusBanner: string;
}

/**
 * Signed restoring force F_s(Δx) for ideal or nonideal spring (2.8.A.1 & 2.8.A.2).
 * Always points opposite Δx (toward equilibrium Δx = 0, per 2.8.A.3).
 */
export function computeSpringForceN(
  kNm: number,
  displacementM: number,
  behavior: SpringBehaviorType
): number {
  const k = Math.max(1, kNm);
  const x = displacementM;
  if (behavior === 'ideal') {
    return -k * x;
  }
  if (behavior === 'nonideal_hardening') {
    // Hardening progressive spring: F_s = -(k x + β x^3)
    const beta = 2.4 * k;
    return -(k * x + beta * x * x * x);
  }
  // Softening spring: F_s = -k x / (1 + 1.8 x^2) — always restoring, sub-linear at large |x|
  return (-k * x) / (1 + 1.8 * x * x);
}

/**
 * Potential energy U_s(Δx) = -∫_0^x F_s(s) ds
 */
export function computeSpringEnergyJ(
  kNm: number,
  displacementM: number,
  behavior: SpringBehaviorType
): number {
  const k = Math.max(1, kNm);
  const x = displacementM;
  if (behavior === 'ideal') {
    return 0.5 * k * x * x;
  }
  if (behavior === 'nonideal_hardening') {
    const beta = 2.4 * k;
    return 0.5 * k * x * x + 0.25 * beta * x * x * x * x;
  }
  // ∫ k s / (1 + 1.8 s^2) ds = (k / 3.6) ln(1 + 1.8 x^2)
  return (k / 3.6) * Math.log(1 + 1.8 * x * x);
}

/**
 * Evaluate Mode 1: Hooke's Law & Restoring Force (2.8.A.1–3)
 */
export function evaluateHookesRestoring(
  params: Springs28Params,
  simTimeS: number
): HookesRestoringEval {
  const k = Math.max(5, params.hookeKNm);
  const m = Math.max(0.25, params.hookeMassKg);
  const x0 = params.hookeDisplacementM;
  const omega = Math.sqrt(k / m);
  const periodS = (2 * Math.PI) / omega;

  let x = x0;
  let v = 0;

  if (simTimeS > 0.0001 && Math.abs(x0) > 1e-4) {
    if (params.springBehavior === 'ideal') {
      x = x0 * Math.cos(omega * simTimeS);
      v = -omega * x0 * Math.sin(omega * simTimeS);
    } else {
      // Deterministic Velocity-Verlet integration for nonideal spring
      const dtMax = 0.005;
      const steps = Math.min(2400, Math.max(1, Math.ceil(simTimeS / dtMax)));
      const dt = simTimeS / steps;
      let a = computeSpringForceN(k, x, params.springBehavior) / m;
      for (let i = 0; i < steps; i++) {
        x = x + v * dt + 0.5 * a * dt * dt;
        const aNext = computeSpringForceN(k, x, params.springBehavior) / m;
        v = v + 0.5 * (a + aNext) * dt;
        a = aNext;
      }
    }
  }

  const springForceN = computeSpringForceN(k, x, params.springBehavior);
  const idealComparisonForceN = -k * x;
  const nonlinearityPercent =
    Math.abs(idealComparisonForceN) > 0.05
      ? (Math.abs(springForceN - idealComparisonForceN) / Math.abs(idealComparisonForceN)) * 100
      : 0;
  const accelMs2 = springForceN / m;
  const potentialEnergyJ = computeSpringEnergyJ(k, x, params.springBehavior);

  const regime: HookesRestoringEval['regime'] =
    x > 0.005 ? 'stretched' : x < -0.005 ? 'compressed' : 'equilibrium';

  return {
    kNm: k,
    behavior: params.springBehavior,
    displacementM: x,
    velocityMs: v,
    springForceN,
    idealComparisonForceN,
    nonlinearityPercent,
    accelMs2,
    angularFreqRadS: omega,
    periodS,
    potentialEnergyJ,
    regime,
  };
}

/**
 * Evaluate Mode 2: Vertical Hanging Spring & Equilibrium Shift (2.8.A.1–3)
 */
export function evaluateVerticalEquilibrium(
  params: Springs28Params,
  simTimeS: number
): VerticalEquilibriumEval {
  const k = Math.max(5, params.verticalKNm);
  const m = Math.max(0.25, params.verticalMassKg);
  const mSpring = Math.max(0, params.verticalSpringMassKg);
  const g = params.gMs2;

  const weightN = m * g;
  const idealEqStretchM = weightN / k;
  const selfWeightSagM = (mSpring * g) / (2 * k);
  const equilibriumStretchM = idealEqStretchM + selfWeightSagM;

  const effectiveMassKg = m + mSpring / 3;
  const omega = Math.sqrt(k / effectiveMassKg);
  const periodS = (2 * Math.PI) / omega;

  // η = vertical displacement measured UPWARD from equilibrium position y_eq
  const eta0 = params.verticalOffsetM;
  const eta = simTimeS > 0.0001 ? eta0 * Math.cos(omega * simTimeS) : eta0;

  // Total downward extension from relaxed length
  const currentTotalStretchM = equilibriumStretchM - eta;
  // Upward spring force exerted on the hanging mass (supports load + restoring force)
  const springForceUpN = k * (idealEqStretchM - eta);
  const netForceUpN = springForceUpN - weightN; // = -k * η (always toward equilibrium!)
  const accelUpMs2 = netForceUpN / effectiveMassKg;

  return {
    kNm: k,
    massKg: m,
    springMassKg: mSpring,
    isIdealMassless: mSpring < 0.01,
    weightN,
    idealEqStretchM,
    selfWeightSagM,
    equilibriumStretchM,
    currentOffsetFromEqM: eta,
    currentTotalStretchM,
    springForceUpN,
    netForceUpN,
    accelUpMs2,
    effectiveMassKg,
    angularFreqRadS: omega,
    periodS,
  };
}

/**
 * Compute equivalent spring constant for pure Series (2.8.B.1.i) or pure Parallel (2.8.B.1.iii).
 * Honors AP Physics C Boundary Statement: pure series OR pure parallel only.
 */
export function computeEquivalentSpringConstant(
  ks: number[],
  arrangement: 'series' | 'parallel'
): number {
  const valid = ks.map(v => Math.max(1, v));
  if (arrangement === 'parallel') {
    return valid.reduce((sum, k) => sum + k, 0);
  }
  const invSum = valid.reduce((sum, k) => sum + 1 / k, 0);
  return 1 / Math.max(1e-9, invSum);
}

/**
 * Evaluate Mode 3 (Series) or Mode 4 (Parallel) combination of 2 or 3 springs
 */
export function evaluateCombinationSprings(
  params: Springs28Params,
  arrangement: 'series' | 'parallel',
  simTimeS: number
): CombinationSpringsEval {
  const rawKs =
    params.comboCount === 3
      ? [params.k1Nm, params.k2Nm, params.k3Nm]
      : [params.k1Nm, params.k2Nm];
  const ks = rawKs.map(v => Math.max(5, v));
  const m = Math.max(0.5, params.comboMassKg);
  const pullN = Math.max(0, params.comboAppliedForceN);

  const kEqNm = computeEquivalentSpringConstant(ks, arrangement);
  const minKNm = Math.min(...ks);
  const maxKNm = Math.max(...ks);
  const sumKNm = ks.reduce((a, b) => a + b, 0);

  const staticStretchM = pullN / kEqNm;
  const omega = Math.sqrt(kEqNm / m);
  const periodS = (2 * Math.PI) / omega;

  // When playing (simTimeS > 0), release block from staticStretchM so it oscillates freely around 0
  const currentStretchM =
    simTimeS > 0.0001 ? staticStretchM * Math.cos(omega * simTimeS) : staticStretchM;
  const currentTotalForceN = kEqNm * Math.abs(currentStretchM);
  const signedRestoringN = -kEqNm * currentStretchM;
  const accelMs2 = simTimeS > 0.0001 ? signedRestoringN / m : 0;

  const springs: SpringElementState[] = ks.map((kVal, idx) => {
    if (arrangement === 'series') {
      // Series: SAME tension F in every spring; stretches add Δx_i = F / k_i
      const stretchM = (kEqNm * currentStretchM) / kVal;
      const forceN = kEqNm * Math.abs(currentStretchM);
      const stretchSharePct =
        Math.abs(currentStretchM) > 1e-6
          ? (Math.abs(stretchM) / Math.abs(currentStretchM)) * 100
          : (kEqNm / kVal) * 100;
      return {
        index: idx + 1,
        label: `k${idx === 0 ? '₁' : idx === 1 ? '₂' : '₃'}`,
        kNm: kVal,
        stretchM,
        forceN,
        stretchSharePct,
        forceSharePct: 100, // every series spring carries 100% of the tension F
      };
    } else {
      // Parallel: SAME stretch Δx on every spring; forces add F_i = k_i Δx
      const stretchM = currentStretchM;
      const forceN = kVal * Math.abs(currentStretchM);
      const forceSharePct = (kVal / kEqNm) * 100;
      return {
        index: idx + 1,
        label: `k${idx === 0 ? '₁' : idx === 1 ? '₂' : '₃'}`,
        kNm: kVal,
        stretchM,
        forceN,
        stretchSharePct: 100, // every parallel spring stretches by 100% of Δx
        forceSharePct,
      };
    }
  });

  return {
    arrangement,
    springs,
    kEqNm,
    minKNm,
    maxKNm,
    sumKNm,
    kEqSmallerThanMin: kEqNm < minKNm - 1e-6,
    kEqLargerThanMax: kEqNm > maxKNm + 1e-6,
    staticStretchM,
    currentStretchM,
    currentTotalForceN,
    accelMs2,
    angularFreqRadS: omega,
    periodS,
  };
}

/**
 * Unified evaluation for Topic 2.8 Spring Forces Workbench
 */
export function evaluateSprings28(
  params: Springs28Params,
  simTimeS: number
): Springs28Evaluation {
  const hookes = evaluateHookesRestoring(params, simTimeS);
  const vertical = evaluateVerticalEquilibrium(params, simTimeS);
  const series = evaluateCombinationSprings(params, 'series', simTimeS);
  const parallel = evaluateCombinationSprings(params, 'parallel', simTimeS);

  let statusBanner = '';
  if (params.mode === 'hookes_restoring') {
    const dirWord =
      hookes.regime === 'stretched'
        ? 'LEFT (toward x = 0)'
        : hookes.regime === 'compressed'
          ? 'RIGHT (toward x = 0)'
          : 'ZERO (at equilibrium)';
    const typeTag =
      params.springBehavior === 'ideal'
        ? '2.8.A.2 Ideal Hooke’s Law'
        : params.springBehavior === 'nonideal_hardening'
          ? '2.8.A.1 Nonideal Hardening (+βΔx³)'
          : '2.8.A.1 Nonideal Softening';
    statusBanner = `${typeTag}: Δx = ${hookes.displacementM >= 0 ? '+' : ''}${hookes.displacementM.toFixed(2)} m · F_s = ${hookes.springForceN >= 0 ? '+' : ''}${hookes.springForceN.toFixed(1)} N pointing ${dirWord}`;
  } else if (params.mode === 'vertical_equilibrium') {
    const massNote = vertical.isIdealMassless
      ? 'Ideal massless spring'
      : `Nonideal spring (m_s = ${vertical.springMassKg.toFixed(1)} kg adds ${(vertical.selfWeightSagM * 100).toFixed(1)} cm sag)`;
    statusBanner = `2.8.A.3 Vertical Equilibrium: y_eq = -${vertical.equilibriumStretchM.toFixed(2)} m (${massNote}) · F_net = ${vertical.netForceUpN >= 0 ? '+' : ''}${vertical.netForceUpN.toFixed(1)} N toward y_eq`;
  } else if (params.mode === 'series_springs') {
    statusBanner = `2.8.B.1.i–ii Series: k_eq = ${series.kEqNm.toFixed(1)} N/m < min(k) = ${series.minKNm.toFixed(0)} N/m · Same F = ${series.currentTotalForceN.toFixed(1)} N in all springs, stretches ADD to Δx = ${series.currentStretchM.toFixed(2)} m`;
  } else {
    statusBanner = `2.8.B.1.iii Parallel: k_eq = ${parallel.kEqNm.toFixed(1)} N/m = Σk_i · Same Δx = ${parallel.currentStretchM.toFixed(2)} m on all springs, forces ADD to F = ${parallel.currentTotalForceN.toFixed(1)} N`;
  }

  return {
    simTimeS,
    hookes,
    vertical,
    series,
    parallel,
    statusBanner,
  };
}

// ============================================================================
// SKILL 1.A — DIAGRAMS, CHARTS & SCHEMATIC TABLES
// ============================================================================

export type SpringChartKind28 = 'fs_vs_dx' | 'series_vs_parallel';

export interface ChartPoint28 {
  x: number;
  y: number;
}

export interface ChartSeries28 {
  label: string;
  color: string;
  dashed?: boolean;
  points: ChartPoint28[];
}

export interface SpringChartSpec28 {
  kind: SpringChartKind28;
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  series: ChartSeries28[];
  scatterPoints?: { x: number; y: number; color: string }[];
  markerX: number;
  markerY: number;
  markerLabel: string;
  notes: string[];
}

export function buildSpringChart28(
  params: Springs28Params,
  ev: Springs28Evaluation,
  kind: SpringChartKind28,
  trials: SpringLabTrial[]
): SpringChartSpec28 {
  if (kind === 'fs_vs_dx') {
    const isVert = params.mode === 'vertical_equilibrium';
    const k = isVert ? params.verticalKNm : params.hookeKNm;
    const effectiveBehavior: SpringBehaviorType = isVert ? 'ideal' : params.springBehavior;
    const xMax = 0.6;
    const yBound = Math.max(30, Math.ceil((k * 0.65) / 10) * 10);

    const idealPts: ChartPoint28[] = [];
    const activePts: ChartPoint28[] = [];
    for (let i = -24; i <= 24; i++) {
      const dx = (i / 24) * xMax;
      idealPts.push({ x: dx, y: -k * dx });
      activePts.push({ x: dx, y: computeSpringForceN(k, dx, effectiveBehavior) });
    }

    const markerX = isVert
      ? ev.vertical.currentOffsetFromEqM
      : ev.hookes.displacementM;
    const markerY = isVert
      ? ev.vertical.netForceUpN
      : ev.hookes.springForceN;

    const series: ChartSeries28[] = [
      {
        label: `Ideal F_s = -kΔx (slope -${k} N/m)`,
        color: '#10b981',
        dashed: effectiveBehavior !== 'ideal',
        points: idealPts,
      },
    ];
    if (effectiveBehavior !== 'ideal') {
      series.push({
        label:
          effectiveBehavior === 'nonideal_hardening'
            ? 'Nonideal Hardening'
            : 'Nonideal Softening',
        color: '#f59e0b',
        points: activePts,
      });
    }

    const scatterPoints = isVert
      ? []
      : trials.map(t => ({
          x: t.displacementM,
          y: t.forceN,
          color: t.behavior === 'ideal' ? '#38bdf8' : '#f59e0b',
        }));

    return {
      kind,
      title: isVert
        ? 'Net Restoring Force F_net vs. Offset η (Skill 1.A)'
        : 'Restoring Force F_s vs. Displacement Δx (Skill 1.A)',
      xAxisLabel: isVert
        ? 'Vertical Offset η from y_eq (m)'
        : 'Displacement Δx from Equilibrium (m)',
      yAxisLabel: isVert ? 'Net Force F_net (N)' : 'Spring Force F_s (N)',
      xMin: -xMax,
      xMax,
      yMin: -yBound,
      yMax: yBound,
      series,
      scatterPoints,
      markerX: Math.max(-xMax, Math.min(xMax, markerX)),
      markerY: Math.max(-yBound, Math.min(yBound, markerY)),
      markerLabel: `(${markerX.toFixed(2)}m, ${markerY.toFixed(1)}N)`,
      notes: [
        `Negative slope (-k = -${k} N/m) proves restoring force always points opposite displacement toward equilibrium (2.8.A.2–3).`,
        effectiveBehavior === 'ideal'
          ? 'Straight line through origin confirms ideal Hooke’s law proportionality (2.8.A.1).'
          : 'Curved departure from the dashed line shows a nonideal nonlinear spring (2.8.A.1).',
      ],
    };
  }

  // series_vs_parallel chart: Force |F| vs. Total Extension Δx for k1, k2, k_eq(series), k_eq(parallel)
  const ser = ev.series;
  const par = ev.parallel;
  const xMax = Math.max(0.8, Math.ceil(Math.max(ser.staticStretchM, 0.5) * 1.35 * 10) / 10);
  const yMax = Math.max(30, Math.ceil(Math.max(params.comboAppliedForceN * 1.4, par.kEqNm * 0.35) / 10) * 10);

  const makeLine = (kVal: number): ChartPoint28[] => {
    const xEnd = Math.min(xMax, yMax / Math.max(1, kVal));
    return [
      { x: 0, y: 0 },
      { x: xEnd, y: kVal * xEnd },
    ];
  };

  const isSeriesMode = params.mode === 'series_springs';
  const activeEval = isSeriesMode ? ser : par;

  return {
    kind,
    title: 'Stiffness Slopes: Series k_eq vs. Parallel k_eq (2.8.B)',
    xAxisLabel: 'Total Extension Δx (m)',
    yAxisLabel: 'Restoring Force |F| (N)',
    xMin: 0,
    xMax,
    yMin: 0,
    yMax,
    series: [
      { label: `Parallel k_eq = ${par.kEqNm.toFixed(0)} N/m`, color: '#10b981', points: makeLine(par.kEqNm) },
      { label: `Single k₁ = ${params.k1Nm} N/m`, color: '#38bdf8', dashed: true, points: makeLine(params.k1Nm) },
      { label: `Single k₂ = ${params.k2Nm} N/m`, color: '#a855f7', dashed: true, points: makeLine(params.k2Nm) },
      { label: `Series k_eq = ${ser.kEqNm.toFixed(1)} N/m`, color: '#f59e0b', points: makeLine(ser.kEqNm) },
    ],
    markerX: Math.min(xMax, Math.abs(activeEval.currentStretchM)),
    markerY: Math.min(yMax, activeEval.currentTotalForceN),
    markerLabel: `${isSeriesMode ? 'Ser' : 'Par'}: ${activeEval.kEqNm.toFixed(1)} N/m`,
    notes: [
      `Series slope (${ser.kEqNm.toFixed(1)} N/m) is flatter than the softest spring (${ser.minKNm} N/m) (2.8.B.1.ii).`,
      `Parallel slope (${par.kEqNm.toFixed(1)} N/m) is steeper than any individual spring because forces add (2.8.B.1.iii).`,
    ],
  };
}

// ============================================================================
// SKILL 2.B — QUANTITATIVE CALCULATION PATHWAY WITH UNITS
// ============================================================================

export interface QuantitativeSolution28 {
  title: string;
  givens: string[];
  steps: { label: string; calculation: string }[];
  finalAnswer: string;
}

export function solveSpringCalculation28(
  params: Springs28Params,
  ev: Springs28Evaluation
): QuantitativeSolution28 {
  if (params.mode === 'hookes_restoring') {
    const h = ev.hookes;
    return {
      title: 'Hooke’s Law Force & Acceleration (Skill 2.B)',
      givens: [
        `k = ${h.kNm.toFixed(0)} N/m, m = ${params.hookeMassKg.toFixed(1)} kg`,
        `Δx = ${h.displacementM >= 0 ? '+' : ''}${h.displacementM.toFixed(3)} m`,
        `Model: ${params.springBehavior === 'ideal' ? 'Ideal Linear (2.8.A.2)' : 'Nonideal Nonlinear (2.8.A.1)'}`,
      ],
      steps: [
        {
          label: '1. Apply Hooke’s Law F_s = -k Δx',
          calculation:
            params.springBehavior === 'ideal'
              ? `F_s = -(${h.kNm.toFixed(0)} N/m)(${h.displacementM >= 0 ? '+' : ''}${h.displacementM.toFixed(3)} m) = ${h.springForceN >= 0 ? '+' : ''}${h.springForceN.toFixed(2)} N`
              : `Ideal F_ideal = ${h.idealComparisonForceN.toFixed(2)} N vs. Nonideal F_s = ${h.springForceN.toFixed(2)} N (${h.nonlinearityPercent.toFixed(1)}% shift)`,
        },
        {
          label: '2. Restoring Direction Check (2.8.A.3)',
          calculation: `Sign of F_s (${h.springForceN >= 0 ? '+' : '-'}) is opposite Δx (${h.displacementM >= 0 ? '+' : '-'}) ⇒ directed toward x = 0`,
        },
        {
          label: '3. Instantaneous Acceleration a_x = F_s / m',
          calculation: `a_x = (${h.springForceN.toFixed(2)} N) / (${params.hookeMassKg.toFixed(1)} kg) = ${h.accelMs2 >= 0 ? '+' : ''}${h.accelMs2.toFixed(2)} m/s²`,
        },
        {
          label: '4. Natural Oscillation Period T = 2π √(m/k)',
          calculation: `T = 2π √(${params.hookeMassKg.toFixed(1)} / ${h.kNm.toFixed(0)}) = ${h.periodS.toFixed(2)} s`,
        },
      ],
      finalAnswer: `F_s = ${h.springForceN >= 0 ? '+' : ''}${h.springForceN.toFixed(2)} N · a = ${h.accelMs2 >= 0 ? '+' : ''}${h.accelMs2.toFixed(2)} m/s²`,
    };
  }

  if (params.mode === 'vertical_equilibrium') {
    const v = ev.vertical;
    return {
      title: 'Vertical Spring Equilibrium & Net Force (Skill 2.B)',
      givens: [
        `k = ${v.kNm.toFixed(0)} N/m, m = ${v.massKg.toFixed(1)} kg, m_spring = ${v.springMassKg.toFixed(1)} kg`,
        `Offset from equilibrium η = ${v.currentOffsetFromEqM >= 0 ? '+' : ''}${v.currentOffsetFromEqM.toFixed(3)} m`,
      ],
      steps: [
        {
          label: '1. Static Equilibrium Extension Δy_eq',
          calculation: v.isIdealMassless
            ? `k Δy_eq = mg ⇒ Δy_eq = (${v.massKg.toFixed(1)})(${params.gMs2.toFixed(2)}) / ${v.kNm.toFixed(0)} = ${v.equilibriumStretchM.toFixed(3)} m`
            : `Δy_eq = (m + m_s/2)g / k = (${(v.massKg + v.springMassKg / 2).toFixed(2)})(${params.gMs2.toFixed(2)}) / ${v.kNm.toFixed(0)} = ${v.equilibriumStretchM.toFixed(3)} m`,
        },
        {
          label: '2. Total Extension from Relaxed Length',
          calculation: `s = Δy_eq - η = ${v.equilibriumStretchM.toFixed(3)} - (${v.currentOffsetFromEqM.toFixed(3)}) = ${v.currentTotalStretchM.toFixed(3)} m`,
        },
        {
          label: '3. Net Vertical Force F_net = F_s - mg',
          calculation: `F_net = ${v.springForceUpN.toFixed(2)} N - ${v.weightN.toFixed(2)} N = ${v.netForceUpN >= 0 ? '+' : ''}${v.netForceUpN.toFixed(2)} N (= -k η)`,
        },
        {
          label: '4. Effective Acceleration & Period',
          calculation: `a_y = ${v.netForceUpN.toFixed(2)} / ${v.effectiveMassKg.toFixed(2)} = ${v.accelUpMs2 >= 0 ? '+' : ''}${v.accelUpMs2.toFixed(2)} m/s² · T = ${v.periodS.toFixed(2)} s`,
        },
      ],
      finalAnswer: `Δy_eq = ${v.equilibriumStretchM.toFixed(3)} m · F_net = ${v.netForceUpN >= 0 ? '+' : ''}${v.netForceUpN.toFixed(2)} N`,
    };
  }

  if (params.mode === 'series_springs') {
    const s = ev.series;
    const invExpr = s.springs.map(sp => `1/${sp.kNm.toFixed(0)}`).join(' + ');
    const invSum = s.springs.reduce((acc, sp) => acc + 1 / sp.kNm, 0);
    const stretchSumExpr = s.springs.map(sp => `${sp.stretchM.toFixed(3)} m`).join(' + ');
    return {
      title: 'Series Combination Equivalent Constant (Skill 2.B)',
      givens: [
        `Springs: ${s.springs.map(sp => `${sp.label} = ${sp.kNm} N/m`).join(', ')}`,
        `Applied Pull F = ${params.comboAppliedForceN.toFixed(1)} N`,
      ],
      steps: [
        {
          label: '1. Sum of Inverses (2.8.B.1.i)',
          calculation: `1/k_eq = ${invExpr} = ${invSum.toFixed(4)} m/N`,
        },
        {
          label: '2. Invert for k_eq,series (Verify < min k)',
          calculation: `k_eq,series = 1 / ${invSum.toFixed(4)} = ${s.kEqNm.toFixed(2)} N/m  (< min ${s.minKNm} N/m ✓)`,
        },
        {
          label: '3. Individual Stretches (Equal Tension F)',
          calculation: `Δx_tot = ${stretchSumExpr} = ${s.currentStretchM.toFixed(3)} m`,
        },
        {
          label: '4. Single Equivalent Spring Check',
          calculation: `Δx_eq = F / k_eq = ${s.currentTotalForceN.toFixed(1)} N / ${s.kEqNm.toFixed(2)} N/m = ${(s.currentTotalForceN / s.kEqNm).toFixed(3)} m`,
        },
      ],
      finalAnswer: `k_eq,series = ${s.kEqNm.toFixed(2)} N/m · Δx_tot = ${s.currentStretchM.toFixed(3)} m`,
    };
  }

  const p = ev.parallel;
  const sumExpr = p.springs.map(sp => `${sp.kNm.toFixed(0)}`).join(' + ');
  const forceSumExpr = p.springs.map(sp => `${sp.forceN.toFixed(1)} N`).join(' + ');
  return {
    title: 'Parallel Combination Equivalent Constant (Skill 2.B)',
    givens: [
      `Springs: ${p.springs.map(sp => `${sp.label} = ${sp.kNm} N/m`).join(', ')}`,
      `Applied Pull F = ${params.comboAppliedForceN.toFixed(1)} N`,
    ],
    steps: [
      {
        label: '1. Direct Sum of Stiffnesses (2.8.B.1.iii)',
        calculation: `k_eq,parallel = ${sumExpr} = ${p.kEqNm.toFixed(1)} N/m`,
      },
      {
        label: '2. Shared Displacement Δx = F / k_eq',
        calculation: `Δx = ${p.currentTotalForceN.toFixed(1)} N / ${p.kEqNm.toFixed(1)} N/m = ${p.currentStretchM.toFixed(3)} m`,
      },
      {
        label: '3. Individual Spring Forces (F_i = k_i Δx)',
        calculation: `F_tot = ${forceSumExpr} = ${p.currentTotalForceN.toFixed(1)} N`,
      },
      {
        label: '4. Stiffer Spring Share',
        calculation: `Each spring carries k_i / k_eq of the total load while stretching identically.`,
      },
    ],
    finalAnswer: `k_eq,parallel = ${p.kEqNm.toFixed(1)} N/m · Δx = ${p.currentStretchM.toFixed(3)} m`,
  };
}

// ============================================================================
// SKILL 2.D — FUNCTIONAL DEPENDENCE & FACTOR-OF-CHANGE PREDICTIONS
// ============================================================================

export interface ScalingScenario28 {
  id: string;
  ekCode: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  factorSummary: string;
  derivation: string;
}

export const SCALING_SCENARIOS_28: ScalingScenario28[] = [
  {
    id: 'scale-series-to-parallel',
    ekCode: '2.8.B.1.i & iii',
    prompt:
      'Two identical springs (each k) are rewired from SERIES to PARALLEL under the same load F. How do k_eq and stretch Δx change?',
    options: [
      'k_eq becomes 4× larger; Δx becomes 1/4 as large',
      'k_eq becomes 2× larger; Δx becomes 1/2 as large',
      'k_eq becomes 1/4 as large; Δx becomes 4× larger',
      'k_eq stays the same; Δx stays the same',
    ],
    correctIndex: 0,
    factorSummary: 'k_par / k_ser = (2k) / (k/2) = 4×  ⇒  Δx_par = (1/4) Δx_ser',
    derivation:
      'In series, 1/k_ser = 1/k + 1/k ⇒ k_ser = k/2. In parallel, k_par = k + k = 2k. Since Δx = F/k_eq, quadrupling k_eq quarters Δx.',
  },
  {
    id: 'scale-cut-spring-half',
    ekCode: '2.8.B.1.i',
    prompt:
      'A uniform ideal spring of constant k is cut into two identical halves. What is the spring constant of ONE half?',
    options: [
      'k / 2 (half as stiff)',
      'k (unchanged)',
      '2k (twice as stiff)',
      '4k (four times as stiff)',
    ],
    correctIndex: 2,
    factorSummary: '1/k = 1/k_half + 1/k_half = 2/k_half  ⇒  k_half = 2k',
    derivation:
      'The original spring is equivalent to its two halves connected in SERIES! Under the same tension F, each half stretches by only Δx/2, so k_half = F / (Δx/2) = 2k.',
  },
  {
    id: 'scale-double-mass-vertical',
    ekCode: '2.8.A.2–3',
    prompt:
      'If you triple the mass hanging from an ideal vertical spring (3m) while keeping k constant, how does the equilibrium stretch Δy_eq change?',
    options: [
      'Increases by √3×',
      'Increases by 3×',
      'Increases by 9×',
      'Decreases by 1/3×',
    ],
    correctIndex: 1,
    factorSummary: 'Δy_eq = mg / k  ∝  m  ⇒  3× stretch',
    derivation:
      'At static equilibrium k Δy_eq = mg, so Δy_eq is directly proportional to m for an ideal Hookean spring (2.8.A.2).',
  },
  {
    id: 'scale-soft-stiff-series',
    ekCode: '2.8.B.1.ii',
    prompt:
      'A soft spring (k₁ = 20 N/m) is connected in SERIES with a very stiff spring (k₂ = 200 N/m). Which statement about k_eq is true?',
    options: [
      'k_eq is slightly greater than 200 N/m',
      'k_eq is the average, 110 N/m',
      'k_eq is slightly LESS than 20 N/m (18.2 N/m)',
      'k_eq equals 20 N/m exactly',
    ],
    correctIndex: 2,
    factorSummary: 'k_eq = (20 × 200)/(20 + 200) = 18.2 N/m < 20 N/m',
    derivation:
      'By 2.8.B.1.ii, k_eq,series is ALWAYS strictly smaller than the smallest spring constant because even the stiff spring adds a tiny extra stretch.',
  },
];

// ============================================================================
// SKILL 3.C — JUSTIFY CLAIMS WITH EVIDENCE & LAWS (TRUE / FALSE)
// ============================================================================

export interface APClaim28 {
  id: string;
  ekCode: string;
  statement: string;
  verdict: 'true' | 'false';
  justification: string;
}

export const AP_CLAIMS_28: APClaim28[] = [
  {
    id: 'c1-restoring-direction',
    ekCode: '2.8.A.3',
    statement:
      'When a horizontal block attached to a spring is pushed left past its relaxed length (Δx < 0), the spring exerts a force directed to the right (+x) back toward equilibrium.',
    verdict: 'true',
    justification:
      'True! By 2.8.A.2–3, F_s = -kΔx always points opposite displacement, directed toward the equilibrium position of the object–spring system.',
  },
  {
    id: 'c2-nonideal-mass',
    ekCode: '2.8.A.1',
    statement:
      'A heavy coiled spring whose force-versus-stretch graph is a straight line still qualifies as an "ideal spring" in AP Physics C.',
    verdict: 'false',
    justification:
      'False! Per 2.8.A.1, an ideal spring must have BOTH negligible mass AND linear proportionality F ∝ Δx. Nonnegligible mass makes a spring nonideal.',
  },
  {
    id: 'c3-series-tension',
    ekCode: '2.8.B.1.i',
    statement:
      'When two different massless springs (k₁ = 20 N/m and k₂ = 80 N/m) are pulled in series by 16 N, the stiffer spring experiences 4× more tension than the softer spring.',
    verdict: 'false',
    justification:
      'False! Massless springs in series transmit the EXACT SAME tension (16 N) through every spring. Instead, the softer spring stretches 4× farther (0.80 m vs 0.20 m).',
  },
  {
    id: 'c4-series-smaller-min',
    ekCode: '2.8.B.1.ii',
    statement:
      'Adding a third stiff spring (k₃ = 500 N/m) in series to an existing spring system makes the equivalent spring constant k_eq smaller than before.',
    verdict: 'true',
    justification:
      'True! Adding any spring in series adds a positive term 1/k₃ to 1/k_eq, strictly reducing k_eq below the smallest constituent spring constant (2.8.B.1.ii).',
  },
  {
    id: 'c5-parallel-forces',
    ekCode: '2.8.B.1.iii',
    statement:
      'Two springs in parallel (k₁ = 30 N/m, k₂ = 90 N/m) pulling a rigid bar both experience the same displacement Δx, while k₂ exerts 3× as much force as k₁.',
    verdict: 'true',
    justification:
      'True! Parallel springs share the identical displacement Δx, so F_i = k_i Δx scales with stiffness and total force adds: k_eq = k₁ + k₂ = 120 N/m (2.8.B.1.iii).',
  },
  {
    id: 'c6-vertical-equilibrium',
    ekCode: '2.8.A.3',
    statement:
      'For a mass hanging vertically on an ideal spring, the net force on the mass is always directed toward the spring’s unstretched relaxed length y_relaxed.',
    verdict: 'false',
    justification:
      'False! Gravity shifts the system’s equilibrium downward by mg/k to y_eq. The net restoring force F_net = -k(y - y_eq) is directed toward y_eq, NOT y_relaxed (2.8.A.3).',
  },
];

export const INITIAL_SPRING_TRIALS_28: SpringLabTrial[] = [
  { id: 't1', displacementM: -0.30, forceN: 12.0, behavior: 'ideal', kNm: 40 },
  { id: 't2', displacementM: -0.15, forceN: 6.0, behavior: 'ideal', kNm: 40 },
  { id: 't3', displacementM: 0.20, forceN: -8.0, behavior: 'ideal', kNm: 40 },
  { id: 't4', displacementM: 0.40, forceN: -16.0, behavior: 'ideal', kNm: 40 },
];
