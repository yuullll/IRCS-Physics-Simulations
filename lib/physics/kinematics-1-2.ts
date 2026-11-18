export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type MotionScenarioId =
  | 'cubic_turnaround'
  | 'oscillating_wave'
  | 'curved_turning'
  | 'constant_speed_turn'
  | 'custom_poly';

export interface MotionParams {
  // Custom / cubic 1D polynomial parameters: x(t) = x0 + vx0*t + 0.5*ax0*t^2 + (1/6)*jx*t^3
  x0: number;
  vx0: number;
  ax0: number;
  jx: number;
  // Optional y-axis / 2D parameters
  y0: number;
  vy0: number;
  ay0: number;
  // Harmonic / circular parameters
  amplitude: number;
  omega: number;
  radius: number;
}

export const DEFAULT_MOTION_PARAMS: Record<MotionScenarioId, MotionParams> = {
  cubic_turnaround: {
    x0: -6.0,
    vx0: 8.5,
    ax0: -4.2,
    jx: 0.65,
    y0: 0,
    vy0: 0,
    ay0: 0,
    amplitude: 6.0,
    omega: 1.2,
    radius: 5.0,
  },
  oscillating_wave: {
    x0: 0,
    vx0: 0,
    ax0: 0,
    jx: 0,
    y0: 0,
    vy0: 0,
    ay0: 0,
    amplitude: 6.5,
    omega: 1.15,
    radius: 5.0,
  },
  curved_turning: {
    x0: -7.5,
    vx0: 2.6,
    ax0: 0.4,
    jx: 0,
    y0: 0,
    vy0: 4.2,
    ay0: -1.4,
    amplitude: 5.0,
    omega: 1.0,
    radius: 5.0,
  },
  constant_speed_turn: {
    x0: 0,
    vx0: 0,
    ax0: 0,
    jx: 0,
    y0: 0,
    vy0: 0,
    ay0: 0,
    amplitude: 5.0,
    omega: 1.1,
    radius: 5.5,
  },
  custom_poly: {
    x0: -4.0,
    vx0: 5.0,
    ax0: -2.0,
    jx: 0.3,
    y0: 0,
    vy0: 0,
    ay0: 0,
    amplitude: 5.0,
    omega: 1.0,
    radius: 5.0,
  },
};

export interface ScenarioDescriptor {
  id: MotionScenarioId;
  title: string;
  shortTitle: string;
  dimension: '1D' | '2D';
  maxTime: number;
  cedFocus: string;
  equationLabel: string;
  description: string;
}

export const MOTION_SCENARIOS: ScenarioDescriptor[] = [
  {
    id: 'cubic_turnaround',
    title: '1D Non-Uniform Turnaround (Cubic)',
    shortTitle: '1D Turnaround',
    dimension: '1D',
    maxTime: 8.0,
    cedFocus: '1.2.A.2 & 1.2.C.1',
    equationLabel: 'x(t) = x₀ + vₓ₀t + ½aₓ₀t² + ⅙jt³',
    description:
      'Particle reverses direction when vₓ(t) = 0 even though aₓ(t) ≠ 0, separating scalar distance from net displacement Δx.',
  },
  {
    id: 'oscillating_wave',
    title: '1D Harmonic Oscillation',
    shortTitle: '1D Harmonic',
    dimension: '1D',
    maxTime: 8.0,
    cedFocus: '1.2.C.1.i–ii & 1.2.C.2',
    equationLabel: 'x(t) = A sin(ωt)',
    description:
      'Position, velocity, and acceleration are 90° out of phase via successive time derivatives dx/dt and dvₓ/dt.',
  },
  {
    id: 'curved_turning',
    title: '2D Curved Non-Uniform Path',
    shortTitle: '2D Curved Path',
    dimension: '2D',
    maxTime: 6.0,
    cedFocus: '1.2.B.2 & 1.2.B.3',
    equationLabel: 'r(t) = x(t)î + z(t)k̂',
    description:
      'Compare the secant chord Δr/Δt (average velocity) against the tangent dr/dt (instantaneous velocity) along a curved trajectory.',
  },
  {
    id: 'constant_speed_turn',
    title: '2D Constant-Speed Turn (1.2.B.4)',
    shortTitle: 'Const-Speed Turn',
    dimension: '2D',
    maxTime: 8.0,
    cedFocus: '1.2.B.4 Direction Change',
    equationLabel: '|v| = Rω = const, |a| = Rω² ≠ 0',
    description:
      'Proves EK 1.2.B.4: even when speed |v| is constant, changing velocity direction produces non-zero centripetal acceleration.',
  },
  {
    id: 'custom_poly',
    title: 'Custom Calculus Polynomial',
    shortTitle: 'Custom x(t)',
    dimension: '1D',
    maxTime: 8.0,
    cedFocus: '1.2.C.2 Diff & Int',
    equationLabel: 'x(t) = x₀ + v₀t + ½a₀t² + ⅙jt³',
    description:
      'Dial your own initial position, velocity, acceleration, and jerk to test differentiation and integral area theorems.',
  },
];

export interface MotionState {
  t: number;
  r: Vec3;
  v: Vec3;
  a: Vec3;
  speed: number;
  accelMag: number;
  /** Component of acceleration parallel to velocity (changes speed |v|) */
  aTangential: number;
  /** Component of acceleration perpendicular to velocity (changes direction) */
  aNormal: number;
}

export interface IntervalAnalysis {
  t1: number;
  t2: number;
  dt: number;
  state1: MotionState;
  state2: MotionState;
  displacement: Vec3;
  displacementMag: number;
  deltaV: Vec3;
  deltaVMag: number;
  vAvg: Vec3;
  vAvgMag: number;
  aAvg: Vec3;
  aAvgMag: number;
  /** Difference |v_avg - v(t1)| */
  vLimitError: number;
  vLimitPercentDiff: number;
  /** Difference |a_avg - a(t1)| */
  aLimitError: number;
  aLimitPercentDiff: number;
  /** Definite integral of v_x(t) from t1 to t2 (should equal displacement.x) */
  integralVx: number;
  /** Definite integral of a_x(t) from t1 to t2 (should equal deltaV.x) */
  integralAx: number;
  /** Definite integral of speed |v(t)| from t1 to t2 (total scalar path length) */
  scalarDistance: number;
}

export interface ConvergenceRow {
  dt: number;
  vAvgX: number;
  vInstX: number;
  vErr: number;
  aAvgX: number;
  aInstX: number;
  aErr: number;
  vAvgMag: number;
  vInstMag: number;
  aAvgMag: number;
  aInstMag: number;
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecScale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vecMag(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/**
 * Evaluate exact analytical position, velocity (dr/dt), and acceleration (dv/dt) at time t.
 * Coordinate convention in 3D ground plane:
 *   x: horizontal track axis (east/west)
 *   y: vertical axis (kept 0 on ground plane unless 3D elevation needed)
 *   z: depth axis on the 3D laboratory floor (for 2D planar motion on the floor)
 */
export function evaluateMotionState(
  scenario: MotionScenarioId,
  tRaw: number,
  params: MotionParams = DEFAULT_MOTION_PARAMS[scenario]
): MotionState {
  const t = Math.max(0, tRaw);
  let r: Vec3 = { x: 0, y: 0, z: 0 };
  let v: Vec3 = { x: 0, y: 0, z: 0 };
  let a: Vec3 = { x: 0, y: 0, z: 0 };

  switch (scenario) {
    case 'cubic_turnaround':
    case 'custom_poly': {
      const { x0, vx0, ax0, jx } = params;
      const x = x0 + vx0 * t + 0.5 * ax0 * t * t + (1 / 6) * jx * t * t * t;
      const vx = vx0 + ax0 * t + 0.5 * jx * t * t;
      const ax = ax0 + jx * t;
      r = { x, y: 0, z: 0 };
      v = { x: vx, y: 0, z: 0 };
      a = { x: ax, y: 0, z: 0 };
      break;
    }

    case 'oscillating_wave': {
      const { amplitude, omega } = params;
      const x = amplitude * Math.sin(omega * t);
      const vx = amplitude * omega * Math.cos(omega * t);
      const ax = -amplitude * omega * omega * Math.sin(omega * t);
      r = { x, y: 0, z: 0 };
      v = { x: vx, y: 0, z: 0 };
      a = { x: ax, y: 0, z: 0 };
      break;
    }

    case 'curved_turning': {
      // Motion on the 2D horizontal XZ floor plane:
      // x(t) = x0 + vx0*t + 0.5*ax0*t^2
      // z(t) = -(y0 + vy0*t + 0.5*ay0*t^2)  [or positive z = y0 + vy0*t + 0.5*ay0*t^2]
      const { x0, vx0, ax0, y0, vy0, ay0 } = params;
      const x = x0 + vx0 * t + 0.5 * ax0 * t * t;
      const vx = vx0 + ax0 * t;
      const ax = ax0;

      const z = y0 + vy0 * t + 0.5 * ay0 * t * t;
      const vz = vy0 + ay0 * t;
      const az = ay0;

      r = { x, y: 0, z };
      v = { x: vx, y: 0, z: vz };
      a = { x: ax, y: 0, z: az };
      break;
    }

    case 'constant_speed_turn': {
      // Uniform circular motion in XZ plane: speed |v| = R * omega is strictly constant!
      // r(t) = (R cos(ωt), 0, R sin(ωt))
      // v(t) = (-Rω sin(ωt), 0, Rω cos(ωt))
      // a(t) = (-Rω² cos(ωt), 0, -Rω² sin(ωt))
      const { radius, omega } = params;
      const cosW = Math.cos(omega * t);
      const sinW = Math.sin(omega * t);
      r = { x: radius * cosW, y: 0, z: radius * sinW };
      v = { x: -radius * omega * sinW, y: 0, z: radius * omega * cosW };
      a = { x: -radius * omega * omega * cosW, y: 0, z: -radius * omega * omega * sinW };
      break;
    }
  }

  const speed = vecMag(v);
  const accelMag = vecMag(a);

  // Decompose acceleration into tangential (parallel to v -> changes speed)
  // and normal/centripetal (perpendicular to v -> changes direction)
  let aTangential = 0;
  let aNormal = accelMag;
  if (speed > 1e-6) {
    aTangential = vecDot(a, v) / speed;
    const aNormSq = Math.max(0, accelMag * accelMag - aTangential * aTangential);
    aNormal = Math.sqrt(aNormSq);
  }

  return {
    t,
    r,
    v,
    a,
    speed,
    accelMag,
    aTangential,
    aNormal,
  };
}

/**
 * Composite Simpson's Rule numerical integration over [t1, t2] for high-accuracy definite integrals
 */
export function integrateDefinite(
  fn: (t: number) => number,
  t1: number,
  t2: number,
  subIntervals = 64
): number {
  const n = subIntervals % 2 === 0 ? subIntervals : subIntervals + 1;
  const h = (t2 - t1) / n;
  if (Math.abs(h) < 1e-12) return 0;

  let sum = fn(t1) + fn(t2);
  for (let i = 1; i < n; i++) {
    const ti = t1 + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * fn(ti);
  }
  return (sum * h) / 3;
}

/**
 * Compute full interval kinematics & calculus comparison between t1 and t2 = t1 + dt.
 * Covers EK 1.2.A.2, 1.2.B.1-5, 1.2.C.1-2.
 */
export function computeIntervalAnalysis(
  scenario: MotionScenarioId,
  t1: number,
  dtRaw: number,
  params: MotionParams = DEFAULT_MOTION_PARAMS[scenario]
): IntervalAnalysis {
  const dt = Math.max(0.005, dtRaw);
  const t2 = t1 + dt;

  const state1 = evaluateMotionState(scenario, t1, params);
  const state2 = evaluateMotionState(scenario, t2, params);

  const displacement = vecSub(state2.r, state1.r);
  const displacementMag = vecMag(displacement);

  const deltaV = vecSub(state2.v, state1.v);
  const deltaVMag = vecMag(deltaV);

  const vAvg = vecScale(displacement, 1 / dt);
  const vAvgMag = vecMag(vAvg);

  const aAvg = vecScale(deltaV, 1 / dt);
  const aAvgMag = vecMag(aAvg);

  const vLimitError = vecMag(vecSub(vAvg, state1.v));
  const vRef = Math.max(state1.speed, vAvgMag, 0.01);
  const vLimitPercentDiff = (vLimitError / vRef) * 100;

  const aLimitError = vecMag(vecSub(aAvg, state1.a));
  const aRef = Math.max(state1.accelMag, aAvgMag, 0.01);
  const aLimitPercentDiff = (aLimitError / aRef) * 100;

  const integralVx = integrateDefinite(
    t => evaluateMotionState(scenario, t, params).v.x,
    t1,
    t2,
    64
  );
  const integralAx = integrateDefinite(
    t => evaluateMotionState(scenario, t, params).a.x,
    t1,
    t2,
    64
  );
  const scalarDistance = integrateDefinite(
    t => evaluateMotionState(scenario, t, params).speed,
    t1,
    t2,
    64
  );

  return {
    t1,
    t2,
    dt,
    state1,
    state2,
    displacement,
    displacementMag,
    deltaV,
    deltaVMag,
    vAvg,
    vAvgMag,
    aAvg,
    aAvgMag,
    vLimitError,
    vLimitPercentDiff,
    aLimitError,
    aLimitPercentDiff,
    integralVx,
    integralAx,
    scalarDistance,
  };
}

/**
 * Sample a motion time series over [tMin, tMax] for quantitative plotting (Suggested Skill 1.B).
 */
export function sampleMotionSeries(
  scenario: MotionScenarioId,
  tMin: number,
  tMax: number,
  steps = 160,
  params: MotionParams = DEFAULT_MOTION_PARAMS[scenario]
): MotionState[] {
  const out: MotionState[] = [];
  const count = Math.max(2, steps);
  for (let i = 0; i <= count; i++) {
    const t = tMin + (i / count) * (tMax - tMin);
    out.push(evaluateMotionState(scenario, t, params));
  }
  return out;
}

/**
 * Generate a shrinking-Δt limit convergence table proving EK 1.2.B.5 and 1.2.C.1:
 * as Δt -> 0, v_avg -> v(t1) and a_avg -> a(t1).
 */
export function generateLimitConvergenceTable(
  scenario: MotionScenarioId,
  t1: number,
  params: MotionParams = DEFAULT_MOTION_PARAMS[scenario],
  dtValues: number[] = [2.0, 1.0, 0.5, 0.2, 0.05, 0.01]
): ConvergenceRow[] {
  return dtValues.map(dt => {
    const analysis = computeIntervalAnalysis(scenario, t1, dt, params);
    return {
      dt,
      vAvgX: analysis.vAvg.x,
      vInstX: analysis.state1.v.x,
      vErr: analysis.vLimitError,
      aAvgX: analysis.aAvg.x,
      aInstX: analysis.state1.a.x,
      aErr: analysis.aLimitError,
      vAvgMag: analysis.vAvgMag,
      vInstMag: analysis.state1.speed,
      aAvgMag: analysis.aAvgMag,
      aInstMag: analysis.state1.accelMag,
    };
  });
}

export interface GraphBounds {
  minY: number;
  maxY: number;
  ticks: number[];
}

/**
 * Compute human-readable, rounded quantitative Y-axis bounds & ticks for AP Skill 1.B graphs.
 */
export function computeGraphBounds(values: number[], minHalfSpan = 1.0): GraphBounds {
  let rawMin = 0;
  let rawMax = 0;
  for (const v of values) {
    if (Number.isFinite(v)) {
      if (v < rawMin) rawMin = v;
      if (v > rawMax) rawMax = v;
    }
  }
  const span = Math.max(rawMax - rawMin, minHalfSpan * 2);
  const pad = span * 0.14;
  let lo = rawMin - pad;
  let hi = rawMax + pad;

  // Ensure 0 is comfortably inside or at an edge when data doesn't stray far
  if (lo > 0 && lo < span * 0.25) lo = 0;
  if (hi < 0 && -hi < span * 0.25) hi = 0;

  const rawStep = (hi - lo) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-6))));
  const residual = rawStep / mag;
  const niceMult = residual <= 1.2 ? 1 : residual <= 2.4 ? 2 : residual <= 5.5 ? 5 : 10;
  const step = niceMult * mag;

  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  for (let val = niceMin; val <= niceMax + step * 0.001; val += step) {
    // Avoid -0
    const clean = Math.abs(val) < step * 1e-4 ? 0 : Number(val.toFixed(4));
    ticks.push(clean);
  }

  return { minY: niceMin, maxY: Math.max(niceMax, niceMin + step), ticks };
}

