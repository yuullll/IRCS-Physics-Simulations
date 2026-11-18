export type Motion15ScenarioId =
  | 'drop_vs_launch'
  | 'projectile_2d'
  | 'nonuniform_2d'
  | 'qualitative_3d';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Motion15Params {
  // Drop vs Launch & 2D Projectile
  h0: number;       // Initial height y0 (m)
  vx0: number;      // Initial x velocity (m/s) or launch speed component
  vy0: number;      // Initial y velocity (m/s)
  axExtra: number;  // Independent horizontal acceleration (m/s^2) in drop_vs_launch
  launchSpeed: number; // Total v0 in projectile_2d (m/s)
  launchAngleDeg: number; // Launch angle theta in projectile_2d (deg)
  gravity: number;  // g > 0 (m/s^2)
  scaleFactor: 1 | 1.5 | 2; // Skill 2.D scaling predictor multiplier for projectile_2d

  // 2D Nonuniform Acceleration (EK 1.5.A.2)
  ax0: number;      // Initial a_x(0) (m/s^2)
  jerkX: number;    // Linear acceleration rate j_x (m/s^3) -> a_x(t) = ax0 + j_x * t
  ayAmp: number;    // Vertical nonuniform amplitude A_y (m/s^2) -> a_y(t) = ayAmp * cos(omegaY * t)
  omegaY: number;   // Angular frequency omega_y (rad/s)

  // 3D Qualitative Helix (Boundary Statement)
  helixRadius: number; // R in X-Z plane (m)
  helixOmega: number;  // Angular frequency omega in X-Z plane (rad/s)
  azThrustY: number;   // Constant vertical acceleration a_y (m/s^2)
}

export const DEFAULT_MOTION15_PARAMS: Record<Motion15ScenarioId, Motion15Params> = {
  drop_vs_launch: {
    h0: 12,
    vx0: 6.5,
    vy0: 0,
    axExtra: 0,
    launchSpeed: 14,
    launchAngleDeg: 45,
    gravity: 9.8,
    scaleFactor: 1,
    ax0: 1.5,
    jerkX: 0.8,
    ayAmp: 6.0,
    omegaY: 1.8,
    helixRadius: 4.5,
    helixOmega: 2.2,
    azThrustY: 1.2,
  },
  projectile_2d: {
    h0: 0,
    vx0: 10,
    vy0: 10,
    axExtra: 0,
    launchSpeed: 10.5,
    launchAngleDeg: 46,
    gravity: 9.8,
    scaleFactor: 2,
    ax0: 1.5,
    jerkX: 0.8,
    ayAmp: 6.0,
    omegaY: 1.8,
    helixRadius: 4.5,
    helixOmega: 2.2,
    azThrustY: 1.2,
  },
  nonuniform_2d: {
    h0: 2,
    vx0: 2.5,
    vy0: 4.0,
    axExtra: 0,
    launchSpeed: 14,
    launchAngleDeg: 45,
    gravity: 9.8,
    scaleFactor: 1,
    ax0: 1.2,
    jerkX: 1.4,
    ayAmp: 6.5,
    omegaY: 2.1,
    helixRadius: 4.5,
    helixOmega: 2.2,
    azThrustY: 1.2,
  },
  qualitative_3d: {
    h0: 1.5,
    vx0: 0,
    vy0: 1.8,
    axExtra: 0,
    launchSpeed: 14,
    launchAngleDeg: 45,
    gravity: 9.8,
    scaleFactor: 1,
    ax0: 0,
    jerkX: 0,
    ayAmp: 0,
    omegaY: 0,
    helixRadius: 4.5,
    helixOmega: 2.2,
    azThrustY: 0.8,
  },
};

export interface Motion15ScenarioDescriptor {
  id: Motion15ScenarioId;
  title: string;
  cedFocus: string;
  dimensionLabel: '2D Quantitative' | '3D Qualitative (E&M Boundary)';
  isQuantitative2D: boolean;
  maxTime: number;
  equationText: string;
  summary: string;
}

export const MOTION15_SCENARIOS: Motion15ScenarioDescriptor[] = [
  {
    id: 'drop_vs_launch',
    title: '1.5.A.3 Drop vs. Horizontal Launch',
    cedFocus: 'EK 1.5.A.1 & 1.5.A.3',
    dimensionLabel: '2D Quantitative',
    isQuantitative2D: true,
    maxTime: 2.6,
    equationText: 'y(t) = h₀ − ½gt² · x_B(t) = v₀x t + ½a_x t²',
    summary:
      'Compare a vertically dropped reference mass (Body A) with a horizontally launched mass (Body B) that can even fire an independent X-thruster. Changing x-motion leaves y(t) and time-to-ground unchanged.',
  },
  {
    id: 'projectile_2d',
    title: '1.5.A.4 2D Projectile Special Case',
    cedFocus: 'EK 1.5.A.4 · Skills 2.A & 2.D',
    dimensionLabel: '2D Quantitative',
    isQuantitative2D: true,
    maxTime: 4.2,
    equationText: 'a_x = 0, v_x = v₀cosθ · a_y = −g, v_y = v₀sinθ − gt',
    summary:
      'Special 2D case with zero horizontal acceleration and constant vertical acceleration −g. Inspect orthogonal floor & wall shadow projections and compare a scaled launch factor (Skill 2.D).',
  },
  {
    id: 'nonuniform_2d',
    title: '1.5.A.2 Nonuniform 2D Acceleration',
    cedFocus: 'EK 1.5.A.1 & 1.5.A.2 · Skill 1.B',
    dimensionLabel: '2D Quantitative',
    isQuantitative2D: true,
    maxTime: 4.5,
    equationText: 'a_x(t) = a₀x + j_x t · a_y(t) = A_y cos(ω_y t)',
    summary:
      'Velocity and acceleration differ in X and Y and vary non-uniformly with time. Yet separating the vector into independent 1D calculus integrals x(t) = ∫v_x dt and y(t) = ∫v_y dt solves the full path.',
  },
  {
    id: 'qualitative_3d',
    title: '3D Helical Motion (CED Boundary)',
    cedFocus: '1.5 Boundary · 3D Qualitative',
    dimensionLabel: '3D Qualitative (E&M Boundary)',
    isQuantitative2D: false,
    maxTime: 6.0,
    equationText: 'r(t) = R cos(ωt) î + y(t) ĵ + R sin(ωt) k̂',
    summary:
      'Boundary Demonstration: Mechanics analyzes 2D quantitatively, while E&M extends qualitative 3D reasoning (such as a particle spiraling along a magnetic axis). Observe independent 3-wall shadow projections.',
  },
];

export interface BodyKinematicsSample {
  r: Vec3;
  v: Vec3;
  a: Vec3;
  speed: number;
  accelMag: number;
  hasLanded: boolean;
}

export interface Motion15State {
  t: number;
  primary: BodyKinematicsSample;
  referenceDrop: BodyKinematicsSample | null; // Body A in drop_vs_launch
  scaledComparison: BodyKinematicsSample | null; // 2x / 1.5x scaled ghost in projectile_2d (Skill 2.D)
  metrics: {
    impactTimePrimary: number | null;
    impactTimeReference: number | null;
    horizontalRange: number;
    apexHeight: number;
    scaledRange: number | null;
    scaledFlightTime: number | null;
    scaledApexHeight: number | null;
    rangeRatio: number | null;
    timeRatio: number | null;
    helixPitch: number | null;
    xzRadius: number | null;
  };
}

function clampNonNegTime(t: number): number {
  return Math.max(0, t);
}

/** Solve y0 + vy0 * t - 0.5 * g * t^2 = 0 for positive impact time when g > 0 */
export function solveFreeFallImpactTime(y0: number, vy0: number, g: number): number | null {
  if (g <= 1e-6) return null;
  if (y0 <= 0 && vy0 <= 0) return 0;
  const disc = vy0 * vy0 + 2 * g * y0;
  if (disc < 0) return null;
  return (vy0 + Math.sqrt(disc)) / g;
}

function evalDropOrProjectileBody(
  x0: number,
  y0: number,
  vx0: number,
  vy0: number,
  ax: number,
  g: number,
  t: number
): { sample: BodyKinematicsSample; impactTime: number | null; range: number; apexHeight: number } {
  const impactTime = solveFreeFallImpactTime(y0, vy0, g);
  const clampedT = impactTime !== null ? Math.min(clampNonNegTime(t), impactTime) : clampNonNegTime(t);
  const hasLanded = impactTime !== null && t >= impactTime - 1e-6;

  const rx = x0 + vx0 * clampedT + 0.5 * ax * clampedT * clampedT;
  const ry = Math.max(0, y0 + vy0 * clampedT - 0.5 * g * clampedT * clampedT);
  const vx = vx0 + ax * clampedT;
  const vy = vy0 - g * clampedT;
  const ay = -g;

  const tApex = vy0 > 0 && g > 1e-6 ? vy0 / g : 0;
  const apexHeight = y0 + vy0 * tApex - 0.5 * g * tApex * tApex;
  const range =
    impactTime !== null ? x0 + vx0 * impactTime + 0.5 * ax * impactTime * impactTime : rx;

  return {
    sample: {
      r: { x: rx, y: ry, z: 0 },
      v: { x: vx, y: vy, z: 0 },
      a: { x: ax, y: ay, z: 0 },
      speed: Math.hypot(vx, vy),
      accelMag: Math.hypot(ax, ay),
      hasLanded,
    },
    impactTime,
    range,
    apexHeight,
  };
}

export function evaluateMotion15State(
  scenario: Motion15ScenarioId,
  tInput: number,
  params: Motion15Params
): Motion15State {
  const t = clampNonNegTime(tInput);

  if (scenario === 'drop_vs_launch') {
    const refEval = evalDropOrProjectileBody(0, params.h0, 0, 0, 0, params.gravity, t);
    const primEval = evalDropOrProjectileBody(
      0,
      params.h0,
      params.vx0,
      params.vy0,
      params.axExtra,
      params.gravity,
      t
    );

    return {
      t,
      primary: primEval.sample,
      referenceDrop: refEval.sample,
      scaledComparison: null,
      metrics: {
        impactTimePrimary: primEval.impactTime,
        impactTimeReference: refEval.impactTime,
        horizontalRange: primEval.range,
        apexHeight: primEval.apexHeight,
        scaledRange: null,
        scaledFlightTime: null,
        scaledApexHeight: null,
        rangeRatio: null,
        timeRatio: null,
        helixPitch: null,
        xzRadius: null,
      },
    };
  }

  if (scenario === 'projectile_2d') {
    const rad = (params.launchAngleDeg * Math.PI) / 180;
    const vx0 = params.launchSpeed * Math.cos(rad);
    const vy0 = params.launchSpeed * Math.sin(rad);
    const baseEval = evalDropOrProjectileBody(0, params.h0, vx0, vy0, 0, params.gravity, t);

    const k = params.scaleFactor;
    const scaledEval = evalDropOrProjectileBody(
      0,
      params.h0,
      vx0 * k,
      vy0 * k,
      0,
      params.gravity,
      t
    );

    const rangeRatio =
      baseEval.range > 1e-4 ? scaledEval.range / baseEval.range : k * k;
    const timeRatio =
      baseEval.impactTime && scaledEval.impactTime
        ? scaledEval.impactTime / baseEval.impactTime
        : k;

    return {
      t,
      primary: baseEval.sample,
      referenceDrop: null,
      scaledComparison: k > 1 ? scaledEval.sample : null,
      metrics: {
        impactTimePrimary: baseEval.impactTime,
        impactTimeReference: null,
        horizontalRange: baseEval.range,
        apexHeight: baseEval.apexHeight,
        scaledRange: scaledEval.range,
        scaledFlightTime: scaledEval.impactTime,
        scaledApexHeight: scaledEval.apexHeight,
        rangeRatio,
        timeRatio,
        helixPitch: null,
        xzRadius: null,
      },
    };
  }

  if (scenario === 'nonuniform_2d') {
    // a_x(t) = ax0 + jerkX * t -> v_x(t) = vx0 + ax0 * t + 0.5 * jerkX * t^2
    // x(t) = vx0 * t + 0.5 * ax0 * t^2 + (1/6) * jerkX * t^3
    const ax = params.ax0 + params.jerkX * t;
    const vx = params.vx0 + params.ax0 * t + 0.5 * params.jerkX * t * t;
    const rx =
      params.vx0 * t + 0.5 * params.ax0 * t * t + (params.jerkX * t * t * t) / 6;

    // a_y(t) = ayAmp * cos(omegaY * t)
    const w = params.omegaY;
    let ay: number;
    let vy: number;
    let ry: number;
    if (Math.abs(w) < 0.05) {
      ay = params.ayAmp;
      vy = params.vy0 + params.ayAmp * t;
      ry = params.h0 + params.vy0 * t + 0.5 * params.ayAmp * t * t;
    } else {
      ay = params.ayAmp * Math.cos(w * t);
      vy = params.vy0 + (params.ayAmp / w) * Math.sin(w * t);
      ry =
        params.h0 +
        params.vy0 * t +
        (params.ayAmp / (w * w)) * (1 - Math.cos(w * t));
    }

    return {
      t,
      primary: {
        r: { x: rx, y: ry, z: 0 },
        v: { x: vx, y: vy, z: 0 },
        a: { x: ax, y: ay, z: 0 },
        speed: Math.hypot(vx, vy),
        accelMag: Math.hypot(ax, ay),
        hasLanded: false,
      },
      referenceDrop: null,
      scaledComparison: null,
      metrics: {
        impactTimePrimary: null,
        impactTimeReference: null,
        horizontalRange: rx,
        apexHeight: ry,
        scaledRange: null,
        scaledFlightTime: null,
        scaledApexHeight: null,
        rangeRatio: null,
        timeRatio: null,
        helixPitch: null,
        xzRadius: null,
      },
    };
  }

  // qualitative_3d: 3D Helical motion with independent Y-axis kinematics
  // x(t) = R cos(w t), z(t) = R sin(w t), y(t) = h0 + vy0 t + 0.5 * ay * t^2
  const R = params.helixRadius;
  const w = params.helixOmega;
  const theta = w * t;
  const rx = R * Math.cos(theta);
  const rz = R * Math.sin(theta);
  const vx = -R * w * Math.sin(theta);
  const vz = R * w * Math.cos(theta);
  const ax = -R * w * w * Math.cos(theta);
  const az = -R * w * w * Math.sin(theta);

  const ay = params.azThrustY;
  const vy = params.vy0 + ay * t;
  const ry = Math.max(0.2, params.h0 + params.vy0 * t + 0.5 * ay * t * t);

  const period = Math.abs(w) > 0.05 ? (2 * Math.PI) / Math.abs(w) : null;
  const helixPitch = period !== null ? Math.abs(params.vy0) * period : null;

  return {
    t,
    primary: {
      r: { x: rx, y: ry, z: rz },
      v: { x: vx, y: vy, z: vz },
      a: { x: ax, y: ay, z: az },
      speed: Math.hypot(vx, vy, vz),
      accelMag: Math.hypot(ax, ay, az),
      hasLanded: false,
    },
    referenceDrop: null,
    scaledComparison: null,
    metrics: {
      impactTimePrimary: null,
      impactTimeReference: null,
      horizontalRange: rx,
      apexHeight: ry,
      scaledRange: null,
      scaledFlightTime: null,
      scaledApexHeight: null,
      rangeRatio: null,
      timeRatio: null,
      helixPitch,
      xzRadius: Math.hypot(rx, rz),
    },
  };
}

export interface Motion15TrajectoryPoint {
  t: number;
  primary: BodyKinematicsSample;
  referenceDrop: BodyKinematicsSample | null;
  scaledComparison: BodyKinematicsSample | null;
}

export function sampleMotion15Series(
  scenario: Motion15ScenarioId,
  params: Motion15Params,
  maxTime: number,
  steps = 72
): Motion15TrajectoryPoint[] {
  const n = Math.max(8, steps);
  const out: Motion15TrajectoryPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * maxTime;
    const st = evaluateMotion15State(scenario, t, params);
    out.push({
      t,
      primary: st.primary,
      referenceDrop: st.referenceDrop,
      scaledComparison: st.scaledComparison,
    });
  }
  return out;
}

export interface ComponentPlotPoint {
  t: number;
  xVal: number;
  yVal: number;
  zVal?: number;
}

export interface ComponentGraphLayout {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  tMax: number;
  vMin: number;
  vMax: number;
  zeroY: number;
  xPath: string;
  yPath: string;
  zPath: string | null;
  markerPxX: number;
  markerPxY: number;
  markerPyY: number;
  markerPzY: number | null;
  yTicks: { value: number; py: number; label: string }[];
}

export type GraphQuantityMode = 'position' | 'velocity' | 'acceleration';

export function computeComponentGraphLayout(
  series: Motion15TrajectoryPoint[],
  quantity: GraphQuantityMode,
  currentTime: number,
  width = 290,
  height = 136
): ComponentGraphLayout {
  const padLeft = 36;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 22;

  const plotW = Math.max(20, width - padLeft - padRight);
  const plotH = Math.max(20, height - padTop - padBottom);
  const tMax = series.length > 0 ? Math.max(0.1, series[series.length - 1].t) : 1;

  const pts: ComponentPlotPoint[] = series.map(s => {
    const vec =
      quantity === 'position'
        ? s.primary.r
        : quantity === 'velocity'
        ? s.primary.v
        : s.primary.a;
    return {
      t: s.t,
      xVal: vec.x,
      yVal: vec.y,
      zVal: vec.z,
    };
  });

  const hasZ = pts.some(p => Math.abs(p.zVal || 0) > 1e-4);
  let rawMin = 0;
  let rawMax = 0;
  for (const p of pts) {
    rawMin = Math.min(rawMin, p.xVal, p.yVal);
    rawMax = Math.max(rawMax, p.xVal, p.yVal);
    if (hasZ && p.zVal !== undefined) {
      rawMin = Math.min(rawMin, p.zVal);
      rawMax = Math.max(rawMax, p.zVal);
    }
  }
  if (Math.abs(rawMax - rawMin) < 1e-3) {
    rawMin -= 1;
    rawMax += 1;
  }
  const margin = (rawMax - rawMin) * 0.14;
  const vMin = rawMin - margin;
  const vMax = rawMax + margin;

  const toPxX = (t: number) => padLeft + (t / tMax) * plotW;
  const toPxY = (v: number) => padTop + ((vMax - v) / (vMax - vMin)) * plotH;

  const xPath = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toPxX(p.t).toFixed(1)} ${toPxY(p.xVal).toFixed(1)}`)
    .join(' ');
  const yPath = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toPxX(p.t).toFixed(1)} ${toPxY(p.yVal).toFixed(1)}`)
    .join(' ');

  const zPath = hasZ
    ? pts
        .map(
          (p, idx) =>
            `${idx === 0 ? 'M' : 'L'} ${toPxX(p.t).toFixed(1)} ${toPxY(p.zVal || 0).toFixed(1)}`
        )
        .join(' ')
    : null;

  // Interpolate active time marker from nearest sample
  const clampedT = Math.max(0, Math.min(tMax, currentTime));
  let nearest: ComponentPlotPoint = pts[0] || { t: 0, xVal: 0, yVal: 0, zVal: 0 };
  let bestDist = Infinity;
  for (const p of pts) {
    const d = Math.abs(p.t - clampedT);
    if (d < bestDist) {
      bestDist = d;
      nearest = p;
    }
  }

  const yTicks = [vMin, (vMin + vMax) * 0.5, vMax].map(val => ({
    value: val,
    py: toPxY(val),
    label: Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(1),
  }));

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    tMax,
    vMin,
    vMax,
    zeroY: Math.max(padTop, Math.min(padTop + plotH, toPxY(0))),
    xPath,
    yPath,
    zPath,
    markerPxX: toPxX(clampedT),
    markerPxY: toPxY(nearest.xVal),
    markerPyY: toPxY(nearest.yVal),
    markerPzY: hasZ ? toPxY(nearest.zVal || 0) : null,
    yTicks,
  };
}

export interface ExperimentalTrialRow {
  trial: number;
  vx0: number;
  axExtra: number;
  h0: number;
  tDropRef: number;
  tImpactLaunch: number;
  rangeX: number;
  yDeltaAtImpact: number;
}
