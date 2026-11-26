/**
 * AP Physics C: Mechanics — Topic 2.10: Circular Motion
 * Pure Physics Engine & AP Science Practices (1.A, 2.A, 2.D, 3.C)
 *
 * Covers Learning Objectives & Essential Knowledge (CED Pages 58–60):
 *  - LO 2.10.A: Describe the motion of an object traveling in a circular path.
 *    • 2.10.A.1 (i–ii): Centripetal acceleration a_c = v²/r directed toward center.
 *    • 2.10.A.2.i: Minimum speed at top of vertical loop v = √(gr) (only F_g causes a_c).
 *    • 2.10.A.2.ii: Components of static friction & normal force on a banked surface.
 *    • 2.10.A.2.iii: Horizontal component of tension in a conical pendulum.
 *    • 2.10.A.3: Tangential acceleration a_t = dv/dt directed tangent to circular path.
 *    • 2.10.A.4: Net acceleration is vector sum a_net = a_c + a_t.
 *    • 2.10.A.5 (i–iii): Uniform circular motion period T = 1/f = 2πr/v.
 *  - LO 2.10.B / 2.10.B.1: Describe circular orbits using Kepler's third law:
 *      T² = (4π² / GM) R³  (gravitational attraction is the sole centripetal force).
 *    • Boundary Statement: Kepler's first and second laws are not required.
 */

export const G_GRAVITY = 9.81; // m/s²
export const G_UNIVERSAL = 6.6743e-11; // N·m²/kg²
export const M_EARTH = 5.972e24; // kg
export const R_EARTH = 6.371e6; // m

export type Circular210Mode =
  | 'vertical_loop'
  | 'banked_curve'
  | 'conical_pendulum'
  | 'kepler_orbit';

export interface Circular210Params {
  mode: Circular210Mode;
  // Shared / Vertical Loop & Banked Curve parameters
  massKg: number; // Object mass m (kg)
  radiusM: number; // Circular radius r (m) for loop / banked curve
  speedMs: number; // Tangential speed v (m/s)
  loopAngleDeg: number; // Position angle θ on vertical loop (0°=right, 90°=top, 270°=bottom)
  tangentialAccelMs2: number; // Tangential acceleration a_t (m/s²) for 2.10.A.3 & 2.10.A.4
  // Banked Curve parameters (2.10.A.2.ii)
  bankAngleDeg: number; // Bank angle β (degrees, 0° to 45°)
  muStatic: number; // Static friction coefficient μ_s (0 to 1.0)
  // Conical Pendulum parameters (2.10.A.2.iii)
  pendulumLengthM: number; // String length L (m)
  coneAngleDeg: number; // Half-apex angle φ from vertical (degrees, 10° to 75°)
  // Kepler Circular Orbit parameters (2.10.B.1)
  centralMassEarth: number; // Central body mass M in units of M_Earth (0.25 to 4.0)
  orbitRadiusEarth: number; // Primary satellite radius R_A in units of R_Earth (1.2 to 7.0)
  orbitRadiusBEarth: number; // Comparison satellite radius R_B in units of R_Earth (1.2 to 7.0)
  satMassKg: number; // Satellite mass m (kg) — demonstrates m cancels in v, a_c, T
  // Animation orbital phase (radians) for horizontal/conical/kepler revolution
  phaseRad: number;
  phaseBRad: number;
  // Visual toggles
  showVectors: boolean;
  showComponents: boolean;
}

export const DEFAULT_CIRCULAR_210_PARAMS: Circular210Params = {
  mode: 'vertical_loop',
  massKg: 2.0,
  radiusM: 4.0,
  speedMs: 8.0,
  loopAngleDeg: 90, // Start right at the iconic AP top-of-loop position
  tangentialAccelMs2: 0.0,
  bankAngleDeg: 25,
  muStatic: 0.35,
  pendulumLengthM: 3.0,
  coneAngleDeg: 35,
  centralMassEarth: 1.0,
  orbitRadiusEarth: 2.0,
  orbitRadiusBEarth: 4.0,
  satMassKg: 500,
  phaseRad: 0.45,
  phaseBRad: 2.1,
  showVectors: true,
  showComponents: true,
};

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// ============================================================================
// MODE 1: VERTICAL LOOP & NON-UNIFORM CIRCULAR MOTION (2.10.A.1, 2.i, 3, 4, 5)
// ============================================================================
export interface VerticalLoopSolution {
  massKg: number;
  radiusM: number;
  speedMs: number;
  angleDeg: number;
  angleRad: number;
  acMs2: number; // v² / r (directed toward center)
  atMs2: number; // tangential acceleration dv/dt
  aNetMs2: number; // √(a_c² + a_t²)
  aNetAngleFromRadialDeg: number; // atan2(a_t, a_c)
  fcN: number; // Required centripetal force m v² / r
  fgN: number; // Weight mg
  fgRadialInwardN: number; // mg sin(θ) (inward component of gravity)
  fgTangentN: number; // -mg cos(θ)
  normalRawN: number; // m(v²/r - g sinθ)
  normalForceN: number; // max(0, normalRawN)
  maintainsContact: boolean; // normalRawN >= -1e-6
  vMinTopMs: number; // √(g r)
  isCriticalTop: boolean;
  periodS: number; // 2πr / v (uniform circular motion reference)
  frequencyHz: number; // 1 / T
  omegaRadS: number; // v / r
  isUniform: boolean; // |a_t| < 1e-4
}

export function solveVerticalLoop(
  massKg: number,
  radiusM: number,
  speedMs: number,
  angleDeg: number,
  tangentialAccelMs2: number,
): VerticalLoopSolution {
  const m = Math.max(0.1, massKg);
  const r = Math.max(0.5, radiusM);
  const v = Math.max(0.1, speedMs);
  const normDeg = ((angleDeg % 360) + 360) % 360;
  const angleRad = degToRad(normDeg);

  const acMs2 = (v * v) / r;
  const atMs2 = tangentialAccelMs2;
  const aNetMs2 = Math.hypot(acMs2, atMs2);
  const aNetAngleFromRadialDeg = radToDeg(Math.atan2(atMs2, acMs2));

  const fcN = m * acMs2;
  const fgN = m * G_GRAVITY;
  // Angle θ measured CCW from +x: top = 90° (sinθ = +1, gravity points inward),
  // bottom = 270° (sinθ = -1, gravity points outward).
  const fgRadialInwardN = fgN * Math.sin(angleRad);
  const fgTangentN = -fgN * Math.cos(angleRad);

  const normalRawN = fcN - fgRadialInwardN;
  const maintainsContact = normalRawN >= -1e-5;
  const normalForceN = Math.max(0, normalRawN);

  const vMinTopMs = Math.sqrt(G_GRAVITY * r);
  const nearTop = Math.abs(normDeg - 90) <= 3.5;
  const isCriticalTop =
    nearTop && Math.abs(v - vMinTopMs) / Math.max(vMinTopMs, 1e-6) <= 0.03;

  const periodS = (2 * Math.PI * r) / v;
  const frequencyHz = 1 / periodS;
  const omegaRadS = v / r;

  return {
    massKg: m,
    radiusM: r,
    speedMs: v,
    angleDeg: normDeg,
    angleRad,
    acMs2,
    atMs2,
    aNetMs2,
    aNetAngleFromRadialDeg,
    fcN,
    fgN,
    fgRadialInwardN,
    fgTangentN,
    normalRawN,
    normalForceN,
    maintainsContact,
    vMinTopMs,
    isCriticalTop,
    periodS,
    frequencyHz,
    omegaRadS,
    isUniform: Math.abs(atMs2) < 1e-4,
  };
}

// ============================================================================
// MODE 2: BANKED CURVE WITH STATIC FRICTION (2.10.A.2.ii, 2.10.A.1, 2.10.A.5)
// ============================================================================
export type BankedCurveStatus =
  | 'ideal_frictionless'
  | 'safe_down_slope'
  | 'safe_up_slope'
  | 'skidding_outward'
  | 'sliding_inward';

export interface BankedCurveSolution {
  massKg: number;
  radiusM: number;
  bankAngleDeg: number;
  bankAngleRad: number;
  muStatic: number;
  speedMs: number;
  acMs2: number; // v²/r horizontal inward
  fcN: number; // mv²/r horizontal inward
  fgN: number; // mg downward
  normalForceN: number; // m(g cosβ + (v²/r) sinβ)
  normalHorizontalN: number; // F_N sinβ (inward)
  normalVerticalN: number; // F_N cosβ (upward)
  frictionReqN: number; // Signed: >0 down-bank (helps inward), <0 up-bank (resists sliding in)
  frictionMaxN: number; // μ_s F_N
  frictionHorizontalN: number; // f_s cosβ (inward if >0, outward if <0)
  frictionVerticalN: number; // -f_s sinβ (downward if f_s>0, upward if f_s<0)
  vIdealMs: number; // √(g r tanβ)
  vMinMs: number; // Min safe speed before sliding inward
  vMaxMs: number; // Max safe speed before skidding outward (Infinity if μ_s tanβ >= 1)
  isSafe: boolean;
  status: BankedCurveStatus;
  periodS: number;
  frequencyHz: number;
}

export function solveBankedCurve(
  massKg: number,
  radiusM: number,
  bankAngleDeg: number,
  muStatic: number,
  speedMs: number,
): BankedCurveSolution {
  const m = Math.max(0.1, massKg);
  const r = Math.max(1.0, radiusM);
  const betaDeg = clamp(bankAngleDeg, 0, 50);
  const beta = degToRad(betaDeg);
  const mu = clamp(muStatic, 0, 1.2);
  const v = Math.max(0.1, speedMs);

  const sinB = Math.sin(beta);
  const cosB = Math.cos(beta);
  const tanB = Math.tan(beta);

  const acMs2 = (v * v) / r;
  const fcN = m * acMs2;
  const fgN = m * G_GRAVITY;

  // Exact solution of:
  //   F_N sinβ + f_s cosβ = m v² / r   (horizontal inward)
  //   F_N cosβ - f_s sinβ = m g        (vertical upward)
  const normalForceN = m * (G_GRAVITY * cosB + acMs2 * sinB);
  const frictionReqN = m * (acMs2 * cosB - G_GRAVITY * sinB);
  const frictionMaxN = mu * normalForceN;

  const normalHorizontalN = normalForceN * sinB;
  const normalVerticalN = normalForceN * cosB;
  const frictionHorizontalN = frictionReqN * cosB;
  const frictionVerticalN = -frictionReqN * sinB;

  const vIdealMs = Math.sqrt(Math.max(0, G_GRAVITY * r * tanB));

  const denomMax = cosB - mu * sinB;
  const vMaxMs =
    denomMax > 1e-6
      ? Math.sqrt(Math.max(0, (G_GRAVITY * r * (sinB + mu * cosB)) / denomMax))
      : Number.POSITIVE_INFINITY;

  const numerMin = sinB - mu * cosB;
  const vMinMs =
    numerMin > 1e-6
      ? Math.sqrt((G_GRAVITY * r * numerMin) / (cosB + mu * sinB))
      : 0;

  let status: BankedCurveStatus;
  let isSafe = true;
  if (frictionReqN > frictionMaxN + 1e-4) {
    status = 'skidding_outward';
    isSafe = false;
  } else if (frictionReqN < -frictionMaxN - 1e-4) {
    status = 'sliding_inward';
    isSafe = false;
  } else if (Math.abs(frictionReqN) <= Math.max(0.08, fgN * 0.015)) {
    status = 'ideal_frictionless';
  } else if (frictionReqN > 0) {
    status = 'safe_down_slope';
  } else {
    status = 'safe_up_slope';
  }

  const periodS = (2 * Math.PI * r) / v;
  const frequencyHz = 1 / periodS;

  return {
    massKg: m,
    radiusM: r,
    bankAngleDeg: betaDeg,
    bankAngleRad: beta,
    muStatic: mu,
    speedMs: v,
    acMs2,
    fcN,
    fgN,
    normalForceN,
    normalHorizontalN,
    normalVerticalN,
    frictionReqN,
    frictionMaxN,
    frictionHorizontalN,
    frictionVerticalN,
    vIdealMs,
    vMinMs,
    vMaxMs,
    isSafe,
    status,
    periodS,
    frequencyHz,
  };
}

// ============================================================================
// MODE 3: CONICAL PENDULUM (2.10.A.2.iii, 2.10.A.1, 2.10.A.5)
// ============================================================================
export interface ConicalPendulumSolution {
  massKg: number;
  lengthM: number;
  angleDeg: number;
  angleRad: number;
  radiusM: number; // L sinφ
  heightM: number; // L cosφ
  tensionN: number; // mg / cosφ
  tensionVerticalN: number; // T cosφ = mg
  tensionRadialN: number; // T sinφ = mg tanφ = F_c
  fgN: number; // mg
  acMs2: number; // g tanφ
  speedMs: number; // √(g L sinφ tanφ)
  periodS: number; // 2π √(L cosφ / g) = 2π r / v
  frequencyHz: number; // 1 / T
  omegaRadS: number; // √(g / (L cosφ))
}

export function solveConicalPendulum(
  massKg: number,
  lengthM: number,
  angleDeg: number,
): ConicalPendulumSolution {
  const m = Math.max(0.1, massKg);
  const L = Math.max(0.5, lengthM);
  const phiDeg = clamp(angleDeg, 5, 78);
  const phi = degToRad(phiDeg);

  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const tanP = Math.tan(phi);

  const radiusM = L * sinP;
  const heightM = L * cosP;
  const fgN = m * G_GRAVITY;
  const tensionN = fgN / cosP;
  const tensionVerticalN = tensionN * cosP; // equals fgN
  const tensionRadialN = tensionN * sinP; // equals mg tanφ
  const acMs2 = G_GRAVITY * tanP;
  const speedMs = Math.sqrt(G_GRAVITY * radiusM * tanP);
  const periodS = 2 * Math.PI * Math.sqrt(heightM / G_GRAVITY);
  const frequencyHz = 1 / periodS;
  const omegaRadS = (2 * Math.PI) / periodS;

  return {
    massKg: m,
    lengthM: L,
    angleDeg: phiDeg,
    angleRad: phi,
    radiusM,
    heightM,
    tensionN,
    tensionVerticalN,
    tensionRadialN,
    fgN,
    acMs2,
    speedMs,
    periodS,
    frequencyHz,
    omegaRadS,
  };
}

// ============================================================================
// MODE 4: CIRCULAR ORBITS & KEPLER'S THIRD LAW (LO 2.10.B, 2.10.B.1)
// ============================================================================
export interface SatelliteOrbitMetrics {
  radiusEarthRadii: number;
  radiusM: number;
  speedMs: number;
  speedKmS: number;
  acMs2: number;
  fgN: number;
  periodS: number;
  periodHours: number;
  frequencyHz: number;
  tSquaredOverRCubed: number; // 4π² / (GM)
}

export interface KeplerOrbitSolution {
  centralMassEarth: number;
  centralMassKg: number;
  satMassKg: number;
  keplerConstantS2M3: number; // 4π² / (GM)
  satA: SatelliteOrbitMetrics;
  satB: SatelliteOrbitMetrics;
  radiusRatioBtoA: number;
  periodRatioBtoA: number; // (R_B / R_A)^(3/2)
  speedRatioBtoA: number; // √(R_A / R_B)
  tRatioSquared: number;
  rRatioCubed: number;
}

function solveSingleSatellite(
  centralMassKg: number,
  radiusEarthRadii: number,
  satMassKg: number,
): SatelliteOrbitMetrics {
  const rRe = clamp(radiusEarthRadii, 1.05, 8.0);
  const R = rRe * R_EARTH;
  const mu = G_UNIVERSAL * centralMassKg;
  const acMs2 = mu / (R * R);
  const fgN = satMassKg * acMs2;
  const speedMs = Math.sqrt(mu / R);
  const periodS = (2 * Math.PI * R) / speedMs;
  const frequencyHz = 1 / periodS;
  const tSquaredOverRCubed = (periodS * periodS) / (R * R * R);

  return {
    radiusEarthRadii: rRe,
    radiusM: R,
    speedMs,
    speedKmS: speedMs / 1000,
    acMs2,
    fgN,
    periodS,
    periodHours: periodS / 3600,
    frequencyHz,
    tSquaredOverRCubed,
  };
}

export function solveKeplerOrbit(
  centralMassEarth: number,
  radiusEarthRadii: number,
  satMassKg: number,
  radiusBEarthRadii: number,
): KeplerOrbitSolution {
  const mScale = clamp(centralMassEarth, 0.2, 6.0);
  const M = mScale * M_EARTH;
  const mSat = Math.max(10, satMassKg);
  const keplerConstantS2M3 = (4 * Math.PI * Math.PI) / (G_UNIVERSAL * M);

  const satA = solveSingleSatellite(M, radiusEarthRadii, mSat);
  const satB = solveSingleSatellite(M, radiusBEarthRadii, mSat);

  const radiusRatioBtoA = satB.radiusM / satA.radiusM;
  const periodRatioBtoA = satB.periodS / satA.periodS;
  const speedRatioBtoA = satB.speedMs / satA.speedMs;

  return {
    centralMassEarth: mScale,
    centralMassKg: M,
    satMassKg: mSat,
    keplerConstantS2M3,
    satA,
    satB,
    radiusRatioBtoA,
    periodRatioBtoA,
    speedRatioBtoA,
    tRatioSquared: periodRatioBtoA * periodRatioBtoA,
    rRatioCubed: radiusRatioBtoA * radiusRatioBtoA * radiusRatioBtoA,
  };
}

// ============================================================================
// UNIFIED EVALUATION
// ============================================================================
export interface Circular210Evaluation {
  mode: Circular210Mode;
  loop: VerticalLoopSolution;
  banked: BankedCurveSolution;
  conical: ConicalPendulumSolution;
  kepler: KeplerOrbitSolution;
  keyInsight: string;
}

export function evaluateCircular210(params: Circular210Params): Circular210Evaluation {
  const loop = solveVerticalLoop(
    params.massKg,
    params.radiusM,
    params.speedMs,
    params.loopAngleDeg,
    params.tangentialAccelMs2,
  );
  const banked = solveBankedCurve(
    params.massKg,
    Math.max(5, params.radiusM * 5), // Realistic road curve radius 5× loop scale (10m–50m)
    params.bankAngleDeg,
    params.muStatic,
    params.speedMs,
  );
  const conical = solveConicalPendulum(
    params.massKg,
    params.pendulumLengthM,
    params.coneAngleDeg,
  );
  const kepler = solveKeplerOrbit(
    params.centralMassEarth,
    params.orbitRadiusEarth,
    params.satMassKg,
    params.orbitRadiusBEarth,
  );

  let keyInsight = '';
  if (params.mode === 'vertical_loop') {
    if (!loop.maintainsContact) {
      keyInsight = `Contact lost (v = ${loop.speedMs.toFixed(2)} m/s < v_min = ${loop.vMinTopMs.toFixed(2)} m/s at θ=${loop.angleDeg.toFixed(0)}°): gravity alone exceeds required mv²/r!`;
    } else if (loop.isCriticalTop) {
      keyInsight = `2.10.A.2.i Critical Top Threshold: v ≈ √(gr) = ${loop.vMinTopMs.toFixed(2)} m/s → F_N = 0 N, so gravity F_g alone provides a_c = g!`;
    } else if (!loop.isUniform) {
      keyInsight = `2.10.A.3–4 Non-Uniform Circular Motion: a_net = √(a_c² + a_t²) = ${loop.aNetMs2.toFixed(2)} m/s² angled ${Math.abs(loop.aNetAngleFromRadialDeg).toFixed(1)}° ${loop.atMs2 > 0 ? 'ahead of' : 'behind'} center.`;
    } else {
      keyInsight = `2.10.A.1 & 2.10.A.5 Uniform Circular Motion: a_c = v²/r = ${loop.acMs2.toFixed(2)} m/s² inward, T = 2πr/v = ${loop.periodS.toFixed(2)} s (f = ${loop.frequencyHz.toFixed(2)} Hz).`;
    }
  } else if (params.mode === 'banked_curve') {
    if (banked.status === 'ideal_frictionless') {
      keyInsight = `2.10.A.2.ii Ideal Banked Speed v = √(gr tanβ) = ${banked.vIdealMs.toFixed(2)} m/s: f_s = 0 N, normal component F_N sinβ alone provides F_c!`;
    } else if (banked.status === 'skidding_outward') {
      keyInsight = `Skidding Outward! v = ${banked.speedMs.toFixed(1)} m/s > v_max (${banked.vMaxMs.toFixed(1)} m/s): max static friction + F_N sinβ cannot supply mv²/r.`;
    } else if (banked.status === 'sliding_inward') {
      keyInsight = `Sliding Inward! v = ${banked.speedMs.toFixed(1)} m/s < v_min (${banked.vMinMs.toFixed(1)} m/s): gravity pulls car down-bank past static friction.`;
    } else if (banked.status === 'safe_down_slope') {
      keyInsight = `v > v_ideal (${banked.vIdealMs.toFixed(1)} m/s): static friction f_s = ${banked.frictionReqN.toFixed(1)} N points DOWN-bank so f_s cosβ assists F_N sinβ inward.`;
    } else {
      keyInsight = `v < v_ideal (${banked.vIdealMs.toFixed(1)} m/s): static friction f_s = ${Math.abs(banked.frictionReqN).toFixed(1)} N points UP-bank to prevent sliding inward.`;
    }
  } else if (params.mode === 'conical_pendulum') {
    keyInsight = `2.10.A.2.iii Conical Pendulum: horizontal T sinφ = ${conical.tensionRadialN.toFixed(1)} N gives a_c = g tanφ = ${conical.acMs2.toFixed(2)} m/s²; T = ${conical.periodS.toFixed(2)} s is independent of mass m.`;
  } else {
    keyInsight = `2.10.B.1 Kepler’s 3rd Law: T_B/T_A = (R_B/R_A)^(3/2) = ${kepler.periodRatioBtoA.toFixed(2)} → (T_B/T_A)² = ${kepler.tRatioSquared.toFixed(2)} = (R_B/R_A)³ = ${kepler.rRatioCubed.toFixed(2)}.`;
  }

  return {
    mode: params.mode,
    loop,
    banked,
    conical,
    kepler,
    keyInsight,
  };
}

// ============================================================================
// SKILL 1.A — QUALITATIVE & MODEL GRAPHS + TRIAL PLOTTING
// ============================================================================
export type CircularChartKind = 'primary' | 'secondary' | 'tertiary';

export interface CircularChartPoint {
  x: number;
  y: number;
}

export interface CircularChartMarker {
  x: number;
  y: number;
  label: string;
  color: string;
}

export interface CircularChartRefLine {
  axis: 'x' | 'y';
  value: number;
  label: string;
  color: string;
}

export interface CircularChartData {
  title: string;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  curveA: CircularChartPoint[];
  curveB?: CircularChartPoint[];
  curveALabel: string;
  curveBLabel?: string;
  currentPoint: CircularChartPoint;
  secondaryPoint?: CircularChartPoint;
  refLines: CircularChartRefLine[];
  qualitativeTakeaway: string;
}

export interface CircularTrialPoint {
  id: string;
  mode: Circular210Mode;
  label: string;
  // Store coordinates for the primary chart of each mode
  xPrimary: number;
  yPrimary: number;
  xSecondary: number;
  ySecondary: number;
  xTertiary: number;
  yTertiary: number;
}

export const INITIAL_CIRCULAR_TRIALS_210: CircularTrialPoint[] = [];

export function getChartTabLabels210(mode: Circular210Mode): Array<{
  id: CircularChartKind;
  label: string;
}> {
  if (mode === 'vertical_loop') {
    return [
      { id: 'primary', label: 'a_c(v)' },
      { id: 'secondary', label: 'F_N(θ)' },
      { id: 'tertiary', label: 'T(v)' },
    ];
  }
  if (mode === 'banked_curve') {
    return [
      { id: 'primary', label: 'f_s(v)' },
      { id: 'secondary', label: 'v_safe(β)' },
      { id: 'tertiary', label: 'F_N(v)' },
    ];
  }
  if (mode === 'conical_pendulum') {
    return [
      { id: 'primary', label: 'T(φ)' },
      { id: 'secondary', label: 'v(φ)' },
      { id: 'tertiary', label: 'a_c(φ)' },
    ];
  }
  return [
    { id: 'primary', label: 'T² vs R³' },
    { id: 'secondary', label: 'v(R)' },
    { id: 'tertiary', label: 'a_c(R)' },
  ];
}

export function buildCircularChartData210(
  params: Circular210Params,
  evaluation: Circular210Evaluation,
  kind: CircularChartKind,
): CircularChartData {
  const N = 64;

  if (params.mode === 'vertical_loop') {
    const loop = evaluation.loop;
    const r = loop.radiusM;
    const m = loop.massKg;

    if (kind === 'primary') {
      const xMax = 16;
      const yMax = (xMax * xMax) / r;
      const curveA: CircularChartPoint[] = [];
      for (let i = 0; i <= N; i++) {
        const v = (xMax * i) / N;
        curveA.push({ x: v, y: (v * v) / r });
      }
      return {
        title: `Centripetal Acceleration a_c = v²/r (r = ${r.toFixed(1)} m)`,
        xLabel: 'Tangential Speed v (m/s)',
        yLabel: 'a_c (m/s²)',
        xMin: 0,
        xMax,
        yMin: 0,
        yMax: Math.max(20, yMax),
        curveA,
        curveALabel: 'a_c = v²/r',
        currentPoint: { x: loop.speedMs, y: loop.acMs2 },
        refLines: [
          {
            axis: 'x',
            value: loop.vMinTopMs,
            label: `v_min=√(gr)=${loop.vMinTopMs.toFixed(1)}`,
            color: '#f59e0b',
          },
          {
            axis: 'y',
            value: G_GRAVITY,
            label: 'a_c = g',
            color: '#34d399',
          },
        ],
        qualitativeTakeaway:
          'Concave-up parabola through the origin: doubling speed v quadruples centripetal acceleration a_c. Contact at the loop top requires a_c ≥ g (v ≥ √(gr)).',
      };
    }

    if (kind === 'secondary') {
      const curveA: CircularChartPoint[] = [];
      let yMax = 20;
      let yMin = 0;
      for (let i = 0; i <= N; i++) {
        const deg = (360 * i) / N;
        const sol = solveVerticalLoop(m, r, loop.speedMs, deg, 0);
        curveA.push({ x: deg, y: sol.normalRawN });
        if (sol.normalRawN > yMax) yMax = sol.normalRawN;
        if (sol.normalRawN < yMin) yMin = sol.normalRawN;
      }
      return {
        title: `Track Normal Force F_N(θ) Around Loop`,
        xLabel: 'Loop Angle θ (deg · 90°=Top, 270°=Bot)',
        yLabel: 'F_N (N)',
        xMin: 0,
        xMax: 360,
        yMin: Math.min(-5, Math.floor(yMin * 1.15)),
        yMax: Math.ceil(yMax * 1.12),
        curveA,
        curveALabel: 'F_N = mv²/r − mg sinθ',
        currentPoint: { x: loop.angleDeg, y: loop.normalRawN },
        refLines: [
          { axis: 'y', value: 0, label: 'F_N = 0 (Loss of Contact)', color: '#f43f5e' },
          { axis: 'x', value: 90, label: 'Top 90°', color: '#f59e0b' },
          { axis: 'x', value: 270, label: 'Bot 270°', color: '#38bdf8' },
        ],
        qualitativeTakeaway:
          'Sinusoidal variation: F_N is smallest at the top (90°, where F_g assists inward) and largest at the bottom (270°, where F_N must overcome F_g plus supply F_c).',
      };
    }

    // tertiary: T(v) = 2πr / v
    const xMin = 1.5;
    const xMax = 16;
    const yMax = (2 * Math.PI * r) / xMin;
    const curveA: CircularChartPoint[] = [];
    for (let i = 0; i <= N; i++) {
      const v = xMin + ((xMax - xMin) * i) / N;
      curveA.push({ x: v, y: (2 * Math.PI * r) / v });
    }
    return {
      title: `Uniform Circular Period T(v) = 2πr / v`,
      xLabel: 'Constant Speed v (m/s)',
      yLabel: 'Period T (s)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax: Math.min(25, Math.ceil(yMax * 1.05)),
      curveA,
      curveALabel: 'T = 2πr / v',
      currentPoint: {
        x: loop.speedMs,
        y: Math.min(25, loop.periodS),
      },
      refLines: [],
      qualitativeTakeaway:
        'Inverse hyperbola (T ∝ 1/v): faster constant speed shrinks the revolution period T and increases frequency f = 1/T proportionally.',
    };
  }

  if (params.mode === 'banked_curve') {
    const b = evaluation.banked;
    const r = b.radiusM;
    const m = b.massKg;

    if (kind === 'primary') {
      const xMax = Math.max(24, Math.ceil(b.vIdealMs * 1.8));
      const curveA: CircularChartPoint[] = [];
      const curveB: CircularChartPoint[] = []; // +f_s,max envelope
      let yAbsMax = 15;
      for (let i = 0; i <= N; i++) {
        const v = 0.2 + ((xMax - 0.2) * i) / N;
        const sol = solveBankedCurve(m, r, b.bankAngleDeg, b.muStatic, v);
        curveA.push({ x: v, y: sol.frictionReqN });
        curveB.push({ x: v, y: sol.frictionMaxN });
        yAbsMax = Math.max(yAbsMax, Math.abs(sol.frictionReqN), sol.frictionMaxN);
      }
      const lim = Math.min(80, Math.ceil(yAbsMax * 1.12));
      return {
        title: `Required Static Friction f_s(v) vs Speed`,
        xLabel: 'Speed v (m/s)',
        yLabel: 'f_s (+Down / −Up) [N]',
        xMin: 0,
        xMax,
        yMin: -lim,
        yMax: lim,
        curveA,
        curveB,
        curveALabel: 'f_s,req (down-bank +)',
        curveBLabel: '+f_s,max = μ_s F_N',
        currentPoint: { x: b.speedMs, y: clamp(b.frictionReqN, -lim, lim) },
        refLines: [
          { axis: 'y', value: 0, label: 'f_s = 0', color: '#34d399' },
          {
            axis: 'x',
            value: b.vIdealMs,
            label: `v_ideal=${b.vIdealMs.toFixed(1)}`,
            color: '#f59e0b',
          },
        ],
        qualitativeTakeaway:
          'Quadratic cross-over at v_ideal = √(gr tanβ): below v_ideal friction points UP-bank (negative); at v_ideal friction vanishes; above v_ideal friction points DOWN-bank until hitting μ_s F_N.',
      };
    }

    if (kind === 'secondary') {
      const curveA: CircularChartPoint[] = []; // v_ideal(β)
      const curveB: CircularChartPoint[] = []; // v_max(β)
      const xMax = 45;
      const yMax = 35;
      for (let i = 0; i <= N; i++) {
        const deg = (xMax * i) / N;
        const sol = solveBankedCurve(m, r, deg, b.muStatic, b.speedMs);
        curveA.push({ x: deg, y: Math.min(yMax, sol.vIdealMs) });
        curveB.push({
          x: deg,
          y: Number.isFinite(sol.vMaxMs) ? Math.min(yMax, sol.vMaxMs) : yMax,
        });
      }
      return {
        title: `Ideal & Max Safe Speed vs Bank Angle β`,
        xLabel: 'Bank Angle β (deg)',
        yLabel: 'Speed v (m/s)',
        xMin: 0,
        xMax,
        yMin: 0,
        yMax,
        curveA,
        curveB,
        curveALabel: 'v_ideal = √(gr tanβ)',
        curveBLabel: 'v_max (with μ_s)',
        currentPoint: { x: b.bankAngleDeg, y: Math.min(yMax, b.speedMs) },
        refLines: [
          { axis: 'x', value: b.bankAngleDeg, label: `β=${b.bankAngleDeg}°`, color: '#38bdf8' },
        ],
        qualitativeTakeaway:
          'Steeper banking increases the horizontal normal component F_N sinβ, raising both the zero-friction design speed v_ideal and the maximum no-skid speed v_max.',
      };
    }

    // tertiary: F_N(v)
    const xMax = 24;
    const curveA: CircularChartPoint[] = [];
    let yMax = m * G_GRAVITY * 1.5;
    for (let i = 0; i <= N; i++) {
      const v = (xMax * i) / N;
      const sol = solveBankedCurve(m, r, b.bankAngleDeg, b.muStatic, v);
      curveA.push({ x: v, y: sol.normalForceN });
      if (sol.normalForceN > yMax) yMax = sol.normalForceN;
    }
    return {
      title: `Normal Force F_N(v) on Banked Curve`,
      xLabel: 'Speed v (m/s)',
      yLabel: 'Normal Force F_N (N)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax: Math.ceil(yMax * 1.1),
      curveA,
      curveALabel: 'F_N = m(g cosβ + v²/r sinβ)',
      currentPoint: { x: b.speedMs, y: b.normalForceN },
      refLines: [
        { axis: 'y', value: b.fgN, label: 'mg', color: '#f59e0b' },
      ],
      qualitativeTakeaway:
        'Common AP trap: on a banked turn, F_N is NOT mg cosβ! Because acceleration is horizontal (not along the ramp), F_N grows quadratically with v² and exceeds mg at v_ideal (F_N = mg/cosβ).',
    };
  }

  if (params.mode === 'conical_pendulum') {
    const c = evaluation.conical;
    const L = c.lengthM;
    const m = c.massKg;

    if (kind === 'primary') {
      const curveA: CircularChartPoint[] = [];
      const t0 = 2 * Math.PI * Math.sqrt(L / G_GRAVITY);
      for (let i = 0; i <= N; i++) {
        const deg = 5 + (70 * i) / N;
        const sol = solveConicalPendulum(m, L, deg);
        curveA.push({ x: deg, y: sol.periodS });
      }
      return {
        title: `Conical Pendulum Period T(φ) = 2π√(L cosφ / g)`,
        xLabel: 'Cone Angle φ from Vertical (deg)',
        yLabel: 'Period T (s)',
        xMin: 0,
        xMax: 80,
        yMin: 0,
        yMax: Math.ceil(t0 * 1.15 * 10) / 10,
        curveA,
        curveALabel: 'T = 2π√(L cosφ / g)',
        currentPoint: { x: c.angleDeg, y: c.periodS },
        refLines: [
          { axis: 'y', value: t0, label: `Small-angle T₀=${t0.toFixed(2)}s`, color: '#38bdf8' },
        ],
        qualitativeTakeaway:
          'As cone angle φ increases, vertical height h = L cosφ shrinks, so the period T decreases smoothly and is completely independent of bob mass m.',
      };
    }

    if (kind === 'secondary') {
      const curveA: CircularChartPoint[] = [];
      let yMax = 10;
      for (let i = 0; i <= N; i++) {
        const deg = 5 + (70 * i) / N;
        const sol = solveConicalPendulum(m, L, deg);
        curveA.push({ x: deg, y: sol.speedMs });
        if (sol.speedMs > yMax) yMax = sol.speedMs;
      }
      return {
        title: `Orbital Speed v(φ) = √(gL sinφ tanφ)`,
        xLabel: 'Cone Angle φ (deg)',
        yLabel: 'Speed v (m/s)',
        xMin: 0,
        xMax: 80,
        yMin: 0,
        yMax: Math.ceil(yMax * 1.1),
        curveA,
        curveALabel: 'v = √(gL sinφ tanφ)',
        currentPoint: { x: c.angleDeg, y: c.speedMs },
        refLines: [],
        qualitativeTakeaway:
          'Speed diverges asymptotically as φ → 90° because some vertical tension component T cosφ = mg is always needed to support the bob against gravity.',
      };
    }

    // tertiary: a_c(φ) = g tanφ
    const curveA: CircularChartPoint[] = [];
    let yMax = 25;
    for (let i = 0; i <= N; i++) {
      const deg = 5 + (70 * i) / N;
      const sol = solveConicalPendulum(m, L, deg);
      curveA.push({ x: deg, y: sol.acMs2 });
      if (sol.acMs2 > yMax) yMax = sol.acMs2;
    }
    return {
      title: `Horizontal Centripetal Accel a_c(φ) = g tanφ`,
      xLabel: 'Cone Angle φ (deg)',
      yLabel: 'a_c (m/s²)',
      xMin: 0,
      xMax: 80,
      yMin: 0,
      yMax: Math.ceil(yMax * 1.08),
      curveA,
      curveALabel: 'a_c = g tanφ',
      currentPoint: { x: c.angleDeg, y: c.acMs2 },
      refLines: [
        { axis: 'x', value: 45, label: '45° → a_c = g', color: '#f59e0b' },
      ],
      qualitativeTakeaway:
        'At φ = 45°, tan(45°) = 1 so horizontal centripetal acceleration equals g exactly (a_c = 9.81 m/s²). Above 45°, a_c rises steeply like tanφ.',
    };
  }

  // Mode 4: kepler_orbit
  const k = evaluation.kepler;
  if (kind === 'primary') {
    // T² (hr²) vs R³ (R_E³) — Linear Kepler's 3rd Law plot!
    const maxR = Math.max(5.5, k.satA.radiusEarthRadii, k.satB.radiusEarthRadii) * 1.08;
    const xMax = maxR * maxR * maxR;
    const slopeHr2PerRe3 =
      (k.satA.periodHours * k.satA.periodHours) /
      Math.pow(k.satA.radiusEarthRadii, 3);
    const yMax = slopeHr2PerRe3 * xMax;

    const curveA: CircularChartPoint[] = [];
    for (let i = 0; i <= N; i++) {
      const r3 = (xMax * i) / N;
      curveA.push({ x: r3, y: slopeHr2PerRe3 * r3 });
    }
    return {
      title: `Kepler’s 3rd Law: T² vs R³ (Slope = 4π² / GM)`,
      xLabel: 'Orbital Radius Cubed R³ (R_⊕³)',
      yLabel: 'Period Squared T² (hr²)',
      xMin: 0,
      xMax,
      yMin: 0,
      yMax: Math.max(10, yMax * 1.08),
      curveA,
      curveALabel: 'T² = (4π²/GM) R³',
      currentPoint: {
        x: Math.pow(k.satA.radiusEarthRadii, 3),
        y: k.satA.periodHours * k.satA.periodHours,
      },
      secondaryPoint: {
        x: Math.pow(k.satB.radiusEarthRadii, 3),
        y: k.satB.periodHours * k.satB.periodHours,
      },
      refLines: [],
      qualitativeTakeaway:
        'Perfect straight line through the origin! Plotting T² vs R³ linearizes Kepler’s Third Law; its slope 4π²/(GM) depends ONLY on central mass M (never satellite mass m).',
    };
  }

  if (kind === 'secondary') {
    const xMin = 1.1;
    const xMax = 7.5;
    const curveA: CircularChartPoint[] = [];
    let yMax = 10;
    for (let i = 0; i <= N; i++) {
      const rRe = xMin + ((xMax - xMin) * i) / N;
      const s = solveSingleSatellite(k.centralMassKg, rRe, k.satMassKg);
      curveA.push({ x: rRe, y: s.speedKmS });
      if (s.speedKmS > yMax) yMax = s.speedKmS;
    }
    return {
      title: `Circular Orbital Speed v(R) = √(GM / R)`,
      xLabel: 'Orbital Radius R (R_⊕)',
      yLabel: 'Orbital Speed v (km/s)',
      xMin: 1,
      xMax,
      yMin: 0,
      yMax: Math.ceil(yMax * 1.12),
      curveA,
      curveALabel: 'v = √(GM / R)',
      currentPoint: { x: k.satA.radiusEarthRadii, y: k.satA.speedKmS },
      secondaryPoint: { x: k.satB.radiusEarthRadii, y: k.satB.speedKmS },
      refLines: [],
      qualitativeTakeaway:
        'Higher orbits move SLOWER (v ∝ R⁻¹/²) AND travel a longer circumference 2πR, combining to make T = 2πR/v grow as R^(3/2).',
    };
  }

  // tertiary: a_c(R) = GM / R²
  const xMin = 1.1;
  const xMax = 7.5;
  const curveA: CircularChartPoint[] = [];
  let yMax = 10;
  for (let i = 0; i <= N; i++) {
    const rRe = xMin + ((xMax - xMin) * i) / N;
    const s = solveSingleSatellite(k.centralMassKg, rRe, k.satMassKg);
    curveA.push({ x: rRe, y: s.acMs2 });
    if (s.acMs2 > yMax) yMax = s.acMs2;
  }
  return {
    title: `Orbital Centripetal Accel a_c(R) = GM / R²`,
    xLabel: 'Orbital Radius R (R_⊕)',
    yLabel: 'a_c = g(R) (m/s²)',
    xMin: 1,
    xMax,
    yMin: 0,
    yMax: Math.ceil(yMax * 1.1),
    curveA,
    curveALabel: 'a_c = GM / R²',
    currentPoint: { x: k.satA.radiusEarthRadii, y: k.satA.acMs2 },
    secondaryPoint: { x: k.satB.radiusEarthRadii, y: k.satB.acMs2 },
    refLines: [],
    qualitativeTakeaway:
      'Inverse-square decay (a_c ∝ 1/R²): gravitational attraction is the sole force causing centripetal acceleration, so a_c equals the local gravitational field g(R).',
  };
}

// ============================================================================
// SKILL 2.A — SYMBOLIC DERIVATION PATHWAYS
// ============================================================================
export interface DerivationStep210 {
  step: number;
  title: string;
  equation: string;
  note: string;
}

export function buildDerivationSteps210(
  params: Circular210Params,
  evaluation: Circular210Evaluation,
): DerivationStep210[] {
  if (params.mode === 'vertical_loop') {
    const l = evaluation.loop;
    return [
      {
        step: 1,
        title: 'Choose Radial Inward Axis (+r toward center)',
        equation: '∑ F_r = m a_c = m v² / r',
        note: '2.10.A.1: Centripetal acceleration always points toward the center of the circular loop.',
      },
      {
        step: 2,
        title: 'Newton’s 2nd Law at Vertical Angle θ',
        equation: 'F_N + mg sinθ = m v² / r  ⇒  F_N = m(v²/r − g sinθ)',
        note: `At θ = 90° (top): F_N + mg = mv²/r. Currently F_N = ${l.normalForceN.toFixed(1)} N, F_g = ${l.fgN.toFixed(1)} N.`,
      },
      {
        step: 3,
        title: 'Minimum Speed at Top of Loop (2.10.A.2.i)',
        equation: 'Set F_N = 0 at θ = 90°  ⇒  mg = m v_min² / r  ⇒  v_min = √(gr)',
        note: `Mass m cancels! For r = ${l.radiusM.toFixed(1)} m, v_min = √(${G_GRAVITY}×${l.radiusM.toFixed(1)}) = ${l.vMinTopMs.toFixed(2)} m/s.`,
      },
      {
        step: 4,
        title: 'Net Acceleration & Uniform Period (2.10.A.3–5)',
        equation: 'a_net = a_c r̂_in + a_t t̂  ⇒  |a_net| = √(a_c² + a_t²),  T = 2πr/v = 1/f',
        note: `Live values: a_c = ${l.acMs2.toFixed(2)}, a_t = ${l.atMs2.toFixed(2)}, |a_net| = ${l.aNetMs2.toFixed(2)} m/s², T = ${l.periodS.toFixed(2)} s.`,
      },
    ];
  }

  if (params.mode === 'banked_curve') {
    const b = evaluation.banked;
    return [
      {
        step: 1,
        title: 'Align Axes with Horizontal Circle Center (NOT Ramp!)',
        equation: '+r horizontal inward (a_r = v²/r),  +y vertical upward (a_y = 0)',
        note: '2.10.A.2.ii: Because the car travels in a horizontal circle, a_c is purely horizontal.',
      },
      {
        step: 2,
        title: 'Resolve Normal Force F_N & Static Friction f_s',
        equation: '∑F_r: F_N sinβ + f_s cosβ = mv²/r   |   ∑F_y: F_N cosβ − f_s sinβ = mg',
        note: `Horizontal inward sum: F_N sinβ (${b.normalHorizontalN.toFixed(1)} N) + f_s cosβ (${b.frictionHorizontalN.toFixed(1)} N) = F_c (${b.fcN.toFixed(1)} N).`,
      },
      {
        step: 3,
        title: 'Ideal Frictionless Design Speed (Set f_s = 0)',
        equation: '(F_N sinβ)/(F_N cosβ) = tanβ = v²/(gr)  ⇒  v_ideal = √(gr tanβ)',
        note: `For r = ${b.radiusM.toFixed(0)} m, β = ${b.bankAngleDeg}°, v_ideal = ${b.vIdealMs.toFixed(2)} m/s (mass m cancels).`,
      },
      {
        step: 4,
        title: 'Maximum Safe Speed at Static Slip Threshold (f_s = μ_s F_N)',
        equation: 'v_max = √[ g r (sinβ + μ_s cosβ) / (cosβ − μ_s sinβ) ]',
        note: Number.isFinite(b.vMaxMs)
          ? `With μ_s = ${b.muStatic.toFixed(2)}: v_min = ${b.vMinMs.toFixed(1)} m/s, v_max = ${b.vMaxMs.toFixed(1)} m/s.`
          : `With μ_s tanβ ≥ 1: friction locks the car against outward skidding at all speeds!`,
      },
    ];
  }

  if (params.mode === 'conical_pendulum') {
    const c = evaluation.conical;
    return [
      {
        step: 1,
        title: 'Vertical Equilibrium & Horizontal Centripetal Force',
        equation: '∑F_y: T_str cosφ = mg   |   ∑F_r: T_str sinφ = m v² / r',
        note: `2.10.A.2.iii: Only the horizontal component T_str sinφ (${c.tensionRadialN.toFixed(1)} N) causes a_c toward the circle center.`,
      },
      {
        step: 2,
        title: 'Eliminate Tension & Mass by Dividing Equations',
        equation: 'tanφ = v² / (gr)  ⇒  a_c = g tanφ,  v = √(g r tanφ)',
        note: `With r = L sinφ = ${c.radiusM.toFixed(2)} m, a_c = ${c.acMs2.toFixed(2)} m/s² and v = ${c.speedMs.toFixed(2)} m/s (m cancels!).`,
      },
      {
        step: 3,
        title: 'Substitute r = L sinφ into Period T = 2πr / v',
        equation: 'T = (2π L sinφ) / √(g L sinφ tanφ) = 2π √(L cosφ / g)',
        note: `2.10.A.5: Live T = ${c.periodS.toFixed(2)} s, frequency f = 1/T = ${c.frequencyHz.toFixed(2)} Hz.`,
      },
      {
        step: 4,
        title: 'String Tension Magnitude',
        equation: 'T_str = mg / cosφ',
        note: `Unlike v and T, tension DOES scale with mass m: T_str = ${c.tensionN.toFixed(1)} N (diverges as φ → 90°).`,
      },
    ];
  }

  // kepler_orbit
  const k = evaluation.kepler;
  return [
    {
      step: 1,
      title: 'Gravity is the Sole Centripetal Force (2.10.B.1)',
      equation: '∑ F_r = F_g = m a_c  ⇒  G M m / R² = m v² / R',
      note: 'Satellite mass m cancels immediately! Orbital motion depends only on central mass M and radius R.',
    },
    {
      step: 2,
      title: 'Solve for Circular Orbital Speed v',
      equation: 'v = √(G M / R)',
      note: `Sat A: v_A = ${k.satA.speedKmS.toFixed(2)} km/s at R_A = ${k.satA.radiusEarthRadii.toFixed(1)} R_⊕.`,
    },
    {
      step: 3,
      title: 'Substitute v = 2πR / T (2.10.A.5.iii)',
      equation: 'G M / R = (2π R / T)² = 4π² R² / T²',
      note: 'Connects uniform circular motion period T = 2πR/v directly to Newton’s Law of Universal Gravitation.',
    },
    {
      step: 4,
      title: 'Rearrange to Kepler’s Third Law (LO 2.10.B)',
      equation: 'T² = (4π² / GM) R³',
      note: `Verified: (T_B/T_A)² = ${k.tRatioSquared.toFixed(3)} === (R_B/R_A)³ = ${k.rRatioCubed.toFixed(3)}. (Boundary: Kepler’s 1st & 2nd laws not required.)`,
    },
  ];
}

// ============================================================================
// SKILL 2.D — FUNCTIONAL DEPENDENCE & SCALING PREDICTOR
// ============================================================================
export interface ScalingRow210 {
  change: string;
  quantity: string;
  factor: string;
  reason: string;
}

export function buildScalingRows210(mode: Circular210Mode): ScalingRow210[] {
  if (mode === 'vertical_loop') {
    return [
      { change: 'v → 2v (fixed r)', quantity: 'a_c = v²/r', factor: '4×', reason: 'Quadratic dependence on v' },
      { change: 'r → 2r (fixed v)', quantity: 'a_c = v²/r', factor: '½×', reason: 'Inverse dependence on r' },
      { change: 'r → 2r', quantity: 'v_min = √(gr)', factor: '√2 ≈ 1.41×', reason: 'Square-root scaling with r' },
      { change: 'm → 2m (fixed r)', quantity: 'v_min = √(gr)', factor: '1× (unchanged)', reason: 'Mass m cancels from mg = mv²/r' },
      { change: 'v → 2v (fixed r)', quantity: 'Period T = 2πr/v', factor: '½× (f → 2f)', reason: 'Inverse scaling with speed' },
    ];
  }
  if (mode === 'banked_curve') {
    return [
      { change: 'r → 4r (fixed β)', quantity: 'v_ideal = √(gr tanβ)', factor: '2×', reason: 'v_ideal ∝ √r' },
      { change: 'm → 3m (fixed r,β,μ)', quantity: 'v_ideal, v_max', factor: '1× (unchanged)', reason: 'Mass cancels from F_N, f_s, and F_c' },
      { change: 'β = 0° (flat), μ_s → 2μ_s', quantity: 'v_max = √(μ_s gr)', factor: '√2 ≈ 1.41×', reason: 'v_max ∝ √μ_s on flat turn' },
      { change: 'v → 2v (fixed r)', quantity: 'Required F_c', factor: '4×', reason: 'F_c = mv²/r scales as v²' },
    ];
  }
  if (mode === 'conical_pendulum') {
    return [
      { change: 'm → 2m (fixed L, φ)', quantity: 'Speed v & Period T', factor: '1× (unchanged)', reason: 'Mass cancels in tanφ = v²/(gr)' },
      { change: 'm → 2m (fixed L, φ)', quantity: 'String Tension T_str', factor: '2×', reason: 'T_str = mg/cosφ scales linearly with m' },
      { change: 'L → 4L (fixed φ)', quantity: 'Period T = 2π√(Lcosφ/g)', factor: '2×', reason: 'Period scales as √L' },
      { change: 'φ → 45°', quantity: 'a_c = g tanφ', factor: '1.00 g', reason: 'tan(45°) = 1 exactly' },
    ];
  }
  return [
    { change: 'R → 2R (fixed M)', quantity: 'Period T ∝ R^(3/2)', factor: '2√2 ≈ 2.83×', reason: 'T² ∝ R³ ⇒ T ∝ R^(3/2)' },
    { change: 'R → 4R (fixed M)', quantity: 'Period T ∝ R^(3/2)', factor: '8×', reason: '4^(3/2) = (√4)³ = 8' },
    { change: 'M → 4M (fixed R)', quantity: 'Period T ∝ M^(-1/2)', factor: '½×', reason: 'T² = (4π²/GM)R³ ⇒ T ∝ 1/√M' },
    { change: 'R → 4R (fixed M)', quantity: 'Speed v = √(GM/R)', factor: '½×', reason: 'Orbital speed scales as 1/√R' },
    { change: 'm_sat → 5 m_sat', quantity: 'v, a_c, T', factor: '1× (unchanged)', reason: 'Satellite mass m cancels out!' },
  ];
}

export interface ScalingChallenge210 {
  id: string;
  ek: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const SCALING_CHALLENGES_210: ScalingChallenge210[] = [
  {
    id: 'c2d-1',
    ek: '2.10.A.1.i',
    prompt: 'A puck moves in a circle of radius r at speed v. If the radius is doubled (2r) AND the speed is doubled (2v), how does centripetal acceleration a_c change?',
    options: ['Remains the same (1×)', 'Doubles (2×)', 'Quadruples (4×)', 'Halves (½×)'],
    correctIndex: 1,
    explanation: 'a_c′ = (2v)² / (2r) = 4v² / (2r) = 2(v²/r) = 2 a_c.',
  },
  {
    id: 'c2d-2',
    ek: '2.10.A.2.i',
    prompt: 'A roller coaster barely maintains contact at the top of a vertical loop of radius R at minimum speed v_min. For a loop of radius 4R with twice the cart mass (2m), what is the new minimum top speed?',
    options: ['v_min', '√2 · v_min', '2 v_min', '4 v_min'],
    correctIndex: 2,
    explanation: 'v_min = √(gR) is independent of mass m and proportional to √R. Multiplying R by 4 multiplies v_min by √4 = 2.',
  },
  {
    id: 'c2d-3',
    ek: '2.10.B.1',
    prompt: 'Satellite B orbits the same planet in a circular orbit at radius 4R, while Satellite A orbits at radius R with period T_A. What is Satellite B’s orbital period T_B?',
    options: ['2 T_A', '4 T_A', '8 T_A', '16 T_A'],
    correctIndex: 2,
    explanation: 'By Kepler’s Third Law, (T_B / T_A)² = (4R / R)³ = 64 ⇒ T_B = √64 · T_A = 8 T_A.',
  },
  {
    id: 'c2d-4',
    ek: '2.10.B.1',
    prompt: 'If a circular orbit’s radius R stays the same, but the central planet’s mass is increased from M to 4M, how does the satellite’s orbital period T change?',
    options: ['T / 4', 'T / 2', '2 T', '4 T'],
    correctIndex: 1,
    explanation: 'T² = (4π² / GM) R³ ⇒ T ∝ 1/√M. Increasing M by 4× multiplies T by 1/√4 = ½.',
  },
  {
    id: 'c2d-5',
    ek: '2.10.A.2.iii',
    prompt: 'A conical pendulum swings at angle φ with length L and period T. If the bob mass is tripled (3m) while keeping L and φ fixed, how does the period T change?',
    options: ['Unchanged (T)', 'Increases by √3', 'Decreases by 1/√3', 'Triples (3T)'],
    correctIndex: 0,
    explanation: 'T = 2π√(L cosφ / g) does not depend on mass m at all — tripling m only triples string tension T_str = mg/cosφ.',
  },
];

// ============================================================================
// SKILL 3.C — CLAIM-EVIDENCE JUSTIFICATION AUDIT CARDS
// ============================================================================
export interface ClaimCard210 {
  id: string;
  ek: string;
  claim: string;
  isTrue: boolean;
  justification: string;
}

export const CLAIM_CARDS_210: ClaimCard210[] = [
  {
    id: 'cl-1',
    ek: '2.10.A.2.i',
    claim: 'At the top of a vertical loop moving at minimum speed v = √(gr), the net force on the cart is zero.',
    isTrue: false,
    justification: 'FALSE. At v = √(gr), the normal force F_N drops to zero, NOT the net force! Gravity F_g = mg still acts downward and provides the entire centripetal force F_net = mg = mv²/r.',
  },
  {
    id: 'cl-2',
    ek: '2.10.A.1 & 2.10.A.5',
    claim: 'An object in uniform circular motion has constant speed, so its acceleration is zero.',
    isTrue: false,
    justification: 'FALSE. Constant speed means tangential acceleration a_t = 0, but velocity is a vector whose direction continuously turns toward the center, producing nonzero centripetal acceleration a_c = v²/r.',
  },
  {
    id: 'cl-3',
    ek: '2.10.A.2.ii',
    claim: 'On a banked circular curve, the centripetal acceleration vector points horizontally toward the center of the circle—not down the tilted road surface.',
    isTrue: true,
    justification: 'TRUE. The circular path lies in a horizontal plane, so a_c is strictly horizontal inward. Horizontal components F_N sinβ and ±f_s cosβ sum to mv²/r.',
  },
  {
    id: 'cl-4',
    ek: '2.10.A.3 & 2.10.A.4',
    claim: 'When an object speeds up while moving in a circle (a_t > 0), its net acceleration vector tilts ahead of the line pointing to the circle’s center.',
    isTrue: true,
    justification: 'TRUE. By 2.10.A.4, a_net = a_c + a_t is the vector sum of inward radial a_c and forward tangential a_t, tilting forward by α = arctan(a_t / a_c).',
  },
  {
    id: 'cl-5',
    ek: '2.10.A.2.iii',
    claim: 'A conical pendulum string can become completely horizontal (φ = 90°) if the bob is spun fast enough.',
    isTrue: false,
    justification: 'FALSE. Vertical equilibrium requires T_str cosφ = mg ⇒ T_str = mg/cosφ. As φ → 90°, cosφ → 0, requiring infinite tension and infinite speed to support the bob’s weight.',
  },
  {
    id: 'cl-6',
    ek: '2.10.B.1',
    claim: 'Two satellites of very different masses (50 kg and 5000 kg) placed in circular orbits of the same radius R around Earth have the exact same orbital speed and period.',
    isTrue: true,
    justification: 'TRUE. Setting GMm/R² = mv²/R cancels satellite mass m immediately, yielding v = √(GM/R) and T² = (4π²/GM)R³ depending only on central body mass M and radius R.',
  },
];
