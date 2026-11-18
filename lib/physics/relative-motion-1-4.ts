export type RelativeScenarioId =
  | 'train_toss'
  | 'river_crossing'
  | 'highway_overtake'
  | 'crosswind_accel';

export type ObserverFrameId = 'earth' | 'platform' | 'object';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RelativeMotionParams {
  // Platform M velocity relative to Earth E (inertial constant velocity)
  vMEx: number; // m/s
  vMEz: number; // m/s
  m0x: number;  // m initial platform offset X
  // Object P initial position & motion parameters
  p0x: number;  // m initial offset relative to platform (or Earth in overtake)
  vPMx: number; // m/s initial or cruising X speed relative to platform
  vPMy: number; // m/s initial vertical Y launch speed (train_toss)
  vPMz: number; // m/s initial Z speed relative to platform (crosswind)
  boatSpeed: number;     // m/s boat speed relative to river water (river_crossing)
  boatHeadingDeg: number; // deg relative to +Z across river (0° = straight across, -θ = angled upstream)
  accelMag: number;      // m/s² (gravity g for train_toss, or thrust a for highway/crosswind)
  accelAngleDeg: number; // deg direction of acceleration in XZ plane (crosswind)
}

export interface RelativeScenarioDescriptor {
  id: RelativeScenarioId;
  title: string;
  shortTitle: string;
  dimensionLabel: '1D / 2D Vertical' | '2D Horizontal' | '1D Linear' | '2D Accelerating';
  preferred2DPlane: 'xy' | 'xz';
  maxTime: number;
  cedFocus: string;
  equationText: string;
  summary: string;
  platformLabel: string;
  objectLabel: string;
  earthLabel: string;
  riverWidth?: number;
}

export const RELATIVE_SCENARIOS: RelativeScenarioDescriptor[] = [
  {
    id: 'train_toss',
    title: 'Train Car Vertical Launch (1.4.B.2.ii)',
    shortTitle: 'Train Toss',
    dimensionLabel: '1D / 2D Vertical',
    preferred2DPlane: 'xy',
    maxTime: 3.6,
    cedFocus: '1.4.B.2.i & 1.4.B.2.ii',
    equationText: 'v_P/E = v_P/M + v_M/E · a_P/E = a_P/M = -g ĵ',
    summary:
      'A ball launched vertically from a constant-velocity train car rises and lands back in the launcher. Straight 1D vertical motion in Frame M becomes a 2D parabola in Earth Frame E, yet acceleration a = -g ĵ is identical in both inertial frames.',
    platformLabel: 'Flatbed Car M',
    objectLabel: 'Launched Ball P',
    earthLabel: 'Ground Track E',
  },
  {
    id: 'river_crossing',
    title: '2D River Current Crossing (1.4.B.2.i)',
    shortTitle: 'River Crossing',
    dimensionLabel: '2D Horizontal',
    preferred2DPlane: 'xz',
    maxTime: 8.0,
    cedFocus: '1.4.A.1 & 1.4.B.2.i',
    equationText: 'v_B/E = v_B/W + v_W/E',
    summary:
      'Steer a research boat at speed v_B/W across a 24 m river flowing downstream at v_W/E. Adjust heading θ upstream so that the resultant velocity v_B/E crosses perpendicular to the bank (zero drift).',
    platformLabel: 'River Water W (M)',
    objectLabel: 'Research Boat P',
    earthLabel: 'Riverbank E',
    riverWidth: 24,
  },
  {
    id: 'highway_overtake',
    title: '1D Passing Lane & Sign Reversal (1.4.A.1)',
    shortTitle: '1D Passing Lane',
    dimensionLabel: '1D Linear',
    preferred2DPlane: 'xz',
    maxTime: 8.0,
    cedFocus: '1.4.A.1 & 1.4.B.1',
    equationText: 'v_P/M = v_P/E − v_M/E',
    summary:
      'Both vehicles drive forward (+x) along an Earth highway. Switch into Observer Frame M to see how object velocity reverses direction (v_P/M < 0) whenever v_M/E > v_P/E, and compare relative overtake kinematics.',
    platformLabel: 'Observer Cruiser M',
    objectLabel: 'Test Car P',
    earthLabel: 'Highway E',
  },
  {
    id: 'crosswind_accel',
    title: '2D Accelerating Drone in Crosswind',
    shortTitle: 'Crosswind Drone',
    dimensionLabel: '2D Accelerating',
    preferred2DPlane: 'xz',
    maxTime: 6.0,
    cedFocus: '1.4.B.1 & 1.4.B.2.ii',
    equationText: 'v_P/E(t) = v_P/M(t) + v_M/E · a_P/E = a_P/M',
    summary:
      'A quadrotor accelerates steadily relative to an air mass drifting at constant wind velocity v_M/E. Verify that velocity transforms via Galilean vector addition while acceleration remains frame-invariant.',
    platformLabel: 'Air Mass M',
    objectLabel: 'Quadrotor P',
    earthLabel: 'Ground Radar E',
  },
];

export const DEFAULT_RELATIVE_PARAMS: Record<RelativeScenarioId, RelativeMotionParams> = {
  train_toss: {
    vMEx: 5.5,
    vMEz: 0,
    m0x: -10,
    p0x: 0,
    vPMx: 0,
    vPMy: 12.0,
    vPMz: 0,
    boatSpeed: 5.0,
    boatHeadingDeg: 0,
    accelMag: 9.8,
    accelAngleDeg: 0,
  },
  river_crossing: {
    vMEx: 3.0,
    vMEz: 0,
    m0x: 0,
    p0x: 0,
    vPMx: 0,
    vPMy: 0,
    vPMz: 0,
    boatSpeed: 5.0,
    boatHeadingDeg: -20,
    accelMag: 0,
    accelAngleDeg: 0,
  },
  highway_overtake: {
    vMEx: 8.0,
    vMEz: 0,
    m0x: -18,
    p0x: 12,
    vPMx: 5.0, // Relative to Earth: initial v_PE in overtake setup
    vPMy: 0,
    vPMz: 0,
    boatSpeed: 5.0,
    boatHeadingDeg: 0,
    accelMag: 1.2,
    accelAngleDeg: 0,
  },
  crosswind_accel: {
    vMEx: 4.0,
    vMEz: -1.5,
    m0x: 0,
    p0x: 0,
    vPMx: 1.5,
    vPMy: 0,
    vPMz: 2.5,
    boatSpeed: 5.0,
    boatHeadingDeg: 0,
    accelMag: 1.4,
    accelAngleDeg: 55,
  },
};

export interface FrameMeasurement {
  frameId: ObserverFrameId;
  frameName: string;
  position: Vec3;
  velocity: Vec3;
  acceleration: Vec3;
  speed: number;
  accelMag: number;
  headingDeg: number; // horizontal angle in XZ or elevation angle in XY
}

export interface RelativeMotionState {
  t: number;
  scenario: RelativeScenarioId;
  // Ground-frame states of E (origin), M (platform), and P (object)
  rME: Vec3;
  vME: Vec3;
  aME: Vec3;
  rPE: Vec3;
  vPE: Vec3;
  aPE: Vec3;
  // Object relative to Platform M
  rPM: Vec3;
  vPM: Vec3;
  aPM: Vec3;
  // Earth relative to Platform M (-rME, -vME, 0)
  rEM: Vec3;
  vEM: Vec3;
  // Frame-by-frame measurements of Object P
  frames: Record<ObserverFrameId, FrameMeasurement>;
  // Galilean consistency checks (exact 0 in inertial frames)
  galileanVelocityResidual: number; // |vPE - (vPM + vME)|
  accelInvarianceDelta: number;     // |aPE - aPM|
  // Scenario-specific derived metrics
  riverMetrics?: {
    riverWidth: number;
    vzAcross: number;
    vxNet: number;
    crossingTime: number | null; // seconds to cross 24m river, null if vzAcross <= 0.05
    downstreamDrift: number | null;
    zeroDriftAngleDeg: number | null; // asin(-vMEx / boatSpeed) if |vMEx| < boatSpeed
    hasCrossed: boolean;
  };
  overtakeMetrics?: {
    separationX: number; // x_P/E - x_M/E
    relativeSpeedSign: 'approaching' | 'passing' | 'receding' | 'matched';
    overtakeTime: number | null;
  };
  trainMetrics?: {
    flightTime: number;
    apexHeight: number;
    groundRange: number;
    hasLanded: boolean;
  };
}

export function vecMag(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function computeHeadingDeg(v: Vec3, plane: 'xy' | 'xz'): number {
  if (plane === 'xy') {
    if (Math.hypot(v.x, v.y) < 1e-6) return 0;
    return (Math.atan2(v.y, v.x) * 180) / Math.PI;
  }
  if (Math.hypot(v.x, v.z) < 1e-6) return 0;
  return (Math.atan2(v.x, v.z) * 180) / Math.PI;
}

export function evaluateRelativeState(
  scenario: RelativeScenarioId,
  tInput: number,
  params: RelativeMotionParams
): RelativeMotionState {
  const desc = RELATIVE_SCENARIOS.find(s => s.id === scenario) || RELATIVE_SCENARIOS[0];
  const t = Math.max(0, tInput);

  // Moving frame M is always inertial: a_M/E = 0, v_M/E = const
  const vME: Vec3 = {
    x: params.vMEx,
    y: 0,
    z: scenario === 'crosswind_accel' ? params.vMEz : 0,
  };
  const aME: Vec3 = { x: 0, y: 0, z: 0 };

  let rME: Vec3 = {
    x: params.m0x + vME.x * t,
    y: 0,
    z: vME.z * t,
  };

  let rPM: Vec3 = { x: 0, y: 0, z: 0 };
  let vPM: Vec3 = { x: 0, y: 0, z: 0 };
  let aPM: Vec3 = { x: 0, y: 0, z: 0 };
  let rPE: Vec3 = { x: 0, y: 0, z: 0 };
  let vPE: Vec3 = { x: 0, y: 0, z: 0 };
  let aPE: Vec3 = { x: 0, y: 0, z: 0 };

  let riverMetrics: RelativeMotionState['riverMetrics'];
  let overtakeMetrics: RelativeMotionState['overtakeMetrics'];
  let trainMetrics: RelativeMotionState['trainMetrics'];

  if (scenario === 'train_toss') {
    const g = Math.max(1.0, params.accelMag);
    const vy0 = params.vPMy;
    const flightTime = (2 * vy0) / g;
    const clampedT = Math.min(t, flightTime);
    const hasLanded = t >= flightTime;

    // Platform frame kinematics: straight up & down
    const y = Math.max(0, vy0 * clampedT - 0.5 * g * clampedT * clampedT);
    const vy = hasLanded ? 0 : vy0 - g * clampedT;
    const ay = hasLanded ? 0 : -g;

    rPM = { x: 0, y, z: 0 };
    vPM = { x: 0, y: vy, z: 0 };
    aPM = { x: 0, y: ay, z: 0 };

    // Earth frame kinematics (cart itself continues rolling smoothly at vME)
    rME = { x: params.m0x + vME.x * t, y: 0, z: 0 };
    rPE = vecAdd(rME, rPM);
    vPE = vecAdd(vME, vPM);
    aPE = { ...aPM };

    trainMetrics = {
      flightTime,
      apexHeight: (vy0 * vy0) / (2 * g),
      groundRange: vME.x * flightTime,
      hasLanded,
    };
  } else if (scenario === 'river_crossing') {
    const width = desc.riverWidth ?? 24;
    const rad = (params.boatHeadingDeg * Math.PI) / 180;
    const vBWMx = params.boatSpeed * Math.sin(rad);
    const vBWMz = params.boatSpeed * Math.cos(rad);
    // Start boat at south bank (z = -width/2) moving toward north bank (+width/2)
    const startZ = -width / 2;
    const vzAcross = vBWMz + vME.z;
    const vxNet = vBWMx + vME.x;
    const crossingTime = vzAcross > 0.05 ? width / vzAcross : null;
    const effT = crossingTime !== null ? Math.min(t, crossingTime) : t;
    const hasCrossed = crossingTime !== null && t >= crossingTime;

    vPM = { x: vBWMx, y: 0, z: vBWMz };
    vPE = hasCrossed ? { x: 0, y: 0, z: 0 } : vecAdd(vPM, vME);
    // For diagram vector identity while stopped at bank, keep kinematic boat velocity clear
    const activeVPM = { x: vBWMx, y: 0, z: vBWMz };
    const activeVPE = vecAdd(activeVPM, vME);

    rME = { x: vME.x * effT, y: 0, z: 0 };
    rPE = { x: activeVPE.x * effT, y: 0, z: startZ + activeVPE.z * effT };
    rPM = vecSub(rPE, rME);

    vPM = activeVPM;
    vPE = activeVPE;
    aPM = { x: 0, y: 0, z: 0 };
    aPE = { x: 0, y: 0, z: 0 };

    const ratio = params.boatSpeed > 0.01 ? -vME.x / params.boatSpeed : 2;
    const zeroDriftAngleDeg =
      Math.abs(ratio) <= 1 ? (Math.asin(ratio) * 180) / Math.PI : null;

    riverMetrics = {
      riverWidth: width,
      vzAcross: activeVPE.z,
      vxNet: activeVPE.x,
      crossingTime,
      downstreamDrift: crossingTime !== null ? activeVPE.x * crossingTime : null,
      zeroDriftAngleDeg,
      hasCrossed,
    };
  } else if (scenario === 'highway_overtake') {
    // In 1D highway overtake:
    // Observer Car M starts at m0x with constant velocity vMEx.
    // Object Car P starts at x_P0 = m0x + p0x with initial Earth velocity vPE0 = params.vPMx + ... wait:
    // Let params.vPMx represent Object P's initial Earth-frame speed params.vP0Ex so students can clearly compare v_P/E vs v_M/E!
    const xM0 = params.m0x;
    const xP0 = params.m0x + params.p0x;
    const vPE0x = params.vPMx;
    const ax = params.accelMag;

    rME = { x: xM0 + vME.x * t, y: 0, z: 0 };
    rPE = { x: xP0 + vPE0x * t + 0.5 * ax * t * t, y: 0, z: 0 };
    vPE = { x: vPE0x + ax * t, y: 0, z: 0 };
    aPE = { x: ax, y: 0, z: 0 };

    rPM = vecSub(rPE, rME);
    vPM = vecSub(vPE, vME);
    aPM = { ...aPE };

    // Solve 0.5*ax*t^2 + (vPE0x - vME.x)*t + (xP0 - xM0) = 0 for future overtake t > 0
    const d0 = xP0 - xM0;
    const dv0 = vPE0x - vME.x;
    let overtakeTime: number | null = null;
    if (Math.abs(ax) < 1e-6) {
      if (Math.abs(dv0) > 1e-6) {
        const sol = -d0 / dv0;
        if (sol > 0) overtakeTime = sol;
      }
    } else {
      const disc = dv0 * dv0 - 2 * ax * d0;
      if (disc >= 0) {
        const sqrtD = Math.sqrt(disc);
        const tA = (-dv0 - sqrtD) / ax;
        const tB = (-dv0 + sqrtD) / ax;
        const positives = [tA, tB].filter(val => val > 1e-4).sort((a, b) => a - b);
        if (positives.length > 0) overtakeTime = positives[0];
      }
    }

    const sep = rPM.x;
    const relVx = vPM.x;
    let relativeSpeedSign: 'approaching' | 'passing' | 'receding' | 'matched' = 'matched';
    if (Math.abs(sep) < 0.35) relativeSpeedSign = 'passing';
    else if (sep * relVx < -0.05) relativeSpeedSign = 'approaching';
    else if (sep * relVx > 0.05) relativeSpeedSign = 'receding';

    overtakeMetrics = {
      separationX: sep,
      relativeSpeedSign,
      overtakeTime,
    };
  } else {
    // crosswind_accel: drone starts at origin relative to ground, accelerates relative to air mass M
    const rad = (params.accelAngleDeg * Math.PI) / 180;
    const ax = params.accelMag * Math.sin(rad);
    const az = params.accelMag * Math.cos(rad);

    aPM = { x: ax, y: 0, z: az };
    aPE = { ...aPM };

    const vPM0: Vec3 = { x: params.vPMx, y: 0, z: params.vPMz };
    vPM = {
      x: vPM0.x + aPM.x * t,
      y: 0,
      z: vPM0.z + aPM.z * t,
    };
    rPM = {
      x: vPM0.x * t + 0.5 * aPM.x * t * t,
      y: 0,
      z: vPM0.z * t + 0.5 * aPM.z * t * t,
    };

    rME = { x: vME.x * t, y: 0, z: vME.z * t };
    rPE = vecAdd(rME, rPM);
    vPE = vecAdd(vME, vPM);
  }

  const rEM: Vec3 = { x: -rME.x, y: -rME.y, z: -rME.z };
  const vEM: Vec3 = { x: -vME.x, y: -vME.y, z: -vME.z };

  const plane = desc.preferred2DPlane;
  const zeroVec: Vec3 = { x: 0, y: 0, z: 0 };

  const frames: Record<ObserverFrameId, FrameMeasurement> = {
    earth: {
      frameId: 'earth',
      frameName: desc.earthLabel,
      position: rPE,
      velocity: vPE,
      acceleration: aPE,
      speed: vecMag(vPE),
      accelMag: vecMag(aPE),
      headingDeg: computeHeadingDeg(vPE, plane),
    },
    platform: {
      frameId: 'platform',
      frameName: desc.platformLabel,
      position: rPM,
      velocity: vPM,
      acceleration: aPM,
      speed: vecMag(vPM),
      accelMag: vecMag(aPM),
      headingDeg: computeHeadingDeg(vPM, plane),
    },
    object: {
      frameId: 'object',
      frameName: `${desc.objectLabel} Co-Moving`,
      position: zeroVec,
      velocity: zeroVec,
      acceleration: zeroVec,
      speed: 0,
      accelMag: 0,
      headingDeg: 0,
    },
  };

  const vSum = vecAdd(vPM, vME);
  const galileanVelocityResidual = vecMag(vecSub(vPE, vSum));
  const accelInvarianceDelta = vecMag(vecSub(aPE, aPM));

  return {
    t,
    scenario,
    rME,
    vME,
    aME,
    rPE,
    vPE,
    aPE,
    rPM,
    vPM,
    aPM,
    rEM,
    vEM,
    frames,
    galileanVelocityResidual,
    accelInvarianceDelta,
    riverMetrics,
    overtakeMetrics,
    trainMetrics,
  };
}

export interface TrajectorySamplePoint {
  t: number;
  // Coordinates of P expressed relative to the selected observer frame
  posInObserver: Vec3;
  // Ground-frame coordinate of P (for cross-reference)
  rPE: Vec3;
  // Platform-frame coordinate of P
  rPM: Vec3;
}

export function sampleRelativeTrajectories(
  scenario: RelativeScenarioId,
  params: RelativeMotionParams,
  observerFrame: ObserverFrameId,
  tRef = 0,
  steps = 80
): TrajectorySamplePoint[] {
  const desc = RELATIVE_SCENARIOS.find(s => s.id === scenario) || RELATIVE_SCENARIOS[0];
  const refState = evaluateRelativeState(scenario, tRef, params);
  const out: TrajectorySamplePoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * desc.maxTime;
    const st = evaluateRelativeState(scenario, t, params);
    let posInObserver: Vec3;
    if (observerFrame === 'earth') {
      posInObserver = st.rPE;
    } else if (observerFrame === 'platform') {
      posInObserver = st.rPM;
    } else {
      // Co-moving inertial frame matching Object P's instantaneous velocity at tRef
      // or centered at P at tRef: in Earth frame, inertial observer moving at vPE(tRef) sees
      // r_in_O(t) = r_PE(t) - (r_PE(tRef) + v_PE(tRef)*(t - tRef))
      const dtFromRef = t - tRef;
      const observerWorldPos = {
        x: refState.rPE.x + refState.vPE.x * dtFromRef,
        y: refState.rPE.y + refState.vPE.y * dtFromRef,
        z: refState.rPE.z + refState.vPE.z * dtFromRef,
      };
      posInObserver = vecSub(st.rPE, observerWorldPos);
    }
    out.push({
      t,
      posInObserver,
      rPE: st.rPE,
      rPM: st.rPM,
    });
  }
  return out;
}

export interface VectorDiagramLayout {
  origin: { x: number; y: number };
  tipME: { x: number; y: number };
  tipPE: { x: number; y: number };
  scale: number;
  xAxisLabel: string;
  yAxisLabel: string;
}

/**
 * Pure geometry helper mapping v_M/E + v_P/M = v_P/E onto a fixed SVG diagram box
 * so the tip-to-tail vector triangle never clips outside the SVG viewport.
 */
export function computeVectorDiagramLayout(
  state: RelativeMotionState,
  plane: 'xy' | 'xz',
  svgW = 280,
  svgH = 164,
  pad = 24
): VectorDiagramLayout {
  const pick2D = (v: Vec3) =>
    plane === 'xy' ? { u: v.x, v: -v.y } : { u: v.x, v: -v.z };

  const vME2 = pick2D(state.vME);
  const vPM2 = pick2D(state.vPM);
  const vPE2 = pick2D(state.vPE);

  // Points in mathematical diagram units starting from origin (0,0)
  const pts = [
    { u: 0, v: 0 },
    vME2,
    { u: vME2.u + vPM2.u, v: vME2.v + vPM2.v },
    vPE2,
  ];

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const p of pts) {
    if (p.u < minU) minU = p.u;
    if (p.u > maxU) maxU = p.u;
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }

  const spanU = Math.max(2, maxU - minU);
  const spanV = Math.max(2, maxV - minV);
  const drawW = Math.max(40, svgW - pad * 2);
  const drawH = Math.max(40, svgH - pad * 2);
  const scale = Math.min(drawW / spanU, drawH / spanV);

  const cx = (minU + maxU) * 0.5;
  const cy = (minV + maxV) * 0.5;

  const toPx = (p: { u: number; v: number }) => ({
    x: svgW * 0.5 + (p.u - cx) * scale,
    y: svgH * 0.5 + (p.v - cy) * scale,
  });

  return {
    origin: toPx({ u: 0, v: 0 }),
    tipME: toPx(vME2),
    tipPE: toPx({ u: vME2.u + vPM2.u, v: vME2.v + vPM2.v }),
    scale,
    xAxisLabel: '+x (m/s)',
    yAxisLabel: plane === 'xy' ? '+y (m/s)' : '+z (m/s)',
  };
}
